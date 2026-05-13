#!/usr/bin/env node
/**
 * Graphify-First Guard Hook v2 (PreToolUse — Bash|Grep|Glob)
 *
 * v1'den fark: BLOCK yerine AKILLI YÖNLENDİRME.
 *  - Whitelist'teki çağrılar → exit 0 (allow direkt)
 *  - Whitelist dışı → graphify query ile sonuç var mı kontrol et
 *    - Sonuç var → decision: "ask" (kullanıcıya sor, block değil)
 *    - Sonuç yok → exit 0 (allow grep)
 *
 * Performans: cache (5dk TTL) + budget 500 token + 2sn timeout
 * Güvenlik: execFileSync (shell injection önlemi)
 *
 * Kaynak: CLAUDE.md → "🚨 ZORUNLU: Graphify-First Workflow"
 *
 * Debug: HOOK_DEBUG=1 → stderr karar log'u
 * Bypass: ASK kararı → kullanıcı seçer (NO graphify, EVET grep)
 */

const fs = require('fs');
const { execFileSync } = require('child_process');

const DEBUG = process.env.HOOK_DEBUG === '1';
const CACHE_PATH = '/tmp/graphify-hook-cache.json';
const CACHE_TTL_MS = 5 * 60 * 1000;
const QUERY_BUDGET = '500';
const QUERY_TIMEOUT_MS = 2000;

function debugLog(stage, data) {
  if (!DEBUG) return;
  try { process.stderr.write(`[graphify-first-guard-v2] ${stage}: ${JSON.stringify(data)}\n`); } catch {}
}

// stdin'den tool input oku
let input = '';
try { input = fs.readFileSync('/dev/stdin', 'utf8'); }
catch { debugLog('stdin-read-fail', {}); process.exit(0); }

let payload;
try { payload = JSON.parse(input); }
catch { debugLog('json-parse-fail', { len: input.length }); process.exit(0); }

const toolName = payload.tool_name || '';
const toolInput = payload.tool_input || {};

const SENSITIVE_PATHS = /\/etc\/(passwd|shadow|sudoers|hosts)|\.ssh\/|\.aws\/credentials|id_rsa|secrets?\.(yml|yaml|json|env)/i;
const SENSITIVE_KEYWORDS = /\b(secret|token|password|passwd|api[_-]?key|access[_-]?key|private[_-]?key)\b/i;

/**
 * Whitelist kontrolü — eşleşen kuralı string olarak döner.
 */
function whitelistRule(text) {
  if (!text) return '';
  const t = String(text);

  if (SENSITIVE_PATHS.test(t)) return '';

  const stripped = t.replace(/['"]/g, '').trim();
  if (/^[A-Z][A-Z0-9_]{3,}$/.test(stripped)) return 'magic_constant_strict';

  if (/(?:^|[\s'"=({,])([A-Z][A-Z0-9]*_[A-Z0-9_]+)(?=[\s'")},;]|$)/.test(t)) return 'magic_constant_token';

  if (/^[a-z]+(_[a-z0-9]+){1,}$/.test(stripped)) return 'db_column_snake';

  if (!SENSITIVE_KEYWORDS.test(t) && /(?:^|[\s'"])[a-z]+_[a-z0-9_]+(?=[\s'"]|$)/.test(t)) return 'db_column_in_command';

  if (/(Error|Exception|FATAL|Throwable|Warning|Notice|Deprecated)\w*/i.test(t)) return 'error_keyword';

  if (!SENSITIVE_KEYWORDS.test(t) &&
      /\.env(\.\w+)?\b|deploy\/|\bconfig\/|\.config\.|app\.config|tsconfig|composer\.json|package\.json/.test(t)) {
    return 'config_file';
  }

  if (/(^|[\s'"\/])tests?\/(unit|integration|smoke|e2e|benchmarks?|fixtures?|mocks?)\//i.test(t)) return 'test_path';
  if (/\.(test|spec|unit|smoke|integration|e2e)\.[a-z]+\b/i.test(t)) return 'test_file_ext';
  if (/__tests__\//i.test(t)) return 'tests_dir';

  if (/vendor\/|node_modules\/|\.next\/|build\/|dist\/|coverage\/|graphify-out/.test(t)) return 'graph_oos';

  if (/-F\b|--fixed-strings|--literal/.test(t)) return 'literal_flag';

  if (/^\s*git\s+(grep|log|show|diff|blame|status|rev-parse|rev-list|cat-file|ls-files)\b/.test(t)) return 'git_native';

  if (/https?:\/\//.test(t)) return 'url';

  if (/\.(lock|csv|sql)\b/.test(t)) return 'artifact_file';

  if (!SENSITIVE_KEYWORDS.test(t)) {
    const cleaned = t
      .replace(/-[a-zA-Z]+\b/g, '')
      .replace(/['"\\^$.*+?()[\]{}|]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length <= 3) return 'short_literal';
  }

  return '';
}

/**
 * Bash komutunda grep/find/rg/ag/fd çağrısı tespit et.
 */
function detectSearchInBash(command) {
  if (!command) return [];
  const segments = command.split(/\s*(?:\|\||&&|[|;])\s*/);
  for (const m of command.matchAll(/\$\(([^)]+)\)/g)) segments.push(m[1]);
  for (const m of command.matchAll(/`([^`]+)`/g)) segments.push(m[1]);

  const detections = [];
  const patterns = [
    { tool: 'grep', regex: /(?:^|\s)grep\s+(?:-[a-zA-Z]+\s+)*['"]?([^'"|;&\s]+)['"]?/ },
    { tool: 'rg',   regex: /(?:^|\s)rg\s+(?:-[a-zA-Z-]+\s+)*['"]?([^'"|;&\s]+)['"]?/ },
    { tool: 'ag',   regex: /(?:^|\s)ag\s+(?:-[a-zA-Z]+\s+)*['"]?([^'"|;&\s]+)['"]?/ },
    { tool: 'ack',  regex: /(?:^|\s)ack\s+(?:-[a-zA-Z]+\s+)*['"]?([^'"|;&\s]+)['"]?/ },
    { tool: 'find', regex: /(?:^|\s)find\s+\S+\s+-name\s+['"]?([^'"|;&\s]+)['"]?/ },
    { tool: 'fd',   regex: /(?:^|\s)fd\s+(?:-[a-zA-Z]+\s+)*['"]?([^'"|;&\s]+)['"]?/ },
  ];

  for (const seg of segments) {
    for (const { tool, regex } of patterns) {
      const m = seg.match(regex);
      if (m) detections.push({ tool, pattern: m[1] || '', segment: seg.trim() });
    }
  }
  return detections;
}

/**
 * Bash komutunda path argümanı tek dosya hedefli mi?
 */
function isSingleFileTarget(command) {
  if (!command) return false;
  return /[\s'"]([\w.\/-]+\.(php|ts|tsx|js|jsx|json|md|yaml|yml|sh|py|css|scss|vue|html))(\s|$|['"])/.test(command);
}

/**
 * Cache okuma/yazma.
 */
function readCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')); } catch { return {}; }
}
function writeCache(cache) {
  try { fs.writeFileSync(CACHE_PATH, JSON.stringify(cache)); } catch {}
}

/**
 * Graphify query — execFileSync ile güvenli çağrı (shell injection yok).
 * Pattern args array içinde geçirilir.
 *
 * @param {string} pattern
 * @returns {{matches: number, summary: string}}
 */
function tryGraphify(pattern) {
  if (!pattern) return { matches: 0, summary: '' };

  const cache = readCache();
  const cached = cache[pattern];
  if (cached && Date.now() - cached.t < CACHE_TTL_MS) {
    debugLog('cache-hit', { pattern });
    return cached.r;
  }

  // Graph yok ise erken çıkış
  if (!fs.existsSync('graphify-out/graph.json')) {
    debugLog('graph-missing', {});
    return { matches: 0, summary: '' };
  }

  let result;
  try {
    const out = execFileSync(
      'graphify',
      ['query', pattern, '--budget', QUERY_BUDGET],
      { timeout: QUERY_TIMEOUT_MS, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const lines = out.split('\n').filter(Boolean);
    const nodeLines = lines.filter(l => l.startsWith('NODE '));
    result = {
      matches: nodeLines.length,
      summary: nodeLines.slice(0, 3).join('\n'),
    };
    debugLog('graphify-query', { pattern, matches: result.matches });
  } catch (err) {
    debugLog('graphify-error', { pattern, err: String(err).slice(0, 100) });
    result = { matches: 0, summary: '' };
  }

  cache[pattern] = { t: Date.now(), r: result };
  writeCache(cache);
  return result;
}

function ask(reason) {
  process.stdout.write(JSON.stringify({ decision: 'ask', reason }));
  process.exit(0);
}

function allow(rule) {
  debugLog('allow', { rule });
  process.exit(0);
}

// ============== ANA MANTIK ==============

debugLog('start', { toolName });

let pattern = '';
let context = '';

if (toolName === 'Grep') {
  pattern = toolInput.pattern || '';
  context = `${pattern} ${toolInput.path || ''}`;
} else if (toolName === 'Glob') {
  pattern = toolInput.pattern || '';
  context = pattern;
} else if (toolName === 'Bash') {
  const detections = detectSearchInBash(toolInput.command || '');
  if (detections.length === 0) allow('no_search_command');

  // İlk block-edilebilir detection'ı al (whitelist'e girmemiş)
  for (const det of detections) {
    const segmentSensitive =
      SENSITIVE_PATHS.test(det.segment) || SENSITIVE_KEYWORDS.test(det.segment);
    if (segmentSensitive) {
      // sensitive context — askip etmeden ask et
      pattern = det.pattern;
      context = det.segment;
      break;
    }
    const segmentRule = whitelistRule(det.segment);
    const patternRule = whitelistRule(det.pattern);
    if (segmentRule || patternRule || isSingleFileTarget(det.segment)) continue;
    pattern = det.pattern;
    context = det.segment;
    break;
  }

  // Tüm detection'lar whitelist'te ise allow
  if (!pattern) allow('all_segments_whitelisted');
} else {
  allow('non_target_tool');
}

// Whitelist erken çıkış (Grep/Glob için)
const rule = whitelistRule(context);
if (rule) allow(rule);

// Sensitive path/keyword override
if (SENSITIVE_PATHS.test(context) || SENSITIVE_KEYWORDS.test(context)) {
  // Sensitive durumda graphify denemeden direkt ask
  ask(
    '🚨 Graphify-First v2:\n' +
    '   Sensitive context tespit edildi (path veya keyword).\n' +
    `   Pattern: "${pattern}"\n` +
    '   Devam etmek istiyor musun?',
  );
}

// Graphify ile sonuç var mı kontrol
const graphResult = tryGraphify(pattern);

if (graphResult.matches === 0) {
  allow('graphify_no_match');
}

ask(
  '🚨 Graphify-First v2 — kod ilişkisi araması tespit edildi:\n\n' +
  `   Aranan: "${pattern}"\n\n` +
  `   📊 Graphify'da ${graphResult.matches} sonuç bulundu:\n` +
  graphResult.summary.split('\n').map(l => `   ${l}`).join('\n') +
  '\n\n   Öneri: graphify query ile devam et (BFS traversal, daha verimli).\n' +
  '   Komut: /g query "' + pattern + '"\n\n' +
  '   Yine de grep ile devam etmek ister misin?',
);

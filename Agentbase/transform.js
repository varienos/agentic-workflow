#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ─────────────────────────────────────────────────────
// YAPILANDIRMA
// ─────────────────────────────────────────────────────

const AGENTBASE_DIR = path.resolve(__dirname);

const CLI_CAPABILITIES = {
  gemini: {
    commands: { format: 'toml', dir: '.gemini/commands' },
    skills: null,
    agents: { format: 'md', dir: '.gemini/agents' },
    rules: { strategy: 'inline-context' },
    context: { file: 'GEMINI.md', location: 'root' },
    invoke: { prefix: '/', separator: ' ' },
  },
  codex: {
    commands: null,
    skills: { format: 'skill.md', dir: '.codex/skills' },
    agents: null,
    rules: { strategy: 'inline-context' },
    context: { file: 'AGENTS.md', location: 'root' },
    invoke: { prefix: '$', separator: ' ' },
  },
  kimi: {
    commands: null,
    skills: { format: 'skill.md', dir: '.kimi/skills' },
    agents: { format: 'yaml', dir: '.kimi/agents' },
    rules: { strategy: 'inline-agent-prompt' },
    context: { file: null, strategy: 'agent-yaml-prompt' },
    invoke: { prefix: '/skill:', separator: ' ' },
  },
  opencode: {
    commands: null,
    skills: { format: 'skill.md', dir: '.opencode/skills' },
    agents: { format: 'md', dir: '.opencode/agents' },
    rules: { strategy: 'inline-context' },
    context: { file: 'AGENTS.md', location: '.opencode' },
    invoke: { prefix: '@', separator: ' ' },
  },
};

// ─────────────────────────────────────────────────────
// CLI CAPABILITIES VALIDASYON
// ─────────────────────────────────────────────────────

function validateCliCapabilities(name, cap) {
  const errors = [];

  if (!cap || typeof cap !== 'object') {
    return [`${name}: capabilities objesi gerekli`];
  }

  // invoke zorunlu
  if (!cap.invoke || typeof cap.invoke.prefix !== 'string' || typeof cap.invoke.separator !== 'string') {
    errors.push(`${name}: invoke.prefix (string) ve invoke.separator (string) zorunlu`);
  }

  // commands veya skills en az birisi olmali
  if (!cap.commands && !cap.skills) {
    errors.push(`${name}: commands veya skills tanimlarindan en az biri gerekli`);
  }

  // commands varsa format ve dir olmali
  if (cap.commands && (!cap.commands.format || !cap.commands.dir)) {
    errors.push(`${name}: commands.format ve commands.dir zorunlu`);
  }

  // skills varsa format ve dir olmali
  if (cap.skills && (!cap.skills.format || !cap.skills.dir)) {
    errors.push(`${name}: skills.format ve skills.dir zorunlu`);
  }

  // agents varsa format ve dir olmali
  if (cap.agents && (!cap.agents.format || !cap.agents.dir)) {
    errors.push(`${name}: agents.format ve agents.dir zorunlu`);
  }

  // context zorunlu
  if (!cap.context) {
    errors.push(`${name}: context tanimi zorunlu`);
  }

  return errors;
}

function loadExternalCapabilities(configPath) {
  const merged = { ...CLI_CAPABILITIES };

  if (!configPath || !fs.existsSync(configPath)) return merged;

  const ext = path.extname(configPath).toLowerCase();
  let external;
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    external = ext === '.json' ? JSON.parse(raw) : yaml.load(raw);
  } catch (err) {
    const location = err.mark ? ` (satir ${err.mark.line + 1})` : '';
    throw new Error(`CLI config parse hatasi${location}: ${err.message}`);
  }

  if (!external || typeof external !== 'object') return merged;

  const allErrors = [];
  for (const [name, cap] of Object.entries(external)) {
    const errors = validateCliCapabilities(name, cap);
    if (errors.length > 0) {
      allErrors.push(...errors);
    } else {
      merged[name] = cap;
    }
  }

  if (allErrors.length > 0) {
    throw new Error(`CLI config validasyon hatalari:\n  ${allErrors.join('\n  ')}`);
  }

  return merged;
}

// ─────────────────────────────────────────────────────
// DESCRIPTION CIKARMA
// ─────────────────────────────────────────────────────

function extractDescription(content) {
  // "# Task Master — Aciklama", "# Task Master - Aciklama", "# Task Master: Aciklama"
  const titleMatch = content.match(/^#\s+.+?\s*[—\-:]\s*(.+)$/m);
  if (titleMatch) return titleMatch[1].trim();

  // "# Task Master (Aciklama)"
  const parenMatch = content.match(/^#\s+.+?\((.+?)\)\s*$/m);
  if (parenMatch) return parenMatch[1].trim();

  const quoteMatch = content.match(/^>\s*(.+)$/m);
  if (quoteMatch) return quoteMatch[1].trim();

  return 'Agentic workflow komutu';
}

// ─────────────────────────────────────────────────────
// INVOKE SYNTAX DONUSUMU
// ─────────────────────────────────────────────────────

function adaptInvokeSyntax(content, targetCli) {
  const cap = CLI_CAPABILITIES[targetCli];
  if (!cap) return content;

  const prefix = cap.invoke.prefix;
  if (prefix === '/') return content; // Gemini — degismez

  // Backtick icindeki /komut-adi pattern'ini yakala
  return content.replace(/`\/([\w-]+)([^`]*)`/g, (match, cmd, rest) => {
    return `\`${prefix}${cmd}${rest}\``;
  });
}

// ─────────────────────────────────────────────────────
// PATH REFERENCES DONUSUMU
// ─────────────────────────────────────────────────────

const PATH_MAPS = {
  gemini: {
    '.claude/commands/': '.gemini/commands/',
    '.claude/agents/': '.gemini/agents/',
    '.claude/rules/': '.gemini/rules/',
    'CLAUDE.md': 'GEMINI.md',
  },
  codex: {
    '.claude/commands/': '.codex/skills/',
    '.claude/agents/': '.codex/skills/',
    '.claude/rules/': '.codex/rules/',
    'CLAUDE.md': 'AGENTS.md',
  },
  kimi: {
    '.claude/commands/': '.kimi/skills/',
    '.claude/agents/': '.kimi/agents/',
    '.claude/rules/': '.kimi/rules/',
    'CLAUDE.md': '.kimi/agents/default-prompt.md',
  },
  opencode: {
    '.claude/commands/': '.opencode/skills/',
    '.claude/agents/': '.opencode/agents/',
    '.claude/rules/': '.opencode/rules/',
    'CLAUDE.md': '.opencode/AGENTS.md',
  },
};

// Manifest transform.skip_paths ile override edilebilir
// .claude/rules/ SKIP_PATHS'ten cikarildi — rule referanslari PATH_MAPS ile donusturuluyor
let SKIP_PATHS = ['.claude/hooks/', '.claude/tracking/', '.claude/reports/'];

/**
 * Varsayılan PATH_MAPS ile manifest'ten gelen özel path eşlemelerini birleştirir.
 * Manifest tanımı aynı CLI için varsayılan eşlemeleri ezer.
 * @param {Object|undefined} manifestPathMaps - manifest.path_maps alanı
 * @returns {Object} Birleştirilmiş path map
 */
function mergePathMaps(manifestPathMaps) {
  if (!manifestPathMaps || typeof manifestPathMaps !== 'object') {
    // Shallow copy — aynı referansı döndürmemek için (mutasyon koruması)
    return Object.fromEntries(Object.entries(PATH_MAPS).map(([k, v]) => [k, { ...v }]));
  }

  const merged = {};
  for (const cli of Object.keys(PATH_MAPS)) {
    merged[cli] = { ...PATH_MAPS[cli], ...(manifestPathMaps[cli] || {}) };
  }
  // Manifest'te PATH_MAPS'te olmayan yeni CLI tanımları da desteklenir
  for (const cli of Object.keys(manifestPathMaps)) {
    if (!merged[cli]) {
      merged[cli] = { ...manifestPathMaps[cli] };
    }
  }
  return merged;
}

function adaptPathReferences(content, targetCli, pathMaps = PATH_MAPS) {
  let result = content;

  for (const skipPath of SKIP_PATHS) {
    result = result.replace(new RegExp(`^.*${escapeRegex(skipPath)}.*$`, 'gm'), '');
  }
  result = result.replace(/\n{3,}/g, '\n\n');

  const maps = pathMaps[targetCli];
  if (maps) {
    for (const [from, to] of Object.entries(maps)) {
      result = result.replace(new RegExp(escapeRegex(from), 'g'), to);
    }
  }

  return result;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─────────────────────────────────────────────────────
// CLAUDE-ONLY BOLUM TEMIZLEME
// ─────────────────────────────────────────────────────

const CLAUDE_ONLY_PATTERNS = [
  // Bolum basligi + icerik: satir satir tara, baska bolum baslayana kadar sil
  /### Otomatik Test Sinyalleri \(Hook Tabanli\)(?:\n(?!## |---).*)*/g,
  /^.*settings\.json.*$/gm,
  /^\*\*Source of truth:\*\*.*\.claude\/hooks\/.*$/gm,
];

function stripClaudeOnlySections(content) {
  let result = content;
  for (const pattern of CLAUDE_ONLY_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result.replace(/\n{3,}/g, '\n\n').trim();
}

// ─────────────────────────────────────────────────────
// RULES INLINE MERGE
// ─────────────────────────────────────────────────────

function inlineRules(content, rules) {
  if (!rules || rules.length === 0) return content;
  const rulesSection = rules.map(r => `\n---\n\n${r.content}`).join('\n');
  return content + '\n' + rulesSection;
}

// ─────────────────────────────────────────────────────
// ADAPT CONTENT WRAPPER
// ─────────────────────────────────────────────────────

function adaptContent(content, targetCli, rules, pathMaps = PATH_MAPS) {
  let result = stripClaudeOnlySections(content);
  if (rules && rules.length > 0) {
    result = inlineRules(result, rules);
  }
  result = adaptPathReferences(result, targetCli, pathMaps);
  result = adaptInvokeSyntax(result, targetCli);
  return result;
}

// ─────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────

function toToml(description, content) {
  const escapedDesc = description.replace(/"/g, '\\"');

  // TOML literal multiline string (''') icinde ''' dizisi bulunamaz.
  // Icerik ''' iceriyorsa multiline basic string (""") kullanilir
  // ve backslash + cift tirnak escape edilir.
  if (content.includes("'''")) {
    const escapedContent = content
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
    return `description = "${escapedDesc}"\n\nprompt = """\n${escapedContent}\n"""`;
  }

  // Guvenli durum: icerik ''' icermiyor, literal string kullanilabilir.
  return `description = "${escapedDesc}"\n\nprompt = '''\n${content}\n'''`;
}

function toSkillMd(name, description, content) {
  const escapedDesc = description.replace(/"/g, '\\"');
  return `---\nname: ${name}\ndescription: "${escapedDesc}"\n---\n\n${content}`;
}

function toKimiAgentYaml(name, promptPath) {
  const obj = {
    version: 1,
    agent: {
      extend: 'default',
      name: name,
      system_prompt_path: promptPath,
    },
  };
  return yaml.dump(obj, { lineWidth: -1 });
}

function toOpenCodeAgent(name, description, content) {
  const escapedDesc = description.replace(/"/g, '\\"');
  return `---\ndescription: "${escapedDesc}"\nmode: subagent\n---\n\n${content}`;
}

// ─────────────────────────────────────────────────────
// FRONTMATTER TEMIZLEME
// ─────────────────────────────────────────────────────

function stripFrontmatter(content) {
  const match = content.match(/^---\n[\s\S]*?\n---\n+/);
  if (match) return content.slice(match[0].length);
  return content;
}

// ─────────────────────────────────────────────────────
// .CLAUDE/ DIZIN PARSER
// ─────────────────────────────────────────────────────

function parseClaudeOutput(claudeDir) {
  if (!fs.existsSync(claudeDir)) {
    throw new Error(`Claude cikti dizini bulunamadi: ${claudeDir}. Once generate.js calistirin.`);
  }

  const commands = [];
  const agents = [];
  const rules = [];
  let context = '';

  const contextPath = path.join(claudeDir, 'CLAUDE.md');
  if (fs.existsSync(contextPath)) {
    context = fs.readFileSync(contextPath, 'utf8');
  }

  const dirMap = { commands, agents, rules };
  for (const [dirName, collection] of Object.entries(dirMap)) {
    const dirPath = path.join(claudeDir, dirName);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
    for (const file of files) {
      let content = fs.readFileSync(path.join(dirPath, file), 'utf8');
      const name = path.basename(file, '.md');
      if (dirName === 'agents') {
        content = stripFrontmatter(content);
      }
      collection.push({ name, content });
    }
  }

  return { commands, agents, rules, context };
}

// ─────────────────────────────────────────────────────
// FORMAT HELPERS
// ─────────────────────────────────────────────────────

/**
 * Bir komut dosyasını hedef CLI formatına dönüştürür.
 * @returns {Object} { outputPath: content } çiftleri
 */
function formatCommand(name, desc, adapted, cap) {
  if (cap.commands) {
    return { [`${cap.commands.dir}/${name}.toml`]: toToml(desc, adapted) };
  }
  if (cap.skills) {
    return { [`${cap.skills.dir}/${name}/SKILL.md`]: toSkillMd(name, desc, adapted) };
  }
  return {};
}

/**
 * Bir agent dosyasını hedef CLI formatına dönüştürür.
 * @returns {Object} { outputPath: content } çiftleri (Kimi için birden fazla dosya üretebilir)
 */
function formatAgent(name, desc, adapted, cap, targetCli) {
  // CLI'ın agents dizini yoksa, skills dizinine fallback (örn. Codex)
  if (!cap.agents && cap.skills) {
    return { [`${cap.skills.dir}/${name}/SKILL.md`]: toSkillMd(name, desc, adapted) };
  }
  if (!cap.agents) return {};

  if (cap.agents.format === 'yaml') {
    // Kimi: ayrı YAML tanım + prompt dosyası
    return {
      [`${cap.agents.dir}/${name}.yaml`]: toKimiAgentYaml(name, `./${name}-prompt.md`),
      [`${cap.agents.dir}/${name}-prompt.md`]: adapted,
    };
  }
  if (cap.agents.format === 'md' && targetCli === 'opencode') {
    return { [`${cap.agents.dir}/${name}.md`]: toOpenCodeAgent(name, desc, adapted) };
  }
  // Varsayılan: saf Markdown (örn. Gemini)
  return { [`${cap.agents.dir}/${name}.md`]: adapted };
}

// ─────────────────────────────────────────────────────
// PIPELINE ORKESTRASYONU
// ─────────────────────────────────────────────────────

function transformForTarget(source, targetCli, pathMaps = PATH_MAPS) {
  const cap = CLI_CAPABILITIES[targetCli];
  if (!cap) return {};

  const fileMap = {};

  for (const cmd of source.commands) {
    const adapted = adaptContent(cmd.content, targetCli, undefined, pathMaps);
    const desc = extractDescription(adapted);
    Object.assign(fileMap, formatCommand(cmd.name, desc, adapted, cap));
  }

  for (const agent of source.agents) {
    const adapted = adaptContent(agent.content, targetCli, undefined, pathMaps);
    const desc = extractDescription(adapted);
    Object.assign(fileMap, formatAgent(agent.name, desc, adapted, cap, targetCli));
  }

  if (cap.context.file) {
    const contextContent = adaptContent(source.context, targetCli, source.rules, pathMaps);
    const loc = cap.context.location === 'root'
      ? cap.context.file
      : `${cap.context.location}/${cap.context.file}`;
    fileMap[loc] = contextContent;
  } else if (cap.context.strategy === 'agent-yaml-prompt') {
    // Kimi default agent
    const contextContent = adaptContent(source.context, targetCli, source.rules, pathMaps);
    fileMap[`${cap.agents.dir}/default.yaml`] = toKimiAgentYaml('default', './default-prompt.md');
    fileMap[`${cap.agents.dir}/default-prompt.md`] = contextContent;
  }

  return fileMap;
}

function writeTarget(outputDir, targetCli, fileMap) {
  const errors = [];
  for (const [relPath, content] of Object.entries(fileMap)) {
    const fullPath = path.join(outputDir, relPath);
    try {
      // Path traversal koruması
      const resolvedFull = path.resolve(fullPath);
      const resolvedBase = path.resolve(outputDir);
      if (!resolvedFull.startsWith(resolvedBase + path.sep) && resolvedFull !== resolvedBase) {
        throw new Error(`Path traversal: ${relPath} dizin disinda`);
      }
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf8');
    } catch (err) {
      errors.push(`${relPath}: ${err.message}`);
    }
  }
  if (errors.length > 0) {
    console.error(`[${targetCli}] ${errors.length} dosya yazilamadi:`);
    errors.forEach(e => console.error(`  ! ${e}`));
  }
  return errors;
}

// ─────────────────────────────────────────────────────
// CLI ENTRY POINT
// ─────────────────────────────────────────────────────

const VALID_TARGETS = new Set(Object.keys(CLI_CAPABILITIES));

function resolveTargets(manifest, targetsFlag) {
  const manifestTargets = (manifest.targets || []).filter(t => t !== 'claude');

  let targets;
  if (targetsFlag) {
    const requested = targetsFlag.split(',').map(t => t.trim()).filter(Boolean);
    if (manifestTargets.length > 0) {
      // Manifest'te targets varsa → filtrele
      targets = manifestTargets.filter(t => new Set(requested).has(t));
    } else {
      // Manifest'te targets yoksa → flag dogrudan hedef listesi olur
      targets = requested;
    }
  } else {
    targets = manifestTargets;
  }

  const invalid = [];
  const validTargets = targets.filter(t => {
    if (!VALID_TARGETS.has(t)) {
      invalid.push({ name: t, reason: `bilinmeyen CLI — gecerli degerler: ${[...VALID_TARGETS].join(', ')}` });
      return false;
    }
    return true;
  });

  return { targets: validTargets, invalid };
}

function main() {
  const args = process.argv.slice(2);
  const flags = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    targets: null,
  };

  const targetsIdx = args.indexOf('--targets');
  if (targetsIdx !== -1 && args[targetsIdx + 1]) {
    flags.targets = args[targetsIdx + 1];
  }

  const VALUE_FLAGS = new Set(['--targets']);
  const manifestPath = args.find((a, i) => {
    if (a.startsWith('--')) return false;
    if (i > 0 && VALUE_FLAGS.has(args[i - 1])) return false;
    return true;
  });

  if (!manifestPath) {
    console.error('Kullanim: node transform.js <manifest-yolu> [--targets cli1,cli2] [--dry-run] [--verbose]');
    process.exit(1);
  }

  const resolvedPath = path.resolve(manifestPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Hata: Manifest bulunamadi: ${resolvedPath}`);
    process.exit(1);
  }

  const manifest = yaml.load(fs.readFileSync(resolvedPath, 'utf8'));
  const { targets, invalid } = resolveTargets(manifest, flags.targets);

  if (invalid.length > 0) {
    console.error(`Hata: ${invalid.length} gecersiz transform target'i:`);
    invalid.forEach(({ name, reason }) => console.error(`  ! "${name}": ${reason}`));
    process.exit(1);
  }

  if (targets.length === 0) {
    console.log('Transform hedefi yok — sadece Claude aktif.');
    return;
  }

  // Manifest transform config ile global sabitleri override et
  if (Array.isArray(manifest?.transform?.skip_paths)) {
    SKIP_PATHS = manifest.transform.skip_paths;
  }

  const claudeDir = path.join(AGENTBASE_DIR, '.claude');
  const source = parseClaudeOutput(claudeDir);
  const effectivePathMaps = mergePathMaps(manifest.path_maps);

  const report = { targets: [], totalFiles: 0, errors: [] };

  for (const target of targets) {
    try {
      const fileMap = transformForTarget(source, target, effectivePathMaps);
      const fileCount = Object.keys(fileMap).length;

      if (!flags.dryRun) {
        const writeErrors = writeTarget(AGENTBASE_DIR, target, fileMap);
        if (writeErrors && writeErrors.length > 0) {
          report.errors.push(...writeErrors.map(e => `${target}: ${e}`));
        }
      }

      report.targets.push({ name: target, files: fileCount });
      report.totalFiles += fileCount;

      if (flags.verbose) {
        console.log(`\n  ${target}: ${fileCount} dosya`);
        for (const key of Object.keys(fileMap)) {
          console.log(`    ${key}`);
        }
      }
    } catch (err) {
      report.errors.push(`${target}: ${err.message}`);
    }
  }

  console.log('');
  console.log('\u2501'.repeat(55));
  console.log('  Transform Raporu');
  console.log('\u2501'.repeat(55));
  for (const t of report.targets) {
    console.log(`  ${t.name}: ${t.files} dosya`);
  }
  console.log(`  Toplam: ${report.totalFiles} dosya`);
  if (report.errors.length > 0) {
    console.log(`  Hata: ${report.errors.length}`);
    report.errors.forEach(e => console.log(`    ${e}`));
  }
  if (flags.dryRun) {
    console.log('  Mod: DRY RUN (dosya yazilmadi)');
  }
  console.log('\u2501'.repeat(55));

  if (report.errors.length > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

// ─────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────

module.exports = {
  extractDescription,
  adaptInvokeSyntax,
  adaptPathReferences,
  stripClaudeOnlySections,
  inlineRules,
  adaptContent,
  toToml,
  toSkillMd,
  toKimiAgentYaml,
  toOpenCodeAgent,
  stripFrontmatter,
  parseClaudeOutput,
  formatCommand,
  formatAgent,
  transformForTarget,
  writeTarget,
  resolveTargets,
  mergePathMaps,
  validateCliCapabilities,
  loadExternalCapabilities,
  escapeRegex,
  CLI_CAPABILITIES,
  PATH_MAPS,
  AGENTBASE_DIR,
};

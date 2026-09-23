'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { describe, it } = require('node:test');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const REPO = path.resolve(ROOT, '..');
const manifest = require('./helpers/test-manifest');

const DISCIPLINES = [
  'Commit completed non-sensitive work in the same session without asking. Do not push unless the user asks.',
  'When a workflow chain breaks (hook rejection, path or working-directory error, backlog CLI failure, or an MCP/tool error that blocks the chain), record a backlog item.',
  'Do not state a root cause, a numeric threshold, or that a fix works without a falsifiable measurement. Label anything unmeasured.',
  'Each acceptance check names an evidence class and an owner. Human-only acceptance is not an agent Done gate.',
  'Do not tell a subagent to call a tool that exists only in the parent session.',
];

const TEMPLATE_TEXT = new Set(['.md', '.json', '.js', '.py', '.yml', '.yaml']);
const TURKISH_PROSE = /\b(Yapilandirmasi|Bolum|calistir|Gelistirme Komutlari|Yasakli Islemler|Calisma Dizinleri|Temel Dosyalar|Claude Code Yapilandirmasi|dosyasi|duzenlenemez|kullanin|yasak|veya|listele|tetikle|gecmisi|degiskenleri|donusumu|bilinmeyen|birakilir|olabilir|kayip|akilli|tirnak|duzeltme|uygulamalari|icerik|ornegi|kritik|yuksek|orta|cakisma|bossa|kolon|tablo|olarak|tespiti|formatlama|sifre|olmamali|verisi|icerir|iceren|icermez|tum|tumu|hepsi|gosterir|yapilir|edilir|bulunur|kullanilir|HATIRLATICI|birikimi|degistirildi|onerilen|sebep|manuel)\b/i;

const CORE_LOOP = [
  'Task: read the backlog item, implement only that scope, and run the verification named in its acceptance checks.',
  'Review: review the diff for correctness, silent failures, and regressions before closing the task.',
  'Commit: commit completed non-sensitive work in the same session without asking. Do not push unless the user asks.',
];

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

function generateTree() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentic-workflow-'));
  const manifestPath = path.join(dir, 'manifest.yaml');
  fs.writeFileSync(manifestPath, yaml.dump(manifest));
  execFileSync(process.execPath, [path.join(ROOT, 'generate.js'), manifestPath, '--output-dir', dir], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  execFileSync(process.execPath, [
    path.join(ROOT, 'transform.js'),
    manifestPath,
    '--targets', 'codex',
    '--source-dir', dir,
    '--output-dir', dir,
  ], { cwd: ROOT, encoding: 'utf8' });
  return dir;
}

describe('host-neutral workflow contract', () => {
  it('ships one English README and does not require a Turkish twin', () => {
    const readme = fs.readFileSync(path.join(REPO, 'README.md'), 'utf8');
    assert.equal(fs.existsSync(path.join(REPO, 'README.en.md')), false);
    assert.equal(fs.existsSync(path.join(REPO, 'README.tr.md')), false);
    assert.match(readme, /Claude is one host, not the product/);
    assert.match(readme, /Bootstrap does not install it and does not fail when it is absent/);
    assert.doesNotMatch(readme, /uv tool install graphifyy/);
    assert.doesNotMatch(readme, /README\.en\.md/);
    for (const sentence of DISCIPLINES) assert.ok(readme.includes(sentence), sentence);
  });

  it('generates the shared disciplines and the same steps on a non-Claude host', () => {
    const first = generateTree();
    const second = generateTree();
    const list = (dir) => walk(dir).map((file) => path.relative(dir, file)).sort();
    const filesA = list(first);
    const filesB = list(second);
    assert.deepEqual(filesA, filesB);
    for (const rel of filesA) {
      const a = fs.readFileSync(path.join(first, rel));
      const b = fs.readFileSync(path.join(second, rel));
      assert.deepEqual(a, b, rel);
    }

    const body = fs.readFileSync(path.join(first, '.claude/rules/portable-disciplines.md'), 'utf8');
    const host = fs.readFileSync(path.join(first, 'AGENTS.md'), 'utf8');
    for (const sentence of [...DISCIPLINES, ...CORE_LOOP]) {
      assert.ok(body.includes(sentence), `shared body missing: ${sentence}`);
      assert.ok(host.includes(sentence), `Codex AGENTS.md missing: ${sentence}`);
    }
    assert.match(host, /Other hosts do not run those hooks automatically/);
    assert.equal(filesA.some((rel) => rel.endsWith('turkish-diacritic-guard.js')), false);
    assert.equal(filesA.some((rel) => rel.endsWith('turkish-writing.md')), false);
    const settings = fs.readFileSync(path.join(first, '.claude/settings.json'), 'utf8');
    assert.equal(settings.includes('turkish-diacritic-guard'), false);

    const offenders = [];
    const chunks = [];
    for (const rel of filesA) {
      if (!rel.endsWith('.md') && !rel.endsWith('.json')) continue;
      const text = fs.readFileSync(path.join(first, rel), 'utf8');
      chunks.push(text);
      if (/[çğıöşüÇĞİÖŞÜ]/.test(text) || TURKISH_PROSE.test(text)) offenders.push(rel);
    }
    assert.doesNotMatch(host, /Claude Code Yapilandirmasi/);
    assert.match(host, /Agent workflow/);
    assert.match(host, /Claude is one host, not the product/);
    const joined = chunks.join('\n');
    assert.doesNotMatch(joined, /uv tool install graphifyy/);
    assert.doesNotMatch(joined, /Binance/);
    assert.doesNotMatch(joined, /deck rebuild/i);
    assert.deepEqual(offenders, []);
  });

  it('keeps every shipped template in English, including modules this manifest does not generate', () => {
    const templates = path.join(ROOT, 'templates');
    const offenders = [];
    for (const file of walk(templates)) {
      if (!TEMPLATE_TEXT.has(path.extname(file))) continue;
      const text = fs.readFileSync(file, 'utf8');
      if (/[çğıöşüÇĞİÖŞÜ]/.test(text) || TURKISH_PROSE.test(text)) {
        offenders.push(path.relative(templates, file));
      }
    }
    assert.deepEqual(offenders, []);
  });

  it('keeps the live project settings hook reminder in English', () => {
    const hooksDir = path.join(REPO, '.claude', 'hooks');
    const reminder = path.join(hooksDir, 'agentbase-test-reminder.js');
    const settings = path.join(REPO, '.claude', 'settings.json');
    assert.equal(fs.existsSync(reminder), true);
    assert.equal(fs.existsSync(settings), true);
    const files = [settings, ...walk(hooksDir)];
    const offenders = [];
    for (const file of files) {
      if (!TEMPLATE_TEXT.has(path.extname(file))) continue;
      const text = fs.readFileSync(file, 'utf8');
      if (/[çğıöşüÇĞİÖŞÜ]/.test(text) || TURKISH_PROSE.test(text)) {
        offenders.push(path.relative(REPO, file));
      }
    }
    const reminderText = fs.readFileSync(reminder, 'utf8');
    assert.match(reminderText, /AGENTBASE TEST REMINDER/);
    assert.match(reminderText, /Suggested command/);
    assert.doesNotMatch(reminderText, /HATIRLATICI|birikimi|degistirildi/);
    assert.deepEqual(offenders, []);
  });
});

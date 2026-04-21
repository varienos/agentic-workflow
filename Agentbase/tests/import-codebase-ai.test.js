'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const { describe, it, beforeEach, afterEach } = require('node:test');
const { spawnSync } = require('child_process');

const SCRIPT = path.join(__dirname, '..', 'bin', 'import-codebase-ai.js');
const {
  parseArgs,
  detectAssets,
  formatPlan,
  checkDestinationConflicts,
  countFilesRecursive,
} = require('../bin/import-codebase-ai.js');

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function writeFile(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
}

function populateFixture(codebase, extras = {}) {
  writeFile(path.join(codebase, '.claude', 'commands', 'foo.md'), 'cmd');
  writeFile(path.join(codebase, '.claude', 'memory', 'm1.md'), 'mem1');
  writeFile(path.join(codebase, '.claude', 'agent-memory', 'a1.md'), 'am1');
  writeFile(path.join(codebase, 'CLAUDE.md'), '# proje talimatları');
  writeFile(path.join(codebase, '.mcp.json'), '{"servers":{}}');
  writeFile(path.join(codebase, 'backlog', 'tasks', 'task-1.md'), 'task1');
  writeFile(path.join(codebase, 'backlog', 'completed', 'task-done.md'), 'done1');
  for (const [rel, content] of Object.entries(extras)) {
    writeFile(path.join(codebase, rel), content);
  }
}

function runScript(args, opts = {}) {
  return spawnSync('node', [SCRIPT, ...args], {
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, ...(opts.env || {}) },
  });
}

describe('parseArgs', () => {
  it('parses all supported flags', () => {
    const a = parseArgs(['node', 'script', '--codebase', '/a', '--agentbase', '/b', '--dry-run', '--yes']);
    assert.equal(a.codebase, '/a');
    assert.equal(a.agentbase, '/b');
    assert.equal(a.dryRun, true);
    assert.equal(a.yes, true);
  });

  it('defaults are null/false', () => {
    const a = parseArgs(['node', 'script']);
    assert.equal(a.codebase, null);
    assert.equal(a.agentbase, null);
    assert.equal(a.dryRun, false);
    assert.equal(a.yes, false);
  });
});

describe('detectAssets', () => {
  let codebase;
  let agentbase;

  beforeEach(() => {
    codebase = tempDir('import-cb-');
    agentbase = tempDir('import-ab-');
  });

  afterEach(() => {
    rmrf(codebase);
    rmrf(agentbase);
  });

  it('returns empty array for empty codebase', () => {
    const items = detectAssets(codebase, agentbase, 'TS');
    assert.equal(items.length, 0);
  });

  it('detects all 7 asset types for full fixture', () => {
    populateFixture(codebase);
    const items = detectAssets(codebase, agentbase, 'TS');
    const labels = items.map(i => i.label).sort();
    assert.deepEqual(labels, [
      '.claude/',
      '.claude/agent-memory/',
      '.claude/memory/',
      '.mcp.json',
      'CLAUDE.md',
      'backlog/completed/',
      'backlog/tasks/',
    ]);
  });

  it('routes memory to custom/memory/ and others to _imported/', () => {
    populateFixture(codebase);
    const items = detectAssets(codebase, agentbase, 'TS');
    const mem = items.find(i => i.label === '.claude/memory/');
    const instr = items.find(i => i.label === 'CLAUDE.md');
    assert.ok(mem.dst.includes(path.join('custom', 'memory', 'memory')));
    assert.ok(instr.dst.includes(path.join('custom', '_imported', 'TS')));
  });

  it('routes backlog/* to Agentbase/backlog/*', () => {
    populateFixture(codebase);
    const items = detectAssets(codebase, agentbase, 'TS');
    const tasks = items.find(i => i.label === 'backlog/tasks/');
    assert.equal(tasks.dst, path.join(agentbase, 'backlog', 'tasks'));
  });

  it('skips missing optional assets', () => {
    writeFile(path.join(codebase, 'CLAUDE.md'), '# only');
    const items = detectAssets(codebase, agentbase, 'TS');
    assert.equal(items.length, 1);
    assert.equal(items[0].label, 'CLAUDE.md');
  });
});

describe('countFilesRecursive', () => {
  it('counts files in nested directories', () => {
    const d = tempDir('count-');
    try {
      writeFile(path.join(d, 'a.txt'), 'a');
      writeFile(path.join(d, 'sub', 'b.txt'), 'b');
      writeFile(path.join(d, 'sub', 'deep', 'c.txt'), 'c');
      assert.equal(countFilesRecursive(d), 3);
    } finally {
      rmrf(d);
    }
  });

  it('returns 0 for missing directory', () => {
    assert.equal(countFilesRecursive('/nonexistent/xyz'), 0);
  });
});

describe('formatPlan', () => {
  it('returns terse message for empty input', () => {
    const out = formatPlan([], '/cb', '/ab');
    assert.match(out, /bulunamadı/);
  });

  it('lists items and total count', () => {
    const items = [
      { label: '.claude/', src: '/cb/.claude', dst: '/ab/x', kind: 'dir', fileCount: 3, category: 'claude' },
      { label: 'CLAUDE.md', src: '/cb/CLAUDE.md', dst: '/ab/y', kind: 'file', fileCount: 1, category: 'instruction' },
    ];
    const out = formatPlan(items, '/cb', '/ab');
    assert.match(out, /4 dosya kopyalanacak/);
    assert.match(out, /\.claude/);
    assert.match(out, /CLAUDE\.md/);
  });
});

describe('checkDestinationConflicts', () => {
  let codebase;
  let agentbase;

  beforeEach(() => {
    codebase = tempDir('conflict-cb-');
    agentbase = tempDir('conflict-ab-');
  });

  afterEach(() => {
    rmrf(codebase);
    rmrf(agentbase);
  });

  it('no conflicts when agentbase is empty', () => {
    populateFixture(codebase);
    const items = detectAssets(codebase, agentbase, 'TS');
    assert.equal(checkDestinationConflicts(items).length, 0);
  });

  it('detects backlog file collision', () => {
    populateFixture(codebase);
    writeFile(path.join(agentbase, 'backlog', 'tasks', 'task-99.md'), 'existing');
    const items = detectAssets(codebase, agentbase, 'TS');
    const conflicts = checkDestinationConflicts(items);
    assert.ok(conflicts.some(c => c.label === 'backlog/tasks/'));
  });
});

describe('import-codebase-ai CLI', () => {
  let codebase;
  let agentbase;

  beforeEach(() => {
    codebase = tempDir('cli-cb-');
    agentbase = tempDir('cli-ab-');
  });

  afterEach(() => {
    rmrf(codebase);
    rmrf(agentbase);
  });

  it('prints NO_IMPORT_NEEDED for empty codebase', () => {
    const r = runScript(['--codebase', codebase, '--agentbase', agentbase, '--yes']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /NO_IMPORT_NEEDED/);
  });

  it('prints IMPORT_DONE on dry-run and makes no changes', () => {
    populateFixture(codebase);
    const snapshot = fs.readdirSync(agentbase);
    const r = runScript([
      '--codebase', codebase,
      '--agentbase', agentbase,
      '--dry-run',
    ]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /IMPORT_DONE/);
    assert.match(r.stdout, /\[dry-run\]/);
    // Agentbase hiç değişmemeli
    assert.deepEqual(fs.readdirSync(agentbase), snapshot);
    // Codebase de değişmemeli
    assert.ok(fs.existsSync(path.join(codebase, '.claude')));
    assert.ok(fs.existsSync(path.join(codebase, 'CLAUDE.md')));
  });

  it('full run with --yes moves files and deletes sources', () => {
    populateFixture(codebase);
    const r = runScript(['--codebase', codebase, '--agentbase', agentbase, '--yes']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /IMPORT_DONE/);

    // Kaynaklar silinmiş
    assert.ok(!fs.existsSync(path.join(codebase, '.claude')));
    assert.ok(!fs.existsSync(path.join(codebase, 'CLAUDE.md')));
    assert.ok(!fs.existsSync(path.join(codebase, '.mcp.json')));
    assert.ok(!fs.existsSync(path.join(codebase, 'backlog', 'tasks')));

    // Hedefler oluşmuş
    const memorySrc = path.join(agentbase, '.claude', 'custom', 'memory', 'memory', 'm1.md');
    const agentMemSrc = path.join(agentbase, '.claude', 'custom', 'memory', 'agent-memory', 'a1.md');
    assert.ok(fs.existsSync(memorySrc));
    assert.ok(fs.existsSync(agentMemSrc));
    assert.ok(fs.existsSync(path.join(agentbase, 'backlog', 'tasks', 'task-1.md')));
    assert.ok(fs.existsSync(path.join(agentbase, 'backlog', 'completed', 'task-done.md')));

    // Rapor dosyası yazılmış
    const customImported = path.join(agentbase, '.claude', 'custom', '_imported');
    const tsDirs = fs.readdirSync(customImported);
    assert.equal(tsDirs.length, 1);
    assert.ok(fs.existsSync(path.join(customImported, tsDirs[0], 'import-report.md')));
  });

  it('detects destination conflicts and aborts without changes', () => {
    populateFixture(codebase);
    writeFile(path.join(agentbase, 'backlog', 'tasks', 'task-99.md'), 'existing');
    const r = runScript(['--codebase', codebase, '--agentbase', agentbase, '--yes']);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /IMPORT_CANCELLED/);
    assert.match(r.stdout, /Hedef çakışması/);

    // Codebase hiç değişmemeli
    assert.ok(fs.existsSync(path.join(codebase, '.claude')));
    assert.ok(fs.existsSync(path.join(codebase, 'CLAUDE.md')));
    // Mevcut agentbase dosyası korunmalı
    assert.equal(
      fs.readFileSync(path.join(agentbase, 'backlog', 'tasks', 'task-99.md'), 'utf8'),
      'existing'
    );
  });

  it('returns IMPORT_ERROR for missing codebase path', () => {
    const r = runScript([
      '--codebase', '/nonexistent/xyz',
      '--agentbase', agentbase,
      '--yes',
    ]);
    assert.equal(r.status, 2);
    assert.match(r.stdout, /IMPORT_ERROR/);
  });
});

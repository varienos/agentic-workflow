#!/usr/bin/env node
'use strict';

/**
 * git-checkpoint.test.js — git-checkpoint hook icin birim ve E2E testler
 * Calistirma: node --test tests/git-checkpoint.test.js
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');

const HOOK_PATH = path.resolve(__dirname, '../templates/core/hooks/git-checkpoint.js');

const {
  isCommitCommand,
  buildCheckpointRef,
  extractCdPath,
  detectTaskId,
  createCheckpoint,
} = require(HOOK_PATH);

describe('git-checkpoint: isCommitCommand', () => {
  it('git commit komutunu yakaliyor', () => {
    assert.ok(isCommitCommand('git commit -m "test"'));
  });

  it('git commit -m HEREDOC yakaliyor', () => {
    assert.ok(isCommitCommand("git commit -m \"$(cat <<'EOF'\nfeat: x\nEOF\n)\""));
  });

  it('cd && git commit zincirini yakaliyor', () => {
    assert.ok(isCommitCommand('cd ../Codebase && git commit -m "x"'));
  });

  it('git commit OLMAYAN komutu yakalamıyor', () => {
    assert.ok(!isCommitCommand('git status'));
    assert.ok(!isCommitCommand('npm test'));
    assert.ok(!isCommitCommand('git push origin main'));
  });

  it('bos ve null girdileri reddediyor', () => {
    assert.ok(!isCommitCommand(''));
    assert.ok(!isCommitCommand(null));
    assert.ok(!isCommitCommand(undefined));
  });

  it('git-commit-foo gibi yakin ismi reddediyor', () => {
    assert.ok(!isCommitCommand('git-commit-foo'));
  });
});

describe('git-checkpoint: buildCheckpointRef', () => {
  it('temel format: refs/checkpoints/agent/<id>-<ts>', () => {
    const fixed = new Date('2026-05-07T10:30:00.000Z');
    const ref = buildCheckpointRef('220', fixed);
    assert.match(ref, /^refs\/checkpoints\/agent\/220-2026-05-07T10-30-00-000Z$/);
  });

  it('tehlikeli karakterleri sanitize ediyor', () => {
    const ref = buildCheckpointRef('foo/../bar; rm -rf /', new Date('2026-05-07T10:30:00.000Z'));
    const tail = ref.split('refs/checkpoints/agent/')[1];
    assert.ok(!tail.includes('/'));
    assert.ok(!tail.includes(';'));
    assert.ok(!tail.includes(' '));
    assert.ok(!tail.includes('..'));
  });

  it('bos taskId fallback olarak manual kullaniyor', () => {
    const ref = buildCheckpointRef('', new Date('2026-05-07T10:30:00.000Z'));
    assert.match(ref, /^refs\/checkpoints\/agent\/manual-/);
  });

  it('sadece ozel karakter iceren taskId fallback olarak manual', () => {
    const ref = buildCheckpointRef('!!!', new Date('2026-05-07T10:30:00.000Z'));
    assert.match(ref, /^refs\/checkpoints\/agent\/manual-/);
  });
});

describe('git-checkpoint: extractCdPath', () => {
  it('cd path && pattern yakaliyor', () => {
    assert.equal(extractCdPath('cd ../Codebase && git commit'), '../Codebase');
  });

  it('cd yoksa null donduruyor', () => {
    assert.equal(extractCdPath('git commit -m "x"'), null);
  });

  it('zincirin ortasindaki cd yakaliyor', () => {
    assert.equal(extractCdPath('echo hi && cd /tmp && ls'), '/tmp');
  });
});

describe('git-checkpoint: detectTaskId', () => {
  it('BACKLOG_ACTIVE_TASK env varsa onu donduruyor', () => {
    const old = process.env.BACKLOG_ACTIVE_TASK;
    process.env.BACKLOG_ACTIVE_TASK = '220';
    try {
      assert.equal(detectTaskId(), '220');
    } finally {
      if (old === undefined) delete process.env.BACKLOG_ACTIVE_TASK;
      else process.env.BACKLOG_ACTIVE_TASK = old;
    }
  });

  it('env yoksa manual donduruyor', () => {
    const old = process.env.BACKLOG_ACTIVE_TASK;
    delete process.env.BACKLOG_ACTIVE_TASK;
    try {
      assert.equal(detectTaskId(), 'manual');
    } finally {
      if (old !== undefined) process.env.BACKLOG_ACTIVE_TASK = old;
    }
  });
});

describe('git-checkpoint: createCheckpoint (gercek git repo)', () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-checkpoint-test-'));
    execFileSync('git', ['init', '-q', '--initial-branch=main'], { cwd: tmpDir, stdio: 'ignore' });
    execFileSync('git', ['config', 'user.email', 'test@test'], { cwd: tmpDir, stdio: 'ignore' });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tmpDir, stdio: 'ignore' });
    execFileSync('git', ['config', 'commit.gpgsign', 'false'], { cwd: tmpDir, stdio: 'ignore' });
    fs.writeFileSync(path.join(tmpDir, 'README.md'), 'init\n');
    execFileSync('git', ['add', 'README.md'], { cwd: tmpDir, stdio: 'ignore' });
    execFileSync('git', ['commit', '-q', '-m', 'init'], { cwd: tmpDir, stdio: 'ignore' });
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('checkpoint ref olusturup HEAD SHA degerini yaziyor', () => {
    const ref = buildCheckpointRef('test', new Date('2026-05-07T10:30:00.000Z'));
    const sha = createCheckpoint(tmpDir, ref);
    assert.ok(sha && sha.length >= 7);
    const stored = execFileSync('git', ['rev-parse', ref], { cwd: tmpDir, encoding: 'utf8' }).trim();
    assert.equal(stored, sha);
  });

  it('gizli ref: branch listesinde gorunmuyor', () => {
    const branches = execFileSync('git', ['branch', '--list'], { cwd: tmpDir, encoding: 'utf8' });
    assert.ok(!branches.includes('checkpoints'));
  });

  it('gizli ref: tag listesinde gorunmuyor', () => {
    const tags = execFileSync('git', ['tag', '--list'], { cwd: tmpDir, encoding: 'utf8' });
    assert.ok(!tags.includes('checkpoints'));
  });
});

describe('git-checkpoint: hook end-to-end (stdin/stdout)', () => {
  function runHook(input) {
    return spawnSync('node', [HOOK_PATH], {
      input: JSON.stringify(input),
      encoding: 'utf8',
      timeout: 5000,
    });
  }

  it('gecerli git commit input ile exit 0 ve sessiz cikiyor (decision yok)', () => {
    const result = runHook({ tool_input: { command: 'git status' } });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  });

  it('non-commit komut icin exit 0 ve sessiz cikiyor', () => {
    const result = runHook({ tool_input: { command: 'echo hello' } });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  });

  it('bozuk JSON ile bile exit 0 (hook sessiz yutar)', () => {
    const result = spawnSync('node', [HOOK_PATH], {
      input: 'not-json{{{',
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  });

  it('bos input ile exit 0 (hook sessiz yutar)', () => {
    const result = spawnSync('node', [HOOK_PATH], {
      input: '',
      encoding: 'utf8',
      timeout: 5000,
    });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, '');
  });

  it('git commit komut + git OLMAYAN cwd ile bile sessiz (commit ASLA bloklanmaz)', () => {
    const old = process.cwd();
    process.chdir(os.tmpdir());
    try {
      const result = runHook({ tool_input: { command: 'git commit -m "x"' } });
      assert.equal(result.status, 0);
      assert.equal(result.stdout, '');
    } finally {
      process.chdir(old);
    }
  });
});

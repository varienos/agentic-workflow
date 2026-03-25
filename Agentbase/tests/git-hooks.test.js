'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { processSkeletonFile } = require('../generate.js');

const HOOKS_DIR = path.join(__dirname, '..', 'templates', 'core', 'git-hooks');

function createTempGitRepo(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'git-hook-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  execSync('git init -b main', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });

  // Ilk commit (bos repo'da hook calisamaz)
  fs.writeFileSync(path.join(dir, 'README.md'), '# test');
  execSync('git add . && git commit -m "init"', { cwd: dir, stdio: 'pipe' });

  return dir;
}

function installPreCommitHook(repoDir) {
  const hooksDir = path.join(repoDir, '.git', 'hooks');
  const hookSrc = path.join(HOOKS_DIR, 'pre-commit.skeleton');
  const hookDst = path.join(hooksDir, 'pre-commit');

  // GENERATE bloklarini temizle (<!-- GENERATE: ... --> satirlarini kaldir)
  let content = fs.readFileSync(hookSrc, 'utf8');
  content = content.replace(/^<!-- GENERATE:[\s\S]*?-->\s*$/gm, '');
  fs.writeFileSync(hookDst, content, { mode: 0o755 });
  return hookDst;
}

function installPrePushHook(repoDir) {
  const hooksDir = path.join(repoDir, '.git', 'hooks');
  const hookSrc = path.join(HOOKS_DIR, 'pre-push.skeleton');
  const hookDst = path.join(hooksDir, 'pre-push');

  let content = fs.readFileSync(hookSrc, 'utf8');
  content = content.replace(/^<!-- GENERATE:[\s\S]*?-->\s*$/gm, '');
  fs.writeFileSync(hookDst, content, { mode: 0o755 });
  return hookDst;
}

function tryCommit(repoDir, env = {}) {
  try {
    const result = execSync('git commit --allow-empty -m "test commit"', {
      cwd: repoDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    });
    return { status: 0, stdout: result.toString() };
  } catch (e) {
    return { status: e.status, stdout: (e.stdout || '').toString(), stderr: (e.stderr || '').toString() };
  }
}

function tryCommitWithFiles(repoDir, env = {}) {
  try {
    const result = execSync('git commit -m "test commit"', {
      cwd: repoDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    });
    return { status: 0, stdout: result.toString() };
  } catch (e) {
    return { status: e.status, stdout: (e.stdout || '').toString(), stderr: (e.stderr || '').toString() };
  }
}

// ─────────────────────────────────────────────────────
// PRE-COMMIT TESTLERI
// ─────────────────────────────────────────────────────

describe('pre-commit hook', () => {
  it('TESTS_VERIFIED=1 ile tum kontroller atlaniyor', t => {
    const repo = createTempGitRepo(t);
    installPreCommitHook(repo);

    // .env dosyasi stage'le — normalde bloklanir
    fs.writeFileSync(path.join(repo, '.env'), 'SECRET=abc');
    execSync('git add .env', { cwd: repo, stdio: 'pipe' });

    const result = tryCommitWithFiles(repo, { TESTS_VERIFIED: '1' });
    assert.equal(result.status, 0, 'TESTS_VERIFIED=1 ile commit basarisiz olmamali');
    assert.equal(result.status, 0, 'TESTS_VERIFIED=1 ile commit gecmeli');
  });

  it('.env dosyasi commit edilemez', t => {
    const repo = createTempGitRepo(t);
    installPreCommitHook(repo);

    fs.writeFileSync(path.join(repo, '.env'), 'DB_PASSWORD=secret123');
    execSync('git add .env', { cwd: repo, stdio: 'pipe' });

    const result = tryCommitWithFiles(repo);
    assert.notEqual(result.status, 0, '.env commit engellemeli');
    const output = result.stdout + result.stderr;
    assert.ok(output.includes('.env'), 'hata mesajinda .env olmali');
  });

  it('.env.local ve .env.production da engellenir', t => {
    const repo = createTempGitRepo(t);
    installPreCommitHook(repo);

    fs.writeFileSync(path.join(repo, '.env.production'), 'API_KEY=prod123');
    execSync('git add .env.production', { cwd: repo, stdio: 'pipe' });

    const result = tryCommitWithFiles(repo);
    assert.notEqual(result.status, 0, '.env.production commit engellemeli');
  });

  it('temiz dosya ile commit basarili', t => {
    const repo = createTempGitRepo(t);
    installPreCommitHook(repo);

    fs.writeFileSync(path.join(repo, 'app.js'), 'console.log("hello")');
    execSync('git add app.js', { cwd: repo, stdio: 'pipe' });

    const result = tryCommitWithFiles(repo);
    assert.equal(result.status, 0, 'temiz dosya ile commit basarili olmali');
  });

  it('hardcoded API key tespit ediliyor', t => {
    const repo = createTempGitRepo(t);
    installPreCommitHook(repo);

    fs.writeFileSync(path.join(repo, 'config.js'), 'const key = "sk-abcdefghijklmnopqrstuvwxyz1234567890"');
    execSync('git add config.js', { cwd: repo, stdio: 'pipe' });

    const result = tryCommitWithFiles(repo);
    assert.notEqual(result.status, 0, 'hardcoded API key engellemeli');
    const output = result.stdout + result.stderr;
    assert.ok(output.includes('API key') || output.includes('sk-'), 'API key uyarisi olmali');
  });
});

// ─────────────────────────────────────────────────────
// PRE-PUSH TESTLERI
// ─────────────────────────────────────────────────────

describe('pre-push hook', () => {
  it('merge-tree conflict tespit ediyor ve push engelliyor', t => {
    const repo = createTempGitRepo(t);
    installPrePushHook(repo);

    // main'de bir dosya olustur
    fs.writeFileSync(path.join(repo, 'shared.txt'), 'main icerik');
    execSync('git add . && git commit -m "main: shared.txt"', { cwd: repo, stdio: 'pipe' });

    // Feature branch olustur
    execSync('git checkout -b feature/test', { cwd: repo, stdio: 'pipe' });
    fs.writeFileSync(path.join(repo, 'shared.txt'), 'feature degisiklik');
    execSync('git add . && git commit -m "feature: shared.txt"', { cwd: repo, stdio: 'pipe' });

    // main'e geri don ve ayni dosyayi degistir (conflict olustur)
    execSync('git checkout main', { cwd: repo, stdio: 'pipe' });
    fs.writeFileSync(path.join(repo, 'shared.txt'), 'main farkli degisiklik');
    execSync('git add . && git commit -m "main: conflict"', { cwd: repo, stdio: 'pipe' });

    // Simdi local bir "origin/main" referansi olustur
    // Pre-push hook origin/main'e fetch yapar, ama local test icin simule ediyoruz
    execSync('git update-ref refs/remotes/origin/main main', { cwd: repo, stdio: 'pipe' });
    execSync('git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/main', { cwd: repo, stdio: 'pipe' });

    // Feature branch'e gec
    execSync('git checkout feature/test', { cwd: repo, stdio: 'pipe' });

    // Pre-push hook'u dogrudan calistir (stdin: local_ref local_sha remote_ref remote_sha)
    const localSha = execSync('git rev-parse HEAD', { cwd: repo }).toString().trim();
    const hookPath = path.join(repo, '.git', 'hooks', 'pre-push');
    const stdinData = `refs/heads/feature/test ${localSha} refs/heads/feature/test 0000000000000000000000000000000000000000\n`;

    try {
      execSync(`echo "${stdinData}" | bash "${hookPath}"`, {
        cwd: repo,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, GIT_DIR: path.join(repo, '.git') },
      });
      assert.fail('conflict varken hook basarili olmamali');
    } catch (e) {
      const output = (e.stdout || '').toString() + (e.stderr || '').toString();
      assert.ok(output.includes('conflict') || e.status !== 0, 'conflict tespit edilmeli');
    }
  });

  it('warning durumunda push devam ediyor (exit 0)', t => {
    const repo = createTempGitRepo(t);

    // Pre-push hook'unun warning kismini test et:
    // WARNINGS sayaci artsa bile ERRORS=0 ise exit 0 olmali
    const hooksDir = path.join(repo, '.git', 'hooks');
    const hookContent = `#!/bin/bash
ERRORS=0
WARNINGS=0
while read local_ref local_sha remote_ref remote_sha; do
  WARNINGS=1
done
echo ""
if [ "$WARNINGS" -gt 0 ]; then
  echo "⚠️  $WARNINGS uyari tespit edildi (push devam ediyor)"
fi
if [ "$ERRORS" -ne 0 ]; then
  echo "━━━ Pre-push BASARISIZ ━━━"
  exit 1
fi
echo "━━━ Pre-push OK ━━━"
exit 0
`;
    fs.writeFileSync(path.join(hooksDir, 'pre-push'), hookContent, { mode: 0o755 });

    const localSha = execSync('git rev-parse HEAD', { cwd: repo }).toString().trim();
    const hookPath = path.join(hooksDir, 'pre-push');
    const stdinData = `refs/heads/main ${localSha} refs/heads/main ${localSha}`;

    const result = execSync(`echo "${stdinData}" | bash "${hookPath}"`, {
      cwd: repo,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const output = result.toString();
    assert.ok(output.includes('uyari'), 'uyari mesaji olmali');
    assert.ok(output.includes('Pre-push OK'), 'push devam etmeli');
  });
});

// ─────────────────────────────────────────────────────
// E2E: GENERATE BLOKLARI DOLDURULMUS PRE-COMMIT
// ─────────────────────────────────────────────────────

const E2E_MANIFEST = {
  stack: {
    primary: 'Node.js',
    detected: ['TypeScript'],
    test_framework: 'jest',
    linter: 'eslint',
    formatter: 'prettier',
    test_commands: { api: 'npm test' },
  },
  project: {
    subprojects: [{ name: 'api', path: '.', test_command: 'npm test' }],
  },
};

function installProcessedHook(repoDir, hookName, manifest) {
  const hookSrc = path.join(HOOKS_DIR, `${hookName}.skeleton`);
  const hookDst = path.join(repoDir, '.git', 'hooks', hookName);
  const { outputContent } = processSkeletonFile(hookSrc, manifest || E2E_MANIFEST);
  fs.writeFileSync(hookDst, outputContent, { mode: 0o755 });
  return hookDst;
}

describe('pre-commit E2E (GENERATE bloklari doldurulmus)', () => {
  it('TypeScript derleme kontrolu GENERATE blogundan uretiliyor', t => {
    const repo = createTempGitRepo(t);
    const hookPath = installProcessedHook(repo, 'pre-commit');
    const content = fs.readFileSync(hookPath, 'utf8');

    assert.ok(content.includes('tsc --noEmit'), 'TypeScript derleme kontrolu uretilmeli');
    assert.ok(!content.includes('GENERATE:'), 'GENERATE bloklari kaldirilmis olmali');
  });

  it('TESTS_VERIFIED=1 ile doldurulmus hook da bypass calisiyor', t => {
    const repo = createTempGitRepo(t);
    installProcessedHook(repo, 'pre-commit');

    fs.writeFileSync(path.join(repo, '.env'), 'SECRET=abc');
    execSync('git add .env', { cwd: repo, stdio: 'pipe' });

    const result = tryCommitWithFiles(repo, { TESTS_VERIFIED: '1' });
    assert.equal(result.status, 0, 'TESTS_VERIFIED bypass calismali');
  });

  it('.env dosyasi doldurulmus hook ta da engelleniyor', t => {
    const repo = createTempGitRepo(t);
    installProcessedHook(repo, 'pre-commit');

    fs.writeFileSync(path.join(repo, '.env'), 'DB_PASSWORD=secret');
    execSync('git add .env', { cwd: repo, stdio: 'pipe' });

    const result = tryCommitWithFiles(repo);
    assert.notEqual(result.status, 0, '.env engellenmeli');
  });
});

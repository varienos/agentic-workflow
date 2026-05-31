'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { describe, it } = require('node:test');
const { SIMPLE_GENERATORS, processSkeletonFile, scanSkeletonFiles, repairRootGitignore } = require('../generate.js');

const ROOT = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function listSkeletonFiles(relativeDir) {
  const absDir = path.join(ROOT, relativeDir);
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const nextRelative = path.posix.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSkeletonFiles(nextRelative));
      continue;
    }
    if (entry.name.includes('.skeleton')) {
      files.push(nextRelative);
    }
  }

  return files.sort();
}

function gitCheckIgnore(repoRoot, relativePath) {
  try {
    execFileSync('git', ['-C', repoRoot, 'check-ignore', '--quiet', relativePath], { stdio: 'ignore' });
    return true;
  } catch (error) {
    if (error.status === 1) return false;
    throw error;
  }
}

function rootGitignoreGatePasses(content) {
  return content.includes('AGENTIC-WORKFLOW-ROOT-GITIGNORE')
    && /^\/Codebase\/?$/m.test(content)
    && /^\/Codebase-wt-\*\/$/m.test(content);
}

const CORE_COMMAND_FILES = listSkeletonFiles('templates/core/commands');
const CORE_AGENT_FILES = listSkeletonFiles('templates/core/agents');
const MODULE_COMMAND_FILES = listSkeletonFiles('templates/modules').filter(relativePath => relativePath.includes('/commands/'));
const MODULE_AGENT_FILES = listSkeletonFiles('templates/modules').filter(relativePath => relativePath.includes('/agents/'));
const COMMAND_FILES = [...CORE_COMMAND_FILES, ...MODULE_COMMAND_FILES];
const AGENT_FILES = [...CORE_AGENT_FILES, ...MODULE_AGENT_FILES];
const CODEBASE_CONTEXT_FILES = listSkeletonFiles('templates').filter(relativePath => read(relativePath).includes('GENERATE: CODEBASE_CONTEXT'));

describe('kutsal kural regressions', () => {
  it('tum core ve modul command skeletonlari config yazma ve git sinirlarini tekrar eder', () => {
    for (const relativePath of COMMAND_FILES) {
      const content = read(relativePath);

      assert.match(content, /Codebase e config YAZMA/);
      assert.match(content, /Git sadece Codebase de/);
      assert.match(content, /Codebase OKUNUR, config YAZILMAZ/);
    }
  });

  it('tum core ve modul agent skeletonlari Calisma Siniri bolumu ile Codebase config yazimini yasaklar', () => {
    for (const relativePath of AGENT_FILES) {
      const content = read(relativePath);

      assert.match(content, /## Calisma Siniri/);
      assert.match(content, /Codebase icinde `\.claude\/` dizini OLUSTURAMAZ/);
      assert.match(content, /`CLAUDE\.md`, `\.mcp\.json`, `\.claude-ignore` YAZAMAZ/);
      assert.match(content, /Tum agent config dosyalari Agentbase\/\.claude\/ altinda yasar/);
    }
  });

  it('tum CODEBASE_CONTEXT blok ornekleri kutsal kural ozetini tasir', () => {
    for (const relativePath of CODEBASE_CONTEXT_FILES) {
      const content = read(relativePath);

      assert.match(content, /Kutsal Kurallar:/);
      assert.match(content, /Config dosyalari SADECE Agentbase icinde yasar/);
      assert.match(content, /Codebase icinde `?\.claude\/`? OLUSTURULMAZ/);
      assert.match(content, /Git sadece Codebase de calisir/);
    }
  });

  it('memorize ve service-documentation Agentbase merkezli yazma kurallarini belirtir', () => {
    const memorize = read('templates/core/commands/memorize.skeleton.md');
    const serviceDocs = read('templates/core/agents/service-documentation.skeleton.md');

    assert.match(memorize, /Agentbase \.claude\/memory\/ dizini icine yaz/);
    assert.match(memorize, /Codebase icine hafiza dosyasi YAZMA/);

    assert.match(serviceDocs, /Agentbase root altindaki dokumanlar/);
    assert.match(serviceDocs, /Codebase icinde yeni dokuman veya config dosyasi YAZMA/);
  });

  it('MEMORY_PATH generatoru Agentbase icindeki hafiza yolunu aciklar ve unsafe override lari reddeder', () => {
    const output = SIMPLE_GENERATORS.MEMORY_PATH({});
    const unsafeOutput = SIMPLE_GENERATORS.MEMORY_PATH({
      paths: { memory: '../Codebase/.claude/memory' },
      project: { memory_path: '../Codebase/.claude/memory' },
    });

    assert.match(output, /Agentbase \.claude\/memory\/ dizini/);
    assert.match(output, /Codebase icine hafiza dosyasi yazilmaz/);
    assert.doesNotMatch(unsafeOutput, /\.\.\/Codebase\/\.claude\/memory/);
    assert.match(unsafeOutput, /`\.claude\/memory`/);
  });

  it('api-smoke markdown skeleton i node smoke test blogunu da doldurur', () => {
    const manifest = {
      environments: [{ name: 'production', url: 'https://api.example.com', health_check: 'https://api.example.com/health' }],
      api_endpoints: [{ method: 'GET', path: '/v1/status', response: 200 }],
      project: { api_prefix: '/v1' },
    };
    const apiSmokePath = path.join(ROOT, 'templates/core/commands/api-smoke.skeleton.md');
    const { outputContent, filled } = processSkeletonFile(apiSmokePath, manifest);

    assert.ok(filled.includes('API_SMOKE_NODE_TESTS'));
    assert.match(outputContent, /describe\('API Smoke Tests'/);
    assert.doesNotMatch(outputContent, /GENERATE: API_SMOKE_NODE_TESTS/);
  });

  it('bootstrap talimatlari CODEBASE_CONTEXT ozetini doldurmayi soyler', () => {
    const bootstrap = read('.claude/commands/bootstrap.md');

    assert.match(bootstrap, /CODEBASE_CONTEXT/);
    assert.match(bootstrap, /Kutsal Kurallar:/);
    assert.match(bootstrap, /Config dosyalari SADECE Agentbase icinde yasar/);
    assert.match(bootstrap, /Codebase icinde \.claude\/ OLUSTURULMAZ/);
    assert.match(bootstrap, /Git sadece Codebase de calisir/);
    assert.match(bootstrap, /\.claude\/commands\/ \(16 core command dosyasi\)/);
    assert.match(bootstrap, /codex-verify\.skeleton\.md/);
    assert.match(bootstrap, /\.claude\/agents\/ \(8 core \+ uzman agent'lar\)/);
    assert.match(bootstrap, /api-smoke\.skeleton\.md/);
    assert.match(bootstrap, /service-documentation\.skeleton\.md/);
    assert.match(bootstrap, /docker-pre-deploy\.skeleton\.md/);
    assert.match(bootstrap, /idor-scan\.skeleton\.md/);
  });
});

describe('iki-repo teslimat modeli (Sik 1 — TASK-237)', () => {
  it('root-gitignore.skeleton sentinel + Codebase + worktree pattern icerir', () => {
    const content = read('templates/core/root-gitignore.skeleton');

    assert.match(content, /AGENTIC-WORKFLOW-ROOT-GITIGNORE/);
    assert.match(content, /^\/Codebase$/m);
    assert.match(content, /^\/Codebase\/$/m);
    assert.match(content, /^\/Codebase-wt-\*\/$/m);
    assert.doesNotMatch(content, /^\*-wt-\*\/$/m);
    // ROOT-ANCHORED kilidi (Finding 2): anchorsuz bare satirlar bulunmamali
    assert.doesNotMatch(content, /^Codebase\/?$/m);
    assert.match(content, /Codebase'i \*\*ayrica\*\* klonlar\/baglar/);
    assert.doesNotMatch(content, /her sey gelir|her şey gelir/);
  });

  it('root-gitignore.skeleton generate.js taramasinin disinda kalir (Bootstrap dogrudan yazar)', () => {
    const skeletonFiles = scanSkeletonFiles({});
    const included = skeletonFiles.some(filePath => filePath.endsWith('root-gitignore.skeleton'));

    assert.equal(included, false, 'root-gitignore.skeleton generate.js tarafindan islenmemeli — Bootstrap proje kokune dogrudan yazar');
  });

  it('template repo Codebase placeholder istisnasini root-gitignore.skeleton dan ayirir', () => {
    const repoGitignore = fs.readFileSync(path.join(ROOT, '..', '.gitignore'), 'utf8');
    const trackedCodebaseFiles = execFileSync('git', ['-C', path.join(ROOT, '..'), 'ls-files', 'Codebase'], {
      encoding: 'utf8',
    }).trim().split('\n').filter(Boolean);

    assert.deepEqual(trackedCodebaseFiles, ['Codebase/.gitkeep']);
    assert.match(repoGitignore, /Template repo placeholder'i/);
    assert.match(repoGitignore, /^Codebase\/\*$/m);
    assert.match(repoGitignore, /^!Codebase\/\.gitkeep$/m);
    assert.match(repoGitignore, /^\/Codebase-wt-\*\/$/m);
    assert.match(read('templates/core/root-gitignore.skeleton'), /^\/Codebase\/$/m);
    assert.equal(gitCheckIgnore(path.join(ROOT, '..'), 'Codebase-wt-feature/file.txt'), true);
    // Root-anchored: repo bakim yuzeyinde de nested worktree yollari ignore EDILMEMELI
    assert.equal(gitCheckIgnore(path.join(ROOT, '..'), 'Agentbase/docs/Codebase-wt-feature/nested.md'), false);
  });

  it('root-gitignore.skeleton gercek git ignore semantigiyle Codebase i disarida tutar', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-root-gitignore-'));
    try {
      fs.writeFileSync(path.join(tempRoot, '.gitignore'), read('templates/core/root-gitignore.skeleton'));
      execFileSync('git', ['-C', tempRoot, 'init', '--quiet']);

      fs.mkdirSync(path.join(tempRoot, 'Agentbase'), { recursive: true });
      fs.mkdirSync(path.join(tempRoot, 'Docbase'), { recursive: true });
      fs.mkdirSync(path.join(tempRoot, 'Codebase'), { recursive: true });
      fs.mkdirSync(path.join(tempRoot, 'Codebase-wt-feature'), { recursive: true });
      execFileSync('git', ['-C', path.join(tempRoot, 'Codebase'), 'init', '--quiet']);
      fs.writeFileSync(path.join(tempRoot, 'Agentbase/bootstrap.md'), '');
      fs.writeFileSync(path.join(tempRoot, 'Docbase/notes.md'), '');
      fs.writeFileSync(path.join(tempRoot, 'Codebase/package.json'), '{}');
      fs.writeFileSync(path.join(tempRoot, 'Codebase-wt-feature/file.txt'), '');

      const codebaseTopLevel = execFileSync('git', ['-C', path.join(tempRoot, 'Codebase'), 'rev-parse', '--show-toplevel'], {
        encoding: 'utf8',
      }).trim();

      assert.equal(fs.realpathSync(codebaseTopLevel), fs.realpathSync(path.join(tempRoot, 'Codebase')));
      assert.equal(gitCheckIgnore(tempRoot, 'Codebase/package.json'), true);
      assert.equal(gitCheckIgnore(tempRoot, 'Codebase/.git/config'), true);
      assert.equal(gitCheckIgnore(tempRoot, 'Codebase-wt-feature/file.txt'), true);
      assert.equal(gitCheckIgnore(tempRoot, 'Agentbase/bootstrap.md'), false);
      assert.equal(gitCheckIgnore(tempRoot, 'Docbase/notes.md'), false);

      // ROOT-ANCHORED kilidi (Finding 2): nested Codebase yollari ignore EDILMEMELI
      fs.mkdirSync(path.join(tempRoot, 'Agentbase/docs/Codebase'), { recursive: true });
      fs.writeFileSync(path.join(tempRoot, 'Agentbase/docs/Codebase/nested.md'), '');
      assert.equal(gitCheckIgnore(tempRoot, 'Agentbase/docs/Codebase/nested.md'), false);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it('bootstrap.md iki-repo teslimat modelini, ADIM 6.6 yi ve ust-kok ajan sinirini icerir', () => {
    const bootstrap = read('.claude/commands/bootstrap.md');

    // KUTSAL KURALLAR madde 1 ek netlestirmesi
    assert.match(bootstrap, /Iki-repo teslimat modeli/);
    assert.match(bootstrap, /ust-kok \(gelistirici\) reposuna ASLA dokunmaz/);
    // ADIM 6.6 + proje-koku .gitignore mekanizmasi
    assert.match(bootstrap, /## ADIM 6\.6/);
    assert.match(bootstrap, /root-gitignore\.skeleton/);
    assert.match(bootstrap, /AGENTIC-WORKFLOW-ROOT-GITIGNORE/);
    // GATE J
    assert.match(bootstrap, /GATE J:/);
    assert.match(bootstrap, /grep -q "AGENTIC-WORKFLOW-ROOT-GITIGNORE" \.\.\/\.gitignore/);
    assert.match(bootstrap, /grep -Eq "\^\/Codebase\/\?\$" \.\.\/\.gitignore/);
    assert.match(bootstrap, /grep -Eq "\^\/Codebase-wt-\\\*\/\$" \.\.\/\.gitignore/);
    // Cekirdek kutsal kural ifadesi korunuyor (regresyon guvencesi)
    assert.match(bootstrap, /Git sadece Codebase de calisir/);
    assert.doesNotMatch(bootstrap, /kloduyla/);
  });

  it('Gate J kosulu sentinel-only veya yorumdaki Codebase ile false-pass vermez', () => {
    const valid = read('templates/core/root-gitignore.skeleton');
    const sentinelOnly = [
      '# AGENTIC-WORKFLOW-ROOT-GITIGNORE',
      '# Codebase yorumda geciyor ama ignore satiri degil',
      'Agentbase/',
    ].join('\n');
    const missingWorktree = [
      '# AGENTIC-WORKFLOW-ROOT-GITIGNORE',
      'Codebase',
      'Codebase/',
    ].join('\n');

    assert.equal(rootGitignoreGatePasses(valid), true);
    assert.equal(rootGitignoreGatePasses(sentinelOnly), false);
    assert.equal(rootGitignoreGatePasses(missingWorktree), false);
  });

  it('repairRootGitignore stale anchorsuz blogu REPLACE eder — repair sonrasi nested paths tracked', () => {
    const skeleton = read('templates/core/root-gitignore.skeleton');
    // Stale upgrade senaryosu: eski format (START sentinel + anchorsuz satirlar, END YOK) + kullanici satiri.
    const staleLegacy = [
      '# AGENTIC-WORKFLOW-ROOT-GITIGNORE (eski blok)',
      'Codebase',
      'Codebase/',
      'Codebase-wt-*/',
      '',
      'node_modules/',
    ].join('\n') + '\n';

    const repaired = repairRootGitignore(staleLegacy, skeleton);

    // Anchorsuz managed satirlar temizlendi, root-anchored blok + kullanici satiri korundu.
    assert.doesNotMatch(repaired, /^Codebase\/?$/m);
    assert.doesNotMatch(repaired, /^Codebase-wt-\*\/$/m);
    assert.match(repaired, /^\/Codebase$/m);
    assert.match(repaired, /^\/Codebase-wt-\*\/$/m);
    assert.match(repaired, /^node_modules\/$/m);
    assert.equal(rootGitignoreGatePasses(repaired), true);

    // Idempotent: tekrar repair tek temiz blok birakir (duplicate blok yok).
    assert.equal(repairRootGitignore(repaired, skeleton), repaired);

    // Gercek git check-ignore: repair sonrasi root ignored, nested TRACKED.
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aw-repair-'));
    try {
      fs.writeFileSync(path.join(tempRoot, '.gitignore'), repaired);
      execFileSync('git', ['-C', tempRoot, 'init', '--quiet']);
      assert.equal(gitCheckIgnore(tempRoot, 'Codebase/x'), true);
      assert.equal(gitCheckIgnore(tempRoot, 'Codebase-wt-x/y'), true);
      assert.equal(gitCheckIgnore(tempRoot, 'Agentbase/docs/Codebase/nested.md'), false);
      assert.equal(gitCheckIgnore(tempRoot, 'Agentbase/docs/Codebase-wt-x/nested.md'), false);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});

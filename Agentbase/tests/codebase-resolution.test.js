'use strict';

/**
 * codebase-resolution.test.js
 *
 * Hedef Codebase / worktree yol cozumlemesinin tek sozlesmesini dogrular:
 *   1. process.env.AGENTIC_CODEBASE_DIR  — runtime override
 *   2. manifest.project.structure        — bootstrap zamani fallback (skeleton'a baked)
 *   3. '../Codebase'                     — son care
 *
 * Bu test:
 *   - shared-hook-utils.resolveCodebaseRoot davranisini izole eder
 *   - generate.js helper'larini (getCodebasePath, getSubprojectPath, normalizeCodebaseRelativePath) sinirlandirir
 *   - processSkeletonFile'in tum hook skeleton'larina manifest path'i basmasini dogrular (env override fallback'ini bozmadan)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const TEMPLATES_DIR = path.resolve(__dirname, '..', 'templates');
const UTILS_PATH = path.join(TEMPLATES_DIR, 'core', 'hooks', 'shared-hook-utils.js');
const {
  getCodebasePath,
  getSubprojectPath,
  normalizeCodebaseRelativePath,
  processSkeletonFile,
} = require('../generate.js');
const { resolveCodebaseRoot } = require(UTILS_PATH);

// ─────────────────────────────────────────────────────
// resolveCodebaseRoot — runtime helper (hook'larin tek dayanagi)
// ─────────────────────────────────────────────────────

describe('resolveCodebaseRoot — runtime helper', () => {
  it('env AGENTIC_CODEBASE_DIR set ise mutlak yolu donduruyor', () => {
    const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'awcb-env-')));
    try {
      process.env.AGENTIC_CODEBASE_DIR = tmp;
      const result = resolveCodebaseRoot('/var/empty/Agentbase/.claude/hooks', '../Codebase');
      assert.equal(result, tmp, 'env override mutlak yolu olduğu gibi cozmeli');
    } finally {
      delete process.env.AGENTIC_CODEBASE_DIR;
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('env relative yol verirse cwd uzerinden mutlak hale getiriliyor', () => {
    const tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'awcb-rel-')));
    try {
      const relative = path.relative(process.cwd(), tmp);
      process.env.AGENTIC_CODEBASE_DIR = relative;
      const result = resolveCodebaseRoot('/var/empty/Agentbase/.claude/hooks', '../Codebase');
      assert.equal(result, tmp, 'env relatif verilse de absolute coz');
    } finally {
      delete process.env.AGENTIC_CODEBASE_DIR;
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('env yoksa fallback hookDir/../../ tabaninda cozulur', () => {
    delete process.env.AGENTIC_CODEBASE_DIR;
    const rootDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'awcb-fb-')));
    const hookDir = path.join(rootDir, 'Agentbase', '.claude', 'hooks');
    const codebaseDir = path.join(rootDir, 'Codebase');
    fs.mkdirSync(hookDir, { recursive: true });
    fs.mkdirSync(codebaseDir, { recursive: true });
    try {
      const result = resolveCodebaseRoot(hookDir, '../Codebase');
      assert.equal(result, codebaseDir);
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('env bos/whitespace ise fallback kullanilir', () => {
    const rootDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'awcb-ws-')));
    const hookDir = path.join(rootDir, 'Agentbase', '.claude', 'hooks');
    fs.mkdirSync(hookDir, { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'Codebase'), { recursive: true });
    try {
      process.env.AGENTIC_CODEBASE_DIR = '   ';
      const result = resolveCodebaseRoot(hookDir, '../Codebase');
      assert.equal(result, path.join(rootDir, 'Codebase'), 'whitespace env fallback tetiklemeli');
    } finally {
      delete process.env.AGENTIC_CODEBASE_DIR;
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });

  it('var olmayan yolda realpathSync hatasinda duz resolve donduruluyor', () => {
    delete process.env.AGENTIC_CODEBASE_DIR;
    const ghost = '/var/empty/this/does/not/exist/Agentbase/.claude/hooks';
    const result = resolveCodebaseRoot(ghost, '../Codebase');
    // hookDir/../.. → /var/empty/this/does/not/exist/Agentbase
    // sonra ../Codebase → /var/empty/this/does/not/exist/Codebase
    assert.ok(path.isAbsolute(result));
    assert.ok(
      result.endsWith(path.join('does', 'not', 'exist', 'Codebase')),
      `beklenen ".../does/not/exist/Codebase", alinan: ${result}`
    );
  });

  it('env oncelikli — fallback varolsa bile env kazanir', () => {
    const rootA = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'awcb-a-')));
    const rootB = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'awcb-b-')));
    const hookDir = path.join(rootA, 'Agentbase', '.claude', 'hooks');
    fs.mkdirSync(hookDir, { recursive: true });
    fs.mkdirSync(path.join(rootA, 'Codebase'), { recursive: true });
    try {
      process.env.AGENTIC_CODEBASE_DIR = rootB;
      const result = resolveCodebaseRoot(hookDir, '../Codebase');
      assert.equal(result, rootB, 'env her zaman fallback\'i ezmeli');
    } finally {
      delete process.env.AGENTIC_CODEBASE_DIR;
      fs.rmSync(rootA, { recursive: true, force: true });
      fs.rmSync(rootB, { recursive: true, force: true });
    }
  });
});

// ─────────────────────────────────────────────────────
// resolveCodebaseRoot — child process izolasyonu (hook gibi davranis)
// ─────────────────────────────────────────────────────

describe('resolveCodebaseRoot — child process (hook davranisi)', () => {
  it('child process env override hook icinde calisiyor', () => {
    const rootDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'awcb-cp-')));
    const altDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'awcb-alt-')));
    const hookDir = path.join(rootDir, 'Agentbase', '.claude', 'hooks');
    fs.mkdirSync(hookDir, { recursive: true });
    fs.mkdirSync(path.join(rootDir, 'Codebase'), { recursive: true });
    fs.copyFileSync(UTILS_PATH, path.join(hookDir, 'shared-hook-utils.js'));

    const scriptPath = path.join(hookDir, 'probe.js');
    fs.writeFileSync(scriptPath, `
      const { resolveCodebaseRoot } = require('./shared-hook-utils.js');
      process.stdout.write(resolveCodebaseRoot(__dirname, '../Codebase'));
    `);

    try {
      const withEnv = spawnSync(process.execPath, [scriptPath], {
        env: { ...process.env, AGENTIC_CODEBASE_DIR: altDir },
        encoding: 'utf8',
      });
      assert.equal(withEnv.stdout, altDir, 'env override child process icinde kazanmali');

      const noEnv = spawnSync(process.execPath, [scriptPath], {
        env: { ...process.env, AGENTIC_CODEBASE_DIR: '' },
        encoding: 'utf8',
      });
      assert.equal(noEnv.stdout, path.join(rootDir, 'Codebase'), 'bos env fallback tetiklemeli');
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
      fs.rmSync(altDir, { recursive: true, force: true });
    }
  });
});

// ─────────────────────────────────────────────────────
// normalizeCodebaseRelativePath — string normalizasyon kontrati
// ─────────────────────────────────────────────────────

describe('normalizeCodebaseRelativePath', () => {
  it('string olmayan girdi null doner', () => {
    assert.equal(normalizeCodebaseRelativePath(null), null);
    assert.equal(normalizeCodebaseRelativePath(undefined), null);
    assert.equal(normalizeCodebaseRelativePath(123), null);
    assert.equal(normalizeCodebaseRelativePath({}), null);
  });

  it('bos veya whitespace string null doner', () => {
    assert.equal(normalizeCodebaseRelativePath(''), null);
    assert.equal(normalizeCodebaseRelativePath('   '), null);
  });

  it('"../Codebase/" prefix\'ini soyuyor', () => {
    assert.equal(normalizeCodebaseRelativePath('../Codebase/apps/api'), 'apps/api');
  });

  it('"Codebase/" prefix\'ini soyuyor', () => {
    assert.equal(normalizeCodebaseRelativePath('Codebase/src'), 'src');
  });

  it('"./" prefix\'ini soyuyor', () => {
    assert.equal(normalizeCodebaseRelativePath('./apps/web'), 'apps/web');
  });

  it('mutlak yol null doner (Codebase-relative degil)', () => {
    assert.equal(normalizeCodebaseRelativePath('/abs/path'), null);
  });

  it('cikis pattern\'i ".." null doner', () => {
    assert.equal(normalizeCodebaseRelativePath('../../etc/passwd'), null);
  });

  it('Windows backslash ileri slash\'a cevriliyor', () => {
    assert.equal(normalizeCodebaseRelativePath('apps\\api'), 'apps/api');
  });

  it('zaten temiz path olduğu gibi geri donuyor', () => {
    assert.equal(normalizeCodebaseRelativePath('apps/api'), 'apps/api');
  });
});

// ─────────────────────────────────────────────────────
// getCodebasePath — manifest sozlesmesi
// ─────────────────────────────────────────────────────

describe('getCodebasePath — manifest fallback', () => {
  it('manifest.project.structure string ise onu kullanir', () => {
    assert.equal(getCodebasePath({ project: { structure: '../MyProject' } }), '../MyProject');
  });

  it('manifest.project.structure yoksa "../Codebase" donuyor', () => {
    assert.equal(getCodebasePath({}), '../Codebase');
    assert.equal(getCodebasePath({ project: {} }), '../Codebase');
    assert.equal(getCodebasePath({ project: { structure: null } }), '../Codebase');
  });

  it('manifest.project.structure obje ise fallback uygulanir (string olmadigi icin)', () => {
    assert.equal(
      getCodebasePath({ project: { structure: { documents: ['README.md'] } } }),
      '../Codebase',
      'string olmayan structure fallback tetiklemeli'
    );
  });
});

// ─────────────────────────────────────────────────────
// getSubprojectPath — manifest.project.structure ile birlesim
// ─────────────────────────────────────────────────────

describe('getSubprojectPath — manifest path birlesimi', () => {
  it('sp.path "../" ile basliyorsa olduğu gibi donuyor', () => {
    assert.equal(getSubprojectPath({}, { path: '../Other/api' }), '../Other/api');
  });

  it('sp.path mutlak ise olduğu gibi donuyor', () => {
    assert.equal(getSubprojectPath({}, { path: '/abs/api' }), '/abs/api');
  });

  it('sp.path relative ise manifest structure ile birlesir', () => {
    const manifest = { project: { structure: '../MyProject' } };
    assert.equal(getSubprojectPath(manifest, { path: 'apps/api' }), '../MyProject/apps/api');
  });

  it('sp.path "./" ile basliyorsa "./" soyuldu sonra birlesir', () => {
    const manifest = { project: { structure: '../MyProject' } };
    assert.equal(getSubprojectPath(manifest, { path: './apps/web' }), '../MyProject/apps/web');
  });

  it('sp.path yoksa structure/sp.name birlesir', () => {
    const manifest = { project: { structure: '../MyProject' } };
    assert.equal(getSubprojectPath(manifest, { name: 'api' }), '../MyProject/api');
  });

  it('structure yoksa "../Codebase" fallback ile birlesir', () => {
    assert.equal(getSubprojectPath({}, { path: 'apps/api' }), '../Codebase/apps/api');
  });
});

// ─────────────────────────────────────────────────────
// processSkeletonFile — manifest path skeleton'a baked
// ─────────────────────────────────────────────────────

describe('processSkeletonFile — manifest path hook skeleton\'una baked', () => {
  it('skeleton CODEBASE_ROOT cozumlemesi manifest.project.structure ile dolduruluyor', () => {
    const skeletonPath = path.join(TEMPLATES_DIR, 'core', 'hooks', 'doc-drift-check.skeleton.js');
    const manifest = { project: { structure: '../MyTarget' } };
    const { outputContent } = processSkeletonFile(skeletonPath, manifest);
    assert.match(
      outputContent,
      /const CODEBASE_ROOT = resolveCodebaseRoot\(__dirname, "\.\.\/MyTarget"\);/,
      'hook skeleton manifest path\'ini helper-call\'a yazmali'
    );
  });

  it('manifest structure yoksa "../Codebase" baked olur', () => {
    const skeletonPath = path.join(TEMPLATES_DIR, 'core', 'hooks', 'doc-drift-check.skeleton.js');
    const { outputContent } = processSkeletonFile(skeletonPath, {});
    assert.match(
      outputContent,
      /const CODEBASE_ROOT = resolveCodebaseRoot\(__dirname, "\.\.\/Codebase"\);/
    );
  });

  it('eski IIFE/simple CODEBASE_ROOT pattern\'leri uretilen ciktida kalmiyor', () => {
    const skeletonPath = path.join(TEMPLATES_DIR, 'core', 'hooks', 'doc-drift-check.skeleton.js');
    const { outputContent } = processSkeletonFile(skeletonPath, { project: { structure: '../X' } });
    assert.doesNotMatch(
      outputContent,
      /const CODEBASE_ROOT = path\.resolve\(__dirname, '\.\.\/\.\.\/\.\.\/Codebase'\);/,
      'eski simple pattern kalmamali'
    );
    assert.doesNotMatch(
      outputContent,
      /const CODEBASE_ROOT = \(\(\) => \{[^}]*'\.\.\/\.\.\/\.\.\/Codebase'/,
      'eski IIFE pattern kalmamali'
    );
  });
});

// ─────────────────────────────────────────────────────
// Hook dosyalari — kaynak kontrol (template'lerde helper-call kullaniliyor)
// ─────────────────────────────────────────────────────

describe('Hook source files — helper-call sozlesmesi', () => {
  const hookFiles = [
    'core/hooks/codebase-guard.js',
    'core/hooks/doc-drift-check.skeleton.js',
    'modules/orm/prisma/hooks/prisma-migration-check.js',
    'modules/orm/prisma/hooks/destructive-migration-check.js',
    'modules/orm/eloquent/hooks/eloquent-migration-check.js',
    'modules/monorepo/hooks/auto-format.skeleton.js',
    'modules/api-docs/openapi/hooks/openapi-sync-check.skeleton.js',
  ];

  for (const rel of hookFiles) {
    it(`${rel} resolveCodebaseRoot helper\'ini cagiriyor`, () => {
      const content = fs.readFileSync(path.join(TEMPLATES_DIR, rel), 'utf8');
      assert.match(
        content,
        /resolveCodebaseRoot\(__dirname,\s*'[^']+'\)/,
        `${rel} helper-call pattern\'ini kullanmali`
      );
      assert.doesNotMatch(
        content,
        /const CODEBASE_ROOT = path\.resolve\(__dirname, '\.\.\/\.\.\/\.\.\/Codebase'\);/,
        `${rel} eski simple pattern kalintisi tasimamali`
      );
    });
  }
});

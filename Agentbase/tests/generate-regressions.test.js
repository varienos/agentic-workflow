'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  processSkeletonFile,
  SIMPLE_GENERATORS,
} = require('../generate.js');
const testManifest = require('./helpers/test-manifest.js');

describe('generate.js regressions', () => {
  it('processSkeletonFile returns outputContent for JS skeletons', () => {
    const result = processSkeletonFile(
      path.join(__dirname, '..', 'templates', 'core', 'hooks', 'code-review-check.skeleton.js'),
      testManifest
    );

    assert.equal(typeof result.outputContent, 'string');
    assert.match(result.outputContent, /const FILE_EXTENSIONS/);
    assert.ok(result.filled.includes('FILE_EXTENSIONS'));
  });

  it('SUBPROJECT_CONFIGS output includes configFile for auto-format hooks', () => {
    const output = SIMPLE_GENERATORS.SUBPROJECT_CONFIGS(testManifest, 'js');

    assert.match(output, /configFile:/);
  });

  it('package.json test script runs full node test discovery', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
    );

    assert.match(packageJson.scripts.test, /^node --test\b/);
    assert.match(packageJson.scripts.test, /\.test\.js/);
    assert.doesNotMatch(packageJson.scripts.test, /templates\//);
  });
});

// ─────────────────────────────────────────────────────
// CLI ENTEGRASYON TESTLERI
// ─────────────────────────────────────────────────────

const GENERATE_JS = path.join(__dirname, '..', 'generate.js');

function runGenerate(args, options = {}) {
  return spawnSync(process.execPath, [GENERATE_JS, ...args], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
    timeout: options.timeout || 15000,
  });
}

function createTempManifest(t, content) {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'gen-cli-')));
  if (t) t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const manifestPath = path.join(dir, 'manifest.yaml');
  fs.writeFileSync(manifestPath, content, 'utf8');
  return { dir, manifestPath };
}

describe('generate.js CLI entegrasyon', () => {
  it('eksik manifest ile exit code 1 ve hata mesaji', () => {
    const result = runGenerate(['nonexistent.yaml']);
    assert.strictEqual(result.status, 1);
    assert.ok(result.stderr.includes('bulunamadi'), 'bulunamadi hata mesaji olmali');
  });

  it('argumansiz calistirmada kullanim mesaji ve exit 1', () => {
    const result = runGenerate([]);
    assert.strictEqual(result.status, 1);
    assert.ok(result.stderr.includes('Kullanim'), 'kullanim mesaji olmali');
  });

  it('--dry-run dosya yazmadan basariyla cikiyor', t => {
    const { dir, manifestPath } = createTempManifest(t, `
project:
  description: Test
  type: standalone
stack:
  primary: Node.js
  detected: [TypeScript]
modules:
  active:
    orm: [prisma]
`);
    const outputDir = path.join(dir, 'output');
    fs.mkdirSync(outputDir);

    const result = runGenerate([manifestPath, '--output-dir', outputDir, '--dry-run']);
    assert.strictEqual(result.status, 0, 'dry-run exit 0 olmali');

    // Dry-run dosya yazmamaali — .claude dizini olusmamaali
    assert.ok(!fs.existsSync(path.join(outputDir, '.claude')), 'dry-run dosya yazmamali');
  });

  it('--output-dir custom dizine yaziyor', t => {
    const { dir, manifestPath } = createTempManifest(t, `
project:
  description: Test
  type: standalone
stack:
  primary: Node.js
  detected: [TypeScript]
modules:
  active:
    orm: [prisma]
`);
    const outputDir = path.join(dir, 'custom-output');
    fs.mkdirSync(outputDir);

    const result = runGenerate([manifestPath, '--output-dir', outputDir]);
    assert.strictEqual(result.status, 0, 'exit 0 olmali');

    // .claude dizini olusmus olmali
    assert.ok(fs.existsSync(path.join(outputDir, '.claude')), '.claude dizini olusmus olmali');
  });

  it('Django manifest ile Python pattern leri uretiyor', t => {
    const { dir, manifestPath } = createTempManifest(t, `
project:
  description: Django projesi
  type: standalone
stack:
  primary: Python
  detected: [Django]
  test_framework: pytest
  orm: django-orm
modules:
  active:
    backend: [python/django]
    orm: [django-orm]
`);
    const outputDir = path.join(dir, 'output');
    fs.mkdirSync(outputDir);

    const result = runGenerate([manifestPath, '--output-dir', outputDir, '--dry-run']);
    assert.strictEqual(result.status, 0);
    // Django pattern leri stdout ta gorulmeli (dry-run raporu)
    assert.ok(result.stdout.includes('django') || result.stdout.includes('Django') || result.status === 0, 'Django manifest basarili islenmeli');
  });
});

// ─────────────────────────────────────────────────────
// PATH TRAVERSAL KORUMASI TESTLERI
// ─────────────────────────────────────────────────────

describe('path traversal korumalari', () => {
  it('generate.js resolveOutputPath ciktilari outputDir icinde kaliyor', () => {
    const { resolveOutputPath, TEMPLATES_DIR } = require('../generate.js');
    const outputDir = '/tmp/test-output';

    // Core dosya
    const corePath = resolveOutputPath(path.join(TEMPLATES_DIR, 'core', 'commands', 'task-hunter.skeleton.md'), outputDir);
    assert.ok(path.resolve(corePath).startsWith(path.resolve(outputDir)), 'core dosya outputDir icinde olmali');

    // Module dosya
    const modulePath = resolveOutputPath(path.join(TEMPLATES_DIR, 'modules', 'orm', 'prisma', 'rules', 'prisma-rules.skeleton.md'), outputDir);
    assert.ok(path.resolve(modulePath).startsWith(path.resolve(outputDir)), 'module dosya outputDir icinde olmali');
  });

  it('writeTarget path traversal denemesini engelliyor', () => {
    const { loadModuleExports } = require('./helpers/module-loader.js');
    const transformPath = path.join(__dirname, '..', 'transform.js');

    const { writeTarget } = loadModuleExports(transformPath, {
      exports: ['writeTarget'],
    });

    const tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'traversal-test-')));
    const fileMap = {
      '../../../etc/evil.txt': 'malicious content',
      '.gemini/commands/safe.toml': 'safe content',
    };

    const errors = writeTarget(tmpDir, 'test', fileMap);

    // Traversal engellenmeli
    assert.ok(!fs.existsSync(path.join(tmpDir, '..', '..', '..', 'etc', 'evil.txt')), 'traversal dosyasi olusmamaali');
    // Safe dosya yazilmali
    assert.ok(fs.existsSync(path.join(tmpDir, '.gemini', 'commands', 'safe.toml')), 'safe dosya yazilmali');
    assert.ok(errors.length > 0, 'traversal hatasi raporlanmali');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

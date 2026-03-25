'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const TRANSFORM_JS = path.resolve(__dirname, '..', 'transform.js');

// Gecici Agentbase dizini olusturur — .claude/ + minimal manifest
function createFixture(t, options = {}) {
  const rootDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'transform-cli-')));
  const claudeDir = path.join(rootDir, '.claude');

  fs.mkdirSync(path.join(claudeDir, 'commands'), { recursive: true });
  fs.mkdirSync(path.join(claudeDir, 'hooks'), { recursive: true });

  // Ornek command dosyasi — transform edilecek kaynak
  fs.writeFileSync(
    path.join(claudeDir, 'commands', 'test-cmd.md'),
    '# Test Command\nBu bir test komutudur.\n',
    'utf8'
  );

  // Ornek settings.json
  fs.writeFileSync(
    path.join(claudeDir, 'settings.json'),
    '{"hooks":{}}',
    'utf8'
  );

  // CLAUDE.md
  fs.writeFileSync(
    path.join(rootDir, 'CLAUDE.md'),
    '# Test Project\nCLAUDE.md icerik\n',
    'utf8'
  );

  // Manifest
  // NOT: targets ust duzey alanda — resolveTargets manifest.targets okuyor
  const manifestContent = options.manifestContent || `
project:
  name: test-project
targets:
  - gemini
`;
  const manifestPath = path.join(rootDir, 'manifest.yaml');
  if (options.manifestContent !== null) {
    fs.writeFileSync(manifestPath, manifestContent, 'utf8');
  }

  if (t && typeof t.after === 'function') {
    t.after(() => fs.rmSync(rootDir, { recursive: true, force: true }));
  }

  return { rootDir, claudeDir, manifestPath };
}

function runTransform(cwd, args) {
  return spawnSync(process.execPath, [TRANSFORM_JS, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 10000,
  });
}

describe('transform.js CLI entegrasyon', () => {
  it('manifest yolu verilmezse exit 1 ve kullanim mesaji', t => {
    const { rootDir } = createFixture(t);
    const result = runTransform(rootDir, []);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Kullanim:/);
  });

  it('manifest dosyasi yoksa exit 1 ve hata mesaji', t => {
    const { rootDir } = createFixture(t);
    const result = runTransform(rootDir, ['olmayan-dosya.yaml']);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /bulunamadi/);
  });

  it('bozuk YAML manifest ile exit 1 ve parse hata mesaji', t => {
    const { rootDir, manifestPath } = createFixture(t);
    fs.writeFileSync(manifestPath, '{{BOZUK: YAML!!!: [', 'utf8');

    const result = runTransform(rootDir, [manifestPath]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /YAML parse hatasi/);
  });

  it('bos manifest (null) ile exit 1', t => {
    const { rootDir, manifestPath } = createFixture(t);
    fs.writeFileSync(manifestPath, '---\n', 'utf8');

    const result = runTransform(rootDir, [manifestPath]);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /bos veya gecersiz/);
  });

  it('gecersiz target ile exit 1 ve hata detayi', t => {
    // Manifest'te targets yok — --targets dogrudan hedef listesi olur
    const { rootDir, manifestPath } = createFixture(t, {
      manifestContent: 'project:\n  name: test\n',
    });
    const result = runTransform(rootDir, [manifestPath, '--targets', 'olmayan_cli']);

    assert.equal(result.status, 1);
    assert.match(result.stderr, /gecersiz transform target/);
    assert.match(result.stderr, /olmayan_cli/);
  });

  it('transform hedefi olmayan manifest ile exit 0 ve bilgi mesaji', t => {
    const { rootDir, manifestPath } = createFixture(t, {
      manifestContent: 'project:\n  name: test\n',
    });

    const result = runTransform(rootDir, [manifestPath]);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Transform hedefi yok/);
  });

  it('basarili dry-run: exit 0, Transform Raporu ve DRY RUN etiketi', t => {
    const { rootDir, manifestPath } = createFixture(t);

    const result = runTransform(rootDir, [manifestPath, '--targets', 'gemini', '--dry-run']);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /Transform Raporu/);
    assert.match(result.stdout, /DRY RUN/);
    assert.match(result.stdout, /gemini/);
  });

  it('basarili transform: rapor dosya sayisini iceriyor', t => {
    const { rootDir, manifestPath } = createFixture(t);

    // NOT: transform.js AGENTBASE_DIR'i kendi __dirname'den turetir,
    // CWD'den degil. Bu nedenle dosya yazma yerine rapor ciktisini dogruluyoruz.
    const result = runTransform(rootDir, [manifestPath, '--targets', 'gemini', '--dry-run']);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /Transform Raporu/);
    assert.match(result.stdout, /gemini/);
    // Dosya sayisi 0'dan buyuk olmali
    assert.match(result.stdout, /Toplam: \d+ dosya/);
    assert.doesNotMatch(result.stdout, /Toplam: 0 dosya/);
  });

  it('verbose modda dosya listesi ciktida gorunur', t => {
    const { rootDir, manifestPath } = createFixture(t);

    const result = runTransform(rootDir, [manifestPath, '--targets', 'gemini', '--dry-run', '--verbose']);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    // Verbose modda dosya yollari listelenir
    assert.match(result.stdout, /gemini/);
  });

  it('cli_config external capabilities yukler', t => {
    const { rootDir, manifestPath } = createFixture(t);

    // External CLI config dosyasi — tum zorunlu alanlari icermeli
    const cliConfigPath = path.join(rootDir, 'cli-config.yaml');
    fs.writeFileSync(cliConfigPath, `
gemini:
  commands:
    dir: '.gemini/custom-commands'
    format: toml
  agents:
    dir: '.gemini/agents'
    format: md
  context:
    file: 'GEMINI.md'
    location: 'root'
  invoke:
    prefix: '!'
    separator: ' '
`, 'utf8');

    // Manifest'e cli_config ekle
    fs.writeFileSync(manifestPath, `
project:
  name: test-project
transform:
  targets:
    - gemini
  cli_config: cli-config.yaml
`, 'utf8');

    const result = runTransform(rootDir, [manifestPath, '--targets', 'gemini', '--dry-run']);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /gemini/);
  });

  it('birden fazla target ayni anda calisir', t => {
    // Manifest'te her iki target tanimli olmali (targets filtre olarak calisir)
    const { rootDir, manifestPath } = createFixture(t, {
      manifestContent: 'project:\n  name: test\ntargets:\n  - gemini\n  - codex\n',
    });

    const result = runTransform(rootDir, [manifestPath, '--targets', 'gemini,codex', '--dry-run']);

    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /gemini/);
    assert.match(result.stdout, /codex/);
  });
});

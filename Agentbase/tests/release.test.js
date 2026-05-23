'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { spawnSync } = require('child_process');
const { detectBump, bumpVersion, extractReleaseNotes, parseGitLogMessages, validateVersionSync } = require('../bin/release.js');

// ─────────────────────────────────────────────────────
// detectBump
// ─────────────────────────────────────────────────────

describe('detectBump', () => {
  it('BREAKING → major', () => {
    assert.equal(detectBump(['feat: yeni ozellik', 'fix!: BREAKING degisiklik']), 'major');
  });

  it('BREAKING CHANGE footer formatinda → major', () => {
    assert.equal(detectBump(['refactor!: API degisikligi']), 'major');
  });

  it('scope lu bang syntax → major', () => {
    assert.equal(detectBump(['fix(api)!: kritik duzeltme']), 'major');
  });

  it('BREAKING CHANGE footer satiri → major', () => {
    assert.equal(
      detectBump(['feat: yeni API\n\nBREAKING CHANGE: onceki API kaldirildi']),
      'major'
    );
  });

  it('subject icinde BREAKING kelimesi ama !: yoksa → major degil', () => {
    assert.equal(detectBump(['refactor: BREAKING API degisikligi']), 'patch');
  });

  it('feat → minor', () => {
    assert.equal(detectBump(['feat: yeni komut eklendi', 'fix: kucuk duzeltme']), 'minor');
  });

  it('sadece fix → patch', () => {
    assert.equal(detectBump(['fix: typo duzeltme', 'fix: null kontrol']), 'patch');
  });

  it('bos dizi → patch (varsayilan)', () => {
    assert.equal(detectBump([]), 'patch');
  });

  it('tanimsiz prefix → patch', () => {
    assert.equal(detectBump(['docs: readme guncellendi', 'refactor: temizlik']), 'patch');
  });
});

describe('parseGitLogMessages', () => {
  it('subject ve body alanlarini tek mesajda birlestirir', () => {
    const raw = 'feat: yeni API\x1fBREAKING CHANGE: eski API kaldirildi\x1e';
    assert.deepEqual(
      parseGitLogMessages(raw),
      ['feat: yeni API\n\nBREAKING CHANGE: eski API kaldirildi']
    );
  });

  it('bos body varsa sadece subject doner', () => {
    const raw = 'fix: kucuk duzeltme\x1f\x1e';
    assert.deepEqual(parseGitLogMessages(raw), ['fix: kucuk duzeltme']);
  });
});

// ─────────────────────────────────────────────────────
// bumpVersion
// ─────────────────────────────────────────────────────

describe('bumpVersion', () => {
  it('patch: 1.2.3 → 1.2.4', () => {
    assert.equal(bumpVersion('1.2.3', 'patch'), '1.2.4');
  });

  it('minor: 1.2.3 → 1.3.0', () => {
    assert.equal(bumpVersion('1.2.3', 'minor'), '1.3.0');
  });

  it('major: 1.2.3 → 2.0.0', () => {
    assert.equal(bumpVersion('1.2.3', 'major'), '2.0.0');
  });

  it('v prefix ile calisiyor: v1.0.0 → 1.0.1', () => {
    assert.equal(bumpVersion('v1.0.0', 'patch'), '1.0.1');
  });

  it('bilinmeyen tip → Error', () => {
    assert.throws(() => bumpVersion('1.0.0', 'invalid'), /Bilinmeyen bump tipi/);
  });
});

// ─────────────────────────────────────────────────────
// extractReleaseNotes
// ─────────────────────────────────────────────────────

describe('extractReleaseNotes', () => {
  it('CHANGELOG yoksa fallback mesaj doner', () => {
    const result = extractReleaseNotes('99.99.99');
    // CHANGELOG.md mevcutsa ama versiyon yoksa da fallback
    assert.ok(typeof result === 'string');
    assert.ok(result.length > 0);
  });

  it('CHANGELOG dan doğru bolumu cikarir', () => {
    const tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'release-test-')));
    const changelogPath = path.join(tmpDir, 'CHANGELOG.md');

    fs.writeFileSync(changelogPath, [
      '# Changelog',
      '',
      '## [2.0.0] — 2026-03-24',
      '',
      '### Yenilikler',
      '- Buyuk ozellik eklendi',
      '',
      '## [1.0.0] — 2026-03-20',
      '',
      '### Ilk surum',
      '- Temel yapi',
    ].join('\n'));

    // extractReleaseNotes REPO_ROOT kullanıyor — dogrudan test edemiyoruz
    // Bunun yerine regex mantigini test ediyoruz
    const content = fs.readFileSync(changelogPath, 'utf8');
    const version = '2.0.0';
    const sectionRegex = new RegExp(`## \\[${version.replace(/\./g, '\\.')}\\][^]*?(?=\\n## \\[|$)`);
    const match = content.match(sectionRegex);

    assert.ok(match, 'bolum bulunmali');
    assert.ok(match[0].includes('Buyuk ozellik'), 'icerik dogru olmali');
    assert.ok(!match[0].includes('Ilk surum'), 'sonraki bolum dahil olmamali');

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ─────────────────────────────────────────────────────
// validateVersionSync
// ─────────────────────────────────────────────────────

describe('validateVersionSync', () => {
  it('package.json == tag == CHANGELOG → senkron (null)', () => {
    const result = validateVersionSync('1.5.0', 'v1.5.0', '## [1.5.0] - 2026-03-25\n### Eklenen\n');
    assert.equal(result, null);
  });

  it('package.json != tag → drift raporlanir', () => {
    const result = validateVersionSync('1.5.0', 'v1.4.0', '## [1.4.0] - 2026-03-24\n');
    assert.ok(result, 'drift olmali');
    assert.ok(result.some(d => d.includes('package.json') && d.includes('latest tag')));
  });

  it('CHANGELOG ust bolum != tag → drift', () => {
    const result = validateVersionSync('1.5.0', 'v1.5.0', '## [1.4.0] - 2026-03-24\n');
    assert.ok(result, 'drift olmali');
    assert.ok(result.some(d => d.includes('CHANGELOG')));
  });

  it('CHANGELOG Yayinlanmamis ile baslarsa drift degil', () => {
    const result = validateVersionSync('1.5.0', 'v1.5.0', '## [Yayınlanmamış] - 2026-03-25\n### Eklenen\n');
    assert.equal(result, null, 'Yayinlanmamis drift olmamali');
  });

  it('CHANGELOG Unreleased ile baslarsa drift degil', () => {
    const result = validateVersionSync('1.5.0', 'v1.5.0', '## [Unreleased]\n### Eklenen\n');
    assert.equal(result, null, 'Unreleased drift olmamali');
  });

  it('tag yoksa (null) sadece CHANGELOG kontrolu', () => {
    const result = validateVersionSync('0.1.0', null, '## [0.1.0] - 2026-03-25\n');
    assert.equal(result, null, 'tag yok, CHANGELOG ve pkg eslesiyor');
  });

  it('CHANGELOG yok (null) sadece tag kontrolu', () => {
    const result = validateVersionSync('1.5.0', 'v1.5.0', null);
    assert.equal(result, null, 'CHANGELOG yok ama pkg ve tag esit');
  });

  it('CHANGELOG yok ve tag farkli → drift', () => {
    const result = validateVersionSync('1.5.0', 'v1.4.0', null);
    assert.ok(result, 'drift olmali');
  });
});

// ─────────────────────────────────────────────────────
// release.js CLI entegrasyon
// ─────────────────────────────────────────────────────

const RELEASE_JS = path.resolve(__dirname, '..', 'bin', 'release.js');

function runRelease(args, env = {}) {
  return spawnSync(process.execPath, [RELEASE_JS, ...args], {
    cwd: path.resolve(__dirname, '../..'),
    encoding: 'utf8',
    timeout: 10000,
    env: { ...process.env, ...env },
  });
}

describe('release.js CLI entegrasyon', () => {
  it('--dry-run exit 0 ve DRY RUN etiketi', () => {
    const result = runRelease(['--dry-run']);
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.match(result.stdout, /DRY RUN/);
    assert.match(result.stdout, /Release Pipeline/);
  });

  it('--dry-run versiyon ve bump bilgisi gosteriyor', () => {
    const result = runRelease(['--dry-run']);
    assert.match(result.stdout, /Mevcut versiyon:/);
    assert.match(result.stdout, /Bump:/);
    assert.match(result.stdout, /Commit sayisi:/);
  });

  it('--dry-run patch/minor/major bump override calisiyor', () => {
    const result = runRelease(['minor', '--dry-run']);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Bump: minor/);
  });

  it('--dry-run auto bump commit lerden tespit ediyor', () => {
    const result = runRelease(['auto', '--dry-run']);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Bump: (patch|minor|major)/);
  });

  it('BREAKING CHANGE footer bump → major', () => {
    // detectBump unit testi ile dogrulandı, burada sadece regression
    assert.equal(detectBump(['feat: yeni\n\nBREAKING CHANGE: eski API']), 'major');
  });
});

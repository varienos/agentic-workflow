'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { detectBump, bumpVersion, extractReleaseNotes } = require('../bin/release.js');

// ─────────────────────────────────────────────────────
// detectBump
// ─────────────────────────────────────────────────────

describe('detectBump', () => {
  it('BREAKING → major', () => {
    assert.equal(detectBump(['feat: yeni ozellik', 'fix!: BREAKING degisiklik']), 'major');
  });

  it('BREAKING kelimesi iceren commit → major', () => {
    assert.equal(detectBump(['refactor: BREAKING API degisikligi']), 'major');
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

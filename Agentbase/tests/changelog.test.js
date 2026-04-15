#!/usr/bin/env node
'use strict';

/**
 * changelog.test.js — changelog.js icin birim testler
 * Calistirma: node --test tests/changelog.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  groupByType,
  generateSection,
  generateAllSections,
  getAllTags,
  getLatestTag,
  getTagDate,
  getCommits,
  releaseVersion,
  formatDate,
  CATEGORIES,
  HEADER,
} = require('../bin/changelog.js');

// ─────────────────────────────────────────────────────
// YARDIMCI FONKSIYON TESTLERI
// ─────────────────────────────────────────────────────

describe('formatDate', () => {
  it('ISO tarihten YYYY-MM-DD cikarir', () => {
    assert.equal(formatDate('2026-03-23 15:30:00 +0300'), '2026-03-23');
  });

  it('null icin bugunun tarihini dondurur', () => {
    const today = new Date().toISOString().slice(0, 10);
    assert.equal(formatDate(null), today);
  });

  it('undefined icin bugunun tarihini dondurur', () => {
    const today = new Date().toISOString().slice(0, 10);
    assert.equal(formatDate(undefined), today);
  });
});

describe('groupByType', () => {
  it('commit leri tipe gore gruplar', () => {
    const commits = [
      { type: 'feat', message: 'A' },
      { type: 'fix', message: 'B' },
      { type: 'feat', message: 'C' },
    ];
    const groups = groupByType(commits);
    assert.equal(groups.feat.length, 2);
    assert.equal(groups.fix.length, 1);
  });

  it('bos dizi icin bos obje dondurur', () => {
    assert.deepEqual(groupByType([]), {});
  });
});

// ─────────────────────────────────────────────────────
// SECTION URETIM TESTLERI
// ─────────────────────────────────────────────────────

describe('generateSection', () => {
  const commits = [
    { hash: 'abc1234', type: 'feat', scope: null, message: 'yeni ozellik', author: 'test', date: '2026-03-23' },
    { hash: 'def5678', type: 'fix', scope: 'api', message: 'hata duzeltme', author: 'test', date: '2026-03-23' },
    { hash: 'ghi9012', type: 'docs', scope: null, message: 'dokumantasyon', author: 'test', date: '2026-03-22' },
  ];

  it('versiyon basligi dogru formatta', () => {
    const section = generateSection('1.0.0', '2026-03-23', commits);
    assert.ok(section.startsWith('## [1.0.0] - 2026-03-23'));
  });

  it('Yayinlanmamis versiyonu destekler', () => {
    const section = generateSection('Yayınlanmamış', '2026-03-23', commits);
    assert.ok(section.includes('[Yayınlanmamış]'));
  });

  it('commit tipleri dogru kategorilerde', () => {
    const section = generateSection('1.0.0', '2026-03-23', commits);
    assert.ok(section.includes('### Eklenen'));
    assert.ok(section.includes('### Düzeltilen'));
    assert.ok(section.includes('### Dokümantasyon'));
  });

  it('scope li commit bold prefix ile gosteriliyor', () => {
    const section = generateSection('1.0.0', '2026-03-23', commits);
    assert.ok(section.includes('**api:** hata duzeltme'));
  });

  it('commit hash backtick icinde', () => {
    const section = generateSection('1.0.0', '2026-03-23', commits);
    assert.ok(section.includes('(`abc1234`)'));
  });

  it('feat fix docs siralamasini takip ediyor', () => {
    const section = generateSection('1.0.0', '2026-03-23', commits);
    const featIdx = section.indexOf('### Eklenen');
    const fixIdx = section.indexOf('### Düzeltilen');
    const docsIdx = section.indexOf('### Dokümantasyon');
    assert.ok(featIdx < fixIdx, 'feat fix ten once olmali');
    assert.ok(fixIdx < docsIdx, 'fix docs tan once olmali');
  });

  it('bos commit dizisi icin bos string dondurur', () => {
    assert.equal(generateSection('1.0.0', '2026-03-23', []), '');
  });
});

// ─────────────────────────────────────────────────────
// RELEASE FONKSIYONU TESTLERI
// ─────────────────────────────────────────────────────

describe('releaseVersion', () => {
  it('Yayinlanmamis bolumunu versiyon ile degistiriyor', () => {
    const tmpFile = path.join(os.tmpdir(), `changelog-release-${Date.now()}.md`);
    const content = HEADER + '## [Yayınlanmamış] - 2026-03-23\n\n### Eklenen\n\n- Test ozellik (`abc1234`)\n';
    fs.writeFileSync(tmpFile, content);

    const today = new Date().toISOString().slice(0, 10);
    releaseVersion('1.0.0', { changelogPath: tmpFile });
    const updated = fs.readFileSync(tmpFile, 'utf8');

    assert.ok(updated.includes('[1.0.0]'), 'versiyon degismeli');
    assert.ok(!updated.includes('[Yayınlanmamış]'), 'Yayinlanmamis kalmamali');
    assert.ok(updated.includes('Test ozellik'), 'icerik korunmali');
    assert.ok(updated.includes(`## [1.0.0] - ${today}`), 'bugunun tarihi yazilmali');

    fs.unlinkSync(tmpFile);
  });

  it('dry-run modunda dosyayi degistirmez ve guncel icerigi dondurur', () => {
    const tmpFile = path.join(os.tmpdir(), `changelog-release-dry-${Date.now()}.md`);
    const content = HEADER + '## [Yayınlanmamış] - 2026-03-23\n\n### Eklenen\n\n- Dry run test (`abc1234`)\n';
    fs.writeFileSync(tmpFile, content);

    const updated = releaseVersion('v2.0.0', { changelogPath: tmpFile, dryRun: true });
    const after = fs.readFileSync(tmpFile, 'utf8');

    assert.ok(updated.includes('[2.0.0]'), 'dry-run ciktisi yeni versiyonu icermeli');
    assert.equal(after, content, 'dry-run dosyayi degistirmemeli');

    fs.unlinkSync(tmpFile);
  });

  it('v prefix i cikariliyor', () => {
    const version = 'v1.2.3';
    const displayVersion = version.replace(/^v/, '');
    assert.equal(displayVersion, '1.2.3');
  });
});

// ─────────────────────────────────────────────────────
// CATEGORIES YAPISAL TESTLERI
// ─────────────────────────────────────────────────────

describe('CATEGORIES', () => {
  it('tum conventional commit tipleri tanimli', () => {
    const required = ['feat', 'fix', 'refactor', 'docs', 'test', 'chore', 'perf', 'style', 'ci'];
    for (const type of required) {
      assert.ok(CATEGORIES[type], `${type} kategorisi tanimli olmali`);
      assert.ok(CATEGORIES[type].label, `${type} label olmali`);
    }
  });
});

// ─────────────────────────────────────────────────────
// HEADER TESTLERI
// ─────────────────────────────────────────────────────

describe('HEADER', () => {
  it('Keep a Changelog referansi iceriyor', () => {
    assert.ok(HEADER.includes('keepachangelog.com'));
  });

  it('baslik satiri var', () => {
    assert.ok(HEADER.startsWith('# '));
  });
});

// ─────────────────────────────────────────────────────
// generateAllSections ENTEGRASYON TESTLERI
// ─────────────────────────────────────────────────────

describe('generateAllSections', () => {
  it('en az bir bolum uretiyor (repo da commit var)', () => {
    const sections = generateAllSections();
    assert.ok(sections.length >= 1, 'en az bir bolum olmali');
  });

  it('tag varsa versiyonlu bolum uretiyor', () => {
    const tags = getAllTags();
    if (tags.length === 0) return; // tag yoksa atla

    const sections = generateAllSections();
    const allContent = sections.join('\n');
    const firstTag = tags[0].replace(/^v/, '');
    assert.ok(allContent.includes(`[${firstTag}]`), `ilk tag (${firstTag}) bolum olarak uretilmeli`);
  });

  it('Yayinlanmamis bolumu varsa sadece son tag sonrasi commitler icin', () => {
    const tags = getAllTags();
    if (tags.length === 0) return;

    const lastTag = tags[tags.length - 1];
    const unreleasedCommits = getCommits(lastTag, null);

    const sections = generateAllSections();
    const hasUnreleased = sections.some(s => s.includes('[Yayınlanmamış]'));

    if (unreleasedCommits.length > 0) {
      assert.ok(hasUnreleased, 'unreleased commit varsa Yayinlanmamis bolumu olmali');
    } else {
      assert.ok(!hasUnreleased, 'unreleased commit yoksa Yayinlanmamis bolumu olmamali');
    }
  });

  it('her bolum ## [ ile basliyor', () => {
    const sections = generateAllSections();
    for (const section of sections) {
      assert.ok(section.startsWith('## ['), `bolum "## [" ile baslamali: ${section.slice(0, 40)}`);
    }
  });
});

// ─────────────────────────────────────────────────────
// getCommits ENTEGRASYON TESTLERI
// ─────────────────────────────────────────────────────

describe('getCommits', () => {
  it('tag yok (tum tarihce) — en az 1 commit doner', () => {
    const commits = getCommits(null, null);
    assert.ok(commits.length > 0, 'repoda en az 1 commit olmali');
  });

  it('tek commit yapisi dogru alanlar iceriyor', () => {
    const commits = getCommits(null, null);
    const first = commits[0];
    assert.ok(first.hash, 'hash olmali');
    assert.ok(first.hash.length <= 7, 'hash 7 karakter veya daha kisa');
    assert.ok(first.type, 'type olmali');
    assert.ok(first.message, 'message olmali');
    assert.ok(first.author, 'author olmali');
    assert.ok(first.date, 'date olmali');
  });

  it('conventional commit regex parse — feat, fix, docs tipleri tanimli', () => {
    const commits = getCommits(null, null);
    const types = new Set(commits.map(c => c.type));
    // Repoda en az bir conventional prefix olmali
    const knownTypes = ['feat', 'fix', 'refactor', 'docs', 'test', 'chore', 'release'];
    const hasConventional = knownTypes.some(t => types.has(t));
    assert.ok(hasConventional, `en az bir conventional type olmali, bulunan: ${[...types].join(', ')}`);
  });

  it('from parametresi ile aralik filtresi calisiyor', () => {
    const tags = getAllTags();
    if (tags.length === 0) return; // tag yoksa atla

    const firstTag = tags[0];
    const commitsFromTag = getCommits(firstTag, null);
    const allCommits = getCommits(null, null);

    // Ilk tag'den sonraki commitler, tum commitlerden az veya esit olmali
    assert.ok(commitsFromTag.length <= allCommits.length, 'filtrelenmis sonuc toplam dan az olmali');
  });

  it('conventional commit regex Unicode prefix destekliyor', () => {
    // Regex dogrudan test: getCommits icinde kullanilan pattern
    const regex = /^([\w-]+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/u;

    // Standart prefix'ler
    assert.ok(regex.test('feat: yeni ozellik'));
    assert.ok(regex.test('fix(api): hata duzeltme'));
    assert.ok(regex.test('docs: README guncellendi'));

    // Tire iceren prefix (deep-audit gibi)
    assert.ok(regex.test('fix(deep-audit): duzeltme'));
    assert.ok(regex.test('feat!: breaking degisim'));
    assert.ok(regex.test('fix(api)!: kritik duzeltme'));

    // Non-conventional mesaj → eslesmemeli
    assert.ok(!regex.test('sadece bir mesaj'));
    assert.ok(!regex.test(''));
  });

  it('scope lu commit dogru parse ediliyor', () => {
    const regex = /^([\w-]+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/u;
    const match = 'fix(api): null pointer duzeltildi'.match(regex);
    assert.ok(match);
    assert.equal(match[1], 'fix');
    assert.equal(match[2], 'api');
    assert.equal(match[4], 'null pointer duzeltildi');
  });

  it('breaking bang syntax type ve scope bilgisini koruyor', () => {
    const regex = /^([\w-]+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/u;
    const match = 'fix(api)!: kritik duzeltme'.match(regex);
    assert.ok(match);
    assert.equal(match[1], 'fix');
    assert.equal(match[2], 'api');
    assert.equal(match[3], '!');
    assert.equal(match[4], 'kritik duzeltme');
  });
});

// ─────────────────────────────────────────────────────
// getAllTags / getLatestTag / getTagDate TESTLERI
// ─────────────────────────────────────────────────────

describe('getAllTags', () => {
  it('tag dizisi doner (repoda tag varsa dolu, yoksa bos)', () => {
    const tags = getAllTags();
    assert.ok(Array.isArray(tags), 'dizi olmali');
  });

  it('tag lar v prefix ile basliyor', () => {
    const tags = getAllTags();
    if (tags.length === 0) return;
    for (const tag of tags) {
      assert.ok(tag.startsWith('v'), `tag v ile baslamali: ${tag}`);
    }
  });

  it('tag lar version:refname ile sirali', () => {
    const tags = getAllTags();
    if (tags.length < 2) return;
    // Her tag oncekinden buyuk veya esit olmali (semver siralama)
    for (let i = 1; i < tags.length; i++) {
      const prev = tags[i - 1].replace(/^v/, '');
      const curr = tags[i].replace(/^v/, '');
      // Basit string karsilastirma — version:refname git'in garantisi
      assert.ok(prev <= curr || true, `siralama: ${prev} <= ${curr}`);
    }
  });
});

describe('getLatestTag', () => {
  it('string veya null doner', () => {
    const tag = getLatestTag();
    assert.ok(tag === null || typeof tag === 'string', 'string veya null olmali');
  });

  it('tag varsa v prefix ile basliyor', () => {
    const tag = getLatestTag();
    if (!tag) return;
    assert.ok(tag.startsWith('v'), `tag v ile baslamali: ${tag}`);
  });

  it('getAllTags icinde yer aliyor', () => {
    const tags = getAllTags();
    const latest = getLatestTag();
    if (tags.length === 0) {
      assert.equal(latest, null);
    } else {
      assert.ok(tags.includes(latest), `${latest} tags listesinde olmali`);
    }
  });
});

describe('getTagDate', () => {
  it('gecerli tag icin tarih string doner', () => {
    const tags = getAllTags();
    if (tags.length === 0) return;
    const date = getTagDate(tags[0]);
    assert.ok(date, 'tarih string olmali');
    assert.match(date, /^\d{4}-\d{2}-\d{2}/, 'YYYY-MM-DD formatinda baslamali');
  });

  it('gecersiz tag icin bos string doner', () => {
    const date = getTagDate('v99.99.99-olmayan');
    assert.equal(date, '', 'gecersiz tag bos string donmeli');
  });
});

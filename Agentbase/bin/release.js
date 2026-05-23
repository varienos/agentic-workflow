#!/usr/bin/env node
'use strict';

/**
 * Release Script — Agentic Workflow
 *
 * Bu repoda push yapmanin TEK yolu. Uncommitted degisiklikleri commitler,
 * version bump yapar, CHANGELOG gunceller, tag atar ve push eder.
 *
 * Kullanim:
 *   node bin/release.js           # auto: commit'lerden tespit (feat→minor, fix→patch)
 *   node bin/release.js patch     # v1.0.0 → v1.0.1
 *   node bin/release.js minor     # v1.0.0 → v1.1.0
 *   node bin/release.js major     # v1.0.0 → v2.0.0
 *   node bin/release.js --dry-run # Degisiklik yapmadan goster
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getLatestTag } = require('./changelog.js');

const REPO_ROOT = path.resolve(__dirname, '../..');
const AGENTBASE_DIR = path.resolve(__dirname, '..');
const PKG_PATH = path.join(AGENTBASE_DIR, 'package.json');

function run(cmd, opts = {}) {
  const result = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', ...opts }).trim();
  return result;
}

function runSafe(cmd) {
  try { return run(cmd); } catch { return ''; }
}

function parseGitLogMessages(raw) {
  return String(raw || '')
    .split('\x1e')
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => {
      const [subject = '', body = ''] = entry.split('\x1f');
      return [subject.trim(), body.trim()].filter(Boolean).join('\n\n');
    });
}

function getCommitMessages(tag) {
  const args = ['log', '--pretty=format:%s%x1f%b%x1e', '--no-merges'];
  if (tag) {
    args.push(`${tag}..HEAD`);
  }

  const result = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });
  if (result.status !== 0) return [];
  return parseGitLogMessages(result.stdout);
}

function detectBump(commits) {
  let hasBreaking = false;
  let hasFeat = false;
  let hasFix = false;

  for (const msg of commits) {
    const message = String(msg || '');
    const subject = message.split('\n')[0];

    if (/^(\w+(\(.*?\))?!:)/.test(subject) || /^BREAKING(?:[ -]CHANGE)?[\s:]/m.test(message)) {
      hasBreaking = true;
    }
    if (/^feat(\(|:)/.test(subject)) hasFeat = true;
    if (/^fix(\(|:)/.test(subject)) hasFix = true;
  }

  if (hasBreaking) return 'major';
  if (hasFeat) return 'minor';
  if (hasFix) return 'patch';
  return 'patch'; // varsayilan
}

function bumpVersion(current, type) {
  const parts = current.replace(/^v/, '').split('.').map(Number);
  switch (type) {
    case 'major': return `${parts[0] + 1}.0.0`;
    case 'minor': return `${parts[0]}.${parts[1] + 1}.0`;
    case 'patch': return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    default: throw new Error(`Bilinmeyen bump tipi: ${type}`);
  }
}

function hasUncommittedChanges() {
  const status = runSafe('git status --porcelain');
  return status.length > 0;
}

function stageAndCommitAll() {
  const status = runSafe('git status --porcelain');
  if (!status) return false;

  // Staged ve unstaged dosyalari topla
  const files = status.split('\n').filter(Boolean).map(line => {
    return line.slice(3).trim().replace(/^"(.*)"$/, '$1');
  });

  if (files.length === 0) return false;

  // Dosyalari stage'le (spawnSync: shell injection koruması)
  for (const file of files) {
    const result = spawnSync('git', ['add', '--', file], { cwd: REPO_ROOT, encoding: 'utf8' });
    if (result.status !== 0) console.warn(`  Atlandı: ${file} (silinmis veya erisilemez)`);
  }

  run('git commit -m "chore: release oncesi bekleyen degisiklikler"');
  console.log(`  Bekleyen degisiklikler commitlendi (${files.length} dosya)`);
  return true;
}

function extractReleaseNotes(version) {
  const changelogPath = path.join(REPO_ROOT, 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) return `v${version} release`;

  const content = fs.readFileSync(changelogPath, 'utf8');
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sectionRegex = new RegExp(`## \\[${escaped}\\][^]*?(?=\\n## \\[|$)`);
  const match = content.match(sectionRegex);
  if (!match) return `v${version} release`;

  // Bölüm başlığını çıkar, sadece içeriği al
  return match[0].replace(/^## \[.*?\].*\n+/, '').trim();
}

/**
 * package.json, latest tag ve CHANGELOG ust bolumu arasindaki senkronizasyonu dogrular.
 * Drift varsa detayli hata mesaji doner, senkronse null doner.
 */
function validateVersionSync(pkgVersion, latestTag, changelogContent) {
  const drifts = [];
  const tagVersion = latestTag ? latestTag.replace(/^v/, '') : null;

  // package.json ve latest tag eslesmeli
  if (tagVersion && tagVersion !== pkgVersion) {
    drifts.push(`package.json (${pkgVersion}) != latest tag (${latestTag})`);
  }

  // CHANGELOG ust released section eslesmeli
  if (changelogContent) {
    const topSection = changelogContent.match(/## \[([^\]]+)\]/);
    if (topSection) {
      const changelogVersion = topSection[1];
      const isUnreleased = changelogVersion === 'Yayınlanmamış' || changelogVersion === 'Unreleased';
      if (!isUnreleased && tagVersion && changelogVersion !== tagVersion) {
        drifts.push(`CHANGELOG ust bolum (${changelogVersion}) != latest tag (${latestTag})`);
      }
      if (!isUnreleased && changelogVersion !== pkgVersion) {
        drifts.push(`CHANGELOG ust bolum (${changelogVersion}) != package.json (${pkgVersion})`);
      }
    }
  }

  return drifts.length > 0 ? drifts : null;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const bumpArg = args.find(a => ['patch', 'minor', 'major', 'auto'].includes(a)) || 'auto';

  console.log('');
  console.log('\u2501'.repeat(55));
  console.log('  Release Pipeline');
  console.log('\u2501'.repeat(55));

  // 1. Mevcut versiyon
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  const currentVersion = pkg.version;
  const latestTag = getLatestTag();
  console.log(`  Mevcut versiyon: ${currentVersion}`);
  console.log(`  Son tag: ${latestTag || 'yok'}`);

  // 1.5. Versiyon senkronizasyon dogrulamasi
  const changelogPath = path.join(REPO_ROOT, 'CHANGELOG.md');
  const changelogContent = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf8') : null;
  const drifts = validateVersionSync(currentVersion, latestTag, changelogContent);
  if (drifts) {
    console.error('');
    console.error('  VERSIYON DRIFT TESPIT EDILDI:');
    for (const d of drifts) console.error(`    ! ${d}`);
    console.error('');
    if (dryRun) {
      console.error('  [DRY RUN] Drift raporlandi, devam ediliyor.');
    } else {
      console.error('  Duzeltme: package.json version, git tag ve CHANGELOG ust bolumunu senkronlayin.');
      process.exit(1);
    }
  }

  // 2. Uncommitted degisiklikler
  if (hasUncommittedChanges()) {
    console.log('  Bekleyen degisiklikler tespit edildi...');
    if (!dryRun) {
      stageAndCommitAll();
    } else {
      console.log('  [DRY RUN] Commitlenecek dosyalar var');
    }
  }

  // 3. Bump tipi tespit
  const commits = getCommitMessages(latestTag);
  const bump = bumpArg === 'auto' ? detectBump(commits) : bumpArg;
  const newVersion = bumpVersion(currentVersion, bump);
  console.log(`  Bump: ${bump} (${currentVersion} → ${newVersion})`);
  console.log(`  Commit sayisi: ${commits.length}`);

  if (dryRun) {
    console.log('');
    console.log('  [DRY RUN] Degisiklik yapilmadi.');
    console.log('\u2501'.repeat(55));
    return;
  }

  // 4. package.json version bump
  pkg.version = newVersion;
  fs.writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  package.json → ${newVersion}`);

  // 5. CHANGELOG uret ve release etiketle
  run('node bin/changelog.js --all', { cwd: AGENTBASE_DIR });
  run(`node bin/changelog.js --release v${newVersion}`, { cwd: AGENTBASE_DIR });
  console.log(`  CHANGELOG.md → [${newVersion}]`);

  // 6. Release commit
  const relPkg = path.relative(REPO_ROOT, PKG_PATH);
  const relChangelog = path.relative(REPO_ROOT, path.join(REPO_ROOT, 'CHANGELOG.md'));
  run(`git add "${relPkg}" "${relChangelog}"`);
  run(`git commit -m "release: v${newVersion}"`);
  console.log(`  Release commit olusturuldu`);

  // 7. Rebase (tag'dan ONCE — rebase hash degistirirse tag dogru commit'e isaret etsin)
  try {
    run('git pull --rebase origin main');
  } catch (err) {
    console.error('  Rebase conflict tespit edildi. Release durduruldu.');
    console.error('  Manuel cozum: git rebase --continue veya git rebase --abort');
    process.exit(1);
  }

  // 8. Annotated tag (rebase sonrasi — dogru commit hash)
  run(`git tag -a v${newVersion} -m "v${newVersion}"`);
  console.log(`  Tag: v${newVersion}`);

  // 9. Push
  run('git push origin main');
  run(`git push origin v${newVersion}`);
  console.log(`  Push basarili: main + v${newVersion}`);

  // 10. GitHub Release olustur (gh CLI varsa)
  // NOT: --notes-file kullanilir — backtick iceren CHANGELOG satirlari
  // --notes ile shell'de komut olarak yorumlanir
  const notesFile = path.join(REPO_ROOT, '.release-notes.tmp');
  try {
    const notes = extractReleaseNotes(newVersion);
    fs.writeFileSync(notesFile, notes, 'utf8');
    run(`gh release create v${newVersion} --title "v${newVersion}" --notes-file "${notesFile}"`);
    console.log(`  GitHub Release: v${newVersion}`);
  } catch {
    console.log('  GitHub Release olusturulamadi (gh CLI yok veya auth gerekli)');
  } finally {
    try { fs.unlinkSync(notesFile); } catch {}
  }

  console.log('');
  console.log('\u2501'.repeat(55));
  console.log(`  v${newVersion} yayinlandi!`);
  console.log('\u2501'.repeat(55));
}

// Test icin export
if (require.main === module) {
  main();
} else {
  module.exports = { detectBump, bumpVersion, extractReleaseNotes, parseGitLogMessages, validateVersionSync };
}

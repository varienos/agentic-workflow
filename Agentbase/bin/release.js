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

function getLatestTag() {
  return runSafe('git describe --tags --abbrev=0 2>/dev/null') || null;
}

function getCommitsSinceTag(tag) {
  const range = tag ? `${tag}..HEAD` : '';
  const raw = runSafe(`git log ${range} --pretty=format:"%s" --no-merges`);
  if (!raw) return [];
  return raw.split('\n').filter(Boolean);
}

function detectBump(commits) {
  let hasBreaking = false;
  let hasFeat = false;
  let hasFix = false;

  for (const msg of commits) {
    if (msg.includes('BREAKING') || msg.includes('!:')) hasBreaking = true;
    if (msg.startsWith('feat')) hasFeat = true;
    if (msg.startsWith('fix')) hasFix = true;
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
  const sectionRegex = new RegExp(`## \\[${version.replace(/\./g, '\\.')}\\][^]*?(?=\\n## \\[|$)`);
  const match = content.match(sectionRegex);
  if (!match) return `v${version} release`;

  // Bölüm başlığını çıkar, sadece içeriği al
  return match[0].replace(/^## \[.*?\].*\n+/, '').trim();
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
  const commits = getCommitsSinceTag(latestTag);
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
  try {
    const notes = extractReleaseNotes(newVersion);
    run(`gh release create v${newVersion} --title "v${newVersion}" --notes ${JSON.stringify(notes)}`);
    console.log(`  GitHub Release: v${newVersion}`);
  } catch {
    console.log('  GitHub Release olusturulamadi (gh CLI yok veya auth gerekli)');
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
  module.exports = { detectBump, bumpVersion, extractReleaseNotes };
}

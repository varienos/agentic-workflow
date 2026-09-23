#!/usr/bin/env node
'use strict';

/**
 * Release Script — Agentic Workflow
 *
 * The only push path in this repo. It commits pending changes,
 * bumps the version, updates CHANGELOG, tags, and pushes.
 *
 * Usage:
 *   node bin/release.js           # auto: infer from commits (feat→minor, fix→patch)
 *   node bin/release.js patch     # v1.0.0 → v1.0.1
 *   node bin/release.js minor     # v1.0.0 → v1.1.0
 *   node bin/release.js major     # v1.0.0 → v2.0.0
 *   node bin/release.js --dry-run # Show the plan without writing
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
  return 'patch'; // default
}

function bumpVersion(current, type) {
  const parts = current.replace(/^v/, '').split('.').map(Number);
  switch (type) {
    case 'major': return `${parts[0] + 1}.0.0`;
    case 'minor': return `${parts[0]}.${parts[1] + 1}.0`;
    case 'patch': return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    default: throw new Error(`Unknown bump type: ${type}`);
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

  // Stage files with spawnSync so the path is not passed through a shell
  for (const file of files) {
    const result = spawnSync('git', ['add', '--', file], { cwd: REPO_ROOT, encoding: 'utf8' });
    if (result.status !== 0) console.warn(`  Skipped: ${file} (missing or unreadable)`);
  }

  run('git commit -m "chore: commit pending changes before release"');
  console.log(`  Pending changes committed (${files.length} files)`);
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

  // Drop the section heading and keep the body
  return match[0].replace(/^## \[.*?\].*\n+/, '').trim();
}

/**
 * Checks that package.json, the latest tag, and the top CHANGELOG section agree.
 * Returns a detailed drift message, or null when the versions match.
 */
function validateVersionSync(pkgVersion, latestTag, changelogContent) {
  const drifts = [];
  const tagVersion = latestTag ? latestTag.replace(/^v/, '') : null;

  // package.json and the latest tag must match
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

  // 1. Current version
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  const currentVersion = pkg.version;
  const latestTag = getLatestTag();
  console.log(`  Current version: ${currentVersion}`);
  console.log(`  Latest tag: ${latestTag || 'none'}`);

  // 1.5. Version sync check
  const changelogPath = path.join(REPO_ROOT, 'CHANGELOG.md');
  const changelogContent = fs.existsSync(changelogPath) ? fs.readFileSync(changelogPath, 'utf8') : null;
  const drifts = validateVersionSync(currentVersion, latestTag, changelogContent);
  if (drifts) {
    console.error('');
    console.error('  VERSION DRIFT DETECTED:');
    for (const d of drifts) console.error(`    ! ${d}`);
    console.error('');
    if (dryRun) {
      console.error('  [DRY RUN] Drift reported. Continuing.');
    } else {
      console.error('  Fix: sync package.json version, the git tag, and the top CHANGELOG section.');
      process.exit(1);
    }
  }

  // 2. Uncommitted changes
  if (hasUncommittedChanges()) {
    console.log('  Pending changes detected...');
    if (!dryRun) {
      stageAndCommitAll();
    } else {
      console.log('  [DRY RUN] Files would be committed');
    }
  }

  // 3. Detect the bump type
  const commits = getCommitMessages(latestTag);
  const bump = bumpArg === 'auto' ? detectBump(commits) : bumpArg;
  const newVersion = bumpVersion(currentVersion, bump);
  console.log(`  Bump: ${bump} (${currentVersion} → ${newVersion})`);
  console.log(`  Commits: ${commits.length}`);

  if (dryRun) {
    console.log('');
    console.log('  [DRY RUN] Nothing was changed.');
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
  console.log(`  Release commit created`);

  // 7. Rebase (tag'dan ONCE — rebase hash degistirirse tag dogru commit'e isaret etsin)
  try {
    run('git pull --rebase origin main');
  } catch (err) {
    console.error('  Rebase conflict detected. Release stopped.');
    console.error('  Resolve it with git rebase --continue or git rebase --abort');
    process.exit(1);
  }

  // 8. Annotated tag (after rebase — the correct commit hash)
  run(`git tag -a v${newVersion} -m "v${newVersion}"`);
  console.log(`  Tag: v${newVersion}`);

  // 9. Push
  run('git push origin main');
  run(`git push origin v${newVersion}`);
  console.log(`  Push succeeded: main + v${newVersion}`);

  // 10. Create a GitHub Release when the gh CLI is available
  // Use --notes-file. CHANGELOG lines that contain backticks
  // would be executed by the shell if passed through --notes.
  const notesFile = path.join(REPO_ROOT, '.release-notes.tmp');
  try {
    const notes = extractReleaseNotes(newVersion);
    fs.writeFileSync(notesFile, notes, 'utf8');
    run(`gh release create v${newVersion} --title "v${newVersion}" --notes-file "${notesFile}"`);
    console.log(`  GitHub Release: v${newVersion}`);
  } catch {
    console.log('  GitHub Release was not created (gh CLI missing or auth required)');
  } finally {
    try { fs.unlinkSync(notesFile); } catch {}
  }

  console.log('');
  console.log('\u2501'.repeat(55));
  console.log(`  v${newVersion} yayinlandi!`);
  console.log('\u2501'.repeat(55));
}

// Exports for tests
if (require.main === module) {
  main();
} else {
  module.exports = { detectBump, bumpVersion, extractReleaseNotes, parseGitLogMessages, validateVersionSync };
}

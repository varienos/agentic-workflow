#!/usr/bin/env node
'use strict';

/**
 * Changelog Generator — Agentic Workflow
 *
 * Builds CHANGELOG.md from git history.
 * Parses Conventional Commits.
 * Tag-aware: each git tag becomes its own section.
 *
 * Usage:
 *   node bin/changelog.js                    # Since the latest tag
 *   node bin/changelog.js --all              # Full history (one section per tag)
 *   node bin/changelog.js --from v0.1.0      # Since a specific tag
 *   node bin/changelog.js --release v1.0.0   # Label the open section as v1.0.0
 *   node bin/changelog.js --dry-run          # Print without writing
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../..');
const CHANGELOG_PATH = path.join(REPO_ROOT, 'CHANGELOG.md');

const CATEGORIES = {
  feat: { label: 'Added' },
  fix: { label: 'Fixed' },
  refactor: { label: 'Changed' },
  docs: { label: 'Documentation' },
  test: { label: 'Tests' },
  chore: { label: 'Maintenance' },
  perf: { label: 'Performance' },
  style: { label: 'Style' },
  ci: { label: 'CI/CD' },
  release: { label: 'Release' },
};

const HEADER = '# Changelog\n\nNotable changes are documented in this file.\nThe format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).\n\n';

function gitSpawn(...args) {
  const result = spawnSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8' });
  return (result.stdout || '').trim();
}

function getLatestTag() {
  return gitSpawn('describe', '--tags', '--abbrev=0') || null;
}

function getAllTags() {
  const raw = gitSpawn('tag', '--sort=version:refname', '-l', 'v*');
  if (!raw) return [];
  return raw.split('\n').filter(Boolean);
}

function getTagDate(tag) {
  return gitSpawn('log', '-1', '--format=%ai', tag);
}

function getCommits(from, to) {
  const args = ['log', '--pretty=format:%H%x00%s%x00%an%x00%ai', '--no-merges'];
  if (from && to) {
    args.push(`${from}..${to}`);
  } else if (from) {
    args.push(`${from}..HEAD`);
  } else if (to) {
    args.push(to);
  }
  const raw = gitSpawn(...args);
  if (!raw) return [];

  return raw.split('\n').filter(Boolean).map(line => {
    const [hash, subject, author, date] = line.split('\0');
    const match = subject.match(/^([\w-]+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/u);
    if (!match) return { hash: hash.slice(0, 7), type: 'other', scope: null, message: subject, author, date };
    return {
      hash: hash.slice(0, 7),
      type: match[1],
      scope: match[2] || null,
      message: match[4].trim(),
      author,
      date,
    };
  });
}

function groupByType(commits) {
  const groups = {};
  for (const commit of commits) {
    const type = commit.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(commit);
  }
  return groups;
}

function formatDate(isoDate) {
  if (!isoDate) return new Date().toISOString().slice(0, 10);
  return isoDate.slice(0, 10);
}

function generateSection(version, date, commits) {
  if (commits.length === 0) return '';

  const groups = groupByType(commits);
  const lines = [];

  lines.push(`## [${version}] - ${date}`);
  lines.push('');

  const typeOrder = ['feat', 'fix', 'refactor', 'perf', 'docs', 'test', 'chore', 'style', 'ci', 'release', 'other'];

  for (const type of typeOrder) {
    const group = groups[type];
    if (!group || group.length === 0) continue;

    const cat = CATEGORIES[type] || { label: 'Other' };
    lines.push(`### ${cat.label}`);
    lines.push('');

    for (const commit of group) {
      const scope = commit.scope ? `**${commit.scope}:** ` : '';
      lines.push(`- ${scope}${commit.message} (\`${commit.hash}\`)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function generateAllSections() {
  const tags = getAllTags();
  const sections = [];

  // Son tag → HEAD arası (Yayınlanmamış)
  if (tags.length > 0) {
    const lastTag = tags[tags.length - 1];
    const unreleased = getCommits(lastTag, null);
    if (unreleased.length > 0) {
      sections.push(generateSection('Unreleased', formatDate(unreleased[0]?.date), unreleased));
    }
  }

  // Tag aralıkları (yeniden eskiye)
  for (let i = tags.length - 1; i >= 0; i--) {
    const tag = tags[i];
    const from = i > 0 ? tags[i - 1] : null;
    const commits = getCommits(from, tag);
    const version = tag.replace(/^v/, '');
    const date = formatDate(getTagDate(tag));
    if (commits.length > 0) {
      sections.push(generateSection(version, date, commits));
    }
  }

  // Hiç tag yoksa tüm tarihçe Yayınlanmamış
  if (tags.length === 0) {
    const all = getCommits(null, null);
    if (all.length > 0) {
      sections.push(generateSection('Unreleased', formatDate(all[0]?.date), all));
    }
  }

  return sections;
}

function releaseVersion(version, options = {}) {
  const { changelogPath = CHANGELOG_PATH, dryRun = false } = options;

  if (!fs.existsSync(changelogPath)) {
    console.error('Error: CHANGELOG.md was not found.');
    process.exit(1);
  }

  const content = fs.readFileSync(changelogPath, 'utf8');
  const displayVersion = version.replace(/^v/, '');
  const today = new Date().toISOString().slice(0, 10);

  // Historical changelogs may use [Yayınlanmamış] or [Unreleased].
  // Replace that heading with a fresh open section plus the released version.
  // Keep a Changelog requires the open section to stay. The marker language of
  // the existing file is preserved so old Turkish headings are not rewritten.
  const noteLine = '> Dependency note: `basic-memory` MCP stays the required shared agent memory layer (vault: `Docbase/memory/`).';
  const updated = content.replace(
    /## \[(Yayınlanmamış|Unreleased)\](?:\s*-\s*\d{4}-\d{2}-\d{2})?/,
    (match, marker) => `## [${marker}]\n\n${noteLine}\n\n## [${displayVersion}] - ${today}`
  );

  if (updated === content) {
    console.error('Error: no [Unreleased] or [Yayınlanmamış] section was found.');
    process.exit(1);
  }

  if (dryRun) {
    console.log(updated);
    return updated;
  }

  fs.writeFileSync(changelogPath, updated);
  console.log(`CHANGELOG.md updated: open section → [${displayVersion}] (${today})`);
  return updated;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const all = args.includes('--all');
  const fromIdx = args.indexOf('--from');
  const fromTag = fromIdx !== -1 ? args[fromIdx + 1] : null;
  const releaseIdx = args.indexOf('--release');
  const releaseTag = releaseIdx !== -1 ? args[releaseIdx + 1] : null;

  // --release modu: mevcut CHANGELOG'daki Yayınlanmamış → versiyon
  if (releaseTag) {
    releaseVersion(releaseTag, { dryRun });
    return;
  }

  if (all) {
    // Tag-aware tam tarihçe üretimi
    const sections = generateAllSections();

    if (sections.length === 0) {
      console.log('No commits found.');
      return;
    }

    const content = HEADER + sections.join('\n');
    const totalCommits = sections.reduce((acc, s) => acc + (s.match(/^- /gm) || []).length, 0);

    if (dryRun) {
      console.log(content);
      console.log(`\n--- ${totalCommits} lines processed ---`);
      return;
    }

    fs.writeFileSync(CHANGELOG_PATH, content);
    console.log(`CHANGELOG.md updated — ${sections.length} sections, tag-aware.`);
    return;
  }

  // Incremental mod: son tag'den bu yana
  const latestTag = fromTag || getLatestTag();
  const commits = getCommits(latestTag, null);

  if (commits.length === 0) {
    console.log('No new commits found.');
    return;
  }

  const version = 'Unreleased';
  const date = formatDate(commits[0]?.date);
  const section = generateSection(version, date, commits);

  if (dryRun) {
    console.log(section);
    console.log(`\n--- ${commits.length} commits processed ---`);
    return;
  }

  let existing = '';
  if (fs.existsSync(CHANGELOG_PATH)) {
    existing = fs.readFileSync(CHANGELOG_PATH, 'utf8');
    // Keep versioned sections. The open section is replaced by the new one.
    const versionedStart = existing.search(/\n## \[\d/);
    if (versionedStart !== -1) {
      existing = existing.slice(versionedStart);
    } else {
      existing = '';
    }
  }

  const content = HEADER + section + '\n' + existing;
  fs.writeFileSync(CHANGELOG_PATH, content);
  console.log(`CHANGELOG.md updated — ${commits.length} commits processed.`);
}

if (require.main === module) {
  main();
}

module.exports = {
  getCommits,
  getAllTags,
  getTagDate,
  getLatestTag,
  groupByType,
  generateSection,
  generateAllSections,
  releaseVersion,
  formatDate,
  CATEGORIES,
  HEADER,
  CHANGELOG_PATH,
  REPO_ROOT,
};

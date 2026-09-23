'use strict';

/**
 * manifest-meta.js — Manifest meta alan yonetimi
 *
 * Codebase hash hesaplama, meta bolum uretimi ve guncelleme gecmisi.
 * workflow-update mekanizmasinin altyapisi.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONFIG_FILES = [
  'package.json', 'package-lock.json',
  'composer.json', 'composer.lock',
  'pyproject.toml', 'requirements.txt', 'Pipfile',
  'Gemfile', 'Gemfile.lock',
  'go.mod', 'go.sum',
  'Cargo.toml', 'Cargo.lock',
  'tsconfig.json', 'tsconfig.base.json',
  'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
  '.env.example',
];

/**
 * Combined SHA256 hash of root config files.
 * A missing file is skipped; returns null when no file exists.
 */
function computeCodebaseHash(codebasePath) {
  if (!codebasePath || !fs.existsSync(codebasePath)) return null;

  const hashes = [];
  for (const file of CONFIG_FILES) {
    const filePath = path.join(codebasePath, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      hashes.push(`${file}:${hash}`);
    } catch {
      // File missing — skip
    }
  }

  if (hashes.length === 0) return null;

  // Combined hash: SHA256 of every file hash
  return crypto.createHash('sha256').update(hashes.join('\n')).digest('hex').slice(0, 12);
}

/**
 * Builds the meta section for a new manifest.
 */
function generateMeta(codebasePath, bootstrapVersion) {
  const now = new Date().toISOString();
  return {
    version: 2,
    created_at: now,
    last_analyzed: now,
    codebase_hash: computeCodebaseHash(codebasePath) || 'unknown',
    bootstrap_version: bootstrapVersion || 'unknown',
    update_history: [
      { date: now.slice(0, 10), action: 'initial', changes: [] },
    ],
  };
}

/**
 * Mevcut manifest meta sini gunceller.
 * Yeni analiz tarihi, hash ve gecmis girdisi ekler.
 */
function updateMeta(existingMeta, codebasePath, changes) {
  const now = new Date().toISOString();
  const meta = { ...existingMeta };
  meta.last_analyzed = now;
  meta.codebase_hash = computeCodebaseHash(codebasePath) || meta.codebase_hash;

  if (!Array.isArray(meta.update_history)) meta.update_history = [];
  meta.update_history.push({
    date: now.slice(0, 10),
    action: 'update',
    changes: changes || [],
  });

  return meta;
}

/**
 * Manifest YAML icinden meta bolumunu parse eder.
 * js-yaml ile parse edilmis objeden meta yi cikarir.
 */
function extractMeta(manifest) {
  return manifest?.meta || null;
}

module.exports = {
  computeCodebaseHash,
  generateMeta,
  updateMeta,
  extractMeta,
  CONFIG_FILES,
};

#!/usr/bin/env node
'use strict';

/**
 * git-checkpoint.js
 * PreToolUse (Bash) hook
 *
 * Shadow Git Checkpointing — `git commit` komutu calismadan once mevcut HEAD'i
 * gizli bir ref olarak kaydeder: refs/checkpoints/agent/<id>-<ts>
 *
 * Refs yaklasimi tercih edildi cunku:
 *  - `git branch` / `git tag` listesinde gorunmez (shadow ozellik)
 *  - Hafif: sadece tek SHA pointer
 *  - `git gc` temizleyebilir (yapilandirilabilir)
 *  - `/rollback` komutu `git for-each-ref refs/checkpoints/agent/` ile listeler
 *
 * Hook ASLA bloklamaz — `decision` dondurmez. `git commit` her durumda calisir.
 * Hata durumunda sessizce yutulur — hook protokolu geregi.
 *
 * Guvenlik: Tum git cagrilari `execFileSync('git', [...])` ile yapilir;
 * shell expansion DEVRE DISI, komut injection riski yoktur.
 */

const path = require('path');
const { execFileSync } = require('child_process');
const { readStdin } = require(path.join(__dirname, 'shared-hook-utils.js'));

function isCommitCommand(command) {
  if (!command || typeof command !== 'string') return false;
  return /\bgit\s+commit\b/.test(command);
}

function buildCheckpointRef(taskId, now = new Date()) {
  const ts = now.toISOString().replace(/[:.]/g, '-');
  const safe = String(taskId || 'manual').replace(/[^a-zA-Z0-9_-]/g, '') || 'manual';
  return `refs/checkpoints/agent/${safe}-${ts}`;
}

function extractCdPath(command) {
  const match = command.match(/(?:^|;|&&|\|\|)\s*cd\s+(?:["']?)([^"'\s;&|]+)/);
  return match ? match[1] : null;
}

function findGitCwd(command) {
  const candidates = [];
  const cdPath = extractCdPath(command);
  if (cdPath) candidates.push(path.resolve(cdPath));
  candidates.push(process.cwd());
  candidates.push(path.resolve(__dirname, '../../../..', 'Codebase'));

  for (const candidate of candidates) {
    try {
      execFileSync('git', ['rev-parse', '--git-dir'], { cwd: candidate, stdio: 'ignore' });
      return candidate;
    } catch { /* sonraki adayi dene */ }
  }
  return null;
}

function detectTaskId() {
  return process.env.BACKLOG_ACTIVE_TASK || 'manual';
}

function createCheckpoint(cwd, ref) {
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  if (!sha) return null;
  execFileSync('git', ['update-ref', ref, sha], { cwd, stdio: 'ignore' });
  return sha;
}

async function main() {
  try {
    const input = await readStdin();
    const parsed = JSON.parse(input);
    const command = parsed?.tool_input?.command || '';

    if (!isCommitCommand(command)) return;

    const cwd = findGitCwd(command);
    if (!cwd) return;

    const ref = buildCheckpointRef(detectTaskId());
    createCheckpoint(cwd, ref);
  } catch { /* Hook hatalari sessizce yutulur — commit ASLA bloklanmaz */ }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isCommitCommand,
    buildCheckpointRef,
    extractCdPath,
    findGitCwd,
    detectTaskId,
    createCheckpoint,
  };
}

if (require.main === module) main();

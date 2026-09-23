#!/usr/bin/env node
'use strict';

/**
 * git-checkpoint.js
 * PreToolUse (Bash) hook
 *
 * Shadow Git Checkpointing — before a `git commit` command runs, records current HEAD
 * as a hidden ref: refs/checkpoints/agent/<id>-<ts>
 *
 * Refs are used because:
 *  - they do not appear in `git branch` / `git tag` (shadow behavior)
 *  - light: a single SHA pointer
 *  - `git gc` can prune them (configurable)
 *  - `/rollback` lists via `git for-each-ref refs/checkpoints/agent/`
 *
 * Hook NEVER blocks — does not return `decision`. `git commit` always runs.
 * Errors are swallowed silently — per hook protocol.
 *
 * Safety: every git call uses `execFileSync('git', [...])`;
 * shell expansion is DISABLED; no command-injection risk.
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

function logSilently(message) {
  try { process.stderr.write(`[git-checkpoint] ${message}\n`); } catch { /* stderr fail bile yutulur */ }
}

async function main() {
  let parsed;
  try {
    const input = await readStdin();
    parsed = JSON.parse(input);
  } catch {
    return;
  }

  const command = parsed?.tool_input?.command || '';
  if (!isCommitCommand(command)) return;

  const cwd = findGitCwd(command);
  if (!cwd) {
    logSilently('git repo was not detected; checkpoint skipped');
    return;
  }

  try {
    const ref = buildCheckpointRef(detectTaskId());
    createCheckpoint(cwd, ref);
  } catch (err) {
    logSilently(`checkpoint could not be created: ${err && err.message ? err.message : err}`);
  }
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

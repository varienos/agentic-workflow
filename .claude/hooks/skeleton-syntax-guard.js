#!/usr/bin/env node
/**
 * Skeleton syntax guard — local development
 *
 * PostToolUse(Edit|Write) — for Agentbase template skeletons:
 *  .skeleton.json → try JSON.parse
 *  .skeleton.js   → check syntax with a node --check child process
 *  .skeleton.md   → skip (markdown has no syntax rule here)
 *
 * A broken skeleton breaks the whole bootstrap output — this is the first check.
 * Does not block — warns with systemMessage.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function validateJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    JSON.parse(content);
    return null;
  } catch (err) {
    return err.message;
  }
}

function validateJs(filePath) {
  const result = spawnSync('node', ['--check', filePath], {
    encoding: 'utf8',
    timeout: 5000,
  });
  if (result.status === 0) return null;
  return (result.stderr || result.stdout || 'unknown error').trim();
}

function main() {
  let inputData = '';
  process.stdin.on('data', chunk => (inputData += chunk));
  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(inputData);
      const filePath = input.tool_input?.file_path || '';

      if (!filePath) return process.exit(0);
      if (!fs.existsSync(filePath)) return process.exit(0);

      const base = path.basename(filePath);
      let error = null;
      let kind = null;

      if (base.endsWith('.skeleton.json') || base === 'settings.skeleton.json') {
        kind = 'JSON';
        error = validateJson(filePath);
      } else if (base.endsWith('.skeleton.js')) {
        kind = 'JS';
        error = validateJs(filePath);
      } else {
        return process.exit(0);
      }

      if (!error) return process.exit(0);

      const relPath = path.relative(process.cwd(), filePath);
      const message =
        `SKELETON ${kind} ERROR — ${relPath}\n\n` +
        `${error}\n\n` +
        `This skeleton is invalid — Agentbase bootstrap cannot process this file.\n` +
        `Fix it and wait for the hook to pass cleanly.`;

      const output = {
        ...input,
        systemMessage: message,
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: message,
        },
      };

      process.stdout.write(JSON.stringify(output));
      process.exit(0);
    } catch (err) {
      process.stderr.write(`[skeleton-syntax-guard] Error: ${err.message}\n`);
      process.exit(0);
    }
  });
}

main();

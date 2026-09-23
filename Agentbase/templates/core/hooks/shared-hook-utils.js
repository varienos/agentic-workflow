'use strict';

/**
 * shared-hook-utils.js — Shared helper functions for hooks
 * All hooks use the same readStdin/createGuardHook pattern.
 */

const path = require('path');
const fs = require('fs');

/**
 * Resolves the target Codebase root.
 *
 * Resolution order (single contract):
 *   1. process.env.AGENTIC_CODEBASE_DIR  — runtime override (absolute path expected)
 *   2. fallbackRelative                  — baked from manifest.project.structure at bootstrap time
 *
 * @param {string} hookDir       Calling hook's __dirname value
 * @param {string} fallbackRel   Relative path to Codebase from hookDir/../.. base
 *                               Typical: '../Codebase' (manifest.project.structure default)
 * @returns {string}             Absolute path from realpathSync; plain resolve result if resolution fails
 */
function resolveCodebaseRoot(hookDir, fallbackRel) {
  const envPath = process.env.AGENTIC_CODEBASE_DIR;
  const target = envPath && envPath.trim()
    ? path.resolve(envPath.trim())
    : path.resolve(hookDir, '..', '..', fallbackRel);
  try {
    return fs.realpathSync(target);
  } catch {
    return target;
  }
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

function createGuardHook(rules, options = {}) {
  const { field = 'command', preCheck } = options;
  return async function guardHook() {
    try {
      const input = await readStdin();
      const parsed = JSON.parse(input);
      let target;
      if (field === 'command') {
        target = parsed?.tool_input?.command || '';
      } else {
        target = parsed?.tool_input?.file_path || parsed?.tool_input?.path || '';
      }
      if (preCheck && !preCheck(target, parsed)) return;
      for (const rule of rules) {
        const match = typeof rule.match === 'function' ? rule.match(target, parsed) : rule.pattern.test(target);
        if (match) {
          if (rule.decision === 'block') {
            process.stdout.write(JSON.stringify({ decision: 'block', reason: rule.reason }));
          } else {
            const prefix = rule.decision === 'warn' ? '\u26a0\ufe0f WARNING' : '\u2139\ufe0f INFO';
            process.stdout.write(JSON.stringify({ systemMessage: prefix + ': ' + rule.reason }));
          }
          return;
        }
      }
    } catch (e) { /* Hook errors are swallowed silently */ }
  };
}

function runGuard(rules, options) {
  return createGuardHook(rules, options)();
}

module.exports = { readStdin, createGuardHook, runGuard, resolveCodebaseRoot };

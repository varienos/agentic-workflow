'use strict';

/**
 * shared-hook-utils.js — Hook ortak yardimci fonksiyonlari
 * Tum hook'lar ayni readStdin/createGuardHook pattern'ini kullanir.
 */

const path = require('path');
const fs = require('fs');

/**
 * Hedef Codebase kokunu cozumler.
 *
 * Cozumleme sirasi (tek sozlesme):
 *   1. process.env.AGENTIC_CODEBASE_DIR  — runtime override (mutlak yol beklenir)
 *   2. fallbackRelative                  — bootstrap zamani manifest.project.structure'tan baked
 *
 * @param {string} hookDir       Cagiran hook'un __dirname degeri
 * @param {string} fallbackRel   hookDir/../.. tabaninda hedef Codebase'e gotueren relatif yol
 *                               Tipik: '../Codebase' (manifest.project.structure default'u)
 * @returns {string}             realpathSync sonucu mutlak yol; cozum basarisizsa duz resolve sonucu
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
            const prefix = rule.decision === 'warn' ? '\u26a0\ufe0f UYARI' : '\u2139\ufe0f BILGI';
            process.stdout.write(JSON.stringify({ systemMessage: prefix + ': ' + rule.reason }));
          }
          return;
        }
      }
    } catch (e) { /* Hook hatalari sessizce yutulur */ }
  };
}

function runGuard(rules, options) {
  return createGuardHook(rules, options)();
}

module.exports = { readStdin, createGuardHook, runGuard, resolveCodebaseRoot };

'use strict';

/**
 * interview.js — interview flow (interactive + non-interactive)
 *
 * Pure logic (resolveDefault, collectDefaults) is separate from readline I/O —
 * so the --yes / --answers paths can be tested without I/O.
 *
 *   collectDefaults(qs, detection, overrides)  → answers   (--yes / --answers)
 *   runInteractive(qs, detection, io)          → answers   (a real terminal)
 */

const readline = require('node:readline/promises');

/** Reads a value from detection by dot path ('detected.orm.value', 'projectType'). */
function getPath(obj, dotPath) {
  return dotPath.split('.').reduce((cur, k) => (cur == null ? undefined : cur[k]), obj);
}

/** Resolved default for one question: detectKey first, then the static default. */
function resolveDefault(question, detection) {
  if (question.detectKey) {
    const detVal = getPath(detection, question.detectKey);
    if (detVal != null && detVal !== '') return detVal;
  }
  return question.default != null ? question.default : (question.type === 'confirm' ? false : '');
}

/**
 * Collects answers without a prompt. Uses overrides[key] when present, otherwise the default.
 * --yes (overrides = {}) and --answers (overrides = file) both use this.
 */
function collectDefaults(questions, detection, overrides = {}) {
  const answers = {};
  for (const q of questions) {
    answers[q.key] = q.key in overrides ? overrides[q.key] : resolveDefault(q, detection);
  }
  return answers;
}

/** Normalizes and checks one answer (select → allowed value, confirm → boolean). */
function normalizeAnswer(question, raw) {
  if (question.type === 'confirm') {
    if (typeof raw === 'boolean') return raw;
    const s = String(raw).trim().toLowerCase();
    return ['y', 'yes', '1', 'true'].includes(s);
  }
  if (question.type === 'select') {
    const values = question.options.map((o) => o.value);
    const s = String(raw).trim();
    // Numarayla secim (1-based) veya dogrudan value.
    const asNum = Number(s);
    if (Number.isInteger(asNum) && asNum >= 1 && asNum <= values.length) return values[asNum - 1];
    if (values.includes(s)) return s;
    return null; // gecersiz
  }
  return String(raw).trim();
}

/** Asks one interactive question. */
async function askOne(rl, question, detection) {
  const def = resolveDefault(question, detection);
  if (question.type === 'select') {
    const lines = question.options
      .map((o, i) => `  ${i + 1}) ${o.label}${o.value === def ? '  (default)' : ''}`)
      .join('\n');
    while (true) {
      const raw = (await rl.question(`\n${question.prompt}\n${lines}\n› `)).trim();
      if (raw === '') return def;
      const norm = normalizeAnswer(question, raw);
      if (norm != null) return norm;
      rl.output.write('  Invalid choice, try again.\n');
    }
  }
  if (question.type === 'confirm') {
    const hint = def ? 'E/h' : 'e/H';
    const raw = (await rl.question(`\n${question.prompt} (${hint}) › `)).trim();
    return raw === '' ? def : normalizeAnswer(question, raw);
  }
  // text
  const defHint = def ? ` [${def}]` : (question.optional ? ' [optional]' : '');
  const raw = (await rl.question(`\n${question.prompt}${defHint}\n› `)).trim();
  if (raw === '') return def || '';
  return raw;
}

/**
 * Asks every question interactively. io = { input, output } (default stdin/stdout).
 */
async function runInteractive(questions, detection, io = {}) {
  const rl = readline.createInterface({
    input: io.input || process.stdin,
    output: io.output || process.stdout,
  });
  const answers = {};
  try {
    let currentPhase = null;
    for (const q of questions) {
      if (q.phase !== currentPhase) {
        currentPhase = q.phase;
        rl.output.write(`\n── Faz ${q.phase} ──\n`);
      }
      answers[q.key] = await askOne(rl, q, detection);
    }
  } finally {
    rl.close();
  }
  return answers;
}

module.exports = { resolveDefault, collectDefaults, normalizeAnswer, runInteractive, getPath };

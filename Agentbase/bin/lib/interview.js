'use strict';

/**
 * interview.js — Roportaj akisi (interaktif + non-interaktif)
 *
 * Saf mantik (resolveDefault, collectDefaults) readline I/O'dan ayridir —
 * boylece --yes / --answers yollari I/O olmadan test edilebilir.
 *
 *   collectDefaults(qs, detection, overrides)  → answers   (--yes / --answers)
 *   runInteractive(qs, detection, io)          → answers   (gercek terminal)
 */

const readline = require('node:readline/promises');

/** detection icinden nokta-yola gore deger oku ('detected.orm.value', 'projectType'). */
function getPath(obj, dotPath) {
  return dotPath.split('.').reduce((cur, k) => (cur == null ? undefined : cur[k]), obj);
}

/** Bir sorunun cozulmus varsayilani: once detectKey, sonra statik default. */
function resolveDefault(question, detection) {
  if (question.detectKey) {
    const detVal = getPath(detection, question.detectKey);
    if (detVal != null && detVal !== '') return detVal;
  }
  return question.default != null ? question.default : (question.type === 'confirm' ? false : '');
}

/**
 * Non-interaktif cevap toplama. overrides[key] varsa onu, yoksa varsayilani kullanir.
 * --yes (overrides = {}) ve --answers (overrides = dosya) bunu kullanir.
 */
function collectDefaults(questions, detection, overrides = {}) {
  const answers = {};
  for (const q of questions) {
    answers[q.key] = q.key in overrides ? overrides[q.key] : resolveDefault(q, detection);
  }
  return answers;
}

/** Bir cevabi normalize/dogrula (select → izinli value, confirm → boolean). */
function normalizeAnswer(question, raw) {
  if (question.type === 'confirm') {
    if (typeof raw === 'boolean') return raw;
    const s = String(raw).trim().toLowerCase();
    return ['y', 'yes', 'e', 'evet', '1', 'true'].includes(s);
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

/** Interaktif tek soru. */
async function askOne(rl, question, detection) {
  const def = resolveDefault(question, detection);
  if (question.type === 'select') {
    const lines = question.options
      .map((o, i) => `  ${i + 1}) ${o.label}${o.value === def ? '  (varsayılan)' : ''}`)
      .join('\n');
    while (true) {
      const raw = (await rl.question(`\n${question.prompt}\n${lines}\n› `)).trim();
      if (raw === '') return def;
      const norm = normalizeAnswer(question, raw);
      if (norm != null) return norm;
      rl.output.write('  Geçersiz seçim, tekrar dene.\n');
    }
  }
  if (question.type === 'confirm') {
    const hint = def ? 'E/h' : 'e/H';
    const raw = (await rl.question(`\n${question.prompt} (${hint}) › `)).trim();
    return raw === '' ? def : normalizeAnswer(question, raw);
  }
  // text
  const defHint = def ? ` [${def}]` : (question.optional ? ' [boş geçilebilir]' : '');
  const raw = (await rl.question(`\n${question.prompt}${defHint}\n› `)).trim();
  if (raw === '') return def || '';
  return raw;
}

/**
 * Tum sorulari interaktif sorar. io = { input, output } (varsayilan stdin/stdout).
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

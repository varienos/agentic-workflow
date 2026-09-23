#!/usr/bin/env node
'use strict';

/**
 * init.js — Terminal-tabanli proje yapilandirma (deterministik dikis)
 *
 * Bootstrap'in deterministik yukunu (detect + roportaj + manifest + generate)
 * Opus'tan alip terminale tasir. Geriye yalnizca CLAUDE_FILL narrative Opus'a kalir.
 *
 * Kullanim:
 *   node bin/init.js                          # interaktif (gercek terminal)
 *   node bin/init.js --yes                    # soru yok, detected + default
 *   node bin/init.js --answers init-answers.yaml   # replay (CI)
 *   node bin/init.js --dry-run                # tespit raporu, yazma yok
 *   node bin/init.js --codebase ../Codebase --targets claude,codex
 *
 * Stdout markerlari (bootstrap.md okur):
 *   MANIFEST_WRITTEN  — gecerli manifest yazildi
 *   INIT_DONE         — deterministik uretim tamamlandi
 *   INIT_ERROR        — hata (fail-loud; sessiz fallback yok)
 *
 * TTY kisiti: interaktif mod yalnizca gercek terminalde calisir. Agent/CI
 * oturumlari --yes veya --answers kullanmalidir (bkz. import-codebase-ai.js).
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const yaml = require('js-yaml');

const { detect } = require('./lib/detect');
const { collectDefaults, runInteractive } = require('./lib/interview');
const { assemble } = require('./lib/assemble');
const { QUESTIONS } = require('../templates/interview/questions');
const { validateManifest } = require('../templates/manifest.schema');

// --- CLI parse ---
function parseArgs(argv) {
  const args = { codebase: null, agentbase: null, answers: null, targets: null, dryRun: false, yes: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--codebase') args.codebase = argv[++i];
    else if (a === '--agentbase') args.agentbase = argv[++i];
    else if (a === '--answers') args.answers = argv[++i];
    else if (a === '--targets') args.targets = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--yes' || a === '-y') args.yes = true;
    else if (a === '-h' || a === '--help') { process.stdout.write(usage()); process.exit(0); }
    else { process.stderr.write(`Unknown argument: ${a}\n`); process.exit(2); }
  }
  return args;
}

function usage() {
  return [
    'init.js — terminal project setup',
    '',
    'Usage: node bin/init.js [options]',
    '  --codebase <path>    Codebase to scan (default: ../Codebase)',
    '  --agentbase <path>   Agentbase root (default: this script location)',
    '  --answers <file>     YAML answer file for replay mode',
    '  --targets <list>     Comma-separated hosts (default: claude)',
    '  --yes, -y            Non-interactive: detected values plus defaults',
    '  --dry-run            Detection report, no files written',
    '  -h, --help           This help',
    '',
  ].join('\n');
}

function fail(msg) {
  process.stderr.write(`\n❌ ${msg}\n`);
  process.stdout.write('INIT_ERROR\n');
  process.exit(1);
}

// --- detection ozeti ---
function printDetectionSummary(detection) {
  const out = process.stdout;
  out.write('\n=== Automatic detection ===\n');
  out.write(`  runtime:         ${detection.runtime || 'unknown'}${detection.typescript ? ' (TypeScript)' : ''}\n`);
  out.write(`  package manager: ${detection.packageManager || '—'}\n`);
  out.write(`  project type:    ${detection.projectType}${detection.subprojects.length ? ` (${detection.subprojects.length} subprojects)` : ''}\n`);
  const d = detection.detected;
  for (const f of ['test_framework', 'orm', 'formatter', 'linter', 'auth_method', 'design_system', 'deploy_platform']) {
    if (d[f] && d[f].value) out.write(`  ${f.padEnd(15)} ${d[f].value}  [${d[f].confidence}]\n`);
  }
}

// --- review ekrani ---
function printManifestSummary(manifest) {
  const out = process.stdout;
  out.write('\n=== Manifest summary ===\n');
  out.write(`  project:  ${manifest.project.name} (${manifest.project.type})\n`);
  out.write(`  stack:    ${manifest.stack.primary}\n`);
  out.write(`  test:     ${manifest.stack.test_framework || '—'}\n`);
  out.write(`  branch:   ${manifest.workflows.branch_model} / commit: ${manifest.workflows.commit_convention}\n`);
  out.write(`  developer:${manifest.developer.experience} / ${manifest.developer.autonomy}\n`);
  out.write(`  targets:  ${manifest.targets.join(', ')}\n`);
}

async function confirmInteractive() {
  const readline = require('node:readline/promises');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const raw = (await rl.question('\nContinue with this manifest? (y/n) › ')).trim().toLowerCase();
    return raw === '' || ['y', 'yes'].includes(raw);
  } finally {
    rl.close();
  }
}

// --- generate.js / transform.js orkestrasyonu ---
function runGenerate(agentbase, manifestPath) {
  const script = path.join(agentbase, 'generate.js');
  const res = spawnSync('node', [script, manifestPath], { cwd: agentbase, stdio: 'inherit' });
  if (res.status !== 0) fail(`generate.js failed (exit ${res.status}).`);
}

function runTransform(agentbase, manifestPath, targets) {
  const nonClaude = targets.filter((t) => t !== 'claude');
  if (nonClaude.length === 0) return;
  const script = path.join(agentbase, 'transform.js');
  if (!fs.existsSync(script)) { process.stderr.write('⚠️  transform.js was not found; host transform skipped.\n'); return; }
  const res = spawnSync('node', [script, manifestPath], { cwd: agentbase, stdio: 'inherit' });
  if (res.status !== 0) fail(`transform.js failed (exit ${res.status}).`);
}

// graphify is optional. init never installs it and never fails when it is absent.
// `spawn` is injectable for tests; production uses spawnSync only to probe.
function ensureGraphify({ dryRun = false, spawn = spawnSync } = {}) {
  if (dryRun) {
    process.stdout.write('\n[dry-run] graphify is optional; install skipped.\n');
    return { action: 'skipped-dry-run' };
  }
  const probe = spawn('which', ['graphify'], { encoding: 'utf8' });
  if (probe && probe.status === 0 && String(probe.stdout || '').trim()) {
    process.stdout.write(`\ngraphify present (optional): ${String(probe.stdout).trim()}\n`);
    return { action: 'already-present' };
  }
  process.stdout.write('\ngraphify is not installed. It is optional; continuing without it.\n');
  return { action: 'absent-optional' };
}

// --- ana akis ---
async function main() {
  const args = parseArgs(process.argv);

  const agentbase = path.resolve(args.agentbase || path.join(__dirname, '..'));
  const codebase = path.resolve(args.codebase || path.join(agentbase, '..', 'Codebase'));
  const targets = args.targets ? args.targets.split(',').map((s) => s.trim()).filter(Boolean) : ['claude'];

  if (!fs.existsSync(codebase)) fail(`Codebase not found: ${codebase}`);

  process.stdout.write(`\n🚀 init — codebase: ${codebase}\n`);
  const detection = detect(codebase);
  printDetectionSummary(detection);

  // --- cevap toplama (mod secimi) ---
  let answers;
  if (args.answers) {
    let overrides;
    try {
      overrides = yaml.load(fs.readFileSync(path.resolve(args.answers), 'utf8')) || {};
    } catch (e) {
      return fail(`Could not read the answers file: ${e.message}`);
    }
    answers = collectDefaults(QUESTIONS, detection, overrides);
  } else if (args.yes) {
    answers = collectDefaults(QUESTIONS, detection, {});
  } else if (process.stdin.isTTY) {
    answers = await runInteractive(QUESTIONS, detection);
  } else {
    return fail('No TTY. Interactive mode needs a real terminal; use --yes or --answers for agents and CI.');
  }

  // --- manifest montaji + dogrulama ---
  const projectName = path.basename(path.dirname(codebase)) || path.basename(codebase);
  const manifest = assemble(detection, answers, {
    projectName,
    targets,
    generatedAt: new Date().toISOString(),
  });

  const { valid, errors, warnings } = validateManifest(manifest);
  if (warnings.length) {
    process.stdout.write('\n⚠️  Warnings:\n');
    warnings.forEach((w) => process.stdout.write(`   - ${w}\n`));
  }
  if (!valid) {
    process.stderr.write('\n❌ Manifest is invalid:\n');
    errors.forEach((e) => process.stderr.write(`   - ${e}\n`));
    return fail('Manifest validation failed (fail-loud).');
  }

  printManifestSummary(manifest);

  // --- dry-run: yazma yok ---
  if (args.dryRun) {
    process.stdout.write('\n--- DRY RUN: manifest preview ---\n');
    process.stdout.write(yaml.dump(manifest, { lineWidth: 100 }));
    process.stdout.write('\nINIT_DONE (dry-run)\n');
    return;
  }

  // --- interaktif onay ---
  if (!args.yes && !args.answers && process.stdin.isTTY) {
    const ok = await confirmInteractive();
    if (!ok) { process.stdout.write('\nCancelled. You can run init again.\n'); process.exit(0); }
  }

  // --- manifest yaz ---
  const manifestPath = path.join(agentbase, '..', 'Docbase', 'agentic', 'project-manifest.yaml');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, yaml.dump(manifest, { lineWidth: 100 }), 'utf8');
  process.stdout.write(`\n✅ Manifest written: ${manifestPath}\n`);
  process.stdout.write('MANIFEST_WRITTEN\n');

  // --- deterministik uretim ---
  runGenerate(agentbase, manifestPath);
  runTransform(agentbase, manifestPath, targets);

  // Optional probe only. Missing graphify does not fail init.
  ensureGraphify({ dryRun: args.dryRun });

  process.stdout.write('\nDeterministic workflow files were generated.\n');
  process.stdout.write('   Next: run bootstrap on the host you use until "BOOTSTRAP_COMPLETE".\n');
  process.stdout.write('   Claude is one host. Remaining narrative blocks are marked CLAUDE_FILL for whichever host fills them.\n');
  process.stdout.write('INIT_DONE\n');
}

// Yalnizca dogrudan calistirilinca main() yurur — require ile import edildiginde
// (test) yan etki olmaz. ensureGraphify birim testlerde enjekte edilen spawn ile cagrilir.
if (require.main === module) {
  main().catch((e) => fail(e && e.stack ? e.stack : String(e)));
}

module.exports = { ensureGraphify, main };

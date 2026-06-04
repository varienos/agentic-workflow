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
    else { process.stderr.write(`Bilinmeyen argüman: ${a}\n`); process.exit(2); }
  }
  return args;
}

function usage() {
  return [
    'init.js — terminal-tabanlı proje yapılandırma',
    '',
    'Kullanım: node bin/init.js [seçenekler]',
    '  --codebase <yol>     Taranacak codebase (varsayılan: ../Codebase)',
    '  --agentbase <yol>    Agentbase kökü (varsayılan: script konumu)',
    '  --answers <dosya>    Cevap dosyası (YAML) ile replay modu',
    '  --targets <liste>    Virgülle ayrılmış hedefler (varsayılan: claude)',
    '  --yes, -y            Non-interaktif: detected + default değerler',
    '  --dry-run            Tespit raporu, fiziksel değişiklik yok',
    '  -h, --help           Bu yardım',
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
  out.write('\n=== Otomatik Tespit ===\n');
  out.write(`  runtime:         ${detection.runtime || 'bilinmiyor'}${detection.typescript ? ' (TypeScript)' : ''}\n`);
  out.write(`  package manager: ${detection.packageManager || '—'}\n`);
  out.write(`  proje tipi:      ${detection.projectType}${detection.subprojects.length ? ` (${detection.subprojects.length} alt proje)` : ''}\n`);
  const d = detection.detected;
  for (const f of ['test_framework', 'orm', 'formatter', 'linter', 'auth_method', 'design_system', 'deploy_platform']) {
    if (d[f] && d[f].value) out.write(`  ${f.padEnd(15)} ${d[f].value}  [${d[f].confidence}]\n`);
  }
}

// --- review ekrani ---
function printManifestSummary(manifest) {
  const out = process.stdout;
  out.write('\n=== Manifest Özeti ===\n');
  out.write(`  proje:    ${manifest.project.name} (${manifest.project.type})\n`);
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
    const raw = (await rl.question('\nBu manifest ile devam edilsin mi? (E/h) › ')).trim().toLowerCase();
    return raw === '' || ['e', 'evet', 'y', 'yes'].includes(raw);
  } finally {
    rl.close();
  }
}

// --- generate.js / transform.js orkestrasyonu ---
function runGenerate(agentbase, manifestPath) {
  const script = path.join(agentbase, 'generate.js');
  const res = spawnSync('node', [script, manifestPath], { cwd: agentbase, stdio: 'inherit' });
  if (res.status !== 0) fail(`generate.js başarısız (exit ${res.status}).`);
}

function runTransform(agentbase, manifestPath, targets) {
  const nonClaude = targets.filter((t) => t !== 'claude');
  if (nonClaude.length === 0) return;
  const script = path.join(agentbase, 'transform.js');
  if (!fs.existsSync(script)) { process.stderr.write('⚠️  transform.js bulunamadı, hedef dönüşümü atlandı.\n'); return; }
  const res = spawnSync('node', [script, manifestPath], { cwd: agentbase, stdio: 'inherit' });
  if (res.status !== 0) fail(`transform.js başarısız (exit ${res.status}).`);
}

// --- ana akis ---
async function main() {
  const args = parseArgs(process.argv);

  const agentbase = path.resolve(args.agentbase || path.join(__dirname, '..'));
  const codebase = path.resolve(args.codebase || path.join(agentbase, '..', 'Codebase'));
  const targets = args.targets ? args.targets.split(',').map((s) => s.trim()).filter(Boolean) : ['claude'];

  if (!fs.existsSync(codebase)) fail(`Codebase bulunamadı: ${codebase}`);

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
      return fail(`Cevap dosyası okunamadı: ${e.message}`);
    }
    answers = collectDefaults(QUESTIONS, detection, overrides);
  } else if (args.yes) {
    answers = collectDefaults(QUESTIONS, detection, {});
  } else if (process.stdin.isTTY) {
    answers = await runInteractive(QUESTIONS, detection);
  } else {
    return fail('TTY yok. Interaktif mod gerçek terminal ister; agent/CI için --yes veya --answers kullan.');
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
    process.stdout.write('\n⚠️  Uyarılar:\n');
    warnings.forEach((w) => process.stdout.write(`   - ${w}\n`));
  }
  if (!valid) {
    process.stderr.write('\n❌ Manifest geçersiz:\n');
    errors.forEach((e) => process.stderr.write(`   - ${e}\n`));
    return fail('Manifest doğrulaması başarısız (fail-loud).');
  }

  printManifestSummary(manifest);

  // --- dry-run: yazma yok ---
  if (args.dryRun) {
    process.stdout.write('\n--- DRY RUN: manifest önizleme ---\n');
    process.stdout.write(yaml.dump(manifest, { lineWidth: 100 }));
    process.stdout.write('\nINIT_DONE (dry-run)\n');
    return;
  }

  // --- interaktif onay ---
  if (!args.yes && !args.answers && process.stdin.isTTY) {
    const ok = await confirmInteractive();
    if (!ok) { process.stdout.write('\nİptal edildi. Tekrar çalıştırabilirsin.\n'); process.exit(0); }
  }

  // --- manifest yaz ---
  const manifestPath = path.join(agentbase, '..', 'Docbase', 'agentic', 'project-manifest.yaml');
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, yaml.dump(manifest, { lineWidth: 100 }), 'utf8');
  process.stdout.write(`\n✅ Manifest yazıldı: ${manifestPath}\n`);
  process.stdout.write('MANIFEST_WRITTEN\n');

  // --- deterministik uretim ---
  runGenerate(agentbase, manifestPath);
  runTransform(agentbase, manifestPath, targets);

  process.stdout.write('\n✅ Deterministik yapılandırma üretildi.\n');
  process.stdout.write('   Sıradaki adım (Claude): /goal /bootstrap until "BOOTSTRAP_COMPLETE"\n');
  process.stdout.write('   (bootstrap artık yalnızca CLAUDE_FILL narrative bloklarını doldurur)\n');
  process.stdout.write('INIT_DONE\n');
}

main().catch((e) => fail(e && e.stack ? e.stack : String(e)));

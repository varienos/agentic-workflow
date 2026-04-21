#!/usr/bin/env node
'use strict';

/**
 * Codebase AI Import — Agentic Workflow
 *
 * Bir projeye Bootstrap uygulanmadan önce Codebase'te kalan Claude Code ve
 * Backlog varlıklarını Agentbase'e taşır ve Codebase'ten siler.
 *
 * KUTSAL KURAL 2 MUAFİYETİ: Bu script Codebase'e yazar (silme işlemi).
 * Muafiyet sadece kullanıcının çift onayıyla etkinleşir.
 *
 * Kullanım:
 *   node bin/import-codebase-ai.js --codebase ../Codebase --agentbase .
 *   node bin/import-codebase-ai.js --codebase ../Codebase --agentbase . --dry-run
 *   node bin/import-codebase-ai.js --codebase ../Codebase --agentbase . --yes
 *
 * Stdout markerları (bootstrap.md tarafından okunur):
 *   NO_IMPORT_NEEDED   — tespit edilen varlık yok
 *   IMPORT_CANCELLED   — kullanıcı onayı reddetti
 *   IMPORT_DONE        — başarıyla tamamlandı
 *   IMPORT_ERROR       — hata oluştu
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// --- CLI parse ---

function parseArgs(argv) {
  const args = { codebase: null, agentbase: null, dryRun: false, yes: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--codebase') args.codebase = argv[++i];
    else if (a === '--agentbase') args.agentbase = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--yes') args.yes = true;
    else if (a === '-h' || a === '--help') {
      process.stdout.write(usage());
      process.exit(0);
    }
  }
  return args;
}

function usage() {
  return (
    'Kullanım: node bin/import-codebase-ai.js --codebase <yol> --agentbase <yol> [--dry-run] [--yes]\n\n' +
    '  --codebase <yol>   Hedef Codebase dizini (zorunlu)\n' +
    '  --agentbase <yol>  Hedef Agentbase dizini (zorunlu)\n' +
    '  --dry-run          Sadece tespit ve plan raporu, dosyaya dokunma\n' +
    '  --yes              Non-interaktif: onay adımlarını atla (CI/test)\n'
  );
}

// --- Varlık tespiti ---

/**
 * Kopyalama planının tek bir öğesi.
 * @typedef {Object} PlanItem
 * @property {string} kind       — "dir" | "file"
 * @property {string} src        — mutlak kaynak yolu
 * @property {string} dst        — mutlak hedef yolu
 * @property {string} label      — rapor için etiket (örn: ".claude/")
 * @property {string} category   — "claude" | "memory" | "backlog" | "mcp" | "instruction"
 * @property {number} fileCount  — dosya sayısı (dir ise rekürsif)
 */

function countFilesRecursive(dir) {
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) count += countFilesRecursive(p);
      else if (e.isFile()) count++;
    }
  } catch {
    // yok say
  }
  return count;
}

function detectAssets(codebase, agentbase, timestamp) {
  const items = [];
  const imported = path.join(agentbase, '.claude', 'custom', '_imported', timestamp);
  const memoryDst = path.join(agentbase, '.claude', 'custom', 'memory');

  // .claude/ (ancak memory alt klasörleri hariç — memory için ayrı eşleme var)
  const cbClaude = path.join(codebase, '.claude');
  if (fs.existsSync(cbClaude) && fs.statSync(cbClaude).isDirectory()) {
    items.push({
      kind: 'dir',
      src: cbClaude,
      dst: path.join(imported, 'claude'),
      label: '.claude/',
      category: 'claude',
      fileCount: countFilesRecursive(cbClaude),
    });
  }

  // .claude/memory/ veya .claude/agent-memory/ — custom/memory/ altına ayrı yerleşim
  for (const memDir of ['memory', 'agent-memory']) {
    const src = path.join(cbClaude, memDir);
    if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
      items.push({
        kind: 'dir',
        src,
        dst: path.join(memoryDst, memDir),
        label: `.claude/${memDir}/`,
        category: 'memory',
        fileCount: countFilesRecursive(src),
      });
    }
  }

  // CLAUDE.md
  const cbClaudeMd = path.join(codebase, 'CLAUDE.md');
  if (fs.existsSync(cbClaudeMd) && fs.statSync(cbClaudeMd).isFile()) {
    items.push({
      kind: 'file',
      src: cbClaudeMd,
      dst: path.join(imported, 'CLAUDE.md'),
      label: 'CLAUDE.md',
      category: 'instruction',
      fileCount: 1,
    });
  }

  // .mcp.json
  const cbMcp = path.join(codebase, '.mcp.json');
  if (fs.existsSync(cbMcp) && fs.statSync(cbMcp).isFile()) {
    items.push({
      kind: 'file',
      src: cbMcp,
      dst: path.join(imported, '.mcp.json'),
      label: '.mcp.json',
      category: 'mcp',
      fileCount: 1,
    });
  }

  // backlog/* alt klasörleri
  for (const sub of ['tasks', 'completed', 'archive', 'drafts']) {
    const src = path.join(codebase, 'backlog', sub);
    if (fs.existsSync(src) && fs.statSync(src).isDirectory()) {
      items.push({
        kind: 'dir',
        src,
        dst: path.join(agentbase, 'backlog', sub),
        label: `backlog/${sub}/`,
        category: 'backlog',
        fileCount: countFilesRecursive(src),
      });
    }
  }

  return items;
}

// --- Rapor ---

function formatPlan(items, codebase, agentbase) {
  if (items.length === 0) {
    return 'Codebase içinde taşınacak AI varlığı bulunamadı.\n';
  }

  const lines = [];
  lines.push('🔍 Codebase içinde tespit edilen AI varlıkları:');
  lines.push('');
  let totalFiles = 0;
  for (const it of items) {
    const rel = path.relative(codebase, it.src) || it.label;
    const dstRel = path.relative(agentbase, it.dst);
    const count = it.kind === 'dir' ? `${it.fileCount} dosya` : '';
    lines.push(`  ✓ ${rel.padEnd(30)} ${count.padEnd(14)} → Agentbase/${dstRel}`);
    totalFiles += it.fileCount;
  }
  lines.push('');
  lines.push(`Taşıma planı: ${totalFiles} dosya kopyalanacak, ardından kaynaklar Codebase'ten silinecek.`);
  lines.push('');
  return lines.join('\n');
}

// --- Interaktif onay ---

function prompt(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

async function askConfirmation(items) {
  if (process.stdin.isTTY !== true) {
    throw new Error(
      'Interaktif onay için TTY gerekli. CI/test ortamında --yes bayrağını kullanın.'
    );
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const a1 = await prompt(
      rl,
      "\nCodebase'teki bu varlıkları Agentbase'e taşımak ve Codebase'ten silmek istediğinize emin misiniz? [yes/no]: "
    );
    if (a1.toLowerCase() !== 'yes' && a1.toLowerCase() !== 'y') return false;

    const a2 = await prompt(
      rl,
      '\n⚠️  KUTSAL KURAL 2 MUAFİYETİ\n' +
        "Bu işlem Codebase'i değiştirecek (silme işlemi).\n" +
        'Onaylamak için tam metni yazın: [TAŞIMA VE SİLME ONAYI / cancel]: '
    );
    return a2 === 'TAŞIMA VE SİLME ONAYI';
  } finally {
    rl.close();
  }
}

// --- Kopyalama ---

function copyFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
    else if (entry.isSymbolicLink()) {
      const target = fs.readlinkSync(s);
      fs.symlinkSync(target, d);
    }
  }
}

function removeRecursive(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function checkDestinationConflicts(items) {
  const conflicts = [];
  for (const it of items) {
    if (fs.existsSync(it.dst)) {
      if (it.kind === 'file') {
        conflicts.push(it);
      } else if (it.category === 'memory' || it.category === 'backlog') {
        // memory ve backlog icin alt klasor ici dosya cakismasini kontrol et
        const files = fs.readdirSync(it.dst, { withFileTypes: true }).filter(e => e.isFile());
        if (files.length > 0) conflicts.push(it);
      } else {
        conflicts.push(it);
      }
    }
  }
  return conflicts;
}

function executePlan(items) {
  // Faz A — kopyala
  const copied = [];
  try {
    for (const it of items) {
      if (it.kind === 'dir') copyDir(it.src, it.dst);
      else copyFile(it.src, it.dst);
      copied.push(it);
    }
  } catch (err) {
    return { ok: false, phase: 'copy', error: err.message, copied };
  }

  // Faz B — sil
  const removed = [];
  try {
    for (const it of items) {
      removeRecursive(it.src);
      removed.push(it);
    }
  } catch (err) {
    return { ok: false, phase: 'delete', error: err.message, copied, removed };
  }

  return { ok: true, copied, removed };
}

// --- Rapor dosyası ---

function writeReport(agentbase, timestamp, items, opts) {
  const reportDir = path.join(agentbase, '.claude', 'custom', '_imported', timestamp);
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'import-report.md');

  const lines = [];
  lines.push(`# Codebase AI Import Raporu`);
  lines.push(``);
  lines.push(`- **Zaman:** ${timestamp}`);
  lines.push(`- **Mod:** ${opts.yes ? 'non-interaktif (--yes)' : 'interaktif çift onay'}`);
  lines.push(`- **Dry-run:** ${opts.dryRun ? 'evet' : 'hayır'}`);
  lines.push(``);
  lines.push(`## Taşınan Varlıklar`);
  lines.push(``);
  if (items.length === 0) {
    lines.push(`_Varlık taşınmadı._`);
  } else {
    lines.push(`| Kaynak | Hedef | Dosya |`);
    lines.push(`|---|---|---|`);
    for (const it of items) {
      lines.push(`| ${it.label} | ${path.relative(opts.agentbase, it.dst)} | ${it.fileCount} |`);
    }
  }
  lines.push(``);
  lines.push(`## Not`);
  lines.push(``);
  lines.push(`Bu işlem KUTSAL KURAL 2'ye "kullanıcı onaylı bilinçli istisna" muafiyeti`);
  lines.push(`altında yapıldı. Silinen dosyalar Codebase'in git history'sinde kalır;`);
  lines.push(`\`git log --follow\` ile bulunabilir.`);
  lines.push(``);

  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
  return reportPath;
}

// --- Ana akış ---

async function main() {
  const args = parseArgs(process.argv);

  if (!args.codebase || !args.agentbase) {
    process.stderr.write(usage());
    process.stdout.write('IMPORT_ERROR\n');
    process.exit(2);
  }

  const codebase = path.resolve(args.codebase);
  const agentbase = path.resolve(args.agentbase);

  if (!fs.existsSync(codebase)) {
    process.stderr.write(`Codebase bulunamadı: ${codebase}\n`);
    process.stdout.write('IMPORT_ERROR\n');
    process.exit(2);
  }

  // Symlink uyarısı — bilgi amaçlı, blocking değil
  try {
    const st = fs.lstatSync(codebase);
    if (st.isSymbolicLink()) {
      process.stdout.write(
        '⚠️  Codebase bir symbolic link. Silme işlemi link hedefindeki gerçek dosyaları etkiler.\n'
      );
    }
  } catch {
    // yok say
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const items = detectAssets(codebase, agentbase, timestamp);

  process.stdout.write(formatPlan(items, codebase, agentbase));

  if (items.length === 0) {
    process.stdout.write('NO_IMPORT_NEEDED\n');
    process.exit(0);
  }

  // Hedef çakışması kontrolü — kopyalama öncesi
  const conflicts = checkDestinationConflicts(items);
  if (conflicts.length > 0) {
    process.stdout.write(
      '\n⚠️  Hedef çakışması tespit edildi. Aşağıdaki hedefler zaten mevcut:\n'
    );
    for (const c of conflicts) {
      process.stdout.write(`  - ${path.relative(agentbase, c.dst)}\n`);
    }
    process.stdout.write('\nManuel review gerekli. Import iptal edildi.\n');
    process.stdout.write('IMPORT_CANCELLED\n');
    process.exit(0);
  }

  if (args.dryRun) {
    process.stdout.write('\n[dry-run] Dosyaya dokunulmadı. Gerçek çalıştırma için --dry-run kaldırın.\n');
    process.stdout.write('IMPORT_DONE\n');
    process.exit(0);
  }

  // Onay
  let confirmed = args.yes;
  if (!args.yes) {
    try {
      confirmed = await askConfirmation(items);
    } catch (err) {
      process.stderr.write(`Onay alınamadı: ${err.message}\n`);
      process.stdout.write('IMPORT_ERROR\n');
      process.exit(2);
    }
  }

  if (!confirmed) {
    process.stdout.write('\nOnay alınamadı. Hiçbir değişiklik yapılmadı.\n');
    process.stdout.write('IMPORT_CANCELLED\n');
    process.exit(0);
  }

  // Yürüt
  const result = executePlan(items);
  if (!result.ok) {
    process.stderr.write(`\n❌ Hata (${result.phase}): ${result.error}\n`);
    if (result.phase === 'copy') {
      process.stderr.write('Silme fazı ÇALIŞTIRILMADI. Codebase değişmedi.\n');
    } else {
      process.stderr.write(
        `Kopyalama tamamlandı ama silme sırasında hata. Manuel inceleme gerekli.\n`
      );
    }
    process.stdout.write('IMPORT_ERROR\n');
    process.exit(2);
  }

  // Rapor
  const reportPath = writeReport(agentbase, timestamp, items, {
    agentbase,
    yes: args.yes,
    dryRun: args.dryRun,
  });

  process.stdout.write(`\n✅ Import tamamlandı. Rapor: ${path.relative(agentbase, reportPath)}\n`);
  process.stdout.write('IMPORT_DONE\n');
  process.exit(0);
}

// --- Exports (test icin) ---

module.exports = {
  parseArgs,
  detectAssets,
  formatPlan,
  checkDestinationConflicts,
  executePlan,
  writeReport,
  countFilesRecursive,
};

// Direkt çalıştırıldığında main()
if (require.main === module) {
  main().catch(err => {
    process.stderr.write(`[import-codebase-ai] Beklenmeyen hata: ${err.stack || err.message}\n`);
    process.stdout.write('IMPORT_ERROR\n');
    process.exit(2);
  });
}

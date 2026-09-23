#!/usr/bin/env node
'use strict';

/**
 * Codebase AI Import — Agentic Workflow
 *
 * Before bootstrap, move leftover host and Backlog assets out of Codebase
 * into Agentbase, then delete them from Codebase.
 *
 * INVARIANT RULE 2 EXCEPTION: this script writes to Codebase (the delete).
 * The exception is active only after the user's double confirmation.
 *
 * Usage:
 *   node bin/import-codebase-ai.js --codebase ../Codebase --agentbase . --dry-run
 *     Detection report. No files change.
 *
 *   node bin/import-codebase-ai.js --codebase ../Codebase --agentbase . --yes
 *     Non-interactive run. Double confirmation must already have happened
 *     outside this script (in bootstrap.md or CI config). `--yes` only
 *     forwards that proof. Do not pass the flag without confirmation.
 *
 *   node bin/import-codebase-ai.js --codebase ../Codebase --agentbase .
 *     Interactive TTY mode. Host bash tools do not provide a TTY, so agent
 *     sessions must not use this form. Real terminals only.
 *
 * Stdout markers (read by bootstrap.md):
 *   NO_IMPORT_NEEDED   — nothing to move
 *   IMPORT_CANCELLED   — user declined or a target conflict
 *   IMPORT_DONE        — finished (dry-run or real)
 *   IMPORT_ERROR       — an error occurred
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
    'Usage: node bin/import-codebase-ai.js --codebase <path> --agentbase <path> [--dry-run] [--yes]\n\n' +
    '  --codebase <path>  Codebase directory (required)\n' +
    '  --agentbase <path> Agentbase directory (required)\n' +
    '  --dry-run          Detection and plan only; do not touch files\n' +
    '  --yes              Non-interactive: skip confirmation (CI/test)\n'
  );
}

// --- Asset detection ---

/**
 * One item in the copy plan.
 * @typedef {Object} PlanItem
 * @property {string} kind       — "dir" | "file"
 * @property {string} src        — mutlak kaynak yolu
 * @property {string} dst        — mutlak hedef yolu
 * @property {string} label      — report label (for example ".claude/")
 * @property {string} category   — "claude" | "memory" | "backlog" | "mcp" | "instruction"
 * @property {number} fileCount  — file count (recursive for a directory)
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

  // .claude/ (except memory subfolders — memory has its own mapping)
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

  // .claude/memory/ or .claude/agent-memory/ — separate placement under custom/memory/
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

  // backlog/* subfolders
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
    return 'No AI assets in Codebase need to be moved.\n';
  }

  const lines = [];
  lines.push('AI assets detected in Codebase:');
  lines.push('');
  let totalFiles = 0;
  for (const it of items) {
    const rel = path.relative(codebase, it.src) || it.label;
    const dstRel = path.relative(agentbase, it.dst);
    const count = it.kind === 'dir' ? `${it.fileCount} files` : '';
    lines.push(`  ✓ ${rel.padEnd(30)} ${count.padEnd(14)} → Agentbase/${dstRel}`);
    totalFiles += it.fileCount;
  }
  lines.push('');
  lines.push(`Move plan: ${totalFiles} files will be copied, then the sources will be deleted from Codebase.`);
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
      'Interactive confirmation needs a TTY. In CI or tests, pass --yes.'
    );
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const a1 = await prompt(
      rl,
      '\nMove these assets into Agentbase and delete them from Codebase? [yes/no]: '
    );
    if (a1.toLowerCase() !== 'yes' && a1.toLowerCase() !== 'y') return false;

    const a2 = await prompt(
      rl,
      '\n⚠️  INVARIANT RULE 2 EXCEPTION\n' +
        'This changes Codebase (files are deleted).\n' +
        'Type the exact text to confirm: [MOVE AND DELETE APPROVED / cancel]: '
    );
    return a2 === 'MOVE AND DELETE APPROVED';
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

// --- Report file ---

function writeReport(agentbase, timestamp, items, opts) {
  const reportDir = path.join(agentbase, '.claude', 'custom', '_imported', timestamp);
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'import-report.md');

  const lines = [];
  lines.push(`# Codebase AI import report`);
  lines.push(``);
  lines.push(`- **Time:** ${timestamp}`);
  lines.push(`- **Mode:** ${opts.yes ? 'non-interactive (--yes)' : 'interactive double confirmation'}`);
  lines.push(`- **Dry-run:** ${opts.dryRun ? 'yes' : 'no'}`);
  lines.push(``);
  lines.push(`## Moved assets`);
  lines.push(``);
  if (items.length === 0) {
    lines.push(`_Nothing was moved._`);
  } else {
    lines.push(`| Source | Target | Files |`);
    lines.push(`|---|---|---|`);
    for (const it of items) {
      lines.push(`| ${it.label} | ${path.relative(opts.agentbase, it.dst)} | ${it.fileCount} |`);
    }
  }
  lines.push(``);
  lines.push(`## Not`);
  lines.push(``);
  lines.push(`This run used the user-approved exception to invariant rule 2.`);
  lines.push(`Deleted files remain in Codebase git history;`);
  lines.push(`\`git log --follow\` ile bulunabilir.`);
  lines.push(``);

  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
  return reportPath;
}

// --- Main flow ---

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
    process.stderr.write(`Codebase not found: ${codebase}\n`);
    process.stdout.write('IMPORT_ERROR\n');
    process.exit(2);
  }

  // Symlink warning — informational, not blocking
  try {
    const st = fs.lstatSync(codebase);
    if (st.isSymbolicLink()) {
      process.stdout.write(
        '⚠️  Codebase is a symbolic link. Deletes affect the real files at the link target.\n'
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

  // Target conflict check — before copy
  const conflicts = checkDestinationConflicts(items);
  if (conflicts.length > 0) {
    process.stdout.write(
      '\n⚠️  Target conflict detected. These destinations already exist:\n'
    );
    for (const c of conflicts) {
      process.stdout.write(`  - ${path.relative(agentbase, c.dst)}\n`);
    }
    process.stdout.write('\nManual review is required. Import cancelled.\n');
    process.stdout.write('IMPORT_CANCELLED\n');
    process.exit(0);
  }

  if (args.dryRun) {
    process.stdout.write('\n[dry-run] No files were touched. Drop --dry-run to run for real.\n');
    process.stdout.write('IMPORT_DONE\n');
    process.exit(0);
  }

  // Onay
  let confirmed = args.yes;
  if (!args.yes) {
    try {
      confirmed = await askConfirmation(items);
    } catch (err) {
      process.stderr.write(`Confirmation failed: ${err.message}\n`);
      process.stdout.write('IMPORT_ERROR\n');
      process.exit(2);
    }
  }

  if (!confirmed) {
    process.stdout.write('\nConfirmation was not given. Nothing was changed.\n');
    process.stdout.write('IMPORT_CANCELLED\n');
    process.exit(0);
  }

  // Execute
  const result = executePlan(items);
  if (!result.ok) {
    process.stderr.write(`\n❌ Error (${result.phase}): ${result.error}\n`);
    if (result.phase === 'copy') {
      process.stderr.write('The delete phase did not run. Codebase was not changed.\n');
    } else {
      process.stderr.write(
        `Copy finished, but delete failed. Manual review is required.\n`
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

  process.stdout.write(`\n✅ Import finished. Report: ${path.relative(agentbase, reportPath)}\n`);
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

// Run main() when executed directly
if (require.main === module) {
  main().catch(err => {
    process.stderr.write(`[import-codebase-ai] Beklenmeyen hata: ${err.stack || err.message}\n`);
    process.stdout.write('IMPORT_ERROR\n');
    process.exit(2);
  });
}

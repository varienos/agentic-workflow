#!/usr/bin/env node

/**
 * destructive-migration-check.js
 * PostToolUse (Bash) hook
 *
 * After `prisma migrate dev` is run:
 * 1. Finds the latest migration directory
 * 2. Scans migration.sql for destructive changes
 * 3. If found, warns according to severity level
 */

const path = require('path');
const fs = require('fs');

const { readStdin, resolveCodebaseRoot } = require(path.join(__dirname, 'shared-hook-utils.js'));

const CODEBASE_ROOT = resolveCodebaseRoot(__dirname, '../Codebase');

/**
 * Destructive SQL expressions and severity levels
 */
const DESTRUCTIVE_PATTERNS = [
  { pattern: /DROP\s+TABLE/gi, label: 'DROP TABLE', severity: 'CRITICAL' },
  { pattern: /DROP\s+COLUMN/gi, label: 'DROP COLUMN', severity: 'HIGH' },
  { pattern: /ALTER\s+COLUMN/gi, label: 'ALTER COLUMN', severity: 'MEDIUM' },
  { pattern: /MODIFY\s+COLUMN/gi, label: 'MODIFY COLUMN', severity: 'MEDIUM' },
  { pattern: /RENAME\s+COLUMN/gi, label: 'RENAME COLUMN', severity: 'MEDIUM' },
  { pattern: /DROP\s+INDEX/gi, label: 'DROP INDEX', severity: 'MEDIUM' },
];

/**
 * Searches for the prisma/migrations directory inside Codebase.
 */
function findMigrationsDir() {
  const candidates = [
    path.join(CODEBASE_ROOT, 'prisma', 'migrations'),
  ];

  // Search subdirectories
  const searchDirs = ['apps', 'packages', 'src'];
  for (const dir of searchDirs) {
    const base = path.join(CODEBASE_ROOT, dir);
    if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) continue;

    try {
      const entries = fs.readdirSync(base, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        candidates.push(path.join(base, entry.name, 'prisma', 'migrations'));
      }
    } catch {
      // Skip if inaccessible
    }
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  return null;
}

/**
 * Finds the latest migration directory (by date order).
 * Prisma migration directories are in YYYYMMDDHHMMSS_name format.
 */
function findLatestMigration(migrationsDir) {
  try {
    const entries = fs.readdirSync(migrationsDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && /^\d{14}_/.test(e.name))
      .sort((a, b) => b.name.localeCompare(a.name));

    if (entries.length === 0) return null;

    const latestDir = path.join(migrationsDir, entries[0].name);
    const sqlFile = path.join(latestDir, 'migration.sql');

    if (fs.existsSync(sqlFile)) {
      return {
        name: entries[0].name,
        sqlPath: sqlFile,
        sql: fs.readFileSync(sqlFile, 'utf8')
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Scans SQL content for destructive patterns.
 */
function scanForDestructiveChanges(sql) {
  const findings = [];

  for (const { pattern, label, severity } of DESTRUCTIVE_PATTERNS) {
    const matches = sql.match(pattern);
    if (matches && matches.length > 0) {
      // Eslesen linei bul
      const lines = sql.split('\n');
      const matchingLines = lines
        .map((line, idx) => ({ line: line.trim(), lineNum: idx + 1 }))
        .filter(({ line }) => {
          pattern.lastIndex = 0;
          return pattern.test(line);
        });

      findings.push({
        label,
        severity,
        count: matches.length,
        lines: matchingLines.slice(0, 5) // En fazla 5 line goster
      });
    }
  }

  return findings;
}

function severityEmoji(severity) {
  switch (severity) {
    case 'CRITICAL': return '🔴';
    case 'HIGH': return '🟠';
    case 'MEDIUM': return '🟡';
    default: return '⚪';
  }
}

async function main() {
  try {
    const input = await readStdin();
    const parsed = JSON.parse(input);

    const command = parsed?.tool_input?.command || '';

    // Run only after a prisma migrate dev command
    if (!/prisma\s+migrate\s+dev/i.test(command)) {
      return;
    }

    const migrationsDir = findMigrationsDir();
    if (!migrationsDir) return;

    const latest = findLatestMigration(migrationsDir);
    if (!latest) return;

    const findings = scanForDestructiveChanges(latest.sql);
    if (findings.length === 0) return;

    // Severity order: CRITICAL > HIGH > MEDIUM
    const severityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2 };
    findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const maxSeverity = findings[0].severity;

    let message = `⚠️ **DESTRUCTIVE MIGRATION DETECTED**\n\n`;
    message += `**Migration:** \`${latest.name}\`\n`;
    message += `**Highest Severity:** ${severityEmoji(maxSeverity)} ${maxSeverity}\n\n`;
    message += `### Detected changes\n\n`;
    message += `| Severity | Operation | Count | Examples |\n`;
    message += `|---|---|---|---|\n`;

    for (const finding of findings) {
      const examples = finding.lines
        .map(l => `\`${l.line}\``)
        .join(', ');
      message += `| ${severityEmoji(finding.severity)} ${finding.severity} | ${finding.label} | ${finding.count} | ${examples} |\n`;
    }

    message += `\n### Recommended actions\n\n`;

    if (maxSeverity === 'CRITICAL') {
      message += `1. **STOP** — this migration can lose data.\n`;
      message += `2. Verify that a backup of data in affected tables has been taken.\n`;
      message += `3. If this is not intentional, roll the migration back. \`npx prisma migrate reset\` wipes the whole database.\n`;
      message += `4. If this is intentional, get approval from the user.\n`;
    } else if (maxSeverity === 'HIGH') {
      message += `1. Check that data from the removed columns is preserved somewhere else.\n`;
      message += `2. Confirm application code no longer references these columns.\n`;
      message += `3. Take a data backup before applying this migration in production.\n`;
    } else {
      message += `1. Check that the changes are compatible with existing data.\n`;
      message += `2. Column type changes can truncate data — verify the existing rows.\n`;
    }

    const result = {
      systemMessage: message
    };
    process.stdout.write(JSON.stringify(result));
  } catch (e) {
    // Hook errors are swallowed silently
  }
}

if (require.main === module) main();

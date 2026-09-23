#!/usr/bin/env node

/**
 * eloquent-migration-check.js
 * PostToolUse (Edit|Write) hook
 *
 * When a Laravel migration file is edited:
 * 1. Scans for destructive operations (dropColumn, dropTable, renameColumn, etc.)
 * 2. Warns according to severity level
 * 3. Reminds to run `php artisan migrate`
 */

const path = require('path');
const fs = require('fs');

const { readStdin, resolveCodebaseRoot } = require(path.join(__dirname, 'shared-hook-utils.js'));

const CODEBASE_ROOT = resolveCodebaseRoot(__dirname, '../Codebase');

/**
 * Destructive PHP expressions in Laravel migration files and severity levels
 */
const DESTRUCTIVE_PATTERNS = [
  { pattern: /Schema::drop\s*\(/g, label: 'Schema::drop()', severity: 'CRITICAL' },
  { pattern: /Schema::dropIfExists\s*\(/g, label: 'Schema::dropIfExists()', severity: 'CRITICAL' },
  { pattern: /->dropColumn\s*\(/g, label: '$table->dropColumn()', severity: 'HIGH' },
  { pattern: /->dropMorphs\s*\(/g, label: '$table->dropMorphs()', severity: 'HIGH' },
  { pattern: /->dropRememberToken\s*\(/g, label: '$table->dropRememberToken()', severity: 'MEDIUM' },
  { pattern: /->dropSoftDeletes\s*\(/g, label: '$table->dropSoftDeletes()', severity: 'HIGH' },
  { pattern: /->dropTimestamps\s*\(/g, label: '$table->dropTimestamps()', severity: 'MEDIUM' },
  { pattern: /->dropForeign\s*\(/g, label: '$table->dropForeign()', severity: 'MEDIUM' },
  { pattern: /->dropIndex\s*\(/g, label: '$table->dropIndex()', severity: 'MEDIUM' },
  { pattern: /->dropPrimary\s*\(/g, label: '$table->dropPrimary()', severity: 'HIGH' },
  { pattern: /->dropUnique\s*\(/g, label: '$table->dropUnique()', severity: 'MEDIUM' },
  { pattern: /Schema::rename\s*\(/g, label: 'Schema::rename()', severity: 'HIGH' },
  { pattern: /->renameColumn\s*\(/g, label: '$table->renameColumn()', severity: 'HIGH' },
];

/**
 * Checks whether the file is a Laravel migration file.
 * Usually under database/migrations/ and starts with a YYYY_MM_DD_HHMMSS_ prefix.
 */
function isLaravelMigration(filePath) {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\/g, '/');
  return /database\/migrations\/\d{4}_\d{2}_\d{2}_\d{6}_.*\.php$/i.test(normalized)
    || /migrations\/\d{4}_\d{2}_\d{2}_\d{6}_.*\.php$/i.test(normalized);
}

/**
 * Scans PHP migration content for destructive patterns.
 */
function scanForDestructiveChanges(content) {
  const findings = [];

  for (const { pattern, label, severity } of DESTRUCTIVE_PATTERNS) {
    // Reset regex lastIndex
    pattern.lastIndex = 0;
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      // Find matching lines
      const lines = content.split('\n');
      // Recreate the pattern for each line (lastIndex reset)
      const testPattern = new RegExp(pattern.source, pattern.flags.replace('g', ''));
      const matchingLines = lines
        .map((line, idx) => ({ line: line.trim(), lineNum: idx + 1 }))
        .filter(({ line }) => testPattern.test(line));

      findings.push({
        label,
        severity,
        count: matches.length,
        lines: matchingLines.slice(0, 5)
      });
    }
  }

  return findings;
}

function severityEmoji(severity) {
  switch (severity) {
    case 'CRITICAL': return '\ud83d\udd34';
    case 'HIGH': return '\ud83d\udfe0';
    case 'MEDIUM': return '\ud83d\udfe1';
    default: return '\u26aa';
  }
}

async function main() {
  try {
    const input = await readStdin();
    const parsed = JSON.parse(input);

    const filePath = parsed?.tool_input?.file_path || parsed?.tool_input?.path || '';

    // Check whether it is a Laravel migration file
    if (!isLaravelMigration(filePath)) return;

    // Read file content
    let content = '';
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      return;
    }

    const findings = scanForDestructiveChanges(content);
    const messages = [];

    if (findings.length > 0) {
      // Severity order: CRITICAL > HIGH > MEDIUM
      const severityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2 };
      findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      const maxSeverity = findings[0].severity;

      let message = `\u26a0\ufe0f **DESTRUCTIVE MIGRATION DETECTED**\n\n`;
      message += `**File:** \`${path.basename(filePath)}\`\n`;
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
        message += `3. If this is intentional, get approval from the user.\n`;
      } else if (maxSeverity === 'HIGH') {
        message += `1. Check whether deleted columns/constraints are still referenced elsewhere.\n`;
        message += `2. Confirm application code no longer references these elements.\n`;
        message += `3. Take a data backup before applying this migration in production.\n`;
      } else {
        message += `1. Check that the changes are compatible with existing data.\n`;
        message += `2. Index or constraint changes can affect performance.\n`;
      }

      messages.push(message);
    }

    // Post-migration reminder in all cases
    messages.push(
      `Reminder: after editing the migration file, run \`php artisan migrate\`.\n` +
      `Check migration status with: \`php artisan migrate:status\``
    );

    if (messages.length > 0) {
      const result = {
        systemMessage: '\ud83d\udd0d **Eloquent Migration Check**\n\n' + messages.join('\n\n---\n\n')
      };
      process.stdout.write(JSON.stringify(result));
    }
  } catch (e) {
    // Hook errors are swallowed silently
  }
}

if (require.main === module) main();

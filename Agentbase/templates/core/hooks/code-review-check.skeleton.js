#!/usr/bin/env node
/**
 * Code Review Hook
 * Produced by bootstrap.
 * PostToolUse (Edit|Write) — scans for security and quality patterns.
 *
 * Hook behavior:
 * - Triggers when an Edit or Write tool runs
 * - Scans file contents against SECURITY_PATTERNS
 * - Writes a warning to stderr when a CRITICAL/HIGH issue is present
 * - Skips when the file extension is not in FILE_EXTENSIONS
 * - Always writes stdin data to stdout (non-blocking)
 */

const fs = require('fs');
const path = require('path');

// ─── GENERATE SECTION START ───
// Bootstrap fills this section from stack info in the manifest.
// Do not edit by hand — bootstrap overwrites these changes.

// Security patterns — extended for the stack
const SECURITY_PATTERNS = [
  // --- Core patterns (present in every project) ---
  { pattern: /(['"`])sk-[a-zA-Z0-9]+\1/, severity: 'CRITICAL', message: 'Hardcoded API key detected' },
  { pattern: /(['"`])password\1\s*[:=]\s*['"`][^'"]+['"`]/, severity: 'HIGH', message: 'Hardcoded password detected' },
  { pattern: /(['"`])(AKIA|ASIA)[A-Z0-9]{16}\1/, severity: 'CRITICAL', message: 'AWS access key detected' },
  { pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/, severity: 'CRITICAL', message: 'Private key detected' },
  { pattern: /console\.log\(/, severity: 'LOW', message: 'console.log detected' },
  { pattern: /TODO|FIXME|HACK/, severity: 'LOW', message: 'TODO/FIXME comment found' },

  /* GENERATE: SECURITY_PATTERNS
   * Bootstrap adds the entries that match the detected stack from the categories below:
   *
   * Node.js/Express:
   *   { pattern: /eval\s*\(/, severity: 'CRITICAL', message: 'eval() usage detected' },
   *   { pattern: /res\.send\(.*req\.(body|query|params)/, severity: 'HIGH', message: 'Request input is reflected in the response (XSS risk)' },
   *
   * Prisma/SQL:
   *   { pattern: /\$queryRaw\s*`[^`]*\$\{/, severity: 'CRITICAL', message: 'Interpolation in a raw query — SQL injection risk' },
   *   { pattern: /\$executeRaw\s*`[^`]*\$\{/, severity: 'CRITICAL', message: 'Interpolation in a raw execute — SQL injection risk' },
   *
   * PHP:
   *   { pattern: /\$_(GET|POST|REQUEST)\[/, severity: 'HIGH', message: 'Raw superglobal usage — sanitize before use' },
   *   { pattern: /mysql_query\s*\(/, severity: 'CRITICAL', message: 'Deprecated mysql_query — use PDO or a prepared statement' },
   *
   * React/React Native:
   *   { pattern: /dangerouslySetInnerHTML/, severity: 'HIGH', message: 'dangerouslySetInnerHTML usage — XSS risk' },
   *
   * Django/Python:
   *   { pattern: /\.raw\s*\([^)]*%/, severity: 'CRITICAL', message: 'String formatting in raw SQL — SQL injection risk' },
   *   { pattern: /mark_safe\s*\(/, severity: 'HIGH', message: 'mark_safe usage — XSS risk' },
   *
   * General:
   *   { pattern: /process\.env\.\w+/, severity: 'LOW', message: 'Direct process.env access — should this go through a config module?' },
   */
  /* END GENERATE */
];

// Naming-convention check patterns
const NAMING_PATTERNS = [
  /* GENERATE: NAMING_PATTERNS
   * Bootstrap adds a naming check from manifest.conventions.naming.
   *
   * camelCase project:
   *   { pattern: /(?:const|let|var)\s+[a-z]+_[a-z]+/, severity: 'LOW', message: 'snake_case variable — camelCase is expected' },
   *   { pattern: /function\s+[a-z]+_[a-z]+/, severity: 'LOW', message: 'snake_case function — camelCase is expected' },
   *
   * snake_case project:
   *   { pattern: /(?:def|class)\s+[a-z]+[A-Z]/, severity: 'LOW', message: 'camelCase detected — snake_case is expected' },
   */
  /* END GENERATE */
];

// File extensions to check
const FILE_EXTENSIONS = [
  /* GENERATE: FILE_EXTENSIONS
   * Bootstrap fills file extensions from the detected stack.
   *
   * Node.js/TypeScript: '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'
   * Python:             '.py'
   * PHP:                '.php'
   * Ruby:               '.rb'
   * Go:                 '.go'
   * Rust:               '.rs'
   * Java:               '.java', '.kt'
   * Config:             '.json', '.yaml', '.yml', '.toml', '.env'
   *
   * Example (Node.js + PHP project):
   * '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.php', '.json', '.yaml', '.yml', '.env'
   */
  /* END GENERATE */
];

// ─── GENERATE SECTION END ───

// === FIXED LOGIC (do not change) ===

function isIgnoredCommentLine(trimmedLine) {
  return (
    trimmedLine.startsWith('//') &&
    !trimmedLine.includes('TODO') &&
    !trimmedLine.includes('FIXME') &&
    !trimmedLine.includes('HACK')
  );
}

function scanLine(line, lineNumber, patterns = SECURITY_PATTERNS) {
  const trimmed = line.trim();
  if (isIgnoredCommentLine(trimmed)) return [];

  const issues = [];
  patterns.forEach(({ pattern, severity, message }) => {
    pattern.lastIndex = 0;
    if (pattern.test(line)) {
      issues.push({
        line: lineNumber,
        severity,
        message,
        code: trimmed.substring(0, 60)
      });
    }
  });

  return issues;
}

function collectIssues(content, patterns = SECURITY_PATTERNS) {
  return content
    .split('\n')
    .flatMap((line, index) => scanLine(line, index + 1, patterns));
}

/**
 * Main hook function.
 * Reads tool-input JSON from stdin, scans the file, writes a warning to stderr when needed,
 * and always writes the original input to stdout.
 */
async function main() {
  let inputData = '';

  process.stdin.on('data', chunk => {
    inputData += chunk;
  });

  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(inputData);
      const filePath = input.tool_input?.file_path || input.tool_input?.path;

      // No file_path (some other tool input) — pass through
      if (!filePath) {
        console.log(inputData);
        process.exit(0);
      }

      // .env files are always scanned (extname may be empty or wrong)
      const basename = path.basename(filePath);
      const isEnvFile = basename === '.env' || basename.startsWith('.env.');

      // If extension is not in the check list and not .env — skip
      const ext = path.extname(filePath).toLowerCase();
      if (!isEnvFile && FILE_EXTENSIONS.length > 0 && !FILE_EXTENSIONS.includes(ext)) {
        console.log(inputData);
        process.exit(0);
      }

      // If file does not exist — skip (may be newly created)
      if (!fs.existsSync(filePath)) {
        console.log(inputData);
        process.exit(0);
      }

      // Scan file contents
      const content = fs.readFileSync(filePath, 'utf8');
      const issues = collectIssues(content);

      // Write important issues to stderr
      const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
      const highIssues = issues.filter(i => i.severity === 'HIGH');
      const importantIssues = [...criticalIssues, ...highIssues];

      if (importantIssues.length > 0) {
        console.error('');
        console.error('━'.repeat(60));
        console.error('[Code Review] Security warnings detected');
        console.error(`  File: ${filePath}`);
        console.error('━'.repeat(60));

        importantIssues.slice(0, 5).forEach(issue => {
          const icon = issue.severity === 'CRITICAL' ? '[!!!]' : '[!!]';
          console.error(`  ${icon} [${issue.severity}] Line ${issue.line}: ${issue.message}`);
          console.error(`      [REDACTED]`);
        });

        if (importantIssues.length > 5) {
          console.error(`  ... and ${importantIssues.length - 5} more warnings`);
        }

        console.error('━'.repeat(60));
        console.error('');
      }

      // Show LOW severity issues as a summary only
      const lowIssues = issues.filter(i => i.severity === 'LOW');
      if (lowIssues.length > 0 && importantIssues.length === 0) {
        console.error(`[Code Review] ${filePath}: ${lowIssues.length} low-priority note`);
      }

      // Always write the original input to stdout
      console.log(inputData);
    } catch {
      // Parse error or unexpected error — skip silently
      console.log(inputData);
    }

    process.exit(0);
  });
}

if (require.main === module) main();

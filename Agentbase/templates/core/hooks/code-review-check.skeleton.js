#!/usr/bin/env node
/**
 * Code Review Hook
 * Bootstrap tarafindan uretilmistir.
 * PostToolUse (Edit|Write) — guvenlik ve kalite pattern taramasi.
 *
 * Hook davranisi:
 * - Edit veya Write tool'u calistirildiginda tetiklenir
 * - Dosya icerigi SECURITY_PATTERNS'e karsi taranir
 * - CRITICAL/HIGH issue varsa stderr'e uyari yazar
 * - Dosya uzantisi FILE_EXTENSIONS'da degilse atlar
 * - stdin'den gelen veriyi her zaman stdout'a yazar (non-blocking)
 */

const fs = require('fs');
const path = require('path');

// ─── GENERATE BOLUMU BASLANGIC ───
// Bootstrap fills this section from stack info in the manifest.
// Manuel duzenleme yapmayin — degisiklikler Bootstrap tarafindan ezilir.

// Guvenlik pattern'leri — stack'e gore genisletilir
const SECURITY_PATTERNS = [
  // --- Core patterns (her projede bulunur) ---
  { pattern: /(['"`])sk-[a-zA-Z0-9]+\1/, severity: 'CRITICAL', message: 'Hardcoded API key tespit edildi!' },
  { pattern: /(['"`])password\1\s*[:=]\s*['"`][^'"]+['"`]/, severity: 'HIGH', message: 'Hardcoded password tespit edildi!' },
  { pattern: /(['"`])(AKIA|ASIA)[A-Z0-9]{16}\1/, severity: 'CRITICAL', message: 'AWS access key tespit edildi!' },
  { pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/, severity: 'CRITICAL', message: 'Private key tespit edildi!' },
  { pattern: /console\.log\(/, severity: 'LOW', message: 'console.log tespit edildi' },
  { pattern: /TODO|FIXME|HACK/, severity: 'LOW', message: 'TODO/FIXME yorumu var' },

  /* GENERATE: SECURITY_PATTERNS
   * Bootstrap asagidaki kategorilerden tespit edilen stack'e uygun olanlari ekler:
   *
   * Node.js/Express:
   *   { pattern: /eval\s*\(/, severity: 'CRITICAL', message: 'eval() kullanimi tespit edildi!' },
   *   { pattern: /res\.send\(.*req\.(body|query|params)/, severity: 'HIGH', message: 'Dogrudan kullanici girdisi response\'a yansitiliyor (XSS riski)' },
   *
   * Prisma/SQL:
   *   { pattern: /\$queryRaw\s*`[^`]*\$\{/, severity: 'CRITICAL', message: 'Raw query\'de interpolasyon — SQL injection riski!' },
   *   { pattern: /\$executeRaw\s*`[^`]*\$\{/, severity: 'CRITICAL', message: 'Raw execute\'da interpolasyon — SQL injection riski!' },
   *
   * PHP:
   *   { pattern: /\$_(GET|POST|REQUEST)\[/, severity: 'HIGH', message: 'Raw superglobal kullanimi — sanitize edilmeli' },
   *   { pattern: /mysql_query\s*\(/, severity: 'CRITICAL', message: 'Deprecated mysql_query — PDO veya prepared statement kullanin' },
   *
   * React/React Native:
   *   { pattern: /dangerouslySetInnerHTML/, severity: 'HIGH', message: 'dangerouslySetInnerHTML kullanimi — XSS riski' },
   *
   * Django/Python:
   *   { pattern: /\.raw\s*\([^)]*%/, severity: 'CRITICAL', message: 'Raw SQL\'de string formatting — SQL injection riski!' },
   *   { pattern: /mark_safe\s*\(/, severity: 'HIGH', message: 'mark_safe kullanimi — XSS riski' },
   *
   * General:
   *   { pattern: /process\.env\.\w+/, severity: 'LOW', message: 'Dogrudan process.env erisimi — config modulu kullanilmali mi?' },
   */
  /* END GENERATE */
];

// Naming-convention check patterns
const NAMING_PATTERNS = [
  /* GENERATE: NAMING_PATTERNS
   * Bootstrap manifest.conventions.naming alanina gore isimlendirme kontrolu ekler.
   *
   * camelCase projesi:
   *   { pattern: /(?:const|let|var)\s+[a-z]+_[a-z]+/, severity: 'LOW', message: 'snake_case degisken — camelCase bekleniyor' },
   *   { pattern: /function\s+[a-z]+_[a-z]+/, severity: 'LOW', message: 'snake_case fonksiyon — camelCase bekleniyor' },
   *
   * snake_case projesi:
   *   { pattern: /(?:def|class)\s+[a-z]+[A-Z]/, severity: 'LOW', message: 'camelCase tespit edildi — snake_case bekleniyor' },
   */
  /* END GENERATE */
];

// File extensions to check
const FILE_EXTENSIONS = [
  /* GENERATE: FILE_EXTENSIONS
   * Bootstrap tespit edilen stack'e gore dosya uzantilarini doldurur.
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
   * Ornek (Node.js + PHP projesi):
   * '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.php', '.json', '.yaml', '.yml', '.env'
   */
  /* END GENERATE */
];

// ─── GENERATE BOLUMU BITIS ───

// === FIXED LOGIC (degismez) ===

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
 * Ana hook fonksiyonu.
 * stdin'den tool input JSON'u okur, dosyayi tarar, uyari varsa stderr'e yazar,
 * her durumda orijinal input'u stdout'a yazar.
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

      // file_path yoksa (baska bir tool input'u) — gecir
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

      // Onemli issue'lari stderr'e yaz
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
          console.error(`  ${icon} [${issue.severity}] Satir ${issue.line}: ${issue.message}`);
          console.error(`      [REDACTED]`);
        });

        if (importantIssues.length > 5) {
          console.error(`  ... and ${importantIssues.length - 5} more warnings`);
        }

        console.error('━'.repeat(60));
        console.error('');
      }

      // LOW severity issue'lari sadece ozet olarak goster
      const lowIssues = issues.filter(i => i.severity === 'LOW');
      if (lowIssues.length > 0 && importantIssues.length === 0) {
        console.error(`[Code Review] ${filePath}: ${lowIssues.length} dusuk oncelikli not`);
      }

      // Her zaman orijinal input'u stdout'a yaz
      console.log(inputData);
    } catch {
      // Parse error or unexpected error — skip silently
      console.log(inputData);
    }

    process.exit(0);
  });
}

if (require.main === module) main();

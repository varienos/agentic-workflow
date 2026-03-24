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
// Bootstrap bu bolumu manifest'teki stack bilgisine gore doldurur.
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

// Kontrol edilecek dosya uzantilari
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

      // .env dosyalari her zaman taranir (extname bos veya yanlis doner)
      const basename = path.basename(filePath);
      const isEnvFile = basename === '.env' || basename.startsWith('.env.');

      // Dosya uzantisi kontrol listesinde degilse ve .env degilse — gecir
      const ext = path.extname(filePath).toLowerCase();
      if (!isEnvFile && FILE_EXTENSIONS.length > 0 && !FILE_EXTENSIONS.includes(ext)) {
        console.log(inputData);
        process.exit(0);
      }

      // Dosya mevcut degilse — gecir (yeni olusturulacak olabilir)
      if (!fs.existsSync(filePath)) {
        console.log(inputData);
        process.exit(0);
      }

      // Dosya icerigini tara
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const issues = [];

      lines.forEach((line, index) => {
        // Yorum satirlarini atla (basit heuristic)
        const trimmed = line.trim();
        if (trimmed.startsWith('//') && !trimmed.includes('TODO') && !trimmed.includes('FIXME') && !trimmed.includes('HACK')) {
          return;
        }

        SECURITY_PATTERNS.forEach(({ pattern, severity, message }) => {
          if (pattern.test(line)) {
            issues.push({
              line: index + 1,
              severity,
              message,
              code: line.trim().substring(0, 60)
            });
          }
        });
      });

      // Onemli issue'lari stderr'e yaz
      const criticalIssues = issues.filter(i => i.severity === 'CRITICAL');
      const highIssues = issues.filter(i => i.severity === 'HIGH');
      const importantIssues = [...criticalIssues, ...highIssues];

      if (importantIssues.length > 0) {
        console.error('');
        console.error('━'.repeat(60));
        console.error('[Code Review] Guvenlik uyarilari tespit edildi');
        console.error(`  Dosya: ${filePath}`);
        console.error('━'.repeat(60));

        importantIssues.slice(0, 5).forEach(issue => {
          const icon = issue.severity === 'CRITICAL' ? '[!!!]' : '[!!]';
          console.error(`  ${icon} [${issue.severity}] Satir ${issue.line}: ${issue.message}`);
          console.error(`      ${issue.code}`);
        });

        if (importantIssues.length > 5) {
          console.error(`  ... ve ${importantIssues.length - 5} uyari daha`);
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
      // Parse hatasi veya beklenmedik hata — sessizce gecir
      console.log(inputData);
    }

    process.exit(0);
  });
}

if (require.main === module) main();

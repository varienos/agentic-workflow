#!/usr/bin/env node

/**
 * destructive-migration-check.js
 * PostToolUse (Bash) hook
 *
 * `prisma migrate dev` calistirildiktan sonra:
 * 1. En son migration dizinini bulur
 * 2. migration.sql icinde yikici degisiklikleri tarar
 * 3. Bulunursa ciddiyet seviyesine gore uyari verir
 */

const path = require('path');
const fs = require('fs');

const CODEBASE_ROOT = path.resolve(__dirname, '../../../Codebase');

/**
 * Yikici SQL ifadeleri ve ciddiyet seviyeleri
 */
const DESTRUCTIVE_PATTERNS = [
  { pattern: /DROP\s+TABLE/gi, label: 'DROP TABLE', severity: 'KRITIK' },
  { pattern: /DROP\s+COLUMN/gi, label: 'DROP COLUMN', severity: 'YUKSEK' },
  { pattern: /ALTER\s+COLUMN/gi, label: 'ALTER COLUMN', severity: 'ORTA' },
  { pattern: /MODIFY\s+COLUMN/gi, label: 'MODIFY COLUMN', severity: 'ORTA' },
  { pattern: /RENAME\s+COLUMN/gi, label: 'RENAME COLUMN', severity: 'ORTA' },
  { pattern: /DROP\s+INDEX/gi, label: 'DROP INDEX', severity: 'ORTA' },
];

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

/**
 * Codebase icinde prisma/migrations dizinini arar.
 */
function findMigrationsDir() {
  const candidates = [
    path.join(CODEBASE_ROOT, 'prisma', 'migrations'),
  ];

  // Alt dizinlerde ara
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
      // Erisilemezse gec
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
 * En son migration dizinini bulur (tarih sirasina gore).
 * Prisma migration dizinleri YYYYMMDDHHMMSS_name formatindadir.
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
 * SQL iceriginde yikici pattern'leri tarar.
 */
function scanForDestructiveChanges(sql) {
  const findings = [];

  for (const { pattern, label, severity } of DESTRUCTIVE_PATTERNS) {
    const matches = sql.match(pattern);
    if (matches && matches.length > 0) {
      // Eslesen satiri bul
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
        lines: matchingLines.slice(0, 5) // En fazla 5 satir goster
      });
    }
  }

  return findings;
}

function severityEmoji(severity) {
  switch (severity) {
    case 'KRITIK': return '🔴';
    case 'YUKSEK': return '🟠';
    case 'ORTA': return '🟡';
    default: return '⚪';
  }
}

async function main() {
  try {
    const input = await readStdin();
    const parsed = JSON.parse(input);

    const command = parsed?.tool_input?.command || '';

    // Sadece prisma migrate dev komutu sonrasinda calis
    if (!/prisma\s+migrate\s+dev/i.test(command)) {
      return;
    }

    const migrationsDir = findMigrationsDir();
    if (!migrationsDir) return;

    const latest = findLatestMigration(migrationsDir);
    if (!latest) return;

    const findings = scanForDestructiveChanges(latest.sql);
    if (findings.length === 0) return;

    // Ciddiyet siralama: KRITIK > YUKSEK > ORTA
    const severityOrder = { 'KRITIK': 0, 'YUKSEK': 1, 'ORTA': 2 };
    findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    const maxSeverity = findings[0].severity;

    let message = `⚠️ **YIKICI MIGRATION TESPIT EDILDI**\n\n`;
    message += `**Migration:** \`${latest.name}\`\n`;
    message += `**En Yuksek Ciddiyet:** ${severityEmoji(maxSeverity)} ${maxSeverity}\n\n`;
    message += `### Tespit Edilen Degisiklikler\n\n`;
    message += `| Ciddiyet | Islem | Adet | Ornekler |\n`;
    message += `|---|---|---|---|\n`;

    for (const finding of findings) {
      const examples = finding.lines
        .map(l => `\`${l.line}\``)
        .join(', ');
      message += `| ${severityEmoji(finding.severity)} ${finding.severity} | ${finding.label} | ${finding.count} | ${examples} |\n`;
    }

    message += `\n### Onerilen Aksiyonlar\n\n`;

    if (maxSeverity === 'KRITIK') {
      message += `1. **DURMA** — Bu migration veri kaybina yol acabilir.\n`;
      message += `2. Etkilenen tablolardaki verilerin yedegininin alindigini dogrula.\n`;
      message += `3. Eger kasitli degilse migration'i geri al: \`npx prisma migrate reset\` (DIKKAT: tum veritabanini sifirlar)\n`;
      message += `4. Kasitli ise kullanicidan onay al.\n`;
    } else if (maxSeverity === 'YUKSEK') {
      message += `1. Silinen kolon(lar)daki verilerin baska bir yerde korunup korunmadigini kontrol et.\n`;
      message += `2. Uygulama kodunun bu kolon(lar)a referans vermediginden emin ol.\n`;
      message += `3. Production'da bu migration'i uygulamadan once veri yedegi al.\n`;
    } else {
      message += `1. Degisikliklerin mevcut veriyle uyumlu oldugunu kontrol et.\n`;
      message += `2. Kolon tip degisiklikleri veri truncation'ina yol acabilir — mevcut veriyi dogrula.\n`;
    }

    const result = {
      systemMessage: message
    };
    process.stdout.write(JSON.stringify(result));
  } catch (e) {
    // Hook hatalari sessizce yutulur
  }
}

main();

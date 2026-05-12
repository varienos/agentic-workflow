#!/usr/bin/env node

/**
 * eloquent-migration-check.js
 * PostToolUse (Edit|Write) hook
 *
 * Laravel migration dosyasi duzenlendiginde:
 * 1. Yikici operasyonlari tarar (dropColumn, dropTable, renameColumn vb.)
 * 2. Ciddiyet seviyesine gore uyari verir
 * 3. `php artisan migrate` calistirmayi hatirlatir
 */

const path = require('path');
const fs = require('fs');

const { readStdin, resolveCodebaseRoot } = require(path.join(__dirname, 'shared-hook-utils.js'));

const CODEBASE_ROOT = resolveCodebaseRoot(__dirname, '../Codebase');

/**
 * Laravel migration dosyasindaki yikici PHP ifadeleri ve ciddiyet seviyeleri
 */
const DESTRUCTIVE_PATTERNS = [
  { pattern: /Schema::drop\s*\(/g, label: 'Schema::drop()', severity: 'KRITIK' },
  { pattern: /Schema::dropIfExists\s*\(/g, label: 'Schema::dropIfExists()', severity: 'KRITIK' },
  { pattern: /->dropColumn\s*\(/g, label: '$table->dropColumn()', severity: 'YUKSEK' },
  { pattern: /->dropMorphs\s*\(/g, label: '$table->dropMorphs()', severity: 'YUKSEK' },
  { pattern: /->dropRememberToken\s*\(/g, label: '$table->dropRememberToken()', severity: 'ORTA' },
  { pattern: /->dropSoftDeletes\s*\(/g, label: '$table->dropSoftDeletes()', severity: 'YUKSEK' },
  { pattern: /->dropTimestamps\s*\(/g, label: '$table->dropTimestamps()', severity: 'ORTA' },
  { pattern: /->dropForeign\s*\(/g, label: '$table->dropForeign()', severity: 'ORTA' },
  { pattern: /->dropIndex\s*\(/g, label: '$table->dropIndex()', severity: 'ORTA' },
  { pattern: /->dropPrimary\s*\(/g, label: '$table->dropPrimary()', severity: 'YUKSEK' },
  { pattern: /->dropUnique\s*\(/g, label: '$table->dropUnique()', severity: 'ORTA' },
  { pattern: /Schema::rename\s*\(/g, label: 'Schema::rename()', severity: 'YUKSEK' },
  { pattern: /->renameColumn\s*\(/g, label: '$table->renameColumn()', severity: 'YUKSEK' },
];

/**
 * Dosyanin Laravel migration dosyasi olup olmadigini kontrol eder.
 * Genellikle database/migrations/ altinda ve YYYY_MM_DD_HHMMSS_ prefix'i ile baslar.
 */
function isLaravelMigration(filePath) {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\/g, '/');
  return /database\/migrations\/\d{4}_\d{2}_\d{2}_\d{6}_.*\.php$/i.test(normalized)
    || /migrations\/\d{4}_\d{2}_\d{2}_\d{6}_.*\.php$/i.test(normalized);
}

/**
 * PHP migration iceriginde yikici pattern'leri tarar.
 */
function scanForDestructiveChanges(content) {
  const findings = [];

  for (const { pattern, label, severity } of DESTRUCTIVE_PATTERNS) {
    // Reset regex lastIndex
    pattern.lastIndex = 0;
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      // Eslesen satirlari bul
      const lines = content.split('\n');
      // Pattern'i her satir icin yeni olustur (lastIndex reset)
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
    case 'KRITIK': return '\ud83d\udd34';
    case 'YUKSEK': return '\ud83d\udfe0';
    case 'ORTA': return '\ud83d\udfe1';
    default: return '\u26aa';
  }
}

async function main() {
  try {
    const input = await readStdin();
    const parsed = JSON.parse(input);

    const filePath = parsed?.tool_input?.file_path || parsed?.tool_input?.path || '';

    // Laravel migration dosyasi mi kontrol et
    if (!isLaravelMigration(filePath)) return;

    // Dosya icerigini oku
    let content = '';
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      return;
    }

    const findings = scanForDestructiveChanges(content);
    const messages = [];

    if (findings.length > 0) {
      // Ciddiyet siralama: KRITIK > YUKSEK > ORTA
      const severityOrder = { 'KRITIK': 0, 'YUKSEK': 1, 'ORTA': 2 };
      findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      const maxSeverity = findings[0].severity;

      let message = `\u26a0\ufe0f **YIKICI MIGRATION TESPIT EDILDI**\n\n`;
      message += `**Dosya:** \`${path.basename(filePath)}\`\n`;
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
        message += `1. **DURMA** \u2014 Bu migration veri kaybina yol acabilir.\n`;
        message += `2. Etkilenen tablolardaki verilerin yedegininin alindigini dogrula.\n`;
        message += `3. Kasitli ise kullanicidan onay al.\n`;
      } else if (maxSeverity === 'YUKSEK') {
        message += `1. Silinen kolon/constraint'lerin baska yerde korunup korunmadigini kontrol et.\n`;
        message += `2. Uygulama kodunun bu elemanlara referans vermediginden emin ol.\n`;
        message += `3. Production'da bu migration'i uygulamadan once veri yedegi al.\n`;
      } else {
        message += `1. Degisikliklerin mevcut veriyle uyumlu oldugunu kontrol et.\n`;
        message += `2. Index/constraint degisiklikleri performansi etkileyebilir.\n`;
      }

      messages.push(message);
    }

    // Her durumda migration sonrasi hatirlatma
    messages.push(
      `\ud83d\udca1 **Hatirlatma:** Migration dosyasi duzenlendikten sonra \`php artisan migrate\` calistirmayi unutmayin.\n` +
      `Migration durumunu kontrol etmek icin: \`php artisan migrate:status\``
    );

    if (messages.length > 0) {
      const result = {
        systemMessage: '\ud83d\udd0d **Eloquent Migration Kontrolu**\n\n' + messages.join('\n\n---\n\n')
      };
      process.stdout.write(JSON.stringify(result));
    }
  } catch (e) {
    // Hook hatalari sessizce yutulur
  }
}

if (require.main === module) main();

#!/usr/bin/env node

/**
 * auto-format.skeleton.js
 * PostToolUse (Edit|Write) hook
 *
 * Dosya duzenlendikten sonra otomatik formatlama uygular.
 * - Akilli tirnak duzeltme (curly → straight quotes)
 * - Alt projeye gore formatter tespit
 * - Formatter calistirma (prettier, biome, vb.)
 *
 * GENERATE bolumleri Bootstrap tarafindan doldurulur.
 */

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

// Symlink li kurulumda gercek yolu cozer (startsWith icin gerekli)
const CODEBASE_ROOT = (() => { const p = path.resolve(__dirname, '../../../Codebase'); try { return fs.realpathSync(p); } catch { return p; } })();

// ─── GENERATE BOLUMU BASLANGIC ───

/* GENERATE: SUBPROJECT_CONFIGS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.subprojects, project.formatters
Ornek cikti: */
const SUBPROJECT_CONFIGS = [
  // { path: 'apps/api', configFile: '.prettierrc', formatter: 'prettier' },
  // { path: 'apps/web', configFile: '.prettierrc', formatter: 'prettier' },
  // { path: 'apps/mobile', configFile: '.prettierrc', formatter: 'prettier' },
  // { path: 'packages/shared', configFile: '.prettierrc', formatter: 'prettier' },
];
/* END GENERATE */

/* GENERATE: CODE_EXTENSIONS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: stack.primary, stack.file_extensions
Ornek cikti: */
const CODE_EXTENSIONS = [
  // '.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.html', '.md'
];
/* END GENERATE */

// ─── GENERATE BOLUMU BITIS ───

/**
 * Curly (akilli) tirnaklari straight tirnaklara cevirir.
 * Word, Google Docs vb. kaynaklardan kopyalanan metinlerde olusur.
 */
function fixSmartQuotes(content) {
  return content
    .replace(/[\u2018\u2019]/g, "'")  // ' ' → '
    .replace(/[\u201C\u201D]/g, '"')  // " " → "
    .replace(/\u2013/g, '-')           // – → -
    .replace(/\u2014/g, '--')          // — → --
    .replace(/\u2026/g, '...')         // … → ...
    .replace(/\u00A0/g, ' ');          // non-breaking space → normal space
}

/**
 * Dosyanin hangi alt projeye ait oldugunu tespit eder.
 */
function detectSubproject(filePath) {
  const relativePath = path.relative(CODEBASE_ROOT, filePath);

  for (const config of SUBPROJECT_CONFIGS) {
    if (relativePath.startsWith(config.path)) {
      return config;
    }
  }

  return null;
}

/**
 * Dosya uzantisinin formatlanabilir olup olmadigini kontrol eder.
 */
function isFormattableFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS.includes(ext);
}

/**
 * Formatter config dosyasini bulur.
 * Once alt proje dizininde, sonra kok dizinde arar.
 */
function findFormatterConfig(subproject) {
  if (!subproject || !subproject.configFile) return null;

  // Alt proje dizininde ara
  const subprojectConfig = path.join(CODEBASE_ROOT, subproject.path, subproject.configFile);
  if (fs.existsSync(subprojectConfig)) {
    return subprojectConfig;
  }

  // Kok dizinde ara
  const rootConfig = path.join(CODEBASE_ROOT, subproject.configFile);
  if (fs.existsSync(rootConfig)) {
    return rootConfig;
  }

  return null;
}

/**
 * Dosyayi formatter ile formatlar.
 */
function runFormatter(filePath, subproject) {
  if (!subproject) return;

  const configPath = findFormatterConfig(subproject);
  const cwd = path.join(CODEBASE_ROOT, subproject.path);

  try {
    let args;

    switch (subproject.formatter) {
      case 'prettier':
        args = configPath
          ? ['prettier', '--write', '--config', configPath, filePath]
          : ['prettier', '--write', filePath];
        break;

      case 'biome':
        args = configPath
          ? ['biome', 'format', '--write', '--config-path', path.dirname(configPath), filePath]
          : ['biome', 'format', '--write', filePath];
        break;

      default:
        // Bilinmeyen formatter, sessizce gec
        return;
    }

    execFileSync('npx', args, {
      cwd: fs.existsSync(cwd) ? cwd : CODEBASE_ROOT,
      timeout: 15000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch {
    // Formatlama hatasi sessizce yutulur — workflow'u bloklamamali
  }
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

async function main() {
  try {
    const input = await readStdin();
    const parsed = JSON.parse(input);

    const filePath = parsed?.tool_input?.file_path || parsed?.tool_input?.path || '';

    // Dosya codebase icinde mi?
    if (!filePath.startsWith(CODEBASE_ROOT)) return;

    // Dosya formatlanabilir mi?
    if (!isFormattableFile(filePath)) return;

    // Dosya mevcut mu?
    if (!fs.existsSync(filePath)) return;

    // 1. Akilli tirnak duzeltme
    let content = fs.readFileSync(filePath, 'utf8');
    const fixedContent = fixSmartQuotes(content);

    if (fixedContent !== content) {
      fs.writeFileSync(filePath, fixedContent, 'utf8');
    }

    // 2. Alt proje tespiti ve formatlama
    const subproject = detectSubproject(filePath);
    if (subproject) {
      runFormatter(filePath, subproject);
    }

    // Sessiz basari — cikti uretme
  } catch {
    // Hook hatalari sessizce yutulur
  }
}

main();

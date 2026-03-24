#!/usr/bin/env node

/**
 * openapi-sync-check.skeleton.js
 * PostToolUse (Edit|Write) hook
 *
 * Route/controller dosyasi duzenlendikten sonra OpenAPI spec dosyasinin
 * guncel olup olmadigini kontrol eder. Eger route dosyasi degismisse
 * ve spec dosyasi daha eski ise stderr uzerinden hatirlatma mesaji verir.
 *
 * GENERATE bolumleri Bootstrap tarafindan doldurulur.
 */

const path = require('path');
const fs = require('fs');

// Symlink li kurulumda gercek yolu cozer (startsWith icin gerekli)
const CODEBASE_ROOT = (() => { const p = path.resolve(__dirname, '../../../Codebase'); try { return fs.realpathSync(p); } catch { return p; } })();

// ─── GENERATE BOLUMU BASLANGIC ───

/* GENERATE: ROUTE_PATTERNS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.structure, stack.primary, stack.framework
Ornek cikti: */
const ROUTE_PATTERNS = [
  // /controllers\//,
  // /routes\//,
  // /\.controller\.(ts|js)$/,
  // /\.routes?\.(ts|js)$/,
  // /views\.py$/,
  // /urls\.py$/,
];
/* END GENERATE */

/* GENERATE: SPEC_PATHS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.structure, project.api_docs
Ornek cikti: */
const SPEC_PATHS = [
  // 'openapi.yaml',
  // 'docs/openapi.yaml',
  // 'swagger.json',
];
/* END GENERATE */

// ─── GENERATE BOLUMU BITIS ───

/**
 * Dosyanin route/controller dosyasi olup olmadigini kontrol eder.
 */
function isRouteFile(filePath) {
  const relativePath = path.relative(CODEBASE_ROOT, filePath);

  for (const pattern of ROUTE_PATTERNS) {
    if (pattern.test(relativePath)) {
      return true;
    }
  }

  return false;
}

/**
 * Spec dosyasinin mtime degerini dondurur.
 * Dosya bulunamazsa null dondurur.
 */
function getSpecMtime(specRelPath) {
  const fullPath = path.join(CODEBASE_ROOT, specRelPath);

  if (fs.existsSync(fullPath)) {
    return fs.statSync(fullPath).mtime;
  }

  return null;
}

/**
 * Route dosyasinin mtime degerini dondurur.
 */
function getFileMtime(filePath) {
  if (fs.existsSync(filePath)) {
    return fs.statSync(filePath).mtime;
  }

  return null;
}

/**
 * Spec dosyasinin route dosyasindan eski olup olmadigini kontrol eder.
 * Herhangi bir spec dosyasi route'tan eski ise uyari verir.
 */
function checkSpecStaleness(routeFilePath) {
  const routeMtime = getFileMtime(routeFilePath);
  if (!routeMtime) return;

  const staleSpecs = [];

  for (const specRelPath of SPEC_PATHS) {
    const specMtime = getSpecMtime(specRelPath);

    if (specMtime === null) {
      // Spec dosyasi bulunamadi — bu da bir sorun olabilir
      staleSpecs.push(`${specRelPath} (dosya bulunamadi)`);
    } else if (specMtime < routeMtime) {
      // Spec dosyasi route dosyasindan eski
      staleSpecs.push(specRelPath);
    }
  }

  if (staleSpecs.length > 0) {
    const relativePath = path.relative(CODEBASE_ROOT, routeFilePath);
    process.stderr.write(
      `\n⚠️  OpenAPI Spec Hatirlatmasi: "${relativePath}" dosyasi degistirildi.\n` +
      `   Asagidaki spec dosyalari guncel olmayabilir:\n` +
      staleSpecs.map(s => `   - ${s}`).join('\n') + '\n' +
      `   Lutfen API spec dosyasini endpoint degisikliklerine gore guncelleyin.\n\n`
    );
  }
}

/**
 * stdin'den veri okur.
 */
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

    // Orijinal girdiyi stdout'a yaz (non-blocking, pipeline'i bloklama)
    process.stdout.write(input);

    const parsed = JSON.parse(input);
    const filePath = parsed?.tool_input?.file_path || parsed?.tool_input?.path || '';

    // Dosya codebase icinde mi?
    if (!filePath.startsWith(CODEBASE_ROOT)) return;

    // Route/controller dosyasi mi?
    if (!isRouteFile(filePath)) return;

    // Spec dosyalarinin guncelligini kontrol et
    checkSpecStaleness(filePath);
  } catch {
    // Hook hatalari sessizce yutulur — workflow'u bloklamamali
  }
}

if (require.main === module) main();

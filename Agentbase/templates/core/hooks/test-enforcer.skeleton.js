#!/usr/bin/env node
/**
 * Test Enforcer Hook
 * Bootstrap tarafindan uretilmistir.
 * PostToolUse (Edit|Write) — kaynak dosya icin test zorlama talimati.
 *
 * Hook davranisi:
 * - Edit veya Write tool'u calistirildiginda tetiklenir
 * - Dosyanin test dosyasi olup olmadigini kontrol eder (test dosyasi ise atla)
 * - Kaynak dosyayi test eslestirme tablosuna karsi esler
 * - Test dosyasi YOKSA: systemMessage ile "TEST EKSIK" talimati verir
 * - Test dosyasi VARSA: systemMessage ile "Test guncelle" talimati verir
 * - Debounce: ayni dosya icin 5 dakika icinde tekrar talimat vermez
 * - stdin'den gelen veriyi her zaman stdout'a yazar (non-blocking)
 */

const fs = require('fs');
const path = require('path');

// ─── GENERATE BOLUMU BASLANGIC ───

// Katman-test eslesmesi — kaynak dosya hangi katmana ait?
const LAYER_TESTS = [
  /* GENERATE: LAYER_TESTS
   * Bootstrap manifest.project.subprojects[] ve manifest.stack.test_commands bilgilerini
   * kullanarak her katman icin bir test eslesmesi uretir.
   *
   * Ornek:
   * { pattern: /api\/src\//, layer: 'API', command: 'cd ../Codebase/api && npm test', extra: null },
   */
  /* END GENERATE */
];

// Kaynak → test dosyasi eslestirme tablosu
const TEST_FILE_MAPPING = [
  /* GENERATE: TEST_FILE_MAPPING
   * Bootstrap manifest'teki stack bilgisine gore kaynak-test eslestirme
   * pattern'leri uretir. Her entry icin:
   *   sourcePattern: kaynak dosya yolunu eslestiren regex (capture group ile)
   *   testPath:      test dosyasi yolu ($1 = dosya adi, $2 = uzanti)
   *   framework:     test framework adi (jest, vitest, pytest, phpunit, vb.)
   *
   * Ornek (Node.js/TypeScript):
   * { sourcePattern: /(.+)\/(controllers|services|utils|middleware)\/(.+)\.(ts|js)$/, testPath: '$1/__tests__/$2/$3.test.$4', framework: 'jest' },
   *
   * Ornek (Python/Django):
   * { sourcePattern: /(.+)\/(views|models|serializers)\/(.+)\.py$/, testPath: '$1/tests/test_$3.py', framework: 'pytest' },
   */
  /* END GENERATE */
];

// Kontrol edilecek kod dosya uzantilari
const CODE_EXTENSIONS = [
  /* GENERATE: CODE_EXTENSIONS
   * Bootstrap tespit edilen stack'e gore kod dosya uzantilarini doldurur.
   * Ornek: '.ts', '.tsx', '.js', '.jsx', '.py', '.php'
   */
  /* END GENERATE */
];

// ─── GENERATE BOLUMU BITIS ───

// === KONFIGÜRASYON ===

const DEBOUNCE_MS = 5 * 60 * 1000; // 5 dakika — ayni dosya icin tekrar talimat verme
const STATE_FILE = path.join(__dirname, '.test-enforcer-state.json');

// Test dosyasi pattern'leri — bu dosyalar icin talimat VERME
const TEST_FILE_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /\/__tests__\//,
  /\/tests?\//,
  /test_[^/]+\.py$/,
  /Test\.php$/,
  /_test\.go$/,
  /_test\.rs$/,
];

// === STATE YONETIMI ===

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      // 1 saatten eski state'i temizle
      if (data.timestamp && (Date.now() - data.timestamp) > 60 * 60 * 1000) {
        return { timestamp: Date.now(), files: {} };
      }
      return data;
    }
  } catch {
    // Okunamazsa sifir state
  }
  return { timestamp: Date.now(), files: {} };
}

function saveState(state) {
  try {
    state.timestamp = Date.now();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch {
    // Yazilamazsa sessizce devam et
  }
}

// === YARDIMCI FONKSIYONLAR ===

/**
 * Dosya bir test dosyasi mi?
 */
function isTestFile(filePath) {
  return TEST_FILE_PATTERNS.some(p => p.test(filePath));
}

/**
 * Dosya uzantisi kod dosyasi mi?
 */
function isCodeFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  if (CODE_EXTENSIONS.length === 0) return true;
  const ext = path.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS.includes(ext);
}

/**
 * Dosya yolunu katman pattern'lerine karsi esle
 */
function detectLayer(filePath) {
  for (const entry of LAYER_TESTS) {
    if (entry.pattern && entry.pattern.test(filePath)) {
      return entry;
    }
  }
  return null;
}

/**
 * Kaynak dosya icin beklenen test dosyasi yolunu hesapla
 */
function resolveTestPath(filePath) {
  for (const mapping of TEST_FILE_MAPPING) {
    if (mapping.sourcePattern && mapping.sourcePattern.test(filePath)) {
      return {
        testPath: filePath.replace(mapping.sourcePattern, mapping.testPath),
        framework: mapping.framework || 'unknown',
      };
    }
  }
  return null;
}

/**
 * Debounce kontrolu — ayni dosya icin son 5 dakikada talimat verilmis mi?
 */
function isOnDebounce(filePath, state) {
  const lastTime = state.files[filePath];
  if (!lastTime) return false;
  return (Date.now() - lastTime) < DEBOUNCE_MS;
}

// === ANA HOOK ===

async function main() {
  let inputData = '';

  process.stdin.on('data', chunk => {
    inputData += chunk;
  });

  process.stdin.on('end', () => {
    if (!inputData || inputData.trim() === '') {
      process.exit(0);
    }

    let input;
    try {
      input = JSON.parse(inputData);
    } catch {
      process.stdout.write(inputData);
      process.exit(0);
    }

    const filePath = input?.tool_input?.file_path || input?.tool_input?.path;

    // file_path yoksa — gecir
    if (!filePath || typeof filePath !== 'string') {
      process.stdout.write(inputData);
      process.exit(0);
    }

    // Kod dosyasi degilse — gecir
    if (!isCodeFile(filePath)) {
      process.stdout.write(inputData);
      process.exit(0);
    }

    // Test dosyasi ise — gecir (test dosyasi icin test yazma talimati verme)
    if (isTestFile(filePath)) {
      process.stdout.write(inputData);
      process.exit(0);
    }

    // Debounce kontrolu
    const state = loadState();
    if (isOnDebounce(filePath, state)) {
      process.stdout.write(inputData);
      process.exit(0);
    }

    // Katman tespiti
    const layer = detectLayer(filePath);

    // Test dosyasi eslestirme
    const testInfo = resolveTestPath(filePath);
    if (!testInfo) {
      // Eslestirme bulunamadi — sadece katman bazli genel hatirlatma
      if (layer) {
        state.files[filePath] = Date.now();
        saveState(state);

        const output = JSON.stringify({
          systemMessage: `${layer.layer} katmaninda kaynak dosya duzenlendi: ${path.basename(filePath)}. Uygun bir noktada testleri calistir: ${layer.command}`,
        });
        process.stdout.write(output);
        process.exit(0);
      }

      process.stdout.write(inputData);
      process.exit(0);
    }

    // Test dosyasi var mi kontrol et
    const testExists = fs.existsSync(testInfo.testPath);

    state.files[filePath] = Date.now();
    saveState(state);

    let message;
    if (!testExists) {
      message = `TEST EKSIK — ${path.basename(filePath)} icin test dosyasi bulunamadi.\n` +
        `  Beklenen konum: ${testInfo.testPath}\n` +
        `  Bu dosya olusturulmali ve temel senaryolar yazilmali.\n` +
        `  Test framework: ${testInfo.framework}`;
    } else {
      message = `Test guncelle — ${path.basename(filePath)} duzenlendi.\n` +
        `  Test dosyasi: ${testInfo.testPath}\n` +
        `  Davranis degistiyse yeni test case ekle, mevcut case'leri guncelle.`;
    }

    if (layer) {
      message += `\n  Test komutu: ${layer.command}`;
    }

    const output = JSON.stringify({ systemMessage: message });
    process.stdout.write(output);
    process.exit(0);
  });
}

if (require.main === module) main();

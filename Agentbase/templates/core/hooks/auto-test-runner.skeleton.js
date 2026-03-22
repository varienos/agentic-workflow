#!/usr/bin/env node
/**
 * Auto Test Runner Hook
 * Bootstrap tarafindan uretilmistir.
 * PostToolUse (Edit|Write) — degisen katman icin test calistirma sinyali.
 *
 * Hook davranisi:
 * - Edit veya Write tool'u calistirildiginda tetiklenir
 * - Degisen dosyanin katmanini tespit eder (LAYER_TESTS)
 * - Debounce mantigi: ayni katman icin son 3 dakika icinde sinyal verilmisse ATLA
 * - Edit sayaci: ayni katmanda 3+ edit sonrasi sinyal guclendirilir
 * - Non-blocking: systemMessage ile sinyal verir, process BASLATMAZ
 * - stdin'den gelen veriyi her zaman stdout'a yazar
 *
 * Sorumluluk ayrimi:
 * - test-enforcer.js: dosya bazli test eslestirme, eksik test dosyasi icin systemMessage talimati
 * - auto-test-runner.js: edit birikimini takip eder, debounce ile akilli sinyal uretir
 * - Final verification (Step 5): task tamamlamadan once ZORUNLU test calistirma
 */

const fs = require('fs');
const path = require('path');

// ─── GENERATE BOLUMU BASLANGIC ───
// Bootstrap bu bolumu manifest'teki subproject ve test bilgilerine gore doldurur.
// Manuel duzenleme yapmayin — degisiklikler Bootstrap tarafindan ezilir.

// Katman-test eslesmesi — her subproject icin bir entry
const LAYER_TESTS = [
  /* GENERATE: LAYER_TESTS
   * Bootstrap manifest.project.subprojects[] ve manifest.stack.test_commands bilgilerini
   * kullanarak her katman icin bir test eslesmesi uretir.
   *
   * Ornek:
   * { pattern: /api\/src\//, layer: 'API', command: 'cd ../Codebase/api && npm test', extra: null },
   * { pattern: /mobile\/src\//, layer: 'Mobile', command: 'cd ../Codebase/mobile && npm test', extra: null },
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

const DEBOUNCE_MS = 3 * 60 * 1000;       // 3 dakika — ayni katman icin tekrar sinyal verme
const EDIT_THRESHOLD = 3;                 // 3+ edit sonrasi sinyal guclendir
const STATE_FILE = path.join(__dirname, '.auto-test-state.json');

// === STATE YONETIMI ===

/**
 * State'i diskten yukle
 * State formati: { layers: { [layerName]: { editCount, lastSignal, lastEdit } } }
 */
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      // 1 saatten eski state'i temizle
      if (data.timestamp && (Date.now() - data.timestamp) > 60 * 60 * 1000) {
        return { timestamp: Date.now(), layers: {} };
      }
      return data;
    }
  } catch {
    // Okunamazsa sifir state
  }
  return { timestamp: Date.now(), layers: {} };
}

/**
 * State'i diske kaydet
 */
function saveState(state) {
  try {
    state.timestamp = Date.now();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch {
    // Yazilamazsa sessizce devam et
  }
}

/**
 * Dosya yolunu LAYER_TESTS pattern'lerine karsi esle
 */
function detectLayer(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  for (const entry of LAYER_TESTS) {
    if (entry.pattern && entry.pattern.test(filePath)) {
      return entry;
    }
  }
  return null;
}

/**
 * Dosya uzantisi kod dosyasi mi kontrol et
 */
function isCodeFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  if (CODE_EXTENSIONS.length === 0) return true; // Config yoksa hepsini kabul et
  const ext = path.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS.includes(ext);
}

// === ANA HOOK ===

async function main() {
  let inputData = '';

  process.stdin.on('data', chunk => {
    inputData += chunk;
  });

  process.stdin.on('end', () => {
    // Edge case: bos stdin
    if (!inputData || inputData.trim() === '') {
      process.exit(0);
    }

    let input;
    try {
      input = JSON.parse(inputData);
    } catch {
      // Bozuk JSON — sessizce gecir
      process.stdout.write(inputData);
      process.exit(0);
    }

    const filePath = input?.tool_input?.file_path || input?.tool_input?.path;

    // file_path yoksa veya bos — gecir
    if (!filePath || typeof filePath !== 'string') {
      process.stdout.write(inputData);
      process.exit(0);
    }

    // Kod dosyasi degilse — gecir
    if (!isCodeFile(filePath)) {
      process.stdout.write(inputData);
      process.exit(0);
    }

    // Katman tespiti
    const layer = detectLayer(filePath);
    if (!layer) {
      // Katman eslesmiyor — sessizce skip (crash degil)
      process.stdout.write(inputData);
      process.exit(0);
    }

    // State yukle ve guncelle
    const state = loadState();
    if (!state.layers[layer.layer]) {
      state.layers[layer.layer] = { editCount: 0, lastSignal: 0, lastEdit: 0 };
    }

    const layerState = state.layers[layer.layer];
    layerState.editCount++;
    layerState.lastEdit = Date.now();

    // Debounce kontrolu: son sinyal 3 dakika icindeyse atla
    const timeSinceLastSignal = Date.now() - (layerState.lastSignal || 0);
    if (timeSinceLastSignal < DEBOUNCE_MS) {
      saveState(state);
      process.stdout.write(inputData);
      process.exit(0);
    }

    // Sinyal uret
    let message;
    if (layerState.editCount >= EDIT_THRESHOLD) {
      // Guclu sinyal: cok sayida edit birikti
      message = `${layer.layer} katmaninda ${layerState.editCount} duzenleme yapildi. Test calistirmaniz oneriliyor:\n  ${layer.command}`;
      if (layer.extra) {
        message += `\n  Not: ${layer.extra}`;
      }
    } else {
      // Normal sinyal: ilk edit'ler
      message = `${layer.layer} katmaninda degisiklik yapildi. Uygun bir noktada testleri calistirin:\n  ${layer.command}`;
    }

    // State guncelle ve kaydet
    layerState.lastSignal = Date.now();
    // Edit sayacini sifirla (sinyal verildi)
    layerState.editCount = 0;
    saveState(state);

    // systemMessage ile sinyal ver — BLOKLAMAZ
    const output = JSON.stringify({
      systemMessage: message,
    });
    process.stdout.write(output);
    process.exit(0);
  });
}

main();

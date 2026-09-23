#!/usr/bin/env node
/**
 * Team Trigger Hook
 * Bootstrap tarafindan uretilmistir.
 * PostToolUse (Edit|Write) — belirli kosullarda teammate spawn onerisi.
 *
 * Hook davranisi:
 * - Edit veya Write tool'u calistirildiginda tetiklenir
 * - Session-tracker state dosyasindan oturum bilgilerini okur
 * - 3 trigger kosulunu kontrol eder:
 *   1. Dosya sayisi esigi: 5+ farkli dosya duzenlendi
 *   2. Cross-layer degisiklik: birden fazla subproject/katmanda degisiklik
 *   3. Uzun oturum: 30+ dakika ve 50+ tool call
 * - Kosul saglaniyor ONERIR (systemMessage), BLOKLAMAZ
 * - Ayni oneri tekrar tekrar verilmez (cooldown mekanizmasi)
 * - stdin'den gelen veriyi her zaman stdout'a yazar (non-blocking)
 */

const fs = require('fs');
const path = require('path');

// ─── GENERATE BOLUMU BASLANGIC ───
// Bootstrap fills this section from subproject info in the manifest.
// Manuel duzenleme yapmayin — degisiklikler Bootstrap tarafindan ezilir.

// Subproject directory patterns — for cross-layer detection
const SUBPROJECT_PATTERNS = [
  /* GENERATE: LAYER_TESTS
   * Bootstrap manifest.project.subprojects[] bilgisini kullanarak
   * her subproject icin dizin pattern'i uretir.
   * team-trigger cross-layer tespiti icin LAYER_TESTS ile ayni
   * pattern'leri paylasiyor.
   *
   * Ornek:
   *
   * { pattern: /api\/src\//, layer: 'API' },
   * { pattern: /mobile\/src\//, layer: 'Mobile' },
   * { pattern: /web\/src\//, layer: 'Web' },
   */
  /* END GENERATE */
];

// ─── GENERATE BOLUMU BITIS ───

// === CONFIGURATION ===

const THRESHOLDS = {
  FILE_COUNT: 5,             // 5+ different files → teammate suggestion
  TOOL_CALLS: 50,            // 50+ tool call → uzun oturum
  SESSION_MINUTES: 30,       // 30+ dakika → uzun oturum
  CROSS_LAYER_MIN: 2,        // 2+ layers → cross-layer warning
};

// Cooldown: ayni tip oneri 10 dakikada bir kez
const COOLDOWN_MS = 10 * 60 * 1000;

// === STATE YONETIMI ===

const SESSIONS_DIR = path.join(__dirname, '../tracking/sessions');
const SESSION_ID = `${process.ppid}-${new Date().toISOString().slice(0, 10)}`;
const SESSION_FILE = path.join(SESSIONS_DIR, `session-${SESSION_ID}.json`);
const TRIGGER_STATE_FILE = path.join(__dirname, '.team-trigger-state.json');

/**
 * Session-tracker state dosyasini oku
 */
function readSessionState() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    }
  } catch {
    // Session state okunamazsa bos dondur
  }
  return null;
}

/**
 * Trigger cooldown state'ini oku
 */
function readTriggerState() {
  try {
    if (fs.existsSync(TRIGGER_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(TRIGGER_STATE_FILE, 'utf8'));
    }
  } catch {
    // Okunamazsa sifir state
  }
  return { lastNotified: {} };
}

/**
 * Trigger cooldown state'ini kaydet
 */
function saveTriggerState(state) {
  try {
    fs.writeFileSync(TRIGGER_STATE_FILE, JSON.stringify(state));
  } catch {
    // If it cannot be written, continue silently
  }
}

/**
 * Cooldown kontrolu — ayni tip oneri son 10 dakikada verilmis mi?
 */
function isOnCooldown(triggerType, triggerState) {
  const lastTime = triggerState.lastNotified[triggerType];
  if (!lastTime) return false;
  return (Date.now() - lastTime) < COOLDOWN_MS;
}

/**
 * Cooldown'u guncelle
 */
function markNotified(triggerType, triggerState) {
  triggerState.lastNotified[triggerType] = Date.now();
  saveTriggerState(triggerState);
}

// === TRIGGER CHECKS ===

/**
 * Trigger 1: Dosya sayisi esigi
 * 5+ farkli dosya duzenlendiyse teammate onerisi
 */
function checkFileCount(session) {
  const writtenFiles = session?.files?.written || [];
  const uniqueFiles = new Set(writtenFiles);
  if (uniqueFiles.size >= THRESHOLDS.FILE_COUNT) {
    return {
      type: 'file_count',
      message: `${uniqueFiles.size} different files were edited in this session. Complexity is rising — consider spawning teammates. You can distribute tasks in parallel with /task-conductor.`,
    };
  }
  return null;
}

/**
 * Trigger 2: Cross-layer degisiklik
 * Birden fazla subproject/katmanda degisiklik yapildiginda cross-layer review onerisi
 */
function checkCrossLayer(session) {
  const writtenFiles = session?.files?.written || [];
  if (SUBPROJECT_PATTERNS.length === 0) return null; // Monorepo degil veya pattern yok

  const touchedLayers = new Set();
  for (const filePath of writtenFiles) {
    for (const entry of SUBPROJECT_PATTERNS) {
      if (entry.pattern.test(filePath)) {
        touchedLayers.add(entry.layer);
        break;
      }
    }
  }

  if (touchedLayers.size >= THRESHOLDS.CROSS_LAYER_MIN) {
    const layers = Array.from(touchedLayers).join(', ');
    return {
      type: 'cross_layer',
      message: `Changes were made across multiple layers: ${layers}. Cross-layer review suggested — check cross-layer consistency with /task-review. Run side-effect analysis with regression-analyzer.`,
    };
  }
  return null;
}

/**
 * Trigger 3: Uzun oturum
 * 30+ dakika ve 50+ tool call oldugunda review onerisi
 */
function checkLongSession(session) {
  const startedAt = session?.started_at;
  const totalCalls = session?.tools?.total_calls || 0;

  if (!startedAt) return null;

  const sessionMinutes = (Date.now() - new Date(startedAt).getTime()) / (1000 * 60);

  if (sessionMinutes >= THRESHOLDS.SESSION_MINUTES && totalCalls >= THRESHOLDS.TOOL_CALLS) {
    return {
      type: 'long_session',
      message: `Session has been running for ${Math.round(sessionMinutes)} minutes (${totalCalls} tool calls). Context pollution risk is rising — do an interim review or run /auto-review. On complex tasks, consider spawning teammates to distribute context.`,
    };
  }
  return null;
}

// === ANA HOOK ===

async function main() {
  let inputData = '';

  process.stdin.on('data', chunk => {
    inputData += chunk;
  });

  process.stdin.on('end', () => {
    // Oncelikle stdin'i stdout'a yaz (non-blocking davranis)
    // Hook ciktisi: systemMessage varsa JSON, yoksa input pass-through

    const session = readSessionState();
    if (!session) {
      // Session state yok — gecir
      process.stdout.write(inputData);
      process.exit(0);
    }

    const triggerState = readTriggerState();

    // 3 trigger'i kontrol et (oncelik sirasinda)
    const checks = [
      checkCrossLayer(session),
      checkFileCount(session),
      checkLongSession(session),
    ];

    for (const result of checks) {
      if (result && !isOnCooldown(result.type, triggerState)) {
        // Oneri ver ve cooldown'u guncelle
        markNotified(result.type, triggerState);

        // systemMessage ile oneri sun — BLOKLAMAZ
        const output = JSON.stringify({
          systemMessage: `💡 Team Trigger: ${result.message}`,
        });
        process.stdout.write(output);
        process.exit(0);
      }
    }

    // Hicbir trigger tetiklenmedi — gecir
    process.stdout.write(inputData);
    process.exit(0);
  });
}

if (require.main === module) main();

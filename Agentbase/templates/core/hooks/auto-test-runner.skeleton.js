#!/usr/bin/env node
/**
 * Auto Test Runner Hook
 * Produced by bootstrap.
 * PostToolUse (Edit|Write) — test-run signal for the layer that changed.
 *
 * Hook behavior:
 * - Triggers when an Edit or Write tool runs
 * - Detects the layer of the changed file (LAYER_TESTS)
 * - Debounce: skip when the same layer was signaled in the last 3 minutes
 * - Edit counter: after 3+ edits in the same layer the signal is stronger
 * - Non-blocking: signals with systemMessage and does not start a process
 * - Always writes stdin data to stdout
 *
 * Responsibility split:
 * - test-enforcer.js: per-file test matching, systemMessage when the test file is missing
 * - auto-test-runner.js: tracks the edit backlog and emits a debounced signal
 * - Final verification (Step 5): tests are required before the task is closed
 */

const fs = require('fs');
const path = require('path');

// ─── GENERATE SECTION START ───
// Bootstrap fills this section from subproject and test info in the manifest.
// Do not edit by hand — bootstrap overwrites these changes.

// Layer-test mapping — one entry per subproject
const LAYER_TESTS = [
  /* GENERATE: LAYER_TESTS
   * Bootstrap uses manifest.project.subprojects[] and manifest.stack.test_commands
   * to produce one test match per layer.
   *
   * Example:
   * { pattern: /api\/src\//, layer: 'API', command: 'cd ../Codebase/api && npm test', extra: null },
   * { pattern: /mobile\/src\//, layer: 'Mobile', command: 'cd ../Codebase/mobile && npm test', extra: null },
   */
  /* END GENERATE */
];

// Code file extensions to check
const CODE_EXTENSIONS = [
  /* GENERATE: CODE_EXTENSIONS
   * Bootstrap fills code file extensions from the detected stack.
   * Example: '.ts', '.tsx', '.js', '.jsx', '.py', '.php'
   */
  /* END GENERATE */
];

// ─── GENERATE SECTION END ───

// === CONFIGURATION ===

const DEBOUNCE_MS = 3 * 60 * 1000;       // 3 minutes — do not signal the same layer again
const EDIT_THRESHOLD = 3;                 // strengthen the signal after 3+ edits
const STATE_FILE = path.join(__dirname, '.auto-test-state.json');

// === STATE ===

/**
 * Load state from disk
 * State shape: { layers: { [layerName]: { editCount, lastSignal, lastEdit } } }
 */
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      // Drop state older than 1 hour
      if (data.timestamp && (Date.now() - data.timestamp) > 60 * 60 * 1000) {
        return { timestamp: Date.now(), layers: {} };
      }
      return data;
    }
  } catch {
    // Unreadable → empty state
  }
  return { timestamp: Date.now(), layers: {} };
}

/**
 * Save state to disk
 */
function saveState(state) {
  try {
    state.timestamp = Date.now();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch {
    // If it cannot be written, continue silently
  }
}

/**
 * Match a file path against LAYER_TESTS patterns
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
 * Check whether the file extension is a code file
 */
function isCodeFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  if (CODE_EXTENSIONS.length === 0) return true; // No config → accept every file
  const ext = path.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS.includes(ext);
}

// === MAIN HOOK ===

async function main() {
  let inputData = '';

  process.stdin.on('data', chunk => {
    inputData += chunk;
  });

  process.stdin.on('end', () => {
    // Edge case: empty stdin
    if (!inputData || inputData.trim() === '') {
      process.exit(0);
    }

    let input;
    try {
      input = JSON.parse(inputData);
    } catch {
      // Broken JSON — skip silently
      process.stdout.write(inputData);
      process.exit(0);
    }

    const filePath = input?.tool_input?.file_path || input?.tool_input?.path;

    // No file_path, or it is empty — pass through
    if (!filePath || typeof filePath !== 'string') {
      process.stdout.write(inputData);
      process.exit(0);
    }

    // If not a code file — skip
    if (!isCodeFile(filePath)) {
      process.stdout.write(inputData);
      process.exit(0);
    }

    // Layer detection
    const layer = detectLayer(filePath);
    if (!layer) {
      // Layer does not match — skip silently (not a crash)
      process.stdout.write(inputData);
      process.exit(0);
    }

    // Load and update state
    const state = loadState();
    if (!state.layers[layer.layer]) {
      state.layers[layer.layer] = { editCount: 0, lastSignal: 0, lastEdit: 0 };
    }

    const layerState = state.layers[layer.layer];
    layerState.editCount++;
    layerState.lastEdit = Date.now();

    // Debounce check: skip if last signal was within 3 minutes
    const timeSinceLastSignal = Date.now() - (layerState.lastSignal || 0);
    if (timeSinceLastSignal < DEBOUNCE_MS) {
      saveState(state);
      process.stdout.write(inputData);
      process.exit(0);
    }

    // Build the signal
    let message;
    if (layerState.editCount >= EDIT_THRESHOLD) {
      // Strong signal: many edits accumulated
      message = `${layerState.editCount} edits were made in the ${layer.layer} layer. Running tests is recommended:\n  ${layer.command}`;
      if (layer.extra) {
        message += `\n  Note: ${layer.extra}`;
      }
    } else {
      // Normal signal: the first edits
      message = `A change was made in the ${layer.layer} layer. Run the tests at a suitable point:\n  ${layer.command}`;
    }

    // Update state and save
    layerState.lastSignal = Date.now();
    // Reset the edit counter (signal was sent)
    layerState.editCount = 0;
    saveState(state);

    // Signal with systemMessage — does not block
    const output = JSON.stringify({
      systemMessage: message,
    });
    process.stdout.write(output);
    process.exit(0);
  });
}

if (require.main === module) main();

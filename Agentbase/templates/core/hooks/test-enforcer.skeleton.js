#!/usr/bin/env node
/**
 * Test Enforcer Hook
 * Produced by bootstrap.
 * PostToolUse (Edit|Write) — test-enforcement instruction for a source file.
 *
 * Hook behavior:
 * - Triggers when an Edit or Write tool runs
 * - Checks whether the file is a test file (skip if it is)
 * - Matches the source file against the test mapping table
 * - If the test file is MISSING: issues a "TEST MISSING" systemMessage
 * - If the test file EXISTS: issues an "Update the test" systemMessage
 * - Debounce: do not instruct again for the same file within 5 minutes
 * - Always writes stdin data to stdout (non-blocking)
 */

const fs = require('fs');
const path = require('path');

// ─── GENERATE SECTION START ───

// Layer-test mapping — which layer does the source file belong to?
const LAYER_TESTS = [
  /* GENERATE: LAYER_TESTS
   * Bootstrap uses manifest.project.subprojects[] and manifest.stack.test_commands
   * to produce one test match per layer.
   *
   * Example:
   * { pattern: /api\/src\//, layer: 'API', command: 'cd ../Codebase/api && npm test', extra: null },
   */
  /* END GENERATE */
];

// Source → test file mapping table
const TEST_FILE_MAPPING = [
  /* GENERATE: TEST_FILE_MAPPING
   * Bootstrap builds source-to-test patterns from the manifest stack.
   * Each entry has:
   *   sourcePattern: regex that matches the source path (with a capture group)
   *   testPath:      test file path ($1 = file name, $2 = extension)
   *   framework:     test framework name (jest, vitest, pytest, phpunit, and so on)
   *
   * Example (Node.js/TypeScript):
   * { sourcePattern: /(.+)\/(controllers|services|utils|middleware)\/(.+)\.(ts|js)$/, testPath: '$1/__tests__/$2/$3.test.$4', framework: 'jest' },
   *
   * Example (Python/Django):
   * { sourcePattern: /(.+)\/(views|models|serializers)\/(.+)\.py$/, testPath: '$1/tests/test_$3.py', framework: 'pytest' },
   */
  /* END GENERATE */
];

// Code file extensions to check
const CODE_EXTENSIONS = [
  /* GENERATE: CODE_EXTENSIONS
   * Bootstrap fills code extensions from the detected stack.
   * Example: '.ts', '.tsx', '.js', '.jsx', '.py', '.php'
   */
  /* END GENERATE */
];

// ─── GENERATE SECTION END ───

// === CONFIGURATION ===

const DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes — do not instruct for the same file again
const STATE_FILE = path.join(__dirname, '.test-enforcer-state.json');

// Test file patterns — do NOT instruct for these files
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

// === STATE ===

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      // Drop state older than 1 hour
      if (data.timestamp && (Date.now() - data.timestamp) > 60 * 60 * 1000) {
        return { timestamp: Date.now(), files: {} };
      }
      return data;
    }
  } catch {
    // Unreadable → empty state
  }
  return { timestamp: Date.now(), files: {} };
}

function saveState(state) {
  try {
    state.timestamp = Date.now();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state));
  } catch {
    // If it cannot be written, continue silently
  }
}

// === HELPER FUNCTIONS ===

/**
 * Is this file a test file?
 */
function isTestFile(filePath) {
  return TEST_FILE_PATTERNS.some(p => p.test(filePath));
}

/**
 * Is this file extension a code file?
 */
function isCodeFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  if (CODE_EXTENSIONS.length === 0) return true;
  const ext = path.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS.includes(ext);
}

/**
 * Match a file path against layer patterns
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
 * Compute the expected test file path for a source file
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
 * Debounce check — was an instruction already sent for this file in the last 5 minutes?
 */
function isOnDebounce(filePath, state) {
  const lastTime = state.files[filePath];
  if (!lastTime) return false;
  return (Date.now() - lastTime) < DEBOUNCE_MS;
}

// === MAIN HOOK ===

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

    // No file_path — pass through
    if (!filePath || typeof filePath !== 'string') {
      process.stdout.write(inputData);
      process.exit(0);
    }

    // If not a code file — skip
    if (!isCodeFile(filePath)) {
      process.stdout.write(inputData);
      process.exit(0);
    }

    // If this is a test file, skip it (do not ask for a test of a test)
    if (isTestFile(filePath)) {
      process.stdout.write(inputData);
      process.exit(0);
    }

    // Debounce check
    const state = loadState();
    if (isOnDebounce(filePath, state)) {
      process.stdout.write(inputData);
      process.exit(0);
    }

    // Layer detection
    const layer = detectLayer(filePath);

    // Test file matching
    const testInfo = resolveTestPath(filePath);
    if (!testInfo) {
      // No mapping — layer-level reminder only
      if (layer) {
        state.files[filePath] = Date.now();
        saveState(state);

        const output = JSON.stringify({
          systemMessage: `Source file edited in ${layer.layer} layer: ${path.basename(filePath)}. Run tests at a suitable point: ${layer.command}`,
        });
        process.stdout.write(output);
        process.exit(0);
      }

      process.stdout.write(inputData);
      process.exit(0);
    }

    // Check whether the test file exists
    const testExists = fs.existsSync(testInfo.testPath);

    state.files[filePath] = Date.now();
    saveState(state);

    let message;
    if (!testExists) {
      message = `TEST MISSING — no test file found for ${path.basename(filePath)}.\n` +
        `  Expected path: ${testInfo.testPath}\n` +
        `  This file should be created and basic scenarios written.\n` +
        `  Test framework: ${testInfo.framework}`;
    } else {
      message = `Update the test — ${path.basename(filePath)} was edited.\n` +
        `  Test file: ${testInfo.testPath}\n` +
        `  If behavior changed, add a new test case and update existing cases.`;
    }

    if (layer) {
      message += `\n  Test command: ${layer.command}`;
    }

    const output = JSON.stringify({ systemMessage: message });
    process.stdout.write(output);
    process.exit(0);
  });
}

if (require.main === module) main();

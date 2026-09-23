#!/usr/bin/env node
/**
 * Team Trigger Hook
 * Produced by bootstrap.
 * PostToolUse (Edit|Write) — suggests spawning a teammate under set conditions.
 *
 * Hook behavior:
 * - Triggers when an Edit or Write tool runs
 * - Reads session info from the session-tracker state file
 * - Checks 3 trigger conditions:
 *   1. File-count threshold: 5+ different files were edited
 *   2. Cross-layer change: edits in more than one subproject/layer
 *   3. Long session: 30+ minutes and 50+ tool calls
 * - When a condition holds it SUGGESTS (systemMessage) and does not block
 * - The same suggestion is not repeated (cooldown)
 * - Always writes stdin data to stdout (non-blocking)
 */

const fs = require('fs');
const path = require('path');

// ─── GENERATE SECTION START ───
// Bootstrap fills this section from subproject info in the manifest.
// Do not edit by hand — bootstrap overwrites these changes.

// Subproject directory patterns — for cross-layer detection
const SUBPROJECT_PATTERNS = [
  /* GENERATE: LAYER_TESTS
   * Bootstrap uses manifest.project.subprojects[] to build
   * a directory pattern for each subproject.
   * team-trigger shares the same patterns as LAYER_TESTS
   * for cross-layer detection.
   *
   * Example:
   *
   * { pattern: /api\/src\//, layer: 'API' },
   * { pattern: /mobile\/src\//, layer: 'Mobile' },
   * { pattern: /web\/src\//, layer: 'Web' },
   */
  /* END GENERATE */
];

// ─── GENERATE SECTION END ───

// === CONFIGURATION ===

const THRESHOLDS = {
  FILE_COUNT: 5,             // 5+ different files → teammate suggestion
  TOOL_CALLS: 50,            // 50+ tool calls → long session
  SESSION_MINUTES: 30,       // 30+ minutes → long session
  CROSS_LAYER_MIN: 2,        // 2+ layers → cross-layer warning
};

// Cooldown: the same suggestion type at most once every 10 minutes
const COOLDOWN_MS = 10 * 60 * 1000;

// === STATE ===

const SESSIONS_DIR = path.join(__dirname, '../tracking/sessions');
const SESSION_ID = `${process.ppid}-${new Date().toISOString().slice(0, 10)}`;
const SESSION_FILE = path.join(SESSIONS_DIR, `session-${SESSION_ID}.json`);
const TRIGGER_STATE_FILE = path.join(__dirname, '.team-trigger-state.json');

/**
 * Read the session-tracker state file
 */
function readSessionState() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    }
  } catch {
    // Unreadable session state → return empty
  }
  return null;
}

/**
 * Read trigger cooldown state
 */
function readTriggerState() {
  try {
    if (fs.existsSync(TRIGGER_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(TRIGGER_STATE_FILE, 'utf8'));
    }
  } catch {
    // Unreadable → empty state
  }
  return { lastNotified: {} };
}

/**
 * Save trigger cooldown state
 */
function saveTriggerState(state) {
  try {
    fs.writeFileSync(TRIGGER_STATE_FILE, JSON.stringify(state));
  } catch {
    // If it cannot be written, continue silently
  }
}

/**
 * Cooldown check — was this suggestion type sent in the last 10 minutes?
 */
function isOnCooldown(triggerType, triggerState) {
  const lastTime = triggerState.lastNotified[triggerType];
  if (!lastTime) return false;
  return (Date.now() - lastTime) < COOLDOWN_MS;
}

/**
 * Update the cooldown
 */
function markNotified(triggerType, triggerState) {
  triggerState.lastNotified[triggerType] = Date.now();
  saveTriggerState(triggerState);
}

// === TRIGGER CHECKS ===

/**
 * Trigger 1: file-count threshold
 * Suggest a teammate when 5+ different files were edited
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
 * Trigger 2: cross-layer change
 * Suggest a cross-layer review when more than one subproject/layer changed
 */
function checkCrossLayer(session) {
  const writtenFiles = session?.files?.written || [];
  if (SUBPROJECT_PATTERNS.length === 0) return null; // Not a monorepo, or no pattern

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
 * Trigger 3: long session
 * Suggest a review after 30+ minutes and 50+ tool calls
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

// === MAIN HOOK ===

async function main() {
  let inputData = '';

  process.stdin.on('data', chunk => {
    inputData += chunk;
  });

  process.stdin.on('end', () => {
    // Write stdin to stdout first (non-blocking behavior)
    // Hook output: JSON when there is a systemMessage, otherwise pass the input through

    const session = readSessionState();
    if (!session) {
      // No session state — pass through
      process.stdout.write(inputData);
      process.exit(0);
    }

    const triggerState = readTriggerState();

    // Check the 3 triggers (in priority order)
    const checks = [
      checkCrossLayer(session),
      checkFileCount(session),
      checkLongSession(session),
    ];

    for (const result of checks) {
      if (result && !isOnCooldown(result.type, triggerState)) {
        // Send the suggestion and update the cooldown
        markNotified(result.type, triggerState);

        // Suggest with systemMessage — does not block
        const output = JSON.stringify({
          systemMessage: `💡 Team Trigger: ${result.message}`,
        });
        process.stdout.write(output);
        process.exit(0);
      }
    }

    // No trigger fired — pass through
    process.stdout.write(inputData);
    process.exit(0);
  });
}

if (require.main === module) main();

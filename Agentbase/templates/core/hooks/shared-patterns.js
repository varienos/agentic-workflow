'use strict';

/**
 * shared-patterns.js — Shared helpers between
 * session-tracker and session-monitor.
 *
 * Both files require this module and use the same pattern set.
 * DRY principle: test-command detection is defined in one place.
 */

const TEST_COMMAND_PATTERNS = [
  /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test\b/i,
  /\bnode\s+--test\b/i,
  /\bjest\b/i,
  /\bvitest\b/i,
  /\bpytest\b/i,
  /\bphpunit\b/i,
  /\bcargo\s+test\b/i,
  /\bgo\s+test\b/i,
];

/**
 * Checks whether a command is a test command.
 * @param {string} command - Bash command
 * @returns {boolean}
 */
function isTestCommand(command) {
  if (!command) return false;
  return TEST_COMMAND_PATTERNS.some(p => p.test(command));
}

module.exports = {
  TEST_COMMAND_PATTERNS,
  isTestCommand,
};

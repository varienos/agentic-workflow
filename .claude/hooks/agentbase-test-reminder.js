#!/usr/bin/env node
/**
 * Agentbase test reminder — local development
 *
 * PostToolUse(Edit|Write) — when an Agentbase source file is edited,
 * remind the session to run the related test via systemMessage.
 *
 * Does not block — signal only.
 * Final verification is the user's own "npm test".
 */

const path = require('path');

const PROJECT_ROOT = '/Users/varienos/Landing/Repo/agentic-workflow';

const RULES = [
  {
    pattern: /Agentbase\/generate\.js$/,
    command: 'cd Agentbase && node --test generate.test.js',
    reason: 'generate.js was edited',
  },
  {
    pattern: /Agentbase\/transform\.js$/,
    command: 'cd Agentbase && node --test transform.test.js',
    reason: 'transform.js was edited',
  },
  {
    pattern: /Agentbase\/bin\/(changelog|release|diff-engine|manifest-meta|session-monitor|shared-patterns)\.js$/,
    command: 'cd Agentbase && npm test',
    reason: 'a bin/ script was edited',
  },
  {
    pattern: /Agentbase\/templates\/core\/hooks\/.*\.(skeleton\.)?js$/,
    command: 'cd Agentbase && node --test tests/core-hooks.test.js',
    reason: 'a core hook skeleton or script was edited',
  },
  {
    pattern: /Agentbase\/templates\//,
    command: 'cd Agentbase && npm test',
    reason: 'a template file was edited',
  },
  {
    pattern: /Agentbase\/tests\/.*\.test\.js$/,
    command: 'cd Agentbase && npm test',
    reason: 'a test file was edited',
  },
];

function matchRule(filePath) {
  const rel = filePath.startsWith(PROJECT_ROOT)
    ? path.relative(PROJECT_ROOT, filePath)
    : filePath;
  for (const rule of RULES) {
    if (rule.pattern.test(rel) || rule.pattern.test(filePath)) {
      return { ...rule, rel };
    }
  }
  return null;
}

function main() {
  let inputData = '';
  process.stdin.on('data', chunk => (inputData += chunk));
  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(inputData);
      const filePath = input.tool_input?.file_path || '';
      if (!filePath) return process.exit(0);

      const rule = matchRule(filePath);
      if (!rule) return process.exit(0);

      const message =
        `AGENTBASE TEST REMINDER — ${rule.rel}\n` +
        `Reason: ${rule.reason}\n` +
        `Suggested command: ${rule.command}\n\n` +
        `Run this test after the edit batch — it is early feedback.`;

      const output = {
        ...input,
        systemMessage: message,
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: message,
        },
      };

      process.stdout.write(JSON.stringify(output));
      process.exit(0);
    } catch (err) {
      process.stderr.write(`[agentbase-test-reminder] Error: ${err.message}\n`);
      process.exit(0);
    }
  });
}

main();

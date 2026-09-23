#!/usr/bin/env node

/**
 * codebase-guard.js
 * PreToolUse (Edit|Write) hook
 *
 * Blocks writing .claude/, CLAUDE.md, .claude-ignore, .mcp.json into Codebase.
 * Agent config files live under Agentbase/.claude/ — invariant rule.
 */

const path = require('path');
const { readStdin, resolveCodebaseRoot } = require(path.join(__dirname, 'shared-hook-utils.js'));

const CODEBASE_ROOT = resolveCodebaseRoot(__dirname, '../Codebase');

const BLOCKED_PATTERNS = [
  '/.claude/',
  '/.claude-ignore',
  '/.mcp.json',
];

function isCodebaseConfigPath(filePath) {
  if (!filePath) return false;

  let resolved;
  try {
    resolved = path.resolve(filePath);
  } catch {
    return false;
  }

  // Do not touch paths outside Codebase
  if (!resolved.startsWith(CODEBASE_ROOT + path.sep) && resolved !== CODEBASE_ROOT) {
    return false;
  }

  // Protected paths inside Codebase
  const relPath = '/' + path.relative(CODEBASE_ROOT, resolved).replace(/\\/g, '/');

  for (const pattern of BLOCKED_PATTERNS) {
    if (relPath.startsWith(pattern) || relPath === pattern) return true;
  }

  // Codebase/CLAUDE.md (root level)
  if (relPath === '/CLAUDE.md') return true;

  return false;
}


async function main() {
  try {
    const input = await readStdin();
    const parsed = JSON.parse(input);

    const filePath = parsed?.tool_input?.file_path || parsed?.tool_input?.path || '';

    if (isCodebaseConfigPath(filePath)) {
      const result = {
        decision: 'block',
        reason: 'Cannot write agent config into Codebase. .claude/, CLAUDE.md, .mcp.json files live under Agentbase/.claude/. Check your target directory.',
      };
      process.stdout.write(JSON.stringify(result));
    }

    // Exit silently if no match
  } catch (e) {
    // Hook errors are swallowed silently
  }
}

// Export for tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isCodebaseConfigPath, CODEBASE_ROOT, BLOCKED_PATTERNS };
}

if (require.main === module) main();

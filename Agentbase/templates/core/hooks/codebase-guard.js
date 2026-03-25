#!/usr/bin/env node

/**
 * codebase-guard.js
 * PreToolUse (Edit|Write) hook
 *
 * Codebase icine .claude/, CLAUDE.md, .claude-ignore, .mcp.json yazmayi engeller.
 * Agent config dosyalari Agentbase/.claude/ altinda yasar — kutsal kural.
 */

const path = require('path');
const fs = require('fs');
const { readStdin } = require(path.join(__dirname, 'shared-hook-utils.js'));

const CODEBASE_ROOT = (() => { const p = path.resolve(__dirname, '../../..', '../Codebase'); try { return fs.realpathSync(p); } catch { return p; } })();

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

  // Codebase disindaki yollara dokunma
  if (!resolved.startsWith(CODEBASE_ROOT + path.sep) && resolved !== CODEBASE_ROOT) {
    return false;
  }

  // Codebase icerisindeki korunmus yollar
  const relPath = '/' + path.relative(CODEBASE_ROOT, resolved).replace(/\\/g, '/');

  for (const pattern of BLOCKED_PATTERNS) {
    if (relPath.startsWith(pattern) || relPath === pattern) return true;
  }

  // Codebase/CLAUDE.md (kok seviye)
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
        reason: 'Codebase icine agent config yazilamaz. .claude/, CLAUDE.md, .mcp.json dosyalari Agentbase/.claude/ altinda yasar. Hedef dizininizi kontrol edin.',
      };
      process.stdout.write(JSON.stringify(result));
    }

    // Eslesmezse sessizce cik
  } catch (e) {
    // Hook hatalari sessizce yutulur
  }
}

// Test icin export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isCodebaseConfigPath, CODEBASE_ROOT, BLOCKED_PATTERNS };
}

if (require.main === module) main();

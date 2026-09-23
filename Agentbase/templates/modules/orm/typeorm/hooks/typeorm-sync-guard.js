#!/usr/bin/env node
/**
 * typeorm-sync-guard.js — PreToolUse (Bash) hook
 * Blocks dangerous TypeORM commands.
 */
const { runGuard } = require(require('path').join(__dirname, 'shared-hook-utils.js'));
runGuard([
  { pattern: /typeorm\s+schema:sync|typeorm.*schema\s+sync/i, decision: 'block', reason: 'typeorm schema:sync is FORBIDDEN. Use migrations.' },
  { pattern: /typeorm\s+schema:drop|typeorm.*schema\s+drop/i, decision: 'block', reason: 'typeorm schema:drop is FORBIDDEN. It deletes all tables.' },
  { pattern: /typeorm\s+migration:revert|typeorm.*migration\s+revert/i, decision: 'warn', reason: 'typeorm migration:revert may cause data loss.' },
  { pattern: /synchronize\s*[:=]\s*true/i, decision: 'warn', reason: 'synchronize: true is dangerous in production. Use migrations.' },
]);

#!/usr/bin/env node
/**
 * artisan-migrate-guard.js — PreToolUse (Bash) hook
 * Blocks dangerous artisan migration commands.
 */
const { runGuard } = require(require('path').join(__dirname, 'shared-hook-utils.js'));
runGuard([
  { pattern: /artisan\s+migrate:fresh/i, decision: 'block', reason: 'artisan migrate:fresh is FORBIDDEN. It deletes all tables and starts from scratch.' },
  { pattern: /artisan\s+migrate:reset/i, decision: 'block', reason: 'artisan migrate:reset is FORBIDDEN. It rolls back all migrations.' },
  { pattern: /artisan\s+db:wipe/i, decision: 'block', reason: 'artisan db:wipe is FORBIDDEN. It deletes all tables, views, and types.' },
  { match: (cmd) => { const m = cmd.match(/artisan\s+migrate:rollback\s+.*--step[=\s]+(\d+)/i); return m && parseInt(m[1], 10) >= 10; }, decision: 'warn', reason: 'migrate:rollback is rolling back too many steps. Risk of data loss.' },
]);

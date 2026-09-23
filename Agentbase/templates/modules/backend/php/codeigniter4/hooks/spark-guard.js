#!/usr/bin/env node
/**
 * spark-guard.js — PreToolUse (Bash) hook
 * CodeIgniter 4 spark protection.
 */
const { runGuard } = require(require('path').join(__dirname, 'shared-hook-utils.js'));
runGuard([
  { pattern: /spark\s+migrate:refresh\b/i, decision: 'block', reason: 'spark migrate:refresh rolls back all migrations and re-applies them.' },
  { pattern: /spark\s+migrate:rollback\b/i, decision: 'warn', reason: 'spark migrate:rollback rolls back batches.' },
  { pattern: /spark\s+db:seed\b/i, decision: 'warn', reason: 'spark db:seed may conflict with existing records.' },
  { pattern: /spark\s+cache:clear\b/i, decision: 'info', reason: 'spark cache:clear clears the application cache.' },
], { preCheck: (cmd) => /spark/i.test(cmd) });

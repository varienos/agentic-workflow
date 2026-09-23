#!/usr/bin/env node
/**
 * artisan-guard.js — PreToolUse (Bash) hook
 * Laravel framework-specific protection.
 */
const { runGuard } = require(require('path').join(__dirname, 'shared-hook-utils.js'));
runGuard([
  { pattern: /artisan\s+db:wipe/i, decision: 'block', reason: 'artisan db:wipe deletes ALL tables. FORBIDDEN.' },
  { pattern: /artisan\s+tinker/i, decision: 'warn', reason: 'artisan tinker is an interactive shell and is dangerous in automated context.' },
  { pattern: /artisan\s+config:cache/i, decision: 'warn', reason: 'artisan config:cache blocks .env changes during development.' },
  { pattern: /artisan\s+route:cache/i, decision: 'warn', reason: 'artisan route:cache fails on closure-based routes.' },
  { pattern: /artisan\s+key:generate/i, decision: 'warn', reason: 'artisan key:generate changes APP_KEY; existing data becomes unreadable.' },
  { pattern: /artisan\s+optimize:clear/i, decision: 'info', reason: 'artisan optimize:clear clears all caches.' },
], { preCheck: (cmd) => /artisan/i.test(cmd) });

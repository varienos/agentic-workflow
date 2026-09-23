#!/usr/bin/env node
/**
 * manage-py-guard.js — PreToolUse (Bash) hook
 * Django management dangerous command protection.
 */
const { runGuard } = require(require('path').join(__dirname, 'shared-hook-utils.js'));
runGuard([
  { pattern: /manage\.py\s+flush\b/i, decision: 'block', reason: 'manage.py flush is FORBIDDEN. It deletes all data.' },
  { pattern: /manage\.py\s+reset_db\b/i, decision: 'block', reason: 'manage.py reset_db is FORBIDDEN. It completely deletes and recreates the DB.' },
  { pattern: /manage\.py\s+sqlflush\b/i, decision: 'warn', reason: 'manage.py sqlflush shows SQL. Do not run it directly.' },
  { pattern: /manage\.py\s+migrate\b.*--fake\b|manage\.py\s+migrate\b.*--fake-initial\b/i, decision: 'warn', reason: '--fake marks a migration as applied without running it.' },
  { pattern: /manage\.py\s+migrate\s+\w+\s+zero\b/i, decision: 'warn', reason: 'migrate <app> zero rolls back all migrations.' },
]);

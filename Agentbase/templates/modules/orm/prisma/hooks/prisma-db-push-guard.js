#!/usr/bin/env node
/**
 * prisma-db-push-guard.js — PreToolUse (Bash) hook
 * Blocks the prisma db push command.
 */
const { runGuard } = require(require('path').join(__dirname, 'shared-hook-utils.js'));
runGuard([{ pattern: /prisma\s+db\s+push/i, decision: 'block', reason: 'prisma db push is FORBIDDEN. It changes the DB without a migration file. Correct command: npx prisma migrate dev --name {description}' }]);

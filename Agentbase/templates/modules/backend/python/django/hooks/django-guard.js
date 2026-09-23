#!/usr/bin/env node
/**
 * django-guard.js — PreToolUse (Bash) hook
 * Django framework-specific protection. Dangerous non-migration commands.
 */
const { readStdin } = require(require('path').join(__dirname, 'shared-hook-utils.js'));

const DANGEROUS_COMMANDS = [
  { pattern: /manage\.py\s+flush\b/i, decision: 'block', reason: 'manage.py flush deletes ALL database data. FORBIDDEN.' },
  { pattern: /manage\.py\s+shell\b/i, decision: 'warn', reason: 'manage.py shell is an interactive shell and is dangerous in automated context.' },
  { pattern: /manage\.py\s+createsuperuser\b.*(?:--password|DJANGO_SUPERUSER_PASSWORD)/i, decision: 'block', reason: 'Do not put passwords on the command line with createsuperuser. SECURITY RISK.' },
  { pattern: /manage\.py\s+dbshell\b/i, decision: 'warn', reason: 'manage.py dbshell does not work interactively. Use the Django ORM.' },
  { pattern: /manage\.py\s+loaddata\b/i, decision: 'warn', reason: 'manage.py loaddata may overwrite existing data.' },
  { pattern: /manage\.py\s+dumpdata\b/i, decision: 'info', reason: 'manage.py dumpdata may contain sensitive data. Do not commit the output.' },
  { pattern: /manage\.py\s+collectstatic\b/i, decision: 'info', reason: 'manage.py collectstatic is usually unnecessary in development.' },
];

async function main() {
  try {
    const input = await readStdin();
    const parsed = JSON.parse(input);
    const command = parsed?.tool_input?.command || '';
    if (!/manage\.py/i.test(command)) return;
    for (const rule of DANGEROUS_COMMANDS) {
      if (rule.pattern.test(command)) {
        if (rule.decision === 'block') {
          process.stdout.write(JSON.stringify({ decision: 'block', reason: rule.reason }));
        } else {
          const prefix = rule.decision === 'warn' ? '\u26a0\ufe0f WARNING' : '\u2139\ufe0f INFO';
          process.stdout.write(JSON.stringify({ systemMessage: `${prefix}: ${rule.reason}` }));
        }
        return;
      }
    }
  } catch (e) { /* silent */ }
}
if (require.main === module) main();

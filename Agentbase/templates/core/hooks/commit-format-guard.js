#!/usr/bin/env node
/**
 * Commit Format Guard Hook
 *
 * PreToolUse(Bash) — for git commit -m "...":
 *  1. Extracts the message with regex (-m "..." or -m '...')
 *  2. Validates the Conventional Commits prefix
 *  3. If no match, rejects with block + explanatory suggestion
 *
 * HEREDOC commit messages (-m "$(cat <<EOF ... EOF)") skip format checks —
 * practical limitation; the user is responsible for HEREDOC messages.
 *
 * git commit editor mode (alone, no -m) is skipped.
 *
 * Rule source: .claude/rules/commit-style.md (optional)
 */

const ALLOWED_PREFIXES = [
  'feat',
  'fix',
  'refactor',
  'docs',
  'chore',
  'test',
  'style',
  'perf',
  'build',
  'ci',
  'revert',
  'release',
];

const CONVENTIONAL_REGEX = new RegExp(
  '^(' + ALLOWED_PREFIXES.join('|') + ')(\\([^)]+\\))?!?: .+'
);

function extractCommitMessage(command) {
  // Skip HEREDOC
  if (/<<\s*['"]?EOF['"]?/i.test(command)) return null;

  // git commit -m "..." or -m '...'
  const doubleQuote = command.match(/git\s+commit\b[^"']*-m\s+"([^"]*)"/);
  if (doubleQuote) return doubleQuote[1];

  const singleQuote = command.match(/git\s+commit\b[^"']*-m\s+'([^']*)'/);
  if (singleQuote) return singleQuote[1];

  return null;
}

function isCommitCommand(command) {
  return /\bgit\s+commit\b/.test(command);
}

function main() {
  let inputData = '';
  process.stdin.on('data', chunk => (inputData += chunk));
  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(inputData);
      const command = input.tool_input?.command || '';

      if (!isCommitCommand(command)) return process.exit(0);

      const message = extractCommitMessage(command);

      // Message could not be extracted (editor mode, HEREDOC, etc.) — skip
      if (!message) return process.exit(0);

      const firstLine = message.split('\n')[0].trim();

      if (CONVENTIONAL_REGEX.test(firstLine)) return process.exit(0);

      const reason =
        `Commit message does not match conventional format.\n\n` +
        `Message: "${firstLine}"\n\n` +
        `Expected: <prefix>(<scope>)?: <description>\n` +
        `Prefix list: ${ALLOWED_PREFIXES.join(', ')}\n\n` +
        `Examples:\n` +
        `  feat(hooks): add english prose guard\n` +
        `  fix(generate): fix skeleton parse error\n` +
        `  refactor(transform): simplify module loading logic\n\n` +
        `Message should be English, imperative mood.`;

      process.stdout.write(JSON.stringify({ decision: 'block', reason }));
      process.exit(0);
    } catch (err) {
      process.stderr.write(`[commit-format-guard] Error: ${err.message}\n`);
      process.exit(0);
    }
  });
}

main();

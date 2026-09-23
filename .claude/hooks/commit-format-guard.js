#!/usr/bin/env node
/**
 * Commit format guard
 *
 * PreToolUse(Bash) — for a `git commit -m "..."` command:
 *  1. Extract the message (-m "..." or -m '...')
 *  2. Check the Conventional Commits prefix
 *  3. Block with an explanation when it does not match
 *
 * HEREDOC commit messages (-m "$(cat <<EOF ... EOF)") skip the format check —
 * a practical limit; the author owns HEREDOC messages.
 *
 * Editor mode (`git commit` with no -m) is skipped.
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

      // Could not extract a message (editor mode, HEREDOC, and similar) — skip
      if (!message) return process.exit(0);

      const firstLine = message.split('\n')[0].trim();

      if (CONVENTIONAL_REGEX.test(firstLine)) return process.exit(0);

      const reason =
        `Commit message does not match the conventional format.\n\n` +
        `Message: "${firstLine}"\n\n` +
        `Expected: <prefix>(<scope>)?: <description>\n` +
        `Prefixes: ${ALLOWED_PREFIXES.join(', ')}\n\n` +
        `Examples:\n` +
        `  feat(hooks): add an English test reminder\n` +
        `  fix(generate): correct a skeleton parse error\n` +
        `  refactor(transform): simplify module loading\n\n` +
        `Write the message in English, imperative mood.`;

      process.stdout.write(JSON.stringify({ decision: 'block', reason }));
      process.exit(0);
    } catch (err) {
      process.stderr.write(`[commit-format-guard] Error: ${err.message}\n`);
      process.exit(0);
    }
  });
}

main();

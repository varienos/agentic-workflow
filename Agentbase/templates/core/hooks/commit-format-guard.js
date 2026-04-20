#!/usr/bin/env node
/**
 * Commit Format Guard Hook
 *
 * PreToolUse(Bash) — git commit -m "..." komutu icin:
 *  1. Mesaji regex ile cikarir (-m "..." veya -m '...')
 *  2. Conventional Commits prefix'ini dogrular
 *  3. Eslesme yoksa block + aciklayici oneri ile reddeder
 *
 * HEREDOC commit mesajlari (-m "$(cat <<EOF ... EOF)") format kontrolunden
 * atlanir — pratik sinirlama, kullanici HEREDOC icin sorumluluk sahibidir.
 *
 * git commit editor modu (tek basina, -m yok) atlanir.
 *
 * Kural kaynagi: .claude/rules/commit-style.md (opsiyonel)
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
  // HEREDOC atla
  if (/<<\s*['"]?EOF['"]?/i.test(command)) return null;

  // git commit -m "..." veya -m '...'
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

      // Mesaj cikarilamadi (editor modu, HEREDOC, vb.) — atla
      if (!message) return process.exit(0);

      const firstLine = message.split('\n')[0].trim();

      if (CONVENTIONAL_REGEX.test(firstLine)) return process.exit(0);

      const reason =
        `Commit mesaji conventional format'a uymuyor.\n\n` +
        `Mesaj: "${firstLine}"\n\n` +
        `Beklenen: <prefix>(<scope>)?: <aciklama>\n` +
        `Prefix listesi: ${ALLOWED_PREFIXES.join(', ')}\n\n` +
        `Ornekler:\n` +
        `  feat(hooks): turkce diakritik guard eklendi\n` +
        `  fix(generate): skeleton parse hatasi duzeltildi\n` +
        `  refactor(transform): modul yukleme mantigi sadelestirildi\n\n` +
        `Mesaj Turkce, imperative mood olmali.`;

      process.stdout.write(JSON.stringify({ decision: 'block', reason }));
      process.exit(0);
    } catch (err) {
      process.stderr.write(`[commit-format-guard] Hata: ${err.message}\n`);
      process.exit(0);
    }
  });
}

main();

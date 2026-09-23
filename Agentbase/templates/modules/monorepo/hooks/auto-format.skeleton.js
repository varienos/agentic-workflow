#!/usr/bin/env node

/**
 * auto-format.skeleton.js
 * PostToolUse (Edit|Write) hook
 *
 * Applies automatic formatting after a file is edited.
 * - Smart-quote fix (curly → straight quotes)
 * - Detect the formatter for the subproject
 * - Run formatter (prettier, biome, etc.)
 *
 * GENERATE sections are filled by Bootstrap.
 */

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { resolveCodebaseRoot } = require(path.join(__dirname, 'shared-hook-utils.js'));

// Target root: env (AGENTIC_CODEBASE_DIR) > manifest fallback. Resolved with realpath for symlinks.
const CODEBASE_ROOT = resolveCodebaseRoot(__dirname, '../Codebase');

// ─── GENERATE SECTION START ───

/* GENERATE: SUBPROJECT_CONFIGS
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: project.subprojects, project.formatters
Example output: */
const SUBPROJECT_CONFIGS = [
  // { path: 'apps/api', configFile: '.prettierrc', formatter: 'prettier' },
  // { path: 'apps/web', configFile: '.prettierrc', formatter: 'prettier' },
  // { path: 'apps/mobile', configFile: '.prettierrc', formatter: 'prettier' },
  // { path: 'packages/shared', configFile: '.prettierrc', formatter: 'prettier' },
];
/* END GENERATE */

/* GENERATE: CODE_EXTENSIONS
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: stack.primary, stack.file_extensions
Example output: */
const CODE_EXTENSIONS = [
  // '.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.html', '.md'
];
/* END GENERATE */

// ─── GENERATE SECTION END ───

/**
 * Converts curly (smart) quotes to straight quotes.
 * Word, Google Docs vb. kaynaklardan kopyalanan metinlerde olusur.
 */
function fixSmartQuotes(content) {
  return content
    .replace(/[\u2018\u2019]/g, "'")  // ' ' → '
    .replace(/[\u201C\u201D]/g, '"')  // " " → "
    .replace(/\u2013/g, '-')           // – → -
    .replace(/\u2014/g, '--')          // — → --
    .replace(/\u2026/g, '...')         // … → ...
    .replace(/\u00A0/g, ' ');          // non-breaking space → normal space
}

/**
 * Detects which subproject the file belongs to.
 */
function detectSubproject(filePath) {
  const relativePath = path.relative(CODEBASE_ROOT, filePath);

  for (const config of SUBPROJECT_CONFIGS) {
    if (relativePath.startsWith(config.path)) {
      return config;
    }
  }

  return null;
}

/**
 * Checks whether the file extension is formattable.
 */
function isFormattableFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS.includes(ext);
}

/**
 * Finds the formatter config file.
 * Searches first in the subproject directory, then in the root directory.
 */
function findFormatterConfig(subproject) {
  if (!subproject || !subproject.configFile) return null;

  // Search in the subproject directory
  const subprojectConfig = path.join(CODEBASE_ROOT, subproject.path, subproject.configFile);
  if (fs.existsSync(subprojectConfig)) {
    return subprojectConfig;
  }

  // Search in the root directory
  const rootConfig = path.join(CODEBASE_ROOT, subproject.configFile);
  if (fs.existsSync(rootConfig)) {
    return rootConfig;
  }

  return null;
}

/**
 * Formats the file with the formatter.
 */
function runFormatter(filePath, subproject) {
  if (!subproject) return;

  const configPath = findFormatterConfig(subproject);
  const cwd = path.join(CODEBASE_ROOT, subproject.path);

  try {
    let args;

    switch (subproject.formatter) {
      case 'prettier':
        args = configPath
          ? ['prettier', '--write', '--config', configPath, filePath]
          : ['prettier', '--write', filePath];
        break;

      case 'biome':
        args = configPath
          ? ['biome', 'format', '--write', '--config-path', path.dirname(configPath), filePath]
          : ['biome', 'format', '--write', filePath];
        break;

      default:
        // Unknown formatter; skip silently
        return;
    }

    execFileSync('npx', args, {
      cwd: fs.existsSync(cwd) ? cwd : CODEBASE_ROOT,
      timeout: 15000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  } catch {
    // Formatting errors are swallowed silently — must not block the workflow
  }
}

const { readStdin } = require(require('path').join(__dirname, 'shared-hook-utils.js'));

async function main() {
  try {
    const input = await readStdin();
    const parsed = JSON.parse(input);

    const filePath = parsed?.tool_input?.file_path || parsed?.tool_input?.path || '';

    // Is the file inside the codebase?
    if (!filePath.startsWith(CODEBASE_ROOT)) return;

    // Is the file formattable?
    if (!isFormattableFile(filePath)) return;

    // Does the file exist?
    if (!fs.existsSync(filePath)) return;

    // 1. Smart-quote fix
    let content = fs.readFileSync(filePath, 'utf8');
    const fixedContent = fixSmartQuotes(content);

    if (fixedContent !== content) {
      fs.writeFileSync(filePath, fixedContent, 'utf8');
    }

    // 2. Detect the subproject and format
    const subproject = detectSubproject(filePath);
    if (subproject) {
      runFormatter(filePath, subproject);
    }

    // Silent success — produce no output
  } catch {
    // Hook errors are swallowed silently
  }
}

if (require.main === module) main();

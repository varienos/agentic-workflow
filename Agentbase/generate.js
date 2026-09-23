#!/usr/bin/env node
'use strict';

/**
 * generate.js — deterministic skeleton processor
 *
 * Reads the manifest YAML, scans skeleton files, and fills GENERATE blocks
 * deterministically. Complex blocks are left for the active host.
 *
 * Usage:
 *   node generate.js <manifest-path> [--output-dir <output-dir>] [--modules <module-list>] [--dry-run] [--verbose]
 *
 * Examples:
 *   node Agentbase/generate.js Docbase/agentic/project-manifest.yaml
 *   node Agentbase/generate.js Docbase/agentic/project-manifest.yaml --dry-run
 *   node Agentbase/generate.js Docbase/agentic/project-manifest.yaml --modules "mobile/expo,deploy/docker"
 *   node Agentbase/generate.js Docbase/agentic/project-manifest.yaml --output-dir ./out
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ─────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────

const AGENTBASE_DIR = path.resolve(__dirname);
const TEMPLATES_DIR = path.join(AGENTBASE_DIR, 'templates');

// Output path map (skeleton location → output location, Agentbase-relative)
const TARGET_MAP = {
  'core/commands': '.claude/commands',
  'core/agents': '.claude/agents',
  'core/hooks': '.claude/hooks',
  'core/rules': '.claude/rules',
  'core/git-hooks': 'git-hooks',
};

// ─────────────────────────────────────────────────────
// GENERATE BLOK PARSER'LARI
// ─────────────────────────────────────────────────────

/**
 * MD dosyalarindaki GENERATE bloklarini parse eder.
 * Format: <!-- GENERATE: BLOCK_NAME\n...\n-->
 * Tum HTML comment'i replace edilir.
 */
// Regex factory — her cagri yeni instance dondurur (lastIndex yan etkisi onlenir)
function createMdGenerateRe() {
  return /<!-- GENERATE: (\w+)\n[\s\S]*?-->/g;
}

function createJsGenerateRe() {
  return /\/\* GENERATE: (\w+)\n[\s\S]*?\*\/\s*\n?\s*\/\* END GENERATE \*\//g;
}

// Python: hash-comment delimitli blok. "# GENERATE: NAME\n...\n# END GENERATE"
// The Python parser does not accept HTML/C comments, so this block uses a Python-specific form.
function createPyGenerateRe() {
  return /# GENERATE: (\w+)\n[\s\S]*?# END GENERATE/g;
}


/**
 * Extracts every GENERATE block name from a body of content.
 * @param {string} content - File contents
 * @param {'md'|'js'} fileType - File type
 * @returns {string[]} Block names
 */
function extractBlockNames(content, fileType) {
  let re;
  if (fileType === 'js') re = createJsGenerateRe();
  else if (fileType === 'py') re = createPyGenerateRe();
  else re = createMdGenerateRe();
  const names = [];
  let match;
  while ((match = re.exec(content)) !== null) {
    names.push(match[1]);
  }
  return names;
}

/**
 * Replaces GENERATE blocks in the content with the given generator results.
 * @param {string} content - File contents
 * @param {'md'|'js'} fileType - File type
 * @param {Object} manifest - Manifest data
 * @returns {{ content: string, filled: string[], marked: string[] }}
 */
function fillBlocks(content, fileType, manifest) {
  let re;
  if (fileType === 'js') re = createJsGenerateRe();
  else if (fileType === 'py') re = createPyGenerateRe();
  else re = createMdGenerateRe();
  const filled = [];
  const marked = [];

  const result = content.replace(re, (fullMatch, blockName) => {
    const generator = SIMPLE_GENERATORS[blockName];
    if (generator) {
      filled.push(blockName);
      return generator(manifest, fileType);
    }
    // Complex block — mark it for the active host
    marked.push(blockName);
    if (fileType === 'js') {
      return `/* CLAUDE_FILL: ${blockName} — filled by the active host during bootstrap */`;
    }
    if (fileType === 'py') {
      return `# CLAUDE_FILL: ${blockName} — filled by the active host during bootstrap`;
    }
    return `<!-- CLAUDE_FILL: ${blockName} — filled by the active host during bootstrap -->`;
  });

  return { content: result, filled, marked };
}

// ─────────────────────────────────────────────────────
// JSON GENERATE ISLEMCISI (settings.skeleton.json)
// ─────────────────────────────────────────────────────

/**
 * Processes __GENERATE__*__ keys in a JSON object.
 * Merges entries conditionally from the active modules.
 * @param {Object} obj - JSON object
 * @param {Object} manifest - Manifest data
 * @returns {{ obj: Object, filled: string[], marked: string[] }}
 */
function processJsonGenerateKeys(obj, manifest) {
  const filled = [];
  const marked = [];
  const activeModules = getActiveModules(manifest);

  function walk(node) {
    if (Array.isArray(node)) {
      return node.map(item => walk(item))
        .filter(item => {
          // Drop empty objects (leftovers from GENERATE blocks with no active module)
          if (item !== null && typeof item === 'object' && !Array.isArray(item) && Object.keys(item).length === 0) {
            return false;
          }
          return true;
        });
    }
    if (node && typeof node === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(node)) {
        // __doc__ anahtarlarini atla
        if (key === '__doc__') continue;

        // __GENERATE__*__ bloklari
        if (key.startsWith('__GENERATE__')) {
          const blockName = key.replace(/^__GENERATE__/, '').replace(/__$/, '');

          if (typeof value === 'object' && !Array.isArray(value)) {
            const entries = processConditionalBlock(value, activeModules, manifest);
            if (entries.length > 0) {
              filled.push(blockName);
              // Entries'i parent'a merge et
              for (const entry of entries) {
                if ('_mergeKey' in entry) {
                  // Root-level merge (ENABLED_PLUGINS gibi)
                  result[entry._mergeKey] = entry._mergeValue;
                } else if (entry._hookGroupEntry) {
                  // Tam hook grubu (matcher + hooks) — dogrudan result'a merge et
                  Object.assign(result, entry._hookGroupEntry);
                } else if (entry._hookEntry) {
                  // hooks array'ine ekleme
                  if (!result._pendingHooks) result._pendingHooks = [];
                  result._pendingHooks.push(entry._hookEntry);
                }
              }
            } else {
              marked.push(blockName);
            }
          }
          continue;
        }

        result[key] = walk(value);
      }

      // Merge _pendingHooks into the hooks array (create it when missing)
      if (result._pendingHooks) {
        if (!Array.isArray(result.hooks)) result.hooks = [];
        result.hooks.push(...result._pendingHooks);
        delete result._pendingHooks;
      }

      return result;
    }
    return node;
  }

  const processed = walk(obj);
  return { obj: processed, filled, marked };
}

/**
 * Processes conditional GENERATE blocks.
 * Each child key is a condition: "prisma_active" means include it when the prisma module is active.
 *
 * Uc entry tipi dondurur:
 * - { _hookEntry: {...} }       — tekil hook (hooks array'ine eklenir)
 * - { _hookGroupEntry: {...} }  — matcher + hooks grubu (array elemanina donusur)
 * - { _mergeKey, _mergeValue }  — root-level merge (ENABLED_PLUGINS gibi)
 */
function processConditionalBlock(block, activeModules, manifest) {
  const entries = [];
  const wrapperFields = {}; // scalar wrapper fields such as matcher

  for (const [condKey, value] of Object.entries(block)) {
    if (condKey === '__doc__') continue;

    // Condition check: "module_active" form (slash and hyphen allowed: nodejs/express_active, django-orm_active)
    const modulMatch = condKey.match(/^([\w/\-]+)_active$/);
    if (modulMatch) {
      const modulName = modulMatch[1];
      if (!activeModules.has(modulName)) continue;
    }

    // "forbidden_commands" special case
    if (condKey === 'forbidden_commands' && value.template) {
      const forbiddenRules = getForbiddenRules(manifest);
      for (const rule of forbiddenRules) {
        const command = value.template.command
          .replace('{{FORBIDDEN_PATTERN}}', escapeForJqShell(rule.pattern))
          .replace('{{FORBIDDEN_REASON}}', escapeForJqShell(rule.reason));
        entries.push({
          _hookEntry: {
            type: value.template.type,
            command,
            timeout: value.template.timeout,
          },
        });
      }
      continue;
    }

    // Wrapper field: a scalar value, not a condition (for example matcher: "Bash")
    if (!modulMatch && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')) {
      wrapperFields[condKey] = value;
      continue;
    }

    // Normal entry
    if (value && typeof value === 'object') {
      const cleanEntry = {};
      for (const [k, v] of Object.entries(value)) {
        if (k !== '__doc__') cleanEntry[k] = v;
      }
      if (Object.keys(cleanEntry).length > 0) {
        if ('type' in cleanEntry) {
          // Hook entry (has a type field → hook)
          entries.push({ _hookEntry: cleanEntry });
        } else {
          // Root-level merge (no type → merge each key-value pair on its own)
          for (const [mk, mv] of Object.entries(cleanEntry)) {
            entries.push({ _mergeKey: mk, _mergeValue: mv });
          }
        }
      }
    }
  }

  // When a wrapper field and a hook entry are both present → create a hook group (matcher + hooks)
  if (Object.keys(wrapperFields).length > 0) {
    const hookEntries = entries.filter(e => e._hookEntry).map(e => e._hookEntry);
    const otherEntries = entries.filter(e => !e._hookEntry);
    if (hookEntries.length > 0) {
      return [
        { _hookGroupEntry: { ...wrapperFields, hooks: hookEntries } },
        ...otherEntries,
      ];
    }
  }

  return entries;
}

// ─────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────

/**
 * Escapes text for a shell single quote and a jq double quote.
 * Used for pattern/reason values in the forbidden_commands template.
 * Note: pattern values are interpreted as regex inside jq test() —
 * regex metacharacters (.*[]() and similar) are not escaped as literals.
 */
/**
 * Shell-escapes a value for safe interpolation inside a bash script.
 * For path and value interpolation, not for whole commands.
 */
function escapeForShell(str) {
  if (!str || typeof str !== 'string') return str || '';
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

/**
 * Validates a command string from the manifest.
 * Adds a warning when a dangerous shell-chaining operator is detected.
 * Escaping the command would break execution — validate and warn instead.
 */
function sanitizeShellCommand(cmd) {
  if (!cmd || typeof cmd !== 'string') return cmd || '';
  // Reject command substitution that uses $() or backticks
  if (/\$\(|`/.test(cmd)) {
    return `echo "WARNING: unsafe command rejected: ${escapeForShell(cmd)}" >&2 && exit 1`;
  }
  return cmd;
}

function escapeForJqShell(str) {
  return str
    .replace(/\\/g, '\\\\')    // jq: \ → \\
    .replace(/"/g, '\\"')      // jq: " → \"
    .replace(/\n/g, '\\n')     // jq: newline → \n
    .replace(/\t/g, '\\t')     // jq: tab → \t
    .replace(/\$/g, '\\$')     // shell: $ → \$ (block variable interpolation)
    .replace(/'/g, "'\\''");   // shell: ' → '\''
}

/**
 * Checks whether a forbidden pattern is safe for jq test().
 * Nested quantifiers such as (a+)+, (a*)+, (a{2,})+ are a ReDoS risk.
 * @returns {boolean} true = safe
 */
function isJqRegexSafe(pattern) {
  if (!pattern || typeof pattern !== 'string') return false;
  // Nested quantifier: (...)[+*{n,}] followed by [+*{]
  if (/\([^)]*[+*][^)]*\)[+*]/.test(pattern)) return false;
  if (/\([^)]*\{[^}]*\}[^)]*\)[+*]/.test(pattern)) return false;
  // Over-long pattern (1000+ characters) is a timeout risk
  if (pattern.length > 1000) return false;
  return true;
}

/**
 * Manifest'ten aktif modul setini cikarir.
 */
function getActiveModules(manifest) {
  const modules = new Set();
  const active = manifest?.modules?.active;

  if (Array.isArray(active)) {
    active.forEach(m => modules.add(m));
  } else if (active && typeof active === 'object') {
    // Kategorili format: { orm: ["prisma"], backend: ["nodejs/express"], security: true, ... }
    for (const [key, values] of Object.entries(active)) {
      if (values === true) {
        // Ust seviye modul: key kendisi modul (security, monorepo)
        modules.add(key);
      } else if (Array.isArray(values)) {
        values.forEach(m => modules.add(m));
      } else if (typeof values === 'string') {
        modules.add(values);
      }
    }
  }

  // Standalone moduller: modules.standalone dizisi
  const standalone = manifest?.modules?.standalone;
  if (Array.isArray(standalone)) {
    standalone.forEach(m => modules.add(m));
  }

  return modules;
}

/**
 * Manifest'ten yasakli komut kurallarini cikarir.
 */
function getForbiddenRules(manifest) {
  const rules = [];
  const forbidden = manifest?.rules?.forbidden;
  if (!Array.isArray(forbidden)) return rules;

  for (const item of forbidden) {
    const type = item.type || item.hook_type;
    const pattern = item.pattern || item.command;
    if (type === 'block' && pattern && item.reason) {
      if (!isJqRegexSafe(pattern)) {
        console.warn(`  Warning: skipped an unsafe forbidden pattern (ReDoS risk): ${pattern.slice(0, 50)}`);
        continue;
      }
      rules.push({ pattern, reason: item.reason });
    }
  }
  return rules;
}

/**
 * Returns file extensions for the stack.
 */
function getFileExtensions(manifest) {
  // Use the manifest list when it is defined
  if (manifest?.stack?.file_extensions) {
    return manifest.stack.file_extensions;
  }

  const primary = manifest?.stack?.primary || '';
  const detected = manifest?.stack?.detected || [];
  const exts = new Set();

  const stackExtMap = {
    'node': ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
    'typescript': ['.ts', '.tsx'],
    'javascript': ['.js', '.jsx', '.mjs', '.cjs'],
    'python': ['.py'],
    'php': ['.php'],
    'ruby': ['.rb'],
    'go': ['.go'],
    'rust': ['.rs'],
    'java': ['.java', '.kt'],
    'dart': ['.dart'],
    'swift': ['.swift'],
  };

  // Config extensions (always)
  const configExts = ['.json', '.yaml', '.yml', '.env'];

  const allStacks = [primary.toLowerCase(), ...detected.map(s => s.toLowerCase())];
  for (const stack of allStacks) {
    for (const [key, vals] of Object.entries(stackExtMap)) {
      if (stack.includes(key)) {
        vals.forEach(e => exts.add(e));
      }
    }
  }

  // Add config extensions once at least one code extension was found
  if (exts.size > 0) {
    configExts.forEach(e => exts.add(e));
  }

  return Array.from(exts);
}

/**
 * Returns CODE file extensions for the stack (config excluded).
 */
function getCodeExtensions(manifest) {
  const allExts = getFileExtensions(manifest);
  const configExts = new Set(['.json', '.yaml', '.yml', '.env', '.toml', '.xml', '.ini', '.cfg', '.md', '.mdx', '.rst', '.txt']);
  return allExts.filter(e => !configExts.has(e));
}

function normalizeCodebaseRelativePath(value) {
  if (typeof value !== 'string') return null;
  let normalized = value.trim().replace(/\\/g, '/');
  if (!normalized) return null;
  normalized = normalized.replace(/^\.\//, '');
  normalized = normalized.replace(/^\.\.\/Codebase\//, '');
  normalized = normalized.replace(/^Codebase\//, '');
  if (normalized.startsWith('../') || path.isAbsolute(normalized)) return null;
  return normalized;
}

function uniqueNormalizedPaths(paths) {
  const seen = new Set();
  const result = [];
  for (const item of paths) {
    const normalized = normalizeCodebaseRelativePath(item);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result;
}

function getDocTargetPaths(manifest) {
  const structure = manifest?.project?.structure;
  const structureDocs = structure && typeof structure === 'object' && Array.isArray(structure.documents)
    ? structure.documents
    : null;
  const baseDocs = Array.isArray(manifest?.project?.documents)
    ? manifest.project.documents
    : structureDocs || ['README.md', 'CHANGELOG.md'];

  const activeModules = getActiveModules(manifest);
  const openApiActive = activeModules.has('openapi') || activeModules.has('api-docs/openapi') || activeModules.has('api-docs');
  const apiSpecPaths = openApiActive && Array.isArray(manifest?.project?.api_docs?.spec_paths)
    ? manifest.project.api_docs.spec_paths
    : [];

  return uniqueNormalizedPaths([...baseDocs, ...apiSpecPaths]);
}

function regexLiteralForPathPrefix(prefix) {
  const normalized = normalizeCodebaseRelativePath(prefix);
  if (!normalized || normalized === '.') return '/.*/';
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '\\/');
  return `/^${escaped}(?:\\/|$)/`;
}

function getDocCodePathPatterns(manifest) {
  const subprojects = manifest?.project?.subprojects || [];
  const paths = subprojects
    .map(sp => normalizeCodebaseRelativePath(sp?.path || sp?.name))
    .filter(Boolean);

  if (paths.length === 0) {
    return ['/^(src|app|apps|packages|lib)\\//'];
  }

  return [...new Set(paths)].map(regexLiteralForPathPrefix);
}

/**
 * Subproject bilgilerinden codebase path'ini cikarir.
 */
function getCodebasePath(manifest) {
  const structure = manifest?.project?.structure;
  if (structure && typeof structure === 'string') return structure;
  return '../Codebase';
}

/**
 * Normalizes a subproject path.
 * Keeps sp.path as-is when it already starts with ../ or /.
 * Joins a relative path (such as apps/api) onto codebasePath.
 * When sp.path is missing, returns codebasePath/sp.name.
 */
function getSubprojectPath(manifest, sp) {
  if (sp.path) {
    if (sp.path.startsWith('../') || sp.path.startsWith('/')) return sp.path;
    const cleanPath = sp.path.replace(/^\.\//, '');
    return `${getCodebasePath(manifest)}/${cleanPath}`;
  }
  return `${getCodebasePath(manifest)}/${sp.name}`;
}

/**
 * Checks whether TypeScript is active in the manifest.
 * True when stack.typescript is boolean true OR stack.detected contains "TypeScript".
 */
function hasTypeScript(manifest) {
  const stack = manifest?.stack || {};
  if (stack.typescript === true) return true;
  const detected = stack.detected || [];
  return detected.some(s => s.toLowerCase().includes('typescript'));
}

/**
 * Builds migration commands for the ORM type.
 */
function getMigrationCommands(manifest, ormType) {
  const codebasePath = getCodebasePath(manifest);
  const subprojects = manifest?.project?.subprojects || [];

  // Find the subproject that uses this ORM
  let ormPath = codebasePath;
  for (const sp of subprojects) {
    const spModules = sp.modules || {};
    const ormModules = spModules.orm || [];
    if (Array.isArray(ormModules) && ormModules.includes(ormType)) {
      ormPath = getSubprojectPath(manifest, sp);
      break;
    }
  }

  const commands = {
    prisma: [
      ['Validate schema', `cd "${ormPath}" && npx prisma validate`],
      ['Create migration', `cd "${ormPath}" && npx prisma migrate dev --name <description>`],
      ['Migration status', `cd "${ormPath}" && npx prisma migrate status`],
      ['Generate client', `cd "${ormPath}" && npx prisma generate`],
      ['Reset database (DEV only)', `cd "${ormPath}" && npx prisma migrate reset`],
      ['Run seed', `cd "${ormPath}" && npx prisma db seed`],
      ['Open Studio', `cd "${ormPath}" && npx prisma studio`],
    ],
    eloquent: [
      ['Create migration', `cd "${ormPath}" && php artisan make:migration <description>`],
      ['Run migration', `cd "${ormPath}" && php artisan migrate`],
      ['Roll back migration', `cd "${ormPath}" && php artisan migrate:rollback`],
      ['Migration status', `cd "${ormPath}" && php artisan migrate:status`],
      ['Reset database (DEV only)', `cd "${ormPath}" && php artisan migrate:fresh --seed`],
      ['Run seed', `cd "${ormPath}" && php artisan db:seed`],
    ],
    'django-orm': [
      ['Create migration', `cd "${ormPath}" && python manage.py makemigrations`],
      ['Run migration', `cd "${ormPath}" && python manage.py migrate`],
      ['Migration status', `cd "${ormPath}" && python manage.py showmigrations`],
      ['Preview SQL', `cd "${ormPath}" && python manage.py sqlmigrate <app> <migration>`],
    ],
    typeorm: [
      ['Create migration', `cd "${ormPath}" && npx typeorm migration:generate -n <description>`],
      ['Run migration', `cd "${ormPath}" && npx typeorm migration:run`],
      ['Roll back migration', `cd "${ormPath}" && npx typeorm migration:revert`],
      ['Sync schema', `cd "${ormPath}" && npx typeorm schema:sync`],
    ],
    knex: [
      ['Create migration', `cd "${ormPath}" && npx knex migrate:make <description>`],
      ['Run migration', `cd "${ormPath}" && npx knex migrate:latest`],
      ['Migration status', `cd "${ormPath}" && npx knex migrate:status`],
      ['Roll back migration', `cd "${ormPath}" && npx knex migrate:rollback`],
    ],
    sequelize: [
      ['Create migration', `cd "${ormPath}" && npx sequelize-cli migration:generate --name <description>`],
      ['Run migration', `cd "${ormPath}" && npx sequelize-cli db:migrate`],
      ['Migration status', `cd "${ormPath}" && npx sequelize-cli db:migrate:status`],
      ['Roll back migration', `cd "${ormPath}" && npx sequelize-cli db:migrate:undo`],
    ],
    supabase: [
      ['Create migration', `cd "${ormPath}" && supabase migration new <description>`],
      ['Diff schema', `cd "${ormPath}" && supabase db diff --schema public`],
      ['Apply migration', `cd "${ormPath}" && supabase db push`],
      ['List migrations', `cd "${ormPath}" && supabase migration list`],
    ],
  };

  return commands[ormType] || [];
}

function getDetectedOrm(manifest) {
  const detectedValue = manifest?.detected?.orm?.value;
  const stackValue = manifest?.stack?.orm;
  const value = detectedValue !== undefined ? detectedValue : stackValue;

  if (!value || value === 'none' || value === 'null') return null;
  return value;
}

function getDetectedDatabase(manifest) {
  return manifest?.detected?.database?.value
    || manifest?.project?.detected?.database
    || manifest?.stack?.database
    || null;
}

function getRawSqlMigrationRows(manifest) {
  const codebasePath = getCodebasePath(manifest);
  return [
    ['Create migration files', `mkdir -p "${codebasePath}/db/migrations" && touch "${codebasePath}/db/migrations/<timestamp>_<description>.up.sql" "${codebasePath}/db/migrations/<timestamp>_<description>.down.sql"`],
    ['Apply migration', `cd "${codebasePath}" && psql "$DATABASE_URL" -f db/migrations/<timestamp>_<description>.up.sql`],
    ['Apply rollback', `cd "${codebasePath}" && psql "$DATABASE_URL" -f db/migrations/<timestamp>_<description>.down.sql`],
  ];
}

function getDryRunCommand(manifest) {
  const orm = getDetectedOrm(manifest);
  const codebasePath = getCodebasePath(manifest);
  const commands = {
    prisma: 'npx prisma migrate dev --create-only --name <description>',
    typeorm: 'npx typeorm migration:show',
    eloquent: 'php artisan migrate --pretend',
    'django-orm': 'python manage.py sqlmigrate <app> <migration>',
    knex: 'npx knex migrate:latest --debug',
    sequelize: 'npx sequelize-cli db:migrate:status',
    supabase: 'supabase db diff --schema public',
  };

  return `cd "${codebasePath}" && ${commands[orm] || 'EXPLAIN < db/migrations/<timestamp>_<description>.up.sql'}`;
}

function getRollbackCommand(manifest) {
  const orm = getDetectedOrm(manifest);
  const codebasePath = getCodebasePath(manifest);
  const commands = {
    prisma: 'npx prisma migrate resolve --rolled-back <migration_name>',
    typeorm: 'npx typeorm migration:revert',
    eloquent: 'php artisan migrate:rollback --step=1',
    'django-orm': 'python manage.py migrate <app> <onceki_migration>',
    knex: 'npx knex migrate:rollback',
    sequelize: 'npx sequelize-cli db:migrate:undo',
    supabase: 'psql "$DATABASE_URL" -f supabase/migrations/<timestamp>_<description>.down.sql',
  };

  return `cd "${codebasePath}" && ${commands[orm] || 'psql "$DATABASE_URL" -f db/migrations/<timestamp>_<description>.down.sql'}`;
}

// ─────────────────────────────────────────────────────
// SIMPLE BLOCK GENERATORS
// ─────────────────────────────────────────────────────

/**
 * Generator map for simple (deterministic) GENERATE blocks.
 * Each generator: (manifest, fileType) => string
 *
 * fileType: 'md' | 'js'
 * md → returns Markdown content
 * js → JavaScript code dondurur (array icine yerlestirilir)
 */
const SIMPLE_GENERATORS = {

  // --- PATH BLOKLARI ---

  MEMORY_PATH(manifest) {
    const requestedPath = manifest?.paths?.memory || manifest?.project?.memory_path;
    const isSafeMemoryPath = typeof requestedPath === 'string'
      && (
        requestedPath === '.claude/memory'
        || requestedPath.startsWith('.claude/memory/')
        || requestedPath === 'Agentbase/.claude/memory'
        || requestedPath.startsWith('Agentbase/.claude/memory/')
      );
    const memoryPath = isSafeMemoryPath ? requestedPath : '.claude/memory';
    return [
      '## Memory path',
      '',
      `**Memory directory:** \`${memoryPath}\``,
      '',
      '- The Agentbase .claude/memory/ directory is the store',
      '- Memory files are not written into Codebase',
    ].join('\n');
  },

  PRISMA_PATH(manifest) {
    const codebasePath = getCodebasePath(manifest);
    const subprojects = manifest?.project?.subprojects || [];
    let prismaBase = codebasePath;

    for (const sp of subprojects) {
      const ormModules = sp.modules?.orm || [];
      if (Array.isArray(ormModules) && ormModules.includes('prisma')) {
        prismaBase = getSubprojectPath(manifest, sp);
        break;
      }
    }

    return [
      '## Prisma file locations',
      '',
      '| File | Path |',
      '|---|---|',
      `| Schema | \`${prismaBase}/prisma/schema.prisma\` |`,
      `| Migrations | \`${prismaBase}/prisma/migrations/\` |`,
      `| Seed | \`${prismaBase}/prisma/seed.ts\` |`,
      `| Client import | \`import { PrismaClient } from '@prisma/client'\` |`,
    ].join('\n');
  },

  LARAVEL_PATHS(manifest) {
    const codebasePath = getCodebasePath(manifest);
    return [
      '## Laravel file locations',
      '',
      '| File | Path |',
      '|---|---|',
      `| Routes | \`${codebasePath}/routes/\` |`,
      `| Controllers | \`${codebasePath}/app/Http/Controllers/\` |`,
      `| Models | \`${codebasePath}/app/Models/\` |`,
      `| Migrations | \`${codebasePath}/database/migrations/\` |`,
      `| Config | \`${codebasePath}/config/\` |`,
    ].join('\n');
  },

  DJANGO_PATHS(manifest) {
    const codebasePath = getCodebasePath(manifest);
    return [
      '## Django file locations',
      '',
      '| File | Path |',
      '|---|---|',
      `| Views | \`${codebasePath}/*/views.py\` |`,
      `| Models | \`${codebasePath}/*/models.py\` |`,
      `| URLs | \`${codebasePath}/*/urls.py\` |`,
      `| Migrations | \`${codebasePath}/*/migrations/\` |`,
      `| Settings | \`${codebasePath}/settings.py\` |`,
    ].join('\n');
  },

  TYPEORM_PATHS(manifest) {
    const codebasePath = getCodebasePath(manifest);
    return [
      '## TypeORM file locations',
      '',
      '| File | Path |',
      '|---|---|',
      `| Entities | \`${codebasePath}/src/entities/\` |`,
      `| Migrations | \`${codebasePath}/src/migrations/\` |`,
      `| Data Source | \`${codebasePath}/src/data-source.ts\` |`,
    ].join('\n');
  },

  DEPLOY_LOG_PATH(manifest) {
    return `## Deploy log path\n\n\`.claude/reports/deploys/\``;
  },

  HEALTH_CHECK_URL(manifest) {
    const envs = manifest?.environments || [];
    const prodEnv = envs.find(e => e.name === 'production' || e.name === 'prod');
    if (prodEnv?.health_check) {
      return `## Health Check\n\n\`${prodEnv.health_check}\``;
    }
    if (prodEnv?.url) {
      return `## Health Check\n\n\`${prodEnv.url}/health\``;
    }
    return `## Health Check\n\n\`<PROJECT_URL>/health\``;
  },

  // --- CONTEXT / ROOT-DOC BLOCKS (phase 2: fewer markers) ---
  // These blocks used to be CLAUDE_FILL. They can be produced faithfully from the manifest,
  // so they moved to a deterministic generator. Blocks that need real model judgment
  // (ARCHITECTURE, DATA_FLOW, DIRECTORY_MAP, REVIEW_CHECKLIST, CRITICAL_RULES, and similar)
  // stay CLAUDE_FILL on purpose.

  // Most common block: project context. Emitted without a heading — it sits under the
  // heading already in the skeleton.
  CODEBASE_CONTEXT(manifest) {
    const p = manifest?.project || {};
    const stack = manifest?.stack || {};
    const subprojects = Array.isArray(p.subprojects) ? p.subprojects : [];
    const detected = Array.isArray(stack.detected) ? stack.detected.filter(Boolean) : [];
    const stackLabel = stack.primary
      ? (detected.length ? `${stack.primary} (${detected.join(', ')})` : stack.primary)
      : (detected.length ? detected.join(', ') : '—');
    const lines = [];
    if (p.description) lines.push(p.description, '');
    lines.push(`- **Type:** ${p.type || 'single'}`);
    lines.push(`- **Stack:** ${stackLabel}`);
    const exts = Array.isArray(stack.file_extensions) ? stack.file_extensions : [];
    if (exts.length) lines.push(`- **File extensions:** ${exts.join(', ')}`);
    if (subprojects.length) {
      lines.push('', '**Subprojects:**');
      for (const sp of subprojects) {
        const role = sp.role ? ` — ${sp.role}` : '';
        const spStack = sp.stack ? ` (${sp.stack})` : '';
        lines.push(`- \`${getSubprojectPath(manifest, sp)}\` · ${sp.name}${role}${spStack}`);
      }
    }
    lines.push('', '> Invariant rules: config files live only inside Agentbase; a `.claude/` directory is not created inside Codebase; git runs only in Codebase.');
    return lines.join('\n');
  },

  PROFESSIONAL_STANCE(manifest) {
    const exp = manifest?.developer?.experience || 'mid';
    const texts = {
      senior: 'Do not flatter. Skip praise. Think like an engineer: short, concrete, technical. Answer the question directly. When you suggest something, state the trade-off; the developer decides.',
      mid: 'Be clear and pragmatic. At decision points, offer 2-3 alternatives and explain the trade-offs. Skip unnecessary detail.',
      junior: 'Explain in detail. Say why each decision was made. Give code examples. Guide step by step.',
      'new-to-stack': 'Explain stack-specific concepts. Show idiomatic patterns. Compare them with other stacks for context.',
    };
    return ['## Professional stance', '', texts[exp] || texts.mid].join('\n');
  },

  PROJECT_DEFINITION(manifest) {
    const p = manifest?.project || {};
    const subprojects = Array.isArray(p.subprojects) ? p.subprojects : [];
    const typeLabel = p.type === 'monorepo' ? 'Monorepo layout.' : 'Single-project layout.';
    const lines = ['## Project definition', '', `**${p.name || 'Project'}** — ${p.description || 'No description is defined.'} ${typeLabel}`];
    if (subprojects.length) {
      lines.push('', '| Subproject | Path | Role | Stack |', '|---|---|---|---|');
      for (const sp of subprojects) {
        lines.push(`| ${sp.name || '—'} | \`${getSubprojectPath(manifest, sp)}\` | ${sp.role || '—'} | ${sp.stack || '—'} |`);
      }
    }
    return lines.join('\n');
  },

  TECH_STACK(manifest) {
    const s = manifest?.stack || {};
    const rows = [];
    const add = (k, v) => { if (v) rows.push(`| ${k} | ${v} |`); };
    add('Runtime', s.runtime ? `${s.runtime}${s.runtime_version ? ` ${s.runtime_version}` : ''}` : null);
    add('Dil', hasTypeScript(manifest) ? 'TypeScript' : (manifest?.project?.language || null));
    add('ORM', s.orm);
    add('Database', s.database);
    add('Auth', s.auth_method && s.auth_method !== 'none' ? s.auth_method : null);
    add('Test', s.test_framework);
    add('Lint', s.linter);
    add('Format', s.formatter);
    add('Package manager', s.package_manager);
    if (!rows.length) return '## Technology stack\n\n_No stack is defined in the manifest._';
    return ['## Technology stack', '', '| Layer | Technology |', '|---|---|', ...rows].join('\n');
  },

  ENVIRONMENTS(manifest) {
    const envs = Array.isArray(manifest?.environments) ? manifest.environments : [];
    if (!envs.length) return '## Environments\n\n_No environment is defined._';
    const rows = envs.map((e) => {
      const url = e.url || e.api_url || '—';
      const deploy = [e.deploy_platform, e.deploy_trigger].filter(Boolean).join(', ') || '—';
      const name = e.name ? e.name.charAt(0).toUpperCase() + e.name.slice(1) : '—';
      return `| ${name} | ${url} | ${deploy} |`;
    });
    return ['## Environments', '', '| Environment | URL | Deploy |', '|---|---|---|', ...rows].join('\n');
  },

  COMMANDS(manifest) {
    const p = manifest?.project || {};
    const subprojects = Array.isArray(p.subprojects) ? p.subprojects : [];
    const pm = manifest?.stack?.package_manager || 'npm';
    const lines = ['## Development commands', ''];
    const formatCommand = (dir, cmd) => cmd.startsWith('cd ') ? cmd : `cd "${dir}" && ${cmd}`;
    if (subprojects.length) {
      for (const sp of subprojects) {
        const dir = getSubprojectPath(manifest, sp);
        const cmds = [
          [sp.dev_command || `${pm} run dev`, 'Dev server'],
          [sp.test_command || `${pm} test`, 'Tests'],
          [sp.build_command || `${pm} run build`, 'Build'],
        ];
        lines.push(`### ${sp.name} (from \`${dir}\`)`, '```bash',
          ...cmds.map(([c, l]) => `${formatCommand(dir, c)}      # ${l}`), '```', '');
      }
    } else {
      const dir = getCodebasePath(manifest);
      const sc = p.scripts || {};
      const cmds = [
        [sc.dev || `${pm} run dev`, 'Dev server'],
        [sc.test || `${pm} test`, 'Tests'],
        [sc.build || `${pm} run build`, 'Build'],
      ];
      lines.push(`### from \`${dir}\``, '```bash',
        ...cmds.map(([c, l]) => `${formatCommand(dir, c)}      # ${l}`), '```', '');
    }
    return lines.join('\n').trimEnd();
  },

  CONVENTIONS(manifest) {
    const wf = manifest?.workflows || {};
    const domain = Array.isArray(manifest?.rules?.domain) ? manifest.rules.domain : [];
    const lines = ['## Conventions', '', '### Commit format'];
    const cc = wf.commit_convention || 'conventional';
    if (cc === 'conventional') {
      const map = wf.commit_prefix_map || {
        feat: 'New feature', fix: 'Bug fix', refactor: 'Restructure',
        docs: 'Documentation', test: 'Test', chore: 'Maintenance',
      };
      lines.push('Conventional Commits (English):');
      for (const [k, v] of Object.entries(map)) lines.push(`- \`${k}: ${v}\``);
    } else {
      lines.push(`Commit format: ${cc}.`);
    }
    lines.push('', '### Language', 'Workflow instructions, commit messages produced by this workflow, and agent-written documentation are English.');
    if (domain.length) {
      lines.push('', '### Domain rules');
      for (const d of domain) {
        if (typeof d === 'string') lines.push(`- ${d}`);
        else if (d && d.rule) lines.push(`- ${d.name ? `**${d.name}:** ` : ''}${d.rule}`);
      }
    }
    return lines.join('\n');
  },

  PROJECT_CONVENTIONS(manifest) {
    const domain = Array.isArray(manifest?.rules?.domain) ? manifest.rules.domain : [];
    const docblock = manifest?.conventions?.docblock;
    const lines = [];
    for (const d of domain) {
      if (typeof d === 'string') lines.push(`- ${d}`);
      else if (d && d.rule) lines.push(`- ${d.name ? `**${d.name}:** ` : ''}${d.rule}`);
    }
    if (docblock === 'required') lines.push('- Document every public function with a docblock/JSDoc comment.');
    if (!lines.length) return '_No extra project conventions are defined._';
    return lines.join('\n');
  },

  FORBIDDEN_OPERATIONS(manifest) {
    const forbidden = Array.isArray(manifest?.rules?.forbidden) ? manifest.rules.forbidden : [];
    if (!forbidden.length) return '_No forbidden operation is defined in the manifest._';
    const rows = forbidden.map((f) => {
      const cmd = f.command || f.pattern || '—';
      const reason = f.reason || '—';
      const hook = f.hook_type || f.type || 'hook';
      return `| \`${cmd}\` | ${reason} | ${hook} |`;
    });
    return ['| Command | Reason | Guard |', '|---|---|---|', ...rows].join('\n');
  },

  // --- KOMUT TABLOLARI ---

  DETECTED_ORM(manifest) {
    const orm = getDetectedOrm(manifest);
    const database = getDetectedDatabase(manifest);
    const confidence = manifest?.detected?.orm?.confidence || (orm ? 'stack.orm' : 'none');
    const source = manifest?.detected?.orm?.source || (orm ? 'stack.orm' : 'not detected');

    return [
      '## ORM / database detection',
      '',
      `- **ORM:** \`${orm || 'none'}\``,
      `- **Confidence:** \`${confidence}\``,
      `- **Source:** \`${source}\``,
      `- **Database:** \`${database || 'unknown'}\``,
      '',
      orm
        ? 'An ORM was detected, so migration, dry-run, and rollback commands follow that technology.'
        : 'No ORM was detected. Raw SQL discipline applies: every change needs a matching `up.sql` and `down.sql`.',
    ].join('\n');
  },

  MIGRATION_COMMANDS(manifest) {
    const orm = getDetectedOrm(manifest);
    if (!orm) {
      const rows = getRawSqlMigrationRows(manifest).map(([label, cmd]) => `| ${label} | \`${cmd}\` |`);
      return [
        '## Migration commands',
        '',
        'No ORM was detected. Raw SQL is the fallback; create matching `up.sql` and `down.sql` files.',
        '',
        '| Action | Command |',
        '|---|---|',
        ...rows,
      ].join('\n');
    }

    const commands = getMigrationCommands(manifest, orm);
    if (commands.length === 0) return `## Migration commands\n\n${orm} has no command defined.`;

    const rows = commands.map(([label, cmd]) => `| ${label} | \`${cmd}\` |`);
    return [
      '## Migration commands',
      '',
      '| Action | Command |',
      '|---|---|',
      ...rows,
      '',
      '> **WARNING:** Reset commands are for the development environment only.',
    ].join('\n');
  },

  DRY_RUN_COMMAND(manifest) {
    return [
      '## Dry-run / preview command',
      '',
      'Run the preview or dry-run command before applying a migration to production or a shared environment.',
      '',
      '```bash',
      getDryRunCommand(manifest),
      '```',
    ].join('\n');
  },

  ROLLBACK_COMMAND(manifest) {
    return [
      '## Rollback / down command',
      '',
      'A rollback command or down SQL file must be ready before a schema change is applied.',
      '',
      '```bash',
      getRollbackCommand(manifest),
      '```',
    ].join('\n');
  },

  COMMIT_CONVENTION(manifest) {
    const convention = manifest?.workflows?.commit_convention || 'conventional';
    const prefixMap = manifest?.workflows?.commit_prefix_map || {
      feat: 'New feature',
      fix: 'Bug fix',
      refactor: 'Restructure without a behavior change',
      docs: 'Documentation',
      test: 'Add or update tests',
      chore: 'Maintenance',
      style: 'Format or style',
      perf: 'Performance',
      ci: 'CI/CD change',
    };

    const rows = Object.entries(prefixMap)
      .map(([prefix, desc]) => `| \`${prefix}:\` | ${desc} |`);

    return [
      '## Commit convention',
      '',
      `Type: **${convention}**`,
      '',
      '| Prefix | Description |',
      '|---|---|',
      ...rows,
      '',
      'Example: `feat: add user registration form`',
    ].join('\n');
  },

  NAMING_RULES(manifest) {
    const naming = manifest?.conventions?.naming || 'camelCase';
    const fileNaming = manifest?.conventions?.file_naming || 'kebab-case';
    const componentNaming = manifest?.conventions?.component_naming || null;

    const namingMap = {
      camelCase: {
        variable: ['camelCase', '`userName`, `isActive`'],
        function: ['camelCase', '`getUserById`, `calculateTotal`'],
        constant: ['UPPER_SNAKE_CASE', '`MAX_RETRY`, `API_URL`'],
        class: ['PascalCase', '`UserService`, `PaymentController`'],
      },
      snake_case: {
        variable: ['snake_case', '`user_name`, `is_active`'],
        function: ['snake_case', '`get_user_by_id`, `calculate_total`'],
        constant: ['UPPER_SNAKE_CASE', '`MAX_RETRY`, `API_URL`'],
        class: ['PascalCase', '`UserService`, `PaymentController`'],
      },
      PascalCase: {
        variable: ['camelCase', '`userName`, `isActive`'],
        function: ['camelCase', '`getUserById`, `calculateTotal`'],
        constant: ['UPPER_SNAKE_CASE', '`MAX_RETRY`, `API_URL`'],
        class: ['PascalCase', '`UserService`, `PaymentController`'],
      },
    };

    const rules = namingMap[naming] || namingMap.camelCase;
    const rows = Object.entries(rules).map(([k, [fmt, ex]]) =>
      `| ${k} | ${fmt} | ${ex} |`
    );

    const lines = [
      `### Naming: ${naming}`,
      '',
      '| Item | Format | Example |',
      '|-----|--------|-------|',
      ...rows,
    ];

    if (componentNaming) {
      lines.push('', `**Component naming:** ${componentNaming}`);
    }

    lines.push('', `### File naming: ${fileNaming}`);

    return lines.join('\n');
  },

  VERIFICATION_COMMANDS(manifest) {
    const subprojects = manifest?.project?.subprojects || [];
    const testCommands = manifest?.stack?.test_commands || {};

    if (subprojects.length > 0) {
      const rows = subprojects.map(sp => {
        const cmd = sp.test_command || testCommands[sp.name] || 'npm test';
        const spPath = getSubprojectPath(manifest, sp);
        const fullCmd = cmd.startsWith('cd ') ? cmd : `cd "${spPath}" && ${cmd}`;
        return `| ${sp.name} | \`${fullCmd}\` |`;
      });

      return [
        '## Verification commands',
        '',
        '| Subproject | Command |',
        '|---|---|',
        ...rows,
      ].join('\n');
    }

    // Tek proje
    const codebasePath = getCodebasePath(manifest);
    const testCmd = manifest?.project?.scripts?.test || 'npm test';
    return [
      '## Verification commands',
      '',
      '| Action | Command |',
      '|---|---|',
      `| Test | \`${testCmd.startsWith('cd ') ? testCmd : `cd "${codebasePath}" && ${testCmd}`}\` |`,
    ].join('\n');
  },

  TEST_COMMANDS(manifest) {
    // VERIFICATION_COMMANDS ile ayni mantik
    return SIMPLE_GENERATORS.VERIFICATION_COMMANDS(manifest);
  },

  COMPILE_COMMANDS(manifest) {
    const subprojects = manifest?.project?.subprojects || [];
    const codebasePath = getCodebasePath(manifest);

    if (subprojects.length > 0) {
      const rows = subprojects
        .filter(sp => sp.build_command || sp.scripts?.build)
        .map(sp => {
          const cmd = sp.build_command || sp.scripts?.build || 'npm run build';
          const spPath = getSubprojectPath(manifest, sp);
          return `| ${sp.name} | \`cd "${spPath}" && ${cmd}\` |`;
        });

      if (rows.length === 0) return '## Build commands\n\nNo build command is defined.';
      return ['## Build commands', '', '| Subproject | Command |', '|---|---|', ...rows].join('\n');
    }

    const buildCmd = manifest?.project?.scripts?.build || 'npm run build';
    return [
      '## Build commands',
      '',
      '| Action | Command |',
      '|---|---|',
      `| Build | \`cd "${codebasePath}" && ${buildCmd}\` |`,
    ].join('\n');
  },

  BUILD_COMMANDS(manifest) {
    return SIMPLE_GENERATORS.COMPILE_COMMANDS(manifest);
  },

  // --- EXTENSION LISTS (JS format is special) ---

  FILE_EXTENSIONS(manifest, fileType) {
    const exts = getFileExtensions(manifest);
    if (exts.length === 0) return fileType === 'js' ? "'.js', '.ts'" : '`.js`, `.ts`';

    if (fileType === 'js') {
      return exts.map(e => `'${e}'`).join(', ');
    }
    return exts.map(e => `\`${e}\``).join(', ');
  },

  CODE_EXTENSIONS(manifest, fileType) {
    const exts = getCodeExtensions(manifest);
    if (exts.length === 0) return fileType === 'js' ? "'.js', '.ts'" : '`.js`, `.ts`';

    if (fileType === 'js') {
      return exts.map(e => `'${e}'`).join(', ');
    }
    return exts.map(e => `\`${e}\``).join(', ');
  },

  DOC_TARGET_PATHS(manifest, fileType) {
    const paths = getDocTargetPaths(manifest);
    if (fileType === 'js') {
      return paths.map(p => JSON.stringify(p)).join(',\n  ');
    }
    return paths.map(p => `\`${p}\``).join('\n');
  },

  CODE_PATH_PATTERNS(manifest, fileType) {
    const patterns = getDocCodePathPatterns(manifest);
    if (fileType === 'js') {
      return patterns.join(',\n  ');
    }
    return patterns.map(p => `\`${p}\``).join('\n');
  },

  STACK_SPECIFIC_IGNORES(manifest) {
    const primary = manifest?.stack?.primary || '';
    const detected = manifest?.stack?.detected || [];
    const lines = [];

    const allStacks = [primary.toLowerCase(), ...detected.map(s => s.toLowerCase())];

    if (allStacks.some(s => s.includes('node'))) {
      lines.push('node_modules/', 'dist/', '.next/', '.nuxt/', '.expo/');
    }
    if (allStacks.some(s => s.includes('python'))) {
      lines.push('__pycache__/', '*.pyc', '.venv/', 'venv/');
    }
    if (allStacks.some(s => s.includes('php'))) {
      lines.push('vendor/', 'storage/');
    }
    if (allStacks.some(s => s.includes('dart') || s.includes('flutter'))) {
      lines.push('.dart_tool/', 'build/');
    }
    if (allStacks.some(s => s.includes('go'))) {
      lines.push('vendor/');
    }

    return lines.join('\n');
  },

  // --- JS-SPESIFIK BLOKLAR ---

  SECURITY_PATTERNS(manifest, fileType) {
    const primary = manifest?.stack?.primary || '';
    const detected = manifest?.stack?.detected || [];
    const allStacks = [primary.toLowerCase(), ...detected.map(s => s.toLowerCase())];
    const patterns = [];

    if (allStacks.some(s => s.includes('node') || s.includes('express') || s.includes('fastify') || s.includes('nest'))) {
      patterns.push(
        "{ pattern: /eval\\s*\\(/, severity: 'CRITICAL', message: 'eval() usage detected' }",
        "{ pattern: /res\\.send\\(.*req\\.(body|query|params)/, severity: 'HIGH', message: 'Request input is reflected in the response (XSS risk)' }",
      );
    }
    if (allStacks.some(s => s.includes('prisma'))) {
      patterns.push(
        "{ pattern: /\\$queryRaw\\s*`[^`]*\\$\\{/, severity: 'CRITICAL', message: 'Interpolation in a raw query — SQL injection risk' }",
        "{ pattern: /\\$executeRaw\\s*`[^`]*\\$\\{/, severity: 'CRITICAL', message: 'Interpolation in a raw execute — SQL injection risk' }",
      );
    }
    if (allStacks.some(s => s.includes('php') || s.includes('laravel'))) {
      patterns.push(
        "{ pattern: /\\$_(GET|POST|REQUEST)\\[/, severity: 'HIGH', message: 'Raw superglobal usage — sanitize before use' }",
      );
    }
    if (allStacks.some(s => s.includes('react'))) {
      patterns.push(
        "{ pattern: /dangerouslySetInnerHTML/, severity: 'HIGH', message: 'dangerouslySetInnerHTML usage — XSS risk' }",
      );
    }
    if (allStacks.some(s => s.includes('django') || s.includes('python'))) {
      patterns.push(
        "{ pattern: /\\.raw\\s*\\([^)]*%/, severity: 'CRITICAL', message: 'String formatting in raw SQL — SQL injection risk' }",
        "{ pattern: /mark_safe\\s*\\(/, severity: 'HIGH', message: 'mark_safe usage — XSS risk' }",
      );
    }

    if (fileType === 'js') {
      return patterns.length > 0 ? '  ' + patterns.join(',\n  ') + ',' : '';
    }
    return patterns.join('\n');
  },

  LAYER_TESTS(manifest, fileType) {
    const subprojects = manifest?.project?.subprojects || [];
    const testCommands = manifest?.stack?.test_commands || {};

    if (fileType !== 'js') return '';

    // Stack-spesifik ek dizinler (src/ disinda test hatirlatmasi tetikleyecek dizinler)
    const extraDirs = [];
    const orm = (manifest?.stack?.orm || '').toLowerCase();
    const detected = (manifest?.stack?.detected || []).map(s => s.toLowerCase());

    if (orm === 'prisma') extraDirs.push('prisma');
    if (orm === 'eloquent' || detected.includes('laravel')) extraDirs.push('database');
    if (detected.includes('laravel')) extraDirs.push('app', 'routes');
    if (detected.includes('next.js') || detected.includes('nextjs')) extraDirs.push('app', 'pages');
    if (detected.includes('express')) extraDirs.push('routes');

    const entries = [];
    for (const sp of subprojects) {
      const resolvedPath = getSubprojectPath(manifest, sp);
      const spPath = resolvedPath.replace(/\.\.\//g, '').replace(/\//g, '\\/');
      const cmd = sp.test_command || testCommands[sp.name] || 'npm test';
      const fullCmd = cmd.startsWith('cd ') ? cmd : `cd "${resolvedPath}" && ${cmd}`;

      const dirs = [...new Set(['src', ...extraDirs])];
      for (const dir of dirs) {
        entries.push(
          `  { pattern: /${spPath}\\/${dir}\\//, layer: '${sp.name}', command: '${fullCmd}', extra: null }`
        );
      }
    }

    return entries.length > 0 ? entries.join(',\n') + ',' : '';
  },

  SUBPROJECT_CONFIGS(manifest, fileType) {
    const subprojects = manifest?.project?.subprojects || [];
    const formatter = manifest?.stack?.formatter || 'prettier';
    const formatterConfigMap = {
      prettier: '.prettierrc',
      biome: 'biome.json',
    };

    if (fileType !== 'js') return '';

    const entries = subprojects.map(sp => {
      // Hook icinde path.relative(CODEBASE_ROOT, filePath) ile karsilastirilacak
      // Bu yuzden Codebase-relative path kullanilmali (../Codebase/ prefix'i olmadan)
      const spRelativePath = sp.path
        ? sp.path.replace(/^\.\.\/Codebase\//, '').replace(/^\.\//, '')
        : sp.name;
      const configFile = formatterConfigMap[formatter] || '.prettierrc';
      return `  { name: '${sp.name}', path: '${spRelativePath}', configFile: '${configFile}', formatter: '${formatter}' }`;
    });

    return entries.length > 0 ? entries.join(',\n') + ',' : '';
  },

  SMOKE_TEST_ENDPOINTS(manifest) {
    const envs = manifest?.environments || [];
    const prodEnv = envs.find(e => e.name === 'production' || e.name === 'prod');
    const url = prodEnv?.url || '<PROJECT_URL>';
    const healthCheck = prodEnv?.health_check;
    const rawPrefix = manifest?.project?.api_prefix || '';
    const apiPrefix = rawPrefix && !rawPrefix.startsWith('/') ? '/' + rawPrefix : rawPrefix;
    const apiEndpoints = manifest?.api_endpoints || [];

    const rows = [];

    // Health check endpoint — always included
    const healthUrl = healthCheck || `${url}/health`;
    rows.push(`| \`GET ${healthUrl}\` | 200 OK | — |`);

    if (apiEndpoints.length > 0) {
      // Dynamic endpoint list (from manifest.api_endpoints)
      for (const ep of apiEndpoints) {
        const method = (ep.method || 'GET').toUpperCase();
        const epPath = ep.path || '/';
        const expectedStatus = parseInt(ep.response, 10) || 200;
        const auth = ep.auth === 'required' ? 'Authorization required' : '—';
        rows.push(`| \`${method} ${url}${epPath}\` | ${expectedStatus} | ${auth} |`);
      }
    } else {
      // Fallback: fixed status endpoint (when api_endpoints is absent)
      const statusUrl = `${url}${apiPrefix}/status`;
      rows.push(`| \`GET ${statusUrl}\` | 200 OK | — |`);
    }

    return [
      '## Smoke test endpoints',
      '',
      '| Endpoint | Expected | Auth |',
      '|---|---|---|',
      ...rows,
    ].join('\n');
  },

  // --- API SMOKE TEST SCRIPT ---

  API_SMOKE_SCRIPT(manifest) {
    const envs = manifest?.environments || [];
    const prodEnv = envs.find(e => e.name === 'production' || e.name === 'prod');
    const url = prodEnv?.url || '<PROJECT_URL>';
    const healthCheck = prodEnv?.health_check;
    const apiEndpoints = manifest?.api_endpoints || [];
    const rawPrefix = manifest?.project?.api_prefix || '';
    const apiPrefix = rawPrefix && !rawPrefix.startsWith('/') ? '/' + rawPrefix : rawPrefix;

    const healthUrl = healthCheck || `${url}/health`;
    const lines = [
      '#!/bin/bash',
      '# Smoke test script — generated from the manifest',
      '# Usage: bash smoke-test.sh [TOKEN]',
      '',
      'ERRORS=0',
      'TOKEN="${1:-$SMOKE_TEST_TOKEN}"',
      '',
      'check() {',
      '  local method="$1" url="$2" expected="$3" auth="$4"',
      '  local args=(-sf -o /dev/null -w "%{http_code}")',
      '  [ "$method" != "GET" ] && args+=(-X "$method")',
      '  [ -n "$auth" ] && args+=(-H "Authorization: Bearer $TOKEN")',
      '  local status=$(curl "${args[@]}" "$url")',
      '  if [ "$status" = "$expected" ]; then',
      '    echo "✅ $method $url → $status"',
      '  else',
      '    echo "❌ $method $url → $status (expected: $expected)"',
      '    ERRORS=$((ERRORS + 1))',
      '  fi',
      '}',
      '',
      `echo "━━━ Smoke Test: ${url} ━━━"`,
      '',
      `check GET "${healthUrl}" 200`,
    ];

    if (apiEndpoints.length > 0) {
      for (const ep of apiEndpoints) {
        const method = (ep.method || 'GET').toUpperCase();
        const epPath = ep.path || '/';
        const expected = ep.response || 200;
        const auth = ep.auth === 'required' ? 'auth' : '';
        lines.push(`check ${method} "${url}${epPath}" ${expected}${auth ? ' auth' : ''}`);
      }
    } else {
      const statusUrl = `${url}${apiPrefix}/status`;
      lines.push(`check GET "${statusUrl}" 200`);
    }

    lines.push(
      '',
      'echo ""',
      'if [ "$ERRORS" -ne 0 ]; then',
      '  echo "━━━ Smoke test FAILED ($ERRORS errors) ━━━"',
      '  exit 1',
      'fi',
      'echo "━━━ Smoke test PASSED ━━━"',
    );

    return lines.join('\n');
  },

  API_SMOKE_NODE_TESTS(manifest) {
    const envs = manifest?.environments || [];
    const prodEnv = envs.find(e => e.name === 'production' || e.name === 'prod');
    const url = prodEnv?.url || '<PROJECT_URL>';
    const healthCheck = prodEnv?.health_check;
    const apiEndpoints = manifest?.api_endpoints || [];
    const rawPrefix = manifest?.project?.api_prefix || '';
    const apiPrefix = rawPrefix && !rawPrefix.startsWith('/') ? '/' + rawPrefix : rawPrefix;

    const healthUrl = healthCheck || `${url}/health`;
    const lines = [
      "'use strict';",
      "const { describe, it } = require('node:test');",
      "const assert = require('node:assert/strict');",
      '',
      `const BASE_URL = process.env.SMOKE_TEST_URL || '${url}';`,
      "const TOKEN = process.env.SMOKE_TEST_TOKEN || '';",
      '',
      "async function check(method, path, expectedStatus, auth) {",
      "  const headers = {};",
      "  if (auth && TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;", // eslint-disable-line no-template-curly-in-string
      "  const res = await fetch(`${BASE_URL}${path}`, { method, headers });", // eslint-disable-line no-template-curly-in-string
      "  assert.strictEqual(res.status, expectedStatus, `${method} ${path} → ${res.status} (expected: ${expectedStatus})`);", // eslint-disable-line no-template-curly-in-string
      '}',
      '',
      "describe('API Smoke Tests', () => {",
    ];

    // Health check
    const healthPath = healthUrl.replace(url, '');
    lines.push(`  it('GET ${healthPath} → 200', () => check('GET', '${healthPath}', 200));`);

    if (apiEndpoints.length > 0) {
      for (const ep of apiEndpoints) {
        const method = (ep.method || 'GET').toUpperCase();
        const epPath = ep.path || '/';
        const expected = ep.response || 200;
        const auth = ep.auth === 'required';
        lines.push(`  it('${method} ${epPath} → ${expected}', () => check('${method}', '${epPath}', ${expected}${auth ? ', true' : ''}));`);
      }
    } else {
      const statusPath = `${apiPrefix}/status`;
      lines.push(`  it('GET ${statusPath} → 200', () => check('GET', '${statusPath}', 200));`);
    }

    lines.push('});');

    return lines.join('\n');
  },

  // --- TEST FILE MAPPING ---

  TEST_FILE_MAPPING(manifest, fileType) {
    if (fileType !== 'js') return '';

    const stack = (manifest?.stack?.primary || '').toLowerCase();
    const detected = (manifest?.stack?.detected || []).map(s => s.toLowerCase());
    const testFramework = manifest?.stack?.test_framework || 'jest';
    const entries = [];

    // Node.js / TypeScript pattern'leri
    if (stack.includes('node') || detected.includes('typescript') || detected.includes('react')) {
      const ext = detected.includes('typescript') ? 'ts' : 'js';
      const dirs = ['controllers', 'services', 'utils', 'middleware', 'helpers', 'lib'];
      for (const dir of dirs) {
        entries.push(
          `  { sourcePattern: /(.+)\\/${dir}\\/(.+)\\.(${ext}x?|[jt]sx?)$/, testPath: '$1/__tests__/${dir}/$2.test.$3', framework: '${testFramework}' }`
        );
      }
      // React/RN component ve screen pattern'leri
      if (detected.includes('react') || detected.includes('expo') || detected.includes('react native')) {
        for (const dir of ['components', 'screens', 'hooks', 'context']) {
          entries.push(
            `  { sourcePattern: /(.+)\\/${dir}\\/(.+)\\.(tsx?|jsx?)$/, testPath: '$1/__tests__/${dir}/$2.test.$3', framework: '${testFramework}' }`
          );
        }
      }
    }

    // Python pattern'leri
    if (stack.includes('python') || detected.includes('django') || detected.includes('fastapi')) {
      const dirs = ['views', 'models', 'serializers', 'services', 'utils'];
      for (const dir of dirs) {
        entries.push(
          `  { sourcePattern: /(.+)\\/${dir}\\/(.+)\\.py$/, testPath: '$1/tests/test_$2.py', framework: '${testFramework}' }`
        );
      }
    }

    // PHP/Laravel pattern'leri
    if (stack.includes('php') || detected.includes('laravel')) {
      entries.push(
        `  { sourcePattern: /(.+)\\/Http\\/Controllers\\/(.+)\\.php$/, testPath: '$1/../tests/Feature/$2Test.php', framework: '${testFramework}' }`,
        `  { sourcePattern: /(.+)\\/Models\\/(.+)\\.php$/, testPath: '$1/../tests/Unit/$2Test.php', framework: '${testFramework}' }`,
        `  { sourcePattern: /(.+)\\/Services\\/(.+)\\.php$/, testPath: '$1/../tests/Unit/$2Test.php', framework: '${testFramework}' }`
      );
    }

    return entries.length > 0 ? entries.join(',\n') + ',' : '';
  },

  TEST_FILE_TABLE(manifest) {
    const stack = (manifest?.stack?.primary || '').toLowerCase();
    const detected = (manifest?.stack?.detected || []).map(s => s.toLowerCase());
    const testFramework = manifest?.stack?.test_framework || 'jest';
    const rows = [];

    if (stack.includes('node') || detected.includes('typescript') || detected.includes('react')) {
      const ext = detected.includes('typescript') ? 'ts' : 'js';
      rows.push(
        `| \`controllers/{name}.${ext}\` | \`__tests__/controllers/{name}.test.${ext}\` | ${testFramework} |`,
        `| \`services/{name}.${ext}\` | \`__tests__/services/{name}.test.${ext}\` | ${testFramework} |`,
        `| \`utils/{name}.${ext}\` | \`__tests__/utils/{name}.test.${ext}\` | ${testFramework} |`
      );
      if (detected.includes('react') || detected.includes('expo')) {
        rows.push(
          `| \`components/{name}.tsx\` | \`__tests__/components/{name}.test.tsx\` | ${testFramework} |`,
          `| \`screens/{name}.tsx\` | \`__tests__/screens/{name}.test.tsx\` | ${testFramework} |`
        );
      }
    }

    if (stack.includes('python') || detected.includes('django')) {
      rows.push(
        `| \`views/{name}.py\` | \`tests/test_{name}.py\` | ${testFramework} |`,
        `| \`models/{name}.py\` | \`tests/test_{name}.py\` | ${testFramework} |`,
        `| \`serializers/{name}.py\` | \`tests/test_{name}.py\` | ${testFramework} |`
      );
    }

    if (stack.includes('php') || detected.includes('laravel')) {
      rows.push(
        `| \`Http/Controllers/{name}.php\` | \`tests/Feature/{name}Test.php\` | ${testFramework} |`,
        `| \`Models/{name}.php\` | \`tests/Unit/{name}Test.php\` | ${testFramework} |`
      );
    }

    if (rows.length === 0) return '';

    return [
      '| Source pattern | Test file | Framework |',
      '|---|---|---|',
      ...rows,
    ].join('\n');
  },

  // --- TASK ROUTING CONFIG ---

  TASK_ROUTING_CONFIG(manifest) {
    const testStrategy = manifest?.workflows?.test_strategy || 'none';
    const securityLevel = manifest?.project?.security_level || 'standard';

    const redGreenActive = testStrategy.toLowerCase() === 'tdd' ? 'active' : 'inactive';
    const dualPassActive = securityLevel.toLowerCase() === 'high' ? 'active' : 'inactive';

    return [
      '#### Project configuration (manifest)',
      '',
      `- **Test strategy:** \`${testStrategy}\` — Red-Green modifier is ${redGreenActive}`,
      `- **Security level:** \`${securityLevel}\` — Dual-Pass modifier is ${dualPassActive}`,
    ].join('\n');
  },

  // --- GIT HOOK BLOCKS (bash script output) ---

  GIT_PRECOMMIT_COMPILE(manifest) {
    const stack = manifest?.stack || {};
    const lines = [];

    if (hasTypeScript(manifest)) {
      lines.push(
        'echo "→ TypeScript compile check..."',
        `cd "$CODEBASE_DIR" && npx tsc --noEmit 2>&1 || {`,
        '  echo "❌ TypeScript compile failed!"',
        '  ERRORS=1',
        '}',
      );
    }

    const runtime = (stack.runtime || '').toLowerCase();
    if (runtime === 'go') {
      lines.push(
        'echo "→ Go build check..."',
        `cd "$CODEBASE_DIR" && go build ./... 2>&1 || {`,
        '  echo "❌ Go build failed!"',
        '  ERRORS=1',
        '}',
      );
    }
    if (runtime === 'rust') {
      lines.push(
        'echo "→ Cargo check..."',
        `cd "$CODEBASE_DIR" && cargo check 2>&1 || {`,
        '  echo "❌ Cargo check failed!"',
        '  ERRORS=1',
        '}',
      );
    }

    if (lines.length === 0) {
      return '# Compile check: no compile command was detected for this stack';
    }
    return lines.join('\n');
  },

  GIT_PRECOMMIT_TEST(manifest) {
    const stack = manifest?.stack || {};
    const testCmd = manifest?.project?.scripts?.test;
    const lines = [];

    const testFramework = (stack.test_framework || '').toLowerCase();
    const runtime = (stack.runtime || '').toLowerCase();

    if (testCmd) {
      const safeCmd = sanitizeShellCommand(testCmd);
      lines.push(
        'echo "→ Running tests..."',
        `cd "$CODEBASE_DIR" && ${safeCmd} 2>&1 || {`,
        '  echo "❌ Tests failed!"',
        '  ERRORS=1',
        '}',
      );
    } else if (testFramework === 'jest' || testFramework === 'vitest' || testFramework === 'mocha') {
      lines.push(
        'echo "→ Running tests..."',
        `cd "$CODEBASE_DIR" && npm test 2>&1 || {`,
        '  echo "❌ Tests failed!"',
        '  ERRORS=1',
        '}',
      );
    } else if (testFramework === 'pytest') {
      lines.push(
        'echo "→ Running tests..."',
        `cd "$CODEBASE_DIR" && python -m pytest 2>&1 || {`,
        '  echo "❌ Tests failed!"',
        '  ERRORS=1',
        '}',
      );
    } else if (testFramework === 'phpunit') {
      lines.push(
        'echo "→ Running tests..."',
        `cd "$CODEBASE_DIR" && ./vendor/bin/phpunit 2>&1 || {`,
        '  echo "❌ Tests failed!"',
        '  ERRORS=1',
        '}',
      );
    } else if (runtime === 'go') {
      lines.push(
        'echo "→ Running tests..."',
        `cd "$CODEBASE_DIR" && go test ./... 2>&1 || {`,
        '  echo "❌ Tests failed!"',
        '  ERRORS=1',
        '}',
      );
    }

    if (lines.length === 0) {
      return '# Test check: no test framework was detected';
    }
    return lines.join('\n');
  },

  GIT_PRECOMMIT_LINT(manifest) {
    const stack = manifest?.stack || {};
    const lines = [];

    const linter = (stack.linter || '').toLowerCase();

    if (linter === 'eslint') {
      lines.push(
        '# Lint check on staged files',
        'LINT_FILES=$(echo "$STAGED_FILES" | grep -E "\\.(ts|tsx|js|jsx|mjs|cjs)$" || true)',
        'if [ -n "$LINT_FILES" ]; then',
        '  echo "→ ESLint check..."',
        '  echo "$LINT_FILES" | tr \'\\n\' \'\\0\' | xargs -0 npx eslint --quiet 2>&1 || {',
        '    echo "❌ Lint errors found!"',
        '    ERRORS=1',
        '  }',
        'fi',
      );
    } else if (linter === 'biome') {
      lines.push(
        '# Lint check on staged files',
        'LINT_FILES=$(echo "$STAGED_FILES" | grep -E "\\.(ts|tsx|js|jsx|mjs|cjs|json)$" || true)',
        'if [ -n "$LINT_FILES" ]; then',
        '  echo "→ Biome lint check..."',
        '  echo "$LINT_FILES" | tr \'\\n\' \'\\0\' | xargs -0 npx biome check --no-errors-on-unmatched 2>&1 || {',
        '    echo "❌ Lint errors found!"',
        '    ERRORS=1',
        '  }',
        'fi',
      );
    } else if (linter === 'ruff') {
      lines.push(
        '# Lint check on staged files',
        'LINT_FILES=$(echo "$STAGED_FILES" | grep -E "\\.py$" || true)',
        'if [ -n "$LINT_FILES" ]; then',
        '  echo "→ Ruff lint check..."',
        '  echo "$LINT_FILES" | tr \'\\n\' \'\\0\' | xargs -0 ruff check 2>&1 || {',
        '    echo "❌ Lint errors found!"',
        '    ERRORS=1',
        '  }',
        'fi',
      );
    }

    if (lines.length === 0) {
      return '# Lint check: no linter was detected';
    }
    return lines.join('\n');
  },

  GIT_PRECOMMIT_FORMAT(manifest) {
    const stack = manifest?.stack || {};
    const lines = [];

    const formatter = (stack.formatter || '').toLowerCase();

    if (formatter === 'prettier') {
      lines.push(
        '# Format check on staged files',
        'FORMAT_FILES=$(echo "$STAGED_FILES" | grep -E "\\.(ts|tsx|js|jsx|mjs|cjs|json|css|scss|md)$" || true)',
        'if [ -n "$FORMAT_FILES" ]; then',
        '  echo "→ Prettier format check..."',
        '  echo "$FORMAT_FILES" | tr \'\\n\' \'\\0\' | xargs -0 npx prettier --check 2>&1 || {',
        '    echo "❌ Format errors found. Fix with npx prettier --write."',
        '    ERRORS=1',
        '  }',
        'fi',
      );
    } else if (formatter === 'biome') {
      lines.push(
        '# Format check on staged files',
        'FORMAT_FILES=$(echo "$STAGED_FILES" | grep -E "\\.(ts|tsx|js|jsx|mjs|cjs|json)$" || true)',
        'if [ -n "$FORMAT_FILES" ]; then',
        '  echo "→ Biome format check..."',
        '  echo "$FORMAT_FILES" | tr \'\\n\' \'\\0\' | xargs -0 npx biome format --no-errors-on-unmatched 2>&1 || {',
        '    echo "❌ Format errors found. Fix with npx biome format --write."',
        '    ERRORS=1',
        '  }',
        'fi',
      );
    } else if (formatter === 'ruff') {
      lines.push(
        '# Format check on staged files',
        'FORMAT_FILES=$(echo "$STAGED_FILES" | grep -E "\\.py$" || true)',
        'if [ -n "$FORMAT_FILES" ]; then',
        '  echo "→ Ruff format check..."',
        '  echo "$FORMAT_FILES" | tr \'\\n\' \'\\0\' | xargs -0 ruff format --check 2>&1 || {',
        '    echo "❌ Format errors found. Fix with ruff format."',
        '    ERRORS=1',
        '  }',
        'fi',
      );
    }

    if (lines.length === 0) {
      return '# Format check: no formatter was detected';
    }
    return lines.join('\n');
  },

  GIT_PREPUSH_LOCALHOST(manifest) {
    return [
      '  # Localhost/127.0.0.1 leak scan',
      '  PUSH_DIFF=$(git diff "$RANGE" -- . 2>/dev/null || true)',
      '  if [ -n "$PUSH_DIFF" ]; then',
      '    # Exclude test and config files',
      '    LOCALHOST_HITS=$(echo "$PUSH_DIFF" | grep -n "^+" | grep -v "^+++" | \\',
      '      grep -Ei "(localhost:[0-9]+|127\\.0\\.0\\.1|0\\.0\\.0\\.0:[0-9]+)" | \\',
      '      grep -vE "(test|spec|__tests__|mock|fixture|docker-compose|Dockerfile|\\.env\\.example)" || true)',
      '    if [ -n "$LOCALHOST_HITS" ]; then',
      '      echo "❌ Localhost reference detected!"',
      '      echo "   Check these lines:"',
      '      echo "$LOCALHOST_HITS" | head -5 | sed \'s/^/     /\'',
      '      ERRORS=1',
      '    fi',
      '  fi',
    ].join('\n');
  },

  GIT_PREPUSH_MIGRATION(manifest) {
    const stack = manifest?.stack || {};
    const orm = (stack.orm || '').toLowerCase();
    const lines = [];

    if (orm === 'prisma') {
      lines.push(
        '  # Prisma migration consistency',
        '  SCHEMA_CHANGED=$(git diff "$RANGE" --name-only -- "*/prisma/schema.prisma" | head -1)',
        '  if [ -n "$SCHEMA_CHANGED" ]; then',
        '    NEW_MIGRATION=$(git diff "$RANGE" --name-only -- "*/prisma/migrations/" | head -1)',
        '    if [ -z "$NEW_MIGRATION" ]; then',
        '      echo "❌ schema.prisma changed but there is no new migration!"',
        '      echo "   Run npx prisma migrate dev --name <description>."',
        '      ERRORS=1',
        '    fi',
        '  fi',
      );
    } else if (orm === 'typeorm') {
      lines.push(
        '  # TypeORM migration consistency',
        '  ENTITY_CHANGED=$(git diff "$RANGE" --name-only -- "*/entities/*.ts" "*/entity/*.ts" | head -1)',
        '  if [ -n "$ENTITY_CHANGED" ]; then',
        '    NEW_MIGRATION=$(git diff "$RANGE" --name-only -- "*/migrations/*.ts" | head -1)',
        '    if [ -z "$NEW_MIGRATION" ]; then',
        '      echo "❌ An entity file changed but there is no new migration!"',
        '      echo "   Run npx typeorm migration:generate."',
        '      ERRORS=1',
        '    fi',
        '  fi',
      );
    } else if (orm === 'eloquent') {
      lines.push(
        '  # Eloquent migration consistency',
        '  MODEL_CHANGED=$(git diff "$RANGE" --name-only -- "*/Models/*.php" "*/app/Models/*.php" | head -1)',
        '  if [ -n "$MODEL_CHANGED" ]; then',
        '    NEW_MIGRATION=$(git diff "$RANGE" --name-only -- "*/database/migrations/*.php" | head -1)',
        '    if [ -z "$NEW_MIGRATION" ]; then',
        '      echo "⚠️  A model changed but there is no new migration — check it."',
        '      WARNINGS=$((WARNINGS + 1))',
        '    fi',
        '  fi',
      );
    } else if (orm === 'django-orm') {
      lines.push(
        '  # Django migration consistency',
        '  MODEL_CHANGED=$(git diff "$RANGE" --name-only -- "*/models.py" | head -1)',
        '  if [ -n "$MODEL_CHANGED" ]; then',
        '    NEW_MIGRATION=$(git diff "$RANGE" --name-only -- "*/migrations/0*.py" | head -1)',
        '    if [ -z "$NEW_MIGRATION" ]; then',
        '      echo "❌ models.py changed but there is no new migration!"',
        '      echo "   Run python manage.py makemigrations."',
        '      ERRORS=1',
        '    fi',
        '  fi',
      );
    }

    if (lines.length === 0) {
      return '  # Migration check: no ORM was detected';
    }
    return lines.join('\n');
  },

  GIT_PREPUSH_ENV(manifest) {
    const stack = manifest?.stack || {};
    const runtime = (stack.runtime || '').toLowerCase();
    const lines = [];

    lines.push(
      '  # Env variable sync check',
      '  if [ -f "$CODEBASE_DIR/.env.example" ]; then',
      '    EXAMPLE_KEYS=$(grep -E "^[A-Z_]+=" "$CODEBASE_DIR/.env.example" 2>/dev/null | cut -d= -f1 | sort || true)',
    );

    if (runtime === 'node' || hasTypeScript(manifest)) {
      lines.push(
        '    # Scan process.env references',
        '    CODE_KEYS=$(grep -rhoE "process\\.env\\.([A-Z_]+)" "$CODEBASE_DIR/src/" 2>/dev/null | sed "s/process\\.env\\.//" | sort -u || true)',
      );
    } else if (runtime === 'python') {
      lines.push(
        '    # Scan os.environ references',
        '    CODE_KEYS=$(grep -rhoE "os\\.environ\\[.([A-Z_]+).|os\\.getenv\\(.([A-Z_]+)." "$CODEBASE_DIR/" 2>/dev/null | grep -oE "[A-Z_]+" | sort -u || true)',
      );
    } else if (runtime === 'php') {
      lines.push(
        '    # Scan env() references',
        '    CODE_KEYS=$(grep -rhoE "env\\(.([A-Z_]+)." "$CODEBASE_DIR/" 2>/dev/null | grep -oE "[A-Z_]+" | sort -u || true)',
      );
    } else {
      lines.push(
        '    CODE_KEYS=""',
      );
    }

    lines.push(
      '    if [ -n "$CODE_KEYS" ] && [ -n "$EXAMPLE_KEYS" ]; then',
      '      MISSING=$(comm -23 <(echo "$CODE_KEYS") <(echo "$EXAMPLE_KEYS") 2>/dev/null || true)',
      '      if [ -n "$MISSING" ]; then',
      '        echo "⚠️  Env keys in code are missing from .env.example:"',
      '        echo "   Present in code, absent from .env.example:"',
      '        echo "$MISSING" | head -5 | sed \'s/^/     /\'',
      '        WARNINGS=$((WARNINGS + 1))',
      '      fi',
      '    fi',
      '  fi',
    );

    return lines.join('\n');
  },

  GIT_PREPUSH_DESTRUCTIVE(manifest) {
    const stack = manifest?.stack || {};
    const orm = (stack.orm || '').toLowerCase();
    const lines = [];

    lines.push(
      '  # Destructive migration warning',
      '  MIGRATION_FILES=$(git diff "$RANGE" --name-only -- "*/migrations/*" 2>/dev/null || true)',
      '  if [ -n "$MIGRATION_FILES" ]; then',
      '    MIGRATION_DIFF=$(echo "$MIGRATION_FILES" | tr \'\\n\' \'\\0\' | xargs -0 git diff "$RANGE" -- 2>/dev/null || true)',
    );

    if (orm === 'prisma') {
      lines.push(
        '    DESTRUCTIVE=$(echo "$MIGRATION_DIFF" | grep -iE "^\\+.*(DROP TABLE|DROP COLUMN|ALTER TABLE.*DROP)" || true)',
      );
    } else if (orm === 'django-orm') {
      lines.push(
        '    DESTRUCTIVE=$(echo "$MIGRATION_DIFF" | grep -iE "^\\+.*(RemoveField|DeleteModel|DROP TABLE|DROP COLUMN)" || true)',
      );
    } else if (orm === 'eloquent') {
      lines.push(
        '    DESTRUCTIVE=$(echo "$MIGRATION_DIFF" | grep -iE "^\\+.*(dropColumn|dropTable|drop\\(|DROP TABLE|DROP COLUMN)" || true)',
      );
    } else if (orm === 'typeorm') {
      lines.push(
        '    DESTRUCTIVE=$(echo "$MIGRATION_DIFF" | grep -iE "^\\+.*(dropColumn|dropTable|DROP TABLE|DROP COLUMN)" || true)',
      );
    } else {
      lines.push(
        '    DESTRUCTIVE=$(echo "$MIGRATION_DIFF" | grep -iE "^\\+.*(DROP TABLE|DROP COLUMN|ALTER TABLE.*DROP)" || true)',
      );
    }

    lines.push(
      '    if [ -n "$DESTRUCTIVE" ]; then',
      '      echo "⚠️  DESTRUCTIVE migration detected!"',
      '      echo "   Check these lines:"',
      '      echo "$DESTRUCTIVE" | head -5 | sed \'s/^/     /\'',
      '      WARNINGS=$((WARNINGS + 1))',
      '    fi',
      '  fi',
    );

    return lines.join('\n');
  },

  // --- SELF-REFRESH BLOCK ---
  // Fixed section injected at the end of every command skeleton.
  // After the command runs, it checks its own text against what the project actually is.
  // Independent of the manifest: every command gets the same text.

  SELF_REFRESH(_manifest) {
    return [
      '## Self-Refresh',
      '',
      'Before the command ends, compare its text with what this run observed.',
      '',
      '**Question:** Does the command still describe the project?',
      '- Is a path or directory missing?',
      '- Is a stack reference stale?',
      '- Is a rule missing or unnecessary?',
      '- Is a new project area outside the command scope?',
      '',
      '**Decision:**',
      '- **None** -> no-op and stop.',
      '- **Small** (3 lines or fewer, mechanical): edit the command file and append one line to `.claude/commands/_evolution.log`:',
      '  `YYYY-MM-DD — <command>: <short note>`',
      '- **Large** (a new section, a wider scope, or a restructure):',
      '  `backlog task create "..." --labels command-refresh --priority low`',
      '  Do not edit the command file in this run.',
      '',
      '**Boundaries:**',
      '- Record only what this run observed. Do not invent hypothetical additions.',
      '- If unsure, no-op and stop.',
      '- Commit completed non-sensitive work in the same session without asking. Do not push unless the user asks. Do not use `git add -A`.',
    ].join('\n');
  },

  GRAPHIFY_UPDATE_COMMAND(manifest) {
    // RAW (runnable) update command chain for the optional graphify module.
    // Used as a copy-paste command inside rules and install.md.
    // Path arguments are wrapped in shell-safe double quotes.
    const updates = collectGraphifyUpdateSteps(manifest, { quote: true });
    return updates.join(' && \\\n');
  },

  GRAPHIFY_UPDATE_COMMAND_ECHO(manifest) {
    // Bash lines shown to the user when /g health has no graph.
    // Komut CALISTIRILMAZ — echo ile yazdirilir.
    // Path argumanlari tirnaksiz (echo'nun dis double-quote'unun icinde nested
    // tirnak Bash syntax'ini kirardi; path'ler zaten toCodebaseRelative ile
    // traversal/absolute reddedilerek sanitize edildi).
    const updates = collectGraphifyUpdateSteps(manifest, { quote: false });
    return updates
      .map((cmd, idx) => {
        const trailing = idx < updates.length - 1 ? ' && \\\\' : '';
        return `  echo "   ${cmd}${trailing}"`;
      })
      .join('\n');
  },

  GRAPHIFY_LAYERS_PY(manifest) {
    // Fills the LAYERS tuple list inside graphify-merge-layers.py.
    // Meaningful only when monorepo is active and subprojects exist; otherwise returns a comment.
    // Path normalize: subproject path is Codebase-root-relative (traversal and absolute paths are rejected).
    const activeModules = getActiveModules(manifest);
    const monorepoActive = activeModules.has('monorepo');
    const subprojects = Array.isArray(manifest?.project?.subprojects) ? manifest.project.subprojects : [];

    if (!monorepoActive || subprojects.length === 0) {
      return [
        '    # NOTE: This script is only needed for a monorepo (multi-layer).',
        '    # This manifest is single-layer. Adapt the list to your monorepo layout.',
      ].join('\n');
    }

    const toCodebaseRelative = (spPath) => {
      if (typeof spPath !== 'string' || !spPath) return null;
      const stripped = spPath.replace(/^\.\.\/[^/]+\/?/, '');
      if (!stripped || stripped === spPath) return null;
      if (stripped.startsWith('/') || stripped.startsWith('../') || stripped.includes('/../')) return null;
      return stripped;
    };

    const lines = [];
    for (const sp of subprojects) {
      const relUnderCodebase = toCodebaseRelative(getSubprojectPath(manifest, sp));
      if (!relUnderCodebase) continue;
      const name = (sp?.name || 'layer').toString();
      lines.push(`    (${JSON.stringify(name)}, ROOT / ${JSON.stringify(relUnderCodebase + '/graphify-out/graph.json')}),`);
    }
    if (lines.length === 0) {
      return [
        '    # NOTE: This script is only needed for a monorepo (multi-layer).',
        '    # This manifest is single-layer. Adapt the list to your monorepo layout.',
      ].join('\n');
    }
    return lines.join('\n');
  },
};

// Pulls graphify update steps out of the manifest (shared helper for the raw and echo generators).
//
// PATH SEMANTICS: generated commands run from the TARGET PROJECT (Codebase) ROOT
// (after the user runs `cd <Codebase>`). getSubprojectPath returns an Agentbase-relative
// '../Codebase/<sub>'; this helper strips the '../Codebase/' prefix and uses the
// Codebase-root-relative path. A single-layer project targets the Codebase root → 'graphify update .'.
//
// SAFETY: path arguments are wrapped in double quotes (paths with spaces or special characters).
// Path traversal (a segment starting with '..') or an absolute path (a segment starting with '/') is rejected —
// the generator emits a plain error instead of passing that path through.
function collectGraphifyUpdateSteps(manifest, opts = {}) {
  const quote = opts.quote === true;
  const activeModules = getActiveModules(manifest);
  const monorepoActive = activeModules.has('monorepo');
  const subprojects = Array.isArray(manifest?.project?.subprojects) ? manifest.project.subprojects : [];

  const toCodebaseRelative = (spPath) => {
    if (typeof spPath !== 'string' || !spPath) return null;
    // getSubprojectPath may return '../Codebase/<sub>' or '../<custom>/<sub>'.
    // Strip the '../<parent>/' prefix; what remains is the Codebase-root-relative segment.
    const stripped = spPath.replace(/^\.\.\/[^/]+\/?/, '');
    if (!stripped || stripped === spPath) return null;
    // Safety: traversal and absolute paths are rejected.
    if (stripped.startsWith('/') || stripped.startsWith('../') || stripped.includes('/../')) return null;
    return stripped;
  };

  const fmt = (p) => (quote ? `"${String(p).replace(/"/g, '\\"')}"` : p);

  if (monorepoActive && subprojects.length > 0) {
    const subpaths = subprojects
      .map(sp => toCodebaseRelative(getSubprojectPath(manifest, sp)))
      .filter(Boolean);
    if (subpaths.length > 0) {
      return [
        ...subpaths.map(p => `graphify update ${fmt(p)}`),
        'python3 ../Agentbase/scripts/graphify-merge-layers.py',
      ];
    }
  }
  // Single-layer: the target is the Codebase root itself (the command runs inside Codebase → '.').
  return ['graphify update .'];
}

// ─────────────────────────────────────────────────────
// FILE PROCESSORS
// ─────────────────────────────────────────────────────

/**
 * Detects the skeleton file type.
 * @param {string} filePath
 * @returns {'md'|'js'|'json'}
 */
function detectFileType(filePath) {
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.js')) return 'js';
  if (filePath.endsWith('.py')) return 'py';
  return 'md';
}

/**
 * Converts a skeleton file name to an output file name (drops the .skeleton extension).
 */
function toOutputName(filename) {
  return filename.replace('.skeleton', '');
}

/**
 * Processes one skeleton file and returns the result.
 * @param {string} filePath - Skeleton file path
 * @param {Object} manifest - Manifest data
 * @returns {{ outputContent: string, filled: string[], marked: string[] }}
 */
function processSkeletonFile(filePath, manifest) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileType = detectFileType(filePath);

  if (fileType === 'json') {
    let obj;
    try {
      obj = JSON.parse(content);
    } catch (jsonErr) {
      throw new Error(`Invalid JSON skeleton file: ${jsonErr.message}`);
    }
    const { obj: processed, filled, marked } = processJsonGenerateKeys(obj, manifest);
    return {
      outputContent: JSON.stringify(processed, null, 2) + '\n',
      filled,
      marked,
    };
  }

  const result = fillBlocks(content, fileType, manifest);

  // CODEBASE_ROOT resolution inside hook files:
  //   const CODEBASE_ROOT = resolveCodebaseRoot(__dirname, '<fallback>');
  // Skeletons default <fallback> to '../Codebase'. At bootstrap time we write the
  // Agentbase-relative path derived from manifest.project.structure.
  // At runtime the hook helper (shared-hook-utils.resolveCodebaseRoot) uses
  // process.env.AGENTIC_CODEBASE_DIR first, then this fallback.
  const codebasePath = getCodebasePath(manifest);
  const outputContent = result.content.replace(
    /const CODEBASE_ROOT = resolveCodebaseRoot\(__dirname,\s*'[^']*'\);/g,
    `const CODEBASE_ROOT = resolveCodebaseRoot(__dirname, ${JSON.stringify(codebasePath)});`
  );

  return { outputContent, filled: result.filled, marked: result.marked };
}

/**
 * Template dizinindeki hedef yolu hesaplar.
 * templates/core/commands/x.skeleton.md → .claude/commands/x.md
 * templates/modules/orm/prisma/rules/x.skeleton.md → .claude/rules/x.md
 */
function resolveOutputPath(skeletonPath, outputDir) {
  const relPath = path.relative(TEMPLATES_DIR, skeletonPath);
  const parts = relPath.split(path.sep);
  const filename = toOutputName(parts[parts.length - 1]);

  // core/* mapping
  if (parts[0] === 'core') {
    const category = parts[1]; // commands, agents, hooks, rules
    const targetDir = TARGET_MAP[`core/${category}`];
    if (targetDir) {
      return path.join(outputDir, targetDir, filename);
    }
    // core root files (settings.json, CLAUDE.md, claude-ignore)
    if (filename === 'settings.json') return path.join(outputDir, '.claude', filename);
    if (filename === 'CLAUDE.md') return path.join(outputDir, '.claude', filename);
    if (filename === 'CONVENTIONS.md') return path.join(outputDir, '.claude', filename);
    if (filename === 'claude-ignore') return path.join(outputDir, '.claude-ignore');
    return path.join(outputDir, filename);
  }

  // modules/* mapping
  if (parts[0] === 'modules') {
    // modules/{category}/{...}/{variant}/{type}/file
    const tip = parts[parts.length - 2]; // commands, agents, hooks, rules, scripts
    const leafVariant = parts[parts.length - 3]; // docker, prisma, express, monorepo, graphify
    // A 'scripts/' type is written to the target project's root 'scripts/' directory, not under `.claude/`.
    // Required for runtime tooling scripts such as the optional graphify Python merge.
    const targetDir = tip === 'scripts' ? 'scripts' : `.claude/${tip}`;

    // Collision guard: prefix the file name when it does not already contain the module name
    // docker/commands/pre-deploy → docker-pre-deploy (collision avoided)
    // prisma/rules/prisma-rules → prisma-rules (prefix already present, leave it)
    const prefixedFilename = filename.toLowerCase().startsWith(leafVariant.toLowerCase())
      ? filename
      : `${leafVariant}-${filename}`;

    return path.join(outputDir, targetDir, prefixedFilename);
  }

  return path.join(outputDir, filename);
}

/**
 * Scans every template file under the templates directory.
 * Includes skeleton files (.skeleton) and fixed files (.js and .md inside
 * hooks/, rules/, commands/, agents/).
 * Includes only files that belong to active modules.
 */
function scanSkeletonFiles(manifest) {
  const files = [];
  const activeModules = getActiveModules(manifest);
  const CONTENT_DIRS = new Set(['rules', 'hooks', 'commands', 'agents', 'scripts']);
  const SKIP_DIRS = new Set(['interview', 'reference']);

  function isTemplateFile(entry, fullPath) {
    // root-gitignore.skeleton is NOT processed by generate.js — the bootstrap orchestrator
    // (STEP 6.6) writes it directly to the project root (../.gitignore). generate.js keeps
    // its output inside outputDir, so this skeleton stays outside the scan.
    if (entry.name === 'root-gitignore.skeleton') return false;
    if (entry.name.includes('.skeleton.') || entry.name.endsWith('.skeleton')) return true;
    // Fixed file: .js or .md inside a content directory (hooks/, rules/, commands/, agents/)
    if (entry.name.endsWith('.js') || entry.name.endsWith('.md')) {
      const parentDir = path.basename(path.dirname(fullPath));
      if (CONTENT_DIRS.has(parentDir) && entry.name !== 'detect.md') return true;
    }
    return false;
  }

  function isModuleActive(relPath) {
    if (!relPath.startsWith('modules/')) return true; // core files are always included
    const parts = relPath.split(path.sep);
    if (parts.length < 3) return true;

    const moduleSegments = [];
    for (let i = 2; i < parts.length; i++) {
      if (CONTENT_DIRS.has(parts[i]) || parts[i].includes('.skeleton.') || parts[i].endsWith('.skeleton')) break;
      // Treat a fixed file name as a stop point too
      if (parts[i].endsWith('.js') || parts[i].endsWith('.md')) break;
      moduleSegments.push(parts[i]);
    }
    if (moduleSegments.length > 0) {
      const modulePath = moduleSegments.join('/');
      if (activeModules.has(modulePath)) return true;
      for (const active of activeModules) {
        if (active.startsWith(modulePath + '/')) return true;
      }
      return false;
    }
    // Ust seviye modul: modules/security/commands/... → parts[1] = "security"
    const category = parts[1];
    return activeModules.has(category);
  }

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(fullPath);
      } else if (isTemplateFile(entry, fullPath)) {
        const relPath = path.relative(TEMPLATES_DIR, fullPath);
        if (!isModuleActive(relPath)) continue;
        files.push(fullPath);
      }
    }
  }

  walk(TEMPLATES_DIR);
  return files;
}

/**
 * Filters the skeleton file list to the named modules.
 * core/ files are always included.
 * modules/ files are included only when they match the onlyModules list.
 */
function filterByModules(skeletonFiles, onlyModules) {
  const moduleSet = new Set(onlyModules);
  const CONTENT_DIRS = new Set(['rules', 'hooks', 'commands', 'agents', 'scripts']);

  return skeletonFiles.filter(filePath => {
    const relPath = path.relative(TEMPLATES_DIR, filePath);
    if (!relPath.startsWith('modules' + path.sep)) return true; // core → always included

    const parts = relPath.split(path.sep);
    // Extract the module path as modules/<category>/<variant>/...
    const moduleSegments = [];
    for (let i = 1; i < parts.length; i++) {
      if (CONTENT_DIRS.has(parts[i])) break;
      if (parts[i].includes('.skeleton.') || parts[i].endsWith('.skeleton')) break;
      if (parts[i].endsWith('.js') || parts[i].endsWith('.md')) break;
      moduleSegments.push(parts[i]);
    }

    if (moduleSegments.length === 0) return true;
    const modulePath = moduleSegments.join('/');

    // Tam eslesme veya ust kategori eslesmesi
    if (moduleSet.has(modulePath)) return true;
    for (const target of moduleSet) {
      if (modulePath.startsWith(target + '/') || target.startsWith(modulePath + '/')) return true;
    }
    return false;
  });
}

// ─────────────────────────────────────────────────────
// CLI ARGUMAN AYRISTIRMA
// ─────────────────────────────────────────────────────

const VALUE_FLAGS = new Set(['--output-dir', '--modules']);

/**
 * Normalizes the project-root ../.gitignore (two-repo delivery model, STEP 6.6).
 * REPLACE/normalize — not append-only: removes the old/stale managed block (between the
 * START..END sentinels) AND unanchored/old managed pattern lines left outside the block
 * (Codebase, Codebase/, Codebase-wt-*, and similar), then appends a fresh root-anchored
 * skeleton block. That stops a stale upgrade from keeping nested paths
 * (Agentbase/.../Codebase/...) ignored via old unanchored lines.
 * Idempotent: running it again on a valid file leaves a single clean block.
 * User lines (not managed) are kept. Pure function — does NOT write a file;
 * bootstrap writes the result to ../.gitignore itself (outside the generate.js path-traversal guard).
 */
function repairRootGitignore(existing, skeleton) {
  const STALE_MANAGED = new Set([
    'Codebase', 'Codebase/', 'Codebase-wt-*/', '*-wt-*/',  // legacy unanchored/wildcard managed lines
    '/Codebase', '/Codebase/', '/Codebase-wt-*/',          // anchored (leftover outside the block)
  ]);
  const hasEndSentinel = existing.includes('END-AGENTIC-WORKFLOW-ROOT-GITIGNORE');
  const kept = [];
  let inManaged = false;
  for (const line of existing.split('\n')) {
    const trimmed = line.trim();
    if (hasEndSentinel) {
      // Yeni format: START..END sentinel arasindaki tum blogu at.
      if (trimmed.includes('AGENTIC-WORKFLOW-ROOT-GITIGNORE') && !trimmed.includes('END-AGENTIC-WORKFLOW-ROOT-GITIGNORE')) {
        inManaged = true;
        continue;
      }
      if (inManaged) {
        if (trimmed.includes('END-AGENTIC-WORKFLOW-ROOT-GITIGNORE')) inManaged = false;
        continue;
      }
    } else if (trimmed.includes('AGENTIC-WORKFLOW-ROOT-GITIGNORE')) {
      // Legacy format (no END sentinel): drop the sentinel comment line and do not keep what follows.
      continue;
    }
    if (STALE_MANAGED.has(trimmed)) continue; // stale pattern line left outside the block
    kept.push(line);
  }
  const base = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const block = skeleton.trim();
  return (base ? base + '\n\n' : '') + block + '\n';
}

/**
 * CLI argumanlarindan manifest yolunu bulur.
 * Flag'leri ve flag degerlerini (--output-dir /tmp gibi) atlayarak
 * ilk pozisyonel argumani dondurur.
 */
function findManifestArg(args) {
  return args.find((a, i) => {
    if (a.startsWith('--')) return false;
    if (i > 0 && VALUE_FLAGS.has(args[i - 1])) return false;
    return true;
  }) || null;
}

// ─────────────────────────────────────────────────────
// ANA FONKSIYON
// ─────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const flags = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    outputDir: null,
  };

  // --output-dir parametresi
  const outputIdx = args.indexOf('--output-dir');
  if (outputIdx !== -1 && args[outputIdx + 1]) {
    flags.outputDir = path.resolve(args[outputIdx + 1]);
  }

  // --modules parameter: process only the named modules' files
  const modulesIdx = args.indexOf('--modules');
  if (modulesIdx !== -1 && args[modulesIdx + 1]) {
    flags.onlyModules = args[modulesIdx + 1].split(',').map(m => m.trim()).filter(Boolean);
  }

  const manifestPath = findManifestArg(args);

  if (!manifestPath) {
    console.error('Usage: node generate.js <manifest> [--output-dir <dir>] [--modules <module-list>] [--dry-run] [--verbose]');
    process.exit(1);
  }

  const resolvedManifestPath = path.resolve(manifestPath);
  if (!fs.existsSync(resolvedManifestPath)) {
    console.error(`Error: Manifest file not found: ${resolvedManifestPath}`);
    process.exit(1);
  }

  // Read the manifest
  const manifestContent = fs.readFileSync(resolvedManifestPath, 'utf8');
  let manifest;
  try {
    manifest = yaml.load(manifestContent);
  } catch (yamlErr) {
    const mark = yamlErr.mark;
    const location = mark ? ` (line ${mark.line + 1}, column ${mark.column + 1})` : '';
    console.error(`Error: Manifest YAML parse error${location}: ${yamlErr.reason || yamlErr.message}`);
    process.exit(1);
  }

  if (!manifest) {
    console.error('Error: manifest is empty or invalid.');
    process.exit(1);
  }

  const outputDir = flags.outputDir || AGENTBASE_DIR;

  // Skeleton dosyalarini tara
  let skeletonFiles = scanSkeletonFiles(manifest);

  // --modules filter: process only the named modules and the core files
  if (flags.onlyModules && flags.onlyModules.length > 0) {
    skeletonFiles = filterByModules(skeletonFiles, flags.onlyModules);
  }

  if (skeletonFiles.length === 0) {
    if (flags.onlyModules && flags.onlyModules.length > 0) {
      console.error(`Error: no skeleton files found for the requested modules: ${flags.onlyModules.join(', ')}`);
      process.exit(1);
    }
    console.error('Warning: no skeleton files found.');
    process.exit(0);
  }

  // Rapor verileri
  const report = {
    total: skeletonFiles.length,
    processed: 0,
    filledBlocks: [],
    markedBlocks: [],
    errors: [],
    outputFiles: [],
  };

  // Process each skeleton file
  for (const skeletonPath of skeletonFiles) {
    const relPath = path.relative(TEMPLATES_DIR, skeletonPath);

    try {
      let { outputContent, filled, marked } = processSkeletonFile(skeletonPath, manifest);
      const outputPath = resolveOutputPath(skeletonPath, outputDir);

      // Prefix consistency: when the file name was prefixed, update command references inside it
      const originalFilename = toOutputName(path.basename(skeletonPath));
      const outputFilename = path.basename(outputPath);
      if (originalFilename !== outputFilename) {
        const originalCmd = originalFilename.replace(/\.(md|js|json)$/, '');
        const prefixedCmd = outputFilename.replace(/\.(md|js|json)$/, '');
        outputContent = outputContent.replaceAll(`/${originalCmd}`, `/${prefixedCmd}`);
      }

      report.processed++;
      report.filledBlocks.push(...filled.map(b => `${b} (${relPath})`));
      report.markedBlocks.push(...marked.map(b => `${b} (${relPath})`));
      report.outputFiles.push(path.relative(outputDir, outputPath));

      if (flags.verbose) {
        console.log(`  ${relPath} → ${path.relative(outputDir, outputPath)}`);
        if (filled.length) console.log(`    Filled: ${filled.join(', ')}`);
        if (marked.length) console.log(`    Left for the active host: ${marked.join(', ')}`);
      }

      if (!flags.dryRun) {
        // Path traversal guard: the output path must stay inside outputDir
        const resolvedOutput = path.resolve(outputPath);
        const resolvedBase = path.resolve(outputDir);
        if (!resolvedOutput.startsWith(resolvedBase + path.sep) && resolvedOutput !== resolvedBase) {
          throw new Error(`Path traversal detected: ${outputPath} is outside the output directory`);
        }
        const dir = path.dirname(outputPath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(outputPath, outputContent, 'utf8');
      }
    } catch (err) {
      report.errors.push(`${relPath}: ${err.message}`);
      if (flags.verbose) {
        console.error(`  ERROR: ${relPath}: ${err.message}`);
      }
    }
  }

  // Report output
  console.log('');
  console.log('━'.repeat(55));
  console.log('  Skeleton processing report');
  console.log('━'.repeat(55));
  console.log(`  Files:               ${report.total}`);
  console.log(`  Processed:           ${report.processed}`);
  console.log(`  Deterministic blocks:${report.filledBlocks.length}`);
  console.log(`  Left for the host:   ${report.markedBlocks.length}`);
  console.log(`  Errors:              ${report.errors.length}`);
  if (flags.dryRun) {
    console.log(`  Mode:                DRY RUN (no files written)`);
  }
  console.log('━'.repeat(55));

  if (report.markedBlocks.length > 0) {
    console.log('');
    console.log('Blocks the active host still has to fill:');
    const uniqueBlocks = [...new Set(report.markedBlocks.map(b => b.split(' (')[0]))];
    uniqueBlocks.forEach(b => console.log(`  - ${b}`));
  }

  if (report.errors.length > 0) {
    console.log('');
    console.log('Hatalar:');
    report.errors.forEach(e => console.log(`  ! ${e}`));
    process.exit(1);
  }

  console.log('');
}

// ─────────────────────────────────────────────────────
// EXPORT (for tests)
// ─────────────────────────────────────────────────────

module.exports = {
  escapeForShell,
  escapeForJqShell,
  isJqRegexSafe,
  sanitizeShellCommand,
  extractBlockNames,
  fillBlocks,
  findManifestArg,
  hasTypeScript,
  processJsonGenerateKeys,
  processSkeletonFile,
  resolveOutputPath,
  scanSkeletonFiles,
  repairRootGitignore,
  filterByModules,
  toOutputName,
  detectFileType,
  getActiveModules,
  getFileExtensions,
  getCodeExtensions,
  getSubprojectPath,
  getCodebasePath,
  normalizeCodebaseRelativePath,
  getForbiddenRules,
  getMigrationCommands,
  SIMPLE_GENERATORS,
  TEMPLATES_DIR,
};

// Script olarak calistirildiginda
if (require.main === module) {
  main();
}

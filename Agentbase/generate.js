#!/usr/bin/env node
'use strict';

/**
 * generate.js — Deterministik Skeleton Isleme Scripti
 *
 * Manifest.yaml okur, skeleton dosyalarini tarar, GENERATE bloklarini
 * deterministik olarak doldurur. Karmasik bloklari Claude'a birakir.
 *
 * Kullanim:
 *   node generate.js <manifest-yolu> [--output-dir <cikti-dizini>] [--modules <modul-listesi>] [--dry-run] [--verbose]
 *
 * Ornekler:
 *   node Agentbase/generate.js Docs/agentic/project-manifest.yaml
 *   node Agentbase/generate.js Docs/agentic/project-manifest.yaml --dry-run
 *   node Agentbase/generate.js Docs/agentic/project-manifest.yaml --modules "mobile/expo,deploy/docker"
 *   node Agentbase/generate.js Docs/agentic/project-manifest.yaml --output-dir ./out
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ─────────────────────────────────────────────────────
// YAPILANDIRMA
// ─────────────────────────────────────────────────────

const AGENTBASE_DIR = path.resolve(__dirname);
const TEMPLATES_DIR = path.join(AGENTBASE_DIR, 'templates');

// Hedef yol haritasi (skeleton konumu → cikti konumu, Agentbase-relative)
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


/**
 * Bir icerikten tum GENERATE blok isimlerini cikarir.
 * @param {string} content - Dosya icerigi
 * @param {'md'|'js'} fileType - Dosya tipi
 * @returns {string[]} Blok isimleri
 */
function extractBlockNames(content, fileType) {
  const re = fileType === 'js' ? createJsGenerateRe() : createMdGenerateRe();
  const names = [];
  let match;
  while ((match = re.exec(content)) !== null) {
    names.push(match[1]);
  }
  return names;
}

/**
 * Icerikteki GENERATE bloklarini verilen generator sonuclariyla degistirir.
 * @param {string} content - Dosya icerigi
 * @param {'md'|'js'} fileType - Dosya tipi
 * @param {Object} manifest - Manifest verisi
 * @returns {{ content: string, filled: string[], marked: string[] }}
 */
function fillBlocks(content, fileType, manifest) {
  const re = fileType === 'js' ? createJsGenerateRe() : createMdGenerateRe();
  const filled = [];
  const marked = [];

  const result = content.replace(re, (fullMatch, blockName) => {
    const generator = SIMPLE_GENERATORS[blockName];
    if (generator) {
      filled.push(blockName);
      return generator(manifest, fileType);
    }
    // Karmasik blok — Claude icin isaretle
    marked.push(blockName);
    if (fileType === 'js') {
      return `/* CLAUDE_FILL: ${blockName} — Bu blok Claude tarafindan doldurulacak */`;
    }
    return `<!-- CLAUDE_FILL: ${blockName} — Bu blok Claude tarafindan doldurulacak -->`;
  });

  return { content: result, filled, marked };
}

// ─────────────────────────────────────────────────────
// JSON GENERATE ISLEMCISI (settings.skeleton.json)
// ─────────────────────────────────────────────────────

/**
 * JSON objesindeki __GENERATE__*__ anahtarlarini isler.
 * Aktif modullere gore kosullu merge yapar.
 * @param {Object} obj - JSON objesi
 * @param {Object} manifest - Manifest verisi
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
          // Bos objeleri temizle (aktif modulu olmayan GENERATE bloklarinin kalintisi)
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

      // _pendingHooks'u hooks array'ine merge et (yoksa olustur)
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
 * Kosullu GENERATE bloklarini isler.
 * Her alt-anahtar bir kosul: "prisma_active" → prisma modulu aktifse dahil et.
 *
 * Uc entry tipi dondurur:
 * - { _hookEntry: {...} }       — tekil hook (hooks array'ine eklenir)
 * - { _hookGroupEntry: {...} }  — matcher + hooks grubu (array elemanina donusur)
 * - { _mergeKey, _mergeValue }  — root-level merge (ENABLED_PLUGINS gibi)
 */
function processConditionalBlock(block, activeModules, manifest) {
  const entries = [];
  const wrapperFields = {}; // matcher gibi skaler wrapper alanlar

  for (const [condKey, value] of Object.entries(block)) {
    if (condKey === '__doc__') continue;

    // Kosul kontrol: "modul_active" formatinda (slash ve tire destekli: nodejs/express_active, django-orm_active)
    const modulMatch = condKey.match(/^([\w/\-]+)_active$/);
    if (modulMatch) {
      const modulName = modulMatch[1];
      if (!activeModules.has(modulName)) continue;
    }

    // "forbidden_commands" ozel durum
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

    // Wrapper alan: skaler deger, kosul degil (matcher: "Bash" gibi)
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
          // Hook entry (type alani var → hook)
          entries.push({ _hookEntry: cleanEntry });
        } else {
          // Root-level merge (type yok → her key-value ciftini ayri merge et)
          for (const [mk, mv] of Object.entries(cleanEntry)) {
            entries.push({ _mergeKey: mk, _mergeValue: mv });
          }
        }
      }
    }
  }

  // Wrapper field + hook entry varsa → hook group olustur (matcher + hooks)
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
// YARDIMCI FONKSIYONLAR
// ─────────────────────────────────────────────────────

/**
 * Shell single-quote ve jq double-quote icin escape eder.
 * Kullanim: forbidden_commands template'indeki pattern/reason degerleri.
 * Not: pattern degerleri jq test() icinde regex olarak yorumlanir —
 * regex meta-karakterleri (.*[]() vb.) literal olarak escape edilmez.
 */
/**
 * Bash script icerisine guvenli interpolasyon icin shell escape.
 * Path ve deger interpolasyonlari icin — komutlar icin degil.
 */
function escapeForShell(str) {
  if (!str || typeof str !== 'string') return str || '';
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

/**
 * Manifest'ten gelen komut stringini validate eder.
 * Tehlikeli shell zincirleme operatorleri tespit edilirse uyari ekler.
 * Komutlari escape etmek calismay bozar — bunun yerine validate + uyari.
 */
function sanitizeShellCommand(cmd) {
  if (!cmd || typeof cmd !== 'string') return cmd || '';
  // $() ve backtick iceren komut substitution kontrolu
  if (/\$\(|`/.test(cmd)) {
    return `echo "UYARI: Guvenli olmayan komut tespit edildi: ${escapeForShell(cmd)}" >&2 && exit 1`;
  }
  return cmd;
}

function escapeForJqShell(str) {
  return str
    .replace(/\\/g, '\\\\')    // jq: \ → \\
    .replace(/"/g, '\\"')      // jq: " → \"
    .replace(/\n/g, '\\n')     // jq: newline → \n
    .replace(/\t/g, '\\t')     // jq: tab → \t
    .replace(/\$/g, '\\$')     // shell: $ → \$ (degisken interpolasyonunu engelle)
    .replace(/'/g, "'\\''");   // shell: ' → '\''
}

/**
 * Forbidden pattern'in jq test() icin guvenli olup olmadigini kontrol eder.
 * Nested quantifier (a+)+, (a*)+, (a{2,})+  gibi desenler ReDoS riski taşir.
 * @returns {boolean} true = guvenli
 */
function isJqRegexSafe(pattern) {
  if (!pattern || typeof pattern !== 'string') return false;
  // Nested quantifier tespiti: (...)[+*{n,}] ardından [+*{]
  if (/\([^)]*[+*][^)]*\)[+*]/.test(pattern)) return false;
  if (/\([^)]*\{[^}]*\}[^)]*\)[+*]/.test(pattern)) return false;
  // Aşırı uzun pattern (1000+ karakter) timeout riski
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
        console.warn(`  Uyari: Guvenli olmayan forbidden pattern atlandi (ReDoS riski): ${pattern.slice(0, 50)}`);
        continue;
      }
      rules.push({ pattern, reason: item.reason });
    }
  }
  return rules;
}

/**
 * Stack'e gore dosya uzantilarini dondurur.
 */
function getFileExtensions(manifest) {
  // Manifest'te tanimli ise onu kullan
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

  // Config uzantilari (her zaman)
  const configExts = ['.json', '.yaml', '.yml', '.env'];

  const allStacks = [primary.toLowerCase(), ...detected.map(s => s.toLowerCase())];
  for (const stack of allStacks) {
    for (const [key, vals] of Object.entries(stackExtMap)) {
      if (stack.includes(key)) {
        vals.forEach(e => exts.add(e));
      }
    }
  }

  // En az bir sey bulduysa config'leri ekle
  if (exts.size > 0) {
    configExts.forEach(e => exts.add(e));
  }

  return Array.from(exts);
}

/**
 * Stack'e gore KOD dosya uzantilarini dondurur (config haric).
 */
function getCodeExtensions(manifest) {
  const allExts = getFileExtensions(manifest);
  const configExts = new Set(['.json', '.yaml', '.yml', '.env', '.toml', '.xml', '.ini', '.cfg']);
  return allExts.filter(e => !configExts.has(e));
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
 * Subproject path'ini normalize eder.
 * sp.path zaten ../veya / ile basliyorsa oldugu gibi kullanir.
 * Relative path (apps/api gibi) ise codebasePath ile birlestirir.
 * sp.path yoksa codebasePath/sp.name dondurur.
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
 * Manifest'te TypeScript aktif mi kontrol eder.
 * stack.typescript boolean VEYA stack.detected dizisinde "TypeScript" varsa true.
 */
function hasTypeScript(manifest) {
  const stack = manifest?.stack || {};
  if (stack.typescript === true) return true;
  const detected = stack.detected || [];
  return detected.some(s => s.toLowerCase().includes('typescript'));
}

/**
 * ORM tipine gore migration komutlarini uretir.
 */
function getMigrationCommands(manifest, ormType) {
  const codebasePath = getCodebasePath(manifest);
  const subprojects = manifest?.project?.subprojects || [];

  // ORM'yi kullanan subproject'i bul
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
      ['Schema dogrulama', `cd "${ormPath}" && npx prisma validate`],
      ['Migration olustur', `cd "${ormPath}" && npx prisma migrate dev --name <aciklama>`],
      ['Migration durumu', `cd "${ormPath}" && npx prisma migrate status`],
      ['Client olustur', `cd "${ormPath}" && npx prisma generate`],
      ['DB sifirla (DEV)', `cd "${ormPath}" && npx prisma migrate reset`],
      ['Seed calistir', `cd "${ormPath}" && npx prisma db seed`],
      ['Studio ac', `cd "${ormPath}" && npx prisma studio`],
    ],
    eloquent: [
      ['Migration olustur', `cd "${ormPath}" && php artisan make:migration <aciklama>`],
      ['Migration calistir', `cd "${ormPath}" && php artisan migrate`],
      ['Migration geri al', `cd "${ormPath}" && php artisan migrate:rollback`],
      ['Migration durumu', `cd "${ormPath}" && php artisan migrate:status`],
      ['DB sifirla (DEV)', `cd "${ormPath}" && php artisan migrate:fresh --seed`],
      ['Seed calistir', `cd "${ormPath}" && php artisan db:seed`],
    ],
    'django-orm': [
      ['Migration olustur', `cd "${ormPath}" && python manage.py makemigrations`],
      ['Migration calistir', `cd "${ormPath}" && python manage.py migrate`],
      ['Migration durumu', `cd "${ormPath}" && python manage.py showmigrations`],
      ['SQL onizleme', `cd "${ormPath}" && python manage.py sqlmigrate <app> <migration>`],
    ],
    typeorm: [
      ['Migration olustur', `cd "${ormPath}" && npx typeorm migration:generate -n <aciklama>`],
      ['Migration calistir', `cd "${ormPath}" && npx typeorm migration:run`],
      ['Migration geri al', `cd "${ormPath}" && npx typeorm migration:revert`],
      ['Schema senkronize', `cd "${ormPath}" && npx typeorm schema:sync`],
    ],
  };

  return commands[ormType] || [];
}

// ─────────────────────────────────────────────────────
// BASIT BLOK GENERATOR'LARI
// ─────────────────────────────────────────────────────

/**
 * Basit (deterministik) GENERATE bloklari icin generator haritasi.
 * Her generator: (manifest, fileType) => string
 *
 * fileType: 'md' | 'js'
 * md → Markdown content dondurur
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
      '## Memory Yolu',
      '',
      `**Hafiza dizini:** \`${memoryPath}\``,
      '',
      '- Agentbase .claude/memory/ dizini esas alinir',
      '- Codebase icine hafiza dosyasi yazilmaz',
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
      '## Prisma Dosya Konumlari',
      '',
      '| Dosya | Yol |',
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
      '## Laravel Dosya Konumlari',
      '',
      '| Dosya | Yol |',
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
      '## Django Dosya Konumlari',
      '',
      '| Dosya | Yol |',
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
      '## TypeORM Dosya Konumlari',
      '',
      '| Dosya | Yol |',
      '|---|---|',
      `| Entities | \`${codebasePath}/src/entities/\` |`,
      `| Migrations | \`${codebasePath}/src/migrations/\` |`,
      `| Data Source | \`${codebasePath}/src/data-source.ts\` |`,
    ].join('\n');
  },

  DEPLOY_LOG_PATH(manifest) {
    return `## Deploy Log Yolu\n\n\`.claude/reports/deploys/\``;
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
    return `## Health Check\n\n\`<PROJE_URL>/health\``;
  },

  // --- KOMUT TABLOLARI ---

  MIGRATION_COMMANDS(manifest) {
    const orm = manifest?.stack?.orm;
    if (!orm) return '## Migration Komutlari\n\nORM tespit edilemedi.';

    const commands = getMigrationCommands(manifest, orm);
    if (commands.length === 0) return `## Migration Komutlari\n\n${orm} icin komut tanimlanmadi.`;

    const rows = commands.map(([label, cmd]) => `| ${label} | \`${cmd}\` |`);
    return [
      '## Migration Komutlari',
      '',
      '| Islem | Komut |',
      '|---|---|',
      ...rows,
      '',
      '> **UYARI:** Sifirla/reset komutlari SADECE gelistirme ortaminda kullanilir.',
    ].join('\n');
  },

  COMMIT_CONVENTION(manifest) {
    const convention = manifest?.workflows?.commit_convention || 'conventional';
    const prefixMap = manifest?.workflows?.commit_prefix_map || {
      feat: 'Yeni ozellik',
      fix: 'Hata duzeltme',
      refactor: 'Kod yeniden duzenleme',
      docs: 'Dokumantasyon',
      test: 'Test ekleme/duzeltme',
      chore: 'Bakim isleri',
      style: 'Format/stil degisikligi',
      perf: 'Performans iyilestirme',
      ci: 'CI/CD degisikligi',
    };

    const rows = Object.entries(prefixMap)
      .map(([prefix, desc]) => `| \`${prefix}:\` | ${desc} |`);

    return [
      '## Commit Konvansiyonu',
      '',
      `Tip: **${convention}**`,
      '',
      '| Prefix | Aciklama |',
      '|---|---|',
      ...rows,
      '',
      'Ornek: `feat: kullanici kayit formu eklendi`',
    ].join('\n');
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
        '## Dogrulama Komutlari',
        '',
        '| Subproject | Komut |',
        '|---|---|',
        ...rows,
      ].join('\n');
    }

    // Tek proje
    const codebasePath = getCodebasePath(manifest);
    const testCmd = manifest?.project?.scripts?.test || 'npm test';
    return [
      '## Dogrulama Komutlari',
      '',
      '| Islem | Komut |',
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

      if (rows.length === 0) return '## Derleme Komutlari\n\nDerleme komutu tanimlanmadi.';
      return ['## Derleme Komutlari', '', '| Subproject | Komut |', '|---|---|', ...rows].join('\n');
    }

    const buildCmd = manifest?.project?.scripts?.build || 'npm run build';
    return [
      '## Derleme Komutlari',
      '',
      '| Islem | Komut |',
      '|---|---|',
      `| Build | \`cd "${codebasePath}" && ${buildCmd}\` |`,
    ].join('\n');
  },

  BUILD_COMMANDS(manifest) {
    return SIMPLE_GENERATORS.COMPILE_COMMANDS(manifest);
  },

  // --- UZANTI LISTELERI (JS format icin ozel) ---

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
        "{ pattern: /eval\\s*\\(/, severity: 'CRITICAL', message: 'eval() kullanimi tespit edildi!' }",
        "{ pattern: /res\\.send\\(.*req\\.(body|query|params)/, severity: 'HIGH', message: 'Dogrudan kullanici girdisi response\\'a yansitiliyor (XSS riski)' }",
      );
    }
    if (allStacks.some(s => s.includes('prisma'))) {
      patterns.push(
        "{ pattern: /\\$queryRaw\\s*`[^`]*\\$\\{/, severity: 'CRITICAL', message: 'Raw query\\'de interpolasyon — SQL injection riski!' }",
        "{ pattern: /\\$executeRaw\\s*`[^`]*\\$\\{/, severity: 'CRITICAL', message: 'Raw execute\\'da interpolasyon — SQL injection riski!' }",
      );
    }
    if (allStacks.some(s => s.includes('php') || s.includes('laravel'))) {
      patterns.push(
        "{ pattern: /\\$_(GET|POST|REQUEST)\\[/, severity: 'HIGH', message: 'Raw superglobal kullanimi — sanitize edilmeli' }",
      );
    }
    if (allStacks.some(s => s.includes('react'))) {
      patterns.push(
        "{ pattern: /dangerouslySetInnerHTML/, severity: 'HIGH', message: 'dangerouslySetInnerHTML kullanimi — XSS riski' }",
      );
    }
    if (allStacks.some(s => s.includes('django') || s.includes('python'))) {
      patterns.push(
        "{ pattern: /\\.raw\\s*\\([^)]*%/, severity: 'CRITICAL', message: 'Raw SQL\\'de string formatting — SQL injection riski!' }",
        "{ pattern: /mark_safe\\s*\\(/, severity: 'HIGH', message: 'mark_safe kullanimi — XSS riski' }",
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
    const url = prodEnv?.url || '<PROJE_URL>';
    const healthCheck = prodEnv?.health_check;
    const rawPrefix = manifest?.project?.api_prefix || '';
    const apiPrefix = rawPrefix && !rawPrefix.startsWith('/') ? '/' + rawPrefix : rawPrefix;
    const apiEndpoints = manifest?.api_endpoints || [];

    const rows = [];

    // Health check endpoint — her zaman dahil
    const healthUrl = healthCheck || `${url}/health`;
    rows.push(`| \`GET ${healthUrl}\` | 200 OK | — |`);

    if (apiEndpoints.length > 0) {
      // Dinamik endpoint listesi (manifest.api_endpoints den)
      for (const ep of apiEndpoints) {
        const method = (ep.method || 'GET').toUpperCase();
        const epPath = ep.path || '/';
        const expectedStatus = parseInt(ep.response, 10) || 200;
        const auth = ep.auth === 'required' ? 'Authorization gerekli' : '—';
        rows.push(`| \`${method} ${url}${epPath}\` | ${expectedStatus} | ${auth} |`);
      }
    } else {
      // Fallback: sabit status endpoint (api_endpoints yoksa)
      const statusUrl = `${url}${apiPrefix}/status`;
      rows.push(`| \`GET ${statusUrl}\` | 200 OK | — |`);
    }

    return [
      '## Smoke Test Endpoint\'leri',
      '',
      '| Endpoint | Beklenen | Auth |',
      '|---|---|---|',
      ...rows,
    ].join('\n');
  },

  // --- API SMOKE TEST SCRIPT ---

  API_SMOKE_SCRIPT(manifest) {
    const envs = manifest?.environments || [];
    const prodEnv = envs.find(e => e.name === 'production' || e.name === 'prod');
    const url = prodEnv?.url || '<PROJE_URL>';
    const healthCheck = prodEnv?.health_check;
    const apiEndpoints = manifest?.api_endpoints || [];
    const rawPrefix = manifest?.project?.api_prefix || '';
    const apiPrefix = rawPrefix && !rawPrefix.startsWith('/') ? '/' + rawPrefix : rawPrefix;

    const healthUrl = healthCheck || `${url}/health`;
    const lines = [
      '#!/bin/bash',
      '# Smoke Test Script — Bootstrap tarafindan uretilmistir',
      '# Kullanim: bash smoke-test.sh [TOKEN]',
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
      '    echo "❌ $method $url → $status (beklenen: $expected)"',
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
      '  echo "━━━ Smoke Test BASARISIZ ($ERRORS hata) ━━━"',
      '  exit 1',
      'fi',
      'echo "━━━ Smoke Test BASARILI ━━━"',
    );

    return lines.join('\n');
  },

  API_SMOKE_NODE_TESTS(manifest) {
    const envs = manifest?.environments || [];
    const prodEnv = envs.find(e => e.name === 'production' || e.name === 'prod');
    const url = prodEnv?.url || '<PROJE_URL>';
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
      "  assert.strictEqual(res.status, expectedStatus, `${method} ${path} → ${res.status} (beklenen: ${expectedStatus})`);", // eslint-disable-line no-template-curly-in-string
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

  // --- TEST DOSYASI ESLESTIRME ---

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
      '| Kaynak Pattern | Test Dosyasi | Framework |',
      '|---|---|---|',
      ...rows,
    ].join('\n');
  },

  // --- TASK ROUTING YAPILANDIRMASI ---

  TASK_ROUTING_CONFIG(manifest) {
    const testStrategy = manifest?.workflows?.test_strategy || 'none';
    const securityLevel = manifest?.project?.security_level || 'standard';

    const redGreenActive = testStrategy.toLowerCase() === 'tdd' ? 'AKTIF' : 'PASIF';
    const dualPassActive = securityLevel.toLowerCase() === 'high' ? 'AKTIF' : 'PASIF';

    return [
      '#### Proje Yapilandirmasi (Manifest)',
      '',
      `- **Test stratejisi:** \`${testStrategy}\` — Red-Green modifier ${redGreenActive}`,
      `- **Guvenlik seviyesi:** \`${securityLevel}\` — Dual-Pass modifier ${dualPassActive}`,
    ].join('\n');
  },

  // --- GIT HOOK BLOKLARI (bash script ciktisi) ---

  GIT_PRECOMMIT_COMPILE(manifest) {
    const stack = manifest?.stack || {};
    const codebasePath = getCodebasePath(manifest);
    const lines = [];

    if (hasTypeScript(manifest)) {
      lines.push(
        'echo "→ TypeScript derleme kontrolu..."',
        `cd "$CODEBASE_DIR" && npx tsc --noEmit 2>&1 || {`,
        '  echo "❌ TypeScript derleme hatasi!"',
        '  ERRORS=1',
        '}',
      );
    }

    const runtime = (stack.runtime || '').toLowerCase();
    if (runtime === 'go') {
      lines.push(
        'echo "→ Go build kontrolu..."',
        `cd "$CODEBASE_DIR" && go build ./... 2>&1 || {`,
        '  echo "❌ Go build hatasi!"',
        '  ERRORS=1',
        '}',
      );
    }
    if (runtime === 'rust') {
      lines.push(
        'echo "→ Cargo check kontrolu..."',
        `cd "$CODEBASE_DIR" && cargo check 2>&1 || {`,
        '  echo "❌ Cargo check hatasi!"',
        '  ERRORS=1',
        '}',
      );
    }

    if (lines.length === 0) {
      return '# Derleme kontrolu: Stack icin derleme komutu tespit edilemedi';
    }
    return lines.join('\n');
  },

  GIT_PRECOMMIT_TEST(manifest) {
    const stack = manifest?.stack || {};
    const codebasePath = getCodebasePath(manifest);
    const testCmd = manifest?.project?.scripts?.test;
    const lines = [];

    const testFramework = (stack.test_framework || '').toLowerCase();
    const runtime = (stack.runtime || '').toLowerCase();

    if (testCmd) {
      const safeCmd = sanitizeShellCommand(testCmd);
      lines.push(
        'echo "→ Test calistiriliyor..."',
        `cd "$CODEBASE_DIR" && ${safeCmd} 2>&1 || {`,
        '  echo "❌ Testler basarisiz!"',
        '  ERRORS=1',
        '}',
      );
    } else if (testFramework === 'jest' || testFramework === 'vitest' || testFramework === 'mocha') {
      lines.push(
        'echo "→ Test calistiriliyor..."',
        `cd "$CODEBASE_DIR" && npm test 2>&1 || {`,
        '  echo "❌ Testler basarisiz!"',
        '  ERRORS=1',
        '}',
      );
    } else if (testFramework === 'pytest') {
      lines.push(
        'echo "→ Test calistiriliyor..."',
        `cd "$CODEBASE_DIR" && python -m pytest 2>&1 || {`,
        '  echo "❌ Testler basarisiz!"',
        '  ERRORS=1',
        '}',
      );
    } else if (testFramework === 'phpunit') {
      lines.push(
        'echo "→ Test calistiriliyor..."',
        `cd "$CODEBASE_DIR" && ./vendor/bin/phpunit 2>&1 || {`,
        '  echo "❌ Testler basarisiz!"',
        '  ERRORS=1',
        '}',
      );
    } else if (runtime === 'go') {
      lines.push(
        'echo "→ Test calistiriliyor..."',
        `cd "$CODEBASE_DIR" && go test ./... 2>&1 || {`,
        '  echo "❌ Testler basarisiz!"',
        '  ERRORS=1',
        '}',
      );
    }

    if (lines.length === 0) {
      return '# Test kontrolu: Test framework tespit edilemedi';
    }
    return lines.join('\n');
  },

  GIT_PRECOMMIT_LINT(manifest) {
    const stack = manifest?.stack || {};
    const lines = [];

    const linter = (stack.linter || '').toLowerCase();

    if (linter === 'eslint') {
      lines.push(
        '# Staged dosyalarda lint kontrolu',
        'LINT_FILES=$(echo "$STAGED_FILES" | grep -E "\\.(ts|tsx|js|jsx|mjs|cjs)$" || true)',
        'if [ -n "$LINT_FILES" ]; then',
        '  echo "→ ESLint kontrolu..."',
        '  echo "$LINT_FILES" | tr \'\\n\' \'\\0\' | xargs -0 npx eslint --quiet 2>&1 || {',
        '    echo "❌ Lint hatalari var!"',
        '    ERRORS=1',
        '  }',
        'fi',
      );
    } else if (linter === 'biome') {
      lines.push(
        '# Staged dosyalarda lint kontrolu',
        'LINT_FILES=$(echo "$STAGED_FILES" | grep -E "\\.(ts|tsx|js|jsx|mjs|cjs|json)$" || true)',
        'if [ -n "$LINT_FILES" ]; then',
        '  echo "→ Biome lint kontrolu..."',
        '  echo "$LINT_FILES" | tr \'\\n\' \'\\0\' | xargs -0 npx biome check --no-errors-on-unmatched 2>&1 || {',
        '    echo "❌ Lint hatalari var!"',
        '    ERRORS=1',
        '  }',
        'fi',
      );
    } else if (linter === 'ruff') {
      lines.push(
        '# Staged dosyalarda lint kontrolu',
        'LINT_FILES=$(echo "$STAGED_FILES" | grep -E "\\.py$" || true)',
        'if [ -n "$LINT_FILES" ]; then',
        '  echo "→ Ruff lint kontrolu..."',
        '  echo "$LINT_FILES" | tr \'\\n\' \'\\0\' | xargs -0 ruff check 2>&1 || {',
        '    echo "❌ Lint hatalari var!"',
        '    ERRORS=1',
        '  }',
        'fi',
      );
    }

    if (lines.length === 0) {
      return '# Lint kontrolu: Linter tespit edilemedi';
    }
    return lines.join('\n');
  },

  GIT_PRECOMMIT_FORMAT(manifest) {
    const stack = manifest?.stack || {};
    const lines = [];

    const formatter = (stack.formatter || '').toLowerCase();

    if (formatter === 'prettier') {
      lines.push(
        '# Staged dosyalarda format kontrolu',
        'FORMAT_FILES=$(echo "$STAGED_FILES" | grep -E "\\.(ts|tsx|js|jsx|mjs|cjs|json|css|scss|md)$" || true)',
        'if [ -n "$FORMAT_FILES" ]; then',
        '  echo "→ Prettier format kontrolu..."',
        '  echo "$FORMAT_FILES" | tr \'\\n\' \'\\0\' | xargs -0 npx prettier --check 2>&1 || {',
        '    echo "❌ Format hatalari var! npx prettier --write ile duzeltebilirsiniz."',
        '    ERRORS=1',
        '  }',
        'fi',
      );
    } else if (formatter === 'biome') {
      lines.push(
        '# Staged dosyalarda format kontrolu',
        'FORMAT_FILES=$(echo "$STAGED_FILES" | grep -E "\\.(ts|tsx|js|jsx|mjs|cjs|json)$" || true)',
        'if [ -n "$FORMAT_FILES" ]; then',
        '  echo "→ Biome format kontrolu..."',
        '  echo "$FORMAT_FILES" | tr \'\\n\' \'\\0\' | xargs -0 npx biome format --no-errors-on-unmatched 2>&1 || {',
        '    echo "❌ Format hatalari var! npx biome format --write ile duzeltebilirsiniz."',
        '    ERRORS=1',
        '  }',
        'fi',
      );
    } else if (formatter === 'ruff') {
      lines.push(
        '# Staged dosyalarda format kontrolu',
        'FORMAT_FILES=$(echo "$STAGED_FILES" | grep -E "\\.py$" || true)',
        'if [ -n "$FORMAT_FILES" ]; then',
        '  echo "→ Ruff format kontrolu..."',
        '  echo "$FORMAT_FILES" | tr \'\\n\' \'\\0\' | xargs -0 ruff format --check 2>&1 || {',
        '    echo "❌ Format hatalari var! ruff format ile duzeltebilirsiniz."',
        '    ERRORS=1',
        '  }',
        'fi',
      );
    }

    if (lines.length === 0) {
      return '# Format kontrolu: Formatter tespit edilemedi';
    }
    return lines.join('\n');
  },

  GIT_PREPUSH_LOCALHOST(manifest) {
    const stack = manifest?.stack || {};
    const codeExts = getCodeExtensions(manifest);
    const extPattern = codeExts.length > 0
      ? codeExts.map(e => e.replace('.', '\\.')).join('|')
      : '\\.(ts|js|py|php|go|rs|java)';

    return [
      '  # Localhost/127.0.0.1 leak taramasi',
      '  PUSH_DIFF=$(git diff "$RANGE" -- . 2>/dev/null || true)',
      '  if [ -n "$PUSH_DIFF" ]; then',
      '    # Test ve config dosyalarini haric tut',
      '    LOCALHOST_HITS=$(echo "$PUSH_DIFF" | grep -n "^+" | grep -v "^+++" | \\',
      '      grep -Ei "(localhost:[0-9]+|127\\.0\\.0\\.1|0\\.0\\.0\\.0:[0-9]+)" | \\',
      '      grep -vE "(test|spec|__tests__|mock|fixture|docker-compose|Dockerfile|\\.env\\.example)" || true)',
      '    if [ -n "$LOCALHOST_HITS" ]; then',
      '      echo "❌ Localhost referansi tespit edildi!"',
      '      echo "   Asagidaki satirlari kontrol edin:"',
      '      echo "$LOCALHOST_HITS" | head -5 | sed \'s/^/     /\'',
      '      ERRORS=1',
      '    fi',
      '  fi',
    ].join('\n');
  },

  GIT_PREPUSH_MIGRATION(manifest) {
    const stack = manifest?.stack || {};
    const orm = (stack.orm || '').toLowerCase();
    const codebasePath = getCodebasePath(manifest);
    const lines = [];

    if (orm === 'prisma') {
      lines.push(
        '  # Prisma migration tutarliligi',
        '  SCHEMA_CHANGED=$(git diff "$RANGE" --name-only -- "*/prisma/schema.prisma" | head -1)',
        '  if [ -n "$SCHEMA_CHANGED" ]; then',
        '    NEW_MIGRATION=$(git diff "$RANGE" --name-only -- "*/prisma/migrations/" | head -1)',
        '    if [ -z "$NEW_MIGRATION" ]; then',
        '      echo "❌ schema.prisma degisti ama yeni migration yok!"',
        '      echo "   npx prisma migrate dev --name <aciklama> calistirin."',
        '      ERRORS=1',
        '    fi',
        '  fi',
      );
    } else if (orm === 'typeorm') {
      lines.push(
        '  # TypeORM migration tutarliligi',
        '  ENTITY_CHANGED=$(git diff "$RANGE" --name-only -- "*/entities/*.ts" "*/entity/*.ts" | head -1)',
        '  if [ -n "$ENTITY_CHANGED" ]; then',
        '    NEW_MIGRATION=$(git diff "$RANGE" --name-only -- "*/migrations/*.ts" | head -1)',
        '    if [ -z "$NEW_MIGRATION" ]; then',
        '      echo "❌ Entity dosyasi degisti ama yeni migration yok!"',
        '      echo "   npx typeorm migration:generate calistirin."',
        '      ERRORS=1',
        '    fi',
        '  fi',
      );
    } else if (orm === 'eloquent') {
      lines.push(
        '  # Eloquent migration tutarliligi',
        '  MODEL_CHANGED=$(git diff "$RANGE" --name-only -- "*/Models/*.php" "*/app/Models/*.php" | head -1)',
        '  if [ -n "$MODEL_CHANGED" ]; then',
        '    NEW_MIGRATION=$(git diff "$RANGE" --name-only -- "*/database/migrations/*.php" | head -1)',
        '    if [ -z "$NEW_MIGRATION" ]; then',
        '      echo "⚠️  Model degisti ama yeni migration yok — kontrol edin."',
        '      WARNINGS=$((WARNINGS + 1))',
        '    fi',
        '  fi',
      );
    } else if (orm === 'django-orm') {
      lines.push(
        '  # Django migration tutarliligi',
        '  MODEL_CHANGED=$(git diff "$RANGE" --name-only -- "*/models.py" | head -1)',
        '  if [ -n "$MODEL_CHANGED" ]; then',
        '    NEW_MIGRATION=$(git diff "$RANGE" --name-only -- "*/migrations/0*.py" | head -1)',
        '    if [ -z "$NEW_MIGRATION" ]; then',
        '      echo "❌ models.py degisti ama yeni migration yok!"',
        '      echo "   python manage.py makemigrations calistirin."',
        '      ERRORS=1',
        '    fi',
        '  fi',
      );
    }

    if (lines.length === 0) {
      return '  # Migration kontrolu: ORM tespit edilemedi';
    }
    return lines.join('\n');
  },

  GIT_PREPUSH_ENV(manifest) {
    const stack = manifest?.stack || {};
    const runtime = (stack.runtime || '').toLowerCase();
    const lines = [];

    lines.push(
      '  # Env variable senkronizasyon kontrolu',
      '  if [ -f "$CODEBASE_DIR/.env.example" ]; then',
      '    EXAMPLE_KEYS=$(grep -E "^[A-Z_]+=" "$CODEBASE_DIR/.env.example" 2>/dev/null | cut -d= -f1 | sort || true)',
    );

    if (runtime === 'node' || hasTypeScript(manifest)) {
      lines.push(
        '    # process.env referanslarini tara',
        '    CODE_KEYS=$(grep -rhoE "process\\.env\\.([A-Z_]+)" "$CODEBASE_DIR/src/" 2>/dev/null | sed "s/process\\.env\\.//" | sort -u || true)',
      );
    } else if (runtime === 'python') {
      lines.push(
        '    # os.environ referanslarini tara',
        '    CODE_KEYS=$(grep -rhoE "os\\.environ\\[.([A-Z_]+).|os\\.getenv\\(.([A-Z_]+)." "$CODEBASE_DIR/" 2>/dev/null | grep -oE "[A-Z_]+" | sort -u || true)',
      );
    } else if (runtime === 'php') {
      lines.push(
        '    # env() referanslarini tara',
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
      '        echo "⚠️  .env.example ile kod arasinda env tutarsizligi:"',
      '        echo "   Kodda var ama .env.example da yok:"',
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
      '  # Destructive migration uyarisi',
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
      '      echo "⚠️  DESTRUCTIVE migration tespit edildi!"',
      '      echo "   Asagidaki satirlari kontrol edin:"',
      '      echo "$DESTRUCTIVE" | head -5 | sed \'s/^/     /\'',
      '      WARNINGS=$((WARNINGS + 1))',
      '    fi',
      '  fi',
    );

    return lines.join('\n');
  },
};

// ─────────────────────────────────────────────────────
// DOSYA ISLEMCILERI
// ─────────────────────────────────────────────────────

/**
 * Skeleton dosyasi tipini belirler.
 * @param {string} filePath
 * @returns {'md'|'js'|'json'}
 */
function detectFileType(filePath) {
  if (filePath.endsWith('.json')) return 'json';
  if (filePath.endsWith('.js')) return 'js';
  return 'md';
}

/**
 * Skeleton dosya adini cikti dosya adina donusturur (.skeleton uzantisini kaldirir).
 */
function toOutputName(filename) {
  return filename.replace('.skeleton', '');
}

/**
 * Bir skeleton dosyasini isle ve sonucunu dondur.
 * @param {string} filePath - Skeleton dosya yolu
 * @param {Object} manifest - Manifest verisi
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
      throw new Error(`Gecersiz JSON skeleton dosyasi: ${jsonErr.message}`);
    }
    const { obj: processed, filled, marked } = processJsonGenerateKeys(obj, manifest);
    return {
      outputContent: JSON.stringify(processed, null, 2) + '\n',
      filled,
      marked,
    };
  }

  const result = fillBlocks(content, fileType, manifest);

  // Hook dosyalarindaki hardcoded CODEBASE_ROOT yolunu manifest ile degistir
  const codebasePath = getCodebasePath(manifest);
  const codebaseReplacement = () => `const CODEBASE_ROOT = (() => { const p = path.resolve(__dirname, '../..', ${JSON.stringify(codebasePath)}); try { return fs.realpathSync(p); } catch { return p; } })();`;

  // Basit format: path.resolve(__dirname, '../../../Codebase');
  let outputContent = result.content.replace(
    /const CODEBASE_ROOT = path\.resolve\(__dirname, '\.\.\/\.\.\/\.\.\/Codebase'\);/,
    codebaseReplacement
  );
  // IIFE format: (() => { ... '../../../Codebase' ... })();
  outputContent = outputContent.replace(
    /const CODEBASE_ROOT = \(\(\) => \{ const p = path\.resolve\(__dirname, '\.\.\/\.\.\/\.\.\/Codebase'\); try \{ return fs\.realpathSync\(p\); \} catch \{ return p; \} \}\)\(\);/,
    codebaseReplacement
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
    if (filename === 'claude-ignore') return path.join(outputDir, '.claude-ignore');
    return path.join(outputDir, filename);
  }

  // modules/* mapping
  if (parts[0] === 'modules') {
    // modules/{kategori}/{...}/{varyant}/{tip}/dosya
    const tip = parts[parts.length - 2]; // commands, agents, hooks, rules
    const leafVariant = parts[parts.length - 3]; // docker, prisma, express, monorepo
    const targetDir = `.claude/${tip}`;

    // Collision onleme: dosya adi zaten modul adini icermiyorsa prefix ekle
    // docker/commands/pre-deploy → docker-pre-deploy (collision onlendi)
    // prisma/rules/prisma-rules → prisma-rules (prefix zaten var, dokunma)
    const prefixedFilename = filename.toLowerCase().startsWith(leafVariant.toLowerCase())
      ? filename
      : `${leafVariant}-${filename}`;

    return path.join(outputDir, targetDir, prefixedFilename);
  }

  return path.join(outputDir, filename);
}

/**
 * Templates dizinindeki tum template dosyalarini tarar.
 * Skeleton dosyalari (.skeleton) ve sabit dosyalari (hooks/, rules/, commands/, agents/
 * icindeki .js ve .md dosyalari) dahil eder.
 * Sadece aktif modullerin dosyalarini dahil eder.
 */
function scanSkeletonFiles(manifest) {
  const files = [];
  const activeModules = getActiveModules(manifest);
  const CONTENT_DIRS = new Set(['rules', 'hooks', 'commands', 'agents']);
  const SKIP_DIRS = new Set(['interview', 'reference']);

  function isTemplateFile(entry, fullPath) {
    if (entry.name.includes('.skeleton.') || entry.name.endsWith('.skeleton')) return true;
    // Sabit dosya: .js veya .md, content dizini (hooks/, rules/, commands/, agents/) icinde
    if (entry.name.endsWith('.js') || entry.name.endsWith('.md')) {
      const parentDir = path.basename(path.dirname(fullPath));
      if (CONTENT_DIRS.has(parentDir) && entry.name !== 'detect.md') return true;
    }
    return false;
  }

  function isModuleActive(relPath) {
    if (!relPath.startsWith('modules/')) return true; // core dosyalari her zaman dahil
    const parts = relPath.split(path.sep);
    if (parts.length < 3) return true;

    const moduleSegments = [];
    for (let i = 2; i < parts.length; i++) {
      if (CONTENT_DIRS.has(parts[i]) || parts[i].includes('.skeleton.') || parts[i].endsWith('.skeleton')) break;
      // Sabit dosya adini da dur noktasi olarak kontrol et
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
 * Skeleton dosya listesini belirtilen modullerle filtreler.
 * core/ dosyalari her zaman dahil edilir.
 * modules/ dosyalari sadece onlyModules listesindeki modullerle eslesirse dahil edilir.
 */
function filterByModules(skeletonFiles, onlyModules) {
  const moduleSet = new Set(onlyModules);
  const CONTENT_DIRS = new Set(['rules', 'hooks', 'commands', 'agents']);

  return skeletonFiles.filter(filePath => {
    const relPath = path.relative(TEMPLATES_DIR, filePath);
    if (!relPath.startsWith('modules' + path.sep)) return true; // core → her zaman dahil

    const parts = relPath.split(path.sep);
    // modules/<category>/<variant>/... seklinde modul yolunu cikar
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

  // --modules parametresi: sadece belirtilen modullerin dosyalarini isle
  const modulesIdx = args.indexOf('--modules');
  if (modulesIdx !== -1 && args[modulesIdx + 1]) {
    flags.onlyModules = args[modulesIdx + 1].split(',').map(m => m.trim()).filter(Boolean);
  }

  const manifestPath = findManifestArg(args);

  if (!manifestPath) {
    console.error('Kullanim: node generate.js <manifest-yolu> [--output-dir <dir>] [--modules <modul-listesi>] [--dry-run] [--verbose]');
    process.exit(1);
  }

  const resolvedManifestPath = path.resolve(manifestPath);
  if (!fs.existsSync(resolvedManifestPath)) {
    console.error(`Hata: Manifest dosyasi bulunamadi: ${resolvedManifestPath}`);
    process.exit(1);
  }

  // Manifest oku
  const manifestContent = fs.readFileSync(resolvedManifestPath, 'utf8');
  let manifest;
  try {
    manifest = yaml.load(manifestContent);
  } catch (yamlErr) {
    const mark = yamlErr.mark;
    const location = mark ? ` (satir ${mark.line + 1}, kolon ${mark.column + 1})` : '';
    console.error(`Hata: Manifest YAML parse hatasi${location}: ${yamlErr.reason || yamlErr.message}`);
    process.exit(1);
  }

  if (!manifest) {
    console.error('Hata: Manifest bos veya gecersiz.');
    process.exit(1);
  }

  const outputDir = flags.outputDir || AGENTBASE_DIR;

  // Skeleton dosyalarini tara
  let skeletonFiles = scanSkeletonFiles(manifest);

  // --modules filtresi: sadece belirtilen modullerin ve core dosyalarinin islenmesi
  if (flags.onlyModules && flags.onlyModules.length > 0) {
    skeletonFiles = filterByModules(skeletonFiles, flags.onlyModules);
  }

  if (skeletonFiles.length === 0) {
    if (flags.onlyModules && flags.onlyModules.length > 0) {
      console.error(`Hata: Belirtilen moduller icin hicbir skeleton dosyasi bulunamadi: ${flags.onlyModules.join(', ')}`);
      process.exit(1);
    }
    console.error('Uyari: Hicbir skeleton dosyasi bulunamadi.');
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

  // Her skeleton dosyasini isle
  for (const skeletonPath of skeletonFiles) {
    const relPath = path.relative(TEMPLATES_DIR, skeletonPath);

    try {
      let { outputContent, filled, marked } = processSkeletonFile(skeletonPath, manifest);
      const outputPath = resolveOutputPath(skeletonPath, outputDir);

      // Prefix tutarliligi: dosya adina prefix eklendiyse icerideki komut referanslarini guncelle
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
        if (filled.length) console.log(`    Dolduruldu: ${filled.join(', ')}`);
        if (marked.length) console.log(`    Claude icin: ${marked.join(', ')}`);
      }

      if (!flags.dryRun) {
        // Path traversal koruması: çıktı yolu outputDir içinde kalmalı
        const resolvedOutput = path.resolve(outputPath);
        const resolvedBase = path.resolve(outputDir);
        if (!resolvedOutput.startsWith(resolvedBase + path.sep) && resolvedOutput !== resolvedBase) {
          throw new Error(`Path traversal tespit edildi: ${outputPath} dizin disinda`);
        }
        const dir = path.dirname(outputPath);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(outputPath, outputContent, 'utf8');
      }
    } catch (err) {
      report.errors.push(`${relPath}: ${err.message}`);
      if (flags.verbose) {
        console.error(`  HATA: ${relPath}: ${err.message}`);
      }
    }
  }

  // Rapor ciktisi
  console.log('');
  console.log('━'.repeat(55));
  console.log('  Skeleton Isleme Raporu');
  console.log('━'.repeat(55));
  console.log(`  Dosya sayisi:        ${report.total}`);
  console.log(`  Islenen:             ${report.processed}`);
  console.log(`  Deterministik blok:  ${report.filledBlocks.length}`);
  console.log(`  Claude icin:         ${report.markedBlocks.length}`);
  console.log(`  Hata:                ${report.errors.length}`);
  if (flags.dryRun) {
    console.log(`  Mod:                 DRY RUN (dosya yazilmadi)`);
  }
  console.log('━'.repeat(55));

  if (report.markedBlocks.length > 0) {
    console.log('');
    console.log('Claude tarafindan doldurulmasi gereken bloklar:');
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
// EXPORT (test icin)
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
  filterByModules,
  toOutputName,
  detectFileType,
  getActiveModules,
  getFileExtensions,
  getCodeExtensions,
  getSubprojectPath,
  getCodebasePath,
  getForbiddenRules,
  getMigrationCommands,
  SIMPLE_GENERATORS,
  TEMPLATES_DIR,
};

// Script olarak calistirildiginda
if (require.main === module) {
  main();
}

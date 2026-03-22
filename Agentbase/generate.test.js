#!/usr/bin/env node
'use strict';

/**
 * generate.test.js — generate.js icin unit testler
 * Calistirma: node --test generate.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  extractBlockNames,
  fillBlocks,
  processJsonGenerateKeys,
  scanSkeletonFiles,
  toOutputName,
  detectFileType,
  getActiveModules,
  getFileExtensions,
  getCodeExtensions,
  getMigrationCommands,
  SIMPLE_GENERATORS,
  TEMPLATES_DIR,
} = require('./generate.js');

// ─────────────────────────────────────────────────────
// TEST MANIFEST
// ─────────────────────────────────────────────────────

const testManifest = {
  project: {
    description: 'Test projesi',
    type: 'monorepo',
    language: 'tr',
    structure: '../Codebase',
    subprojects: [
      {
        name: 'api',
        path: '../Codebase/api',
        role: 'Backend API',
        test_command: 'npm test',
        build_command: 'npm run build',
        modules: { orm: ['prisma'] },
      },
      {
        name: 'web',
        path: '../Codebase/web',
        role: 'Frontend',
        test_command: 'npm run test',
        modules: {},
      },
    ],
    scripts: {
      test: 'npm test',
      build: 'npm run build',
    },
  },
  stack: {
    primary: 'Node.js',
    detected: ['TypeScript', 'React', 'Prisma'],
    orm: 'prisma',
    test_framework: 'jest',
    test_commands: { api: 'npm test', web: 'npm run test' },
    linter: 'eslint',
    formatter: 'prettier',
  },
  modules: {
    active: {
      orm: ['prisma'],
      backend: ['nodejs/express'],
      frontend: ['react'],
    },
  },
  workflows: {
    commit_convention: 'conventional',
    commit_prefix_map: {
      feat: 'Yeni ozellik',
      fix: 'Hata duzeltme',
      refactor: 'Yeniden duzenleme',
    },
  },
  rules: {
    forbidden: [
      { type: 'block', pattern: 'rm -rf /', reason: 'Tehlikeli komut' },
      { type: 'warn', pattern: 'console.log', reason: 'Debug kodu' },
    ],
  },
  environments: [
    { name: 'production', url: 'https://api.example.com', health_check: 'https://api.example.com' },
    { name: 'staging', url: 'https://staging.example.com' },
  ],
};

// ─────────────────────────────────────────────────────
// MD GENERATE BLOK PARSER TESTLERI
// ─────────────────────────────────────────────────────

describe('MD GENERATE Blok Parser', () => {
  it('tek blogu dogru parse eder', () => {
    const content = `# Baslik

<!-- GENERATE: CODEBASE_CONTEXT
Aciklama: Test
Ornek: ...
-->

## Devam`;

    const names = extractBlockNames(content, 'md');
    assert.deepStrictEqual(names, ['CODEBASE_CONTEXT']);
  });

  it('birden fazla blogu parse eder', () => {
    const content = `
<!-- GENERATE: BLOCK_A
desc A
-->

Araya metin

<!-- GENERATE: BLOCK_B
desc B
-->`;

    const names = extractBlockNames(content, 'md');
    assert.deepStrictEqual(names, ['BLOCK_A', 'BLOCK_B']);
  });

  it('GENERATE blogu olmayan icerikte bos dizi dondurur', () => {
    const content = '# Baslik\n\nNormal icerik\n';
    const names = extractBlockNames(content, 'md');
    assert.deepStrictEqual(names, []);
  });
});

// ─────────────────────────────────────────────────────
// JS GENERATE BLOK PARSER TESTLERI
// ─────────────────────────────────────────────────────

describe('JS GENERATE Blok Parser', () => {
  it('JS formatindaki blogu parse eder', () => {
    const content = `const LAYER_TESTS = [
  /* GENERATE: LAYER_TESTS
   * Aciklama...
   */
  /* END GENERATE */
];`;

    const names = extractBlockNames(content, 'js');
    assert.deepStrictEqual(names, ['LAYER_TESTS']);
  });

  it('birden fazla JS blogunu parse eder', () => {
    const content = `
const A = [
  /* GENERATE: SECURITY_PATTERNS
   * test
   */
  /* END GENERATE */
];

const B = [
  /* GENERATE: FILE_EXTENSIONS
   * test
   */
  /* END GENERATE */
];`;

    const names = extractBlockNames(content, 'js');
    assert.deepStrictEqual(names, ['SECURITY_PATTERNS', 'FILE_EXTENSIONS']);
  });
});

// ─────────────────────────────────────────────────────
// BLOK DOLDURMA TESTLERI
// ─────────────────────────────────────────────────────

describe('fillBlocks', () => {
  it('basit MD blogunu doldurur', () => {
    const content = `# Test

<!-- GENERATE: COMMIT_CONVENTION
test desc
-->

## Son`;

    const result = fillBlocks(content, 'md', testManifest);
    assert.ok(result.filled.includes('COMMIT_CONVENTION'));
    assert.ok(result.content.includes('## Commit Konvansiyonu'));
    assert.ok(result.content.includes('`feat:`'));
    assert.ok(!result.content.includes('<!-- GENERATE:'));
  });

  it('karmasik MD blogunu CLAUDE_FILL ile isaretler', () => {
    const content = `<!-- GENERATE: CODEBASE_CONTEXT
desc
-->`;

    const result = fillBlocks(content, 'md', testManifest);
    assert.ok(result.marked.includes('CODEBASE_CONTEXT'));
    assert.ok(result.content.includes('<!-- CLAUDE_FILL: CODEBASE_CONTEXT'));
  });

  it('basit JS blogunu doldurur', () => {
    const content = `const exts = [
  /* GENERATE: FILE_EXTENSIONS
   * test
   */
  /* END GENERATE */
];`;

    const result = fillBlocks(content, 'js', testManifest);
    assert.ok(result.filled.includes('FILE_EXTENSIONS'));
    assert.ok(result.content.includes("'.ts'"));
    assert.ok(!result.content.includes('GENERATE:'));
    assert.ok(!result.content.includes('END GENERATE'));
  });

  it('karisik basit ve karmasik bloklari ayri isle', () => {
    const content = `
<!-- GENERATE: COMMIT_CONVENTION
simple
-->

<!-- GENERATE: CODEBASE_CONTEXT
complex
-->

<!-- GENERATE: VERIFICATION_COMMANDS
simple
-->`;

    const result = fillBlocks(content, 'md', testManifest);
    assert.strictEqual(result.filled.length, 2);
    assert.strictEqual(result.marked.length, 1);
    assert.ok(result.filled.includes('COMMIT_CONVENTION'));
    assert.ok(result.filled.includes('VERIFICATION_COMMANDS'));
    assert.ok(result.marked.includes('CODEBASE_CONTEXT'));
  });
});

// ─────────────────────────────────────────────────────
// JSON GENERATE ISLEMCI TESTLERI
// ─────────────────────────────────────────────────────

describe('processJsonGenerateKeys', () => {
  it('__doc__ anahtarlarini kaldirir', () => {
    const obj = {
      __doc__: 'Bu bir aciklama',
      key: 'value',
    };
    const result = processJsonGenerateKeys(obj, testManifest);
    assert.ok(!('__doc__' in result.obj));
    assert.strictEqual(result.obj.key, 'value');
  });

  it('aktif modul kosullarini isler', () => {
    const obj = {
      hooks: [],
      __GENERATE__TEST_HOOKS__: {
        prisma_active: {
          __doc__: 'Prisma hook',
          type: 'command',
          command: 'node prisma-check.js',
          timeout: 10,
        },
        django_active: {
          __doc__: 'Django hook',
          type: 'command',
          command: 'python check.py',
          timeout: 10,
        },
      },
    };

    const result = processJsonGenerateKeys(obj, testManifest);
    // Prisma aktif, dahil edilmeli
    assert.ok(result.filled.includes('TEST_HOOKS'));
    // hooks array'ine eklenmis olmali
    assert.ok(result.obj.hooks.length > 0);
    // Django aktif degil, hook'u eklenmemeli
    const commands = result.obj.hooks.map(h => h.command);
    assert.ok(commands.includes('node prisma-check.js'));
    assert.ok(!commands.includes('python check.py'));
  });

  it('3-seviyeli modul isimli kosullari isler (nodejs/express_active)', () => {
    const obj = {
      hooks: [],
      __GENERATE__NESTED_HOOKS__: {
        'nodejs/express_active': {
          __doc__: 'Express hook',
          type: 'command',
          command: 'node express-check.js',
          timeout: 10,
        },
        'python/django_active': {
          __doc__: 'Django hook — aktif degil',
          type: 'command',
          command: 'python django-check.py',
          timeout: 10,
        },
        prisma_active: {
          __doc__: 'Prisma hook — duz isim, hala calismali',
          type: 'command',
          command: 'node prisma-nested.js',
          timeout: 10,
        },
      },
    };

    const result = processJsonGenerateKeys(obj, testManifest);
    assert.ok(result.filled.includes('NESTED_HOOKS'));
    const commands = result.obj.hooks.map(h => h.command);
    // nodejs/express aktif → dahil edilmeli
    assert.ok(commands.includes('node express-check.js'), 'nodejs/express_active eslesmeli');
    // python/django aktif degil → haric
    assert.ok(!commands.includes('python django-check.py'), 'python/django_active eslesmemeli');
    // prisma aktif → duz isim hala calismali
    assert.ok(commands.includes('node prisma-nested.js'), 'prisma_active hala calismali');
  });

  it('forbidden_commands template\'ini isler', () => {
    const obj = {
      hooks: [],
      __GENERATE__FORBIDDEN__: {
        forbidden_commands: {
          template: {
            type: 'command',
            command: "jq -r 'if test(\"{{FORBIDDEN_PATTERN}}\") then {\"decision\":\"block\",\"reason\":\"{{FORBIDDEN_REASON}}\"} end'",
            timeout: 5,
          },
        },
      },
    };

    const result = processJsonGenerateKeys(obj, testManifest);
    // forbidden rules'dan bir hook uretilmeli (sadece type: "block" olanlar)
    assert.ok(result.obj.hooks.length >= 1);
    const firstHook = result.obj.hooks[0];
    assert.ok(firstHook.command.includes('rm -rf /'));
  });

  it('Bash matcher li GENERATE blogu hook group olusturur', () => {
    const obj = {
      hooks: {
        PreToolUse: [
          {
            __GENERATE__PRETOOLUSE_BASH_HOOKS__: {
              __doc__: 'Bash icin hook gruplari',
              matcher: 'Bash',
              prisma_active: {
                __doc__: 'Prisma guard',
                type: 'command',
                command: 'node prisma-bash-guard.js',
                timeout: 5,
              },
            },
          },
        ],
      },
    };

    const result = processJsonGenerateKeys(obj, testManifest);
    assert.ok(result.filled.includes('PRETOOLUSE_BASH_HOOKS'));
    // PreToolUse array'inde matcher: "Bash" olan bir hook group olmali
    const bashGroup = result.obj.hooks.PreToolUse.find(g => g.matcher === 'Bash');
    assert.ok(bashGroup, 'Bash matcher li hook group olmali');
    assert.ok(Array.isArray(bashGroup.hooks), 'hooks array olmali');
    assert.strictEqual(bashGroup.hooks.length, 1);
    assert.strictEqual(bashGroup.hooks[0].command, 'node prisma-bash-guard.js');
  });

  it('ENABLED_PLUGINS root-level merge yapar', () => {
    const expoManifest = {
      ...testManifest,
      modules: { active: { orm: ['prisma'], mobile: ['expo'] } },
    };

    const obj = {
      env: {},
      __GENERATE__ENABLED_PLUGINS__: {
        expo_active: {
          'react-native-expo-complete@skills': true,
        },
      },
    };

    const result = processJsonGenerateKeys(obj, expoManifest);
    assert.ok(result.filled.includes('ENABLED_PLUGINS'));
    // Root seviyesine merge edilmis olmali
    assert.strictEqual(result.obj['react-native-expo-complete@skills'], true);
  });

  it('aktif modulu olmayan GENERATE blogu bos {} birakmaz', () => {
    const emptyManifest = { modules: { active: {} } };
    const obj = {
      hooks: {
        PreToolUse: [
          { matcher: 'Edit', hooks: [{ type: 'command', command: 'always.js' }] },
          {
            __GENERATE__BASH_HOOKS__: {
              matcher: 'Bash',
              prisma_active: { type: 'command', command: 'guard.js', timeout: 5 },
            },
          },
        ],
      },
    };

    const result = processJsonGenerateKeys(obj, emptyManifest);
    // Bos {} filtrelenmis olmali
    const preToolUse = result.obj.hooks.PreToolUse;
    assert.strictEqual(preToolUse.length, 1, 'bos obje filtrelenmeli');
    assert.strictEqual(preToolUse[0].matcher, 'Edit');
  });
});

// ─────────────────────────────────────────────────────
// YARDIMCI FONKSIYON TESTLERI
// ─────────────────────────────────────────────────────

describe('getActiveModules', () => {
  it('kategorili formatı parse eder', () => {
    const modules = getActiveModules(testManifest);
    assert.ok(modules.has('prisma'));
    assert.ok(modules.has('nodejs/express'));
    assert.ok(modules.has('react'));
    assert.ok(!modules.has('django'));
  });

  it('duz dizi formatini parse eder', () => {
    const manifest = { modules: { active: ['prisma', 'express'] } };
    const modules = getActiveModules(manifest);
    assert.ok(modules.has('prisma'));
    assert.ok(modules.has('express'));
  });

  it('bos manifest icin bos set dondurur', () => {
    const modules = getActiveModules({});
    assert.strictEqual(modules.size, 0);
  });

  it('boolean true ile ust seviye modulleri parse eder', () => {
    const manifest = { modules: { active: { security: true, monorepo: true, orm: ['prisma'] } } };
    const modules = getActiveModules(manifest);
    assert.ok(modules.has('security'));
    assert.ok(modules.has('monorepo'));
    assert.ok(modules.has('prisma'));
  });
});

describe('getFileExtensions', () => {
  it('Node.js stack icin dogru uzantilari dondurur', () => {
    const exts = getFileExtensions(testManifest);
    assert.ok(exts.includes('.ts'));
    assert.ok(exts.includes('.tsx'));
    assert.ok(exts.includes('.js'));
    assert.ok(exts.includes('.json'));
  });

  it('manifest.stack.file_extensions tanimli ise onu kullanir', () => {
    const manifest = { stack: { file_extensions: ['.py', '.pyi'] } };
    const exts = getFileExtensions(manifest);
    assert.deepStrictEqual(exts, ['.py', '.pyi']);
  });
});

describe('getCodeExtensions', () => {
  it('config uzantilarini haric tutar', () => {
    const exts = getCodeExtensions(testManifest);
    assert.ok(exts.includes('.ts'));
    assert.ok(!exts.includes('.json'));
    assert.ok(!exts.includes('.yaml'));
    assert.ok(!exts.includes('.env'));
  });
});

describe('getMigrationCommands', () => {
  it('prisma icin migration komutlari dondurur', () => {
    const cmds = getMigrationCommands(testManifest, 'prisma');
    assert.ok(cmds.length > 0);
    assert.ok(cmds.some(([label]) => label.includes('Migration')));
    assert.ok(cmds.some(([, cmd]) => cmd.includes('prisma migrate')));
  });

  it('eloquent icin migration komutlari dondurur', () => {
    const cmds = getMigrationCommands(testManifest, 'eloquent');
    assert.ok(cmds.length > 0);
    assert.ok(cmds.some(([, cmd]) => cmd.includes('artisan migrate')));
  });

  it('bilinmeyen ORM icin bos dizi dondurur', () => {
    const cmds = getMigrationCommands(testManifest, 'unknown');
    assert.deepStrictEqual(cmds, []);
  });

  it('bosluk iceren path lerde cd komutunu tirnaklar', () => {
    const spaceManifest = {
      project: { root: '../My Project' },
      stack: { orm: 'prisma', orm_path: 'src/db' },
    };
    const cmds = getMigrationCommands(spaceManifest, 'prisma');
    assert.ok(cmds.length > 0);
    for (const [, cmd] of cmds) {
      assert.ok(cmd.startsWith('cd "'), `path tirnakli olmali: ${cmd}`);
      assert.ok(!cmd.startsWith('cd "../My Project" &&') === false || cmd.includes('cd "'), `tirnaklar dogru olmali: ${cmd}`);
    }
  });
});

// ─────────────────────────────────────────────────────
// DOSYA ISLEMCI TESTLERI
// ─────────────────────────────────────────────────────

describe('toOutputName', () => {
  it('.skeleton uzantisini kaldirir', () => {
    assert.strictEqual(toOutputName('task-hunter.skeleton.md'), 'task-hunter.md');
    assert.strictEqual(toOutputName('code-review-check.skeleton.js'), 'code-review-check.js');
    assert.strictEqual(toOutputName('settings.skeleton.json'), 'settings.json');
  });

  it('skeleton olmayan dosya adini degistirmez', () => {
    assert.strictEqual(toOutputName('normal-file.md'), 'normal-file.md');
  });
});

describe('detectFileType', () => {
  it('dosya tiplerini dogru tespit eder', () => {
    assert.strictEqual(detectFileType('test.skeleton.md'), 'md');
    assert.strictEqual(detectFileType('hook.skeleton.js'), 'js');
    assert.strictEqual(detectFileType('settings.skeleton.json'), 'json');
    assert.strictEqual(detectFileType('CLAUDE.md.skeleton'), 'md');
  });
});

// ─────────────────────────────────────────────────────
// BASIT GENERATOR TESTLERI
// ─────────────────────────────────────────────────────

describe('SIMPLE_GENERATORS', () => {
  it('COMMIT_CONVENTION markdown tablosu uretir', () => {
    const result = SIMPLE_GENERATORS.COMMIT_CONVENTION(testManifest, 'md');
    assert.ok(result.includes('## Commit Konvansiyonu'));
    assert.ok(result.includes('`feat:`'));
    assert.ok(result.includes('`fix:`'));
    assert.ok(result.includes('conventional'));
  });

  it('VERIFICATION_COMMANDS subproject tablosu uretir', () => {
    const result = SIMPLE_GENERATORS.VERIFICATION_COMMANDS(testManifest, 'md');
    assert.ok(result.includes('api'));
    assert.ok(result.includes('web'));
    assert.ok(result.includes('npm test'));
  });

  it('VERIFICATION_COMMANDS bosluk iceren path leri tirnaklar', () => {
    const spaceManifest = {
      project: {
        subprojects: [
          { name: 'api', path: '../My Project/apps/api', test_command: 'npm test' },
        ],
      },
    };
    const result = SIMPLE_GENERATORS.VERIFICATION_COMMANDS(spaceManifest, 'md');
    assert.ok(result.includes('cd "../My Project/apps/api"'), 'path tirnakli olmali');
  });

  it('MIGRATION_COMMANDS prisma komutlarini uretir', () => {
    const result = SIMPLE_GENERATORS.MIGRATION_COMMANDS(testManifest, 'md');
    assert.ok(result.includes('prisma migrate'));
    assert.ok(result.includes('prisma generate'));
    assert.ok(result.includes('UYARI'));
  });

  it('FILE_EXTENSIONS JS formatinda dogru uretir', () => {
    const result = SIMPLE_GENERATORS.FILE_EXTENSIONS(testManifest, 'js');
    assert.ok(result.includes("'.ts'"));
    assert.ok(result.includes("'.tsx'"));
  });

  it('FILE_EXTENSIONS MD formatinda dogru uretir', () => {
    const result = SIMPLE_GENERATORS.FILE_EXTENSIONS(testManifest, 'md');
    assert.ok(result.includes('`.ts`'));
  });

  it('SECURITY_PATTERNS Node.js + Prisma + React pattern\'leri uretir', () => {
    const result = SIMPLE_GENERATORS.SECURITY_PATTERNS(testManifest, 'js');
    assert.ok(result.includes('eval'));
    assert.ok(result.includes('queryRaw'));
    assert.ok(result.includes('dangerouslySetInnerHTML'));
  });

  it('PRISMA_PATH dogru yollari uretir', () => {
    const result = SIMPLE_GENERATORS.PRISMA_PATH(testManifest, 'md');
    assert.ok(result.includes('../Codebase/api/prisma/schema.prisma'));
  });

  it('STACK_SPECIFIC_IGNORES Node.js pattern\'lerini uretir', () => {
    const result = SIMPLE_GENERATORS.STACK_SPECIFIC_IGNORES(testManifest, 'md');
    assert.ok(result.includes('node_modules/'));
    assert.ok(result.includes('dist/'));
  });

  it('LAYER_TESTS subproject entry\'leri uretir', () => {
    const result = SIMPLE_GENERATORS.LAYER_TESTS(testManifest, 'js');
    assert.ok(result.includes("layer: 'api'"));
    assert.ok(result.includes("layer: 'web'"));
  });

  it('HEALTH_CHECK_URL health_check alani varsa oldugu gibi kullanir', () => {
    const result = SIMPLE_GENERATORS.HEALTH_CHECK_URL(testManifest, 'md');
    assert.ok(result.includes('`https://api.example.com`'));
    assert.ok(!result.includes('/health'), 'health_check alani varsa /health eklenmemeli');
  });

  it('HEALTH_CHECK_URL health_check yoksa url + /health kullanir', () => {
    const noHealthCheck = {
      environments: [{ name: 'production', url: 'https://api.example.com' }],
    };
    const result = SIMPLE_GENERATORS.HEALTH_CHECK_URL(noHealthCheck, 'md');
    assert.ok(result.includes('`https://api.example.com/health`'));
  });

  it('SMOKE_TEST_ENDPOINTS production endpoint\'lerini uretir', () => {
    const result = SIMPLE_GENERATORS.SMOKE_TEST_ENDPOINTS(testManifest, 'md');
    assert.ok(result.includes('https://api.example.com'));
    assert.ok(result.includes('/health'));
  });
});

// ─────────────────────────────────────────────────────
// ENTEGRASYON TESTI
// ─────────────────────────────────────────────────────

describe('Entegrasyon: Gercek skeleton benzeri icerik', () => {
  it('karma MD icerigini dogru isler', () => {
    const content = `# Task Hunter

<!-- GENERATE: CODEBASE_CONTEXT
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.description, stack.primary
-->

---

## Dogrulama

<!-- GENERATE: VERIFICATION_COMMANDS
Aciklama: Test komutlari
-->

---

## Commit

<!-- GENERATE: COMMIT_CONVENTION
Aciklama: Commit kurallari
-->`;

    const result = fillBlocks(content, 'md', testManifest);
    // CODEBASE_CONTEXT → CLAUDE_FILL
    assert.ok(result.content.includes('CLAUDE_FILL: CODEBASE_CONTEXT'));
    // VERIFICATION_COMMANDS → deterministik
    assert.ok(result.content.includes('## Dogrulama Komutlari'));
    assert.ok(result.content.includes('api'));
    // COMMIT_CONVENTION → deterministik
    assert.ok(result.content.includes('## Commit Konvansiyonu'));
    assert.ok(result.content.includes('`feat:`'));

    assert.strictEqual(result.filled.length, 2);
    assert.strictEqual(result.marked.length, 1);
  });

  it('karma JS icerigini dogru isler', () => {
    const content = `#!/usr/bin/env node
const SECURITY_PATTERNS = [
  { pattern: /hardcoded/, severity: 'HIGH', message: 'test' },
  /* GENERATE: SECURITY_PATTERNS
   * Stack-specific patterns
   */
  /* END GENERATE */
];

const FILE_EXTENSIONS = [
  /* GENERATE: FILE_EXTENSIONS
   * Dosya uzantilari
   */
  /* END GENERATE */
];`;

    const result = fillBlocks(content, 'js', testManifest);
    // Core pattern korunmali
    assert.ok(result.content.includes('hardcoded'));
    // SECURITY_PATTERNS doldurulmali
    assert.ok(result.content.includes('eval'));
    // FILE_EXTENSIONS doldurulmali
    assert.ok(result.content.includes("'.ts'"));
    assert.strictEqual(result.filled.length, 2);
  });
});

// ─────────────────────────────────────────────────────
// scanSkeletonFiles — BACKEND LEAF VARYANT TESTLERI
// ─────────────────────────────────────────────────────

describe('scanSkeletonFiles — backend leaf varyant secimi', () => {
  it('3-seviyeli modul yolunu (nodejs/express) dogru secer', () => {
    const manifest = { modules: { active: { backend: ['nodejs/express'] } } };
    const files = scanSkeletonFiles(manifest);
    const relFiles = files.map(f => path.relative(TEMPLATES_DIR, f));

    // Express skeleton dosyalari dahil olmali
    assert.ok(
      relFiles.some(f => f.includes('nodejs/express') || f.includes('nodejs\\express')),
      'express skeleton dosyalari dahil olmali'
    );
    // Fastify dosyalari dahil OLMAMALI
    assert.ok(
      !relFiles.some(f => f.includes('nodejs/fastify') || f.includes('nodejs\\fastify')),
      'fastify dosyalari dahil olmamali'
    );
    // Django dosyalari dahil OLMAMALI
    assert.ok(
      !relFiles.some(f => f.includes('python/django') || f.includes('python\\django')),
      'django dosyalari dahil olmamali'
    );
  });

  it('aile (family) skeleton dosyalarini da dahil eder', () => {
    const manifest = { modules: { active: { backend: ['nodejs/express'] } } };
    const files = scanSkeletonFiles(manifest);
    const relFiles = files.map(f => path.relative(TEMPLATES_DIR, f));

    // nodejs family skeleton dahil olmali (nodejs kuralları express icin de gecerli)
    assert.ok(
      relFiles.some(f =>
        (f.includes('backend/nodejs/rules') || f.includes('backend\\nodejs\\rules')) &&
        !f.includes('express') && !f.includes('fastify') && !f.includes('nestjs')
      ),
      'nodejs family skeleton dosyalari dahil olmali'
    );
  });

  it('2-seviyeli moduller (deploy/vercel) hala calisiyor', () => {
    const manifest = { modules: { active: { deploy: ['vercel'] } } };
    const files = scanSkeletonFiles(manifest);
    const relFiles = files.map(f => path.relative(TEMPLATES_DIR, f));

    assert.ok(
      relFiles.some(f => f.includes('deploy/vercel') || f.includes('deploy\\vercel')),
      'vercel dosyalari dahil olmali'
    );
    assert.ok(
      !relFiles.some(f => f.includes('deploy/docker') || f.includes('deploy\\docker')),
      'docker dosyalari dahil olmamali'
    );
  });

  it('tum backend varyantlarini dogru secer', () => {
    const variants = [
      'nodejs/express', 'nodejs/fastify', 'nodejs/nestjs',
      'php/laravel', 'php/codeigniter4',
      'python/django', 'python/fastapi',
    ];
    for (const variant of variants) {
      const manifest = { modules: { active: { backend: [variant] } } };
      const files = scanSkeletonFiles(manifest);
      const relFiles = files.map(f => path.relative(TEMPLATES_DIR, f));
      const normalizedVariant = variant.replace('/', path.sep);
      assert.ok(
        relFiles.some(f => f.includes(normalizedVariant)),
        `${variant} skeleton dosyalari dahil olmali`
      );
    }
  });

  it('sadece prisma aktifken security ve monorepo secilMIYOR', () => {
    const manifest = { modules: { active: { orm: ['prisma'] } } };
    const files = scanSkeletonFiles(manifest);
    const relFiles = files.map(f => path.relative(TEMPLATES_DIR, f));

    assert.ok(
      !relFiles.some(f => f.includes('security')),
      'security dosyalari dahil olmamali'
    );
    assert.ok(
      !relFiles.some(f => f.includes('monorepo')),
      'monorepo dosyalari dahil olmamali'
    );
  });

  it('security: true ile sadece security dosyalari seciliyor', () => {
    const manifest = { modules: { active: { security: true } } };
    const files = scanSkeletonFiles(manifest);
    const relFiles = files.map(f => path.relative(TEMPLATES_DIR, f));

    assert.ok(
      relFiles.some(f => f.includes('security')),
      'security skeleton dosyalari dahil olmali'
    );
    assert.ok(
      !relFiles.some(f => f.includes('monorepo')),
      'monorepo dosyalari dahil olmamali'
    );
    assert.ok(
      !relFiles.some(f => f.includes('deploy')),
      'deploy dosyalari dahil olmamali'
    );
  });

  it('monorepo: true ile sadece monorepo dosyalari seciliyor', () => {
    const manifest = { modules: { active: { monorepo: true } } };
    const files = scanSkeletonFiles(manifest);
    const relFiles = files.map(f => path.relative(TEMPLATES_DIR, f));

    assert.ok(
      relFiles.some(f => f.includes('monorepo')),
      'monorepo skeleton dosyalari dahil olmali'
    );
    assert.ok(
      !relFiles.some(f => f.includes('security')),
      'security dosyalari dahil olmamali'
    );
  });
});

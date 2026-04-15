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
  escapeForShell,
  escapeForJqShell,
  isJqRegexSafe,
  sanitizeShellCommand,
  extractBlockNames,
  fillBlocks,
  findManifestArg,
  hasTypeScript,
  processJsonGenerateKeys,
  resolveOutputPath,
  scanSkeletonFiles,
  filterByModules,
  toOutputName,
  detectFileType,
  getActiveModules,
  getCodebasePath,
  getForbiddenRules,
  getFileExtensions,
  getCodeExtensions,
  getSubprojectPath,
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
      { hook_type: 'block', command: 'git push --force', reason: 'Force push yasak' },
    ],
  },
  environments: [
    { name: 'production', url: 'https://api.example.com', health_check: 'https://api.example.com/readyz' },
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
    // forbidden rules'dan hook uretilmeli (sadece type/hook_type: "block" olanlar)
    assert.strictEqual(result.obj.hooks.length, 2, 'iki block kuraldan iki hook uretilmeli');
    assert.ok(result.obj.hooks[0].command.includes('rm -rf /'));
    assert.ok(result.obj.hooks[1].command.includes('git push --force'), 'hook_type/command formati da desteklenmeli');
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

  it('tire iceren modul adi (django-orm_active) dogru eslesir', () => {
    const djangoManifest = { modules: { active: { orm: ['django-orm'] } } };
    const obj = {
      hooks: {
        PreToolUse: [
          {
            __GENERATE__BASH_HOOKS__: {
              matcher: 'Bash',
              'django-orm_active': { type: 'command', command: 'node manage-py-guard.js', timeout: 10 },
            },
          },
        ],
      },
    };
    const result = processJsonGenerateKeys(obj, djangoManifest);
    const bashGroup = result.obj.hooks.PreToolUse.find(g => g.matcher === 'Bash');
    assert.ok(bashGroup, 'Bash matcher li hook group olmali');
    assert.ok(bashGroup.hooks.some(h => h.command === 'node manage-py-guard.js'), 'django-orm hook eklenmeli');
  });

  it('eloquent aktifken artisan-migrate-guard ve eloquent-migration-check ekleniyor', () => {
    const eloquentManifest = { modules: { active: { orm: ['eloquent'] } } };
    const obj = {
      hooks: {
        PreToolUse: [
          {
            __GENERATE__PRE_BASH__: {
              matcher: 'Bash',
              eloquent_active: { type: 'command', command: 'node artisan-migrate-guard.js', timeout: 10 },
            },
          },
        ],
        PostToolUse: [
          {
            matcher: 'Edit|Write',
            hooks: [],
            __GENERATE__POST_EDIT__: {
              eloquent_active: { type: 'command', command: 'node eloquent-migration-check.js' },
            },
          },
        ],
      },
    };
    const result = processJsonGenerateKeys(obj, eloquentManifest);
    const bashGroup = result.obj.hooks.PreToolUse.find(g => g.matcher === 'Bash');
    assert.ok(bashGroup.hooks.some(h => h.command === 'node artisan-migrate-guard.js'), 'artisan-migrate-guard eklenmeli');
    const editGroup = result.obj.hooks.PostToolUse.find(g => g.matcher === 'Edit|Write');
    assert.ok(editGroup.hooks.some(h => h.command === 'node eloquent-migration-check.js'), 'eloquent-migration-check eklenmeli');
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

  it('monorepo aktif degilken auto-format hook ciktiya eklenmiyor', () => {
    const noMonorepoManifest = { modules: { active: { orm: ['prisma'] } } };
    const obj = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Edit|Write',
            hooks: [
              { type: 'command', command: 'node .claude/hooks/code-review-check.js' },
            ],
            __GENERATE__POSTTOOLUSE_EDITWRITE_HOOKS__: {
              monorepo_active: {
                __doc__: 'Monorepo auto-format',
                type: 'command',
                command: 'node .claude/hooks/auto-format.js',
              },
              prisma_active: {
                __doc__: 'Prisma migration check',
                type: 'command',
                command: 'node .claude/hooks/prisma-migration-check.js',
              },
            },
          },
        ],
      },
    };

    const result = processJsonGenerateKeys(obj, noMonorepoManifest);
    const editGroup = result.obj.hooks.PostToolUse.find(g => g.matcher === 'Edit|Write');
    assert.ok(editGroup, 'Edit|Write matcher grubu olmali');
    const commands = editGroup.hooks.map(h => h.command);
    assert.ok(commands.includes('node .claude/hooks/prisma-migration-check.js'), 'prisma hook dahil olmali');
    assert.ok(!commands.includes('node .claude/hooks/auto-format.js'), 'monorepo auto-format dahil olmamali');
    assert.ok(commands.includes('node .claude/hooks/code-review-check.js'), 'sabit hook korunmali');
  });

  it('hooks dizisi yokken _pendingHooks otomatik olusturuyor', () => {
    const manifest = { modules: { active: { orm: ['prisma'] } } };
    const obj = {
      __GENERATE__TEST__: {
        prisma_active: {
          type: 'command',
          command: 'node guard.js',
          timeout: 5,
        },
      },
    };

    const result = processJsonGenerateKeys(obj, manifest);
    // hooks dizisi yoktu ama _pendingHooks olusturuldugunda otomatik yaratilmali
    assert.ok(Array.isArray(result.obj.hooks), 'hooks dizisi otomatik olusturulmali');
    assert.ok(result.obj.hooks.some(h => h.command === 'node guard.js'), 'hook entry eklenmeli');
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

  it('standalone dizisindeki modulleri parse eder', () => {
    const manifest = {
      modules: {
        active: { orm: 'prisma', deploy: 'coolify' },
        standalone: ['security', 'monorepo'],
      },
    };
    const modules = getActiveModules(manifest);
    assert.ok(modules.has('security'), 'standalone security dahil olmali');
    assert.ok(modules.has('monorepo'), 'standalone monorepo dahil olmali');
    assert.ok(modules.has('prisma'), 'active prisma hala dahil olmali');
    assert.ok(modules.has('coolify'), 'active coolify hala dahil olmali');
  });

  it('standalone dizisi olmadan active hala calisiyor (regresyon)', () => {
    const manifest = { modules: { active: { orm: ['prisma'] } } };
    const modules = getActiveModules(manifest);
    assert.ok(modules.has('prisma'));
    assert.strictEqual(modules.size, 1);
  });

  it('active olmadan sadece standalone calisiyor', () => {
    const manifest = { modules: { standalone: ['security'] } };
    const modules = getActiveModules(manifest);
    assert.ok(modules.has('security'));
    assert.strictEqual(modules.size, 1);
  });
});

describe('getSubprojectPath', () => {
  it('sp.path ../ile basliyorsa oldugu gibi kullanir', () => {
    const sp = { name: 'api', path: '../Codebase/api' };
    assert.strictEqual(getSubprojectPath(testManifest, sp), '../Codebase/api');
  });

  it('sp.path relative ise codebasePath ile birlestirir', () => {
    const sp = { name: 'api', path: 'apps/api' };
    assert.strictEqual(getSubprojectPath(testManifest, sp), '../Codebase/apps/api');
  });

  it('sp.path yoksa codebasePath/sp.name dondurur', () => {
    const sp = { name: 'api' };
    assert.strictEqual(getSubprojectPath(testManifest, sp), '../Codebase/api');
  });

  it('manifest.project.structure varsa onu kullanir', () => {
    const manifest = { project: { structure: '../MyProject' } };
    const sp = { name: 'api' };
    assert.strictEqual(getSubprojectPath(manifest, sp), '../MyProject/api');
  });

  it('sp.path / ile basliyorsa oldugu gibi kullanir', () => {
    const sp = { name: 'api', path: '/opt/project/api' };
    assert.strictEqual(getSubprojectPath(testManifest, sp), '/opt/project/api');
  });

  it('sp.path ./ ile basliyorsa normalize eder', () => {
    const sp = { name: 'api', path: './apps/api' };
    assert.strictEqual(getSubprojectPath(testManifest, sp), '../Codebase/apps/api');
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

describe('resolveOutputPath', () => {
  const outputDir = '/tmp/test-output';

  it('settings.skeleton.json → .claude/settings.json', () => {
    const skeleton = path.join(TEMPLATES_DIR, 'core', 'settings.skeleton.json');
    const result = resolveOutputPath(skeleton, outputDir);
    assert.strictEqual(result, path.join(outputDir, '.claude', 'settings.json'));
  });

  it('CLAUDE.md.skeleton → .claude/CLAUDE.md', () => {
    const skeleton = path.join(TEMPLATES_DIR, 'core', 'CLAUDE.md.skeleton');
    const result = resolveOutputPath(skeleton, outputDir);
    assert.strictEqual(result, path.join(outputDir, '.claude', 'CLAUDE.md'));
  });

  it('claude-ignore.skeleton → .claude-ignore', () => {
    const skeleton = path.join(TEMPLATES_DIR, 'core', 'claude-ignore.skeleton');
    const result = resolveOutputPath(skeleton, outputDir);
    assert.strictEqual(result, path.join(outputDir, '.claude-ignore'));
  });

  it('core/commands/task-hunter.skeleton.md → .claude/commands/task-hunter.md', () => {
    const skeleton = path.join(TEMPLATES_DIR, 'core', 'commands', 'task-hunter.skeleton.md');
    const result = resolveOutputPath(skeleton, outputDir);
    assert.strictEqual(result, path.join(outputDir, '.claude', 'commands', 'task-hunter.md'));
  });

  it('core/agents/code-review.skeleton.md → .claude/agents/code-review.md', () => {
    const skeleton = path.join(TEMPLATES_DIR, 'core', 'agents', 'code-review.skeleton.md');
    const result = resolveOutputPath(skeleton, outputDir);
    assert.strictEqual(result, path.join(outputDir, '.claude', 'agents', 'code-review.md'));
  });

  it('core/hooks/test-enforcer.skeleton.js → .claude/hooks/test-enforcer.js', () => {
    const skeleton = path.join(TEMPLATES_DIR, 'core', 'hooks', 'test-enforcer.skeleton.js');
    const result = resolveOutputPath(skeleton, outputDir);
    assert.strictEqual(result, path.join(outputDir, '.claude', 'hooks', 'test-enforcer.js'));
  });

  it('core/git-hooks/pre-commit.skeleton → git-hooks/pre-commit', () => {
    const skeleton = path.join(TEMPLATES_DIR, 'core', 'git-hooks', 'pre-commit.skeleton');
    const result = resolveOutputPath(skeleton, outputDir);
    assert.strictEqual(result, path.join(outputDir, 'git-hooks', 'pre-commit'));
  });

  it('modules/orm/prisma/rules/prisma-rules.skeleton.md → .claude/rules/prisma-rules.md', () => {
    const skeleton = path.join(TEMPLATES_DIR, 'modules', 'orm', 'prisma', 'rules', 'prisma-rules.skeleton.md');
    const result = resolveOutputPath(skeleton, outputDir);
    assert.strictEqual(result, path.join(outputDir, '.claude', 'rules', 'prisma-rules.md'));
  });

  it('modules/deploy/docker/commands/pre-deploy.skeleton.md → docker-pre-deploy.md (prefix eklenir)', () => {
    const skeleton = path.join(TEMPLATES_DIR, 'modules', 'deploy', 'docker', 'commands', 'pre-deploy.skeleton.md');
    const result = resolveOutputPath(skeleton, outputDir);
    assert.strictEqual(result, path.join(outputDir, '.claude', 'commands', 'docker-pre-deploy.md'));
  });

  it('modules/backend/nodejs/express/rules/express-rules.skeleton.md → express-rules.md (prefix zaten var)', () => {
    const skeleton = path.join(TEMPLATES_DIR, 'modules', 'backend', 'nodejs', 'express', 'rules', 'express-rules.skeleton.md');
    const result = resolveOutputPath(skeleton, outputDir);
    assert.strictEqual(result, path.join(outputDir, '.claude', 'rules', 'express-rules.md'));
  });

  it('modules/deploy/docker/agents/devops.skeleton.md → docker-devops.md (prefix eklenir)', () => {
    const skeleton = path.join(TEMPLATES_DIR, 'modules', 'deploy', 'docker', 'agents', 'devops.skeleton.md');
    const result = resolveOutputPath(skeleton, outputDir);
    assert.strictEqual(result, path.join(outputDir, '.claude', 'agents', 'docker-devops.md'));
  });

  it('Docker ve Coolify ayni basename ile collision olmaz', () => {
    const dockerSkeleton = path.join(TEMPLATES_DIR, 'modules', 'deploy', 'docker', 'commands', 'pre-deploy.skeleton.md');
    const coolifySkeleton = path.join(TEMPLATES_DIR, 'modules', 'deploy', 'coolify', 'commands', 'pre-deploy.skeleton.md');
    const dockerResult = resolveOutputPath(dockerSkeleton, outputDir);
    const coolifyResult = resolveOutputPath(coolifySkeleton, outputDir);
    assert.notStrictEqual(dockerResult, coolifyResult, 'farkli cikti yollari olmali');
    assert.ok(dockerResult.includes('docker-pre-deploy'), 'docker prefix olmali');
    assert.ok(coolifyResult.includes('coolify-pre-deploy'), 'coolify prefix olmali');
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

  it('VERIFICATION_COMMANDS cd iceren test_command da ek cd eklemez', () => {
    const cdManifest = {
      project: {
        subprojects: [
          { name: 'api', path: '../Codebase/api', test_command: 'cd backend && php spark test' },
          { name: 'web', path: '../Codebase/web', test_command: 'npm test' },
        ],
      },
    };
    const result = SIMPLE_GENERATORS.VERIFICATION_COMMANDS(cdManifest, 'md');
    // cd ile baslayan komut olduğu gibi kullanilmali
    assert.ok(result.includes('cd backend && php spark test'), 'cd li komut dokunulmamali');
    assert.ok(!result.includes('cd "../Codebase/api" && cd backend'), 'cift cd olmamali');
    // Normal komut cd ile sarmalanmali
    assert.ok(result.includes('cd "../Codebase/web" && npm test'), 'normal komut cd ile sarmalanmali');
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

  it('LAYER_TESTS stack-spesifik dizin pattern leri ekler', () => {
    const result = SIMPLE_GENERATORS.LAYER_TESTS(testManifest, 'js');
    // testManifest stack.orm = 'prisma' → prisma/ pattern'i olmali
    assert.ok(result.includes('/prisma\\/'), 'prisma dizin pattern i olmali');
    // testManifest stack.detected = ['React'] → routes/app/pages olmamali
    assert.ok(!result.includes('/routes\\/'), 'express yoksa routes olmamali');
  });

  it('LAYER_TESTS Next.js icin app/ ve pages/ ekler', () => {
    const nextManifest = {
      project: {
        subprojects: [{ name: 'web', path: '../Codebase/web', test_command: 'npm test' }],
      },
      stack: { detected: ['Next.js'] },
    };
    const result = SIMPLE_GENERATORS.LAYER_TESTS(nextManifest, 'js');
    assert.ok(result.includes('/app\\/'), 'Next.js app/ pattern i olmali');
    assert.ok(result.includes('/pages\\/'), 'Next.js pages/ pattern i olmali');
  });

  it('LAYER_TESTS nextjs (noktasiz) varyanti da app/ ve pages/ ekler', () => {
    const manifest = {
      project: {
        subprojects: [{ name: 'web', path: '../Codebase/web', test_command: 'npm test' }],
      },
      stack: { detected: ['nextjs'] },
    };
    const result = SIMPLE_GENERATORS.LAYER_TESTS(manifest, 'js');
    assert.ok(result.includes('/app\\/'), 'nextjs (noktasiz) app/ pattern i olmali');
    assert.ok(result.includes('/pages\\/'), 'nextjs (noktasiz) pages/ pattern i olmali');
  });

  it('LAYER_TESTS Laravel icin app/, routes/, database/ ekler', () => {
    const manifest = {
      project: {
        subprojects: [{ name: 'api', path: '../Codebase/api', test_command: 'php artisan test' }],
      },
      stack: { detected: ['Laravel'], orm: 'eloquent' },
    };
    const result = SIMPLE_GENERATORS.LAYER_TESTS(manifest, 'js');
    assert.ok(result.includes('/app\\/'), 'Laravel app/ pattern i olmali');
    assert.ok(result.includes('/routes\\/'), 'Laravel routes/ pattern i olmali');
    assert.ok(result.includes('/database\\/'), 'Laravel/Eloquent database/ pattern i olmali');
  });

  it('LAYER_TESTS cd iceren test_command da ek cd eklemez', () => {
    const cdManifest = {
      project: {
        subprojects: [
          { name: 'api', path: '../Codebase/api', test_command: 'cd backend && php spark test' },
        ],
      },
      stack: {},
    };
    const result = SIMPLE_GENERATORS.LAYER_TESTS(cdManifest, 'js');
    assert.ok(result.includes('cd backend && php spark test'), 'cd li komut dokunulmamali');
    assert.ok(!result.includes('cd "../Codebase/api" && cd backend'), 'cift cd olmamali');
  });

  it('HEALTH_CHECK_URL health_check alani varsa oldugu gibi kullanir', () => {
    const result = SIMPLE_GENERATORS.HEALTH_CHECK_URL(testManifest, 'md');
    assert.ok(result.includes('`https://api.example.com/readyz`'), 'health_check URL oldugu gibi kullanilmali');
    assert.ok(!result.includes('/readyz/health'), 'health_check alani varsa /health eklenmemeli');
  });

  it('HEALTH_CHECK_URL health_check yoksa url + /health kullanir', () => {
    const noHealthCheck = {
      environments: [{ name: 'production', url: 'https://api.example.com' }],
    };
    const result = SIMPLE_GENERATORS.HEALTH_CHECK_URL(noHealthCheck, 'md');
    assert.ok(result.includes('`https://api.example.com/health`'));
  });

  it('HEALTH_CHECK_URL prod kisaltmasini destekler', () => {
    const prodShort = {
      environments: [{ name: 'prod', url: 'https://api.example.com' }],
    };
    const result = SIMPLE_GENERATORS.HEALTH_CHECK_URL(prodShort, 'md');
    assert.ok(result.includes('`https://api.example.com/health`'));
  });

  it('HEALTH_CHECK_URL environment yoksa placeholder doner', () => {
    const result = SIMPLE_GENERATORS.HEALTH_CHECK_URL({}, 'md');
    assert.ok(result.includes('<PROJE_URL>/health'));
  });

  it('SMOKE_TEST_ENDPOINTS production endpoint\'lerini uretir', () => {
    const result = SIMPLE_GENERATORS.SMOKE_TEST_ENDPOINTS(testManifest, 'md');
    assert.ok(result.includes('https://api.example.com'));
    assert.ok(result.includes('/status'), 'status endpoint olmali');
  });

  it('SMOKE_TEST_ENDPOINTS health_check manifest degerini kullaniyor', () => {
    const manifest = {
      environments: [{ name: 'production', url: 'https://api.example.com', health_check: 'https://api.example.com/readyz' }],
    };
    const result = SIMPLE_GENERATORS.SMOKE_TEST_ENDPOINTS(manifest);
    assert.ok(result.includes('/readyz'), 'health_check alani kullanilmali');
    assert.ok(!result.includes('/health'), 'varsayilan /health olmamali');
  });

  it('SMOKE_TEST_ENDPOINTS api_prefix manifest degerini kullaniyor', () => {
    const manifest = {
      project: { api_prefix: '/v1' },
      environments: [{ name: 'production', url: 'https://api.example.com' }],
    };
    const result = SIMPLE_GENERATORS.SMOKE_TEST_ENDPOINTS(manifest);
    assert.ok(result.includes('/v1/status'), 'api_prefix yansimali');
  });

  it('SMOKE_TEST_ENDPOINTS api_prefix basta slash olmadan da calisiyor', () => {
    const manifest = {
      project: { api_prefix: 'v2' },
      environments: [{ name: 'production', url: 'https://api.example.com' }],
    };
    const result = SIMPLE_GENERATORS.SMOKE_TEST_ENDPOINTS(manifest);
    assert.ok(result.includes('/v2/status'), 'slash olmadan da normalize edilmeli');
    assert.ok(!result.includes('comv2'), 'URL kirilmamali');
  });

  it('SMOKE_TEST_ENDPOINTS dinamik api_endpoints listesi uretiyor', () => {
    const manifest = {
      environments: [{ name: 'production', url: 'https://api.example.com' }],
      api_endpoints: [
        { method: 'GET', path: '/api/v1/users', auth: 'required', response: 200 },
        { method: 'POST', path: '/api/v1/users', auth: 'required', response: 201 },
        { method: 'GET', path: '/api/v1/products', auth: 'none', response: 200 },
      ],
    };
    const result = SIMPLE_GENERATORS.SMOKE_TEST_ENDPOINTS(manifest);
    assert.ok(result.includes('/api/v1/users'), 'users endpoint olmali');
    assert.ok(result.includes('Authorization gerekli'), 'auth notu olmali');
    assert.ok(result.includes('201'), 'POST beklenen status olmali');
    assert.ok(!result.includes('/status'), 'fallback status olmamali');
  });

  it('SMOKE_TEST_ENDPOINTS api_endpoints yoksa fallback calisiyor', () => {
    const manifest = {
      environments: [{ name: 'production', url: 'https://api.example.com' }],
    };
    const result = SIMPLE_GENERATORS.SMOKE_TEST_ENDPOINTS(manifest);
    assert.ok(result.includes('/health'), 'health olmali');
    assert.ok(result.includes('/status'), 'fallback status olmali');
  });

  it('API_SMOKE_SCRIPT curl bazli smoke test script uretiyor', () => {
    const manifest = {
      environments: [{ name: 'production', url: 'https://api.example.com' }],
      api_endpoints: [
        { method: 'GET', path: '/api/v1/users', auth: 'required', response: 200 },
        { method: 'POST', path: '/api/v1/orders', auth: 'required', response: 201 },
      ],
    };
    const result = SIMPLE_GENERATORS.API_SMOKE_SCRIPT(manifest);
    assert.ok(result.includes('#!/bin/bash'), 'shebang olmali');
    assert.ok(result.includes('curl'), 'curl komutu olmali');
    assert.ok(result.includes('/api/v1/users'), 'users endpoint olmali');
    assert.ok(result.includes('/api/v1/orders'), 'orders endpoint olmali');
    assert.ok(result.includes('auth'), 'auth parametresi olmali');
    assert.ok(result.includes('Bearer $TOKEN'), 'TOKEN kullanilmali');
    assert.ok(result.includes('exit 1'), 'basarisizda exit 1 olmali');
  });

  it('API_SMOKE_SCRIPT api_endpoints yoksa fallback calisiyor', () => {
    const manifest = {
      environments: [{ name: 'production', url: 'https://api.example.com' }],
    };
    const result = SIMPLE_GENERATORS.API_SMOKE_SCRIPT(manifest);
    assert.ok(result.includes('/health'), 'health olmali');
    assert.ok(result.includes('/status'), 'fallback status olmali');
  });

  it('API_SMOKE_NODE_TESTS node:test bazli smoke test uretiyor', () => {
    const manifest = {
      environments: [{ name: 'production', url: 'https://api.example.com' }],
      api_endpoints: [
        { method: 'GET', path: '/api/v1/users', auth: 'required', response: 200 },
        { method: 'POST', path: '/api/v1/orders', auth: 'required', response: 201 },
      ],
    };
    const result = SIMPLE_GENERATORS.API_SMOKE_NODE_TESTS(manifest);
    assert.ok(result.includes("require('node:test')"), 'node:test import olmali');
    assert.ok(result.includes("require('node:assert/strict')"), 'assert import olmali');
    assert.ok(result.includes('/api/v1/users'), 'users endpoint olmali');
    assert.ok(result.includes('/api/v1/orders'), 'orders endpoint olmali');
    assert.ok(result.includes('201'), 'POST expected status olmali');
    assert.ok(result.includes('true'), 'auth parametresi olmali');
    assert.ok(result.includes('Bearer'), 'Bearer token olmali');
  });

  it('TEST_FILE_MAPPING Node.js icin kaynak-test eslestirme uretir', () => {
    const result = SIMPLE_GENERATORS.TEST_FILE_MAPPING(testManifest, 'js');
    assert.ok(result.includes('sourcePattern'), 'sourcePattern alani olmali');
    assert.ok(result.includes('testPath'), 'testPath alani olmali');
    assert.ok(result.includes('services'), 'services pattern olmali');
    assert.ok(result.includes('controllers'), 'controllers pattern olmali');
  });

  it('TEST_FILE_MAPPING Python/Django icin pattern uretir', () => {
    const manifest = { stack: { primary: 'Python', detected: ['Django'], test_framework: 'pytest' } };
    const result = SIMPLE_GENERATORS.TEST_FILE_MAPPING(manifest, 'js');
    assert.ok(result.includes('views'), 'views pattern olmali');
    assert.ok(result.includes('test_'), 'test_ prefix olmali');
    assert.ok(result.includes('pytest'), 'framework pytest olmali');
  });

  it('TEST_FILE_TABLE markdown tablosu uretir', () => {
    const result = SIMPLE_GENERATORS.TEST_FILE_TABLE(testManifest);
    assert.ok(result.includes('Kaynak Pattern'), 'tablo baslik olmali');
    assert.ok(result.includes('__tests__'), 'test dizin yolu olmali');
  });

  it('SUBPROJECT_CONFIGS Codebase-relative path uretiyor (../Codebase prefix yok)', () => {
    const result = SIMPLE_GENERATORS.SUBPROJECT_CONFIGS(testManifest, 'js');
    assert.ok(result.includes("path: 'api'"), 'api Codebase-relative olmali');
    assert.ok(result.includes("path: 'web'"), 'web Codebase-relative olmali');
    assert.ok(!result.includes('../Codebase'), '../Codebase prefix olmamali');
  });

  it('SUBPROJECT_CONFIGS sp.path ../Codebase/ ile basliyorsa strip eder', () => {
    const manifest = {
      project: {
        subprojects: [
          { name: 'api', path: '../Codebase/apps/api' },
        ],
      },
    };
    const result = SIMPLE_GENERATORS.SUBPROJECT_CONFIGS(manifest, 'js');
    assert.ok(result.includes("path: 'apps/api'"), '../Codebase/ prefix strip edilmeli');
    assert.ok(!result.includes('../Codebase'), 'prefix kalmamali');
  });

  it('SUBPROJECT_CONFIGS sp.path yoksa sp.name kullanir', () => {
    const manifest = {
      project: {
        subprojects: [
          { name: 'shared' },
        ],
      },
    };
    const result = SIMPLE_GENERATORS.SUBPROJECT_CONFIGS(manifest, 'js');
    assert.ok(result.includes("path: 'shared'"));
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

// ─────────────────────────────────────────────────────
// scanSkeletonFiles — STANDALONE MODUL TESTLERI
// ─────────────────────────────────────────────────────

describe('scanSkeletonFiles — standalone modul destegi', () => {
  it('standalone security modulu idor-scan skeleton seciliyor', () => {
    const manifest = {
      modules: {
        active: { orm: 'prisma' },
        standalone: ['security'],
      },
    };
    const files = scanSkeletonFiles(manifest);
    const relFiles = files.map(f => path.relative(TEMPLATES_DIR, f));

    assert.ok(
      relFiles.some(f => f.includes('security') && f.includes('idor-scan')),
      'standalone security ile idor-scan skeleton dahil olmali'
    );
  });

  it('standalone monorepo modulu review-module ve auto-format skeleton seciliyor', () => {
    const manifest = {
      modules: {
        active: { orm: 'prisma' },
        standalone: ['monorepo'],
      },
    };
    const files = scanSkeletonFiles(manifest);
    const relFiles = files.map(f => path.relative(TEMPLATES_DIR, f));

    assert.ok(
      relFiles.some(f => f.includes('monorepo') && f.includes('review-module')),
      'standalone monorepo ile review-module skeleton dahil olmali'
    );
    assert.ok(
      relFiles.some(f => f.includes('monorepo') && f.includes('auto-format')),
      'standalone monorepo ile auto-format skeleton dahil olmali'
    );
  });

  it('standalone + active birlikte calisiyor', () => {
    const manifest = {
      modules: {
        active: { orm: 'prisma', deploy: 'coolify' },
        standalone: ['security', 'monorepo'],
      },
    };
    const files = scanSkeletonFiles(manifest);
    const relFiles = files.map(f => path.relative(TEMPLATES_DIR, f));

    assert.ok(relFiles.some(f => f.includes('security')), 'security dahil olmali');
    assert.ok(relFiles.some(f => f.includes('monorepo')), 'monorepo dahil olmali');
    assert.ok(relFiles.some(f => f.includes('orm')), 'orm dahil olmali');
    assert.ok(relFiles.some(f => f.includes('deploy')), 'deploy dahil olmali');
  });
});

// ─────────────────────────────────────────────────────
// scanSkeletonFiles — SABIT DOSYA DESTEGI TESTLERI
// ─────────────────────────────────────────────────────

describe('scanSkeletonFiles — sabit dosya destegi', () => {
  it('session-tracker.js (sabit core hook) dahil ediliyor', () => {
    const manifest = { modules: { active: {} } };
    const files = scanSkeletonFiles(manifest);
    const relFiles = files.map(f => path.relative(TEMPLATES_DIR, f));

    assert.ok(
      relFiles.some(f => f.includes('session-tracker.js')),
      'session-tracker.js core hook olarak dahil olmali'
    );
  });

  it('prisma guard hook lari prisma aktifken dahil ediliyor', () => {
    const manifest = { modules: { active: { orm: ['prisma'] } } };
    const files = scanSkeletonFiles(manifest);
    const relFiles = files.map(f => path.relative(TEMPLATES_DIR, f));

    assert.ok(
      relFiles.some(f => f.includes('prisma-db-push-guard.js')),
      'prisma-db-push-guard.js dahil olmali'
    );
    assert.ok(
      relFiles.some(f => f.includes('destructive-migration-check.js')),
      'destructive-migration-check.js dahil olmali'
    );
    assert.ok(
      relFiles.some(f => f.includes('prisma-migration-check.js')),
      'prisma-migration-check.js dahil olmali'
    );
  });

  it('prisma guard hook lari prisma aktif degilken dahil edilMIYOR', () => {
    const manifest = { modules: { active: { deploy: ['vercel'] } } };
    const files = scanSkeletonFiles(manifest);
    const relFiles = files.map(f => path.relative(TEMPLATES_DIR, f));

    assert.ok(
      !relFiles.some(f => f.includes('prisma-db-push-guard.js')),
      'prisma hook lari dahil olmamali'
    );
  });

  it('framework guard hook lari aktif modulle dahil ediliyor', () => {
    const manifest = { modules: { active: { backend: ['php/laravel'] } } };
    const files = scanSkeletonFiles(manifest);
    const relFiles = files.map(f => path.relative(TEMPLATES_DIR, f));

    assert.ok(
      relFiles.some(f => f.includes('artisan-guard.js')),
      'laravel aktifken artisan-guard.js dahil olmali'
    );
  });

  it('interview ve reference dosyalari dahil edilMIYOR', () => {
    const manifest = { modules: { active: {} } };
    const files = scanSkeletonFiles(manifest);
    const relFiles = files.map(f => path.relative(TEMPLATES_DIR, f));

    assert.ok(
      !relFiles.some(f => f.includes('interview/')),
      'interview dosyalari dahil olmamali'
    );
    assert.ok(
      !relFiles.some(f => f.includes('reference/')),
      'reference dosyalari dahil olmamali'
    );
  });
});

// ─────────────────────────────────────────────────────
// processSkeletonFile — CODEBASE_ROOT YOL DESTEGI TESTLERI
// ─────────────────────────────────────────────────────

describe('processSkeletonFile — CODEBASE_ROOT yol destegi', () => {
  it('varsayilan manifest ile ../Codebase yolunu kullaniyor', () => {
    const hookPath = path.join(TEMPLATES_DIR, 'modules', 'orm', 'prisma', 'hooks', 'destructive-migration-check.js');
    const { processSkeletonFile } = require('./generate.js');
    const result = processSkeletonFile(hookPath, { project: {} });

    assert.ok(result.outputContent.includes('../Codebase'), 'varsayilan ../Codebase olmali');
    assert.ok(!result.outputContent.includes("'../../../Codebase'"), 'hardcoded 3-seviye yol olmamali');
  });

  it('ozel project.structure ile dogru yolu kullaniyor', () => {
    const hookPath = path.join(TEMPLATES_DIR, 'modules', 'orm', 'prisma', 'hooks', 'destructive-migration-check.js');
    const { processSkeletonFile } = require('./generate.js');
    const result = processSkeletonFile(hookPath, { project: { structure: '../MyProject' } });

    assert.ok(result.outputContent.includes('../MyProject'), 'ozel structure yansimali');
  });

  it('apostrof iceren path ile syntax error vermiyor', () => {
    const hookPath = path.join(TEMPLATES_DIR, 'modules', 'orm', 'prisma', 'hooks', 'destructive-migration-check.js');
    const { processSkeletonFile } = require('./generate.js');
    const result = processSkeletonFile(hookPath, { project: { structure: "../O'Brien-Project" } });

    // JSON.stringify ile embed edilmeli — tek tirnak icinde apostrof syntax error yapmaz
    assert.ok(result.outputContent.includes("O'Brien"), 'apostrof iceren path korunmali');
    // Uretilen JS gecerli olmali
    assert.doesNotThrow(() => {
      // CODEBASE_ROOT satirini cikar ve eval et
      const match = result.outputContent.match(/const CODEBASE_ROOT = (.+);/);
      if (match) new Function('path', '__dirname', 'fs', `return ${match[1]}`)({ resolve: (...a) => a.join('/') }, '/tmp', { realpathSync: (p) => p });
    }, 'uretilen JS syntax error vermemeli');
  });
});

// ─────────────────────────────────────────────────────
// findManifestArg — CLI ARGUMAN AYRISTIRMA TESTLERI
// ─────────────────────────────────────────────────────

describe('findManifestArg', () => {
  it('--output-dir once, manifest sonra', () => {
    const args = ['--output-dir', '/tmp/out', 'manifest.yaml', '--dry-run'];
    assert.strictEqual(findManifestArg(args), 'manifest.yaml');
  });

  it('manifest once, --output-dir sonra', () => {
    const args = ['manifest.yaml', '--output-dir', '/tmp/out'];
    assert.strictEqual(findManifestArg(args), 'manifest.yaml');
  });

  it('sadece manifest', () => {
    const args = ['manifest.yaml'];
    assert.strictEqual(findManifestArg(args), 'manifest.yaml');
  });

  it('tum flag ler ve manifest', () => {
    const args = ['--dry-run', '--output-dir', '/tmp', 'project.yaml', '--verbose'];
    assert.strictEqual(findManifestArg(args), 'project.yaml');
  });

  it('manifest yoksa null doner', () => {
    const args = ['--dry-run', '--output-dir', '/tmp'];
    assert.strictEqual(findManifestArg(args), null);
  });
});

// ─────────────────────────────────────────────────────
// escapeForJqShell — FORBIDDEN KOMUT ESCAPE TESTLERI
// ─────────────────────────────────────────────────────

describe('escapeForJqShell', () => {
  it('apostrof iceren pattern i escape eder', () => {
    const result = escapeForJqShell("git push 'origin'");
    // Shell single-quote escape: ' → '\'' uygulanmis olmali
    assert.ok(result.includes("'\\''"), 'shell single-quote escape icermeli');
    assert.strictEqual(result, "git push '\\''origin'\\''");
  });

  it('cift tirnak iceren reason i escape eder', () => {
    const result = escapeForJqShell('Don\'t use "eval"');
    assert.ok(result.includes('\\"eval\\"'), 'cift tirnak jq-escaped olmali');
  });

  it('backslash iceren pattern i escape eder', () => {
    const result = escapeForJqShell('path\\to\\file');
    assert.ok(result.includes('\\\\'), 'backslash escaped olmali');
  });

  it('ozel karakter icermeyen string e dokunmaz', () => {
    assert.strictEqual(escapeForJqShell('rm -rf /'), 'rm -rf /');
  });

  it('newline ve tab karakterlerini escape eder', () => {
    const result = escapeForJqShell('line1\nline2\ttab');
    assert.ok(result.includes('\\n'), 'newline escape edilmeli');
    assert.ok(result.includes('\\t'), 'tab escape edilmeli');
    assert.ok(!result.includes('\n'), 'ham newline olmamali');
    assert.ok(!result.includes('\t'), 'ham tab olmamali');
  });

  it('dolar isaretini escape eder', () => {
    const result = escapeForJqShell('echo $HOME');
    assert.ok(result.includes('\\$HOME'), 'dolar isareti escape edilmeli');
  });

  it('forbidden_commands template de escape uygulanir', () => {
    const manifest = {
      modules: { active: {} },
      rules: {
        forbidden: [
          { type: 'block', pattern: "git push 'origin'", reason: "Don't push directly" },
        ],
      },
    };
    const obj = {
      hooks: [],
      __GENERATE__TEST__: {
        forbidden_commands: {
          template: {
            type: 'command',
            command: "jq -r 'if test(\"{{FORBIDDEN_PATTERN}}\") then {\"decision\":\"block\",\"reason\":\"{{FORBIDDEN_REASON}}\"} end'",
            timeout: 5,
          },
        },
      },
    };

    const result = processJsonGenerateKeys(obj, manifest);
    const cmd = result.obj.hooks[0].command;
    // Shell single-quote escape uygulanmis olmali: ' → '\''
    assert.ok(cmd.includes("'\\''"), 'shell single-quote escape icermeli');
    // Reason daki apostrof de escape edilmis olmali
    assert.ok(cmd.includes("Don'\\''t"), 'reason apostrofu escape edilmeli');
  });
});

// ─────────────────────────────────────────────────────
// hasTypeScript — TYPESCRIPT TESPIT TESTLERI
// ─────────────────────────────────────────────────────

describe('hasTypeScript', () => {
  it('stack.typescript: true ile calisiyor', () => {
    assert.ok(hasTypeScript({ stack: { typescript: true } }));
  });

  it('stack.detected icinde TypeScript varsa true', () => {
    assert.ok(hasTypeScript({ stack: { detected: ['TypeScript', 'React'] } }));
  });

  it('stack.detected icinde kucuk harfle typescript varsa true', () => {
    assert.ok(hasTypeScript({ stack: { detected: ['typescript'] } }));
  });

  it('TypeScript yoksa false', () => {
    assert.ok(!hasTypeScript({ stack: { detected: ['React', 'Prisma'] } }));
  });

  it('bos manifest icin false', () => {
    assert.ok(!hasTypeScript({}));
  });

  it('GIT_PRECOMMIT_COMPILE detected TypeScript ile derleme kontrolu uretiyor', () => {
    const manifest = { stack: { detected: ['TypeScript', 'React'] } };
    const result = SIMPLE_GENERATORS.GIT_PRECOMMIT_COMPILE(manifest);
    assert.ok(result.includes('tsc --noEmit'), 'detected TypeScript ile tsc komutu uretilmeli');
  });

  it('GIT_PRECOMMIT_LINT xargs -0 kullaniyor (bosluklu path destegi)', () => {
    const eslintManifest = { stack: { linter: 'eslint' } };
    const result = SIMPLE_GENERATORS.GIT_PRECOMMIT_LINT(eslintManifest);
    assert.ok(result.includes('xargs -0'), 'xargs -0 kullanilmali');
    assert.ok(!result.includes('| xargs npx'), 'duz xargs olmamali');
  });

  it('GIT_PRECOMMIT_FORMAT xargs -0 kullaniyor (bosluklu path destegi)', () => {
    const prettierManifest = { stack: { formatter: 'prettier' } };
    const result = SIMPLE_GENERATORS.GIT_PRECOMMIT_FORMAT(prettierManifest);
    assert.ok(result.includes('xargs -0'), 'xargs -0 kullanilmali');
    assert.ok(!result.includes('| xargs npx'), 'duz xargs olmamali');
  });

  it('GIT_PREPUSH_DESTRUCTIVE xargs -0 kullaniyor (bosluklu path destegi)', () => {
    const manifest = { stack: { orm: 'prisma' } };
    const result = SIMPLE_GENERATORS.GIT_PREPUSH_DESTRUCTIVE(manifest);
    assert.ok(result.includes('xargs -0'), 'xargs -0 kullanilmali');
    assert.ok(!result.includes('| xargs git'), 'duz xargs olmamali');
  });

  it('null manifest icin false (optional chaining)', () => {
    assert.ok(!hasTypeScript(null));
    assert.ok(!hasTypeScript(undefined));
  });

  it('stack.typescript string "true" ile false (strict equality)', () => {
    assert.ok(!hasTypeScript({ stack: { typescript: 'true' } }));
  });

  it('GIT_PREPUSH_ENV detected TypeScript ile process.env taramasi uretiyor', () => {
    const manifest = { stack: { runtime: 'python', detected: ['TypeScript', 'React'] } };
    const result = SIMPLE_GENERATORS.GIT_PREPUSH_ENV(manifest);
    assert.ok(result.includes('process.env'), 'detected TypeScript ile process.env taramasi uretilmeli');
    assert.ok(!result.includes('os.environ'), 'runtime python olsa da TypeScript oncelikli olmali');
  });
});

// ─────────────────────────────────────────────────────
// settings.skeleton.json — KOSUL ADI TESTLERI
// ─────────────────────────────────────────────────────

describe('settings.skeleton.json kosul adlari', () => {
  it('monorepo_active kosul adi _active formatinda', () => {
    const settingsPath = path.join(TEMPLATES_DIR, 'core', 'settings.skeleton.json');
    const content = require(settingsPath);
    const postEditWrite = content.hooks.PostToolUse[1].__GENERATE__POSTTOOLUSE_EDITWRITE_HOOKS__;
    // monorepo_formatter yerine monorepo_active olmali
    assert.ok(!postEditWrite.monorepo_formatter, 'monorepo_formatter olmamali');
    assert.ok(postEditWrite.monorepo_active, 'monorepo_active olmali');
  });

  it('PostToolUse Bash Prisma blogu destructive-migration-check.js cagiriyor', () => {
    const settingsPath = path.join(TEMPLATES_DIR, 'core', 'settings.skeleton.json');
    const content = require(settingsPath);
    const bashBlock = content.hooks.PostToolUse[2].__GENERATE__POSTTOOLUSE_BASH_HOOKS__;
    assert.ok(
      bashBlock.prisma_active.command.includes('destructive-migration-check.js'),
      'Bash Prisma hook destructive-migration-check.js olmali'
    );
    assert.ok(
      !bashBlock.prisma_active.command.includes('prisma-migration-check.js'),
      'prisma-migration-check.js olmamali'
    );
  });
});

// ─────────────────────────────────────────────────────
// BOZUK YAML HATA MESAJI TESTI (ENTEGRASYON)
// ─────────────────────────────────────────────────────

describe('Bozuk YAML hata mesaji', () => {
  const { execFileSync } = require('node:child_process');
  const fs = require('node:fs');
  const os = require('node:os');

  it('bozuk YAML de kullanici dostu hata mesaji veriyor (stack trace yok)', () => {
    const tmpFile = path.join(os.tmpdir(), `broken-manifest-${Date.now()}.yaml`);
    fs.writeFileSync(tmpFile, 'modules:\n  active:\n    orm: prisma\n  invalid\n');

    try {
      let stderr = '';
      try {
        execFileSync(process.execPath, [path.join(__dirname, 'generate.js'), tmpFile], {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (execErr) {
        stderr = execErr.stderr || '';
      }
      assert.ok(stderr.includes('Manifest YAML parse hatasi'), 'kullanici dostu hata mesaji olmali');
      assert.ok(stderr.includes('satir'), 'satir bilgisi olmali');
      assert.ok(stderr.includes('kolon'), 'kolon bilgisi olmali');
      assert.ok(!stderr.includes('at yaml.load'), 'stack trace olmamali');
      assert.ok(!stderr.includes('at Object.'), 'stack trace olmamali');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('gecerli ama bos YAML de anlasilir hata mesaji veriyor', () => {
    const tmpFile = path.join(os.tmpdir(), `empty-manifest-${Date.now()}.yaml`);
    fs.writeFileSync(tmpFile, '');

    try {
      let stderr = '';
      try {
        execFileSync(process.execPath, [path.join(__dirname, 'generate.js'), tmpFile], {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (execErr) {
        stderr = execErr.stderr || '';
      }
      assert.ok(stderr.includes('bos veya gecersiz'), 'bos manifest icin anlasilir hata mesaji olmali');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});

// ─────────────────────────────────────────────────────
// PREFIX TUTARLILIGI TESTLERI
// ─────────────────────────────────────────────────────

describe('Modul komut prefix tutarliligi', () => {
  const { processSkeletonFile } = require('./generate.js');

  it('docker-pre-deploy icerigi /docker-pre-deploy kullaniyor', () => {
    const skeletonPath = path.join(TEMPLATES_DIR, 'modules', 'deploy', 'docker', 'commands', 'pre-deploy.skeleton.md');
    const outputDir = '/tmp/test-output';
    const outputPath = resolveOutputPath(skeletonPath, outputDir);
    const outputFilename = path.basename(outputPath);

    // Dosya adi prefix lenmis olmali
    assert.ok(outputFilename.startsWith('docker-'), `prefix bekleniyor: ${outputFilename}`);

    // Icerik islemesi
    const { outputContent } = processSkeletonFile(skeletonPath, { project: {} });
    const originalCmd = toOutputName(path.basename(skeletonPath)).replace(/\.md$/, '');
    const prefixedCmd = outputFilename.replace(/\.md$/, '');

    // Ana dongudeki ayni replaceAll mantigi
    const finalContent = outputContent.replaceAll(`/${originalCmd}`, `/${prefixedCmd}`);

    assert.ok(finalContent.includes(`/${prefixedCmd}`), `icerik /${prefixedCmd} icermeli`);
    assert.ok(!finalContent.includes(`/${originalCmd}`), `icerik artik /${originalCmd} icermemeli`);
  });

  it('security-idor-scan icerigi /security-idor-scan kullaniyor', () => {
    const skeletonPath = path.join(TEMPLATES_DIR, 'modules', 'security', 'commands', 'idor-scan.skeleton.md');
    const outputDir = '/tmp/test-output';
    const outputPath = resolveOutputPath(skeletonPath, outputDir);
    const outputFilename = path.basename(outputPath);

    assert.ok(outputFilename.startsWith('security-'), `prefix bekleniyor: ${outputFilename}`);

    const { outputContent } = processSkeletonFile(skeletonPath, { project: {} });
    const originalCmd = toOutputName(path.basename(skeletonPath)).replace(/\.md$/, '');
    const prefixedCmd = outputFilename.replace(/\.md$/, '');
    const finalContent = outputContent.replaceAll(`/${originalCmd}`, `/${prefixedCmd}`);

    assert.ok(finalContent.includes(`/${prefixedCmd}`), `icerik /${prefixedCmd} icermeli`);
    assert.ok(!finalContent.includes(`/${originalCmd}`), `icerik artik /${originalCmd} icermemeli`);
  });

  it('monorepo-review-module icerigi /monorepo-review-module kullaniyor', () => {
    const skeletonPath = path.join(TEMPLATES_DIR, 'modules', 'monorepo', 'commands', 'review-module.skeleton.md');
    const outputDir = '/tmp/test-output';
    const outputPath = resolveOutputPath(skeletonPath, outputDir);
    const outputFilename = path.basename(outputPath);

    assert.ok(outputFilename.startsWith('monorepo-'), `prefix bekleniyor: ${outputFilename}`);

    const { outputContent } = processSkeletonFile(skeletonPath, { project: {} });
    const originalCmd = toOutputName(path.basename(skeletonPath)).replace(/\.md$/, '');
    const prefixedCmd = outputFilename.replace(/\.md$/, '');
    const finalContent = outputContent.replaceAll(`/${originalCmd}`, `/${prefixedCmd}`);

    assert.ok(finalContent.includes(`/${prefixedCmd}`), `icerik /${prefixedCmd} icermeli`);
    assert.ok(!finalContent.includes(`/${originalCmd}`), `icerik artik /${originalCmd} icermemeli`);
  });

  it('zaten prefix li dosya adi degismiyor (prisma-rules)', () => {
    const skeletonPath = path.join(TEMPLATES_DIR, 'modules', 'orm', 'prisma', 'rules', 'prisma-rules.skeleton.md');
    const outputDir = '/tmp/test-output';
    const outputPath = resolveOutputPath(skeletonPath, outputDir);
    const originalFilename = toOutputName(path.basename(skeletonPath));
    const outputFilename = path.basename(outputPath);

    assert.strictEqual(originalFilename, outputFilename, 'zaten prefix li dosya yeniden prefix lenmemeli');
  });
});

// ─────────────────────────────────────────────────────
// TASK-173: getCodebasePath + getForbiddenRules TESTLERI
// ─────────────────────────────────────────────────────

describe('getCodebasePath', () => {
  it('manifest.project.structure tanimli ise onu dondurur', () => {
    assert.equal(getCodebasePath({ project: { structure: '../MyProject' } }), '../MyProject');
  });

  it('structure tanimsizsa ../Codebase dondurur', () => {
    assert.equal(getCodebasePath({}), '../Codebase');
    assert.equal(getCodebasePath({ project: {} }), '../Codebase');
  });

  it('null manifest icin ../Codebase dondurur', () => {
    assert.equal(getCodebasePath(null), '../Codebase');
    assert.equal(getCodebasePath(undefined), '../Codebase');
  });
});

describe('getForbiddenRules', () => {
  it('block type kurallarini dondurur', () => {
    const manifest = { rules: { forbidden: [
      { type: 'block', pattern: 'rm -rf /', reason: 'Tehlikeli' },
      { type: 'warn', pattern: 'console.log', reason: 'Debug' },
    ] } };
    const rules = getForbiddenRules(manifest);
    assert.equal(rules.length, 1);
    assert.equal(rules[0].pattern, 'rm -rf /');
  });

  it('bos forbidden dizisi icin bos dizi dondurur', () => {
    assert.deepEqual(getForbiddenRules({ rules: { forbidden: [] } }), []);
  });

  it('null manifest icin bos dizi dondurur', () => {
    assert.deepEqual(getForbiddenRules(null), []);
    assert.deepEqual(getForbiddenRules({}), []);
  });

  it('ReDoS riski tasiyan pattern atlaniyor', () => {
    const manifest = { rules: { forbidden: [
      { type: 'block', pattern: '(a+)+b', reason: 'test' },
      { type: 'block', pattern: 'rm -rf', reason: 'guvenli' },
    ] } };
    const rules = getForbiddenRules(manifest);
    assert.equal(rules.length, 1);
    assert.equal(rules[0].pattern, 'rm -rf');
  });
});

// ─────────────────────────────────────────────────────
// TASK-170: escapeForShell + sanitizeShellCommand TESTLERI
// ─────────────────────────────────────────────────────

describe('escapeForShell', () => {
  it('tek tirnak icine sarar', () => {
    assert.equal(escapeForShell('hello'), "'hello'");
  });

  it('icerideki tek tirnaklari escape eder', () => {
    assert.equal(escapeForShell("it's"), "'it'\\''s'");
  });

  it('bos string icin bos dondurur', () => {
    assert.equal(escapeForShell(''), '');
    assert.equal(escapeForShell(null), '');
  });

  it('$ ve backtick iceren stringi tek tirnak icine alarak guvenli hale getirir', () => {
    const result = escapeForShell('$(rm -rf /)');
    assert.ok(result.startsWith("'"), 'tek tirnak ile baslamali');
    assert.ok(result.endsWith("'"), 'tek tirnak ile bitmeli');
    // Tek tirnak icinde $() shell tarafindan yorumlanmaz
    assert.equal(result, "'$(rm -rf /)'");
  });
});

describe('sanitizeShellCommand', () => {
  it('guvenli komutu degistirmez', () => {
    assert.equal(sanitizeShellCommand('npm test'), 'npm test');
  });

  it('$() iceren komutu reddeder', () => {
    const result = sanitizeShellCommand('npm test && $(rm -rf /)');
    assert.ok(result.includes('UYARI'));
    assert.ok(result.includes('exit 1'));
  });

  it('backtick iceren komutu reddeder', () => {
    const result = sanitizeShellCommand('npm test `id`');
    assert.ok(result.includes('UYARI'));
  });

  it('null/undefined icin bos string dondurur', () => {
    assert.equal(sanitizeShellCommand(null), '');
    assert.equal(sanitizeShellCommand(undefined), '');
  });
});

// ─────────────────────────────────────────────────────
// TASK-171: isJqRegexSafe TESTLERI
// ─────────────────────────────────────────────────────

describe('isJqRegexSafe', () => {
  it('basit pattern guvenli', () => {
    assert.ok(isJqRegexSafe('rm -rf'));
    assert.ok(isJqRegexSafe('prisma db push'));
  });

  it('nested quantifier guvenli degil', () => {
    assert.ok(!isJqRegexSafe('(a+)+b'));
    assert.ok(!isJqRegexSafe('(x*)+'));
    assert.ok(!isJqRegexSafe('(a{2,})+'));
  });

  it('cok uzun pattern guvenli degil', () => {
    assert.ok(!isJqRegexSafe('a'.repeat(1001)));
  });

  it('null/undefined guvenli degil', () => {
    assert.ok(!isJqRegexSafe(null));
    assert.ok(!isJqRegexSafe(undefined));
  });

  it('normal quantifier guvenli', () => {
    assert.ok(isJqRegexSafe('prisma\\s+db\\s+push'));
    assert.ok(isJqRegexSafe('rm -rf /'));
  });
});

// ─────────────────────────────────────────────────────
// TASK-172: 8 GIT HOOK GENERATOR TESTLERI
// ─────────────────────────────────────────────────────

describe('GIT hook generatorlari', () => {
  const nodeManifest = {
    stack: { primary: 'Node.js', typescript: true, test_framework: 'jest', linter: 'eslint', formatter: 'prettier', runtime: 'node', orm: 'prisma' },
    project: { scripts: { test: 'npm test' }, structure: '../Codebase' },
    environments: [{ name: 'production', url: 'https://api.example.com' }],
  };

  it('GIT_PRECOMMIT_COMPILE TypeScript tsc komutu uretiyor', () => {
    const result = SIMPLE_GENERATORS.GIT_PRECOMMIT_COMPILE(nodeManifest);
    assert.ok(result.includes('tsc --noEmit'), 'tsc komutu olmali');
    assert.ok(result.includes('CODEBASE_DIR'), 'CODEBASE_DIR kullanilmali');
  });

  it('GIT_PRECOMMIT_TEST test komutu uretiyor', () => {
    const result = SIMPLE_GENERATORS.GIT_PRECOMMIT_TEST(nodeManifest);
    assert.ok(result.includes('npm test'), 'testCmd olmali');
    assert.ok(result.includes('ERRORS=1'), 'hata sayaci olmali');
  });

  it('GIT_PRECOMMIT_TEST guvenli olmayan testCmd reddediyor', () => {
    const badManifest = { ...nodeManifest, project: { scripts: { test: 'npm test && $(id)' } } };
    const result = SIMPLE_GENERATORS.GIT_PRECOMMIT_TEST(badManifest);
    assert.ok(result.includes('UYARI'), 'UYARI icermeli');
  });

  it('GIT_PRECOMMIT_LINT eslint staged dosya kontrolu', () => {
    const result = SIMPLE_GENERATORS.GIT_PRECOMMIT_LINT(nodeManifest);
    assert.ok(result.includes('eslint'), 'eslint olmali');
    assert.ok(result.includes('STAGED_FILES'), 'staged files kullanilmali');
  });

  it('GIT_PRECOMMIT_FORMAT prettier staged dosya formatlama', () => {
    const result = SIMPLE_GENERATORS.GIT_PRECOMMIT_FORMAT(nodeManifest);
    assert.ok(result.includes('prettier'), 'prettier olmali');
  });

  it('GIT_PREPUSH_LOCALHOST localhost taramasi', () => {
    const result = SIMPLE_GENERATORS.GIT_PREPUSH_LOCALHOST(nodeManifest);
    assert.ok(result.includes('localhost'), 'localhost kontrolu olmali');
    assert.ok(result.includes('127.0.0.1'), '127.0.0.1 kontrolu olmali');
  });

  it('GIT_PREPUSH_MIGRATION prisma migration tutarliligi', () => {
    const result = SIMPLE_GENERATORS.GIT_PREPUSH_MIGRATION(nodeManifest);
    assert.ok(result.includes('schema.prisma'), 'prisma schema kontrolu olmali');
    assert.ok(result.includes('migration'), 'migration kelimesi olmali');
  });

  it('GIT_PREPUSH_ENV env senkronizasyon kontrolu', () => {
    const result = SIMPLE_GENERATORS.GIT_PREPUSH_ENV(nodeManifest);
    assert.ok(result.includes('.env.example'), 'env example kontrolu olmali');
    assert.ok(result.includes('process.env'), 'process.env taramasi olmali');
  });

  it('GIT_PREPUSH_DESTRUCTIVE destructive migration uyarisi', () => {
    const result = SIMPLE_GENERATORS.GIT_PREPUSH_DESTRUCTIVE(nodeManifest);
    assert.ok(result.includes('DROP TABLE') || result.includes('DROP COLUMN'), 'destructive SQL kontrolu olmali');
    assert.ok(result.includes('DESTRUCTIVE'), 'DESTRUCTIVE kelimesi olmali');
  });
});

// ─────────────────────────────────────────────────────
// filterByModules — INCREMENTAL MODUL FILTRESI
// ─────────────────────────────────────────────────────

describe('filterByModules', () => {
  // Gercek skeleton dosyalarini kullanarak test et
  const fullManifest = {
    modules: {
      active: ['orm/prisma', 'deploy/docker', 'backend/nodejs/express', 'security', 'mobile/expo'],
    },
  };

  it('--modules olmadan tum dosyalar dahil (fonksiyon cagrilmaz)', () => {
    const all = scanSkeletonFiles(fullManifest);
    assert.ok(all.length > 0, 'en az bir dosya olmali');
  });

  it('tek modul filtresi sadece o modulu ve core dosyalarini dondurur', () => {
    const all = scanSkeletonFiles(fullManifest);
    const filtered = filterByModules(all, ['orm/prisma']);

    assert.ok(filtered.length > 0, 'en az bir dosya olmali');
    assert.ok(filtered.length < all.length, 'filtrelenmis liste daha kisa olmali');

    for (const f of filtered) {
      const rel = path.relative(TEMPLATES_DIR, f);
      if (rel.startsWith('modules' + path.sep)) {
        assert.ok(
          rel.startsWith('modules' + path.sep + 'orm' + path.sep + 'prisma'),
          `modul dosyasi orm/prisma olmali, ama: ${rel}`
        );
      }
    }
  });

  it('birden fazla modul filtresi dogru calisir', () => {
    const all = scanSkeletonFiles(fullManifest);
    const filtered = filterByModules(all, ['orm/prisma', 'deploy/docker']);

    const moduleFiles = filtered.filter(f => {
      const rel = path.relative(TEMPLATES_DIR, f);
      return rel.startsWith('modules' + path.sep);
    });

    for (const f of moduleFiles) {
      const rel = path.relative(TEMPLATES_DIR, f);
      const isOrmPrisma = rel.startsWith('modules' + path.sep + 'orm' + path.sep + 'prisma');
      const isDeployDocker = rel.startsWith('modules' + path.sep + 'deploy' + path.sep + 'docker');
      assert.ok(isOrmPrisma || isDeployDocker, `beklenmeyen modul: ${rel}`);
    }
  });

  it('core dosyalari her zaman dahil edilir', () => {
    const all = scanSkeletonFiles(fullManifest);
    const filtered = filterByModules(all, ['orm/prisma']);

    const coreFiles = filtered.filter(f => {
      const rel = path.relative(TEMPLATES_DIR, f);
      return rel.startsWith('core' + path.sep);
    });

    const allCoreFiles = all.filter(f => {
      const rel = path.relative(TEMPLATES_DIR, f);
      return rel.startsWith('core' + path.sep);
    });

    assert.equal(coreFiles.length, allCoreFiles.length, 'core dosya sayisi ayni olmali');
  });

  it('olmayan modul filtresi sadece core dondurur', () => {
    const all = scanSkeletonFiles(fullManifest);
    const filtered = filterByModules(all, ['backend/ruby/rails']);

    const moduleFiles = filtered.filter(f => {
      const rel = path.relative(TEMPLATES_DIR, f);
      return rel.startsWith('modules' + path.sep);
    });

    assert.equal(moduleFiles.length, 0, 'olmayan modul icin modul dosyasi olmamali');
    assert.ok(filtered.length > 0, 'core dosyalari hala olmali');
  });
});

// ─────────────────────────────────────────────────────
// SELF_REFRESH BLOK TESTLERI
// ─────────────────────────────────────────────────────

describe('SIMPLE_GENERATORS.SELF_REFRESH', () => {
  it('sabit bir Markdown bolumu doner, manifest bagimsiz', () => {
    const generator = SIMPLE_GENERATORS.SELF_REFRESH;
    assert.equal(typeof generator, 'function');

    const emptyManifest = {};
    const richManifest = { project: { name: 'x' }, paths: { codebase: 'app' } };
    const a = generator(emptyManifest);
    const b = generator(richManifest);

    assert.equal(a, b, 'SELF_REFRESH manifest bagimsiz olmali');
  });

  it('uretilen bolum "Self-Refresh" basligi, karar agaci ve sinirlar icerir', () => {
    const out = SIMPLE_GENERATORS.SELF_REFRESH({});
    assert.match(out, /## Self-Refresh/);
    assert.match(out, /Kucuk/i);
    assert.match(out, /Buyuk/i);
    assert.match(out, /_evolution\.log/);
    assert.match(out, /backlog task create/);
    assert.match(out, /Commit atma/);
    assert.match(out, /git add.+yapma/);
  });

  it('task-plan pilot skeleton SELF_REFRESH marker icerir', () => {
    const fs = require('fs');
    const path = require('path');
    const skeletonPath = path.join(
      TEMPLATES_DIR, 'core', 'commands', 'task-plan.skeleton.md'
    );
    const content = fs.readFileSync(skeletonPath, 'utf8');
    assert.match(
      content,
      /<!-- GENERATE: SELF_REFRESH\n/,
      'task-plan.skeleton.md SELF_REFRESH marker icermeli'
    );
  });

  it('task-plan skeleton generate-den gectikten sonra Self-Refresh bolumune sahip', () => {
    const fs = require('fs');
    const path = require('path');
    const skeletonPath = path.join(
      TEMPLATES_DIR, 'core', 'commands', 'task-plan.skeleton.md'
    );
    const raw = fs.readFileSync(skeletonPath, 'utf8');

    const { content, filled } = fillBlocks(raw, 'md', {});
    assert.ok(filled.includes('SELF_REFRESH'));
    assert.match(content, /## Self-Refresh/);
    assert.doesNotMatch(content, /<!-- GENERATE: SELF_REFRESH/);
  });

  it('tum core/commands skeleton-lari SELF_REFRESH marker icerir', () => {
    const fs = require('fs');
    const path = require('path');
    const dir = path.join(TEMPLATES_DIR, 'core', 'commands');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.skeleton.md'));
    assert.ok(files.length >= 14, `14 core command bekleniyor, ${files.length} bulundu`);

    const missing = [];
    for (const f of files) {
      const content = fs.readFileSync(path.join(dir, f), 'utf8');
      if (!/<!-- GENERATE: SELF_REFRESH\n/.test(content)) missing.push(f);
    }
    assert.deepEqual(missing, [], `SELF_REFRESH marker eksik: ${missing.join(', ')}`);
  });

  it('tum module/commands skeleton-lari SELF_REFRESH marker icerir', () => {
    const fs = require('fs');
    const path = require('path');
    const moduleCommandPaths = [
      ['deploy', 'coolify', 'commands', 'post-deploy.skeleton.md'],
      ['deploy', 'coolify', 'commands', 'pre-deploy.skeleton.md'],
      ['deploy', 'docker', 'commands', 'post-deploy.skeleton.md'],
      ['deploy', 'docker', 'commands', 'pre-deploy.skeleton.md'],
      ['deploy', 'vercel', 'commands', 'pre-deploy.skeleton.md'],
      ['monorepo', 'commands', 'review-module.skeleton.md'],
      ['security', 'commands', 'idor-scan.skeleton.md'],
    ];

    const missing = [];
    for (const parts of moduleCommandPaths) {
      const full = path.join(TEMPLATES_DIR, 'modules', ...parts);
      const content = fs.readFileSync(full, 'utf8');
      if (!/<!-- GENERATE: SELF_REFRESH\n/.test(content)) {
        missing.push(parts.join('/'));
      }
    }
    assert.deepEqual(missing, [], `module/commands marker eksik: ${missing.join(', ')}`);
  });

  it('fillBlocks SELF_REFRESH marker-ini degistirir, filled listesine ekler', () => {
    const input = [
      '# Komut',
      '',
      'Icerik.',
      '',
      '<!-- GENERATE: SELF_REFRESH',
      'Aciklama: Komut son adim - self-refresh check',
      '-->',
      '',
    ].join('\n');

    const { content, filled, marked } = fillBlocks(input, 'md', {});
    assert.ok(filled.includes('SELF_REFRESH'));
    assert.deepEqual(marked, []);
    assert.doesNotMatch(content, /<!-- GENERATE: SELF_REFRESH/);
    assert.match(content, /## Self-Refresh/);
  });
});

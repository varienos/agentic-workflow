'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  createTempProject,
  makeHookInput,
  materializeHook,
  runHook,
  writeCodebaseFile,
} = require('./helpers/hook-runner.js');
const { loadModuleExports } = require('./helpers/module-loader.js');

// shared-hook-utils.js core/hooks'ta yaşıyor; module testleri kendi __dirname'ini kullanır.
// VM bağlamında require yolunu doğru dosyaya yönlendirir.
const sharedHookUtilsReplacement = {
  find: /require\(require\('path'\)\.join\(__dirname,\s*'shared-hook-utils\.js'\)\)/g,
  replace: `require(${JSON.stringify(
    path.join(__dirname, '..', 'templates', 'core', 'hooks', 'shared-hook-utils.js')
  )})`,
};

describe('code-review-check hook', () => {
  it('reports critical findings and preserves the original payload on stdout', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/code-review-check.skeleton.js');
    const filePath = writeCodebaseFile(
      projectRoot,
      'apps/api/src/leak.js',
      'const apiKey = "sk-secretvalue";\n'
    );
    const input = makeHookInput(filePath);

    const result = runHook(hookPath, input);

    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), input);
    assert.match(result.stderr, /CRITICAL/);
    assert.match(result.stderr, /Hardcoded API key/);
    assert.match(result.stderr, /\[REDACTED\]/, 'secret degeri loglanmamali, [REDACTED] olmali');
    assert.ok(!result.stderr.includes('sk-secretvalue'), 'gercek API anahtari stderr\'e yazilmamali');
  });

  it('skips files outside the configured extension list', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/code-review-check.skeleton.js');
    const filePath = writeCodebaseFile(
      projectRoot,
      'apps/api/src/leak.txt',
      'const apiKey = "sk-secretvalue";\n'
    );

    const result = runHook(hookPath, makeHookInput(filePath));

    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
  });

  it('.env dosyalarini secret taramasindan geciriyor', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/code-review-check.skeleton.js');
    const filePath = writeCodebaseFile(
      projectRoot,
      '.env',
      'DATABASE_URL="postgres://user:pass@host/db"\nAPI_KEY="sk-secretvalue"\n'
    );
    const input = makeHookInput(filePath);

    const result = runHook(hookPath, input);

    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), input);
    assert.match(result.stderr, /CRITICAL/);
  });

  it('.env.local dosyalarini da tariyor', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/code-review-check.skeleton.js');
    const filePath = writeCodebaseFile(
      projectRoot,
      '.env.local',
      'SECRET_KEY="sk-anothersecret"\n'
    );

    const result = runHook(hookPath, makeHookInput(filePath));

    assert.equal(result.status, 0);
    assert.match(result.stderr, /CRITICAL/);
  });

  it('handles long suspicious input without regex slowdowns', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/code-review-check.skeleton.js');
    const longLine = `"${'a'.repeat(20000)}"`;
    const filePath = writeCodebaseFile(projectRoot, 'apps/api/src/large.js', `${longLine}\n`);

    const result = runHook(hookPath, makeHookInput(filePath), { timeout: 1000 });

    assert.equal(result.status, 0);
    assert.ok(result.durationMs < 100);
  });
});

describe('test-enforcer hook', () => {
  const enforcerPath = path.join(
    __dirname, '..', 'templates', 'core', 'hooks', 'test-enforcer.skeleton.js'
  );

  function loadEnforcerFunctions(opts = {}) {
    return loadModuleExports(enforcerPath, {
      exports: opts.exports || ['detectLayer', 'isTestFile', 'isCodeFile', 'resolveTestPath'],
      replacements: [
        {
          find: /const LAYER_TESTS = \[[\s\S]*?\];/,
          replace: "const LAYER_TESTS = [{ pattern: /api\\/src\\//, layer: 'API', command: 'npm test', extra: null }];",
        },
        {
          find: /const TEST_FILE_MAPPING = \[[\s\S]*?\];/,
          replace: opts.mappingReplace ||
            "const TEST_FILE_MAPPING = [{ sourcePattern: /(.+)\\/services\\/(.+)\\.(ts|js)$/, testPath: '$1/__tests__/services/$2.test.$3', framework: 'jest' }];",
        },
        {
          find: /const CODE_EXTENSIONS = \[[\s\S]*?\];/,
          replace: "const CODE_EXTENSIONS = ['.ts', '.tsx', '.js'];",
        },
        ...(opts.replacements || []),
      ],
    });
  }

  it('detectLayer katman eslestirmesi calisiyor', () => {
    const { detectLayer } = loadEnforcerFunctions();
    const result = detectLayer('/tmp/Codebase/api/src/user.service.ts');
    assert.equal(result.layer, 'API');
    assert.equal(detectLayer('/tmp/other/readme.md'), null);
  });

  it('isTestFile test dosyalarini dogru tespit ediyor', () => {
    const { isTestFile } = loadEnforcerFunctions();
    assert.ok(isTestFile('src/services/user.test.ts'));
    assert.ok(isTestFile('__tests__/services/user.test.ts'));
    assert.ok(isTestFile('tests/test_user.py'));
    assert.ok(!isTestFile('src/services/user.ts'));
    assert.ok(!isTestFile('src/controllers/auth.js'));
  });

  it('resolveTestPath kaynak → test eslestirmesi calisiyor', () => {
    const { resolveTestPath } = loadEnforcerFunctions();
    const result = resolveTestPath('/tmp/api/services/user.ts');
    assert.ok(result, 'eslestirme bulmali');
    assert.ok(result.testPath.includes('__tests__/services/user.test.ts'));
    assert.equal(result.framework, 'jest');
  });

  it('test dosyasi yoksa EKSIK systemMessage uretir', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/test-enforcer.skeleton.js', {
      arrayReplacements: [
        { name: 'LAYER_TESTS', elements: ["{ pattern: /api\\/src\\//, layer: 'API', command: 'npm test', extra: null }"] },
        { name: 'TEST_FILE_MAPPING', elements: ["{ sourcePattern: /(.+)\\/services\\/(.+)\\.(ts|js)$/, testPath: '$1/__tests__/services/$2.test.$3', framework: 'jest' }"] },
        { name: 'CODE_EXTENSIONS', elements: ["'.ts'", "'.js'"] },
      ],
    });
    const filePath = writeCodebaseFile(projectRoot, 'api/src/services/user.ts', 'export class UserService {}\n');
    const result = runHook(hookPath, makeHookInput(filePath));

    assert.equal(result.status, 0);
    const output = JSON.parse(result.stdout);
    assert.ok(output.systemMessage, 'systemMessage olmali');
    assert.ok(output.systemMessage.includes('TEST EKSIK'), 'EKSIK mesaji olmali');
  });

  it('test dosyasi varsa GUNCELLE systemMessage uretir', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/test-enforcer.skeleton.js', {
      arrayReplacements: [
        { name: 'LAYER_TESTS', elements: ["{ pattern: /api\\/src\\//, layer: 'API', command: 'npm test', extra: null }"] },
        { name: 'TEST_FILE_MAPPING', elements: ["{ sourcePattern: /(.+)\\/services\\/(.+)\\.(ts|js)$/, testPath: '$1/__tests__/services/$2.test.$3', framework: 'jest' }"] },
        { name: 'CODE_EXTENSIONS', elements: ["'.ts'"] },
      ],
    });
    const filePath = writeCodebaseFile(projectRoot, 'api/src/services/user.ts', 'export class UserService {}\n');
    // Test dosyasini da olustur
    writeCodebaseFile(projectRoot, 'api/src/__tests__/services/user.test.ts', 'test("ok", () => {})\n');
    const result = runHook(hookPath, makeHookInput(filePath));

    assert.equal(result.status, 0);
    const output = JSON.parse(result.stdout);
    assert.ok(output.systemMessage, 'systemMessage olmali');
    assert.ok(output.systemMessage.includes('Test guncelle'), 'GUNCELLE mesaji olmali');
  });

  it('test dosyasi icin talimat VERMIYOR', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/test-enforcer.skeleton.js', {
      arrayReplacements: [
        { name: 'LAYER_TESTS', elements: [] },
        { name: 'TEST_FILE_MAPPING', elements: [] },
        { name: 'CODE_EXTENSIONS', elements: ["'.ts'"] },
      ],
    });
    const filePath = writeCodebaseFile(projectRoot, 'api/src/__tests__/user.test.ts', 'test("ok", () => {})\n');
    const input = makeHookInput(filePath);
    const result = runHook(hookPath, input);

    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), input, 'test dosyasi icin pass-through olmali');
  });

  it('debounce icinde tekrar talimat vermiyor', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/test-enforcer.skeleton.js', {
      arrayReplacements: [
        { name: 'LAYER_TESTS', elements: ["{ pattern: /api\\/src\\//, layer: 'API', command: 'npm test', extra: null }"] },
        { name: 'TEST_FILE_MAPPING', elements: ["{ sourcePattern: /(.+)\\/services\\/(.+)\\.(ts|js)$/, testPath: '$1/__tests__/services/$2.test.$3', framework: 'jest' }"] },
        { name: 'CODE_EXTENSIONS', elements: ["'.ts'"] },
      ],
    });
    const filePath = writeCodebaseFile(projectRoot, 'api/src/services/user.ts', 'export class UserService {}\n');
    const input = makeHookInput(filePath);

    // Ilk calistirma — talimat verir
    const first = runHook(hookPath, input);
    assert.ok(JSON.parse(first.stdout).systemMessage, 'ilk calistirma talimat vermeli');

    // Ikinci calistirma — debounce icinde, pass-through
    const second = runHook(hookPath, input);
    assert.equal(second.stdout.trim(), input, 'debounce icinde pass-through olmali');
  });
});

describe('auto-format hook', () => {
  it('fixSmartQuotes normalizes copied punctuation', () => {
    const hookPath = path.join(
      __dirname,
      '..',
      'templates',
      'modules',
      'monorepo',
      'hooks',
      'auto-format.skeleton.js'
    );
    const { fixSmartQuotes } = loadModuleExports(hookPath, {
      exports: ['fixSmartQuotes'],
      replacements: [sharedHookUtilsReplacement],
    });

    const fixed = fixSmartQuotes('“Merhaba” — test…');
    assert.equal(fixed, '"Merhaba" -- test...');
  });

  it('detectSubproject and findFormatterConfig honor subproject-specific configs', t => {
    const projectRoot = createTempProject(t);
    const codebaseRoot = path.join(projectRoot, 'Codebase');
    fs.mkdirSync(path.join(codebaseRoot, 'apps', 'api'), { recursive: true });
    fs.writeFileSync(path.join(codebaseRoot, 'apps', 'api', '.prettierrc'), '{ "semi": false }\n', 'utf8');

    const hookPath = path.join(
      __dirname,
      '..',
      'templates',
      'modules',
      'monorepo',
      'hooks',
      'auto-format.skeleton.js'
    );
    const { detectSubproject, findFormatterConfig } = loadModuleExports(hookPath, {
      exports: ['detectSubproject', 'findFormatterConfig'],
      replacements: [
        sharedHookUtilsReplacement,
        {
          find: /const CODEBASE_ROOT = .*;/,
          replace: `const CODEBASE_ROOT = ${JSON.stringify(codebaseRoot)};`,
        },
        {
          find: /const SUBPROJECT_CONFIGS = \[[\s\S]*?\];/,
          replace:
            "const SUBPROJECT_CONFIGS = [{ name: 'api', path: 'apps/api', configFile: '.prettierrc', formatter: 'prettier' }];",
        },
      ],
    });

    const filePath = path.join(codebaseRoot, 'apps', 'api', 'src', 'screen.ts');
    const subproject = detectSubproject(filePath);

    assert.equal(subproject.name, 'api');
    assert.equal(
      findFormatterConfig(subproject),
      path.join(codebaseRoot, 'apps', 'api', '.prettierrc')
    );
  });

  it('passes formatter config to prettier when a config file exists', t => {
    const projectRoot = createTempProject(t);
    const codebaseRoot = path.join(projectRoot, 'Codebase');
    const codeFile = writeCodebaseFile(projectRoot, 'apps/api/src/view.ts', 'const title = "Merhaba";\n');
    const configPath = writeCodebaseFile(projectRoot, 'apps/api/.prettierrc', '{ "semi": false }\n');
    const capturedExec = [];
    const hookPath = path.join(
      __dirname,
      '..',
      'templates',
      'modules',
      'monorepo',
      'hooks',
      'auto-format.skeleton.js'
    );
    const { runFormatter } = loadModuleExports(hookPath, {
      exports: ['runFormatter'],
      context: {
        __capturedExec: capturedExec,
      },
      replacements: [
        sharedHookUtilsReplacement,
        {
          find: /const CODEBASE_ROOT = .*;/,
          replace: `const CODEBASE_ROOT = ${JSON.stringify(codebaseRoot)};`,
        },
        {
          find: /const \{ execFileSync \} = require\('child_process'\);/,
          replace: 'const execFileSync = (...args) => { globalThis.__capturedExec.push(args); };',
        },
      ],
    });

    runFormatter(codeFile, {
      name: 'api',
      path: 'apps/api',
      configFile: '.prettierrc',
      formatter: 'prettier',
    });

    assert.equal(capturedExec.length, 1);
    const [file, args] = capturedExec[0];
    assert.equal(file, 'npx', 'execFileSync ile calistirilan program npx olmali');
    assert.ok(args.includes('--config'), 'args dizisinde --config olmali');
    assert.ok(args.includes(configPath), 'args dizisinde configPath olmali');
  });

  it('ozel karakter iceren path shell injection olmadan args dizisine gecilir', t => {
    const projectRoot = createTempProject(t);
    const codebaseRoot = path.join(projectRoot, 'Codebase');
    // Boşluk ve özel karakter içeren path
    const specialPath = path.join(codebaseRoot, 'apps', 'api', 'src', 'my file (v2).ts');
    fs.mkdirSync(path.dirname(specialPath), { recursive: true });
    fs.writeFileSync(specialPath, 'const x = 1;\n', 'utf8');
    const capturedExec = [];
    const hookPath = path.join(
      __dirname,
      '..',
      'templates',
      'modules',
      'monorepo',
      'hooks',
      'auto-format.skeleton.js'
    );
    const { runFormatter } = loadModuleExports(hookPath, {
      exports: ['runFormatter'],
      context: {
        __capturedExec: capturedExec,
      },
      replacements: [
        sharedHookUtilsReplacement,
        {
          find: /const CODEBASE_ROOT = .*;/,
          replace: `const CODEBASE_ROOT = ${JSON.stringify(codebaseRoot)};`,
        },
        {
          find: /const \{ execFileSync \} = require\('child_process'\);/,
          replace: 'const execFileSync = (...args) => { globalThis.__capturedExec.push(args); };',
        },
      ],
    });

    runFormatter(specialPath, {
      name: 'api',
      path: 'apps/api',
      configFile: null,
      formatter: 'prettier',
    });

    assert.equal(capturedExec.length, 1);
    const [file, args] = capturedExec[0];
    assert.equal(file, 'npx');
    // Path tüm özel karakterleriyle args dizisinde tek eleman olarak iletilmeli
    assert.ok(args.includes(specialPath), 'ozel karakter iceren path args dizisinde tam olarak olmali');
    // Shell expansion olmamali: tek tek argüman olarak geçmeli, komut stringi olarak değil
    assert.equal(args.filter(a => a === specialPath).length, 1, 'path yalnizca bir kez gecmeli');
  });
});

describe('openapi-sync-check hook', () => {
  it('warns when a route file is newer than the spec', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/api-docs/openapi/hooks/openapi-sync-check.skeleton.js', {
      arrayReplacements: [
        {
          name: 'ROUTE_PATTERNS',
          elements: ['/controllers\\//', '/\\.controller\\.(ts|js)$/'],
        },
        {
          name: 'SPEC_PATHS',
          elements: ["'docs/openapi.yaml'"],
        },
      ],
    });

    const routeFile = writeCodebaseFile(projectRoot, 'apps/api/src/controllers/user.controller.ts', 'export {};\n');
    const specFile = writeCodebaseFile(projectRoot, 'docs/openapi.yaml', 'openapi: 3.0.0\n');
    const olderTime = new Date('2026-03-20T10:00:00Z');
    const newerTime = new Date('2026-03-20T11:00:00Z');
    fs.utimesSync(specFile, olderTime, olderTime);
    fs.utimesSync(routeFile, newerTime, newerTime);

    const input = makeHookInput(routeFile);
    const result = runHook(hookPath, input);

    assert.equal(result.stdout, input);
    assert.match(result.stderr, /OpenAPI Spec Hatirlatmasi/);
    assert.match(result.stderr, /docs\/openapi\.yaml/);
  });

  it('stays silent when the spec is newer than the route file', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/api-docs/openapi/hooks/openapi-sync-check.skeleton.js', {
      arrayReplacements: [
        {
          name: 'ROUTE_PATTERNS',
          elements: ['/controllers\\//'],
        },
        {
          name: 'SPEC_PATHS',
          elements: ["'docs/openapi.yaml'"],
        },
      ],
    });

    const routeFile = writeCodebaseFile(projectRoot, 'apps/api/src/controllers/user.controller.ts', 'export {};\n');
    const specFile = writeCodebaseFile(projectRoot, 'docs/openapi.yaml', 'openapi: 3.0.0\n');
    const olderTime = new Date('2026-03-20T10:00:00Z');
    const newerTime = new Date('2026-03-20T11:00:00Z');
    fs.utimesSync(routeFile, olderTime, olderTime);
    fs.utimesSync(specFile, newerTime, newerTime);

    const result = runHook(hookPath, makeHookInput(routeFile));

    assert.equal(result.stderr, '');
  });
});

// ─────────────────────────────────────────────────────
// TEAM-TRIGGER HOOK TESTLERI
// ─────────────────────────────────────────────────────

describe('team-trigger hook', () => {
  const hookRelPath = 'core/hooks/team-trigger.skeleton.js';
  const teamTriggerPath = path.join(
    __dirname, '..', 'templates', 'core', 'hooks', 'team-trigger.skeleton.js'
  );

  function loadTriggerFunctions(patternElements) {
    return loadModuleExports(teamTriggerPath, {
      exports: ['checkFileCount', 'checkCrossLayer', 'checkLongSession', 'isOnCooldown'],
      replacements: [
        {
          find: /const SUBPROJECT_PATTERNS = \[[\s\S]*?\];/,
          replace: `const SUBPROJECT_PATTERNS = [${patternElements ? patternElements.join(', ') : ''}];`,
        },
      ],
    });
  }

  it('4 dosya → tetiklenmez, 5 dosya → tetiklenir', () => {
    const { checkFileCount } = loadTriggerFunctions();

    const under = checkFileCount({ files: { written: ['a.ts', 'b.ts', 'c.ts', 'd.ts'] } });
    assert.equal(under, null, '4 dosya tetiklememeli');

    const over = checkFileCount({ files: { written: ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'] } });
    assert.ok(over, '5 dosya tetiklemeli');
    assert.equal(over.type, 'file_count');
  });

  it('tek katman → tetiklenmez, iki katman → tetiklenir', () => {
    const patterns = [
      "{ pattern: /api\\/src\\//, layer: 'API' }",
      "{ pattern: /web\\/src\\//, layer: 'Web' }",
    ];
    const { checkCrossLayer } = loadTriggerFunctions(patterns);

    const single = checkCrossLayer({ files: { written: ['api/src/a.ts', 'api/src/b.ts'] } });
    assert.equal(single, null, 'tek katman tetiklememeli');

    const cross = checkCrossLayer({ files: { written: ['api/src/a.ts', 'web/src/b.ts'] } });
    assert.ok(cross, 'iki katman tetiklemeli');
    assert.equal(cross.type, 'cross_layer');
  });

  it('29dk → tetiklenmez, 31dk + 50 tool → tetiklenir', () => {
    const { checkLongSession } = loadTriggerFunctions();

    const short = checkLongSession({
      started_at: new Date(Date.now() - 29 * 60 * 1000).toISOString(),
      tools: { total_calls: 60 },
    });
    assert.equal(short, null, '29dk tetiklememeli');

    const longButFewTools = checkLongSession({
      started_at: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
      tools: { total_calls: 30 },
    });
    assert.equal(longButFewTools, null, '31dk ama 30 tool tetiklememeli');

    const triggered = checkLongSession({
      started_at: new Date(Date.now() - 31 * 60 * 1000).toISOString(),
      tools: { total_calls: 50 },
    });
    assert.ok(triggered, '31dk + 50 tool tetiklemeli');
    assert.equal(triggered.type, 'long_session');
  });

  it('cooldown icinde tekrar tetiklenmez', () => {
    const { isOnCooldown } = loadTriggerFunctions();

    const fresh = isOnCooldown('file_count', { lastNotified: {} });
    assert.equal(fresh, false, 'ilk kez cooldown olmamali');

    const recent = isOnCooldown('file_count', {
      lastNotified: { file_count: Date.now() - 5 * 60 * 1000 },
    });
    assert.equal(recent, true, '5dk once bildirilmis → cooldown');

    const expired = isOnCooldown('file_count', {
      lastNotified: { file_count: Date.now() - 11 * 60 * 1000 },
    });
    assert.equal(expired, false, '11dk once → cooldown bitmis');
  });

  it('session state yoksa sessizce gecir', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, hookRelPath, {
      arrayReplacements: [{ name: 'SUBPROJECT_PATTERNS', elements: [] }],
    });
    const input = makeHookInput('/tmp/test.ts');

    const result = runHook(hookPath, input);

    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), input);
  });

  // --- E2E: gercek stdin JSON + systemMessage ciktisi ---

  it('E2E: 5+ dosya senaryosunda systemMessage ciktisi uretiyor', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, hookRelPath, {
      arrayReplacements: [{ name: 'SUBPROJECT_PATTERNS', elements: [] }],
    });

    // Session state dosyasi olustur — 5 farkli dosya
    const hookDir = path.dirname(hookPath);
    const trackingDir = path.join(hookDir, '..', 'tracking', 'sessions');
    fs.mkdirSync(trackingDir, { recursive: true });

    // Hook icindeki SESSION_ID: ${process.ppid}-${date}
    // spawnSync ile calistiginda ppid = test runner PID
    const today = new Date().toISOString().slice(0, 10);
    const sessionFile = path.join(trackingDir, `session-${process.pid}-${today}.json`);
    fs.writeFileSync(sessionFile, JSON.stringify({
      started_at: new Date().toISOString(),
      files: { written: ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts'] },
      tools: { total_calls: 10 },
    }));

    const input = makeHookInput('/tmp/test.ts');
    const result = runHook(hookPath, input);

    assert.equal(result.status, 0);
    const output = JSON.parse(result.stdout);
    assert.ok(output.systemMessage, 'systemMessage olmali');
    assert.ok(output.systemMessage.includes('5'), '5 dosya sayisi icermeli');
  });

  it('E2E: cooldown state dosyasi yaziliyor ve tekrar tetiklenmiyor', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, hookRelPath, {
      arrayReplacements: [{ name: 'SUBPROJECT_PATTERNS', elements: [] }],
    });

    const hookDir = path.dirname(hookPath);
    const trackingDir = path.join(hookDir, '..', 'tracking', 'sessions');
    fs.mkdirSync(trackingDir, { recursive: true });

    const today = new Date().toISOString().slice(0, 10);
    const sessionFile = path.join(trackingDir, `session-${process.pid}-${today}.json`);
    fs.writeFileSync(sessionFile, JSON.stringify({
      started_at: new Date().toISOString(),
      files: { written: ['a.ts', 'b.ts', 'c.ts', 'd.ts', 'e.ts', 'f.ts'] },
      tools: { total_calls: 10 },
    }));

    const input = makeHookInput('/tmp/test.ts');

    // Ilk calistirma — trigger + state dosyasi yazilir
    const first = runHook(hookPath, input);
    assert.ok(JSON.parse(first.stdout).systemMessage, 'ilk calistirma tetiklemeli');

    // Cooldown state dosyasi yazildi mi?
    const stateFile = path.join(hookDir, '.team-trigger-state.json');
    assert.ok(fs.existsSync(stateFile), 'cooldown state dosyasi yazilmis olmali');

    // Ikinci calistirma — cooldown icinde, pass-through
    const second = runHook(hookPath, input);
    assert.equal(second.stdout.trim(), input, 'cooldown icinde pass-through olmali');
  });
});

// ─────────────────────────────────────────────────────
// AUTO-TEST-RUNNER HOOK TESTLERI
// ─────────────────────────────────────────────────────

describe('auto-test-runner hook', () => {
  const autoTestPath = path.join(
    __dirname, '..', 'templates', 'core', 'hooks', 'auto-test-runner.skeleton.js'
  );

  function loadAutoTestFunctions() {
    return loadModuleExports(autoTestPath, {
      exports: ['loadState', 'isCodeFile', 'detectLayer'],
      replacements: [
        {
          find: /const LAYER_TESTS = \[[\s\S]*?\];/,
          replace: "const LAYER_TESTS = [{ pattern: /api\\/src\\//, layer: 'API', command: 'npm test', extra: null }];",
        },
        {
          find: /const CODE_EXTENSIONS = \[[\s\S]*?\];/,
          replace: "const CODE_EXTENSIONS = ['.ts', '.tsx', '.js'];",
        },
      ],
    });
  }

  it('non-code dosya (md) pass-through — isCodeFile false doner', () => {
    const { isCodeFile } = loadAutoTestFunctions();

    assert.equal(isCodeFile('/tmp/README.md'), false, '.md kod dosyasi degil');
    assert.equal(isCodeFile('/tmp/config.json'), false, '.json kod dosyasi degil');
    assert.equal(isCodeFile('/tmp/service.ts'), true, '.ts kod dosyasi');
    assert.equal(isCodeFile('/tmp/app.js'), true, '.js kod dosyasi');
  });

  it('ilk edit sinyal uretir (debounce fresh)', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/auto-test-runner.skeleton.js', {
      arrayReplacements: [
        { name: 'LAYER_TESTS', elements: ["{ pattern: /api\\/src\\//, layer: 'API', command: 'npm test', extra: null }"] },
        { name: 'CODE_EXTENSIONS', elements: ["'.ts'", "'.js'"] },
      ],
    });
    const filePath = writeCodebaseFile(projectRoot, 'api/src/service.ts', 'export {};\n');

    const result = runHook(hookPath, makeHookInput(filePath));

    assert.equal(result.status, 0);
    const output = JSON.parse(result.stdout);
    assert.ok(output.systemMessage, 'ilk edit sinyal vermeli');
    assert.ok(output.systemMessage.includes('API'), 'katman adi icermeli');
  });

  it('debounce icinde tekrar edit → pass-through', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/auto-test-runner.skeleton.js', {
      arrayReplacements: [
        { name: 'LAYER_TESTS', elements: ["{ pattern: /api\\/src\\//, layer: 'API', command: 'npm test', extra: null }"] },
        { name: 'CODE_EXTENSIONS', elements: ["'.ts'"] },
      ],
    });
    const filePath = writeCodebaseFile(projectRoot, 'api/src/service.ts', 'export {};\n');
    const input = makeHookInput(filePath);

    // Ilk calistirma — sinyal uretir
    runHook(hookPath, input);

    // Ikinci calistirma — debounce icinde, pass-through
    const second = runHook(hookPath, input);
    assert.equal(second.status, 0);
    assert.equal(second.stdout.trim(), input, 'debounce icinde pass-through olmali');
  });

  it('threshold asimi guclendirilmis mesaj (3+ edit)', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/auto-test-runner.skeleton.js', {
      arrayReplacements: [
        { name: 'LAYER_TESTS', elements: ["{ pattern: /api\\/src\\//, layer: 'API', command: 'npm test', extra: null }"] },
        { name: 'CODE_EXTENSIONS', elements: ["'.ts'"] },
      ],
      textReplacements: [
        // Debounce'u 0'a dusur — her calistirmada sinyal uretsin
        { find: /const DEBOUNCE_MS = .*?;/, replace: 'const DEBOUNCE_MS = 0;' },
      ],
    });
    const filePath = writeCodebaseFile(projectRoot, 'api/src/service.ts', 'export {};\n');
    const input = makeHookInput(filePath);

    // 3 kez calistir — son sinyal "3 duzenleme" icermeli
    runHook(hookPath, input);
    runHook(hookPath, input);
    const third = runHook(hookPath, input);

    const output = JSON.parse(third.stdout);
    assert.ok(output.systemMessage, 'ucuncu edit sinyal vermeli');
  });

  it('stale state (1 saat) sifirlanir', () => {
    const { loadState } = loadAutoTestFunctions();

    // Mevcut state dosyasi olmadan cagrilirsa bos state doner
    const state = loadState();
    assert.ok(state.layers, 'layers alani olmali');
    assert.equal(Object.keys(state.layers).length, 0, 'bos layers');
  });

  it('bozuk state dosyasi sessizce gecilir', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/auto-test-runner.skeleton.js', {
      arrayReplacements: [
        { name: 'LAYER_TESTS', elements: ["{ pattern: /api\\/src\\//, layer: 'API', command: 'npm test', extra: null }"] },
        { name: 'CODE_EXTENSIONS', elements: ["'.ts'"] },
      ],
    });

    // Bozuk state dosyasi yaz
    const stateFile = path.join(path.dirname(hookPath), '.auto-test-state.json');
    fs.writeFileSync(stateFile, '{BOZUK JSON!!!', 'utf8');

    const filePath = writeCodebaseFile(projectRoot, 'api/src/service.ts', 'export {};\n');
    const result = runHook(hookPath, makeHookInput(filePath));

    assert.equal(result.status, 0, 'bozuk state ile crash olmamali');
  });
});

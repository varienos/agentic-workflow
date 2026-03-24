'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  createTempProject,
  materializeHook,
  runHook,
} = require('./helpers/hook-runner.js');
const { loadModuleExports } = require('./helpers/module-loader.js');

// Path sabit: session state dosyalarinin projectRoot altindaki alt yolu
const SESSIONS_SUBPATH = path.join('Agentbase', '.claude', 'tracking', 'sessions');

// Dinamik yollar: __dirname = Agentbase/tests
const AGENTBASE_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

function makeToolPayload(toolInput, toolResult) {
  return JSON.stringify({
    tool_input: toolInput,
    ...(toolResult !== undefined ? { tool_result: toolResult } : {}),
  });
}

function readSessionState(projectRoot) {
  const sessionsDir = path.join(projectRoot, SESSIONS_SUBPATH);
  const sessionFiles = fs
    .readdirSync(sessionsDir)
    .filter(file => file.startsWith('session-') && file.endsWith('.json'));

  assert.equal(sessionFiles.length, 1);
  return JSON.parse(fs.readFileSync(path.join(sessionsDir, sessionFiles[0]), 'utf8'));
}

function createTempDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentbase-monitor-'));
  t.after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

function writeBacklogTask(backlogRoot, relativePath, content) {
  const fullPath = path.join(backlogRoot, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  return fullPath;
}

describe('session-tracker observability', () => {
  it('captures current focus and recent events from backlog ownership commands', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/session-tracker.js');

    const result = runHook(
      hookPath,
      makeToolPayload({ command: 'backlog task edit 24 -s "In Progress"' })
    );

    assert.equal(result.status, 0);

    const state = readSessionState(projectRoot);
    assert.equal(state.current_focus.task_id, 'TASK-24');
    assert.equal(state.current_focus.status, 'In Progress');
    assert.equal(state.phase, 'planning');
    assert.equal(state.waiting_on, 'none');
    assert.match(state.last_meaningful_action, /TASK-24/);
    assert.ok(Array.isArray(state.recent_events));
    assert.match(state.recent_events.at(-1).label, /basladi/i);
  });

  it('turns failed test commands into waiting state with a test blocker', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/session-tracker.js');

    runHook(hookPath, makeToolPayload({ command: 'backlog task edit 24 -s "In Progress"' }));
    const result = runHook(
      hookPath,
      makeToolPayload(
        { command: 'npm test' },
        { exit_code: 1, stderr: '1 failing\nExpected status 200' }
      )
    );

    assert.equal(result.status, 0);

    const state = readSessionState(projectRoot);
    assert.equal(state.phase, 'waiting');
    assert.equal(state.waiting_on, 'test');
    assert.equal(state.errors.count, 1);
    assert.match(state.last_meaningful_action, /test/i);
    assert.match(state.recent_events.at(-1).label, /basarisiz/i);
  });

  it('records teammate completion in the event stream', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/session-tracker.js');

    const result = runHook(
      hookPath,
      makeToolPayload(
        {
          prompt: 'Review latest diff',
          description: 'review-agent',
          name: 'review-agent',
        },
        { ok: true }
      )
    );

    assert.equal(result.status, 0);

    const state = readSessionState(projectRoot);
    assert.equal(state.teammates[0].status, 'completed');
    assert.match(state.recent_events.at(-1).label, /review-agent/i);
  });

  it('backlog task done komutu tasks_completed ve phase=done gunceller', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/session-tracker.js');

    // Once task'i baslat
    runHook(hookPath, makeToolPayload({ command: 'backlog task edit 42 -s "In Progress"' }));
    // Sonra tamamla
    runHook(hookPath, makeToolPayload({ command: 'backlog task edit 42 -s "Done"' }));

    const state = readSessionState(projectRoot);
    assert.ok(state.backlog_activity.tasks_completed.includes('TASK-42'));
    assert.equal(state.current_focus.status, 'Done');
    assert.equal(state.phase, 'done');
    assert.match(state.last_meaningful_action, /tamamlandi/i);
  });

  it('backlog task create komutu tasks_created listesini gunceller', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/session-tracker.js');

    runHook(hookPath, makeToolPayload({ command: 'backlog task create "Yeni ozellik ekle"' }));

    const state = readSessionState(projectRoot);
    assert.ok(state.backlog_activity.tasks_created.some(t => t.includes('Yeni ozellik')));
    assert.match(state.last_meaningful_action, /olusturuldu/i);
    assert.equal(state.recent_events.at(-1).kind, 'backlog');
  });

  it('tek tirnakli backlog task create komutu tasks_created listesini gunceller', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/session-tracker.js');

    runHook(hookPath, makeToolPayload({ command: "backlog task create 'Tek tirnakli baslik'" }));

    const state = readSessionState(projectRoot);
    assert.ok(
      state.backlog_activity.tasks_created.some(task => task.includes('Tek tirnakli baslik'))
    );
    assert.match(state.last_meaningful_action, /olusturuldu/i);
    assert.equal(state.recent_events.at(-1).kind, 'backlog');
  });

  it('git commit komutu commits sayacini arttirir', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/session-tracker.js');

    runHook(hookPath, makeToolPayload({ command: 'git commit -m "fix: hata duzeltme"' }));

    const state = readSessionState(projectRoot);
    assert.equal(state.git_activity.commits, 1);
    assert.match(state.last_meaningful_action, /commit/i);
    assert.equal(state.recent_events.at(-1).kind, 'git');
  });

  it('git checkout -b komutu branches_created listesine ekler', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/session-tracker.js');

    runHook(hookPath, makeToolPayload({ command: 'git checkout -b feat/yeni-ozellik' }));

    const state = readSessionState(projectRoot);
    assert.ok(state.git_activity.branches_created.includes('feat/yeni-ozellik'));
    assert.match(state.last_meaningful_action, /feat\/yeni-ozellik/);
    assert.equal(state.recent_events.at(-1).kind, 'git');
  });

  it('basarili test komutu phase=testing ve waiting_on=none set eder', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/session-tracker.js');

    runHook(hookPath, makeToolPayload(
      { command: 'npm test' },
      { exit_code: 0, stdout: '5 passing' }
    ));

    const state = readSessionState(projectRoot);
    assert.equal(state.phase, 'testing');
    assert.equal(state.waiting_on, 'none');
    assert.equal(state.errors.count, 0);
    assert.match(state.recent_events.at(-1).label, /test calisti/i);
  });

  it('Write tool event phase=implementing ve dosya yazildi mesaji uretir', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/session-tracker.js');

    runHook(hookPath, makeToolPayload(
      { content: 'yeni icerik', file_path: '/tmp/proje/src/utils.js' },
      'File written successfully'
    ));

    const state = readSessionState(projectRoot);
    assert.equal(state.phase, 'implementing');
    assert.equal(state.waiting_on, 'none');
    assert.match(state.last_meaningful_action, /yazildi/i);
    assert.equal(state.recent_events.at(-1).kind, 'write');
    assert.ok(state.files.written.some(f => f.includes('utils.js')));
  });

  it('tool_input.path fallback ile Write event dogru kaydediliyor', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/session-tracker.js');

    // file_path yerine path kullanan payload
    runHook(hookPath, makeToolPayload(
      { content: 'icerik', path: '/tmp/proje/src/helper.ts' },
      'File written successfully'
    ));

    const state = readSessionState(projectRoot);
    assert.equal(state.phase, 'implementing');
    assert.ok(state.files.written.some(f => f.includes('helper.ts')), 'path ile gelen dosya written listesinde olmali');
    assert.equal(state.tools.by_type.Write, 1, 'Write olarak siniflandirilmali, Unknown degil');
  });

  it('tool_input.path fallback ile Read event dogru kaydediliyor', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/session-tracker.js');

    // file_path yerine path kullanan Read payload
    runHook(hookPath, makeToolPayload(
      { path: '/tmp/proje/src/config.json' },
      'dosya icerigi...'
    ));

    const state = readSessionState(projectRoot);
    assert.ok(state.files.read.some(f => f.includes('config.json')), 'path ile gelen dosya read listesinde olmali');
    assert.equal(state.tools.by_type.Read, 1, 'Read olarak siniflandirilmali, Unknown degil');
  });

  it('basarili Read cagrisinda error string i yanlis pozitif uretmiyor', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/session-tracker.js');

    // JSON icerigi "error" kelimesi iceren basarili Read
    runHook(hookPath, makeToolPayload(
      { file_path: '/tmp/proje/src/errors.json' },
      '{"error": "not_found", "ENOENT": true, "message": "File EACCES denied"}'
    ));

    const state = readSessionState(projectRoot);
    assert.equal(state.errors.count, 0, 'basarili Read de error count artmamali');
    assert.equal(state.tools.by_type.Read, 1);
  });

  it('Bash exit_code=0 iken stdout da error string i olsa bile hata sayilmiyor', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'core/hooks/session-tracker.js');

    runHook(hookPath, makeToolPayload(
      { command: 'cat error-handler.js' },
      { exit_code: 0, stdout: 'function handleError(err) { if (err.code === "ENOENT") {} }' }
    ));

    const state = readSessionState(projectRoot);
    assert.equal(state.errors.count, 0, 'exit_code=0 iken error count artmamali');
  });
});

describe('session-monitor backlog enrichment', () => {
  it('parses task metadata and acceptance progress from backlog markdown', t => {
    const tmpDir = createTempDir(t);
    const monitorPath = path.join(__dirname, '..', 'bin', 'session-monitor.js');
    const { parseBacklogTaskFile } = loadModuleExports(monitorPath, {
      exports: ['parseBacklogTaskFile'],
    });
    const taskPath = writeBacklogTask(
      tmpDir,
      'tasks/task-24 - Merge-conflict-yonetimi.md',
      `---
id: TASK-24
title: 'Merge conflict yonetimi'
status: In Progress
priority: high
dependencies:
  - TASK-11
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Existing conflict guard preserved
- [ ] #2 Tracker emits event data
<!-- AC:END -->
`
    );

    const task = parseBacklogTaskFile(taskPath);

    assert.equal(task.id, 'TASK-24');
    assert.equal(task.status, 'In Progress');
    assert.equal(task.priority, 'high');
    assert.deepEqual(Array.from(task.dependencies), ['TASK-11']);
    assert.equal(task.acceptance.completed, 1);
    assert.equal(task.acceptance.total, 2);
  });

  it('folded scalar (>-) ile yazilmis title dogru parse ediliyor', t => {
    const tmpDir = createTempDir(t);
    const monitorPath = path.join(__dirname, '..', 'bin', 'session-monitor.js');
    const { parseBacklogTaskFile } = loadModuleExports(monitorPath, {
      exports: ['parseBacklogTaskFile'],
    });
    const taskPath = writeBacklogTask(
      tmpDir,
      'tasks/task-50 - Folded-scalar-test.md',
      `---
id: TASK-50
title: >-
  Bootstrap greenfield modu bos Codebase
  ile sifirdan proje baslatma destegi
status: Done
priority: medium
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Test
<!-- AC:END -->
`
    );

    const task = parseBacklogTaskFile(taskPath);
    assert.equal(task.id, 'TASK-50');
    assert.ok(task.title.includes('Bootstrap greenfield'), 'folded title dogru parse edilmeli');
    assert.ok(task.title.includes('sifirdan proje'), 'tum satirlar birlestirilmeli');
    assert.ok(!task.title.includes('>-'), 'title >- icermemeli');
    assert.equal(task.status, 'Done', 'scalar sonrasi normal key calismali');
  });

  it('literal scalar (|) ile yazilmis deger satir sonlarini koruyor', t => {
    const tmpDir = createTempDir(t);
    const monitorPath = path.join(__dirname, '..', 'bin', 'session-monitor.js');
    const { parseBacklogTaskFile } = loadModuleExports(monitorPath, {
      exports: ['parseBacklogTaskFile'],
    });
    const taskPath = writeBacklogTask(
      tmpDir,
      'tasks/task-51 - Literal-scalar-test.md',
      `---
id: TASK-51
title: |
  Satir bir
  Satir iki
status: In Progress
priority: high
---
`
    );

    const task = parseBacklogTaskFile(taskPath);
    assert.ok(task.title.includes('Satir bir'), 'literal scalar ilk satir');
    assert.ok(task.title.includes('Satir iki'), 'literal scalar ikinci satir');
    assert.equal(task.status, 'In Progress');
  });

  it('CRLF satir sonlariyla yazilmis backlog markdown frontmatter ini parse ediyor', t => {
    const tmpDir = createTempDir(t);
    const monitorPath = path.join(__dirname, '..', 'bin', 'session-monitor.js');
    const { parseBacklogTaskFile } = loadModuleExports(monitorPath, {
      exports: ['parseBacklogTaskFile'],
    });
    const taskPath = writeBacklogTask(
      tmpDir,
      'tasks/task-52 - CrLf-test.md',
      [
        '---',
        'id: TASK-52',
        'title: "CRLF gorevi"',
        'status: In Progress',
        'priority: high',
        'dependencies:',
        '  - TASK-11',
        '---',
        '',
        '## Acceptance Criteria',
        '<!-- AC:BEGIN -->',
        '- [x] #1 Parse frontmatter',
        '- [ ] #2 Keep metadata',
        '<!-- AC:END -->',
        '',
      ].join('\r\n')
    );

    const task = parseBacklogTaskFile(taskPath);
    assert.equal(task.id, 'TASK-52');
    assert.equal(task.title, 'CRLF gorevi');
    assert.equal(task.status, 'In Progress');
    assert.equal(task.priority, 'high');
    assert.deepEqual(Array.from(task.dependencies), ['TASK-11']);
    assert.equal(task.acceptance.completed, 1);
    assert.equal(task.acceptance.total, 2);
  });

  it('enriches older session payloads from backlog files and inferred phase', t => {
    const tmpDir = createTempDir(t);
    const monitorPath = path.join(__dirname, '..', 'bin', 'session-monitor.js');
    const { loadBacklogIndex, enrichSession } = loadModuleExports(monitorPath, {
      exports: ['loadBacklogIndex', 'enrichSession'],
    });

    writeBacklogTask(
      tmpDir,
      'tasks/task-14 - Oturum-izleme.md',
      `---
id: TASK-14
title: 'Oturum izleme sistemi'
status: In Progress
priority: medium
dependencies: []
---

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Session file exists
- [ ] #2 Timeline tab renders
<!-- AC:END -->
`
    );

    const backlogIndex = loadBacklogIndex(tmpDir);
    const session = enrichSession(
      {
        session_id: '45012-2026-03-22',
        started_at: '2026-03-22T10:00:00.000Z',
        last_activity: '2026-03-22T10:05:00.000Z',
        tools: {
          total_calls: 8,
          by_type: { Edit: 2 },
          last_tool: 'Edit',
          last_tool_target: '/tmp/Codebase/src/monitor.js',
        },
        files: {
          read: [],
          written: ['src/monitor.js'],
          read_count: 0,
          written_count: 1,
        },
        errors: { count: 0, history: [] },
        teammates: [],
        backlog_activity: {
          tasks_started: ['TASK-14'],
          tasks_completed: [],
          tasks_created: [],
        },
        git_activity: { commits: 0, branches_created: [] },
      },
      backlogIndex
    );

    assert.equal(session.current_focus.task_id, 'TASK-14');
    assert.equal(session.current_focus.title, 'Oturum izleme sistemi');
    assert.equal(session.phase, 'implementing');
    assert.equal(session.backlog_sync.acceptance.completed, 1);
    assert.equal(session.backlog_sync.acceptance.total, 2);
  });

  it('fits ANSI-colored content into fixed-width cells without breaking borders', () => {
    const monitorPath = path.join(__dirname, '..', 'bin', 'session-monitor.js');
    const { fitAnsi, stripAnsi } = loadModuleExports(monitorPath, {
      exports: ['fitAnsi', 'stripAnsi'],
    });

    const fitted = fitAnsi('\x1b[32m' + 'x'.repeat(40) + '\x1b[0m', 12);

    assert.equal(stripAnsi(fitted).length, 12);
  });

  it('formats monitor paths relative to the project root when possible', () => {
    const monitorPath = path.join(__dirname, '..', 'bin', 'session-monitor.js');
    const { formatDisplayPath } = loadModuleExports(monitorPath, {
      exports: ['formatDisplayPath'],
    });

    const formatted = formatDisplayPath(
      path.join(AGENTBASE_ROOT, '.claude', 'tracking', 'sessions'),
      PROJECT_ROOT
    );

    assert.equal(formatted, path.join('Agentbase', '.claude', 'tracking', 'sessions'));
  });

  it('prefers AGENTBASE_BACKLOG_DIR when resolving backlog root', () => {
    const monitorPath = path.join(__dirname, '..', 'bin', 'session-monitor.js');
    const { findBacklogDir } = loadModuleExports(monitorPath, {
      exports: ['findBacklogDir'],
      context: {
        process: {
          ...process,
          env: {
            ...process.env,
            AGENTBASE_BACKLOG_DIR: '/tmp/custom-backlog',
          },
          cwd: () => process.cwd(),
        },
      },
    });

    assert.equal(findBacklogDir(AGENTBASE_ROOT), '/tmp/custom-backlog');
  });

  it('renders shortcut hints with a bright key and dimmed description', () => {
    const monitorPath = path.join(__dirname, '..', 'bin', 'session-monitor.js');
    const { shortcutHint } = loadModuleExports(monitorPath, {
      exports: ['shortcutHint'],
    });

    const hint = shortcutHint('Tab', 'Sekme degistir');

    assert.match(hint, /\x1b\[37mTab\x1b\[0m/);
    assert.match(hint, /\x1b\[2mSekme degistir\x1b\[0m/);
  });

  it('lays out header metadata on fixed column boundaries', () => {
    const monitorPath = path.join(__dirname, '..', 'bin', 'session-monitor.js');
    const { buildHeaderMetaContent, stripAnsi } = loadModuleExports(monitorPath, {
      exports: ['buildHeaderMetaContent', 'stripAnsi'],
    });

    const content = stripAnsi(buildHeaderMetaContent(100, {
      visible: 0,
      backlog: 'backlog',
      sessionsDir: 'Agentbase/.claude/tracking/sessions',
    }));

    assert.equal(content.indexOf('Backlog'), 18);
    assert.equal(content.indexOf('Oturum dizini'), 44);
  });

  it('keeps the header title free of the selected tab name', () => {
    const monitorPath = path.join(__dirname, '..', 'bin', 'session-monitor.js');
    const { buildHeaderTitle, stripAnsi } = loadModuleExports(monitorPath, {
      exports: ['buildHeaderTitle', 'stripAnsi'],
    });

    const title = stripAnsi(buildHeaderTitle('Timeline'));

    assert.equal(title, 'AGENTIC WORKFLOW');
  });
});

// ─────────────────────────────────────────────────────
// SESSION-MONITOR BUGFIX TESTLERI
// ─────────────────────────────────────────────────────

describe('session-monitor bugfixes', () => {
  const monitorPath = path.join(__dirname, '..', 'bin', 'session-monitor.js');

  it('TASK-97: siralama degisince selectedId ayni session_id de kaliyor', () => {
    const mod = loadModuleExports(monitorPath, {
      exports: ['getFilteredSessions', 'selectDelta', 'sessions', '_getSelectedId', '_getSelectedIndex'],
      replacements: [
        {
          find: /let sessions = \[\];/,
          replace: `let sessions = [
            { session_id: 'A-2026', last_activity: '${new Date().toISOString()}' },
            { session_id: 'B-2026', last_activity: '${new Date(Date.now() - 60000).toISOString()}' },
            { session_id: 'C-2026', last_activity: '${new Date(Date.now() - 120000).toISOString()}' },
          ];`,
        },
        {
          // selectedId ve selectedIndex getter'larini export et — primitive oldugu icin dogrudan export yaramaz
          find: /let selectedId = null;/,
          replace: `let selectedId = null;\nfunction _getSelectedId() { return selectedId; }\nfunction _getSelectedIndex() { return selectedIndex; }`,
        },
        // render() yi no-op yap (terminal ciktisi engelle)
        {
          find: /function render\(\) \{/,
          replace: `function render() { return;`,
        },
      ],
    });

    // Baslangic: getFilteredSessions → selectedId ilk oturuma (A-2026) set edilir
    mod.getFilteredSessions();
    assert.equal(mod._getSelectedId(), 'A-2026', 'ilk secim A olmali');

    // selectDelta(1) ile B-2026 ya gec (index 0 → 1)
    mod.selectDelta(1);
    assert.equal(mod._getSelectedId(), 'B-2026', 'selectDelta sonrasi B secili olmali');

    // Sessions dizisini mutasyona ugrat: basa yeni eleman ekle
    // B-2026 artik index 1 degil index 2 de
    mod.sessions.unshift({ session_id: 'D-2026', last_activity: new Date().toISOString() });
    // Yeni sira: [D(0), A(1), B(2), C(3)]

    // getFilteredSessions selectedId ile B-2026 yi bulup index ini guncellemeli
    const filtered = mod.getFilteredSessions();
    assert.equal(mod._getSelectedId(), 'B-2026', 'siralama degisse de selectedId B de kalmali');

    // Render path dogrulamasi: render() filtered[selectedIndex] kullanir.
    // selectedIndex stale kalip index 1 (A-2026) gosteriyor olsaydi bu assert fail olurdu.
    const selectedIndex = mod._getSelectedIndex();
    assert.ok(
      selectedIndex >= 0 && selectedIndex < filtered.length,
      'selectedIndex gecerli aralikta olmali'
    );
    assert.equal(
      filtered[selectedIndex].session_id,
      'B-2026',
      'render path: filtered[selectedIndex] B-2026 gostermeli — stale index A-2026 gosterirse fail olur'
    );
  });

  it('TASK-98: loadBacklogIndex bozuk dosyayi atliyor', () => {
    const { loadBacklogIndex } = loadModuleExports(monitorPath, {
      exports: ['loadBacklogIndex'],
    });

    const tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'backlog-test-')));
    const tasksDir = path.join(tmpDir, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });

    // Gecerli task dosyasi
    fs.writeFileSync(path.join(tasksDir, 'task-1 - test.md'), '# Test\nStatus: To Do\n');
    // Bozuk dosya (dizin)
    fs.mkdirSync(path.join(tasksDir, 'broken.md'));
    // Gecersiz icerik
    fs.writeFileSync(path.join(tasksDir, 'task-2 - bad.md'), '\x00\x01\x02');
    // Backlog.md index dosyasi (hasBacklogMarkers icin gerekli)
    fs.writeFileSync(path.join(tmpDir, 'Backlog.md'), '# Backlog\n');

    const index = loadBacklogIndex(tmpDir);
    // Bozuk dosyalar atlanmali, gecerli dosya yuklenmeli
    assert.ok(index['TASK-1'], 'gecerli task yuklenmeli');
    // Monitor crash etmemeli
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('TASK-100: priorityColor dogru ANSI renk kodlarini donduruyor', () => {
    const { priorityColor, stripAnsi } = loadModuleExports(monitorPath, {
      exports: ['priorityColor', 'stripAnsi'],
    });

    // Tam renk kodu dogrulamasi: yanlis renk eslemesi (ornek: high=mavi) bu testleri fail ettirir
    assert.equal(priorityColor('high'), '\x1b[31m', 'high priority kirmizi (\\x1b[31m) olmali');
    assert.equal(priorityColor('medium'), '\x1b[33m', 'medium priority sari (\\x1b[33m) olmali');
    assert.equal(priorityColor('low'), '\x1b[34m', 'low priority mavi (\\x1b[34m) olmali');
    // stripAnsi ile ANSI kodlari temizlenmeli
    assert.equal(stripAnsi('\x1b[31mtest\x1b[0m'), 'test', 'stripAnsi ANSI escape kodlarini silmeli');
  });

  it('TASK-100 regresyon: summarizeBacklog priority segmenti dogru ANSI renk koduyla sarili', () => {
    const { summarizeBacklog, stripAnsi } = loadModuleExports(monitorPath, {
      exports: ['summarizeBacklog', 'stripAnsi'],
    });

    const session = {
      current_focus: { task_id: 'TASK-42' },
      backlog_sync: { status: 'In Progress', priority: 'high', acceptance: { completed: 1, total: 3 } },
    };

    const output = summarizeBacklog(session);

    // Tam ANSI kodu dogrulamasi: \x1b[31m = kirmizi (red), \d+ olsaydi yanlis renk kacabilirdi
    // Eski bugli davranista "high" duz metin; dogru davranista \x1b[31mhigh\x1b[0m
    assert.match(output, /\x1b\[31mhigh\x1b\[0m/, 'priority "high" kirmizi \\x1b[31m koduyla sarili olmali');

    // medium: \x1b[33m = sari (yellow)
    const mediumSession = {
      current_focus: { task_id: 'TASK-43' },
      backlog_sync: { status: 'To Do', priority: 'medium', acceptance: { completed: 0, total: 2 } },
    };
    const mediumOutput = summarizeBacklog(mediumSession);
    assert.match(mediumOutput, /\x1b\[33mmedium\x1b\[0m/, 'priority "medium" sari \\x1b[33m koduyla sarili olmali');

    // low: \x1b[34m = mavi (blue)
    const lowSession = {
      current_focus: { task_id: 'TASK-44' },
      backlog_sync: { status: 'To Do', priority: 'low', acceptance: { completed: 0, total: 1 } },
    };
    const lowOutput = summarizeBacklog(lowSession);
    assert.match(lowOutput, /\x1b\[34mlow\x1b\[0m/, 'priority "low" mavi \\x1b[34m koduyla sarili olmali');
  });
});

// ─────────────────────────────────────────────────────
// SESSION-MONITOR EDGE CASE TESTLERI
// ─────────────────────────────────────────────────────

describe('session-monitor edge cases', () => {
  const monitorPath = path.join(__dirname, '..', 'bin', 'session-monitor.js');

  it('TASK-119: sessions dizini yoksa loadSessions bos doner', () => {
    const { loadSessions } = loadModuleExports(monitorPath, {
      exports: ['loadSessions'],
      replacements: [
        {
          find: /const SESSIONS_DIR = .*?;/,
          replace: `const SESSIONS_DIR = '/nonexistent/path/sessions';`,
        },
      ],
    });

    const result = loadSessions();
    assert.ok(Array.isArray(result.sessions), 'sessions dizi olmali');
    assert.equal(result.sessions.length, 0, 'bos dizi olmali');
    assert.equal(result.meta.sessionsDirExists, false, 'sessionsDirExists false olmali');
  });

  it('TASK-120: bos sessions dizininde loadSessions bos doner', () => {
    const tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sessions-empty-')));
    const sessionsDir = path.join(tmpDir, 'sessions');
    fs.mkdirSync(sessionsDir, { recursive: true });

    const { loadSessions } = loadModuleExports(monitorPath, {
      exports: ['loadSessions'],
      replacements: [
        {
          find: /const SESSIONS_DIR = .*?;/,
          replace: `const SESSIONS_DIR = ${JSON.stringify(sessionsDir)};`,
        },
      ],
    });

    const result = loadSessions();
    assert.equal(result.sessions.length, 0, 'bos sessions dizininde bos dizi');
    assert.equal(result.meta.sessionFileCount, 0, 'dosya sayisi 0');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('TASK-121: bozuk session JSON dosyasi parseErrors artiriyor, crash etmiyor', () => {
    const tmpDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sessions-corrupt-')));
    const sessionsDir = path.join(tmpDir, 'sessions');
    fs.mkdirSync(sessionsDir, { recursive: true });

    // Gecerli session
    fs.writeFileSync(path.join(sessionsDir, 'session-100-2026-03-23.json'), JSON.stringify({
      session_id: '100-2026-03-23',
      last_activity: new Date().toISOString(),
    }));
    // Bozuk session
    fs.writeFileSync(path.join(sessionsDir, 'session-200-2026-03-23.json'), '{BOZUK JSON!!!');

    const { loadSessions } = loadModuleExports(monitorPath, {
      exports: ['loadSessions'],
      replacements: [
        {
          find: /const SESSIONS_DIR = .*?;/,
          replace: `const SESSIONS_DIR = ${JSON.stringify(sessionsDir)};`,
        },
      ],
    });

    const result = loadSessions();
    assert.equal(result.sessions.length, 1, 'gecerli session yuklenmeli');
    assert.equal(result.meta.parseErrors, 1, 'bozuk dosya parseErrors olarak sayilmali');
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('TASK-122: session var olmayan task ID referans ediyorsa backlog_sync.missing true', () => {
    const { enrichSession } = loadModuleExports(monitorPath, {
      exports: ['enrichSession'],
    });

    const session = {
      session_id: '100-2026-03-23',
      last_activity: new Date().toISOString(),
      current_focus: { task_id: 'TASK-999', title: 'Var olmayan gorev' },
    };

    // Bos backlog index — TASK-999 yok
    const enriched = enrichSession(session, {});
    assert.equal(enriched.backlog_sync.missing, true, 'missing true olmali');
    assert.equal(enriched.backlog_sync.task_id, 'TASK-999', 'task_id korunmali');
  });
});

// ─────────────────────────────────────────────────────
// SESSION-TRACKER UTILITY FUNCTION TESTLERI
// ─────────────────────────────────────────────────────

describe('session-tracker utility functions', () => {
  const trackerPath = path.join(__dirname, '..', 'templates', 'core', 'hooks', 'session-tracker.js');

  it('addToFileList kok dizin yolu icin bos girdi eklemiyor', () => {
    const { addToFileList } = loadModuleExports(trackerPath, {
      exports: ['addToFileList'],
    });

    const list = addToFileList([], '/', 50);
    assert.equal(list.length, 0, 'kok dizin yolu listeye eklenmemeli');
  });

  it('addToFileList MAX_FILE_ENTRIES asildiginda en eski girdi dusurulur', () => {
    const { addToFileList } = loadModuleExports(trackerPath, {
      exports: ['addToFileList'],
    });

    let list = [];
    for (let i = 1; i <= 52; i++) {
      list = addToFileList(list, `/tmp/project/src/file-${i}.js`, 50);
    }

    assert.equal(list.length, 50, 'liste 50 ile sinirlanmali');
    assert.ok(!list.some(f => f && f.includes('file-1.js')), 'en eski girdi dusurulmeli');
    assert.ok(list.some(f => f && f.includes('file-52.js')), 'en yeni girdi olmali');
  });

  it('addUnique ayni degeri tekrar eklemez', () => {
    const { addUnique } = loadModuleExports(trackerPath, {
      exports: ['addUnique'],
    });

    const list = [];
    addUnique(list, 'TASK-1');
    addUnique(list, 'TASK-1');
    addUnique(list, 'TASK-2');

    assert.equal(list.length, 2, 'duplicate eklenmemeli');
    assert.deepEqual(list, ['TASK-1', 'TASK-2']);
  });

  it('pushEvent MAX_EVENT_ENTRIES asildiginda eski eventler dusurulur', () => {
    const { pushEvent } = loadModuleExports(trackerPath, {
      exports: ['pushEvent'],
    });

    const state = { recent_events: [] };
    for (let i = 1; i <= 26; i++) {
      pushEvent(state, 'test', `event-${i}`);
    }

    assert.equal(state.recent_events.length, 24, 'event listesi 24 ile sinirlanmali');
    assert.ok(!state.recent_events.some(e => e.label === 'event-1'), 'en eski event dusurulmeli');
    assert.equal(state.recent_events.at(-1).label, 'event-26', 'en yeni event korunmali');
  });

  it('normalizeState null veya undefined ile cagrildiginda gecerli state dondurur', () => {
    const { normalizeState } = loadModuleExports(trackerPath, {
      exports: ['normalizeState'],
    });

    const result = normalizeState(null);
    assert.ok(result, 'null state → gecerli state olmali');
    assert.ok(Array.isArray(result.recent_events), 'recent_events dizi olmali');
    assert.equal(result.phase, 'planning', 'varsayilan faz planning olmali');
    assert.equal(result.waiting_on, 'none', 'varsayilan waiting_on none olmali');

    const result2 = normalizeState(undefined);
    assert.ok(result2, 'undefined state → gecerli state olmali');
    assert.ok(Array.isArray(result2.recent_events));
  });

  it('shortenPath null yerine bos string donduruyor', () => {
    const { shortenPath } = loadModuleExports(trackerPath, {
      exports: ['shortenPath'],
    });

    assert.equal(shortenPath(null), '', 'null → empty string');
    assert.equal(shortenPath(''), '', 'empty string → empty string');
    assert.equal(typeof shortenPath(null), 'string', 'donus tipi string olmali');
  });

  it('sanitizeSnippet sk- API anahtarini maskeler', () => {
    const { sanitizeSnippet } = loadModuleExports(trackerPath, {
      exports: ['sanitizeSnippet'],
    });

    const text = 'Error: invalid key sk-abc123XYZ789abcdef in request';
    const result = sanitizeSnippet(text);
    assert.ok(!result.includes('sk-abc123XYZ789abcdef'), 'API anahtari maskelenmeli');
    assert.ok(result.includes('[REDACTED]'), '[REDACTED] etiketi olmali');
  });

  it('sanitizeSnippet AWS access key maskeleniyor', () => {
    const { sanitizeSnippet } = loadModuleExports(trackerPath, {
      exports: ['sanitizeSnippet'],
    });

    const text = 'Auth failed: AKIAIOSFODNN7EXAMPLE is not authorized';
    const result = sanitizeSnippet(text);
    assert.ok(!result.includes('AKIAIOSFODNN7EXAMPLE'), 'AWS key maskelenmeli');
    assert.ok(result.includes('[REDACTED]'), '[REDACTED] etiketi olmali');
  });

  it('sanitizeSnippet Bearer token maskeleniyor', () => {
    const { sanitizeSnippet } = loadModuleExports(trackerPath, {
      exports: ['sanitizeSnippet'],
    });

    const text = 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiYWxpY2UifQ.abc123xyz';
    const result = sanitizeSnippet(text);
    assert.ok(!result.includes('eyJhbGciOiJIUzI1NiJ9'), 'JWT token maskelenmeli');
    assert.ok(result.includes('[REDACTED]'), '[REDACTED] etiketi olmali');
  });

  it('sanitizeSnippet zararsiz metin degistirilmiyor', () => {
    const { sanitizeSnippet } = loadModuleExports(trackerPath, {
      exports: ['sanitizeSnippet'],
    });

    const text = 'TypeError: Cannot read property foo of undefined at line 12';
    const result = sanitizeSnippet(text);
    assert.equal(result, text, 'zararsiz hata mesaji degistirilmemeli');
  });

  it('sanitizeSnippet null veya bos string ile cagrilinca calisiyor', () => {
    const { sanitizeSnippet } = loadModuleExports(trackerPath, {
      exports: ['sanitizeSnippet'],
    });

    assert.equal(sanitizeSnippet(null), null, 'null → null dondurur');
    assert.equal(sanitizeSnippet(''), '', 'bos string → bos string');
  });
});

// ─────────────────────────────────────────────────────
// SESSION-MONITOR DERIVE FUNCTION TESTLERI
// ─────────────────────────────────────────────────────

describe('session-monitor derive functions', () => {
  const monitorPath = path.join(__dirname, '..', 'bin', 'session-monitor.js');

  it('derivePhase Edit tool → implementing donduruyor', () => {
    const { derivePhase } = loadModuleExports(monitorPath, {
      exports: ['derivePhase'],
    });

    const session = { tools: { last_tool: 'Edit', last_tool_target: 'src/index.js' }, errors: { count: 0 } };
    assert.equal(derivePhase(session), 'implementing');
  });

  it('derivePhase Agent tool → reviewing donduruyor', () => {
    const { derivePhase } = loadModuleExports(monitorPath, {
      exports: ['derivePhase'],
    });

    const session = { tools: { last_tool: 'Agent', last_tool_target: 'review-agent' }, errors: { count: 0 } };
    assert.equal(derivePhase(session), 'reviewing');
  });

  it('derivePhase Bash + test komutu + hata → waiting donduruyor', () => {
    const { derivePhase } = loadModuleExports(monitorPath, {
      exports: ['derivePhase'],
    });

    const session = {
      tools: { last_tool: 'Bash', last_tool_target: 'npm test' },
      errors: { count: 1 },
    };
    assert.equal(derivePhase(session), 'waiting');
  });

  it('derivePhase Bash + test komutu + hata yok → testing donduruyor', () => {
    const { derivePhase } = loadModuleExports(monitorPath, {
      exports: ['derivePhase'],
    });

    const session = {
      tools: { last_tool: 'Bash', last_tool_target: 'npm test' },
      errors: { count: 0 },
    };
    assert.equal(derivePhase(session), 'testing');
  });

  it('inferLegacyTaskId tamamlanmamis son gorevi donduruyor', () => {
    const { inferLegacyTaskId } = loadModuleExports(monitorPath, {
      exports: ['inferLegacyTaskId'],
    });

    const session = {
      backlog_activity: {
        tasks_started: ['TASK-1', 'TASK-2', 'TASK-3'],
        tasks_completed: ['TASK-1'],
      },
    };

    // TASK-1 tamamlandi → active: [TASK-2, TASK-3] → son uncompleted: TASK-3
    assert.equal(inferLegacyTaskId(session), 'TASK-3');
  });

  it('inferLegacyTaskId tum gorevler tamamlandi → son started gorevi donduruyor', () => {
    const { inferLegacyTaskId } = loadModuleExports(monitorPath, {
      exports: ['inferLegacyTaskId'],
    });

    const session = {
      backlog_activity: {
        tasks_started: ['TASK-10', 'TASK-11'],
        tasks_completed: ['TASK-10', 'TASK-11'],
      },
    };

    assert.equal(inferLegacyTaskId(session), 'TASK-11');
  });

  it('timeAgo sinir degerlerini dogru formatlıyor', () => {
    const { timeAgo } = loadModuleExports(monitorPath, {
      exports: ['timeAgo'],
    });

    const now = Date.now();
    assert.match(timeAgo(new Date(now - 30000).toISOString()), /^30sn$/);
    assert.match(timeAgo(new Date(now - 60000).toISOString()), /^1dk$/);
    assert.match(timeAgo(new Date(now - 3600000).toISOString()), /^1sa$/);
    assert.match(timeAgo(new Date(now - 86400000).toISOString()), /^1g$/);
  });
});

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

function makeToolPayload(toolInput, toolResult) {
  return JSON.stringify({
    tool_input: toolInput,
    ...(toolResult !== undefined ? { tool_result: toolResult } : {}),
  });
}

function readSessionState(projectRoot) {
  const sessionsDir = path.join(projectRoot, 'Agentbase', '.claude', 'tracking', 'sessions');
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
      '/Users/varienos/Landing/Repo/agentic-workflow/Agentbase/.claude/tracking/sessions',
      '/Users/varienos/Landing/Repo/agentic-workflow'
    );

    assert.equal(formatted, 'Agentbase/.claude/tracking/sessions');
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

    assert.equal(findBacklogDir('/Users/varienos/Landing/Repo/agentic-workflow/Agentbase'), '/tmp/custom-backlog');
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
      exports: ['getFilteredSessions', 'selectDelta', 'sessions', '_getSelectedId'],
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
          // selectedId getter export et — primitive oldugundan dogrudan export ise yaramaz
          find: /let selectedId = null;/,
          replace: `let selectedId = null;\nfunction _getSelectedId() { return selectedId; }`,
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

    // Eski bugli davranis kontrolu: index-tabanli olsaydi, index 1 = A-2026 olurdu
    const selectedSession = filtered.find(s => s.session_id === mod._getSelectedId());
    assert.ok(selectedSession, 'secili session listede olmali');
    assert.equal(selectedSession.session_id, 'B-2026', 'secili session B olmali, A degil');
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

  it('TASK-100: priorityColor ANSI kodu donduruyor, stripAnsi ile silinmiyor', () => {
    const { priorityColor, stripAnsi } = loadModuleExports(monitorPath, {
      exports: ['priorityColor', 'stripAnsi'],
    });

    const highColor = priorityColor('high');
    assert.ok(highColor.includes('\x1b['), 'ANSI escape kodu icermeli');
    assert.notEqual(stripAnsi(highColor), highColor, 'ANSI kodu stripAnsi ile farkli olmali');
  });

  it('TASK-100 regresyon: summarizeBacklog priority segmenti ANSI renk koduna sarili', () => {
    const { summarizeBacklog, stripAnsi } = loadModuleExports(monitorPath, {
      exports: ['summarizeBacklog', 'stripAnsi'],
    });

    const session = {
      current_focus: { task_id: 'TASK-42' },
      backlog_sync: { status: 'In Progress', priority: 'high', acceptance: { completed: 1, total: 3 } },
    };

    const output = summarizeBacklog(session);

    // Priority segmentinin kendisi ANSI renk koduyla sarili olmali
    // Eski bugli davranista "high" duz metin olarak geliyor, ANSI kodu yok
    // Dogru davranista: \x1b[31mhigh\x1b[0m (kirmizi)
    assert.match(output, /\x1b\[\d+mhigh\x1b\[0m/, 'priority "high" kendi ANSI renk koduyla sarili olmali');

    // "medium" icin de kontrol et
    const mediumSession = {
      current_focus: { task_id: 'TASK-43' },
      backlog_sync: { status: 'To Do', priority: 'medium', acceptance: { completed: 0, total: 2 } },
    };
    const mediumOutput = summarizeBacklog(mediumSession);
    assert.match(mediumOutput, /\x1b\[\d+mmedium\x1b\[0m/, 'priority "medium" kendi ANSI renk koduyla sarili olmali');
  });
});

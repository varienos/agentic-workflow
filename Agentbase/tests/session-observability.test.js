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

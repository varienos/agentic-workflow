#!/usr/bin/env node
/**
 * Session Tracker Hook — Agentic Workflow
 *
 * PostToolUse hook'u her tool cagrisindan sonra oturum state'ini gunceller.
 * Coklu oturum guvenli: her terminal kendi dosyasina yazar.
 */

const fs = require('fs');
const path = require('path');

const SESSIONS_DIR = path.join(__dirname, '../tracking/sessions');
const SESSION_ID = `${process.ppid}-${new Date().toISOString().slice(0, 10)}`;
const SESSION_FILE = path.join(SESSIONS_DIR, `session-${SESSION_ID}.json`);
const MAX_FILE_ENTRIES = 50;
const MAX_ERROR_ENTRIES = 20;
const MAX_EVENT_ENTRIES = 24;

function nowIso() {
  return new Date().toISOString();
}

function ensureDir() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

function createEmptyFocus() {
  return {
    task_id: null,
    title: null,
    status: null,
    priority: null,
  };
}

function createInitialState() {
  const now = nowIso();
  return {
    session_id: SESSION_ID,
    started_at: now,
    last_activity: now,
    tools: {
      total_calls: 0,
      by_type: {},
      last_tool: null,
      last_tool_target: null,
    },
    files: {
      read: [],
      written: [],
      read_count: 0,
      written_count: 0,
    },
    errors: {
      count: 0,
      history: [],
    },
    teammates: [],
    backlog_activity: {
      tasks_started: [],
      tasks_completed: [],
      tasks_created: [],
    },
    git_activity: {
      commits: 0,
      branches_created: [],
    },
    current_focus: createEmptyFocus(),
    phase: 'planning',
    waiting_on: 'none',
    last_meaningful_action: 'Oturum basladi',
    recent_events: [],
    backlog_sync: {
      task_id: null,
      status: null,
      priority: null,
      dependencies: [],
      acceptance: {
        completed: 0,
        total: 0,
      },
      updated_at: null,
    },
  };
}

function normalizeState(state) {
  const normalized = state && typeof state === 'object' ? state : createInitialState();

  normalized.session_id = normalized.session_id || SESSION_ID;
  normalized.started_at = normalized.started_at || nowIso();
  normalized.last_activity = normalized.last_activity || normalized.started_at;

  normalized.tools = normalized.tools || {};
  normalized.tools.total_calls = normalized.tools.total_calls || 0;
  normalized.tools.by_type = normalized.tools.by_type || {};
  normalized.tools.last_tool = normalized.tools.last_tool || null;
  normalized.tools.last_tool_target = normalized.tools.last_tool_target || null;

  normalized.files = normalized.files || {};
  normalized.files.read = Array.isArray(normalized.files.read) ? normalized.files.read : [];
  normalized.files.written = Array.isArray(normalized.files.written) ? normalized.files.written : [];
  normalized.files.read_count = normalized.files.read_count || 0;
  normalized.files.written_count = normalized.files.written_count || 0;

  normalized.errors = normalized.errors || {};
  normalized.errors.count = normalized.errors.count || 0;
  normalized.errors.history = Array.isArray(normalized.errors.history) ? normalized.errors.history : [];

  normalized.teammates = Array.isArray(normalized.teammates) ? normalized.teammates : [];

  normalized.backlog_activity = normalized.backlog_activity || {};
  normalized.backlog_activity.tasks_started = Array.isArray(normalized.backlog_activity.tasks_started)
    ? normalized.backlog_activity.tasks_started
    : [];
  normalized.backlog_activity.tasks_completed = Array.isArray(normalized.backlog_activity.tasks_completed)
    ? normalized.backlog_activity.tasks_completed
    : [];
  normalized.backlog_activity.tasks_created = Array.isArray(normalized.backlog_activity.tasks_created)
    ? normalized.backlog_activity.tasks_created
    : [];

  normalized.git_activity = normalized.git_activity || {};
  normalized.git_activity.commits = normalized.git_activity.commits || 0;
  normalized.git_activity.branches_created = Array.isArray(normalized.git_activity.branches_created)
    ? normalized.git_activity.branches_created
    : [];

  normalized.current_focus = {
    ...createEmptyFocus(),
    ...(normalized.current_focus || {}),
  };
  normalized.phase = normalized.phase || 'planning';
  normalized.waiting_on = normalized.waiting_on || 'none';
  normalized.last_meaningful_action = normalized.last_meaningful_action || 'Oturum devam ediyor';
  normalized.recent_events = Array.isArray(normalized.recent_events) ? normalized.recent_events : [];
  normalized.backlog_sync = normalized.backlog_sync || {};
  normalized.backlog_sync.task_id = normalized.backlog_sync.task_id || normalized.current_focus.task_id || null;
  normalized.backlog_sync.status = normalized.backlog_sync.status || normalized.current_focus.status || null;
  normalized.backlog_sync.priority = normalized.backlog_sync.priority || normalized.current_focus.priority || null;
  normalized.backlog_sync.dependencies = Array.isArray(normalized.backlog_sync.dependencies)
    ? normalized.backlog_sync.dependencies
    : [];
  normalized.backlog_sync.acceptance = normalized.backlog_sync.acceptance || {};
  normalized.backlog_sync.acceptance.completed = normalized.backlog_sync.acceptance.completed || 0;
  normalized.backlog_sync.acceptance.total = normalized.backlog_sync.acceptance.total || 0;
  normalized.backlog_sync.updated_at = normalized.backlog_sync.updated_at || null;

  return normalized;
}

function loadState() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      return normalizeState(JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8')));
    }
  } catch {
    // Bozuk state dosyasi durumunda sifirdan basla.
  }
  return createInitialState();
}

function syncBacklogSnapshot(state) {
  state.backlog_sync = {
    ...(state.backlog_sync || {}),
    task_id: state.current_focus.task_id,
    status: state.current_focus.status,
    priority: state.current_focus.priority,
    dependencies: Array.isArray(state.backlog_sync?.dependencies)
      ? state.backlog_sync.dependencies
      : [],
    acceptance: state.backlog_sync?.acceptance || { completed: 0, total: 0 },
    updated_at: nowIso(),
  };
}

function saveState(state) {
  try {
    ensureDir();
    state.last_activity = nowIso();
    syncBacklogSnapshot(state);
    fs.writeFileSync(SESSION_FILE, JSON.stringify(state));
  } catch {
    // Hook sessiz kalmali.
  }
}

function detectToolType(input) {
  const ti = input.tool_input || {};
  if (ti.command !== undefined) return 'Bash';
  if (ti.prompt !== undefined && ti.description !== undefined) return 'Agent';
  if (ti.old_string !== undefined) return 'Edit';
  if (ti.content !== undefined && ti.file_path !== undefined) return 'Write';
  if (ti.pattern !== undefined && (ti.output_mode !== undefined || ti.type !== undefined)) return 'Grep';
  if (ti.pattern !== undefined) return 'Glob';
  if (ti.file_path !== undefined) return 'Read';
  return 'Unknown';
}

function getTarget(input, toolType) {
  const ti = input.tool_input || {};
  switch (toolType) {
    case 'Read':
    case 'Edit':
    case 'Write':
      return ti.file_path || null;
    case 'Bash':
      return (ti.command || '').substring(0, 120);
    case 'Grep':
      return ti.pattern || null;
    case 'Agent':
      return ti.name || ti.description || null;
    default:
      return null;
  }
}

function shortenPath(filePath) {
  if (!filePath) return null;
  const segments = String(filePath).split(path.sep).filter(Boolean);
  return segments.slice(-2).join('/');
}

function shortenCommand(command, max = 80) {
  if (!command) return '';
  return command.length > max ? `${command.slice(0, max - 1)}...` : command;
}

function addToFileList(list, filePath, max) {
  if (!filePath) return list;
  const shortPath = shortenPath(filePath);
  const filtered = list.filter(entry => entry !== shortPath);
  filtered.push(shortPath);
  return filtered.slice(-max);
}

function addUnique(list, value) {
  if (!value || list.includes(value)) return;
  list.push(value);
}

function pushEvent(state, kind, label, extra = {}) {
  state.recent_events.push({
    timestamp: nowIso(),
    kind,
    label,
    ...extra,
  });
  if (state.recent_events.length > MAX_EVENT_ENTRIES) {
    state.recent_events = state.recent_events.slice(-MAX_EVENT_ENTRIES);
  }
}

function updateFocus(state, updates) {
  state.current_focus = {
    ...state.current_focus,
    ...updates,
  };
}

function hasToolError(result) {
  if (!result) return false;
  const exitCode = result?.exit_code;
  if (exitCode !== undefined && exitCode !== 0) return true;

  const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
  return (
    /^(Error|SyntaxError|TypeError|ReferenceError|ENOENT|EACCES):/.test(resultStr) ||
    resultStr.includes('"error":') ||
    resultStr.includes('ENOENT') ||
    resultStr.includes('EACCES')
  );
}

function isTestCommand(command) {
  if (!command) return false;
  return (
    /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test\b/i.test(command) ||
    /\bnode\s+--test\b/i.test(command) ||
    /\bjest\b/i.test(command) ||
    /\bvitest\b/i.test(command) ||
    /\bpytest\b/i.test(command) ||
    /\bphpunit\b/i.test(command) ||
    /\bcargo\s+test\b/i.test(command) ||
    /\bgo\s+test\b/i.test(command)
  );
}

function detectErrors(input, state, toolType) {
  const result = input.tool_result;
  if (!hasToolError(result)) return false;

  const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
  state.errors.count++;
  state.errors.history.push({
    timestamp: nowIso(),
    tool: toolType,
    target: getTarget(input, toolType),
    snippet: resultStr.substring(0, 200),
  });

  if (state.errors.history.length > MAX_ERROR_ENTRIES) {
    state.errors.history = state.errors.history.slice(-MAX_ERROR_ENTRIES);
  }

  return true;
}

function analyzeBashCommand(command, state, input, hadError) {
  if (!command) return;

  const shortened = shortenCommand(command);
  const taskStartMatch = command.match(/backlog\s+task\s+edit\s+(\d+).*-s\s+["']?In\s*Progress["']?/i);
  if (taskStartMatch) {
    const taskId = `TASK-${taskStartMatch[1]}`;
    addUnique(state.backlog_activity.tasks_started, taskId);
    updateFocus(state, {
      task_id: taskId,
      status: 'In Progress',
    });
    state.phase = 'planning';
    state.waiting_on = 'none';
    state.last_meaningful_action = `Backlog gorevi basladi: ${taskId}`;
    pushEvent(state, 'backlog', `${taskId} basladi`, { task_id: taskId });
    return;
  }

  const taskDoneMatch = command.match(/backlog\s+task\s+edit\s+(\d+).*-s\s+["']?Done["']?/i);
  if (taskDoneMatch) {
    const taskId = `TASK-${taskDoneMatch[1]}`;
    addUnique(state.backlog_activity.tasks_completed, taskId);
    if (state.current_focus.task_id === taskId) {
      updateFocus(state, { status: 'Done' });
    }
    state.phase = 'done';
    state.waiting_on = 'none';
    state.last_meaningful_action = `Backlog gorevi tamamlandi: ${taskId}`;
    pushEvent(state, 'backlog', `${taskId} tamamlandi`, { task_id: taskId });
    return;
  }

  const taskCreateMatch = command.match(/backlog\s+task\s+create\s+"([^"]+)"/i);
  if (taskCreateMatch) {
    const title = taskCreateMatch[1].substring(0, 60);
    state.backlog_activity.tasks_created.push(title);
    state.last_meaningful_action = `Backlog gorevi olusturuldu: ${title}`;
    pushEvent(state, 'backlog', `Gorev olustu: ${title}`);
    return;
  }

  if (/git\s+commit\b/i.test(command)) {
    state.git_activity.commits++;
    state.last_meaningful_action = 'Git commit olusturuldu';
    pushEvent(state, 'git', 'Git commit olustu');
    return;
  }

  const branchMatch = command.match(/git\s+(?:checkout\s+-b|branch)\s+["']?([^\s"']+)/i);
  if (branchMatch) {
    addUnique(state.git_activity.branches_created, branchMatch[1]);
    state.last_meaningful_action = `Branch olusturuldu: ${branchMatch[1]}`;
    pushEvent(state, 'git', `Branch olustu: ${branchMatch[1]}`);
    return;
  }

  if (isTestCommand(command)) {
    if (hadError) {
      state.phase = 'waiting';
      state.waiting_on = 'test';
      state.last_meaningful_action = `Test basarisiz: ${shortened}`;
      pushEvent(state, 'test', `Test basarisiz: ${shortened}`);
    } else {
      state.phase = 'testing';
      state.waiting_on = 'none';
      state.last_meaningful_action = `Test calisti: ${shortened}`;
      pushEvent(state, 'test', `Test calisti: ${shortened}`);
    }
    return;
  }

  if (hadError) {
    state.phase = 'waiting';
    state.waiting_on = 'dependency';
    state.last_meaningful_action = `Komut basarisiz: ${shortened}`;
    pushEvent(state, 'error', `Komut basarisiz: ${shortened}`);
    return;
  }

  state.last_meaningful_action = `Komut calisti: ${shortened}`;
  pushEvent(state, 'command', `Komut calisti: ${shortened}`);
}

function detectTeammate(input, state) {
  const ti = input.tool_input || {};
  if (!ti.prompt || !ti.description) return;

  const name = ti.name || ti.description || 'unnamed';
  const hasResult = !!input.tool_result;
  const existing = state.teammates.find(teammate => teammate.name === name);

  if (existing) {
    if (hasResult) {
      existing.status = 'completed';
      existing.completed_at = nowIso();
      state.last_meaningful_action = `Alt ajan tamamlandi: ${name}`;
      pushEvent(state, 'teammate', `Alt ajan tamamlandi: ${name}`, { teammate: name });
    }
    return;
  }

  state.teammates.push({
    name,
    spawned_at: nowIso(),
    status: hasResult ? 'completed' : 'spawned',
    completed_at: hasResult ? nowIso() : undefined,
  });

  state.phase = 'reviewing';
  state.waiting_on = 'none';
  state.last_meaningful_action = hasResult
    ? `Alt ajan tamamlandi: ${name}`
    : `Alt ajan baslatildi: ${name}`;
  pushEvent(
    state,
    'teammate',
    hasResult ? `Alt ajan tamamlandi: ${name}` : `Alt ajan baslatildi: ${name}`,
    { teammate: name }
  );
}

function applyToolActivity(state, input, toolType, target, hadError) {
  if (toolType === 'Bash') {
    analyzeBashCommand(input.tool_input?.command, state, input, hadError);
    return;
  }

  if (toolType === 'Agent') {
    detectTeammate(input, state);
    return;
  }

  if (toolType === 'Read') {
    state.phase = state.phase === 'done' ? 'done' : 'planning';
    state.waiting_on = 'none';
    state.last_meaningful_action = `${shortenPath(target) || 'dosya'} okundu`;
    pushEvent(state, 'read', `${shortenPath(target) || 'dosya'} okundu`);
    return;
  }

  if (toolType === 'Grep' || toolType === 'Glob') {
    state.phase = 'planning';
    state.waiting_on = 'none';
    state.last_meaningful_action = `${target || 'calisma alani'} arandi`;
    pushEvent(state, 'search', `${target || 'calisma alani'} arandi`);
    return;
  }

  if (toolType === 'Edit' || toolType === 'Write') {
    state.phase = 'implementing';
    state.waiting_on = 'none';
    state.last_meaningful_action = `${shortenPath(target) || 'dosya'} ${toolType === 'Edit' ? 'duzenlendi' : 'yazildi'}`;
    pushEvent(
      state,
      'write',
      `${shortenPath(target) || 'dosya'} ${toolType === 'Edit' ? 'duzenlendi' : 'yazildi'}`
    );
    return;
  }

  if (hadError) {
    state.phase = 'waiting';
    state.waiting_on = 'dependency';
    state.last_meaningful_action = `${toolType} basarisiz`;
    pushEvent(state, 'error', `${toolType} basarisiz`);
  }
}

async function main() {
  let inputData = '';

  process.stdin.on('data', chunk => {
    inputData += chunk;
  });

  process.stdin.on('end', () => {
    try {
      const input = JSON.parse(inputData);
      const state = loadState();
      const toolType = detectToolType(input);
      const target = getTarget(input, toolType);

      state.tools.total_calls++;
      state.tools.by_type[toolType] = (state.tools.by_type[toolType] || 0) + 1;
      state.tools.last_tool = toolType;
      state.tools.last_tool_target = target;

      const filePath = input.tool_input?.file_path;
      if (filePath) {
        if (toolType === 'Read') {
          state.files.read = addToFileList(state.files.read, filePath, MAX_FILE_ENTRIES);
          state.files.read_count++;
        } else if (toolType === 'Edit' || toolType === 'Write') {
          state.files.written = addToFileList(state.files.written, filePath, MAX_FILE_ENTRIES);
          state.files.written_count++;
        }
      }

      const hadError = detectErrors(input, state, toolType);
      applyToolActivity(state, input, toolType, target, hadError);
      saveState(normalizeState(state));
    } catch {
      // Hook hicbir durumda ana akisi bloklamamali.
    }

    process.exit(0);
  });
}

main();

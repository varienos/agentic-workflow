#!/usr/bin/env node
/**
 * Session Monitor — Agentic Workflow
 *
 * Oturum JSON state dosyalarini terminal icinde backlog-aware bir TUI ile gosterir.
 * Varsayilan gorunum: Timeline
 * Ikinci gorunum: Agent Radar
 */

const fs = require('fs');
const path = require('path');

const AGENTBASE_DIR = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(AGENTBASE_DIR, '..');
const SESSIONS_DIR = process.env.AGENTBASE_SESSIONS_DIR || path.join(AGENTBASE_DIR, '.claude', 'tracking', 'sessions');
const REFRESH_INTERVAL = Number(process.env.AGENTBASE_REFRESH_INTERVAL || 2000);
const THROTTLE_MS = 150;
const ACTIVE_THRESHOLD = 5 * 60 * 1000;
const IDLE_THRESHOLD = 30 * 60 * 1000;

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  reverse: '\x1b[7m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
};

const B = {
  tl: '┌',
  tr: '┐',
  bl: '└',
  br: '┘',
  h: '─',
  v: '│',
  ml: '├',
  mr: '┤',
  dot: '·',
};

let sessions = [];
let loadMeta = null;
let showClosed = true;
let showHelp = false;
let detailView = false;
let viewMode = 'timeline';
let selectedIndex = 0;
let renderTimeout = null;
let lastRender = 0;
let watcher = null;
let refreshInterval = null;
let cleanedUp = false;

function stripAnsi(str) {
  return String(str || '').replace(/\x1b\[[0-9;]*m/g, '');
}

function visibleLength(str) {
  return stripAnsi(str).length;
}

function splitAnsi(str) {
  return String(str || '').match(/\x1b\[[0-9;]*m|[\s\S]/g) || [];
}

function truncateAnsi(str, max, suffix = '') {
  if (max <= 0) return '';

  const suffixText = suffix && max > visibleLength(suffix) ? suffix : '';
  const allowed = max - visibleLength(suffixText);
  let out = '';
  let visible = 0;

  for (const token of splitAnsi(str)) {
    if (/^\x1b\[[0-9;]*m$/.test(token)) {
      out += token;
      continue;
    }

    if (visible >= allowed) break;
    out += token;
    visible += 1;
  }

  out += suffixText;

  if (/\x1b\[[0-9;]*m/.test(out) && !out.endsWith(C.reset)) {
    out += C.reset;
  }

  return out;
}

function fitAnsi(str, width, align = 'left') {
  if (width <= 0) return '';
  const truncated = truncateAnsi(str, width);
  const padding = Math.max(0, width - visibleLength(truncated));

  if (align === 'right') return ' '.repeat(padding) + truncated;
  if (align === 'center') {
    const left = Math.floor(padding / 2);
    return ' '.repeat(left) + truncated + ' '.repeat(padding - left);
  }
  return truncated + ' '.repeat(padding);
}

function truncatePlain(str, max, suffix = B.dot) {
  const value = String(str || '');
  if (value.length <= max) return value;
  if (max <= suffix.length) return suffix.slice(0, max);
  return value.slice(0, max - suffix.length) + suffix;
}

function getWidth() {
  return Math.min(Math.max(process.stdout.columns || 100, 72), 120);
}

function getHeight() {
  return Math.max(process.stdout.rows || 30, 18);
}

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[H');
}

function hideCursor() {
  process.stdout.write('\x1b[?25l');
}

function showCursor() {
  process.stdout.write('\x1b[?25h');
}

function enterAltScreen() {
  process.stdout.write('\x1b[?1049h');
}

function exitAltScreen() {
  process.stdout.write('\x1b[?1049l');
}

function hLine(width, left = B.tl, right = B.tr) {
  return `${C.gray}${left}${B.h.repeat(Math.max(0, width - 2))}${right}${C.reset}`;
}

function row(content, width) {
  const innerWidth = Math.max(0, width - 4);
  return `${C.gray}${B.v}${C.reset} ${fitAnsi(content, innerWidth)} ${C.gray}${B.v}${C.reset}`;
}

function emptyRow(width) {
  return row('', width);
}

function nowTimeLabel() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

function timeAgo(isoStr) {
  if (!isoStr) return '?';
  const diff = Date.now() - new Date(isoStr).getTime();
  if (diff < 0) return 'simdi';
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}sn`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}dk`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}sa`;
  return `${Math.floor(hr / 24)}g`;
}

function duration(startIso, endIso) {
  if (!startIso) return '?';
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const diff = Math.max(0, end - new Date(startIso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}dk`;
  const hr = Math.floor(min / 60);
  return `${hr}sa ${min % 60}dk`;
}

function statusColor(status) {
  switch (status) {
    case 'planning':
      return C.blue;
    case 'implementing':
      return C.cyan;
    case 'testing':
      return C.magenta;
    case 'reviewing':
      return C.yellow;
    case 'waiting':
      return C.red;
    case 'done':
      return C.green;
    default:
      return C.dim;
  }
}

function sessionStatus(session) {
  if (!session.last_activity) return { label: 'bilinmiyor', color: C.gray, icon: '?' };
  const diff = Date.now() - new Date(session.last_activity).getTime();
  if (diff < ACTIVE_THRESHOLD) return { label: 'aktif', color: C.green, icon: '●' };
  if (diff < IDLE_THRESHOLD) return { label: 'bosta', color: C.yellow, icon: '○' };
  return { label: 'kapali', color: C.gray, icon: '─' };
}

function phaseLabel(phase) {
  switch (phase) {
    case 'planning':
      return 'plan';
    case 'implementing':
      return 'uygulama';
    case 'testing':
      return 'test';
    case 'reviewing':
      return 'inceleme';
    case 'waiting':
      return 'bekleme';
    case 'done':
      return 'tamam';
    default:
      return phase || 'bilinmiyor';
  }
}

function priorityColor(priority) {
  switch ((priority || '').toLowerCase()) {
    case 'high':
      return C.red;
    case 'medium':
      return C.yellow;
    case 'low':
      return C.blue;
    default:
      return C.dim;
  }
}

function badge(text, color) {
  return `${color}[${text}]${C.reset}`;
}

function buildHeaderTitle() {
  return `${C.bold}${C.cyan}AGENTIC WORKFLOW${C.reset}`;
}

function shortcutHint(key, description) {
  return `${C.white}${key}${C.reset} ${C.dim}${description}${C.reset}`;
}

function joinShortcutHints(items) {
  return items.map(([key, description]) => shortcutHint(key, description)).join('  ');
}

function metadataHint(label, value, width) {
  const safeValue = value === undefined || value === null ? '—' : String(value);
  const labelText = `${C.white}${label}${C.reset}`;
  const valueWidth = Math.max(0, width - visibleLength(label) - 1);
  const valueText = `${C.dim}${truncateAnsi(safeValue, valueWidth, B.dot)}${C.reset}`;
  return fitAnsi(`${labelText} ${valueText}`, width);
}

function buildHeaderMetaContent(width, meta) {
  const innerWidth = Math.max(24, width - 4);
  const firstColumn = 16;
  const secondColumn = 24;
  const gap = '  ';
  const thirdColumn = Math.max(12, innerWidth - firstColumn - secondColumn - visibleLength(gap) * 2);

  return [
    metadataHint('Gorunen:', meta.visible, firstColumn),
    metadataHint('Backlog:', meta.backlog, secondColumn),
    metadataHint('Oturum dizini:', meta.sessionsDir, thirdColumn),
  ].join(gap);
}

function formatDisplayPath(targetPath, baseDir = PROJECT_ROOT) {
  if (!targetPath) return '—';

  const relative = path.relative(baseDir, targetPath);
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
    return relative;
  }

  const homeDir = process.env.HOME;
  if (homeDir && targetPath.startsWith(homeDir + path.sep)) {
    return `~/${path.relative(homeDir, targetPath)}`;
  }

  return targetPath;
}

function hasBacklogMarkers(dir) {
  return (
    !!dir &&
    fs.existsSync(dir) &&
    (fs.existsSync(path.join(dir, 'tasks')) ||
      fs.existsSync(path.join(dir, 'completed')) ||
      fs.existsSync(path.join(dir, 'config.yml')))
  );
}

function findBacklogDir(startDir = AGENTBASE_DIR) {
  if (process.env.AGENTBASE_BACKLOG_DIR) {
    return process.env.AGENTBASE_BACKLOG_DIR;
  }

  const candidates = [];
  let current = startDir;

  for (let i = 0; i < 5; i += 1) {
    candidates.push(path.join(current, 'backlog'));
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  candidates.push(path.join(process.cwd(), 'backlog'));

  for (const candidate of candidates) {
    if (hasBacklogMarkers(candidate)) return candidate;
  }

  return null;
}

function parseScalar(rawValue) {
  const value = String(rawValue || '').trim();
  if (value === '') return '';
  if (value === '[]') return [];
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
    return value.slice(1, -1);
  }
  if (value === 'null') return null;
  return value;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return {};

  const data = {};
  let currentListKey = null;

  for (const line of match[1].split('\n')) {
    const kvMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      const rawValue = kvMatch[2];
      const value = rawValue.trim() === '' ? [] : parseScalar(rawValue);
      data[key] = value;
      currentListKey = Array.isArray(value) ? key : null;
      continue;
    }

    const listMatch = line.match(/^\s*-\s*(.*)$/);
    if (listMatch && currentListKey) {
      if (!Array.isArray(data[currentListKey])) data[currentListKey] = [];
      data[currentListKey].push(parseScalar(listMatch[1]));
    }
  }

  return data;
}

function parseAcceptance(content) {
  const blockMatch = content.match(/<!-- AC:BEGIN -->([\s\S]*?)<!-- AC:END -->/);
  const source = blockMatch ? blockMatch[1] : content;
  const items = source.match(/^\s*-\s\[(x| )\].*$/gim) || [];
  const completed = items.filter(item => /\[(x|X)\]/.test(item)).length;
  return {
    completed,
    total: items.length,
  };
}

function parseBacklogTaskFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const frontmatter = parseFrontmatter(content);
  const id = frontmatter.id || (() => {
    const match = path.basename(filePath).match(/task-(\d+)/i);
    return match ? `TASK-${match[1]}` : null;
  })();
  const title = frontmatter.title || content.match(/^#\s+(.+)$/m)?.[1] || path.basename(filePath);

  return {
    id,
    title,
    status: frontmatter.status || null,
    priority: frontmatter.priority || null,
    dependencies: Array.isArray(frontmatter.dependencies) ? frontmatter.dependencies : [],
    updated_date: frontmatter.updated_date || null,
    acceptance: parseAcceptance(content),
    path: filePath,
  };
}

function loadBacklogIndex(backlogDir = findBacklogDir()) {
  const index = {};
  if (!hasBacklogMarkers(backlogDir)) return index;

  const directories = ['tasks', 'completed'];
  for (const directory of directories) {
    const fullDir = path.join(backlogDir, directory);
    if (!fs.existsSync(fullDir)) continue;

    for (const file of fs.readdirSync(fullDir)) {
      if (!file.endsWith('.md')) continue;
      const task = parseBacklogTaskFile(path.join(fullDir, file));
      if (task.id) index[task.id] = task;
    }
  }

  return index;
}

function normalizeTaskId(taskId) {
  if (!taskId) return null;
  if (/^TASK-\d+$/i.test(taskId)) return taskId.toUpperCase();
  if (/^\d+$/.test(String(taskId))) return `TASK-${taskId}`;
  return String(taskId).toUpperCase();
}

function inferLegacyTaskId(session) {
  const started = (session.backlog_activity?.tasks_started || []).map(normalizeTaskId).filter(Boolean);
  const completed = new Set((session.backlog_activity?.tasks_completed || []).map(normalizeTaskId).filter(Boolean));
  const active = started.filter(taskId => !completed.has(taskId));
  return active.at(-1) || started.at(-1) || null;
}

function isTestLikeCommand(command) {
  return (
    /\b(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?test\b/i.test(command || '') ||
    /\bnode\s+--test\b/i.test(command || '') ||
    /\bjest\b/i.test(command || '') ||
    /\bvitest\b/i.test(command || '') ||
    /\bpytest\b/i.test(command || '') ||
    /\bphpunit\b/i.test(command || '') ||
    /\bcargo\s+test\b/i.test(command || '') ||
    /\bgo\s+test\b/i.test(command || '')
  );
}

function derivePhase(session) {
  if (session.phase) return session.phase;
  if (session.waiting_on && session.waiting_on !== 'none') return 'waiting';

  const lastTool = session.tools?.last_tool;
  const target = session.tools?.last_tool_target || '';

  if (lastTool === 'Edit' || lastTool === 'Write') return 'implementing';
  if (lastTool === 'Agent') return 'reviewing';
  if (lastTool === 'Bash' && isTestLikeCommand(target)) {
    return session.errors?.count > 0 ? 'waiting' : 'testing';
  }
  return 'planning';
}

function deriveWaitingOn(session, phase) {
  if (session.waiting_on) return session.waiting_on;
  if (phase === 'waiting' && isTestLikeCommand(session.tools?.last_tool_target || '')) return 'test';
  return 'none';
}

function deriveLastMeaningfulAction(session) {
  if (session.last_meaningful_action) return session.last_meaningful_action;

  const tool = session.tools?.last_tool;
  const target = session.tools?.last_tool_target;

  switch (tool) {
    case 'Read':
      return `${target || 'dosya'} okundu`;
    case 'Edit':
      return `${target || 'dosya'} duzenlendi`;
    case 'Write':
      return `${target || 'dosya'} yazildi`;
    case 'Bash':
      return `Komut calisti: ${target || 'komut'}`;
    case 'Agent':
      return `Alt ajan baslatildi: ${target || 'ajan'}`;
    default:
      return 'Henuz anlamli bir islem kaydi yok';
  }
}

function normalizeRecentEvents(session) {
  if (!Array.isArray(session.recent_events) || session.recent_events.length === 0) {
    return [
      {
        timestamp: session.last_activity || session.started_at || new Date(0).toISOString(),
        kind: 'activity',
        label: deriveLastMeaningfulAction(session),
      },
    ];
  }

  return session.recent_events.slice(-12);
}

function enrichSession(session, backlogIndex = {}) {
  const currentFocus = {
    task_id: normalizeTaskId(session.current_focus?.task_id || inferLegacyTaskId(session)),
    title: session.current_focus?.title || null,
    status: session.current_focus?.status || null,
    priority: session.current_focus?.priority || null,
  };
  const linkedTask = currentFocus.task_id ? backlogIndex[currentFocus.task_id] : null;
  const phase = derivePhase(session);
  const waitingOn = deriveWaitingOn(session, phase);

  return {
    ...session,
    current_focus: {
      task_id: currentFocus.task_id,
      title: linkedTask?.title || currentFocus.title,
      status: linkedTask?.status || currentFocus.status,
      priority: linkedTask?.priority || currentFocus.priority,
    },
    phase,
    waiting_on: waitingOn,
    last_meaningful_action: deriveLastMeaningfulAction(session),
    recent_events: normalizeRecentEvents(session),
    backlog_sync: {
      task_id: currentFocus.task_id,
      status: linkedTask?.status || session.backlog_sync?.status || currentFocus.status || null,
      priority: linkedTask?.priority || session.backlog_sync?.priority || currentFocus.priority || null,
      dependencies: linkedTask?.dependencies || session.backlog_sync?.dependencies || [],
      acceptance: linkedTask?.acceptance || session.backlog_sync?.acceptance || { completed: 0, total: 0 },
      updated_at: linkedTask?.updated_date || session.backlog_sync?.updated_at || null,
      path: linkedTask?.path || null,
      missing: Boolean(currentFocus.task_id) && !linkedTask,
    },
    teammates: Array.isArray(session.teammates) ? session.teammates : [],
    files: {
      read: Array.isArray(session.files?.read) ? session.files.read : [],
      written: Array.isArray(session.files?.written) ? session.files.written : [],
      read_count: session.files?.read_count || 0,
      written_count: session.files?.written_count || 0,
    },
    errors: {
      count: session.errors?.count || 0,
      history: Array.isArray(session.errors?.history) ? session.errors.history : [],
    },
    tools: {
      total_calls: session.tools?.total_calls || 0,
      by_type: session.tools?.by_type || {},
      last_tool: session.tools?.last_tool || null,
      last_tool_target: session.tools?.last_tool_target || null,
    },
  };
}

function loadSessions() {
  const backlogDir = findBacklogDir();
  const backlogIndex = loadBacklogIndex(backlogDir);
  const meta = {
    sessionsDir: SESSIONS_DIR,
    sessionsDirExists: fs.existsSync(SESSIONS_DIR),
    backlogDir,
    sessionFileCount: 0,
    parseErrors: 0,
  };

  if (!meta.sessionsDirExists) {
    return { sessions: [], meta, backlogIndex };
  }

  const files = fs
    .readdirSync(SESSIONS_DIR)
    .filter(file => file.startsWith('session-') && file.endsWith('.json'));
  meta.sessionFileCount = files.length;

  const loadedSessions = files
    .map(file => {
      try {
        const session = JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf8'));
        return enrichSession({ ...session, _file: file }, backlogIndex);
      } catch {
        meta.parseErrors += 1;
        return null;
      }
    })
    .filter(Boolean)
    .sort((left, right) => {
      const leftStatus = sessionStatus(left);
      const rightStatus = sessionStatus(right);
      const order = { aktif: 0, bosta: 1, kapali: 2, bilinmiyor: 3 };
      if (order[leftStatus.label] !== order[rightStatus.label]) {
        return order[leftStatus.label] - order[rightStatus.label];
      }
      return new Date(right.last_activity || 0) - new Date(left.last_activity || 0);
    });

  return { sessions: loadedSessions, meta, backlogIndex };
}

function getFilteredSessions() {
  const filtered = showClosed ? sessions : sessions.filter(session => sessionStatus(session).label !== 'kapali');
  if (filtered.length === 0) {
    selectedIndex = 0;
    return filtered;
  }

  selectedIndex = Math.max(0, Math.min(selectedIndex, filtered.length - 1));
  return filtered;
}

function selectDelta(delta) {
  const filtered = getFilteredSessions();
  if (filtered.length === 0) return;
  selectedIndex = Math.max(0, Math.min(selectedIndex + delta, filtered.length - 1));
  render();
}

function getSelectionWindow(items, perPage) {
  if (items.length <= perPage) return { start: 0, slice: items };
  const half = Math.floor(perPage / 2);
  let start = Math.max(0, selectedIndex - half);
  if (start + perPage > items.length) {
    start = items.length - perPage;
  }
  return { start, slice: items.slice(start, start + perPage) };
}

function summarizeTask(session, max = 34) {
  if (!session.current_focus?.task_id) return `${C.dim}Bagli gorev yok${C.reset}`;
  const title = session.current_focus.title ? ` ${session.current_focus.title}` : '';
  return `${C.cyan}${truncateAnsi(`${session.current_focus.task_id}${title}`, max, B.dot)}${C.reset}`;
}

function summarizeBacklog(session) {
  if (!session.current_focus?.task_id) return `${C.dim}Backlog: bagli degil${C.reset}`;
  if (session.backlog_sync?.missing) {
    return `${C.red}Backlog: ${session.current_focus.task_id} bulunamadi${C.reset}`;
  }

  const parts = [];
  if (session.backlog_sync?.status) parts.push(session.backlog_sync.status);
  if (session.backlog_sync?.priority) {
    parts.push(`${stripAnsi(priorityColor(session.backlog_sync.priority))}${session.backlog_sync.priority}`);
  }
  const acceptance = session.backlog_sync?.acceptance || { completed: 0, total: 0 };
  if (acceptance.total > 0) {
    parts.push(`AC ${acceptance.completed}/${acceptance.total}`);
  }
  if (Array.isArray(session.backlog_sync?.dependencies) && session.backlog_sync.dependencies.length > 0) {
    parts.push(`dep ${session.backlog_sync.dependencies.length}`);
  }

  const rendered = parts.length > 0 ? parts.join(' · ') : 'bagli';
  return `${C.white}Backlog:${C.reset} ${rendered}`;
}

function summarizeWait(session) {
  if (!session.waiting_on || session.waiting_on === 'none') {
    return `${C.dim}bekleme yok${C.reset}`;
  }
  return `${C.red}bekleme ${session.waiting_on}${C.reset}`;
}

function summarizeErrors(session) {
  if ((session.errors?.count || 0) === 0) {
    return `${C.dim}hata 0${C.reset}`;
  }
  return `${C.red}hata ${session.errors.count}${C.reset}`;
}

function summarizeTeammates(session) {
  if (!session.teammates || session.teammates.length === 0) {
    return `${C.dim}ajan 0${C.reset}`;
  }

  const names = session.teammates
    .slice(-2)
    .map(teammate => truncatePlain(teammate.name, 10))
    .join(', ');
  return `${C.yellow}ajan ${session.teammates.length}${C.reset} ${C.dim}${names}${C.reset}`;
}

function renderHeader(width) {
  const filtered = getFilteredSessions();
  const activeCount = sessions.filter(session => sessionStatus(session).label === 'aktif').length;
  const idleCount = sessions.filter(session => sessionStatus(session).label === 'bosta').length;
  const closedCount = sessions.filter(session => sessionStatus(session).label === 'kapali').length;
  const timelineTab = viewMode === 'timeline'
    ? `${C.bold}${C.white}[Timeline]${C.reset}`
    : `${C.dim}[Timeline]${C.reset}`;
  const radarTab = viewMode === 'radar'
    ? `${C.bold}${C.white}[Agent Radar]${C.reset}`
    : `${C.dim}[Agent Radar]${C.reset}`;

  const title = buildHeaderTitle();
  const tabs = `${timelineTab} ${radarTab}`;
  const stats = `${C.green}${activeCount} aktif${C.reset} ${C.yellow}${idleCount} bosta${C.reset} ${C.gray}${closedCount} kapali${C.reset} ${C.dim}${nowTimeLabel()}${C.reset}`;

  return [
    hLine(width),
    row(`${title}  ${tabs}  ${stats}`, width),
    row(buildHeaderMetaContent(width, {
      visible: filtered.length,
      backlog: loadMeta?.backlogDir ? formatDisplayPath(loadMeta.backlogDir) : 'yok',
      sessionsDir: formatDisplayPath(loadMeta?.sessionsDir || SESSIONS_DIR),
    }), width),
    hLine(width, B.ml, B.mr),
  ];
}

function renderEmptyState(width) {
  const lines = [emptyRow(width)];

  if (!loadMeta?.sessionsDirExists) {
    lines.push(row(`${C.red}Tracker inactive:${C.reset} ${formatDisplayPath(loadMeta?.sessionsDir || SESSIONS_DIR)} bulunamadi.`, width));
    lines.push(row(`${C.dim}Session-tracker hook henuz materyalize edilmemis veya aktif degil olabilir.${C.reset}`, width));
  } else if ((loadMeta?.sessionFileCount || 0) === 0) {
    lines.push(row(`${C.yellow}Henuz oturum dosyasi yok.${C.reset}`, width));
    lines.push(row(`${C.dim}Hook aktif olabilir ama bu workspace'de henuz bir oturum kaydi yazilmamis.${C.reset}`, width));
  } else if (loadMeta?.parseErrors >= loadMeta?.sessionFileCount) {
    lines.push(row(`${C.red}Tum session dosyalari okunamadi.${C.reset}`, width));
    lines.push(row(`${C.dim}Bozuk JSON dosyalari oldugu icin dashboard veri uretemiyor.${C.reset}`, width));
  } else {
    lines.push(row(`${C.dim}Gosterilecek oturum bulunamadi.${C.reset}`, width));
  }

  lines.push(emptyRow(width));
  return lines;
}

function renderTimeline() {
  const width = getWidth();
  const height = getHeight();
  const lines = renderHeader(width);
  const filtered = getFilteredSessions();

  if (filtered.length === 0) {
    lines.push(...renderEmptyState(width));
  } else {
    const blockHeight = 4;
    const footerRoom = 6;
    const availableRows = Math.max(1, Math.floor((height - lines.length - footerRoom) / blockHeight));
    const { start, slice } = getSelectionWindow(filtered, availableRows);

    slice.forEach((session, offset) => {
      const absoluteIndex = start + offset;
      const status = sessionStatus(session);
      const pid = (session.session_id || '?').split('-')[0];
      const marker = absoluteIndex === selectedIndex ? `${C.cyan}›${C.reset}` : ' ';
      const phase = badge(phaseLabel(session.phase), statusColor(session.phase));
      const dur = `${C.dim}${duration(session.started_at)}${C.reset}`;
      const line1 = `${marker} ${status.color}${status.icon}${C.reset} ${C.bold}${pid}${C.reset}  ${summarizeTask(session)}  ${phase}  ${dur}`;
      const line2 = `  ${C.dim}Son islem:${C.reset} ${truncateAnsi(session.last_meaningful_action || '—', width - 16, B.dot)}`;
      const line3 = `  ${summarizeBacklog(session)}  ${C.dim}|${C.reset}  ${summarizeWait(session)}  ${C.dim}|${C.reset}  ${summarizeErrors(session)}  ${C.dim}|${C.reset}  ${summarizeTeammates(session)}`;

      lines.push(row(line1, width));
      lines.push(row(line2, width));
      lines.push(row(line3, width));
      lines.push(emptyRow(width));
    });
  }

  lines.push(hLine(width, B.ml, B.mr));
  lines.push(row(` ${C.dim}Secim:${C.reset} ${getFilteredSessions().length === 0 ? '—' : `${selectedIndex + 1}/${getFilteredSessions().length}`}  ${C.dim}Ayrisma hatasi:${C.reset} ${loadMeta?.parseErrors || 0}`, width));
  lines.push(hLine(width, B.ml, B.mr));
  lines.push(row(` ${joinShortcutHints([
    ['Tab', 'Sekme'],
    ['j/k', 'Sec'],
    ['↑/↓', 'Sec'],
    ['Enter', 'Detay'],
    ['c', `Kapali ${showClosed ? 'gizle' : 'goster'}`],
    ['h', 'Yardim'],
    ['q', 'Cikis'],
  ])}`, width));
  lines.push(hLine(width, B.bl, B.br));

  return lines.slice(0, height);
}

function collectEventStream(limit = 8) {
  return sessions
    .flatMap(session =>
      (session.recent_events || []).map(event => ({
        ...event,
        session_id: (session.session_id || '?').split('-')[0],
        task_id: session.current_focus?.task_id || '—',
      }))
    )
    .sort((left, right) => new Date(right.timestamp || 0) - new Date(left.timestamp || 0))
    .slice(0, limit);
}

function renderRadar() {
  const width = getWidth();
  const height = getHeight();
  const lines = renderHeader(width);
  const filtered = getFilteredSessions();

  if (filtered.length === 0) {
    lines.push(...renderEmptyState(width));
  } else {
    const tableInnerWidth = width - 4;
    const headers = [
      { width: 3, text: '' },
      { width: 6, text: 'PID' },
      { width: 18, text: 'Gorev' },
      { width: 12, text: 'Faz' },
      { width: 9, text: 'Durum' },
      { width: 9, text: 'Bekleme' },
      { width: 6, text: 'Hata' },
      { width: Math.max(10, tableInnerWidth - 63), text: 'Son islem' },
    ];

    const renderColumns = cells => cells.map((cell, index) => fitAnsi(cell, headers[index].width)).join(' ');
    lines.push(row(renderColumns(headers.map(header => `${C.bold}${header.text}${C.reset}`)), width));
    lines.push(hLine(width, B.ml, B.mr));

    const eventRoom = 8;
    const availableRows = Math.max(1, height - lines.length - eventRoom);
    const { slice, start } = getSelectionWindow(filtered, availableRows);

    slice.forEach((session, offset) => {
      const absoluteIndex = start + offset;
      const marker = absoluteIndex === selectedIndex ? `${C.cyan}›${C.reset}` : ' ';
      const status = sessionStatus(session);
      const pid = (session.session_id || '?').split('-')[0];
      const cells = [
        marker,
        `${status.color}${pid}${C.reset}`,
        summarizeTask(session, headers[2].width),
        badge(phaseLabel(session.phase), statusColor(session.phase)),
        `${status.color}${status.label}${C.reset}`,
        session.waiting_on === 'none' ? `${C.dim}yok${C.reset}` : `${C.red}${session.waiting_on}${C.reset}`,
        session.errors.count > 0 ? `${C.red}${session.errors.count}${C.reset}` : `${C.dim}0${C.reset}`,
        truncateAnsi(session.last_meaningful_action || '—', headers[7].width, B.dot),
      ];
      lines.push(row(renderColumns(cells), width));
    });

    lines.push(emptyRow(width));
    lines.push(hLine(width, B.ml, B.mr));
    lines.push(row(` ${C.bold}Olay Akisi${C.reset}`, width));
    lines.push(hLine(width, B.ml, B.mr));

    const events = collectEventStream(4);
    if (events.length === 0) {
      lines.push(row(` ${C.dim}Etkin event yok.${C.reset}`, width));
    } else {
      events.forEach(event => {
        const label = `${C.dim}${timeAgo(event.timestamp)}${C.reset}  ${C.cyan}${event.task_id}${C.reset}  #${event.session_id}  ${event.label}`;
        lines.push(row(` ${truncateAnsi(label, width - 6, B.dot)}`, width));
      });
    }
  }

  lines.push(hLine(width, B.ml, B.mr));
  lines.push(row(` ${joinShortcutHints([
    ['Tab', 'Sekme'],
    ['j/k', 'Sec'],
    ['Enter', 'Detay'],
    ['c', `Kapali ${showClosed ? 'gizle' : 'goster'}`],
    ['h', 'Yardim'],
    ['q', 'Cikis'],
  ])}`, width));
  lines.push(hLine(width, B.bl, B.br));

  return lines.slice(0, height);
}

function renderDetail() {
  const width = getWidth();
  const height = getHeight();
  const filtered = getFilteredSessions();

  if (filtered.length === 0) {
    detailView = false;
    return renderTimeline();
  }

  const session = filtered[selectedIndex];
  const status = sessionStatus(session);
  const pid = (session.session_id || '?').split('-')[0];
  const lines = [
    hLine(width),
    row(`${C.bold}${C.cyan}Oturum Detayi${C.reset}: ${C.bold}${pid}${C.reset}  ${status.color}${status.icon} ${status.label}${C.reset}`, width),
    hLine(width, B.ml, B.mr),
    emptyRow(width),
    row(` ${C.dim}Gorev:${C.reset} ${session.current_focus?.task_id || '—'} ${session.current_focus?.title || ''}`, width),
    row(` ${C.dim}Faz:${C.reset} ${phaseLabel(session.phase)}  ${C.dim}Bekleme:${C.reset} ${session.waiting_on === 'none' ? 'yok' : (session.waiting_on || 'yok')}  ${C.dim}Sure:${C.reset} ${duration(session.started_at)}`, width),
    row(` ${C.dim}Son aksiyon:${C.reset} ${session.last_meaningful_action || '—'}`, width),
    row(` ${C.dim}Backlog:${C.reset} ${session.backlog_sync?.status || '—'}  ${C.dim}Oncelik:${C.reset} ${session.backlog_sync?.priority || '—'}  ${C.dim}AC:${C.reset} ${session.backlog_sync?.acceptance?.completed || 0}/${session.backlog_sync?.acceptance?.total || 0}`, width),
    emptyRow(width),
    hLine(width, B.ml, B.mr),
    row(` ${C.bold}Arac Kullanimi${C.reset} (${session.tools.total_calls} toplam)`, width),
    hLine(width, B.ml, B.mr),
  ];

  Object.entries(session.tools.by_type || {})
    .sort((left, right) => right[1] - left[1])
    .forEach(([toolName, count]) => {
      lines.push(row(` ${fitAnsi(toolName, 10)} ${count}`, width));
    });

  lines.push(emptyRow(width));
  lines.push(hLine(width, B.ml, B.mr));
  lines.push(row(` ${C.bold}Dosyalar${C.reset}  O:${session.files.read_count}  Y:${session.files.written_count}`, width));
  lines.push(hLine(width, B.ml, B.mr));
  lines.push(row(` ${C.blue}Okunan:${C.reset} ${(session.files.read || []).slice(-6).join(', ') || '—'}`, width));
  lines.push(row(` ${C.magenta}Yazilan:${C.reset} ${(session.files.written || []).slice(-6).join(', ') || '—'}`, width));

  lines.push(emptyRow(width));
  lines.push(hLine(width, B.ml, B.mr));
  lines.push(row(` ${C.bold}Son Olaylar${C.reset}`, width));
  lines.push(hLine(width, B.ml, B.mr));
  (session.recent_events || []).slice(-6).reverse().forEach(event => {
    lines.push(row(` ${C.dim}${timeAgo(event.timestamp)}${C.reset}  ${event.label}`, width));
  });

  if (session.errors.count > 0) {
    lines.push(emptyRow(width));
    lines.push(hLine(width, B.ml, B.mr));
    lines.push(row(` ${C.bold}${C.red}Hatalar${C.reset} (${session.errors.count})`, width));
    lines.push(hLine(width, B.ml, B.mr));
    session.errors.history.slice(-3).reverse().forEach(error => {
      lines.push(row(` ${C.red}${error.tool}${C.reset} ${truncateAnsi(error.snippet || '', width - 16, B.dot)}`, width));
    });
  }

  lines.push(emptyRow(width));
  lines.push(hLine(width, B.ml, B.mr));
  lines.push(row(` ${joinShortcutHints([
    ['Esc', 'Geri'],
    ['Tab', 'Sekme'],
    ['j/k', 'Sec'],
    ['q', 'Cikis'],
  ])}`, width));
  lines.push(hLine(width, B.bl, B.br));

  return lines.slice(0, height);
}

function renderHelp() {
  const width = getWidth();
  return [
    hLine(width),
    row(`${C.bold}${C.cyan}Klavye Kisayollari${C.reset}`, width),
    hLine(width, B.ml, B.mr),
    emptyRow(width),
    row(` ${shortcutHint('Tab', 'Timeline ve Agent Radar arasinda gec')}`, width),
    row(` ${shortcutHint('j / k', 'Secili oturumu asagi veya yukari kaydir')}`, width),
    row(` ${shortcutHint('↑ / ↓', 'Secimi ok tuslariyla degistir')}`, width),
    row(` ${shortcutHint('Enter', 'Secili oturumun detayini ac')}`, width),
    row(` ${shortcutHint('Esc', 'Detay veya yardim ekranindan geri don')}`, width),
    row(` ${shortcutHint('c', 'Kapali oturumlari goster veya gizle')}`, width),
    row(` ${shortcutHint('r', 'Ekrani yenile')}`, width),
    row(` ${shortcutHint('h', 'Yardim ekranini ac veya kapa')}`, width),
    row(` ${shortcutHint('q', 'Cik')}`, width),
    emptyRow(width),
    hLine(width, B.ml, B.mr),
    row(` ${C.dim}Durum simgeleri:${C.reset} ${C.green}● aktif${C.reset}  ${C.yellow}○ bosta${C.reset}  ${C.gray}─ kapali${C.reset}`, width),
    row(` ${C.dim}Sekmeler:${C.reset} Timeline = kim ne yapiyor, Agent Radar = yogun telemetri ve olay akisi`, width),
    row(` ${C.dim}Backlog kaynagi:${C.reset} ${loadMeta?.backlogDir ? formatDisplayPath(loadMeta.backlogDir) : 'yerel backlog bulunamadi'}`, width),
    hLine(width, B.bl, B.br),
  ];
}

function render() {
  const now = Date.now();
  if (now - lastRender < THROTTLE_MS) {
    if (!renderTimeout) {
      renderTimeout = setTimeout(() => {
        renderTimeout = null;
        render();
      }, THROTTLE_MS);
    }
    return;
  }
  lastRender = now;

  const result = loadSessions();
  sessions = result.sessions;
  loadMeta = result.meta;

  let lines;
  if (showHelp) {
    lines = renderHelp();
  } else if (detailView) {
    lines = renderDetail();
  } else if (viewMode === 'radar') {
    lines = renderRadar();
  } else {
    lines = renderTimeline();
  }

  clearScreen();
  process.stdout.write(lines.join('\n') + '\n');
}

function setupInput() {
  if (!process.stdin.isTTY) return;

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', key => {
    if (key === '\x03' || key.toLowerCase() === 'q') {
      cleanup();
      process.exit(0);
      return;
    }

    if (key === '\t') {
      viewMode = viewMode === 'timeline' ? 'radar' : 'timeline';
      detailView = false;
      showHelp = false;
      render();
      return;
    }

    if (key === '\r' || key === '\n') {
      if (!showHelp && getFilteredSessions().length > 0) {
        detailView = true;
        render();
      }
      return;
    }

    if (key === '\x1b') {
      if (detailView || showHelp) {
        detailView = false;
        showHelp = false;
        render();
      }
      return;
    }

    if (key === '\x1b[A' || key.toLowerCase() === 'k') {
      detailView = false;
      selectDelta(-1);
      return;
    }

    if (key === '\x1b[B' || key.toLowerCase() === 'j') {
      detailView = false;
      selectDelta(1);
      return;
    }

    switch (key.toLowerCase()) {
      case 'r':
        render();
        break;
      case 'c':
        showClosed = !showClosed;
        detailView = false;
        render();
        break;
      case 'h':
        showHelp = !showHelp;
        detailView = false;
        render();
        break;
      default:
        break;
    }
  });
}

function setupWatcher() {
  if (fs.existsSync(SESSIONS_DIR)) {
    try {
      watcher = fs.watch(SESSIONS_DIR, { persistent: true }, () => {
        render();
      });
    } catch {
      watcher = null;
    }
  }

  refreshInterval = setInterval(render, REFRESH_INTERVAL);
  process.stdout.on('resize', () => {
    render();
  });
}

function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;

  if (renderTimeout) clearTimeout(renderTimeout);
  if (watcher) watcher.close();
  if (refreshInterval) clearInterval(refreshInterval);

  exitAltScreen();
  showCursor();
  if (process.stdin.isTTY) {
    try {
      process.stdin.setRawMode(false);
    } catch {
      // ignore
    }
  }
}

function main() {
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });
  process.on('exit', cleanup);

  enterAltScreen();
  hideCursor();
  setupInput();
  setupWatcher();
  render();
}

main();

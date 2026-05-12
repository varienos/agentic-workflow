#!/usr/bin/env node

/**
 * doc-drift-check.skeleton.js
 * PostToolUse (Edit|Write) hook
 *
 * Kod dosyasi degistiginde hedef dokumanlarin mtime degerini kontrol eder.
 * Dokuman koddan eskiyse blocking olmayan systemMessage uretir.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '.doc-drift-state.json');
const DEFAULT_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const COOLDOWN_MS = Number(process.env.DOC_DRIFT_COOLDOWN_MS) || DEFAULT_COOLDOWN_MS;

const CODEBASE_ROOT = (() => {
  const root = path.resolve(__dirname, '../../../Codebase');
  try {
    return fs.realpathSync(root);
  } catch {
    return root;
  }
})();

// ─── GENERATE BOLUMU BASLANGIC ───

const DOC_TARGET_PATHS = [
/* GENERATE: DOC_TARGET_PATHS
Aciklama: project.structure.documents[] veya project.documents[]; yoksa README.md + CHANGELOG.md. OpenAPI aktifse project.api_docs.spec_paths[] eklenir.
Gerekli manifest alanlari: project.structure.documents, project.documents, project.api_docs.spec_paths, modules.active.api_docs
Ornek cikti: */
/* END GENERATE */
];

const CODE_PATH_PATTERNS = [
/* GENERATE: CODE_PATH_PATTERNS
Aciklama: project.subprojects[].path alanlarindan Codebase-relative regex prefixleri uretir; yoksa yaygin kaynak dizinleri fallback olur.
Gerekli manifest alanlari: project.subprojects
Ornek cikti: */
/* END GENERATE */
];

const CODE_EXTENSIONS = [
/* GENERATE: CODE_EXTENSIONS
Aciklama: Stack'e gore kod uzantilari; config ve dokuman uzantilari haric.
Gerekli manifest alanlari: stack.primary, stack.detected, stack.file_extensions
Ornek cikti: */
/* END GENERATE */
];

// ─── GENERATE BOLUMU BITIS ───

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { lastWarnedAtByDoc: {} };
  }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8');
}

function normalizeRelative(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function resolveRealPath(filePath) {
  const resolved = path.resolve(filePath);
  try {
    return fs.realpathSync(resolved);
  } catch {
    return resolved;
  }
}

function getCodebaseRelativePath(filePath) {
  const realFilePath = resolveRealPath(filePath);
  const relativePath = path.relative(CODEBASE_ROOT, realFilePath);
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) return null;
  return normalizeRelative(relativePath);
}

function isTargetDoc(relativePath) {
  return DOC_TARGET_PATHS.some(docPath => normalizeRelative(docPath) === relativePath);
}

function isCodeFile(filePath) {
  const relativePath = getCodebaseRelativePath(filePath);
  if (!relativePath || isTargetDoc(relativePath)) return false;

  const ext = path.extname(relativePath);
  if (!CODE_EXTENSIONS.includes(ext)) return false;

  return CODE_PATH_PATTERNS.length === 0 || CODE_PATH_PATTERNS.some(pattern => pattern.test(relativePath));
}

function getFileMtime(filePath) {
  try {
    return fs.statSync(filePath).mtime;
  } catch {
    return null;
  }
}

function isOnCooldown(state, docPath) {
  const lastWarnedAt = state.lastWarnedAtByDoc?.[docPath];
  if (!lastWarnedAt) return false;
  return Date.now() - new Date(lastWarnedAt).getTime() < COOLDOWN_MS;
}

function collectStaleDocs(codeFilePath, state) {
  const codeMtime = getFileMtime(codeFilePath);
  if (!codeMtime) return [];

  const staleDocs = [];
  for (const docPath of DOC_TARGET_PATHS) {
    const normalizedDocPath = normalizeRelative(docPath);
    const docFullPath = path.join(CODEBASE_ROOT, normalizedDocPath);
    const docMtime = getFileMtime(docFullPath);
    const isStale = !docMtime || docMtime < codeMtime;
    if (isStale && !isOnCooldown(state, normalizedDocPath)) {
      staleDocs.push(normalizedDocPath);
    }
  }
  return staleDocs;
}

function buildSystemMessage(staleDocs) {
  return [
    'Kod degisti, su dokumanlari guncellemeyi dusunun:',
    ...staleDocs.map(docPath => `- ${docPath}`),
    'Detayli analiz: service-documentation agent.',
  ].join('\n');
}

async function readStdin() {
  const { readStdin: readHookStdin } = require(require('path').join(__dirname, 'shared-hook-utils.js'));
  return readHookStdin();
}

async function main() {
  let input = '';
  try {
    input = await readStdin();
    const parsed = JSON.parse(input);
    const filePath = parsed?.tool_input?.file_path || parsed?.tool_input?.path || '';

    if (!filePath || !isCodeFile(filePath)) {
      process.stdout.write(input);
      return;
    }

    const state = readState();
    state.lastWarnedAtByDoc = state.lastWarnedAtByDoc || {};
    const staleDocs = collectStaleDocs(filePath, state);

    if (staleDocs.length === 0) {
      process.stdout.write(input);
      return;
    }

    const now = new Date().toISOString();
    for (const docPath of staleDocs) {
      state.lastWarnedAtByDoc[docPath] = now;
    }
    writeState(state);

    process.stdout.write(JSON.stringify({
      ...parsed,
      systemMessage: buildSystemMessage(staleDocs),
    }));
  } catch {
    if (input) process.stdout.write(input);
  }
}

if (require.main === module) main();

'use strict';

/**
 * detect.js — Codebase otomatik tespiti (deterministik)
 *
 * bootstrap.md ADIM 2'deki prose tespit mantiginin Node'a cikarilmis hali.
 * Bir codebase yolunu tarar, manifest.detected.* + stack alanlarini uretir.
 * Saf-ish fonksiyon: yalnizca okur (fs.readFileSync), yan etki yok.
 *
 * Donus (DetectionResult):
 *   {
 *     runtime, runtimeVersion, packageManager, typescript,
 *     fileExtensions: string[],
 *     projectType: 'single'|'monorepo',
 *     subprojects: [{ name, path }],
 *     database: string|null,
 *     detected: { <field>: { value, confidence, source } }
 *   }
 *
 * detected alanlari TASK-207 semasi: { value, confidence: high|medium|low, source }.
 */

const fs = require('fs');
const path = require('path');

// --- runtime → dosya uzantilari ---
const EXT_BY_RUNTIME = {
  node: ['.js', '.jsx', '.json', '.css', '.md'],
  python: ['.py', '.toml', '.cfg', '.md'],
  php: ['.php', '.json', '.md'],
  go: ['.go', '.mod', '.md'],
  rust: ['.rs', '.toml', '.md'],
  java: ['.java', '.xml', '.md'],
};

function readJSONSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

function isDirectory(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

function det(value, confidence, source) {
  return { value, confidence, source };
}

/** package.json deps + devDeps tek objede. */
function allDeps(pkg) {
  if (!pkg) return {};
  return { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
}

/** Ilk eslesen anahtari dondur; yoksa null. */
function firstMatch(deps, candidates) {
  for (const c of candidates) {
    if (deps[c] != null) return c;
  }
  return null;
}

function workspacePatterns(pkg) {
  if (!pkg) return [];
  if (Array.isArray(pkg.workspaces)) return pkg.workspaces;
  if (pkg.workspaces && Array.isArray(pkg.workspaces.packages)) return pkg.workspaces.packages;
  return [];
}

function normalizeRelPath(relPath) {
  if (typeof relPath !== 'string') return null;
  const rel = relPath.trim().replace(/\\/g, '/').replace(/\/+$/, '');
  if (!rel || rel.startsWith('!') || path.isAbsolute(rel)) return null;
  const normalized = path.posix.normalize(rel);
  if (normalized === '.' || normalized.startsWith('..')) return null;
  return normalized;
}

function listChildDirectories(root, relDir) {
  const dirPath = path.join(root, relDir);
  if (!exists(dirPath)) return [];
  try {
    return fs.readdirSync(dirPath, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.'))
      .map((e) => ({ name: e.name, path: `${relDir}/${e.name}` }));
  } catch {
    return [];
  }
}

// --- runtime tespiti ---
function detectRuntime(root) {
  if (exists(path.join(root, 'package.json'))) return { runtime: 'node', source: 'package.json' };
  if (exists(path.join(root, 'pyproject.toml')) || exists(path.join(root, 'requirements.txt'))) {
    return { runtime: 'python', source: exists(path.join(root, 'pyproject.toml')) ? 'pyproject.toml' : 'requirements.txt' };
  }
  if (exists(path.join(root, 'composer.json'))) return { runtime: 'php', source: 'composer.json' };
  if (exists(path.join(root, 'go.mod'))) return { runtime: 'go', source: 'go.mod' };
  if (exists(path.join(root, 'Cargo.toml'))) return { runtime: 'rust', source: 'Cargo.toml' };
  if (exists(path.join(root, 'pom.xml')) || exists(path.join(root, 'build.gradle'))) {
    return { runtime: 'java', source: exists(path.join(root, 'pom.xml')) ? 'pom.xml' : 'build.gradle' };
  }
  return { runtime: null, source: null };
}

function detectPackageManager(root) {
  if (exists(path.join(root, 'pnpm-lock.yaml'))) return 'pnpm';
  if (exists(path.join(root, 'yarn.lock'))) return 'yarn';
  if (exists(path.join(root, 'bun.lockb'))) return 'bun';
  if (exists(path.join(root, 'package-lock.json'))) return 'npm';
  if (exists(path.join(root, 'composer.lock'))) return 'composer';
  if (exists(path.join(root, 'poetry.lock'))) return 'poetry';
  if (exists(path.join(root, 'Cargo.lock'))) return 'cargo';
  return null;
}

// --- monorepo tespiti ---
function detectMonorepo(root, pkg) {
  const subprojects = [];
  const seen = new Set();
  const addSubproject = (relPath) => {
    const normalized = normalizeRelPath(relPath);
    if (!normalized || seen.has(normalized) || !isDirectory(path.join(root, normalized))) return;
    seen.add(normalized);
    subprojects.push({ name: path.posix.basename(normalized), path: normalized });
  };

  // pnpm/yarn/npm workspaces veya apps/packages dizinleri
  const wsPatterns = workspacePatterns(pkg);
  const hasWorkspaces = wsPatterns.length > 0;
  const hasPnpmWs = exists(path.join(root, 'pnpm-workspace.yaml'));

  for (const pattern of wsPatterns) {
    const normalized = normalizeRelPath(pattern);
    if (!normalized) continue;
    const starIndex = normalized.indexOf('*');
    if (starIndex === -1) {
      addSubproject(normalized);
      continue;
    }

    const base = normalized.slice(0, starIndex).replace(/\/+$/, '');
    if (!base || normalized.slice(starIndex).replace(/\*/g, '').replace(/\//g, '') !== '') continue;
    for (const entry of listChildDirectories(root, base)) addSubproject(entry.path);
  }

  const workspaceDirs = ['apps', 'packages', 'services'];

  for (const dir of workspaceDirs) {
    for (const entry of listChildDirectories(root, dir)) addSubproject(entry.path);
  }

  const isMonorepo = (hasWorkspaces || hasPnpmWs || subprojects.length > 1);
  return { isMonorepo, subprojects };
}

// --- deploy platform tespiti ---
function detectDeployPlatform(root) {
  if (exists(path.join(root, '.github', 'workflows'))) return det('github-actions', 'high', '.github/workflows/');
  if (exists(path.join(root, '.gitlab-ci.yml'))) return det('gitlab-ci', 'high', '.gitlab-ci.yml');
  if (exists(path.join(root, 'vercel.json'))) return det('vercel', 'high', 'vercel.json');
  if (exists(path.join(root, 'Dockerfile')) || exists(path.join(root, 'docker-compose.yml'))) {
    return det('docker', 'medium', 'Dockerfile/docker-compose.yml');
  }
  return det('none', 'low', 'CI/deploy dosyası bulunamadı');
}

// --- node ekosistem tespiti (deps tabanli) ---
function detectNodeEcosystem(root, pkg, detected) {
  const deps = allDeps(pkg);
  const src = 'package.json:dependencies';

  const tf = firstMatch(deps, ['vitest', 'jest', 'mocha', 'ava', 'jasmine']);
  detected.test_framework = det(tf, tf ? 'high' : 'low', tf ? src : 'test paketi yok');

  const fmt = firstMatch(deps, ['prettier', '@biomejs/biome']);
  detected.formatter = det(fmt === '@biomejs/biome' ? 'biome' : fmt, fmt ? 'high' : 'low', fmt ? src : 'formatter paketi yok');

  const lint = firstMatch(deps, ['eslint', '@biomejs/biome']);
  detected.linter = det(lint === '@biomejs/biome' ? 'biome' : lint, lint ? 'high' : 'low', lint ? src : 'linter paketi yok');

  const orm = firstMatch(deps, ['prisma', '@prisma/client', 'typeorm', 'sequelize', 'drizzle-orm', 'mongoose']);
  const ormVal = orm ? ({ '@prisma/client': 'prisma', 'drizzle-orm': 'drizzle' }[orm] || orm) : null;
  detected.orm = det(ormVal, orm ? 'high' : 'low', orm ? src : 'orm paketi yok');

  const auth = firstMatch(deps, ['jsonwebtoken', 'passport', 'express-session', 'next-auth', '@auth/core']);
  const authVal = auth ? ({ jsonwebtoken: 'jwt', passport: 'oauth2', 'express-session': 'session', 'next-auth': 'oauth2', '@auth/core': 'oauth2' }[auth]) : 'none';
  detected.auth_method = det(authVal, auth ? 'medium' : 'low', auth ? `${src} (${auth})` : 'auth paketi yok');

  const ds = firstMatch(deps, ['@mui/material', 'antd', 'tailwindcss', '@radix-ui/react-dialog', 'react-native-paper']);
  const dsVal = ds ? ({ '@mui/material': 'mui', antd: 'antd', tailwindcss: 'tailwind', '@radix-ui/react-dialog': 'shadcn', 'react-native-paper': 'rn-paper' }[ds]) : 'none';
  detected.design_system = det(dsVal, ds ? 'medium' : 'low', ds ? `${src} (${ds})` : 'design system paketi yok');

  // database ipucu
  let database = null;
  if (deps['pg'] || deps['postgres']) database = 'postgres';
  else if (deps['mysql'] || deps['mysql2']) database = 'mysql';
  else if (deps['mongodb'] || deps['mongoose']) database = 'mongodb';
  else if (deps['better-sqlite3'] || deps['sqlite3']) database = 'sqlite';

  const typescript = deps['typescript'] != null || exists(path.join(root, 'tsconfig.json'));
  return { database, typescript };
}

/**
 * Ana tespit fonksiyonu.
 * @param {string} codebasePath - Taranacak codebase kok dizini.
 * @returns {object} DetectionResult
 */
function detect(codebasePath) {
  const root = path.resolve(codebasePath);
  const detected = {};

  const { runtime, source: runtimeSource } = detectRuntime(root);
  const packageManager = detectPackageManager(root);
  const pkg = runtime === 'node' ? readJSONSafe(path.join(root, 'package.json')) : null;

  let typescript = false;
  let database = null;

  if (runtime === 'node') {
    const eco = detectNodeEcosystem(root, pkg, detected);
    typescript = eco.typescript;
    database = eco.database;
  } else {
    // Node disi: detected alanlarini bos/dusuk guvenle birak (greenfield benzeri).
    for (const f of ['test_framework', 'formatter', 'linter', 'orm', 'auth_method', 'design_system']) {
      detected[f] = det(null, 'low', `${runtime || 'bilinmeyen'} runtime — otomatik tespit kapsamı dışında`);
    }
  }

  detected.migration = det(detected.orm && detected.orm.value ? 'orm' : 'none', detected.orm && detected.orm.value ? 'medium' : 'low', 'detected.orm türevli');
  detected.deploy_platform = detectDeployPlatform(root);
  detected.commit_convention = det('unknown', 'low', 'git log heuristic init kapsamı dışında (--yes default: free)');

  const { isMonorepo, subprojects } = detectMonorepo(root, pkg);
  const projectType = isMonorepo ? 'monorepo' : 'single';

  const baseExt = EXT_BY_RUNTIME[runtime] || ['.md'];
  const fileExtensions = typescript ? ['.ts', '.tsx', ...baseExt] : baseExt;

  return {
    runtime,
    runtimeSource,
    runtimeVersion: pkg && pkg.engines && pkg.engines.node ? pkg.engines.node : null,
    packageManager,
    typescript,
    fileExtensions: [...new Set(fileExtensions)],
    projectType,
    subprojects,
    database,
    detected,
  };
}

module.exports = { detect, EXT_BY_RUNTIME };

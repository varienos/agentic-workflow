'use strict';

/**
 * diff-engine.js — Codebase drift tespiti
 *
 * Mevcut manifest ile yeni analiz arasindaki farklari cikarir.
 * workflow-update komutunun cekirdegi.
 */

// Bilinen dependency → modul eslestirmeleri
const DEPENDENCY_MODULE_MAP = {
  'prisma': 'orm/prisma',
  '@prisma/client': 'orm/prisma',
  'typeorm': 'orm/typeorm',
  'sequelize': 'orm/sequelize',
  'drizzle-orm': 'orm/drizzle',
  'react-native': 'mobile/react-native',
  'expo': 'mobile/expo',
  'next': 'frontend/nextjs',
  'nuxt': 'frontend/nuxt',
  'docker-compose': 'deploy/docker',
  'coolify': 'deploy/coolify',
  '@nestjs/core': 'backend/nodejs/nestjs',
  'express': 'backend/nodejs/express',
  'fastify': 'backend/nodejs/fastify',
  'laravel': 'backend/php/laravel',
  'django': 'backend/python/django',
  'flask': 'backend/python/flask',
  'flutter': 'mobile/flutter',
};

/**
 * Iki modul setini karsilastirir.
 * @param {Set<string>} oldModules — Mevcut aktif moduller
 * @param {Set<string>} newModules — Yeni taranan moduller
 * @returns {{ added: string[], removed: string[], unchanged: string[] }}
 */
function diffModules(oldModules, newModules) {
  const oldSet = oldModules instanceof Set ? oldModules : new Set(oldModules || []);
  const newSet = newModules instanceof Set ? newModules : new Set(newModules || []);

  const added = [];
  const removed = [];
  const unchanged = [];

  for (const m of newSet) {
    if (oldSet.has(m)) unchanged.push(m);
    else added.push(m);
  }
  for (const m of oldSet) {
    if (!newSet.has(m)) removed.push(m);
  }

  return { added, removed, unchanged };
}

/**
 * Detects subproject changes.
 * @param {Array} oldSubs — manifest.subprojects
 * @param {Array} newSubs — yeni taranan subprojects
 */
function diffSubprojects(oldSubs, newSubs) {
  const oldMap = new Map((oldSubs || []).map(s => [s.name || s.path, s]));
  const newMap = new Map((newSubs || []).map(s => [s.name || s.path, s]));

  const added = [];
  const removed = [];
  const changed = [];

  for (const [key, newSub] of newMap) {
    if (!oldMap.has(key)) {
      added.push(newSub);
      continue;
    }
    const oldSub = oldMap.get(key);
    const changes = [];
    for (const field of ['path', 'test_command', 'build_command', 'framework']) {
      if (oldSub[field] !== newSub[field] && (oldSub[field] || newSub[field])) {
        changes.push({ field, old: oldSub[field] || null, new: newSub[field] || null });
      }
    }
    if (changes.length > 0) {
      changed.push({ name: key, changes });
    }
  }

  for (const [key] of oldMap) {
    if (!newMap.has(key)) removed.push(oldMap.get(key));
  }

  return { added, removed, changed };
}

/**
 * Dependency degisikliklerinden modul onerileri uretir.
 * @param {Array<string>} oldDeps
 * @param {Array<string>} newDeps
 */
function diffDependencies(oldDeps, newDeps) {
  const oldSet = new Set(oldDeps || []);
  const newSet = new Set(newDeps || []);
  const changes = [];

  for (const dep of newSet) {
    if (!oldSet.has(dep) && DEPENDENCY_MODULE_MAP[dep]) {
      changes.push({ name: dep, action: 'added', suggested_module: DEPENDENCY_MODULE_MAP[dep] });
    }
  }

  for (const dep of oldSet) {
    if (!newSet.has(dep) && DEPENDENCY_MODULE_MAP[dep]) {
      changes.push({ name: dep, action: 'removed', suggested_module: DEPENDENCY_MODULE_MAP[dep] });
    }
  }

  return changes;
}

/**
 * Builds the full drift report.
 * @param {Object} oldManifest — Current manifest
 * @param {Object} newAnalysis — New codebase analysis (same shape)
 * @returns {Object} Drift report
 */
function computeDrift(oldManifest, newAnalysis) {
  // Module diff
  const oldModules = new Set();
  const newModules = new Set();

  const oldActive = oldManifest?.modules?.active || {};
  const newActive = newAnalysis?.modules?.active || {};

  // Collect active modules
  for (const [, values] of Object.entries(oldActive)) {
    if (values === true) continue; // standalone-style flag
    if (Array.isArray(values)) values.forEach(v => oldModules.add(v));
    else if (typeof values === 'string') oldModules.add(values);
  }
  for (const [, values] of Object.entries(newActive)) {
    if (values === true) continue;
    if (Array.isArray(values)) values.forEach(v => newModules.add(v));
    else if (typeof values === 'string') newModules.add(values);
  }

  // Standalone modules
  (oldManifest?.modules?.standalone || []).forEach(m => oldModules.add(m));
  (newAnalysis?.modules?.standalone || []).forEach(m => newModules.add(m));

  const moduleDiff = diffModules(oldModules, newModules);

  // Subproject diff
  const subprojectDiff = diffSubprojects(
    oldManifest?.subprojects,
    newAnalysis?.subprojects,
  );

  // Dependency diff
  const depDiff = diffDependencies(
    oldManifest?.dependencies,
    newAnalysis?.dependencies,
  );

  // Summary
  const hasChanges = moduleDiff.added.length > 0 || moduleDiff.removed.length > 0 ||
    subprojectDiff.added.length > 0 || subprojectDiff.removed.length > 0 || subprojectDiff.changed.length > 0 ||
    depDiff.length > 0;

  return {
    has_changes: hasChanges,
    modules: moduleDiff,
    subprojects: subprojectDiff,
    dependency_changes: depDiff,
  };
}

module.exports = {
  diffModules,
  diffSubprojects,
  diffDependencies,
  computeDrift,
  DEPENDENCY_MODULE_MAP,
};

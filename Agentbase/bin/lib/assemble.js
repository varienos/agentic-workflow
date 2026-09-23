'use strict';

/**
 * assemble.js — detection + interview answers → manifest object
 *
 * Pure function: no side effects, deterministic. init.js calls it, checks the
 * result with manifest.schema.js, and writes YAML.
 *
 * Input:
 *   detection : detect() result
 *   answers   : { <question.key>: <value> }  (interview.js result)
 *   opts      : { projectName, targets, generatedAt, templateVersion }
 *
 * Output: manifest object (aligned with bootstrap.md STEP 4)
 */

const { QUESTIONS } = require('../../templates/interview/questions');

/** Writes a nested value by dot path (a.b.c). */
function setPath(obj, dotPath, value) {
  const keys = dotPath.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

/** Shortcut for detected.<field>.value. */
function dv(detection, field) {
  const d = detection.detected && detection.detected[field];
  return d ? d.value : null;
}

function primaryLabel(detection) {
  const r = detection.runtime;
  if (!r) return 'unknown';
  const map = { node: detection.typescript ? 'Node.js + TypeScript' : 'Node.js', python: 'Python', php: 'PHP', go: 'Go', rust: 'Rust', java: 'Java' };
  return map[r] || r;
}

function projectLanguage(detection) {
  if (detection.runtime === 'node') return detection.typescript ? 'TypeScript' : 'JavaScript';
  const map = { python: 'Python', php: 'PHP', go: 'Go', rust: 'Rust', java: 'Java' };
  return map[detection.runtime] || 'unknown';
}

/** Derives modules.active from detected values (for generate.js module selection). */
function deriveModules(detection) {
  // graphify is optional. It is not activated and not installed unless a
  // manifest author adds knowledge-graph/graphify explicitly.
  const active = {};
  const orm = dv(detection, 'orm');
  if (orm) active.orm = orm;
  const standalone = [];
  if (detection.projectType === 'monorepo') standalone.push('monorepo');
  return { active, standalone, skipped: {} };
}

/**
 * @returns {object} manifest
 */
function assemble(detection, answers, opts = {}) {
  const a = answers || {};
  const manifest = {};

  // --- meta ---
  manifest.version = '1.0.0';
  manifest.template_version = opts.templateVersion || '1.1.0';
  manifest.generated_at = opts.generatedAt || null;
  manifest.generation_mode = 'fresh';

  // init stitch signal — bootstrap.md STEP 1.3 switches to the SLIM PATH when it sees this:
  // detect + interview + manifest + generate.js already ran; only the
  // CLAUDE_FILL narrative remains.
  manifest.init = {
    produced_by: 'init-cli',
    generated_at: opts.generatedAt || null,
    narrative_pending: true,
  };

  // --- project ---
  manifest.project = {
    name: opts.projectName || 'project',
    description: a.description || '',
    type: a.type || detection.projectType || 'single',
    language: projectLanguage(detection),
    team_size: a.team_size || 'solo',
    security_level: a.security_level || 'standard',
    api_prefix: a.api_prefix || null,
    structure: '../Codebase',
  };
  if (manifest.project.type === 'monorepo' && Array.isArray(detection.subprojects)) {
    manifest.project.subprojects = detection.subprojects.map((sp) => ({
      name: sp.name, path: sp.path, role: null, stack: null,
    }));
  }
  const architectureNotes = a.extra_architecture_notes || a.architecture_notes;
  if (architectureNotes) manifest.project.architecture_notes = architectureNotes;

  // --- detected (TASK-207 semasi, oldugu gibi tasinir) ---
  manifest.detected = detection.detected || {};

  // --- stack ---
  manifest.stack = {
    primary: primaryLabel(detection),
    runtime: detection.runtime,
    runtime_version: detection.runtimeVersion || null,
    package_manager: detection.packageManager || null,
    typescript: !!detection.typescript,
    test_framework: a.test_framework || dv(detection, 'test_framework'),
    formatter: dv(detection, 'formatter'),
    linter: dv(detection, 'linter'),
    orm: dv(detection, 'orm'),
    database: detection.database || null,
    auth_method: dv(detection, 'auth_method') || 'none',
    file_extensions: detection.fileExtensions || [],
  };

  // --- modules ---
  manifest.modules = deriveModules(detection);

  // --- workflows ---
  manifest.workflows = {
    branch_model: a.branch_model || 'feature-pr',
    commit_convention: a.commit_convention || 'conventional',
    auto_format_hook: a.auto_format_hook != null ? a.auto_format_hook : true,
    migration_strategy: dv(detection, 'migration') || 'none',
    test_strategy: manifest.stack.test_framework ? 'tests-exist' : 'minimal',
    ci_pipeline: ['github-actions', 'gitlab-ci'].includes(dv(detection, 'deploy_platform')) ? dv(detection, 'deploy_platform') : null,
  };

  // --- conventions ---
  manifest.conventions = {
    naming: a.naming || 'camelCase',
    commit_language: 'en',
    commit_format: manifest.workflows.commit_convention,
  };

  // --- developer ---
  manifest.developer = {
    experience: a.experience || 'mid',
    autonomy: a.autonomy || 'plan-then-auto',
    communication_language: 'en',
  };

  // --- targets ---
  manifest.targets = Array.isArray(opts.targets) && opts.targets.length ? opts.targets : ['claude'];

  // --- environments ---
  manifest.environments = [{ name: 'local', api_url: null }];
  const prodUrl = a['environments.production.url'] || a.production_url;
  if (prodUrl) {
    manifest.environments.push({
      name: 'production',
      api_url: prodUrl,
      deploy_platform: dv(detection, 'deploy_platform') || null,
    });
  }

  // --- rules ---
  manifest.rules = {
    db_migration_required: !!(dv(detection, 'orm')),
    forbidden: [],
    domain: [],
    design_system: a.design_system || dv(detection, 'design_system') || 'none',
  };

  return manifest;
}

module.exports = { assemble, setPath, QUESTIONS };

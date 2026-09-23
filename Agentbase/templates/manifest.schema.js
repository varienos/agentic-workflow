'use strict';

/**
 * manifest.schema.js — project-manifest.yaml contract
 *
 * Hand-written JS validator. Instead of JSON Schema + ajv: the project only
 * depends on js-yaml; no new validation dependency is added (minimal-deps).
 *
 * Used by both sides:
 *   - bin/init.js   : validate BEFORE writing the manifest (fail-loud)
 *   - bootstrap.md  : validate BEFORE reading the manifest (legacy/warn if invalid)
 *
 * Usage:
 *   const { validateManifest } = require('./templates/manifest.schema');
 *   const { valid, errors, warnings } = validateManifest(manifestObj);
 *
 * Return: { valid: boolean, errors: string[], warnings: string[] }
 *   - errors   : manifest is invalid; production MUST STOP (fail-loud).
 *   - warnings : manifest is valid but has points that need attention.
 */

// --- Allowed value sets (aligned with bootstrap.md STEP 4 manifest template) ---

const ENUMS = {
  projectType: ['single', 'monorepo'],
  teamSize: ['solo', 'small-team', 'large-team'],
  securityLevel: ['standard', 'high', 'critical'],
  runtime: ['node', 'python', 'go', 'rust', 'php', 'java'],
  confidence: ['high', 'medium', 'low'],
  target: ['claude', 'gemini', 'antigravity', 'codex', 'kimi', 'opencode'],
  branchModel: ['direct-push', 'feature-pr', 'gitflow', 'trunk'],
  commitConvention: ['conventional', 'free', 'custom'],
  autonomy: ['ask-every-step', 'plan-then-auto', 'full-auto'],
  experience: ['junior', 'mid', 'senior', 'new-to-stack'],
};

// Expected fields on detected.* blocks (TASK-207 schema).
const DETECTED_FIELDS = [
  'test_framework', 'formatter', 'linter', 'orm', 'migration',
  'auth_method', 'design_system', 'deploy_platform', 'commit_convention',
];

// --- Helpers ---

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/** Is this a leftover placeholder? ("[...]" or "{{...}}" or empty). */
function isPlaceholder(v) {
  if (!isNonEmptyString(v)) return true;
  const s = v.trim();
  return /^\[.*\]$/.test(s) || /\{\{.*\}\}/.test(s);
}

// --- Main validator ---

/**
 * @param {object} manifest - Manifest object parsed with js-yaml.
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateManifest(manifest) {
  const errors = [];
  const warnings = [];

  const err = (msg) => errors.push(msg);
  const warn = (msg) => warnings.push(msg);

  if (!isObject(manifest)) {
    return { valid: false, errors: ['manifest is not an object (could not parse or empty).'], warnings };
  }

  // --- version ---
  if (!isNonEmptyString(manifest.version)) {
    warn('manifest.version missing — version compatibility cannot be checked.');
  } else if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
    warn(`manifest.version is not semver format: "${manifest.version}".`);
  }

  // --- project (required) ---
  const project = manifest.project;
  if (!isObject(project)) {
    err('manifest.project missing or not an object.');
  } else {
    if (!isNonEmptyString(project.name) || isPlaceholder(project.name)) {
      err('manifest.project.name missing or placeholder.');
    }
    if (!ENUMS.projectType.includes(project.type)) {
      err(`manifest.project.type invalid: "${project.type}" (expected: ${ENUMS.projectType.join('|')}).`);
    }
    if (!isNonEmptyString(project.language) || isPlaceholder(project.language)) {
      warn('manifest.project.language missing or placeholder.');
    }
    if (project.team_size != null && !ENUMS.teamSize.includes(project.team_size)) {
      warn(`manifest.project.team_size unrecognized: "${project.team_size}".`);
    }
    if (project.security_level != null && !ENUMS.securityLevel.includes(project.security_level)) {
      warn(`manifest.project.security_level unrecognized: "${project.security_level}".`);
    }

    // For monorepo, subprojects is required and must be non-empty.
    if (project.type === 'monorepo') {
      if (!Array.isArray(project.subprojects) || project.subprojects.length === 0) {
        err('manifest.project.type is "monorepo" but project.subprojects is empty or missing.');
      } else {
        project.subprojects.forEach((sp, i) => {
          if (!isObject(sp)) { err(`subprojects[${i}] is not an object.`); return; }
          if (!isNonEmptyString(sp.name) || isPlaceholder(sp.name)) err(`subprojects[${i}].name missing/placeholder.`);
          if (!isNonEmptyString(sp.path) || isPlaceholder(sp.path)) err(`subprojects[${i}].path missing/placeholder.`);
        });
      }
    }
  }

  // --- stack (required) ---
  const stack = manifest.stack;
  if (!isObject(stack)) {
    err('manifest.stack missing or not an object.');
  } else {
    // runtime is critical for generate.js and hook production.
    if (!ENUMS.runtime.includes(stack.runtime)) {
      // Older/minimal manifests coming via test_commands/primary may not carry runtime.
      if (stack.runtime == null) {
        warn('manifest.stack.runtime missing — generate.js may fall back to some defaults.');
      } else {
        err(`manifest.stack.runtime invalid: "${stack.runtime}" (expected: ${ENUMS.runtime.join('|')}).`);
      }
    }
    if (stack.file_extensions != null && !Array.isArray(stack.file_extensions)) {
      err('manifest.stack.file_extensions must be an array.');
    }
  }

  // --- targets ---
  if (manifest.targets != null) {
    if (!Array.isArray(manifest.targets) || manifest.targets.length === 0) {
      err('manifest.targets must not be empty (at least ["claude"]).');
    } else {
      const unknown = manifest.targets.filter((t) => !ENUMS.target.includes(t));
      if (unknown.length) warn(`manifest.targets unrecognized target(s): ${unknown.join(', ')}.`);
      if (!manifest.targets.includes('claude')) {
        warn('manifest.targets does not include "claude" — claude is the canonical source; the transform chain may break.');
      }
    }
  } else {
    warn('manifest.targets missing — default ["claude"] is assumed.');
  }

  // --- detected.* (if present, TASK-207 schema) ---
  if (manifest.detected != null) {
    if (!isObject(manifest.detected)) {
      err('manifest.detected must be an object.');
    } else {
      for (const field of DETECTED_FIELDS) {
        const d = manifest.detected[field];
        if (d == null) continue; // detected fields are optional (empty in greenfield)
        if (!isObject(d)) { err(`manifest.detected.${field} must be a { value, confidence, source } object.`); continue; }
        if (!('value' in d)) err(`manifest.detected.${field}.value missing.`);
        if (!ENUMS.confidence.includes(d.confidence)) {
          err(`manifest.detected.${field}.confidence invalid: "${d.confidence}" (expected: ${ENUMS.confidence.join('|')}).`);
        }
      }
    }
  }

  // --- workflows (if present) ---
  const wf = manifest.workflows;
  if (wf != null) {
    if (!isObject(wf)) {
      err('manifest.workflows must be an object.');
    } else {
      if (wf.branch_model != null && !ENUMS.branchModel.includes(wf.branch_model)) {
        warn(`manifest.workflows.branch_model unrecognized: "${wf.branch_model}".`);
      }
      if (wf.commit_convention != null && !ENUMS.commitConvention.includes(wf.commit_convention)) {
        warn(`manifest.workflows.commit_convention unrecognized: "${wf.commit_convention}".`);
      }
    }
  }

  // --- developer (if present) ---
  const dev = manifest.developer;
  if (dev != null && isObject(dev)) {
    if (dev.autonomy != null && !ENUMS.autonomy.includes(dev.autonomy)) {
      warn(`manifest.developer.autonomy unrecognized: "${dev.autonomy}".`);
    }
    if (dev.experience != null && !ENUMS.experience.includes(dev.experience)) {
      warn(`manifest.developer.experience unrecognized: "${dev.experience}".`);
    }
  }

  // --- rules.forbidden (if present) ---
  if (manifest.rules != null && isObject(manifest.rules) && manifest.rules.forbidden != null) {
    if (!Array.isArray(manifest.rules.forbidden)) {
      err('manifest.rules.forbidden must be an array.');
    } else {
      manifest.rules.forbidden.forEach((f, i) => {
        if (!isObject(f) || !isNonEmptyString(f.command)) err(`rules.forbidden[${i}].command missing.`);
      });
    }
  }

  // --- environments (if present) ---
  if (manifest.environments != null) {
    if (!Array.isArray(manifest.environments)) {
      err('manifest.environments must be an array.');
    } else {
      manifest.environments.forEach((e, i) => {
        if (!isObject(e) || !isNonEmptyString(e.name)) err(`environments[${i}].name missing.`);
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

module.exports = { validateManifest, ENUMS, DETECTED_FIELDS, isPlaceholder };

'use strict';

/**
 * manifest.schema.js — project-manifest.yaml sozlesmesi (Contract)
 *
 * Elle yazilmis JS validator. JSON Schema + ajv yerine: proje yalnizca
 * js-yaml'a baglidir, yeni validation bagimliligi eklenmez (minimal-deps).
 *
 * Iki taraf da kullanir:
 *   - bin/init.js   : manifest YAZMADAN once validate (fail-loud)
 *   - bootstrap.md  : manifest OKUMADAN once validate (gecersizse legacy/uyari)
 *
 * Kullanim:
 *   const { validateManifest } = require('./templates/manifest.schema');
 *   const { valid, errors, warnings } = validateManifest(manifestObj);
 *
 * Donus: { valid: boolean, errors: string[], warnings: string[] }
 *   - errors   : manifest gecersiz; uretim DURMALI (fail-loud).
 *   - warnings : manifest gecerli ama dikkat gerektiren noktalar.
 */

// --- Izinli deger kumeleri (bootstrap.md ADIM 4 manifest sablonuyla hizali) ---

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

// detected.* bloklarinin beklenen alanlari (TASK-207 semasi).
const DETECTED_FIELDS = [
  'test_framework', 'formatter', 'linter', 'orm', 'migration',
  'auth_method', 'design_system', 'deploy_platform', 'commit_convention',
];

// --- Yardimcilar ---

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/** Placeholder kalintisi mi? ("[...]" veya "{{...}}" veya bos). */
function isPlaceholder(v) {
  if (!isNonEmptyString(v)) return true;
  const s = v.trim();
  return /^\[.*\]$/.test(s) || /\{\{.*\}\}/.test(s);
}

// --- Ana validator ---

/**
 * @param {object} manifest - js-yaml ile parse edilmis manifest objesi.
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateManifest(manifest) {
  const errors = [];
  const warnings = [];

  const err = (msg) => errors.push(msg);
  const warn = (msg) => warnings.push(msg);

  if (!isObject(manifest)) {
    return { valid: false, errors: ['manifest bir obje değil (parse edilemedi veya boş).'], warnings };
  }

  // --- version ---
  if (!isNonEmptyString(manifest.version)) {
    warn('manifest.version eksik — sürüm uyumluluğu kontrol edilemez.');
  } else if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
    warn(`manifest.version semver formatında değil: "${manifest.version}".`);
  }

  // --- project (zorunlu) ---
  const project = manifest.project;
  if (!isObject(project)) {
    err('manifest.project eksik veya obje değil.');
  } else {
    if (!isNonEmptyString(project.name) || isPlaceholder(project.name)) {
      err('manifest.project.name eksik veya placeholder.');
    }
    if (!ENUMS.projectType.includes(project.type)) {
      err(`manifest.project.type geçersiz: "${project.type}" (beklenen: ${ENUMS.projectType.join('|')}).`);
    }
    if (!isNonEmptyString(project.language) || isPlaceholder(project.language)) {
      warn('manifest.project.language eksik veya placeholder.');
    }
    if (project.team_size != null && !ENUMS.teamSize.includes(project.team_size)) {
      warn(`manifest.project.team_size tanınmıyor: "${project.team_size}".`);
    }
    if (project.security_level != null && !ENUMS.securityLevel.includes(project.security_level)) {
      warn(`manifest.project.security_level tanınmıyor: "${project.security_level}".`);
    }

    // Monorepo ise subprojects zorunlu ve dolu olmali.
    if (project.type === 'monorepo') {
      if (!Array.isArray(project.subprojects) || project.subprojects.length === 0) {
        err('manifest.project.type "monorepo" ama project.subprojects boş veya yok.');
      } else {
        project.subprojects.forEach((sp, i) => {
          if (!isObject(sp)) { err(`subprojects[${i}] obje değil.`); return; }
          if (!isNonEmptyString(sp.name) || isPlaceholder(sp.name)) err(`subprojects[${i}].name eksik/placeholder.`);
          if (!isNonEmptyString(sp.path) || isPlaceholder(sp.path)) err(`subprojects[${i}].path eksik/placeholder.`);
        });
      }
    }
  }

  // --- stack (zorunlu) ---
  const stack = manifest.stack;
  if (!isObject(stack)) {
    err('manifest.stack eksik veya obje değil.');
  } else {
    // runtime generate.js ve hook uretimi icin kritik.
    if (!ENUMS.runtime.includes(stack.runtime)) {
      // test_commands/primary ile gelen eski/minimal manifestler runtime tasimayabilir.
      if (stack.runtime == null) {
        warn('manifest.stack.runtime eksik — generate.js bazı varsayılanlara düşebilir.');
      } else {
        err(`manifest.stack.runtime geçersiz: "${stack.runtime}" (beklenen: ${ENUMS.runtime.join('|')}).`);
      }
    }
    if (stack.file_extensions != null && !Array.isArray(stack.file_extensions)) {
      err('manifest.stack.file_extensions bir dizi olmalı.');
    }
  }

  // --- targets ---
  if (manifest.targets != null) {
    if (!Array.isArray(manifest.targets) || manifest.targets.length === 0) {
      err('manifest.targets boş olmamalı (en az ["claude"]).');
    } else {
      const unknown = manifest.targets.filter((t) => !ENUMS.target.includes(t));
      if (unknown.length) warn(`manifest.targets tanınmayan hedef(ler): ${unknown.join(', ')}.`);
      if (!manifest.targets.includes('claude')) {
        warn('manifest.targets "claude" içermiyor — claude canonical kaynaktır; transform zinciri bozulabilir.');
      }
    }
  } else {
    warn('manifest.targets eksik — varsayılan ["claude"] kabul edilir.');
  }

  // --- detected.* (varsa TASK-207 semasi) ---
  if (manifest.detected != null) {
    if (!isObject(manifest.detected)) {
      err('manifest.detected obje olmalı.');
    } else {
      for (const field of DETECTED_FIELDS) {
        const d = manifest.detected[field];
        if (d == null) continue; // detected alanlari opsiyonel (greenfield'da bos)
        if (!isObject(d)) { err(`manifest.detected.${field} { value, confidence, source } objesi olmalı.`); continue; }
        if (!('value' in d)) err(`manifest.detected.${field}.value eksik.`);
        if (!ENUMS.confidence.includes(d.confidence)) {
          err(`manifest.detected.${field}.confidence geçersiz: "${d.confidence}" (beklenen: ${ENUMS.confidence.join('|')}).`);
        }
      }
    }
  }

  // --- workflows (varsa) ---
  const wf = manifest.workflows;
  if (wf != null) {
    if (!isObject(wf)) {
      err('manifest.workflows obje olmalı.');
    } else {
      if (wf.branch_model != null && !ENUMS.branchModel.includes(wf.branch_model)) {
        warn(`manifest.workflows.branch_model tanınmıyor: "${wf.branch_model}".`);
      }
      if (wf.commit_convention != null && !ENUMS.commitConvention.includes(wf.commit_convention)) {
        warn(`manifest.workflows.commit_convention tanınmıyor: "${wf.commit_convention}".`);
      }
    }
  }

  // --- developer (varsa) ---
  const dev = manifest.developer;
  if (dev != null && isObject(dev)) {
    if (dev.autonomy != null && !ENUMS.autonomy.includes(dev.autonomy)) {
      warn(`manifest.developer.autonomy tanınmıyor: "${dev.autonomy}".`);
    }
    if (dev.experience != null && !ENUMS.experience.includes(dev.experience)) {
      warn(`manifest.developer.experience tanınmıyor: "${dev.experience}".`);
    }
  }

  // --- rules.forbidden (varsa) ---
  if (manifest.rules != null && isObject(manifest.rules) && manifest.rules.forbidden != null) {
    if (!Array.isArray(manifest.rules.forbidden)) {
      err('manifest.rules.forbidden bir dizi olmalı.');
    } else {
      manifest.rules.forbidden.forEach((f, i) => {
        if (!isObject(f) || !isNonEmptyString(f.command)) err(`rules.forbidden[${i}].command eksik.`);
      });
    }
  }

  // --- environments (varsa) ---
  if (manifest.environments != null) {
    if (!Array.isArray(manifest.environments)) {
      err('manifest.environments bir dizi olmalı.');
    } else {
      manifest.environments.forEach((e, i) => {
        if (!isObject(e) || !isNonEmptyString(e.name)) err(`environments[${i}].name eksik.`);
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

module.exports = { validateManifest, ENUMS, DETECTED_FIELDS, isPlaceholder };

'use strict';

/**
 * questions.js — SINGLE SOURCE OF TRUTH for interview questions
 *
 * Consumed by bin/init.js (CLI flow). phase-*.md files are
 * derived/rendered from this (documentation). Questions live in one place;
 * no drift between bootstrap.md + phase-*.md + CLI (TASK-185).
 *
 * Question object schema:
 *   {
 *     key:        unique key,
 *     phase:      1..4 (phase number — documentation grouping),
 *     prompt:     question text shown to the user (EN),
 *     type:       'text' | 'select' | 'confirm',
 *     options:    [{ value, label }]   (type === 'select')
 *     default:    static default (optional),
 *     detectKey:  dotted path that pulls a default from detection (optional),
 *                 e.g. 'detected.test_framework.value' or 'projectType',
 *     optional:   if true, empty text is allowed,
 *     mapTo:      dotted path in the manifest where the answer is written,
 *     source:     'ask' | 'confirm-detected'  (UX hint),
 *   }
 *
 * mapTo dotted paths are written onto the manifest object by assemble.js.
 */

const QUESTIONS = [
  // --- PHASE 1: Project Foundations ---
  {
    key: 'description', phase: 1, type: 'text', source: 'ask',
    prompt: 'Describe the project in one sentence (what does it do?):',
    mapTo: 'project.description',
  },
  {
    key: 'type', phase: 1, type: 'select', source: 'confirm-detected',
    prompt: 'Project structure:',
    options: [
      { value: 'single', label: 'Single project' },
      { value: 'monorepo', label: 'Monorepo (multiple subprojects)' },
    ],
    detectKey: 'projectType', default: 'single',
    mapTo: 'project.type',
  },
  {
    key: 'api_prefix', phase: 1, type: 'text', source: 'ask', optional: true,
    prompt: 'API prefix (leave blank if none):',
    default: '/api',
    mapTo: 'project.api_prefix',
  },
  {
    key: 'production_url', phase: 1, type: 'text', source: 'ask', optional: true,
    prompt: 'Production URL (leave blank if none):',
    mapTo: 'environments.production.url',
  },

  // --- PHASE 2: Technical Preferences ---
  {
    key: 'test_framework', phase: 2, type: 'text', source: 'confirm-detected', optional: true,
    prompt: 'Test framework:',
    detectKey: 'detected.test_framework.value',
    mapTo: 'stack.test_framework',
  },
  {
    key: 'branch_model', phase: 2, type: 'select', source: 'ask',
    prompt: 'Branch model:',
    options: [
      { value: 'feature-pr', label: 'Feature branch + PR' },
      { value: 'direct-push', label: 'Direct push to main' },
      { value: 'gitflow', label: 'Gitflow' },
      { value: 'trunk', label: 'Trunk-based' },
    ],
    default: 'feature-pr',
    mapTo: 'workflows.branch_model',
  },
  {
    key: 'commit_convention', phase: 2, type: 'select', source: 'ask',
    prompt: 'Commit convention:',
    options: [
      { value: 'conventional', label: 'Conventional Commits (feat/fix/...)' },
      { value: 'free', label: 'Free-form' },
      { value: 'custom', label: 'Custom' },
    ],
    default: 'conventional',
    mapTo: 'workflows.commit_convention',
  },
  {
    key: 'auto_format_hook', phase: 2, type: 'confirm', source: 'ask',
    prompt: 'Add an auto-format hook before commit?',
    default: true,
    mapTo: 'workflows.auto_format_hook',
  },
  {
    key: 'naming', phase: 2, type: 'select', source: 'ask',
    prompt: 'Variable/function naming:',
    options: [
      { value: 'camelCase', label: 'camelCase' },
      { value: 'snake_case', label: 'snake_case' },
      { value: 'PascalCase', label: 'PascalCase' },
    ],
    default: 'camelCase',
    mapTo: 'conventions.naming',
  },

  // --- PHASE 3: Developer Profile ---
  {
    key: 'experience', phase: 3, type: 'select', source: 'ask',
    prompt: 'Your experience level:',
    options: [
      { value: 'junior', label: 'Junior' },
      { value: 'mid', label: 'Mid' },
      { value: 'senior', label: 'Senior' },
      { value: 'new-to-stack', label: 'New to this stack' },
    ],
    default: 'mid',
    mapTo: 'developer.experience',
  },
  {
    key: 'communication_language', phase: 3, type: 'select', source: 'ask',
    prompt: 'Workflow language:',
    options: [
      { value: 'en', label: 'English' },
    ],
    default: 'en',
    mapTo: 'developer.communication_language',
  },
  {
    key: 'autonomy', phase: 3, type: 'select', source: 'ask',
    prompt: 'Agent autonomy level:',
    options: [
      { value: 'ask-every-step', label: 'Ask at every step' },
      { value: 'plan-then-auto', label: 'Plan, then autonomous' },
      { value: 'full-auto', label: 'Fully autonomous' },
    ],
    default: 'plan-then-auto',
    mapTo: 'developer.autonomy',
  },
  {
    key: 'team_size', phase: 3, type: 'select', source: 'ask',
    prompt: 'Team size:',
    options: [
      { value: 'solo', label: 'Solo' },
      { value: 'small-team', label: '2-4 people' },
      { value: 'large-team', label: '5+ people' },
    ],
    default: 'solo',
    mapTo: 'project.team_size',
  },

  // --- PHASE 4: Domain Rules ---
  {
    key: 'security_level', phase: 4, type: 'select', source: 'ask',
    prompt: 'Security priority:',
    options: [
      { value: 'standard', label: 'Standard' },
      { value: 'high', label: 'High' },
      { value: 'critical', label: 'Critical' },
    ],
    default: 'standard',
    mapTo: 'project.security_level',
  },
  {
    key: 'design_system', phase: 4, type: 'text', source: 'confirm-detected', optional: true,
    prompt: 'Design system / component library (leave blank if none):',
    detectKey: 'detected.design_system.value',
    mapTo: 'rules.design_system',
  },
  {
    key: 'extra_architecture_notes', phase: 4, type: 'text', source: 'ask', optional: true,
    prompt: 'Extra architecture rule/note for Opus (free text; leave blank if none):',
    mapTo: 'project.architecture_notes',
  },
];

/** Questions grouped by phase number (for documentation render). */
function byPhase() {
  const groups = {};
  for (const q of QUESTIONS) {
    (groups[q.phase] = groups[q.phase] || []).push(q);
  }
  return groups;
}

module.exports = { QUESTIONS, byPhase };

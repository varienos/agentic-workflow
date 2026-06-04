'use strict';

/**
 * questions.js — Roportaj sorularinin TEK KAYNAGI (single source of truth)
 *
 * bin/init.js (CLI akisi) bunu tuketir. phase-*.md dosyalari bundan
 * turetilir/render edilir (dokumantasyon). Boylece sorular tek noktada yasar;
 * bootstrap.md + phase-*.md + CLI arasinda drift olmaz (TASK-185).
 *
 * Soru objesi semasi:
 *   {
 *     key:        benzersiz anahtar,
 *     phase:      1..4 (faz numarasi — dokumantasyon gruplamasi),
 *     prompt:     kullaniciya gosterilen soru metni (TR, tam diakritik),
 *     type:       'text' | 'select' | 'confirm',
 *     options:    [{ value, label }]   (type === 'select')
 *     default:    statik varsayilan (opsiyonel),
 *     detectKey:  detection sonucundan varsayilan ceken nokta-yol (opsiyonel),
 *                 ornek: 'detected.test_framework.value' veya 'projectType',
 *     optional:   true ise bos gecilebilir (text),
 *     mapTo:      cevabin yazilacagi manifest nokta-yolu,
 *     source:     'ask' | 'confirm-detected'  (UX ipucu),
 *   }
 *
 * mapTo nokta-yollari assemble.js tarafindan manifest objesine yazilir.
 */

const QUESTIONS = [
  // --- FAZ 1: Proje Temelleri ---
  {
    key: 'description', phase: 1, type: 'text', source: 'ask',
    prompt: 'Projeyi bir cümleyle tanımla (ne yapar?):',
    mapTo: 'project.description',
  },
  {
    key: 'type', phase: 1, type: 'select', source: 'confirm-detected',
    prompt: 'Proje yapısı:',
    options: [
      { value: 'single', label: 'Tek proje' },
      { value: 'monorepo', label: 'Monorepo (çoklu alt proje)' },
    ],
    detectKey: 'projectType', default: 'single',
    mapTo: 'project.type',
  },
  {
    key: 'api_prefix', phase: 1, type: 'text', source: 'ask', optional: true,
    prompt: 'API prefix (yoksa boş bırak):',
    default: '/api',
    mapTo: 'project.api_prefix',
  },
  {
    key: 'production_url', phase: 1, type: 'text', source: 'ask', optional: true,
    prompt: 'Production URL (yoksa boş bırak):',
    mapTo: 'environments.production.url',
  },

  // --- FAZ 2: Teknik Tercihler ---
  {
    key: 'test_framework', phase: 2, type: 'text', source: 'confirm-detected', optional: true,
    prompt: 'Test framework:',
    detectKey: 'detected.test_framework.value',
    mapTo: 'stack.test_framework',
  },
  {
    key: 'branch_model', phase: 2, type: 'select', source: 'ask',
    prompt: 'Branch modeli:',
    options: [
      { value: 'feature-pr', label: 'Feature branch + PR' },
      { value: 'direct-push', label: 'main\'e doğrudan push' },
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
      { value: 'free', label: 'Serbest' },
      { value: 'custom', label: 'Özel' },
    ],
    default: 'conventional',
    mapTo: 'workflows.commit_convention',
  },
  {
    key: 'auto_format_hook', phase: 2, type: 'confirm', source: 'ask',
    prompt: 'Commit öncesi otomatik format hook\'u eklensin mi?',
    default: true,
    mapTo: 'workflows.auto_format_hook',
  },
  {
    key: 'naming', phase: 2, type: 'select', source: 'ask',
    prompt: 'Değişken/fonksiyon isimlendirme:',
    options: [
      { value: 'camelCase', label: 'camelCase' },
      { value: 'snake_case', label: 'snake_case' },
      { value: 'PascalCase', label: 'PascalCase' },
    ],
    default: 'camelCase',
    mapTo: 'conventions.naming',
  },

  // --- FAZ 3: Developer Profili ---
  {
    key: 'experience', phase: 3, type: 'select', source: 'ask',
    prompt: 'Deneyim seviyen:',
    options: [
      { value: 'junior', label: 'Junior' },
      { value: 'mid', label: 'Mid' },
      { value: 'senior', label: 'Senior' },
      { value: 'new-to-stack', label: 'Stack\'e yeni' },
    ],
    default: 'mid',
    mapTo: 'developer.experience',
  },
  {
    key: 'communication_language', phase: 3, type: 'select', source: 'ask',
    prompt: 'İletişim dili:',
    options: [
      { value: 'tr', label: 'Türkçe' },
      { value: 'en', label: 'English' },
    ],
    default: 'tr',
    mapTo: 'developer.communication_language',
  },
  {
    key: 'autonomy', phase: 3, type: 'select', source: 'ask',
    prompt: 'Ajan otonomi seviyesi:',
    options: [
      { value: 'ask-every-step', label: 'Her adımda sor' },
      { value: 'plan-then-auto', label: 'Planla, sonra otonom' },
      { value: 'full-auto', label: 'Tam otonom' },
    ],
    default: 'plan-then-auto',
    mapTo: 'developer.autonomy',
  },
  {
    key: 'team_size', phase: 3, type: 'select', source: 'ask',
    prompt: 'Takım büyüklüğü:',
    options: [
      { value: 'solo', label: 'Solo' },
      { value: 'small-team', label: '2-4 kişi' },
      { value: 'large-team', label: '5+ kişi' },
    ],
    default: 'solo',
    mapTo: 'project.team_size',
  },

  // --- FAZ 4: Domain Kurallari ---
  {
    key: 'security_level', phase: 4, type: 'select', source: 'ask',
    prompt: 'Güvenlik önceliği:',
    options: [
      { value: 'standard', label: 'Standart' },
      { value: 'high', label: 'Yüksek' },
      { value: 'critical', label: 'Kritik' },
    ],
    default: 'standard',
    mapTo: 'project.security_level',
  },
  {
    key: 'design_system', phase: 4, type: 'text', source: 'confirm-detected', optional: true,
    prompt: 'Design system / component kütüphanesi (yoksa boş bırak):',
    detectKey: 'detected.design_system.value',
    mapTo: 'rules.design_system',
  },
  {
    key: 'extra_architecture_notes', phase: 4, type: 'text', source: 'ask', optional: true,
    prompt: 'Opus\'a iletilecek ek mimari kural/not (serbest metin, yoksa boş bırak):',
    mapTo: 'project.architecture_notes',
  },
];

/** Faz numarasina gore gruplanmis sorular (dokumantasyon render'i icin). */
function byPhase() {
  const groups = {};
  for (const q of QUESTIONS) {
    (groups[q.phase] = groups[q.phase] || []).push(q);
  }
  return groups;
}

module.exports = { QUESTIONS, byPhase };

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateManifest, isPlaceholder } = require('../templates/manifest.schema');

/** Gecerli, dolu bir tek-proje manifesti (minimal ama schema-uyumlu). */
function validSingle() {
  return {
    version: '1.0.0',
    project: { name: 'demo-api', type: 'single', language: 'TypeScript', team_size: 'solo' },
    stack: { runtime: 'node', file_extensions: ['.ts', '.js'] },
    targets: ['claude'],
  };
}

test('gecerli tek-proje manifesti valid doner', () => {
  const { valid, errors } = validateManifest(validSingle());
  assert.equal(valid, true);
  assert.deepEqual(errors, []);
});

test('obje olmayan girdi invalid', () => {
  for (const bad of [null, undefined, 'x', 42, []]) {
    const { valid, errors } = validateManifest(bad);
    assert.equal(valid, false);
    assert.ok(errors.length >= 1);
  }
});

test('project eksikse error', () => {
  const m = validSingle();
  delete m.project;
  const { valid, errors } = validateManifest(m);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('manifest.project')));
});

test('project.type gecersizse error', () => {
  const m = validSingle();
  m.project.type = 'multi';
  const { valid, errors } = validateManifest(m);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('project.type')));
});

test('project.name placeholder ise error', () => {
  const m = validSingle();
  m.project.name = '[proje adi]';
  const { valid, errors } = validateManifest(m);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('project.name')));
});

test('monorepo ama subprojects bos ise error', () => {
  const m = validSingle();
  m.project.type = 'monorepo';
  m.project.subprojects = [];
  const { valid, errors } = validateManifest(m);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('subprojects')));
});

test('gecerli monorepo valid', () => {
  const m = validSingle();
  m.project.type = 'monorepo';
  m.project.subprojects = [
    { name: 'api', path: 'apps/api' },
    { name: 'web', path: 'apps/web' },
  ];
  const { valid } = validateManifest(m);
  assert.equal(valid, true);
});

test('stack.runtime gecersizse error, eksikse sadece warning', () => {
  const bad = validSingle();
  bad.stack.runtime = 'cobol';
  assert.equal(validateManifest(bad).valid, false);

  const missing = validSingle();
  delete missing.stack.runtime;
  const res = validateManifest(missing);
  assert.equal(res.valid, true);
  assert.ok(res.warnings.some((w) => w.includes('runtime')));
});

test('detected.confidence gecersizse error', () => {
  const m = validSingle();
  m.detected = {
    test_framework: { value: 'jest', confidence: 'cok-emin', source: 'package.json' },
  };
  const { valid, errors } = validateManifest(m);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('confidence')));
});

test('gecerli detected blogu valid', () => {
  const m = validSingle();
  m.detected = {
    test_framework: { value: 'vitest', confidence: 'high', source: 'package.json:devDependencies' },
    orm: { value: null, confidence: 'low', source: 'yok' },
  };
  assert.equal(validateManifest(m).valid, true);
});

test('targets claude icermezse valid ama warning', () => {
  const m = validSingle();
  m.targets = ['gemini'];
  const res = validateManifest(m);
  assert.equal(res.valid, true);
  assert.ok(res.warnings.some((w) => w.includes('claude')));
});

test('targets bos dizi ise error', () => {
  const m = validSingle();
  m.targets = [];
  assert.equal(validateManifest(m).valid, false);
});

test('rules.forbidden ogesinde command eksikse error', () => {
  const m = validSingle();
  m.rules = { forbidden: [{ reason: 'tehlikeli' }] };
  const { valid, errors } = validateManifest(m);
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('forbidden')));
});

test('isPlaceholder helper', () => {
  assert.equal(isPlaceholder('[x]'), true);
  assert.equal(isPlaceholder('{{x}}'), true);
  assert.equal(isPlaceholder(''), true);
  assert.equal(isPlaceholder(null), true);
  assert.equal(isPlaceholder('gercek-deger'), false);
});

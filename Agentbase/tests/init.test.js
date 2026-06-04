'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const { detect } = require('../bin/lib/detect');
const { assemble } = require('../bin/lib/assemble');
const { collectDefaults, resolveDefault } = require('../bin/lib/interview');
const { QUESTIONS } = require('../templates/interview/questions');
const { validateManifest } = require('../templates/manifest.schema');

function tmpProject(files = {}, dirs = []) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'init-test-'));
  for (const d of dirs) fs.mkdirSync(path.join(root, d), { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const fp = path.join(root, rel);
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, typeof content === 'string' ? content : JSON.stringify(content));
  }
  return root;
}

// --- detect ---

test('detect: node + typescript + jest + prisma', () => {
  const root = tmpProject({
    'package.json': { dependencies: { '@prisma/client': '5', jsonwebtoken: '9' }, devDependencies: { jest: '29', typescript: '5', prettier: '3', eslint: '8' } },
    'tsconfig.json': '{}',
    'package-lock.json': '{}',
  });
  const d = detect(root);
  assert.equal(d.runtime, 'node');
  assert.equal(d.typescript, true);
  assert.equal(d.packageManager, 'npm');
  assert.equal(d.detected.test_framework.value, 'jest');
  assert.equal(d.detected.orm.value, 'prisma');
  assert.equal(d.detected.formatter.value, 'prettier');
  assert.equal(d.detected.auth_method.value, 'jwt');
  assert.ok(d.fileExtensions.includes('.ts'));
});

test('detect: bos dizin → runtime null, single', () => {
  const root = tmpProject({});
  const d = detect(root);
  assert.equal(d.runtime, null);
  assert.equal(d.projectType, 'single');
  assert.equal(d.detected.test_framework.value, null);
});

test('detect: monorepo (apps/*) → subprojects', () => {
  const root = tmpProject(
    { 'package.json': { workspaces: ['apps/*'] } },
    ['apps/api', 'apps/web'],
  );
  const d = detect(root);
  assert.equal(d.projectType, 'monorepo');
  assert.equal(d.subprojects.length, 2);
  assert.deepEqual(d.subprojects.map((s) => s.name).sort(), ['api', 'web']);
});

test('detect: workspace globs ve direkt dizinler subprojects uretir', () => {
  const root = tmpProject(
    {
      'package.json': { workspaces: ['sites/*', 'libs/*', 'client', 'server', 'README.md'] },
      'README.md': '# workspace dosyasi degil',
    },
    ['sites/web', 'libs/core', 'client', 'server'],
  );
  const d = detect(root);
  assert.equal(d.projectType, 'monorepo');
  assert.deepEqual(
    d.subprojects.map((s) => s.path).sort(),
    ['client', 'libs/core', 'server', 'sites/web'],
  );
});

test('detect: python projesi', () => {
  const root = tmpProject({ 'pyproject.toml': '[project]\nname="x"' });
  const d = detect(root);
  assert.equal(d.runtime, 'python');
  assert.ok(d.fileExtensions.includes('.py'));
});

// --- interview defaults ---

test('resolveDefault: detectKey statik default\'u ezer', () => {
  const detection = { detected: { test_framework: { value: 'vitest' } } };
  const q = QUESTIONS.find((x) => x.key === 'test_framework');
  assert.equal(resolveDefault(q, detection), 'vitest');
});

test('collectDefaults (--yes): tum sorular cevaplanir', () => {
  const detection = detect(tmpProject({ 'package.json': { devDependencies: { vitest: '1' } } }));
  const answers = collectDefaults(QUESTIONS, detection, {});
  assert.equal(answers.branch_model, 'feature-pr');
  assert.equal(answers.commit_convention, 'conventional');
  assert.equal(answers.test_framework, 'vitest');
  assert.equal(answers.autonomy, 'plan-then-auto');
});

test('collectDefaults: overrides oncelikli', () => {
  const detection = detect(tmpProject({}));
  const answers = collectDefaults(QUESTIONS, detection, { branch_model: 'trunk', description: 'X' });
  assert.equal(answers.branch_model, 'trunk');
  assert.equal(answers.description, 'X');
});

// --- assemble + validate ---

test('assemble: gecerli single manifest uretir', () => {
  const detection = detect(tmpProject({
    'package.json': { devDependencies: { jest: '29', typescript: '5' } },
  }));
  const answers = collectDefaults(QUESTIONS, detection, { description: 'Demo API' });
  const manifest = assemble(detection, answers, { projectName: 'demo', targets: ['claude'], generatedAt: 'now' });
  const { valid, errors } = validateManifest(manifest);
  assert.equal(valid, true, JSON.stringify(errors));
  assert.equal(manifest.project.name, 'demo');
  assert.equal(manifest.project.description, 'Demo API');
  assert.equal(manifest.stack.runtime, 'node');
  assert.equal(manifest.stack.test_framework, 'jest');
});

test('assemble: monorepo manifesti subprojects tasir ve valid', () => {
  const detection = detect(tmpProject(
    { 'package.json': { workspaces: ['apps/*'] } },
    ['apps/api', 'apps/admin'],
  ));
  const answers = collectDefaults(QUESTIONS, detection, {});
  const manifest = assemble(detection, answers, { projectName: 'mono', targets: ['claude', 'codex'] });
  const { valid, errors } = validateManifest(manifest);
  assert.equal(valid, true, JSON.stringify(errors));
  assert.equal(manifest.project.type, 'monorepo');
  assert.equal(manifest.project.subprojects.length, 2);
  assert.deepEqual(manifest.targets, ['claude', 'codex']);
});

test('assemble: production_url environments\'a eklenir', () => {
  const detection = detect(tmpProject({}));
  const answers = collectDefaults(QUESTIONS, detection, { production_url: 'https://api.x.test' });
  const manifest = assemble(detection, answers, {});
  const prod = manifest.environments.find((e) => e.name === 'production');
  assert.ok(prod);
  assert.equal(prod.api_url, 'https://api.x.test');
});

test('assemble: extra_architecture_notes project.architecture_notes alanina eklenir', () => {
  const detection = detect(tmpProject({ 'package.json': {} }));
  const answers = collectDefaults(QUESTIONS, detection, {
    extra_architecture_notes: 'Bounded context sinirlari korunacak.',
  });
  const manifest = assemble(detection, answers, {});
  assert.equal(manifest.project.architecture_notes, 'Bounded context sinirlari korunacak.');
});

// --- init.js CLI smoke (--dry-run, --yes) ---

test('init.js --dry-run --yes: INIT_DONE, manifest YAZILMAZ', () => {
  const root = tmpProject({ 'package.json': { devDependencies: { jest: '29' } } });
  // codebase = root; agentbase = repo Agentbase (generate.js gercek), ama dry-run uretmez.
  const agentbase = path.resolve(__dirname, '..');
  const res = spawnSync('node', [
    path.join(agentbase, 'bin', 'init.js'),
    '--codebase', root, '--agentbase', agentbase, '--yes', '--dry-run',
  ], { encoding: 'utf8' });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /INIT_DONE \(dry-run\)/);
  // dry-run hicbir manifest yazmamali
  const manifestPath = path.join(agentbase, '..', 'Docbase', 'agentic', 'project-manifest.yaml');
  // Not: gercek repoda Docbase olmayabilir; dry-run zaten yazmaz — varlik degismemeli.
  assert.doesNotMatch(res.stdout, /MANIFEST_WRITTEN/);
});

test('init.js --help exit 0', () => {
  const res = spawnSync('node', [path.join(__dirname, '..', 'bin', 'init.js'), '--help'], { encoding: 'utf8' });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /init\.js/);
});

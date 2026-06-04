'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SIMPLE_GENERATORS, fillBlocks } = require('../generate.js');

/** Faz 2 generator'larini besleyen zengin (bootstrap-benzeri) manifest. */
function richManifest() {
  return {
    project: {
      name: 'MyApp',
      description: 'E-ticaret B2C uygulaması.',
      type: 'monorepo',
      language: 'TypeScript',
      structure: '../Codebase',
      subprojects: [
        { name: 'api', path: 'apps/api', role: 'Backend REST API', stack: 'Node.js, Express, Prisma', test_command: 'npm test', dev_command: 'npm run dev', build_command: 'npm run build' },
        { name: 'web', path: 'apps/web', role: 'Frontend', stack: 'Vite, React' },
      ],
    },
    stack: {
      primary: 'Node.js + TypeScript', runtime: 'node', runtime_version: '18',
      package_manager: 'npm', typescript: true,
      test_framework: 'jest', formatter: 'prettier', linter: 'eslint',
      orm: 'prisma', database: 'postgres', auth_method: 'jwt',
      file_extensions: ['.ts', '.tsx', '.js'],
      detected: ['TypeScript', 'React', 'Prisma'],
    },
    workflows: { commit_convention: 'conventional' },
    conventions: { naming: 'camelCase', commit_language: 'tr', docblock: 'required' },
    developer: { experience: 'senior', communication_language: 'tr' },
    environments: [
      { name: 'local', api_url: 'localhost:3000' },
      { name: 'production', url: 'api.myapp.com', deploy_platform: 'coolify', deploy_trigger: 'main push' },
    ],
    rules: {
      domain: [{ name: 'API formatı', rule: 'Yanıtlar { status, data, message } olmalı' }, 'Kullanıcı verisi log\'a yazılmaz'],
      forbidden: [{ command: 'git push --force', reason: 'Takım geçmişini bozar', hook_type: 'pre-push' }],
    },
  };
}

test('PROJECT_DEFINITION: baslik + subproject tablosu', () => {
  const out = SIMPLE_GENERATORS.PROJECT_DEFINITION(richManifest(), 'md');
  assert.match(out, /## Proje Tanımı/);
  assert.match(out, /\*\*MyApp\*\*/);
  assert.match(out, /Monorepo/);
  assert.match(out, /\| api \|.*Backend REST API.*\|/);
  assert.match(out, /apps\/api/);
});

test('TECH_STACK: yalnizca dolu satirlari listeler', () => {
  const out = SIMPLE_GENERATORS.TECH_STACK(richManifest(), 'md');
  assert.match(out, /## Teknoloji Yığını/);
  assert.match(out, /\| Runtime \| node 18 \|/);
  assert.match(out, /\| ORM \| prisma \|/);
  assert.match(out, /\| Test \| jest \|/);
  // bos alan satiri uretmemeli
  const empty = SIMPLE_GENERATORS.TECH_STACK({ stack: {} }, 'md');
  assert.match(empty, /tanımlı değil/);
});

test('ENVIRONMENTS: ortam tablosu', () => {
  const out = SIMPLE_GENERATORS.ENVIRONMENTS(richManifest(), 'md');
  assert.match(out, /\| Local \| localhost:3000 \| — \|/);
  assert.match(out, /\| Production \| api\.myapp\.com \| coolify, main push \|/);
});

test('COMMANDS: subproject komut bloklari', () => {
  const out = SIMPLE_GENERATORS.COMMANDS(richManifest(), 'md');
  assert.match(out, /### api \(`\.\.\/Codebase\/apps\/api`/);
  assert.match(out, /cd \.\.\/Codebase\/apps\/api && npm test/);
  // komutu olmayan subproject icin pm default
  assert.match(out, /cd \.\.\/Codebase\/apps\/web && npm run build/);
});

test('COMMANDS: subproject yoksa tek blok (pm default)', () => {
  const out = SIMPLE_GENERATORS.COMMANDS({ project: {}, stack: { package_manager: 'pnpm' } }, 'md');
  assert.match(out, /pnpm test/);
});

test('CONVENTIONS: commit format + dil + domain', () => {
  const out = SIMPLE_GENERATORS.CONVENTIONS(richManifest(), 'md');
  assert.match(out, /Conventional Commits \(Türkçe\)/);
  assert.match(out, /`feat:/);
  assert.match(out, /### Domain Kuralları/);
  assert.match(out, /\*\*API formatı:\*\*/);
});

test('FORBIDDEN_OPERATIONS: tablo + bos durum notu', () => {
  const out = SIMPLE_GENERATORS.FORBIDDEN_OPERATIONS(richManifest(), 'md');
  assert.match(out, /\| `git push --force` \| Takım geçmişini bozar \| pre-push \|/);
  const empty = SIMPLE_GENERATORS.FORBIDDEN_OPERATIONS({ rules: { forbidden: [] } }, 'md');
  assert.match(empty, /yasaklı işlem yok/);
});

test('PROFESSIONAL_STANCE: deneyime gore metin', () => {
  assert.match(SIMPLE_GENERATORS.PROFESSIONAL_STANCE({ developer: { experience: 'senior' } }, 'md'), /Dalkavukluk yapma/);
  assert.match(SIMPLE_GENERATORS.PROFESSIONAL_STANCE({ developer: { experience: 'junior' } }, 'md'), /Adım adım/);
  // bilinmeyen → mid fallback
  assert.match(SIMPLE_GENERATORS.PROFESSIONAL_STANCE({}, 'md'), /pragmatik/);
});

test('CODEBASE_CONTEXT: basliksiz, stack + alt projeler', () => {
  const out = SIMPLE_GENERATORS.CODEBASE_CONTEXT(richManifest(), 'md');
  assert.doesNotMatch(out, /^#/m); // ust baslik yok (skeleton basliginin altina oturur)
  assert.match(out, /E-ticaret B2C/);
  assert.match(out, /\*\*Stack:\*\* Node\.js \+ TypeScript/);
  assert.match(out, /\*\*Alt projeler:\*\*/);
  assert.match(out, /apps\/api/);
  assert.match(out, /Kutsal Kurallar/);
});

test('PROJECT_CONVENTIONS: domain bullet + docblock', () => {
  const out = SIMPLE_GENERATORS.PROJECT_CONVENTIONS(richManifest(), 'md');
  assert.match(out, /- \*\*API formatı:\*\*/);
  assert.match(out, /docblock\/JSDoc/);
  assert.match(SIMPLE_GENERATORS.PROJECT_CONVENTIONS({}, 'md'), /tanımlı değil/);
});

test('marker azaltma: 9 blok artik CLAUDE_FILL degil, FILLED', () => {
  const blocks = ['CODEBASE_CONTEXT', 'PROJECT_DEFINITION', 'TECH_STACK', 'ENVIRONMENTS', 'COMMANDS', 'CONVENTIONS', 'FORBIDDEN_OPERATIONS', 'PROFESSIONAL_STANCE', 'PROJECT_CONVENTIONS'];
  const content = blocks.map((b) => `<!-- GENERATE: ${b}\nhint\n-->`).join('\n\n');
  const result = fillBlocks(content, 'md', richManifest());
  for (const b of blocks) {
    assert.ok(result.filled.includes(b), `${b} FILLED olmali`);
    assert.ok(!result.marked.includes(b), `${b} CLAUDE_FILL olmamali`);
  }
  assert.doesNotMatch(result.content, /CLAUDE_FILL/);
});

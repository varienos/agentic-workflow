'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { SIMPLE_GENERATORS, processSkeletonFile } = require('../generate.js');

const ROOT = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function listSkeletonFiles(relativeDir) {
  const absDir = path.join(ROOT, relativeDir);
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const nextRelative = path.posix.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSkeletonFiles(nextRelative));
      continue;
    }
    if (entry.name.includes('.skeleton')) {
      files.push(nextRelative);
    }
  }

  return files.sort();
}

const CORE_COMMAND_FILES = listSkeletonFiles('templates/core/commands');
const CORE_AGENT_FILES = listSkeletonFiles('templates/core/agents');
const MODULE_COMMAND_FILES = listSkeletonFiles('templates/modules').filter(relativePath => relativePath.includes('/commands/'));
const MODULE_AGENT_FILES = listSkeletonFiles('templates/modules').filter(relativePath => relativePath.includes('/agents/'));
const COMMAND_FILES = [...CORE_COMMAND_FILES, ...MODULE_COMMAND_FILES];
const AGENT_FILES = [...CORE_AGENT_FILES, ...MODULE_AGENT_FILES];
const CODEBASE_CONTEXT_FILES = listSkeletonFiles('templates').filter(relativePath => read(relativePath).includes('GENERATE: CODEBASE_CONTEXT'));

describe('kutsal kural regressions', () => {
  it('tum core ve modul command skeletonlari config yazma ve git sinirlarini tekrar eder', () => {
    for (const relativePath of COMMAND_FILES) {
      const content = read(relativePath);

      assert.match(content, /Codebase e config YAZMA/);
      assert.match(content, /Git sadece Codebase de/);
      assert.match(content, /Codebase OKUNUR, config YAZILMAZ/);
    }
  });

  it('tum core ve modul agent skeletonlari Calisma Siniri bolumu ile Codebase config yazimini yasaklar', () => {
    for (const relativePath of AGENT_FILES) {
      const content = read(relativePath);

      assert.match(content, /## Calisma Siniri/);
      assert.match(content, /Codebase icinde `\.claude\/` dizini OLUSTURAMAZ/);
      assert.match(content, /`CLAUDE\.md`, `\.mcp\.json`, `\.claude-ignore` YAZAMAZ/);
      assert.match(content, /Tum agent config dosyalari Agentbase\/\.claude\/ altinda yasar/);
    }
  });

  it('tum CODEBASE_CONTEXT blok ornekleri kutsal kural ozetini tasir', () => {
    for (const relativePath of CODEBASE_CONTEXT_FILES) {
      const content = read(relativePath);

      assert.match(content, /Kutsal Kurallar:/);
      assert.match(content, /Config dosyalari SADECE Agentbase icinde yasar/);
      assert.match(content, /Codebase icinde `?\.claude\/`? OLUSTURULMAZ/);
      assert.match(content, /Git sadece Codebase de calisir/);
    }
  });

  it('memorize ve service-documentation Agentbase merkezli yazma kurallarini belirtir', () => {
    const memorize = read('templates/core/commands/memorize.skeleton.md');
    const serviceDocs = read('templates/core/agents/service-documentation.skeleton.md');

    assert.match(memorize, /Agentbase \.claude\/memory\/ dizini icine yaz/);
    assert.match(memorize, /Codebase icine hafiza dosyasi YAZMA/);

    assert.match(serviceDocs, /Agentbase root altindaki dokumanlar/);
    assert.match(serviceDocs, /Codebase icinde yeni dokuman veya config dosyasi YAZMA/);
  });

  it('MEMORY_PATH generatoru Agentbase icindeki hafiza yolunu aciklar ve unsafe override lari reddeder', () => {
    const output = SIMPLE_GENERATORS.MEMORY_PATH({});
    const unsafeOutput = SIMPLE_GENERATORS.MEMORY_PATH({
      paths: { memory: '../Codebase/.claude/memory' },
      project: { memory_path: '../Codebase/.claude/memory' },
    });

    assert.match(output, /Agentbase \.claude\/memory\/ dizini/);
    assert.match(output, /Codebase icine hafiza dosyasi yazilmaz/);
    assert.doesNotMatch(unsafeOutput, /\.\.\/Codebase\/\.claude\/memory/);
    assert.match(unsafeOutput, /`\.claude\/memory`/);
  });

  it('api-smoke markdown skeleton i node smoke test blogunu da doldurur', () => {
    const manifest = {
      environments: [{ name: 'production', url: 'https://api.example.com', health_check: 'https://api.example.com/health' }],
      api_endpoints: [{ method: 'GET', path: '/v1/status', response: 200 }],
      project: { api_prefix: '/v1' },
    };
    const apiSmokePath = path.join(ROOT, 'templates/core/commands/api-smoke.skeleton.md');
    const { outputContent, filled } = processSkeletonFile(apiSmokePath, manifest);

    assert.ok(filled.includes('API_SMOKE_NODE_TESTS'));
    assert.match(outputContent, /describe\('API Smoke Tests'/);
    assert.doesNotMatch(outputContent, /GENERATE: API_SMOKE_NODE_TESTS/);
  });

  it('bootstrap talimatlari CODEBASE_CONTEXT ozetini doldurmayi soyler', () => {
    const bootstrap = read('.claude/commands/bootstrap.md');

    assert.match(bootstrap, /CODEBASE_CONTEXT/);
    assert.match(bootstrap, /Kutsal Kurallar:/);
    assert.match(bootstrap, /Config dosyalari SADECE Agentbase icinde yasar/);
    assert.match(bootstrap, /Codebase icinde \.claude\/ OLUSTURULMAZ/);
    assert.match(bootstrap, /Git sadece Codebase de calisir/);
    assert.match(bootstrap, /\.claude\/commands\/ \(15 core command dosyasi\)/);
    assert.match(bootstrap, /codex-verify\.skeleton\.md/);
    assert.match(bootstrap, /\.claude\/agents\/ \(7 core \+ uzman agent'lar\)/);
    assert.match(bootstrap, /api-smoke\.skeleton\.md/);
    assert.match(bootstrap, /service-documentation\.skeleton\.md/);
    assert.match(bootstrap, /docker-pre-deploy\.skeleton\.md/);
    assert.match(bootstrap, /idor-scan\.skeleton\.md/);
  });
});

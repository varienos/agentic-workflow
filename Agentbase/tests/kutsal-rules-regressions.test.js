'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { SIMPLE_GENERATORS } = require('../generate.js');

const ROOT = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

const COMMAND_FILES = [
  'templates/core/commands/task-hunter.skeleton.md',
  'templates/core/commands/task-master.skeleton.md',
  'templates/core/commands/task-conductor.skeleton.md',
  'templates/core/commands/task-plan.skeleton.md',
  'templates/core/commands/task-review.skeleton.md',
  'templates/core/commands/bug-hunter.skeleton.md',
  'templates/core/commands/bug-review.skeleton.md',
  'templates/core/commands/auto-review.skeleton.md',
  'templates/core/commands/deep-audit.skeleton.md',
  'templates/core/commands/memorize.skeleton.md',
  'templates/core/commands/deadcode.skeleton.md',
  'templates/core/commands/session-status.skeleton.md',
  'templates/modules/deploy/docker/commands/pre-deploy.skeleton.md',
  'templates/modules/deploy/docker/commands/post-deploy.skeleton.md',
  'templates/modules/deploy/coolify/commands/pre-deploy.skeleton.md',
  'templates/modules/deploy/coolify/commands/post-deploy.skeleton.md',
  'templates/modules/deploy/vercel/commands/pre-deploy.skeleton.md',
  'templates/modules/security/commands/idor-scan.skeleton.md',
  'templates/modules/monorepo/commands/review-module.skeleton.md',
];

const AGENT_FILES = [
  'templates/core/agents/code-review.skeleton.md',
  'templates/core/agents/regression-analyzer.skeleton.md',
  'templates/core/agents/backend-expert.skeleton.md',
  'templates/core/agents/mobile-expert.skeleton.md',
  'templates/core/agents/frontend-expert.skeleton.md',
  'templates/core/agents/service-documentation.skeleton.md',
  'templates/core/agents/devils-advocate.skeleton.md',
  'templates/modules/deploy/docker/agents/devops.skeleton.md',
  'templates/modules/deploy/coolify/agents/devops.skeleton.md',
  'templates/modules/deploy/vercel/agents/frontend.skeleton.md',
];

describe('kutsal kural regressions', () => {
  it('command skeletonlari config yazma ve git sinirlarini tekrar eder', () => {
    for (const relativePath of COMMAND_FILES) {
      const content = read(relativePath);

      assert.match(content, /Codebase e config YAZMA/);
      assert.match(content, /Git sadece Codebase de/);
      assert.match(content, /Codebase OKUNUR, config YAZILMAZ/);
    }
  });

  it('agent skeletonlari Calisma Siniri bolumu ile Codebase config yazimini yasaklar', () => {
    for (const relativePath of AGENT_FILES) {
      const content = read(relativePath);

      assert.match(content, /## Calisma Siniri/);
      assert.match(content, /Codebase icinde `\.claude\/` dizini OLUSTURAMAZ/);
      assert.match(content, /`CLAUDE\.md`, `\.mcp\.json`, `\.claude-ignore` YAZAMAZ/);
      assert.match(content, /Tum agent config dosyalari Agentbase\/\.claude\/ altinda yasar/);
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

  it('MEMORY_PATH generatoru Agentbase icindeki hafiza yolunu aciklar', () => {
    const output = SIMPLE_GENERATORS.MEMORY_PATH({});

    assert.match(output, /Agentbase \.claude\/memory\/ dizini/);
    assert.match(output, /Codebase icine hafiza dosyasi yazilmaz/);
  });

  it('bootstrap talimatlari CODEBASE_CONTEXT ozetini doldurmayi soyler', () => {
    const bootstrap = read('.claude/commands/bootstrap.md');

    assert.match(bootstrap, /CODEBASE_CONTEXT/);
    assert.match(bootstrap, /Kutsal Kurallar:/);
    assert.match(bootstrap, /Config dosyalari SADECE Agentbase icinde yasar/);
    assert.match(bootstrap, /Codebase icinde \.claude\/ OLUSTURULMAZ/);
    assert.match(bootstrap, /Git sadece Codebase de calisir/);
  });
});

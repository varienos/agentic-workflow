#!/usr/bin/env node
'use strict';

/**
 * codebase-guard.test.js — codebase-guard hook icin birim testler
 * Calistirma: node --test tests/codebase-guard.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const {
  isCodebaseConfigPath,
  CODEBASE_ROOT,
} = require('../templates/core/hooks/codebase-guard.js');

describe('codebase-guard: isCodebaseConfigPath', () => {
  // BLOKLANMASI GEREKEN YOLLAR

  it('Codebase/.claude/commands/task-master.md bloklaniyor', () => {
    assert.ok(isCodebaseConfigPath(path.join(CODEBASE_ROOT, '.claude/commands/task-master.md')));
  });

  it('Codebase/.claude/hooks/test.js bloklaniyor', () => {
    assert.ok(isCodebaseConfigPath(path.join(CODEBASE_ROOT, '.claude/hooks/test.js')));
  });

  it('Codebase/.claude/rules/workflow.md bloklaniyor', () => {
    assert.ok(isCodebaseConfigPath(path.join(CODEBASE_ROOT, '.claude/rules/workflow.md')));
  });

  it('Codebase/.claude/settings.json bloklaniyor', () => {
    assert.ok(isCodebaseConfigPath(path.join(CODEBASE_ROOT, '.claude/settings.json')));
  });

  it('Codebase/CLAUDE.md bloklaniyor', () => {
    assert.ok(isCodebaseConfigPath(path.join(CODEBASE_ROOT, 'CLAUDE.md')));
  });

  it('Codebase/.claude-ignore bloklaniyor', () => {
    assert.ok(isCodebaseConfigPath(path.join(CODEBASE_ROOT, '.claude-ignore')));
  });

  it('Codebase/.mcp.json bloklaniyor', () => {
    assert.ok(isCodebaseConfigPath(path.join(CODEBASE_ROOT, '.mcp.json')));
  });

  // SERBEST BIRAKILMASI GEREKEN YOLLAR

  it('Codebase/src/utils.js serbest', () => {
    assert.ok(!isCodebaseConfigPath(path.join(CODEBASE_ROOT, 'src/utils.js')));
  });

  it('Codebase/package.json serbest', () => {
    assert.ok(!isCodebaseConfigPath(path.join(CODEBASE_ROOT, 'package.json')));
  });

  it('Codebase/src/.claude-like-name.js serbest (tam esleme degil)', () => {
    assert.ok(!isCodebaseConfigPath(path.join(CODEBASE_ROOT, 'src/.claude-like-name.js')));
  });

  it('Agentbase/.claude/commands/task-master.md serbest', () => {
    const agentbasePath = path.resolve(CODEBASE_ROOT, '..', 'Agentbase', '.claude', 'commands', 'task-master.md');
    assert.ok(!isCodebaseConfigPath(agentbasePath));
  });

  it('tamamen farkli bir yol serbest', () => {
    assert.ok(!isCodebaseConfigPath('/usr/local/bin/something'));
  });

  // EDGE CASES

  it('bos string serbest', () => {
    assert.ok(!isCodebaseConfigPath(''));
  });

  it('null serbest', () => {
    assert.ok(!isCodebaseConfigPath(null));
  });

  it('undefined serbest', () => {
    assert.ok(!isCodebaseConfigPath(undefined));
  });

  it('Codebase/src/CLAUDE.md serbest (kok degil, alt dizin)', () => {
    assert.ok(!isCodebaseConfigPath(path.join(CODEBASE_ROOT, 'src/CLAUDE.md')));
  });
});

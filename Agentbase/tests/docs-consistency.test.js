'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

const readmeTr = readRepoFile('README.md');
const readmeEn = readRepoFile('README.en.md');
const bootstrapCommand = readRepoFile('Agentbase/.claude/commands/bootstrap.md');

describe('README docs consistency', () => {
  it('documents Agentbase backlog location consistently in Turkish and English READMEs', () => {
    assert.ok(
      readmeTr.includes('`Agentbase/backlog/`'),
      'Turkce README backlog konumunu Agentbase/backlog/ olarak anlatmali'
    );
    assert.ok(
      readmeEn.includes('`Agentbase/backlog/`'),
      'English README backlog konumunu Agentbase/backlog/ olarak anlatmali'
    );
    assert.ok(!readmeTr.includes('(`backlog/` root dizinde)'), 'Eski root backlog ifadesi kalmamali');
    assert.ok(!readmeEn.includes('(`backlog/` in root directory)'), 'Old root backlog wording must be removed');
  });

  it('uses Agentbase working directory for the multi-CLI transform example', () => {
    const example = 'cd Agentbase && node transform.js ../Docbase/agentic/project-manifest.yaml --targets gemini,codex,kimi,opencode';
    assert.ok(readmeTr.includes(example), 'Turkce README transform orneginde Agentbase CWD kullanmali');
    assert.ok(readmeEn.includes(example), 'English README transform example must use Agentbase CWD');
  });

  it('documents Codex as transform target with optional verify/adapt instead of separate bootstrap', () => {
    assert.ok(
      readmeTr.includes('Codex icin ikinci bootstrap yoktur'),
      'Turkce README Codex icin ikinci bootstrap olmadigini soylemeli'
    );
    assert.ok(
      readmeEn.includes('There is no second Codex bootstrap'),
      'English README must state there is no second Codex bootstrap'
    );
    assert.ok(
      readmeTr.includes('`/codex-verify`'),
      'Turkce README opsiyonel codex-verify adimini anlatmali'
    );
    assert.ok(
      readmeEn.includes('`/codex-verify`'),
      'English README must mention optional codex-verify'
    );
    assert.ok(
      readmeTr.includes('hook parity iddiası olmadığını'),
      'Turkce README Codex icin otomatik hook parity iddiasi olmadigini soylemeli'
    );
    assert.ok(
      readmeEn.includes('no automatic hook parity is claimed'),
      'English README must state automatic hook parity is not claimed'
    );
    assert.ok(!readmeTr.includes('Codex icin ayri bootstrap calistirin'), 'Turkce README ayri Codex bootstrap onermemeli');
    assert.ok(!readmeEn.includes('run a separate Codex bootstrap'), 'English README must not recommend a separate Codex bootstrap');
    assert.ok(!readmeTr.includes('Claude Code hooklari Codexte otomatik calisir'), 'Turkce README Codex hook parity overclaim tasimamali');
    assert.ok(!readmeEn.includes('Claude Code hooks run automatically in Codex'), 'English README must not overclaim hook parity');
  });

  it('describes automatic changelog generation as tag-driven after auto-release', () => {
    assert.ok(
      readmeTr.includes("Conventional Commit push'ları `main` branch'inde auto-release akışını tetikler; oluşan `v*` tag'i ayrı GitHub Action ile `CHANGELOG.md` dosyasını üretip `main` branch'ine geri yazar."),
      'Turkce README changelog akisinda tag tetigini anlatmali'
    );
    assert.ok(
      readmeEn.includes('Conventional Commit pushes on the `main` branch trigger the auto-release flow; the resulting `v*` tag triggers a separate GitHub Action that regenerates `CHANGELOG.md` and writes it back to `main`.'),
      'English README changelog flow must mention the follow-up tag trigger'
    );
    assert.ok(!readmeTr.includes("sadece `main` branch'ine yapılan push'larda"), 'Eski yaniltici main-only ifade kaldirilmali');
    assert.ok(!readmeEn.includes('only on pushes to the `main` branch'), 'Old misleading main-only wording must be removed');
  });

  it('keeps generated deploy command naming consistent with prefixed command model', () => {
    assert.ok(
      readmeTr.includes('`/{varyant}-pre-deploy` ve `/{varyant}-post-deploy`'),
      'Turkce README prefixli deploy komut modelini gostermeli'
    );
    assert.ok(
      readmeEn.includes('`/{variant}-pre-deploy` and `/{variant}-post-deploy`'),
      'English README must show the prefixed deploy command model'
    );
    assert.ok(!readmeTr.includes('`/pre-deploy`'), 'Turkce README bare /pre-deploy kullanmamali');
    assert.ok(!readmeTr.includes('`/post-deploy`'), 'Turkce README bare /post-deploy kullanmamali');
    assert.ok(!readmeEn.includes('`/pre-deploy`'), 'English README must not use bare /pre-deploy');
    assert.ok(!readmeEn.includes('`/post-deploy`'), 'English README must not use bare /post-deploy');
  });
});

describe('bootstrap docs consistency', () => {
  it('checks the local Agentbase backlog path in bootstrap instructions', () => {
    assert.match(bootstrapCommand, /ls backlog\/config\.yml 2>\/dev\/null/);
    assert.doesNotMatch(bootstrapCommand, /ls \.\.\/backlog\/config\.yml 2>\/dev\/null/);
  });

  it('keeps Codex bootstrap decision consistent in bootstrap instructions', () => {
    assert.match(bootstrapCommand, /Codex icin ikinci bootstrap CALISTIRILMAZ/);
    assert.match(bootstrapCommand, /\/codex-verify/);
    assert.match(bootstrapCommand, /Sadece `targets: \[claude\]` varsa hem transform hem Codex verify\/adapt atlanir/);
  });
});

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
});

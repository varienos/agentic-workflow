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
const coreClaude = readRepoFile('Agentbase/templates/core/CLAUDE.md.skeleton');
const dbMigrationRule = readRepoFile('Agentbase/templates/core/rules/db-migration-discipline.skeleton.md');
const taskHunterCommand = readRepoFile('Agentbase/templates/core/commands/task-hunter.skeleton.md');
const bugReviewCommand = readRepoFile('Agentbase/templates/core/commands/bug-review.skeleton.md');
const taskPlanCommand = readRepoFile('Agentbase/templates/core/commands/task-plan.skeleton.md');
const deepAuditCommand = readRepoFile('Agentbase/templates/core/commands/deep-audit.skeleton.md');
const regressionAnalyzerAgent = readRepoFile('Agentbase/templates/core/agents/regression-analyzer.skeleton.md');
const backendExpertAgent = readRepoFile('Agentbase/templates/core/agents/backend-expert.skeleton.md');
const workflowLifecycleRule = readRepoFile('Agentbase/templates/core/rules/workflow-lifecycle.skeleton.md');
const serviceDocumentationAgent = readRepoFile('Agentbase/templates/core/agents/service-documentation.skeleton.md');
const methodsReference = readRepoFile('Agentbase/templates/reference/methods.md');
const adrReadme = readRepoFile('backlog/decisions/README.md');
const adrTemplate = readRepoFile('backlog/decisions/0000-adr-template.md');
const contributing = readRepoFile('CONTRIBUTING.md');
const extensionsRegistryMd = readRepoFile('Agentbase/templates/extensions-registry.md');
const referenceNotes = readRepoFile('Agentbase/templates/reference/notes.md');

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
    assert.ok(
      readmeTr.includes('skill/context yüzeyidir; native slash command garantisi verilmez'),
      'Turkce README Codex hedefini native slash command olarak sunmamali'
    );
    assert.ok(
      readmeEn.includes('skill/context surface, not a command runtime; no native slash-command guarantee is made'),
      'English README must not present Codex target as a native slash-command runtime'
    );
    assert.ok(!readmeTr.includes('Codex icin ayri bootstrap calistirin'), 'Turkce README ayri Codex bootstrap onermemeli');
    assert.ok(!readmeEn.includes('run a separate Codex bootstrap'), 'English README must not recommend a separate Codex bootstrap');
    assert.ok(!readmeTr.includes('Claude Code hooklari Codexte otomatik calisir'), 'Turkce README Codex hook parity overclaim tasimamali');
    assert.ok(!readmeEn.includes('Claude Code hooks run automatically in Codex'), 'English README must not overclaim hook parity');
  });

  it('scopes automatic hook behavior to Claude Code runtime', () => {
    assert.ok(
      readmeTr.includes("Claude Code runtime'ında `codebase-guard` hook'u"),
      'Turkce README codebase-guard otomasyonunu Claude Code runtime ile sinirlamali'
    );
    assert.ok(
      readmeTr.includes("Claude Code runtime'ında `test-enforcer` hook'u"),
      'Turkce README test-enforcer otomasyonunu Claude Code runtime ile sinirlamali'
    );
    assert.ok(
      readmeEn.includes('In the Claude Code runtime, the `codebase-guard` hook'),
      'English README must scope codebase-guard automation to Claude Code runtime'
    );
    assert.ok(
      readmeEn.includes('In the Claude Code runtime, the `test-enforcer` hook'),
      'English README must scope test-enforcer automation to Claude Code runtime'
    );
  });

  it('does not reference obsolete Bootstrap Flow step numbers', () => {
    assert.ok(!readmeTr.includes('Bootstrap Akışı adım 9'), 'Turkce README obsolete bootstrap step number kullanmamali');
    assert.ok(!readmeEn.includes('Bootstrap Flow step 9'), 'English README must not reference obsolete bootstrap step number');
  });

  it('keeps the 1.10.x to 1.11.x migration guide mirrored in both READMEs', () => {
    assert.ok(
      readmeTr.includes('### Geçiş Rehberi (1.10.x → 1.11.x)'),
      'Turkce README 1.10.x -> 1.11.x gecis rehberini icermeli'
    );
    assert.ok(
      readmeEn.includes('### Migration Guide (1.10.x -> 1.11.x)'),
      'English README must include the 1.10.x -> 1.11.x migration guide'
    );
    assert.ok(
      readmeTr.includes('templates/interview/phase-{1-4}-*.md'),
      'Turkce README interview phase breaking change kaynagini anlatmali'
    );
    assert.ok(
      readmeEn.includes('templates/interview/phase-{1-4}-*.md'),
      'English README must describe the interview phase breaking change source'
    );
    assert.ok(
      readmeTr.includes('`CHANGELOG.md` → `[2.0.0]`'),
      'Turkce README migration rehberi yayinlanmis changelog bolumune baglanmali'
    );
    assert.ok(
      readmeEn.includes('`CHANGELOG.md` -> `[2.0.0]`'),
      'English README migration guide must link to the released changelog section'
    );
    assert.ok(!readmeTr.includes('`CHANGELOG.md` → `[Unreleased]`'));
    assert.ok(!readmeEn.includes('`CHANGELOG.md` -> `[Unreleased]`'));
  });

  it('documents greenfield placeholder handling consistently', () => {
    assert.ok(
      readmeTr.includes('rm -f Codebase/.gitkeep'),
      'Turkce README greenfield kurulumunda repo placeholder temizligini gostermeli'
    );
    assert.ok(
      readmeEn.includes('rm -f Codebase/.gitkeep'),
      'English README must show cleanup for the repo placeholder in greenfield setup'
    );
    assert.ok(
      readmeTr.includes('`.gitkeep` ve `.DS_Store` placeholder olarak yok sayılır'),
      'Turkce README placeholder dosyalarin bos Codebase sayildigini anlatmali'
    );
    assert.ok(
      readmeEn.includes('`.gitkeep` and `.DS_Store` are ignored as placeholders'),
      'English README must state placeholder files are ignored'
    );
    assert.ok(
      bootstrapCommand.includes("! -name '.gitkeep' ! -name '.DS_Store'"),
      'Bootstrap kontrolu .gitkeep ve .DS_Store placeholder dosyalarini yok saymali'
    );
    assert.ok(
      bootstrapCommand.includes('__CODEBASE_MISSING__'),
      'Bootstrap kontrolu eksik Codebase ile bos Codebase durumunu ayirmali'
    );
    assert.ok(
      contributing.includes('`.gitkeep` ve `.DS_Store` placeholder kabul edilir'),
      'CONTRIBUTING Codebase placeholder sozlesmesini anlatmali'
    );
  });

  it('documents extensions-registry.yaml as the bootstrap recommendation source', () => {
    assert.ok(
      bootstrapCommand.includes('templates/extensions-registry.yaml'),
      'Bootstrap komutu yapilandirilmis eklenti kaynagi olarak YAML registry kullanmali'
    );
    assert.ok(
      contributing.includes('`Agentbase/templates/extensions-registry.yaml` Bootstrap eklenti oneri sisteminin yapilandirilmis kaynagidir'),
      'CONTRIBUTING YAML registry kaynak rolunu anlatmali'
    );
    assert.ok(
      extensionsRegistryMd.includes('Bootstrap eklenti öneri sistemi yapılandırılmış kaynak olarak `extensions-registry.yaml` dosyasını okur'),
      'Markdown registry insan referansi, YAML ise bootstrap kaynagi olarak ayrilmali'
    );
    assert.ok(
      referenceNotes.includes("extensions-registry.yaml'dan sadece gerekli olanları seçmeli"),
      'Referans notlari bootstrap icin YAML registry kaynagini gostermeli'
    );
    assert.ok(
      !contributing.includes('Bootstrap sirasinda Opus bu listeden proje ihtiyacina uygun eklentileri onerir'),
      'CONTRIBUTING Markdown registry dosyasini bootstrap oneri kaynagi gibi sunmamali'
    );
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

  it('aligns the worktree section with the resolveCodebaseRoot single contract', () => {
    // Turkce README hedef worktree secme tablosunu icermeli
    assert.ok(
      readmeTr.includes('### Worktree Avantajı'),
      'Turkce README Worktree Avantaji bolumunu korumali'
    );
    assert.ok(
      readmeTr.includes('`resolveCodebaseRoot()`'),
      'Turkce README tek sozlesme helper\'ini referans almali'
    );
    assert.ok(
      readmeTr.includes('AGENTIC_CODEBASE_DIR'),
      'Turkce README env override yontemini gostermeli'
    );
    assert.ok(
      readmeTr.includes('#### Hedef Worktree\'yi Seçme'),
      'Turkce README hedef worktree secme bolumunu icermeli'
    );
    // Eski "geçiş mekanizması mevcut değildir" iddiasi kaldirilmali
    assert.ok(
      !readmeTr.includes('geçiş mekanizması henüz mevcut değildir'),
      'Turkce README eski "gecis yok" iddiasini tasimamali'
    );

    // English README
    assert.ok(
      readmeEn.includes('### Worktree Advantage'),
      'English README must keep Worktree Advantage section'
    );
    assert.ok(
      readmeEn.includes('`resolveCodebaseRoot()`'),
      'English README must reference the single-contract helper'
    );
    assert.ok(
      readmeEn.includes('AGENTIC_CODEBASE_DIR'),
      'English README must show env override method'
    );
    assert.ok(
      readmeEn.includes('#### Selecting the Target Worktree'),
      'English README must include target worktree selection section'
    );
    assert.ok(
      !readmeEn.includes('cross-worktree switching is not yet implemented'),
      'English README must not carry the old "not yet implemented" claim'
    );
  });

  it('bootstrap completion report surfaces the target Codebase and override methods', () => {
    assert.ok(
      bootstrapCommand.includes('🎯 Hedef Codebase:'),
      'Bootstrap tamamlanma raporu hedef Codebase blok\'unu icermeli'
    );
    assert.ok(
      bootstrapCommand.includes('AGENTIC_CODEBASE_DIR'),
      'Tamamlanma raporu env override yontemini gostermeli'
    );
    assert.ok(
      bootstrapCommand.includes('Worktree symlink rotasyonu'),
      'Tamamlanma raporu symlink rotation yontemini gostermeli'
    );
    assert.ok(
      bootstrapCommand.includes('Manifest guncellemesi') || bootstrapCommand.includes('Manifest güncellemesi'),
      'Tamamlanma raporu manifest guncellemesi yontemini gostermeli'
    );
    // Onboarding sablonunda da ayni blok mevcut olmali
    assert.ok(
      bootstrapCommand.includes('## Hedef Codebase'),
      'Onboarding sablonu hedef Codebase bolumunu icermeli'
    );
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

  it('keeps db migration discipline rule references consistent', () => {
    assert.match(bootstrapCommand, /db-migration-discipline\.skeleton\.md/);
    assert.match(bootstrapCommand, /\.claude\/rules\/db-migration-discipline\.md/);
    assert.match(bootstrapCommand, /rules\.db_migration_required/);
    assert.match(dbMigrationRule, /GENERATE: DETECTED_ORM/);
    assert.match(dbMigrationRule, /GENERATE: MIGRATION_COMMANDS/);
    assert.match(dbMigrationRule, /GENERATE: DRY_RUN_COMMAND/);
    assert.match(dbMigrationRule, /GENERATE: ROLLBACK_COMMAND/);

    const readmeReferenceCount = [readmeTr, readmeEn]
      .filter(content => content.includes('db-migration-discipline'))
      .length;
    assert.ok(
      readmeReferenceCount === 0 || readmeReferenceCount === 2,
      'README db-migration-discipline referansi varsa TR/EN birlikte guncellenmeli'
    );

    if (coreClaude.includes('db-migration-discipline')) {
      assert.match(bootstrapCommand, /db-migration-discipline\.skeleton\.md/);
    }
  });

  it('references db migration discipline from consumer skeletons and readmes', () => {
    const consumerSurfaces = [
      taskHunterCommand,
      bugReviewCommand,
      taskPlanCommand,
      deepAuditCommand,
      regressionAnalyzerAgent,
      backendExpertAgent,
    ];

    for (const content of consumerSurfaces) {
      assert.match(content, /\.claude\/rules\/db-migration-discipline\.md/);
    }

    assert.match(taskPlanCommand, /Migration dosyasi olusturuldu/);
    assert.match(taskPlanCommand, /Rollback\/down script veya dosya yolu hazir/);
    assert.match(regressionAnalyzerAgent, /rollback\/down script dosya yolu/);
    assert.match(readmeTr, /\| `db-migration-discipline` \|/);
    assert.match(readmeEn, /\| `db-migration-discipline` \|/);
  });
});

describe('ADR docs consistency', () => {
  it('keeps architecture decision triggers connected to workflow surfaces', () => {
    assert.match(adrReadme, /YYYYMMDD-kebab-case-karar-basligi\.md/);
    assert.match(adrReadme, /Minimum Alanlar/);
    assert.match(adrReadme, /Katman siniri, modul sahipligi veya public API kontrati/);
    assert.match(adrReadme, /Rollback \/ Revisit Trigger/);

    assert.match(adrTemplate, /## Context/);
    assert.match(adrTemplate, /## Decision/);
    assert.match(adrTemplate, /## Alternatives Considered/);
    assert.match(adrTemplate, /## Consequences/);
    assert.match(adrTemplate, /## Rollback \/ Revisit Trigger/);

    assert.match(methodsReference, /backlog\/decisions\/README\.md/);
    assert.match(taskPlanCommand, /Mimari Karar \/ ADR Kontrolu/);
    assert.match(taskHunterCommand, /backlog\/decisions\//);
    assert.match(workflowLifecycleRule, /Mimari Karar \(ADR\) Kapisi/);
    assert.match(workflowLifecycleRule, /backlog\/decisions\/0000-adr-template\.md/);
    assert.match(serviceDocumentationAgent, /backlog\/decisions\/\*\.md/);
  });
});

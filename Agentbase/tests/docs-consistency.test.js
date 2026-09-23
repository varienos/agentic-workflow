'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

const readme = readRepoFile('README.md');
const bootstrapCommand = readRepoFile('Agentbase/.claude/commands/bootstrap.md');
const coreClaude = readRepoFile('Agentbase/templates/core/CLAUDE.md.skeleton');
const dbMigrationRule = readRepoFile('Agentbase/templates/core/rules/db-migration-discipline.skeleton.md');
const taskHunterCommand = readRepoFile('Agentbase/templates/core/commands/task-hunter.skeleton.md');
const bugReviewCommand = readRepoFile('Agentbase/templates/core/commands/bug-review.skeleton.md');
const taskPlanCommand = readRepoFile('Agentbase/templates/core/commands/task-plan.skeleton.md');
const taskConductorCommand = readRepoFile('Agentbase/templates/core/commands/task-conductor.skeleton.md');
const deepAuditCommand = readRepoFile('Agentbase/templates/core/commands/deep-audit.skeleton.md');
const codexVerifyCommand = readRepoFile('Agentbase/templates/core/commands/codex-verify.skeleton.md');
const regressionAnalyzerAgent = readRepoFile('Agentbase/templates/core/agents/regression-analyzer.skeleton.md');
const backendExpertAgent = readRepoFile('Agentbase/templates/core/agents/backend-expert.skeleton.md');
const workflowReference = readRepoFile('Agentbase/templates/reference/workflow.md');
const workflowLifecycleRule = readRepoFile('Agentbase/templates/core/rules/workflow-lifecycle.skeleton.md');
const serviceDocumentationAgent = readRepoFile('Agentbase/templates/core/agents/service-documentation.skeleton.md');
const methodsReference = readRepoFile('Agentbase/templates/reference/methods.md');
const modelsReference = readRepoFile('Agentbase/templates/reference/models.md');
const adrReadme = readRepoFile('backlog/decisions/README.md');
const adrTemplate = readRepoFile('backlog/decisions/0000-adr-template.md');
const contributing = readRepoFile('CONTRIBUTING.md');
const extensionsRegistryMd = readRepoFile('Agentbase/templates/extensions-registry.md');
const referenceNotes = readRepoFile('Agentbase/templates/reference/notes.md');
const graphifyInstallReference = readRepoFile('Agentbase/templates/modules/knowledge-graph/graphify/install.md');
const interviewPhase1 = readRepoFile('Agentbase/templates/interview/phase-1-project.md');
const rootGitignoreSkeleton = readRepoFile('Agentbase/templates/core/root-gitignore.skeleton');

describe('README docs consistency', () => {
  it('documents Agentbase backlog location consistently in Turkish and English READMEs', () => {
    assert.ok(
      readme.includes('`Agentbase/backlog/`'),
      'Turkce README backlog konumunu Agentbase/backlog/ olarak anlatmali'
    );
    assert.ok(
      readme.includes('`Agentbase/backlog/`'),
      'English README backlog konumunu Agentbase/backlog/ olarak anlatmali'
    );
    assert.ok(!readme.includes('(`backlog/` root dizinde)'), 'Eski root backlog ifadesi kalmamali');
    assert.ok(!readme.includes('(`backlog/` in root directory)'), 'Old root backlog wording must be removed');
  });

  it('uses Agentbase working directory for the multi-CLI transform example', () => {
    const example = 'cd Agentbase && node transform.js ../Docbase/agentic/project-manifest.yaml --targets gemini,antigravity,codex,kimi,opencode';
    assert.ok(readme.includes(example), 'Turkce README transform orneginde Agentbase CWD kullanmali');
    assert.ok(readme.includes(example), 'English README transform example must use Agentbase CWD');
  });

  it('documents Codex as transform target with optional verify/adapt instead of separate bootstrap', () => {
    assert.ok(
      readme.includes('There is no second Codex bootstrap'),
      'Turkce README Codex icin ikinci bootstrap olmadigini soylemeli'
    );
    assert.ok(
      readme.includes('There is no second Codex bootstrap'),
      'English README must state there is no second Codex bootstrap'
    );
    assert.ok(
      readme.includes('`/codex-verify`'),
      'Turkce README opsiyonel codex-verify adimini anlatmali'
    );
    assert.ok(
      readme.includes('`/codex-verify`'),
      'English README must mention optional codex-verify'
    );
    assert.ok(
      readme.includes('no automatic hook parity is claimed'),
      'Turkce README Codex icin otomatik hook parity iddiasi olmadigini soylemeli'
    );
    assert.ok(
      readme.includes('no automatic hook parity is claimed'),
      'English README must state automatic hook parity is not claimed'
    );
    assert.ok(
      readme.includes('skill/context surface, not a command runtime; no native slash-command guarantee is made'),
      'Turkce README Codex hedefini native slash command olarak sunmamali'
    );
    assert.ok(
      readme.includes('skill/context surface, not a command runtime; no native slash-command guarantee is made'),
      'English README must not present Codex target as a native slash-command runtime'
    );
    assert.ok(!readme.includes('Codex icin ayri bootstrap calistirin'), 'Turkce README ayri Codex bootstrap onermemeli');
    assert.ok(!readme.includes('run a separate Codex bootstrap'), 'English README must not recommend a separate Codex bootstrap');
    assert.ok(!readme.includes('Claude Code hooklari Codexte otomatik calisir'), 'Turkce README Codex hook parity overclaim tasimamali');
    assert.ok(!readme.includes('Claude Code hooks run automatically in Codex'), 'English README must not overclaim hook parity');
  });

  it('documents current Codex skill output path and Kimi prompt target consistently', () => {
    const codexSkillPath = '`.agents/skills/*/SKILL.md`';
    const oldCodexSkillPath = '`.codex/skills/*/SKILL.md`';
    for (const [label, content] of [
      ['README', readme],
      ['Codex verify command', codexVerifyCommand],
      ['Reference notes', referenceNotes],
    ]) {
      assert.ok(content.includes(codexSkillPath), `${label} current Codex skill path kullanmali`);
      assert.ok(!content.includes(oldCodexSkillPath), `${label} eski Codex skill path kullanmamali`);
    }

    assert.ok(
      readme.includes('`.kimi/agents/default-prompt.md` via `default.yaml`'),
      'Turkce README Kimi context hedefini gercek dosya yoluyla anlatmali'
    );
    assert.ok(
      readme.includes('`.kimi/agents/default-prompt.md` via `default.yaml`'),
      'English README must document the concrete Kimi context prompt path'
    );
  });

  it('scopes automatic hook behavior to Claude Code runtime', () => {
    assert.ok(
      readme.includes('In the Claude Code runtime, the `codebase-guard` hook'),
      'Turkce README codebase-guard otomasyonunu Claude Code runtime ile sinirlamali'
    );
    assert.ok(
      readme.includes('In the Claude Code runtime, the `test-enforcer` hook'),
      'Turkce README test-enforcer otomasyonunu Claude Code runtime ile sinirlamali'
    );
    assert.ok(
      readme.includes('In the Claude Code runtime, the `codebase-guard` hook'),
      'English README must scope codebase-guard automation to Claude Code runtime'
    );
    assert.ok(
      readme.includes('In the Claude Code runtime, the `test-enforcer` hook'),
      'English README must scope test-enforcer automation to Claude Code runtime'
    );
  });

  it('does not reference obsolete Bootstrap Flow step numbers', () => {
    assert.ok(!readme.includes('Bootstrap Akışı adım 9'), 'Turkce README obsolete bootstrap step number kullanmamali');
    assert.ok(!readme.includes('Bootstrap Flow step 9'), 'English README must not reference obsolete bootstrap step number');
  });

  it('ships one English README and an English host-neutral core skeleton', () => {
    assert.equal(fs.existsSync(path.join(REPO_ROOT, 'README.en.md')), false);
    assert.equal(fs.existsSync(path.join(REPO_ROOT, 'README.tr.md')), false);
    assert.match(readme, /Claude is one host, not the product/);
    assert.doesNotMatch(readme, /README\.en\.md|README\.tr\.md/);
    const turkishProse = /\b(Yapilandirmasi|Bolum|calistir|Gelistirme Komutlari|Yasakli Islemler|Calisma Dizinleri|Temel Dosyalar)\b/;
    assert.doesNotMatch(readme, turkishProse);
    assert.doesNotMatch(coreClaude, turkishProse);
    assert.doesNotMatch(coreClaude, /Claude Code Yapilandirmasi/);
    assert.match(coreClaude, /Claude is one host, not the product/);
    assert.match(coreClaude, /Other hosts do not run those hooks automatically/);
    assert.match(coreClaude, /# \{\{ PROJECT_NAME \}\} — Agent workflow/);
  });

  it('documents greenfield placeholder handling consistently', () => {
    assert.ok(
      readme.includes('rm -f Codebase/.gitkeep'),
      'Turkce README greenfield kurulumunda repo placeholder temizligini gostermeli'
    );
    assert.ok(
      readme.includes('rm -f Codebase/.gitkeep'),
      'English README must show cleanup for the repo placeholder in greenfield setup'
    );
    assert.ok(
      readme.includes('`.gitkeep` and `.DS_Store` are ignored as placeholders'),
      'Turkce README placeholder dosyalarin bos Codebase sayildigini anlatmali'
    );
    assert.ok(
      readme.includes('`.gitkeep` and `.DS_Store` are ignored as placeholders'),
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
      contributing.includes('`.gitkeep` and `.DS_Store` are accepted as placeholders'),
      'CONTRIBUTING Codebase placeholder sozlesmesini anlatmali'
    );
  });

  it('documents the two-repo delivery contract consistently', () => {
    assert.ok(
      readme.includes('### Two-Repo Delivery Model'),
      'Turkce README iki-repo teslimat modeli bolumunu icermeli'
    );
    assert.ok(
      readme.includes('### Two-Repo Delivery Model'),
      'English README must include the two-repo delivery model section'
    );
    assert.ok(
      readme.includes('clones/links `Codebase` **separately**'),
      'Turkce README Codebase ayri klonlama/baglama sozlesmesini anlatmali'
    );
    assert.ok(
      readme.includes('clones/links `Codebase` **separately**'),
      'English README must state Codebase is cloned/linked separately'
    );
    assert.ok(
      rootGitignoreSkeleton.includes('clones or links Codebase **separately**'),
      'root-gitignore skeleton must keep the separate Codebase clone/link contract'
    );
    assert.ok(!readme.includes('kloduyla'), 'Turkce README eski typo tasimamali');
    assert.ok(!bootstrapCommand.includes('kloduyla'), 'Bootstrap eski typo tasimamali');
    assert.ok(!rootGitignoreSkeleton.includes('her şey gelir'), 'Skeleton eski her sey gelir iddiasini tasimamali');
    assert.ok(!rootGitignoreSkeleton.includes('her sey gelir'), 'Skeleton eski her sey gelir iddiasini tasimamali');
  });

  it('uses guarded Codebase placeholder replacement commands', () => {
    assert.ok(!readme.includes('rm -rf Codebase'), 'Turkce README Codebase icin destructive rm -rf onermemeli');
    assert.ok(!readme.includes('rm -rf Codebase'), 'English README must not recommend destructive rm -rf for Codebase');
    assert.ok(
      readme.includes('rm -f Codebase/.gitkeep && rmdir Codebase'),
      'Turkce README yalnizca bos placeholder Codebase dizinini kaldirmali'
    );
    assert.ok(
      readme.includes('rm -f Codebase/.gitkeep && rmdir Codebase'),
      'English README must only remove an empty placeholder Codebase directory'
    );
  });

  it('documents extensions-registry.yaml as the bootstrap recommendation source', () => {
    assert.ok(
      bootstrapCommand.includes('templates/extensions-registry.yaml'),
      'Bootstrap komutu yapilandirilmis eklenti kaynagi olarak YAML registry kullanmali'
    );
    assert.ok(
      contributing.includes('`Agentbase/templates/extensions-registry.yaml` is the structured source for the Bootstrap extension recommendation system'),
      'CONTRIBUTING YAML registry kaynak rolunu anlatmali'
    );
    assert.ok(
      extensionsRegistryMd.includes('The Bootstrap extension recommendation system reads `extensions-registry.yaml` as its structured source'),
      'Markdown registry insan referansi, YAML ise bootstrap kaynagi olarak ayrilmali'
    );
    assert.ok(
      referenceNotes.includes('select only what is needed from extensions-registry.yaml'),
      'Referans notlari bootstrap icin YAML registry kaynagini gostermeli'
    );
    assert.ok(
      !contributing.includes('Bootstrap sirasinda Opus bu listeden proje ihtiyacina uygun eklentileri onerir'),
      'CONTRIBUTING Markdown registry dosyasini bootstrap oneri kaynagi gibi sunmamali'
    );
  });

  it('keeps model selection guidance current across Claude, Gemini, and Codex surfaces', () => {
    const requiredTerms = [
      'Last source check: 2026-06-02',
      'OpenAI GPT-5.5',
      'GPT-5.3-Codex',
      'Claude Opus 4.x',
      'Claude Sonnet 4.x',
      'Claude Haiku 4.x',
      'Gemini 3.x Pro',
      'Gemini 3.x Flash',
      'Gemini 2.5 Pro / Flash',
      'In production automation, use a stable or pinned model ID instead of a preview/experimental alias',
      'Do not write a model name in a prompt as if it were a behavior guarantee',
    ];

    for (const term of requiredTerms) {
      assert.ok(modelsReference.includes(term), `models.md guncel model rehberi terimini icermeli: ${term}`);
    }

    assert.match(
      modelsReference,
      /Last source check: \d{4}-\d{2}-\d{2}/,
      'models.md kaynak kontrol tarihini ISO formatinda tutmali'
    );

    const providerTable = modelsReference
      .split('## Provider comparison')[1]
      .split('## Selection criteria')[0]
      .split('\n')
      .filter(line => line.startsWith('|'));
    const headerCells = providerTable[0].split('|').slice(1, -1).map(cell => cell.trim());
    assert.deepEqual(
      headerCells,
      ['Provider / model class', 'Strengths', 'When to use'],
      'models.md provider tablosu beklenen kolonlari korumali'
    );

    const dataRows = providerTable.slice(2);
    assert.ok(dataRows.length >= 9, 'models.md provider tablosu OpenAI, Codex, Claude ve Gemini ailelerini kapsamali');
    for (const row of dataRows) {
      const cells = row.split('|').slice(1, -1).map(cell => cell.trim());
      assert.equal(cells.length, 3, `models.md tablo satiri 3 kolonlu olmali: ${row}`);
      assert.ok(cells.every(Boolean), `models.md tablo satirinda bos hucre olmamali: ${row}`);
    }

    const sourceUrls = [...modelsReference.matchAll(/https?:\/\/[^\s`]+/g)].map(match => new URL(match[0]));
    const expectedHosts = new Set([
      'developers.openai.com',
      'platform.claude.com',
      'code.claude.com',
      'ai.google.dev',
      'github.com',
    ]);
    for (const url of sourceUrls) {
      assert.ok(expectedHosts.has(url.hostname), `models.md resmi kaynak hostu kullanmali: ${url.hostname}`);
    }

    assert.ok(
      !modelsReference.includes('Model Karşılaştırması\n\n| Model | Güçlü Yönler | Kullanım Durumu |'),
      'models.md eski yalnizca Claude odakli karsilastirma tablosunu tasimamali'
    );
    assert.doesNotMatch(
      workflowReference,
      /\b(?:Opus|Sonnet|Haiku)\s+\d+(?:\.\d+)+\b/,
      'workflow.md hizli eskiyen tam Claude surum pinleri yerine model sinifi veya models.md referansi kullanmali'
    );
  });

  it('documents memory and CLI target safety guardrails', () => {
    assert.ok(
      readme.includes('Never store secrets, tokens, `.env` values, or PII in persistent memory'),
      'Turkce README shared memory icin secret/PII yasagi koymali'
    );
    assert.ok(
      readme.includes('Never store secrets, tokens, `.env` values, or PII in persistent memory'),
      'English README shared memory must forbid secrets and PII'
    );
    assert.ok(
      referenceNotes.includes('The agentic-workflow Codex target is a skill/context surface; it does not guarantee native slash commands'),
      'reference notes Codex target yuzeyini command runtime olarak overclaim etmemeli'
    );
    assert.ok(
      referenceNotes.includes('Gemini TOML produced by transform is prompt-only'),
      'reference notes Gemini TOML shell exec guardrailini anlatmali'
    );
    assert.ok(
      referenceNotes.includes('allowlist'),
      'reference notes manuel Gemini shell exec icin allowlist guardrailini korumali'
    );
  });

  it('describes automatic changelog generation as tag-driven after auto-release', () => {
    assert.ok(
      readme.includes('Conventional Commit pushes on the `main` branch trigger the auto-release flow; the resulting `v*` tag triggers a separate GitHub Action that regenerates `CHANGELOG.md` and writes it back to `main`.'),
      'Turkce README changelog akisinda tag tetigini anlatmali'
    );
    assert.ok(
      readme.includes('Conventional Commit pushes on the `main` branch trigger the auto-release flow; the resulting `v*` tag triggers a separate GitHub Action that regenerates `CHANGELOG.md` and writes it back to `main`.'),
      'English README changelog flow must mention the follow-up tag trigger'
    );
    assert.ok(!readme.includes("sadece `main` branch'ine yapılan push'larda"), 'Eski yaniltici main-only ifade kaldirilmali');
    assert.ok(!readme.includes('only on pushes to the `main` branch'), 'Old misleading main-only wording must be removed');
  });

  it('aligns the worktree section with the resolveCodebaseRoot single contract', () => {
    // Turkce README hedef worktree secme tablosunu icermeli
    assert.ok(
      readme.includes('### Worktree Advantage'),
      'Turkce README Worktree Avantaji bolumunu korumali'
    );
    assert.ok(
      readme.includes('`resolveCodebaseRoot()`'),
      'Turkce README tek sozlesme helper\'ini referans almali'
    );
    assert.ok(
      readme.includes('AGENTIC_CODEBASE_DIR'),
      'Turkce README env override yontemini gostermeli'
    );
    assert.ok(
      readme.includes('#### Selecting the Target Worktree'),
      'Turkce README hedef worktree secme bolumunu icermeli'
    );
    // Eski "geçiş mekanizması mevcut değildir" iddiasi kaldirilmali
    assert.ok(
      !readme.includes('geçiş mekanizması henüz mevcut değildir'),
      'Turkce README eski "gecis yok" iddiasini tasimamali'
    );

    // English README
    assert.ok(
      readme.includes('### Worktree Advantage'),
      'English README must keep Worktree Advantage section'
    );
    assert.ok(
      readme.includes('`resolveCodebaseRoot()`'),
      'English README must reference the single-contract helper'
    );
    assert.ok(
      readme.includes('AGENTIC_CODEBASE_DIR'),
      'English README must show env override method'
    );
    assert.ok(
      readme.includes('#### Selecting the Target Worktree'),
      'English README must include target worktree selection section'
    );
    assert.ok(
      !readme.includes('cross-worktree switching is not yet implemented'),
      'English README must not carry the old "not yet implemented" claim'
    );
  });

  it('bootstrap completion report surfaces the target Codebase and override methods', () => {
    assert.ok(
      bootstrapCommand.includes('🎯 Target Codebase:'),
      'Bootstrap tamamlanma raporu hedef Codebase blok\'unu icermeli'
    );
    assert.ok(
      bootstrapCommand.includes('AGENTIC_CODEBASE_DIR'),
      'Tamamlanma raporu env override yontemini gostermeli'
    );
    assert.ok(
      bootstrapCommand.includes('Worktree symlink rotation'),
      'Tamamlanma raporu symlink rotation yontemini gostermeli'
    );
    assert.ok(
      bootstrapCommand.includes('Manifest update'),
      'Tamamlanma raporu manifest guncellemesi yontemini gostermeli'
    );
    // Onboarding sablonunda da ayni blok mevcut olmali
    assert.ok(
      bootstrapCommand.includes('## Target Codebase'),
      'Onboarding sablonu hedef Codebase bolumunu icermeli'
    );
  });

  it('keeps generated deploy command naming consistent with prefixed command model', () => {
    assert.ok(
      readme.includes('`/{variant}-pre-deploy` and `/{variant}-post-deploy`'),
      'Turkce README prefixli deploy komut modelini gostermeli'
    );
    assert.ok(
      readme.includes('`/{variant}-pre-deploy` and `/{variant}-post-deploy`'),
      'English README must show the prefixed deploy command model'
    );
    assert.ok(!readme.includes('`/pre-deploy`'), 'Turkce README bare /pre-deploy kullanmamali');
    assert.ok(!readme.includes('`/post-deploy`'), 'Turkce README bare /post-deploy kullanmamali');
    assert.ok(!readme.includes('`/pre-deploy`'), 'English README must not use bare /pre-deploy');
    assert.ok(!readme.includes('`/post-deploy`'), 'English README must not use bare /post-deploy');
  });

  it('documents task-conductor as a plan-first guarded orchestrator', () => {
    const requiredTr = [
      '/task-conductor plan top 5',
      '/task-conductor run top 5 --max-parallel 2',
      '/task-conductor run all --confirm-all',
      '/task-conductor status',
      '/task-conductor abort',
    ];
    const requiredEn = [
      '/task-conductor plan top 5',
      '/task-conductor run top 5 --max-parallel 2',
      '/task-conductor run all --confirm-all',
      '/task-conductor status',
      '/task-conductor abort',
    ];

    for (const phrase of requiredTr) {
      assert.ok(readme.includes(phrase), `Turkce README task-conductor yeni sozlesmesini anlatmali: ${phrase}`);
    }
    for (const phrase of requiredEn) {
      assert.ok(readme.includes(phrase), `English README must document the guarded task-conductor contract: ${phrase}`);
    }

    assert.match(taskConductorCommand, /The default mode is PLAN/);
    assert.match(taskConductorCommand, /`run all` runs only with `--confirm-all`/);
    assert.match(taskConductorCommand, /Parallel writes only with an isolated worktree\/branch/);
    assert.match(taskConductorCommand, /"schema_version": 2/);
    assert.match(taskConductorCommand, /`status`/);
    assert.match(taskConductorCommand, /`abort`/);
  });

  it('keeps the Turkish README concise, user-facing, and typo-free', () => {
    const forbiddenTerms = [
      'Claude Code 2.1.139+',
      'evaluator model',
      'machine-checkable',
      'enjeksiyon zinciri',
      'canonical kaynak',
      'post-processor',
      ' bosta ',
      ' yonetimi ',
      'Son islem',
      ' Kapali ',
      ' Yardim ',
      ' Cikis ',
    ];

    for (const term of forbiddenTerms) {
      assert.ok(!readme.includes(term), `Turkce README son kullanici metninde gereksiz/hatali ifade var: ${term}`);
    }

    const longLines = readme
      .split('\n')
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => line.length > 360)
      .filter(({ line }) => !line.startsWith('|'))
      .filter(({ line }) => !line.startsWith('!['))
      .map(({ lineNumber, line }) => `${lineNumber}:${line.length}:${line.slice(0, 80)}`);

    assert.deepEqual(longLines, [], 'Turkce README aciklama satirlari kisa ve taranabilir kalmali');
  });
});

describe('bootstrap docs consistency', () => {
  it('checks the local Agentbase backlog path in bootstrap instructions', () => {
    assert.match(bootstrapCommand, /ls backlog\/config\.yml 2>\/dev\/null/);
    assert.doesNotMatch(bootstrapCommand, /ls \.\.\/backlog\/config\.yml 2>\/dev\/null/);
  });

  it('keeps Codex bootstrap decision consistent in bootstrap instructions', () => {
    assert.match(bootstrapCommand, /A second Codex bootstrap is NOT run/);
    assert.match(bootstrapCommand, /\/codex-verify/);
    assert.match(bootstrapCommand, /If only `targets: \[claude\]` is set, both transform and Codex verify\/adapt are skipped/);
  });

  it('keeps db migration discipline rule references consistent', () => {
    assert.match(bootstrapCommand, /db-migration-discipline\.skeleton\.md/);
    assert.match(bootstrapCommand, /\.claude\/rules\/db-migration-discipline\.md/);
    assert.match(bootstrapCommand, /rules\.db_migration_required/);
    assert.match(dbMigrationRule, /GENERATE: DETECTED_ORM/);
    assert.match(dbMigrationRule, /GENERATE: MIGRATION_COMMANDS/);
    assert.match(dbMigrationRule, /GENERATE: DRY_RUN_COMMAND/);
    assert.match(dbMigrationRule, /GENERATE: ROLLBACK_COMMAND/);

    assert.match(readme, /\| `db-migration-discipline` \|/);

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

    assert.match(taskPlanCommand, /Migration file created/);
    assert.match(taskPlanCommand, /Rollback\/down script or file path is ready/);
    assert.match(regressionAnalyzerAgent, /rollback\/down script file path/);
    assert.match(readme, /\| `db-migration-discipline` \|/);
    assert.match(readme, /\| `db-migration-discipline` \|/);
  });

  it('keeps the bootstrap completion condition aligned with the machine gate checks', () => {
    assert.match(bootstrapCommand, /manifest_yazildi/);
    assert.match(bootstrapCommand, /root_claude_import_zinciri_tam/);
    assert.match(bootstrapCommand, /claude_runtime_dosyalari_var/);
    assert.match(bootstrapCommand, /codebase_sizintisi_yok/);
    assert.doesNotMatch(bootstrapCommand, /tum_teammate_ciktilari_var/);
    assert.doesNotMatch(bootstrapCommand, /knowledge_graph_kontrolu_yapildi/);
    assert.doesNotMatch(bootstrapCommand, /tamamlanma_raporu_basildi/);
  });

  it('initializes the bootstrap leak sentinel before Gate H uses it', () => {
    const initIndex = bootstrapCommand.indexOf(': > /tmp/bootstrap-start');
    const gateIndex = bootstrapCommand.indexOf('-newer /tmp/bootstrap-start');

    assert.ok(initIndex !== -1, 'Bootstrap /tmp/bootstrap-start sentinel dosyasini baslangicta olusturmali');
    assert.ok(gateIndex !== -1, 'Gate H Codebase sizintisini /tmp/bootstrap-start ile karsilastirmali');
    assert.ok(initIndex < gateIndex, 'Sentinel Gate H kullanmadan once olusturulmali');
    assert.match(bootstrapCommand, /H0: \/tmp\/bootstrap-start sentinel/);
  });

  it('describes the bootstrap verification gate set without stale gate counts', () => {
    assert.match(readme, /Gate A-H \+ B2/);
    assert.match(readme, /Gate A-H \+ B2/);
    assert.doesNotMatch(readme, /8 ayrı gate/);
    assert.doesNotMatch(readme, /Eight separate gates/);
  });

  it('keeps the Graphify install reference inside the Agentbase config boundary', () => {
    assert.doesNotMatch(graphifyInstallReference, /Codebase\/\.claude/);
    assert.doesNotMatch(graphifyInstallReference, /Codebase\/CLAUDE\.md/);
    assert.doesNotMatch(graphifyInstallReference, /TASK-225'te eklenecek/);
    assert.match(graphifyInstallReference, /Agentbase\/\.claude\/settings\.json/);
    assert.match(graphifyInstallReference, /Agentbase\/\.claude\/hooks\/graphify-first-guard-v2\.js/);
    assert.match(graphifyInstallReference, /Agentbase\/\.claude\/commands\/g\.md/);
  });

  it('keeps interview phase outputs aligned with Agentbase root document placement', () => {
    assert.doesNotMatch(interviewPhase1, /Agentbase\/\.claude\/PROJECT\.md/);
    assert.doesNotMatch(interviewPhase1, /Agentbase\/\.claude\/ARCHITECTURE\.md/);
    assert.match(interviewPhase1, /Agentbase\/PROJECT\.md/);
    assert.match(interviewPhase1, /Agentbase\/ARCHITECTURE\.md/);
  });
});

describe('ADR docs consistency', () => {
  it('keeps architecture decision triggers connected to workflow surfaces', () => {
    assert.match(adrReadme, /YYYYMMDD-kebab-case-decision-title\.md/);
    assert.match(adrReadme, /Minimum fields/);
    assert.match(adrReadme, /Layer boundary, module ownership, or public API contract/);
    assert.match(adrReadme, /Rollback \/ Revisit Trigger/);

    assert.match(adrTemplate, /## Context/);
    assert.match(adrTemplate, /## Decision/);
    assert.match(adrTemplate, /## Alternatives Considered/);
    assert.match(adrTemplate, /## Consequences/);
    assert.match(adrTemplate, /## Rollback \/ Revisit Trigger/);

    assert.match(methodsReference, /backlog\/decisions\/README\.md/);
    assert.match(taskPlanCommand, /Architecture decision \/ ADR check/);
    assert.match(taskHunterCommand, /backlog\/decisions\//);
    assert.match(workflowLifecycleRule, /Architecture decision \(ADR\) gate/);
    assert.match(workflowLifecycleRule, /backlog\/decisions\/0000-adr-template\.md/);
    assert.match(serviceDocumentationAgent, /backlog\/decisions\/\*\.md/);
  });
});

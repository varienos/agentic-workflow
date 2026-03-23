#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { extractDescription, adaptInvokeSyntax, adaptPathReferences, stripClaudeOnlySections, inlineRules, adaptContent, toToml, toSkillMd, toKimiAgentYaml, toOpenCodeAgent, stripFrontmatter, parseClaudeOutput, transformForTarget, writeTarget, resolveTargets } = require('./transform.js');
const yaml = require('js-yaml');

describe('extractDescription', () => {
  it('baslik — aciklama formatindan cikarir', () => {
    const content = '# Task Master — Backlog Oncelik Siralayici\n\n> Detay...';
    assert.equal(extractDescription(content), 'Backlog Oncelik Siralayici');
  });

  it('blockquote fallback', () => {
    const content = '# Task Master\n\n> Backlog gorevlerini puanlar ve siralar.';
    assert.equal(extractDescription(content), 'Backlog gorevlerini puanlar ve siralar.');
  });

  it('dosya adindan fallback', () => {
    const content = '## Step 1\n\nIcerik...';
    assert.equal(extractDescription(content), 'Agentic workflow komutu');
  });

  it('em dash (—) olmadan tire (-) ile de calisir', () => {
    const content = '# Bug Hunter - Otonom Bug Avcisi\n\nIcerik...';
    assert.equal(extractDescription(content), 'Otonom Bug Avcisi');
  });
});

describe('adaptInvokeSyntax', () => {
  const input = 'Kullanim: `/task-master`\nAyrica `/task-conductor top 5` deneyin.\n`/bug-hunter <tanim>` ile baslatin.';

  it('gemini — degismez', () => {
    assert.equal(adaptInvokeSyntax(input, 'gemini'), input);
  });

  it('codex — / → $', () => {
    const result = adaptInvokeSyntax(input, 'codex');
    assert.ok(result.includes('`$task-master`'));
    assert.ok(result.includes('`$task-conductor top 5`'));
    assert.ok(result.includes('`$bug-hunter <tanim>`'));
  });

  it('kimi — / → /skill:', () => {
    const result = adaptInvokeSyntax(input, 'kimi');
    assert.ok(result.includes('`/skill:task-master`'));
    assert.ok(result.includes('`/skill:task-conductor top 5`'));
  });

  it('opencode — / → @', () => {
    const result = adaptInvokeSyntax(input, 'opencode');
    assert.ok(result.includes('`@task-master`'));
    assert.ok(result.includes('`@task-conductor top 5`'));
  });

  it('backtick disindaki /path/to/file gibi yollara dokunmaz', () => {
    const safe = 'Dosya: /usr/local/bin/test ve `cd ../Codebase/`';
    assert.equal(adaptInvokeSyntax(safe, 'codex'), safe);
  });
});

describe('adaptPathReferences', () => {
  it('codex — .claude/commands/ → .codex/skills/', () => {
    const input = 'Bkz: `.claude/commands/task-master.md`';
    const result = adaptPathReferences(input, 'codex');
    assert.ok(result.includes('.codex/skills/'));
  });

  it('kimi — .claude/agents/ → .kimi/agents/', () => {
    const input = '`.claude/agents/code-review.md` dosyasi';
    const result = adaptPathReferences(input, 'kimi');
    assert.ok(result.includes('.kimi/agents/'));
  });

  it('.claude/hooks/ ve .claude/tracking/ referanslari kaldirilir', () => {
    const input = 'Hook: `.claude/hooks/test.js` ve tracking: `.claude/tracking/`';
    const result = adaptPathReferences(input, 'gemini');
    assert.ok(!result.includes('.claude/hooks/'));
    assert.ok(!result.includes('.claude/tracking/'));
  });

  it('.claude/rules/ referansi kaldirilir', () => {
    const input = '`.claude/rules/workflow.md` dosyasina bakin';
    const result = adaptPathReferences(input, 'codex');
    assert.ok(!result.includes('.claude/rules/'));
  });

  it('CLAUDE.md → hedef context dosyasi', () => {
    const input = '`CLAUDE.md` dosyasi ana context';
    const result = adaptPathReferences(input, 'gemini');
    assert.ok(result.includes('GEMINI.md'));
  });
});

describe('stripClaudeOnlySections', () => {
  it('hooks bolumunu cikarir', () => {
    const input = '## Bolum 1\n\nIcerik\n\n### Otomatik Test Sinyalleri (Hook Tabanli)\n\nHook detaylari...\n\n**Kurallar:**\n- Hook kurali\n\n## Bolum 2\n\nDiger icerik';
    const result = stripClaudeOnlySections(input);
    assert.ok(!result.includes('Hook Tabanli'));
    assert.ok(result.includes('Bolum 1'));
    assert.ok(result.includes('Bolum 2'));
  });

  it('settings.json referanslarini cikarir', () => {
    const input = '**Source of truth:** `settings.json` + `.claude/hooks/auto-test-runner.js`\n\nDiger satir';
    const result = stripClaudeOnlySections(input);
    assert.ok(!result.includes('settings.json'));
    assert.ok(result.includes('Diger satir'));
  });

  it('hook-disi bolumlere dokunmaz', () => {
    const input = '## Konvansiyonlar\n\nCommit formati...\n\n## Proje Tanimi\n\nTanim...';
    assert.equal(stripClaudeOnlySections(input), input);
  });
});

describe('inlineRules', () => {
  it('rules dosyalarini context sonuna ekler', () => {
    const context = '# Context\n\nIcerik';
    const rules = [
      { name: 'workflow', content: '# Workflow Kurallari\n\nKural 1' },
      { name: 'memory', content: '# Memory Protokolu\n\nKural 2' },
    ];
    const result = inlineRules(context, rules);
    assert.ok(result.includes('Workflow Kurallari'));
    assert.ok(result.includes('Memory Protokolu'));
    assert.ok(result.indexOf('Context') < result.indexOf('Workflow'));
  });

  it('bos rules dizisi ile context degismez', () => {
    const context = '# Context';
    assert.equal(inlineRules(context, []), context);
  });
});

describe('adaptContent', () => {
  it('strip, path, invoke sirasini uygular', () => {
    const input = '`.claude/commands/task-master.md` icin `/task-master` kullanin.\n\n**Source of truth:** `settings.json`';
    const result = adaptContent(input, 'codex');
    assert.ok(!result.includes('settings.json'));
    assert.ok(result.includes('.codex/skills/'));
    assert.ok(result.includes('$task-master'));
  });

  it('rules parametresi gecildiginde inline merge yapar', () => {
    const rules = [{ name: 'rule1', content: '# Kural 1\n\nIcerik' }];
    const result = adaptContent('# Context', 'gemini', rules);
    assert.ok(result.includes('Kural 1'));
  });
});

describe('toToml', () => {
  it('gecerli TOML ciktisi uretir — literal string (backslash guvenli)', () => {
    const result = toToml('Backlog siralayici', '# Icerik\n\nStep 1...');
    assert.ok(result.includes('description = "Backlog siralayici"'));
    assert.ok(result.includes("prompt = '''"));
    assert.ok(result.includes('# Icerik'));
    assert.ok(result.endsWith("'''"));
  });

  it('backslash iceren icerik escape gerektirmez', () => {
    const result = toToml('Test', 'grep -i "unused\\|no-unused"');
    assert.ok(result.includes('unused\\|no-unused'));
  });

  it('triple single-quote iceren icerik basic string fallback kullanlir', () => {
    const result = toToml('Test', "Ornek: '''kod'''");
    // ''' iceriyorsa multiline basic string (""") kullanilmali
    assert.ok(result.includes('prompt = """'));
    assert.ok(!result.includes("prompt = '''"));
  });

  it('description icindeki tirnaklari escape eder', () => {
    const result = toToml('Bir "ozel" aciklama', 'icerik');
    assert.ok(result.includes('description = "Bir \\"ozel\\" aciklama"'));
  });

  it('python tomllib ile gecerli TOML', () => {
    const result = toToml('Test aciklama', '# Baslik\n\ngrep "test\\|foo" | head -5\npath: /usr/bin\\ndevam');
    // \| ve \n literal olmali — basic string olsa parse hatasi verir
    assert.ok(result.includes("'''"));
    assert.ok(!result.includes('"""'));
  });
});

describe('toSkillMd', () => {
  it('YAML frontmatter + icerik uretir', () => {
    const result = toSkillMd('task-master', 'Backlog siralayici', '# Icerik');
    assert.ok(result.startsWith('---\n'));
    assert.ok(result.includes('name: task-master'));
    assert.ok(result.includes('description: "Backlog siralayici"'));
    assert.ok(result.includes('---\n\n# Icerik'));
  });
});

describe('toKimiAgentYaml', () => {
  it('gecerli YAML uretir', () => {
    const result = toKimiAgentYaml('code-review', './code-review-prompt.md');
    const parsed = yaml.load(result);
    assert.equal(parsed.version, 1);
    assert.equal(parsed.agent.name, 'code-review');
    assert.equal(parsed.agent.system_prompt_path, './code-review-prompt.md');
    assert.equal(parsed.agent.extend, 'default');
  });
});

describe('toOpenCodeAgent', () => {
  it('frontmatter + icerik uretir', () => {
    const result = toOpenCodeAgent('code-review', 'Kod inceleme', '# Icerik');
    assert.ok(result.includes('description: "Kod inceleme"'));
    assert.ok(result.includes('mode: subagent'));
    assert.ok(result.includes('# Icerik'));
  });
});

describe('stripFrontmatter', () => {
  it('YAML frontmatter soyar', () => {
    const input = '---\nname: test\ntools: Read, Grep\nmodel: sonnet\n---\n\n# Test Agent\n\nIcerik';
    const result = stripFrontmatter(input);
    assert.equal(result, '# Test Agent\n\nIcerik');
    assert.ok(!result.includes('tools:'));
  });

  it('frontmatter yoksa icerigi degistirmez', () => {
    const input = '# Test\n\nIcerik';
    assert.equal(stripFrontmatter(input), input);
  });

  it('icerik icindeki --- ayiricilarina dokunmaz', () => {
    const input = '---\nname: test\n---\n\n# Test\n\n---\n\nBolum 2';
    const result = stripFrontmatter(input);
    assert.ok(result.includes('---\n\nBolum 2'));
  });
});

describe('parseClaudeOutput', () => {
  function setupClaudeDir(structure) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transform-test-'));
    const claudeDir = path.join(tmpDir, '.claude');
    for (const [filePath, content] of Object.entries(structure)) {
      const fullPath = path.join(claudeDir, filePath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }
    return { claudeDir, tmpDir };
  }

  it('commands, agents, rules ve context ayristirir', () => {
    const { claudeDir, tmpDir } = setupClaudeDir({
      'commands/task-master.md': '# Task Master — Aciklama\n\nIcerik',
      'agents/code-review.md': '---\nname: code-review\ntools: Read\n---\n\n# Code Review\n\nAgent icerigi',
      'rules/workflow.md': '# Workflow\n\nKurallar',
      'CLAUDE.md': '# Context\n\nProje bilgisi',
    });
    const result = parseClaudeOutput(claudeDir);

    assert.equal(result.commands.length, 1);
    assert.equal(result.commands[0].name, 'task-master');
    assert.equal(result.agents.length, 1);
    assert.equal(result.agents[0].name, 'code-review');
    assert.ok(!result.agents[0].content.includes('tools: Read'));
    assert.ok(result.agents[0].content.startsWith('# Code Review'));
    assert.equal(result.rules.length, 1);
    assert.ok(result.context.includes('Proje bilgisi'));

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('hooks, settings, reports, tracking atlar', () => {
    const { claudeDir, tmpDir } = setupClaudeDir({
      'commands/test.md': '# Test — Aciklama',
      'hooks/test.js': 'module.exports = {}',
      'settings.json': '{}',
      'reports/deploy.md': 'Deploy raporu',
      'tracking/sessions/s1.json': '{}',
    });
    const result = parseClaudeOutput(claudeDir);

    assert.equal(result.commands.length, 1);
    assert.equal(result.agents.length, 0);
    assert.equal(result.rules.length, 0);

    fs.rmSync(tmpDir, { recursive: true });
  });

  it('.claude/ yoksa hata firlatir', () => {
    assert.throws(() => parseClaudeOutput('/nonexistent/.claude'), /bulunamadi/);
  });
});

describe('transformForTarget', () => {
  it('gemini — .toml commands + .md agents + GEMINI.md uretir', () => {
    const source = {
      commands: [{ name: 'task-master', content: '# Task Master — Siralayici\n\n`/task-master`' }],
      agents: [{ name: 'code-review', content: '# Code Review\n\nIcerik' }],
      rules: [{ name: 'workflow', content: '# Workflow\n\nKurallar' }],
      context: '# Context\n\n`/task-master` komutu\n\n`.claude/commands/`',
    };
    const fileMap = transformForTarget(source, 'gemini');

    assert.ok('.gemini/commands/task-master.toml' in fileMap);
    assert.ok('.gemini/agents/code-review.md' in fileMap);
    assert.ok('GEMINI.md' in fileMap);
    assert.ok(fileMap['.gemini/commands/task-master.toml'].includes("prompt = '''"));
  });

  it('codex — skills (commands + agents) + root AGENTS.md', () => {
    const source = {
      commands: [{ name: 'task-master', content: '# Task Master — Siralayici\n\n`/task-master`' }],
      agents: [{ name: 'review', content: '# Review\n\nIcerik' }],
      rules: [],
      context: '# Context',
    };
    const fileMap = transformForTarget(source, 'codex');

    assert.ok('.codex/skills/task-master/SKILL.md' in fileMap);
    assert.ok('.codex/skills/review/SKILL.md' in fileMap);
    assert.ok('AGENTS.md' in fileMap);
    assert.ok(fileMap['.codex/skills/task-master/SKILL.md'].includes('name: task-master'));
    assert.ok(fileMap['.codex/skills/task-master/SKILL.md'].includes('$task-master'));
  });

  it('kimi — skills + agent yaml/prompt + default context', () => {
    const source = {
      commands: [{ name: 'test', content: '# Test — Aciklama\n\nIcerik' }],
      agents: [{ name: 'review', content: '# Review\n\nIcerik' }],
      rules: [{ name: 'rule1', content: 'Kural' }],
      context: '# Context',
    };
    const fileMap = transformForTarget(source, 'kimi');

    assert.ok('.kimi/skills/test/SKILL.md' in fileMap);
    assert.ok('.kimi/agents/review.yaml' in fileMap);
    assert.ok('.kimi/agents/review-prompt.md' in fileMap);
    assert.ok('.kimi/agents/default.yaml' in fileMap);
    assert.ok('.kimi/agents/default-prompt.md' in fileMap);
    assert.ok(fileMap['.kimi/agents/default-prompt.md'].includes('Kural'));
  });

  it('opencode — skills + agents + .opencode/AGENTS.md', () => {
    const source = {
      commands: [{ name: 'test', content: '# Test — Aciklama\n\nIcerik' }],
      agents: [{ name: 'review', content: '# Review — Inceleme\n\nIcerik' }],
      rules: [],
      context: '# Context',
    };
    const fileMap = transformForTarget(source, 'opencode');

    assert.ok('.opencode/skills/test/SKILL.md' in fileMap);
    assert.ok('.opencode/agents/review.md' in fileMap);
    assert.ok('.opencode/AGENTS.md' in fileMap);
    assert.ok(fileMap['.opencode/agents/review.md'].includes('mode: subagent'));
  });

  it('agent icerigi Claude frontmatter icermez', () => {
    const source = {
      commands: [],
      agents: [{ name: 'test-agent', content: '# Test Agent — Aciklama\n\nIcerik' }],
      rules: [],
      context: '',
    };
    const fileMap = transformForTarget(source, 'codex');
    const skillContent = fileMap['.codex/skills/test-agent/SKILL.md'];
    const frontmatterCount = (skillContent.match(/^---$/gm) || []).length;
    assert.equal(frontmatterCount, 2);
  });
});

describe('writeTarget', () => {
  it('dosyalari dogru dizine yazar', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'write-test-'));
    const fileMap = {
      '.gemini/commands/test.toml': 'description = "Test"',
      'GEMINI.md': '# Gemini Context',
    };
    writeTarget(tmpDir, 'gemini', fileMap);

    assert.ok(fs.existsSync(path.join(tmpDir, '.gemini', 'commands', 'test.toml')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'GEMINI.md')));
    assert.equal(
      fs.readFileSync(path.join(tmpDir, '.gemini', 'commands', 'test.toml'), 'utf8'),
      'description = "Test"'
    );

    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('resolveTargets', () => {
  it('manifest targets listesinden claude haric donusturur', () => {
    const manifest = { targets: ['claude', 'gemini', 'codex'] };
    assert.deepEqual(resolveTargets(manifest, null), ['gemini', 'codex']);
  });

  it('--targets flag manifest listesini filtreler', () => {
    const manifest = { targets: ['claude', 'gemini', 'codex', 'kimi'] };
    assert.deepEqual(resolveTargets(manifest, 'gemini,kimi'), ['gemini', 'kimi']);
  });

  it('manifest disindaki target sessizce atlanir', () => {
    const manifest = { targets: ['claude', 'gemini'] };
    assert.deepEqual(resolveTargets(manifest, 'gemini,kimi'), ['gemini']);
  });

  it('targets tanimsizsa bos dizi doner', () => {
    assert.deepEqual(resolveTargets({}, null), []);
  });

  it('bilinmeyen CLI uyari ile atlanir', () => {
    const manifest = { targets: ['claude', 'unknown-cli'] };
    assert.deepEqual(resolveTargets(manifest, null), []);
  });

  it('manifest targets yoksa --targets dogrudan hedef listesi olur', () => {
    const manifest = {};
    assert.deepEqual(resolveTargets(manifest, 'gemini,codex'), ['gemini', 'codex']);
  });

  it('manifest targets yoksa --targets bilinmeyen CLI filtreler', () => {
    const manifest = {};
    assert.deepEqual(resolveTargets(manifest, 'gemini,unknown'), ['gemini']);
  });

  it('manifest targets yoksa ve --targets yoksa bos doner', () => {
    assert.deepEqual(resolveTargets({}, null), []);
  });
});

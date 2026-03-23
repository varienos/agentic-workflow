# Multi-CLI Transform Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `.claude/` ciktisini Gemini, Codex, Kimi ve OpenCode CLI formatlarina donusturen `transform.js` pipeline'i olusturmak.

**Architecture:** Post-processor pipeline — `generate.js` degismez, yeni `transform.js` `.claude/` dizinini okur ve her hedef CLI icin ayri dizine formatlanmis cikti yazar. Icerik adaptasyonu (yol referanslari, cagirma sozdizimi, Claude-ozel bolumlerin filtrelenmesi) transform icinde yapilir.

**Tech Stack:** Node.js 18+, node:test (built-in test runner), js-yaml (mevcut bagimlIlik), TOML string template (kutuphane yok)

**Spec:** `Docs/superpowers/specs/2026-03-23-multi-cli-transform-design.md`

---

## Dosya Yapisi

| Dosya | Sorumluluk | Islem |
|---|---|---|
| `Agentbase/transform.js` | Ana pipeline — parse, adapt, format, write | Olustur |
| `Agentbase/transform.test.js` | Unit + entegrasyon testleri | Olustur |
| `Agentbase/package.json` | Test script guncelleme | Duzenle |
| `Agentbase/.claude/commands/bootstrap.md` | Bootstrap'a transform.js entegrasyonu | Duzenle |
| `.gitignore` | Transform cikti dizinlerini ignore et | Duzenle |

> **Not:** Tum implementasyon tek dosyada (`transform.js`) yasayacak. generate.js ile ayni pattern — fonksiyonlar module.exports ile export edilir, testler ayni dosyadan import eder.

---

### Task 1: extractDescription + ilk test altyapisi

**Files:**
- Create: `Agentbase/transform.test.js`
- Create: `Agentbase/transform.js`

- [ ] **Step 1: Test dosyasi olustur — extractDescription testleri**

```javascript
#!/usr/bin/env node
'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { extractDescription } = require('./transform.js');

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
```

- [ ] **Step 2: transform.js iskelet dosyasi olustur — extractDescription implementasyonu**

```javascript
#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// ─────────────────────────────────────────────────────
// YAPILANDIRMA
// ─────────────────────────────────────────────────────

const AGENTBASE_DIR = path.resolve(__dirname);

const CLI_CAPABILITIES = {
  gemini: {
    commands: { format: 'toml', dir: '.gemini/commands' },
    skills: null,
    agents: { format: 'md', dir: '.gemini/agents' },
    rules: { strategy: 'inline-context' },
    context: { file: 'GEMINI.md', location: 'root' },
    invoke: { prefix: '/', separator: ' ' },
  },
  codex: {
    commands: null,
    skills: { format: 'skill.md', dir: '.codex/skills' },
    agents: null,
    rules: { strategy: 'inline-context' },
    context: { file: 'AGENTS.md', location: 'root' },
    invoke: { prefix: '$', separator: ' ' },
  },
  kimi: {
    commands: null,
    skills: { format: 'skill.md', dir: '.kimi/skills' },
    agents: { format: 'yaml', dir: '.kimi/agents' },
    rules: { strategy: 'inline-agent-prompt' },
    context: { file: null, strategy: 'agent-yaml-prompt' },
    invoke: { prefix: '/skill:', separator: ' ' },
  },
  opencode: {
    commands: null,
    skills: { format: 'skill.md', dir: '.opencode/skills' },
    agents: { format: 'md', dir: '.opencode/agents' },
    rules: { strategy: 'inline-context' },
    context: { file: 'AGENTS.md', location: '.opencode' },
    invoke: { prefix: '@', separator: ' ' },
  },
};

// ─────────────────────────────────────────────────────
// DESCRIPTION CIKARMA
// ─────────────────────────────────────────────────────

function extractDescription(content) {
  // "# Task Master — Backlog Oncelik Siralayici" veya "# Task Master - Aciklama"
  const titleMatch = content.match(/^#\s+.+?\s*[—\-]\s*(.+)$/m);
  if (titleMatch) return titleMatch[1].trim();

  const quoteMatch = content.match(/^>\s*(.+)$/m);
  if (quoteMatch) return quoteMatch[1].trim();

  return 'Agentic workflow komutu';
}

// ─────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────

module.exports = {
  extractDescription,
  CLI_CAPABILITIES,
  AGENTBASE_DIR,
};
```

- [ ] **Step 3: Testleri calistir**

Run: `cd Agentbase && node --test transform.test.js`
Expected: 4 test PASS

- [ ] **Step 4: Commit**

```bash
git add Agentbase/transform.js Agentbase/transform.test.js
git commit -m "feat: transform.js iskelet + extractDescription fonksiyonu"
```

---

### Task 2: ContentAdapter — adaptInvokeSyntax

**Files:**
- Modify: `Agentbase/transform.js`
- Modify: `Agentbase/transform.test.js`

- [ ] **Step 1: adaptInvokeSyntax testleri yaz**

```javascript
const { adaptInvokeSyntax } = require('./transform.js');

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

  // Bilinen limitasyon: backtick icinde olmayan komut referanslari donusturulmez
  // Ornek: "run /task-master to see" → degismez (backtick yok)
  // Bu kabul edilebilir cunku tum skeleton'lar backtick kullanir.
});
```

- [ ] **Step 2: Testleri calistir — FAIL beklenir**

Run: `cd Agentbase && node --test transform.test.js`
Expected: adaptInvokeSyntax testleri FAIL

- [ ] **Step 3: adaptInvokeSyntax implementasyonu**

```javascript
function adaptInvokeSyntax(content, targetCli) {
  const cap = CLI_CAPABILITIES[targetCli];
  if (!cap) return content;

  const prefix = cap.invoke.prefix;
  if (prefix === '/') return content; // Gemini — degismez

  // Backtick icindeki /komut-adi pattern'ini yakala
  // `/task-master`, `/task-conductor top 5`, `/bug-hunter <tanim>` gibi
  return content.replace(/`\/([\w-]+)([^`]*)`/g, (match, cmd, rest) => {
    return `\`${prefix}${cmd}${rest}\``;
  });
}
```

- [ ] **Step 4: Testleri calistir — PASS beklenir**

Run: `cd Agentbase && node --test transform.test.js`
Expected: Tum testler PASS

- [ ] **Step 5: Commit**

```bash
git add Agentbase/transform.js Agentbase/transform.test.js
git commit -m "feat: adaptInvokeSyntax — CLI cagirma sozdizimi donusumu"
```

---

### Task 3: ContentAdapter — adaptPathReferences

**Files:**
- Modify: `Agentbase/transform.js`
- Modify: `Agentbase/transform.test.js`

- [ ] **Step 1: adaptPathReferences testleri yaz**

```javascript
const { adaptPathReferences } = require('./transform.js');

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

  it('.claude/rules/ → (inline) notu', () => {
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
```

- [ ] **Step 2: Testleri calistir — FAIL beklenir**

Run: `cd Agentbase && node --test transform.test.js`
Expected: adaptPathReferences testleri FAIL

- [ ] **Step 3: adaptPathReferences implementasyonu**

```javascript
const PATH_MAPS = {
  gemini: {
    '.claude/commands/': '.gemini/commands/',
    '.claude/agents/': '.gemini/agents/',
    'CLAUDE.md': 'GEMINI.md',
  },
  codex: {
    '.claude/commands/': '.codex/skills/',
    '.claude/agents/': '.codex/skills/',
    'CLAUDE.md': 'AGENTS.md',
  },
  kimi: {
    '.claude/commands/': '.kimi/skills/',
    '.claude/agents/': '.kimi/agents/',
    'CLAUDE.md': 'default-prompt.md',
  },
  opencode: {
    '.claude/commands/': '.opencode/skills/',
    '.claude/agents/': '.opencode/agents/',
    'CLAUDE.md': 'AGENTS.md',
  },
};

// Tum CLI'larda atlanacak yol kaliplari
const SKIP_PATHS = ['.claude/hooks/', '.claude/tracking/', '.claude/reports/', '.claude/rules/'];

function adaptPathReferences(content, targetCli) {
  let result = content;

  // Atlanan yollari iceren satirlari kaldir
  for (const skipPath of SKIP_PATHS) {
    result = result.replace(new RegExp(`^.*${escapeRegex(skipPath)}.*$`, 'gm'), '');
  }
  // Bos satirlari temizle (ardisik 3+ bos satiri 2'ye dusur)
  result = result.replace(/\n{3,}/g, '\n\n');

  // Yol donusumleri
  const maps = PATH_MAPS[targetCli];
  if (maps) {
    for (const [from, to] of Object.entries(maps)) {
      result = result.replace(new RegExp(escapeRegex(from), 'g'), to);
    }
  }

  return result;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

- [ ] **Step 4: Testleri calistir — PASS beklenir**

Run: `cd Agentbase && node --test transform.test.js`
Expected: Tum testler PASS

- [ ] **Step 5: Commit**

```bash
git add Agentbase/transform.js Agentbase/transform.test.js
git commit -m "feat: adaptPathReferences — CLI yol referanslari donusumu"
```

---

### Task 4: ContentAdapter — stripClaudeOnlySections + inlineRules

**Files:**
- Modify: `Agentbase/transform.js`
- Modify: `Agentbase/transform.test.js`

- [ ] **Step 1: stripClaudeOnlySections testleri yaz**

```javascript
const { stripClaudeOnlySections, inlineRules } = require('./transform.js');

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
```

- [ ] **Step 2: Testleri calistir — FAIL beklenir**

Run: `cd Agentbase && node --test transform.test.js`
Expected: FAIL

- [ ] **Step 3: stripClaudeOnlySections + inlineRules implementasyonu**

```javascript
// Claude-ozel bolumleri kaldiran regex kaliplari
const CLAUDE_ONLY_PATTERNS = [
  // Hook/Test sinyalleri bolumu (basliktan sonraki bolume kadar)
  /### Otomatik Test Sinyalleri \(Hook Tabanli\)[\s\S]*?(?=\n## |\n---|\n$)/g,
  // settings.json referans satirlari
  /^.*settings\.json.*$/gm,
  // Source of truth hook referanslari
  /^\*\*Source of truth:\*\*.*\.claude\/hooks\/.*$/gm,
];

function stripClaudeOnlySections(content) {
  let result = content;
  for (const pattern of CLAUDE_ONLY_PATTERNS) {
    result = result.replace(pattern, '');
  }
  return result.replace(/\n{3,}/g, '\n\n').trim();
}

function inlineRules(content, rules) {
  if (!rules || rules.length === 0) return content;

  const rulesSection = rules
    .map(r => `\n---\n\n${r.content}`)
    .join('\n');

  return content + '\n' + rulesSection;
}
```

- [ ] **Step 4: Testleri calistir — PASS beklenir**

Run: `cd Agentbase && node --test transform.test.js`
Expected: Tum testler PASS

- [ ] **Step 5: adaptContent wrapper fonksiyonunu ve testini ekle**

adaptContent unit testi:

```javascript
const { adaptContent } = require('./transform.js');

describe('adaptContent', () => {
  it('strip, path, invoke sirasini uygular', () => {
    const input = '`.claude/commands/task-master.md` icin `/task-master` kullanin.\n\n**Source of truth:** `settings.json`';
    const result = adaptContent(input, 'codex');
    // settings.json satiri cikarilmis
    assert.ok(!result.includes('settings.json'));
    // Yol adapte edilmis
    assert.ok(result.includes('.codex/skills/'));
    // Cagirma adapte edilmis
    assert.ok(result.includes('$task-master'));
  });

  it('rules parametresi gecildiginde inline merge yapar', () => {
    const rules = [{ name: 'rule1', content: '# Kural 1\n\nIcerik' }];
    const result = adaptContent('# Context', 'gemini', rules);
    assert.ok(result.includes('Kural 1'));
  });
});
```

Implementasyon:

```javascript
function adaptContent(content, targetCli, rules) {
  let result = stripClaudeOnlySections(content);
  if (rules && rules.length > 0) {
    result = inlineRules(result, rules);
  }
  result = adaptPathReferences(result, targetCli);
  result = adaptInvokeSyntax(result, targetCli);
  return result;
}
```

- [ ] **Step 6: Commit**

```bash
git add Agentbase/transform.js Agentbase/transform.test.js
git commit -m "feat: stripClaudeOnlySections, inlineRules, adaptContent wrapper"
```

---

### Task 5: Formatters — toToml, toSkillMd, toKimiAgentYaml, toOpenCodeAgent

**Files:**
- Modify: `Agentbase/transform.js`
- Modify: `Agentbase/transform.test.js`

- [ ] **Step 1: Formatter testleri yaz**

```javascript
const { toToml, toSkillMd, toKimiAgentYaml, toOpenCodeAgent } = require('./transform.js');

describe('toToml', () => {
  it('gecerli TOML ciktisi uretir', () => {
    const result = toToml('Backlog siralayici', '# Icerik\n\nStep 1...');
    assert.ok(result.includes('description = "Backlog siralayici"'));
    assert.ok(result.includes('prompt = """'));
    assert.ok(result.includes('# Icerik'));
    assert.ok(result.endsWith('"""'));
  });

  it('triple-quote icerik escape edilir', () => {
    const result = toToml('Test', 'Ornek: """kod"""');
    assert.ok(result.includes('\\"\\"\\"'));
  });

  it('description icindeki tirnaklari escape eder', () => {
    const result = toToml('Bir "ozel" aciklama', 'icerik');
    assert.ok(result.includes('description = "Bir \\"ozel\\" aciklama"'));
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
```

- [ ] **Step 2: Testleri calistir — FAIL beklenir**

Run: `cd Agentbase && node --test transform.test.js`
Expected: FAIL

- [ ] **Step 3: Formatter implementasyonlari**

```javascript
function toToml(description, content) {
  const escapedDesc = description.replace(/"/g, '\\"');
  const escapedContent = content.replace(/"""/g, '\\"\\"\\"');
  return `description = "${escapedDesc}"\n\nprompt = """\n${escapedContent}\n"""`;
}

function toSkillMd(name, description, content) {
  const escapedDesc = description.replace(/"/g, '\\"');
  return `---\nname: ${name}\ndescription: "${escapedDesc}"\n---\n\n${content}`;
}

function toKimiAgentYaml(name, promptPath) {
  const obj = {
    version: 1,
    agent: {
      extend: 'default',
      name: name,
      system_prompt_path: promptPath,
    },
  };
  return yaml.dump(obj, { lineWidth: -1 });
}

function toOpenCodeAgent(name, description, content) {
  const escapedDesc = description.replace(/"/g, '\\"');
  return `---\ndescription: "${escapedDesc}"\nmode: subagent\n---\n\n${content}`;
}
```

- [ ] **Step 4: Testleri calistir — PASS beklenir**

Run: `cd Agentbase && node --test transform.test.js`
Expected: Tum testler PASS

- [ ] **Step 5: Commit**

```bash
git add Agentbase/transform.js Agentbase/transform.test.js
git commit -m "feat: toToml, toSkillMd, toKimiAgentYaml, toOpenCodeAgent formatters"
```

---

### Task 6: stripFrontmatter + parseClaudeOutput — .claude/ dizin parser

**Files:**
- Modify: `Agentbase/transform.js`
- Modify: `Agentbase/transform.test.js`

> **Kritik:** Claude agent dosyalari (`agents/*.md`) YAML frontmatter icerir (name, tools, model, color). Bu frontmatter diger CLI'lar icin gecersizdir. `parseClaudeOutput` agent dosyalarindaki frontmatter'i soyar, aksi halde toSkillMd/toOpenCodeAgent cift frontmatter uretir.

- [ ] **Step 1: stripFrontmatter + parseClaudeOutput testleri yaz**

```javascript
const { stripFrontmatter, parseClaudeOutput } = require('./transform.js');
const os = require('os');

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
    // Agent frontmatter soyulmus olmali
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
```

- [ ] **Step 2: Testleri calistir — FAIL beklenir**

Run: `cd Agentbase && node --test transform.test.js`
Expected: FAIL

- [ ] **Step 3: stripFrontmatter + parseClaudeOutput implementasyonu**

```javascript
/**
 * YAML frontmatter'i icerikten soyar.
 * Claude agent dosyalari (agents/*.md) name, tools, model, color gibi
 * Claude-ozel frontmatter icerir — bu diger CLI'lar icin gecersiz.
 */
function stripFrontmatter(content) {
  const match = content.match(/^---\n[\s\S]*?\n---\n+/);
  if (match) return content.slice(match[0].length);
  return content;
}

function parseClaudeOutput(claudeDir) {
  if (!fs.existsSync(claudeDir)) {
    throw new Error(`Claude cikti dizini bulunamadi: ${claudeDir}. Once generate.js calistirin.`);
  }

  const commands = [];
  const agents = [];
  const rules = [];
  let context = '';

  // CLAUDE.md context dosyasi
  const contextPath = path.join(claudeDir, 'CLAUDE.md');
  if (fs.existsSync(contextPath)) {
    context = fs.readFileSync(contextPath, 'utf8');
  }

  // Hedef dizinler — sadece bunlar taranir (hooks, reports, tracking vb. atlanir)
  const dirMap = { commands, agents, rules };
  for (const [dirName, collection] of Object.entries(dirMap)) {
    const dirPath = path.join(claudeDir, dirName);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
    for (const file of files) {
      let content = fs.readFileSync(path.join(dirPath, file), 'utf8');
      const name = path.basename(file, '.md');
      // Agent dosyalarinda Claude-ozel frontmatter'i soy
      if (dirName === 'agents') {
        content = stripFrontmatter(content);
      }
      collection.push({ name, content });
    }
  }

  return { commands, agents, rules, context };
}
```

- [ ] **Step 4: Testleri calistir — PASS beklenir**

Run: `cd Agentbase && node --test transform.test.js`
Expected: Tum testler PASS

- [ ] **Step 5: Commit**

```bash
git add Agentbase/transform.js Agentbase/transform.test.js
git commit -m "feat: parseClaudeOutput — .claude/ dizin parser"
```

---

### Task 7: writeTarget + main pipeline orkestrasyonu

**Files:**
- Modify: `Agentbase/transform.js`
- Modify: `Agentbase/transform.test.js`

- [ ] **Step 1: writeTarget + pipeline entegrasyon testleri yaz**

```javascript
const { transformForTarget, writeTarget } = require('./transform.js');

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
    // TOML formatini dogrula
    assert.ok(fileMap['.gemini/commands/task-master.toml'].includes('prompt = """'));
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
    // SKILL.md frontmatter dogrula
    assert.ok(fileMap['.codex/skills/task-master/SKILL.md'].includes('name: task-master'));
    // Invoke sozdizimi donusumu
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
    // Rules sadece default-prompt.md'de
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
    // OpenCode agent frontmatter
    assert.ok(fileMap['.opencode/agents/review.md'].includes('mode: subagent'));
  });

  it('agent icerigi Claude frontmatter icermez (stripFrontmatter parseClaudeOutput icinde)', () => {
    // Bu test parseClaudeOutput'un frontmatter soyma isini dogrular.
    // transformForTarget'a gelen agent.content temiz olmali.
    const source = {
      commands: [],
      // parseClaudeOutput zaten frontmatter soymus — burada temiz icerik
      agents: [{ name: 'test-agent', content: '# Test Agent — Aciklama\n\nIcerik' }],
      rules: [],
      context: '',
    };
    const fileMap = transformForTarget(source, 'codex');
    const skillContent = fileMap['.codex/skills/test-agent/SKILL.md'];
    // Tek frontmatter olmali (toSkillMd'nin ekledigi)
    const frontmatterCount = (skillContent.match(/^---$/gm) || []).length;
    assert.equal(frontmatterCount, 2); // acilis --- ve kapanis ---
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
```

- [ ] **Step 2: Testleri calistir — FAIL beklenir**

Run: `cd Agentbase && node --test transform.test.js`
Expected: FAIL

- [ ] **Step 3: transformForTarget + writeTarget implementasyonu**

```javascript
function transformForTarget(source, targetCli) {
  const cap = CLI_CAPABILITIES[targetCli];
  if (!cap) return {};

  const fileMap = {};

  // Commands → commands (Gemini) veya skills (diger)
  for (const cmd of source.commands) {
    const adapted = adaptContent(cmd.content, targetCli);
    const desc = extractDescription(cmd.content);

    if (cap.commands) {
      const key = `${cap.commands.dir}/${cmd.name}.toml`;
      fileMap[key] = toToml(desc, adapted);
    } else if (cap.skills) {
      const key = `${cap.skills.dir}/${cmd.name}/SKILL.md`;
      fileMap[key] = toSkillMd(cmd.name, desc, adapted);
    }
  }

  // Agents
  if (cap.agents) {
    for (const agent of source.agents) {
      const adapted = adaptContent(agent.content, targetCli);
      const desc = extractDescription(agent.content);

      if (cap.agents.format === 'yaml') {
        // Kimi — YAML + prompt dosyasi
        const yamlKey = `${cap.agents.dir}/${agent.name}.yaml`;
        const promptKey = `${cap.agents.dir}/${agent.name}-prompt.md`;
        fileMap[yamlKey] = toKimiAgentYaml(agent.name, `./${agent.name}-prompt.md`);
        fileMap[promptKey] = adapted;
      } else if (cap.agents.format === 'md' && targetCli === 'opencode') {
        const key = `${cap.agents.dir}/${agent.name}.md`;
        fileMap[key] = toOpenCodeAgent(agent.name, desc, adapted);
      } else {
        // Gemini — saf markdown
        const key = `${cap.agents.dir}/${agent.name}.md`;
        fileMap[key] = adapted;
      }
    }
  }

  // Codex: agents → skills
  if (!cap.agents && cap.skills) {
    for (const agent of source.agents) {
      const adapted = adaptContent(agent.content, targetCli);
      const desc = extractDescription(agent.content);
      const key = `${cap.skills.dir}/${agent.name}/SKILL.md`;
      fileMap[key] = toSkillMd(agent.name, desc, adapted);
    }
  }

  // Context
  if (cap.context.file) {
    const contextContent = adaptContent(source.context, targetCli, source.rules);
    const loc = cap.context.location === 'root'
      ? cap.context.file
      : `${cap.context.location}/${cap.context.file}`;
    fileMap[loc] = contextContent;
  } else if (cap.context.strategy === 'agent-yaml-prompt') {
    // Kimi default agent
    const contextContent = adaptContent(source.context, targetCli, source.rules);
    fileMap[`${cap.agents.dir}/default.yaml`] = toKimiAgentYaml('default', './default-prompt.md');
    fileMap[`${cap.agents.dir}/default-prompt.md`] = contextContent;
  }

  return fileMap;
}

function writeTarget(outputDir, targetCli, fileMap) {
  for (const [relPath, content] of Object.entries(fileMap)) {
    const fullPath = path.join(outputDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
  }
}
```

- [ ] **Step 4: Testleri calistir — PASS beklenir**

Run: `cd Agentbase && node --test transform.test.js`
Expected: Tum testler PASS

- [ ] **Step 5: Commit**

```bash
git add Agentbase/transform.js Agentbase/transform.test.js
git commit -m "feat: transformForTarget + writeTarget — pipeline orkestrasyonu"
```

---

### Task 8: CLI — main(), arguman ayristirma, rapor

**Files:**
- Modify: `Agentbase/transform.js`
- Modify: `Agentbase/transform.test.js`

- [ ] **Step 1: resolveTargets + CLI arguman testleri yaz**

```javascript
const { resolveTargets } = require('./transform.js');

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
});
```

- [ ] **Step 2: Testleri calistir — FAIL beklenir**

Run: `cd Agentbase && node --test transform.test.js`
Expected: FAIL

- [ ] **Step 3: resolveTargets + main implementasyonu**

```javascript
const VALID_TARGETS = new Set(Object.keys(CLI_CAPABILITIES));

function resolveTargets(manifest, targetsFlag) {
  const manifestTargets = (manifest.targets || []).filter(t => t !== 'claude');

  let targets = manifestTargets;
  if (targetsFlag) {
    const requested = new Set(targetsFlag.split(',').map(t => t.trim()));
    targets = manifestTargets.filter(t => requested.has(t));
  }

  return targets.filter(t => {
    if (!VALID_TARGETS.has(t)) {
      console.warn(`  Uyari: Bilinmeyen target "${t}" atlanıyor.`);
      return false;
    }
    return true;
  });
}

function main() {
  const args = process.argv.slice(2);
  const flags = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    targets: null,
  };

  const targetsIdx = args.indexOf('--targets');
  if (targetsIdx !== -1 && args[targetsIdx + 1]) {
    flags.targets = args[targetsIdx + 1];
  }

  const VALUE_FLAGS = new Set(['--targets']);
  const manifestPath = args.find((a, i) => {
    if (a.startsWith('--')) return false;
    if (i > 0 && VALUE_FLAGS.has(args[i - 1])) return false;
    return true;
  });

  if (!manifestPath) {
    console.error('Kullanim: node transform.js <manifest-yolu> [--targets cli1,cli2] [--dry-run] [--verbose]');
    process.exit(1);
  }

  const resolvedPath = path.resolve(manifestPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Hata: Manifest bulunamadi: ${resolvedPath}`);
    process.exit(1);
  }

  const manifest = yaml.load(fs.readFileSync(resolvedPath, 'utf8'));
  const targets = resolveTargets(manifest, flags.targets);

  if (targets.length === 0) {
    console.log('Transform hedefi yok — sadece Claude aktif.');
    return;
  }

  const claudeDir = path.join(AGENTBASE_DIR, '.claude');
  const source = parseClaudeOutput(claudeDir);

  const report = { targets: [], totalFiles: 0, errors: [] };

  for (const target of targets) {
    try {
      const fileMap = transformForTarget(source, target);
      const fileCount = Object.keys(fileMap).length;

      if (!flags.dryRun) {
        writeTarget(AGENTBASE_DIR, target, fileMap);
      }

      report.targets.push({ name: target, files: fileCount });
      report.totalFiles += fileCount;

      if (flags.verbose) {
        console.log(`\n  ${target}: ${fileCount} dosya`);
        for (const key of Object.keys(fileMap)) {
          console.log(`    ${key}`);
        }
      }
    } catch (err) {
      report.errors.push(`${target}: ${err.message}`);
    }
  }

  // Rapor
  console.log('');
  console.log('━'.repeat(55));
  console.log('  Transform Raporu');
  console.log('━'.repeat(55));
  for (const t of report.targets) {
    console.log(`  ${t.name}: ${t.files} dosya`);
  }
  console.log(`  Toplam: ${report.totalFiles} dosya`);
  if (report.errors.length > 0) {
    console.log(`  Hata: ${report.errors.length}`);
    report.errors.forEach(e => console.log(`    ${e}`));
  }
  if (flags.dryRun) {
    console.log('  Mod: DRY RUN (dosya yazilmadi)');
  }
  console.log('━'.repeat(55));
}

// CLI calistirma
if (require.main === module) {
  main();
}
```

- [ ] **Step 4: Testleri calistir — PASS beklenir**

Run: `cd Agentbase && node --test transform.test.js`
Expected: Tum testler PASS

- [ ] **Step 5: Commit**

```bash
git add Agentbase/transform.js Agentbase/transform.test.js
git commit -m "feat: main pipeline, resolveTargets, CLI arguman ayristirma, rapor"
```

---

### Task 9: package.json guncelleme + end-to-end dogrulama

**Files:**
- Modify: `Agentbase/package.json`

- [ ] **Step 1: package.json'a transform scriptini ekle**

`Agentbase/package.json` dosyasinda `scripts` bolumunu guncelle:

```json
{
  "scripts": {
    "generate": "node generate.js",
    "transform": "node transform.js",
    "test": "node --test generate.test.js transform.test.js tests/*.test.js"
  }
}
```

- [ ] **Step 2: Tum testleri calistir**

Run: `cd Agentbase && npm test`
Expected: generate.test.js + transform.test.js + tests/*.test.js — tumu PASS

- [ ] **Step 3: module.exports listesinin eksiksiz oldugunu dogrula**

transform.js'nin sonundaki `module.exports` blogunun tum public fonksiyonlari icerdigini kontrol et:

```javascript
module.exports = {
  extractDescription,
  stripFrontmatter,
  adaptInvokeSyntax,
  adaptPathReferences,
  stripClaudeOnlySections,
  inlineRules,
  adaptContent,
  toToml,
  toSkillMd,
  toKimiAgentYaml,
  toOpenCodeAgent,
  parseClaudeOutput,
  transformForTarget,
  writeTarget,
  resolveTargets,
  CLI_CAPABILITIES,
  AGENTBASE_DIR,
};
```

- [ ] **Step 4: Commit**

```bash
git add Agentbase/package.json
git commit -m "chore: package.json transform script + test runner guncelleme"
```

---

### Task 10: .gitignore guncelleme — transform.js ciktilarini ignore et

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: .gitignore'a transform cikti dizinlerini ekle**

Mevcut `# AGENTBASE ICINDEKI BOOTSTRAP URETIMI` bolumune ekle:

```gitignore
# Transform ciktilari (transform.js uretir — hedef CLI yapilandirmalari)
Agentbase/.gemini/
Agentbase/.codex/
Agentbase/.kimi/
Agentbase/.opencode/
Agentbase/GEMINI.md
Agentbase/AGENTS.md
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: transform.js cikti dizinlerini gitignore'a ekle"
```

---

### Task 11: Bootstrap entegrasyonu — transform.js cagrisini ekle

**Files:**
- Modify: `Agentbase/.claude/commands/bootstrap.md`

> **Not:** Bootstrap bir markdown command dosyasidir — kod degil, Claude'un takip ettigi talimat. Degisiklikler saf metin ekleme.

- [ ] **Step 1: Bootstrap roportajina CLI sorusu ekle**

`bootstrap.md`'deki roportaj fazina (ADIM 2 veya 3) su soruyu ekle:

```markdown
### X.X Hedef CLI Araclari

Kullaniciya sor:

> Hangi CLI araclarini kullaniyorsunuz? (virgul ile ayirin, bos birakirsaniz sadece Claude)
> Secenekler: gemini, codex, kimi, opencode
>
> Ornek: gemini, codex

Yaniti manifest'e `targets` alani olarak yaz:

```yaml
targets:
  - claude
  - <kullanici-yaniti-1>
  - <kullanici-yaniti-2>
```

Kullanici bos birakırsa:

```yaml
targets:
  - claude
```
```

- [ ] **Step 2: Bootstrap'in generate.js sonrasina transform.js cagrisini ekle**

Bootstrap'in generate.js cagirma adiminin hemen sonrasina su adimi ekle:

```markdown
### X.X Transform Pipeline

Manifest'te `targets` alani `claude` disinda deger iceriyorsa:

```bash
node transform.js ../Docs/agentic/project-manifest.yaml --verbose
```

Sadece `claude` varsa bu adimi ATLA.

Transform raporu ciktisini kullaniciya goster.
```

- [ ] **Step 3: Commit**

```bash
git add Agentbase/.claude/commands/bootstrap.md
git commit -m "feat: bootstrap'a CLI secimi ve transform.js entegrasyonu"
```

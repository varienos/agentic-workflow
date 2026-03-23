# Multi-CLI Transform Pipeline — Tasarim Dokumani

**Tarih:** 2026-03-23
**Durum:** Onaylandi
**Kapsam:** Agentbase skeleton ciktilarinin Gemini CLI, Codex CLI, Kimi CLI ve OpenCode CLI icin donusturulmesi

---

## 1. Problem

Agentbase'in `generate.js` scripti skeleton dosyalarini isleyerek sadece Claude Code icin cikti uretiyor (`.claude/` dizini). Kullanicilar ayni komutlari (`/task-master`, `/task-conductor` vb.) Gemini CLI, Codex CLI, Kimi CLI ve OpenCode CLI uzerinden de kullanmak istiyor. Her CLI aracinin kendi format ve dizin yapisi var.

## 2. Karar Ozeti

| Karar | Secim | Gerekce |
|---|---|---|
| Kapsam | 4 CLI ayni anda | Tek mimari karar, tek seferde |
| Hooks destegi | Sadece Claude | Diger CLI'larda hook mekanizmasi yok |
| Skeleton stratejisi | Tek skeleton, coklu cikti | DRY — is mantigi tek yerde |
| Context stratejisi | Tek context skeleton, CLI adaptasyonu | DRY — ortak icerik, CLI-ozel referanslar adapte edilir |
| Dizin izolasyonu | Her CLI'a tamamen ayri dizin | Proje bazli, birbirini etkilemez |
| Ozellik kapsamI | Her CLI'in destekledigi tum ozellikler | Commands, skills, agents, rules, context |
| Mimari yaklasim | Post-processor pipeline (transform.js) | generate.js'ye dokunulmaz |

## 3. Genel Mimari

```
Pipeline Akisi:

  manifest.yaml
       |
       v
  generate.js ----> Agentbase/.claude/   (mevcut — degismez)
                        |
                        v
                   transform.js ----> Agentbase/.gemini/
                                ----> Agentbase/.codex/
                                ----> Agentbase/.kimi/
                                ----> Agentbase/.opencode/
                                ----> Agentbase/GEMINI.md
                                ----> Agentbase/AGENTS.md
```

### Calistirma

```bash
# Mevcut akis — degismez
node generate.js Docs/agentic/project-manifest.yaml

# Yeni adim — generate sonrasi calisir
node transform.js Docs/agentic/project-manifest.yaml

# Belirli CLI'lar
node transform.js Docs/agentic/project-manifest.yaml --targets gemini,codex

# Dry run / verbose
node transform.js Docs/agentic/project-manifest.yaml --dry-run --verbose
```

### Bootstrap Entegrasyonu

Bootstrap komutu generate.js cagrisindan sonra otomatik olarak transform.js'yi de cagirir. Roportaja "Hangi CLI araclarini kullaniyorsunuz?" sorusu eklenir.

## 4. Dosya Donusum Haritasi

### 4.1 Commands -> Skills/Commands

| Kaynak (Claude) | Gemini | Codex | Kimi | OpenCode |
|---|---|---|---|---|
| `.claude/commands/X.md` | `.gemini/commands/X.toml` | `.codex/skills/X/SKILL.md` | `.kimi/skills/X/SKILL.md` | `.opencode/skills/X/SKILL.md` |

### 4.2 Agents

| Kaynak (Claude) | Gemini | Codex | Kimi | OpenCode |
|---|---|---|---|---|
| `.claude/agents/X.md` | `.gemini/agents/X.md` | `.codex/skills/X/SKILL.md` | `.kimi/agents/X.yaml` + `X-prompt.md` | `.opencode/agents/X.md` |

- Codex'te agent tanimi yok — agent'lar da skill'e donusur
- Kimi'de agent = YAML + ayri prompt dosyasi

### 4.3 Rules

| Kaynak (Claude) | Gemini | Codex | Kimi | OpenCode |
|---|---|---|---|---|
| `.claude/rules/*.md` | Context'e inline | AGENTS.md'ye inline | Agent prompt'a inline | AGENTS.md'ye inline |

Rules dosyalari sadece Claude'da ayri dosya. Diger CLI'larda context dosyasina inline merge edilir.

### 4.4 Hooks & Settings

| Kaynak (Claude) | Diger CLI'lar |
|---|---|
| `.claude/hooks/*.js` | **Atlanir** |
| `.claude/settings.json` | **Atlanir** |

### 4.5 Context Dosyasi

| Kaynak (Claude) | Gemini | Codex | Kimi | OpenCode |
|---|---|---|---|---|
| `.claude/CLAUDE.md` | `GEMINI.md` (root) | `AGENTS.md` (root) | `.kimi/agents/default.yaml` + `default-prompt.md` | `.opencode/AGENTS.md` |

## 5. Icerik Adaptasyonu

### 5.1 Cagirma Sozdizimi Donusumleri

| Pattern (Claude) | Gemini | Codex | Kimi | OpenCode |
|---|---|---|---|---|
| `/task-master` | `/task-master` | `$task-master` | `/skill:task-master` | `@task-master` |
| `/task-conductor top 5` | `/task-conductor top 5` | `$task-conductor top 5` | `/skill:task-conductor top 5` | `@task-conductor top 5` |

### 5.2 Yol Referanslari Donusumleri

| Pattern (Claude) | Gemini | Codex | Kimi | OpenCode |
|---|---|---|---|---|
| `.claude/commands/` | `.gemini/commands/` | `.codex/skills/` | `.kimi/skills/` | `.opencode/skills/` |
| `.claude/agents/` | `.gemini/agents/` | `.codex/skills/` | `.kimi/agents/` | `.opencode/agents/` |
| `.claude/rules/` | *(inline)* | *(inline)* | *(inline)* | *(inline)* |
| `.claude/hooks/` | *(atlanir)* | *(atlanir)* | *(atlanir)* | *(atlanir)* |
| `.claude/tracking/` | `.gemini/tracking/` | `.codex/tracking/` | `.kimi/tracking/` | `.opencode/tracking/` |

### 5.3 CLI-Ozel Bolum Filtreleme

Context dosyasinda:
- Hooks / Test Sinyalleri politikasi → **cikarilir** (tum CLI'lar)
- settings.json referanslari → **cikarilir** (tum CLI'lar)
- Kullanilabilir Komutlar tablosu → sozdizimi adapte edilir
- Rules referanslari → icerik inline merge edilir
- Calisma Dizinleri bolumu → yollar adapte edilir

### 5.4 Donusum Uygulama Sirasi

```
1. Kaynak dosyayi oku (.claude/ altindan)
2. Hooks/settings referanslarini filtrele (Claude-only bolumler)
3. Rules dosyalarini inline merge et (diger CLI'lar icin)
4. Yol referanslarini adapte et (.claude/ -> .{cli}/)
5. Cagirma sozdizimini adapte et (/cmd -> $cmd, /skill:cmd, @cmd)
6. Hedef formata sar (TOML wrapper, YAML frontmatter, agent YAML)
7. Hedef dizine yaz
```

## 6. Manifest Entegrasyonu

### 6.1 Yeni `targets` Alani

```yaml
targets:
  - claude       # her zaman — generate.js uretir
  - gemini
  - codex
  - kimi
  - opencode
```

- `targets` tanimsizsa → sadece `claude` (geriye uyumlu)
- `targets: [claude]` → transform.js calismaz

### 6.2 CLI Kabiliyet Haritasi

```javascript
const CLI_CAPABILITIES = {
  gemini: {
    commands: { format: 'toml', dir: '.gemini/commands' },
    skills:  { format: 'skill.md', dir: '.gemini/skills' },
    agents:  { format: 'md', dir: '.gemini/agents' },
    rules:   { strategy: 'inline-context' },
    context: { file: 'GEMINI.md', location: 'root' },
    invoke:  { prefix: '/', separator: ' ' },
  },
  codex: {
    commands: null,
    skills:  { format: 'skill.md', dir: '.codex/skills' },
    agents:  null,
    rules:   { strategy: 'inline-context' },
    context: { file: 'AGENTS.md', location: 'root' },
    invoke:  { prefix: '$', separator: ' ' },
  },
  kimi: {
    commands: null,
    skills:  { format: 'skill.md', dir: '.kimi/skills' },
    agents:  { format: 'yaml', dir: '.kimi/agents' },
    rules:   { strategy: 'inline-agent-prompt' },
    context: { file: null, strategy: 'agent-yaml-prompt' },
    invoke:  { prefix: '/skill:', separator: ' ' },
  },
  opencode: {
    commands: null,
    skills:  { format: 'skill.md', dir: '.opencode/skills' },
    agents:  { format: 'md', dir: '.opencode/agents' },
    rules:   { strategy: 'inline-context' },
    context: { file: 'AGENTS.md', location: '.opencode' },
    invoke:  { prefix: '@', separator: ' ' },
  },
};
```

## 7. Cikti Dizin Yapisi

```
Agentbase/
|
+-- .claude/                          # generate.js uretir (mevcut)
|   +-- commands/
|   |   +-- task-master.md
|   |   +-- task-conductor.md
|   |   +-- ...
|   +-- agents/
|   |   +-- code-review.md
|   |   +-- ...
|   +-- rules/
|   |   +-- workflow-lifecycle.md
|   |   +-- ...
|   +-- hooks/
|   |   +-- auto-test-runner.js
|   |   +-- ...
|   +-- CLAUDE.md
|   +-- settings.json
|
+-- .gemini/                          # transform.js uretir
|   +-- commands/
|   |   +-- task-master.toml
|   |   +-- task-conductor.toml
|   |   +-- ...
|   +-- skills/
|   +-- agents/
|   |   +-- code-review.md
|   |   +-- ...
|   +-- tracking/
|
+-- .codex/                           # transform.js uretir
|   +-- skills/
|       +-- task-master/
|       |   +-- SKILL.md
|       +-- task-conductor/
|       |   +-- SKILL.md
|       +-- code-review/
|       |   +-- SKILL.md
|       +-- ...
|
+-- .kimi/                            # transform.js uretir
|   +-- skills/
|   |   +-- task-master/
|   |   |   +-- SKILL.md
|   |   +-- task-conductor/
|   |   |   +-- SKILL.md
|   |   +-- ...
|   +-- agents/
|       +-- default.yaml
|       +-- default-prompt.md
|       +-- code-review.yaml
|       +-- code-review-prompt.md
|
+-- .opencode/                        # transform.js uretir
|   +-- skills/
|   |   +-- task-master/
|   |   |   +-- SKILL.md
|   |   +-- task-conductor/
|   |   |   +-- SKILL.md
|   |   +-- ...
|   +-- agents/
|   |   +-- code-review.md
|   |   +-- ...
|   +-- AGENTS.md
|
+-- GEMINI.md                         # transform.js uretir (root)
+-- AGENTS.md                         # transform.js uretir (root — Codex)
|
+-- generate.js                       # mevcut — degismez
+-- transform.js                      # yeni
+-- transform.test.js                 # yeni
+-- package.json
+-- templates/                        # mevcut — degismez
```

## 8. transform.js Ic Yapisi

### 8.1 Modul Yapisi

```
transform.js
|
+-- parseClaudeOutput(claudeDir)
|     .claude/ dizinini okur, dosya tiplerini siniflandirir
|     return { commands[], agents[], rules[], context }
|
+-- ContentAdapter
|   +-- adaptInvokeSyntax(content, targetCli)
|   +-- adaptPathReferences(content, targetCli)
|   +-- stripClaudeOnlySections(content)
|   +-- inlineRules(content, rules[])
|
+-- Formatters
|   +-- toToml(name, description, content)
|   +-- toSkillMd(name, description, content)
|   +-- toKimiAgentYaml(name, promptPath)
|   +-- toOpenCodeAgent(name, description, content)
|
+-- extractDescription(commandContent)
|     Oncelik 1: "# Baslik — Aciklama" formatindan
|     Oncelik 2: Blockquote (> ile baslayan satir)
|     Oncelik 3: Dosya adindan uret
|
+-- Writer
|   +-- writeTarget(outputDir, cli, fileMap)
|
+-- main()
      Manifest oku -> .claude/ parse et -> her target icin donustur -> yaz -> rapor
```

### 8.2 Ana Akis

```javascript
function main() {
  const manifest = readManifest(manifestPath);
  const targets = manifest.targets?.filter(t => t !== 'claude') || [];

  if (targets.length === 0) return;

  const source = parseClaudeOutput(claudeDir);

  for (const target of targets) {
    const cap = CLI_CAPABILITIES[target];
    const fileMap = {};

    // Commands -> skills/commands
    for (const cmd of source.commands) {
      const adapted = adaptContent(cmd.content, target);
      if (cap.commands) fileMap[commandPath(cap, cmd.name)] = formatCommand(cap, cmd.name, adapted);
      if (cap.skills)  fileMap[skillPath(cap, cmd.name)]   = formatSkill(cap, cmd.name, adapted);
    }

    // Agents
    if (cap.agents) {
      for (const agent of source.agents) {
        const adapted = adaptContent(agent.content, target);
        fileMap[agentPath(cap, agent.name)] = formatAgent(cap, agent.name, adapted);
      }
    }
    // Codex: agents -> skills donusumu
    if (!cap.agents && cap.skills) {
      for (const agent of source.agents) {
        const adapted = adaptContent(agent.content, target);
        fileMap[skillPath(cap, agent.name)] = formatSkill(cap, agent.name, adapted);
      }
    }

    // Context (rules inline merge)
    if (cap.context.file) {
      fileMap[contextPath(cap)] = buildContext(source.context, source.rules, target);
    }
    if (cap.context.strategy === 'agent-yaml-prompt') {
      const { yaml, prompt } = buildKimiDefault(source.context, source.rules);
      fileMap['.kimi/agents/default.yaml'] = yaml;
      fileMap['.kimi/agents/default-prompt.md'] = prompt;
    }

    writeTarget(AGENTBASE_DIR, target, fileMap);
  }

  printReport(targets);
}
```

### 8.3 Description Cikarma

```javascript
function extractDescription(content) {
  // "# Task Master — Backlog Oncelik Siralayici"
  const titleMatch = content.match(/^#\s+.+?\s*—\s*(.+)$/m);
  if (titleMatch) return titleMatch[1].trim();

  // "> Backlog'daki tum gorevleri puanlar..."
  const quoteMatch = content.match(/^>\s*(.+)$/m);
  if (quoteMatch) return quoteMatch[1].trim();

  return 'Agentic workflow komutu';
}
```

### 8.4 Hata Yonetimi

- `.claude/` dizini yoksa → hata: "Once generate.js calistirin"
- Manifest'te tanimsiz target → uyari ve atla
- Donusum basarisiz olan dosya → logla, digerlerine devam et
- Rapor ciktisi generate.js ile ayni formatta

## 9. Test Stratejisi

### 9.1 Birim Testleri

**ContentAdapter:**
- adaptInvokeSyntax: her CLI icin dogru donusum
- adaptPathReferences: .claude/ -> .{cli}/ yol donusumleri
- stripClaudeOnlySections: hooks/settings cikarilir, diger bolumler korunur
- inlineRules: rules dosyalari context'e merge edilir

**Formatters:**
- toToml: gecerli TOML ciktisi, cok satirli prompt escape
- toSkillMd: YAML frontmatter + markdown yapisi
- toKimiAgentYaml: gecerli YAML, system_prompt_path dogru
- toOpenCodeAgent: frontmatter alanlari tam

**extractDescription:**
- "# Baslik — Aciklama" formatindan cikarir
- Blockquote'tan cikarir (fallback)
- Dosya adindan uretir (son fallback)

### 9.2 Entegrasyon Testleri

- Ornek manifest + .claude/ ciktisi -> tum target dizinleri olusur
- Her target dizininde beklenen dosya sayisi dogru
- Gemini .toml dosyalari parseable
- SKILL.md frontmatter'lari gecerli YAML
- Kimi agent YAML'lari gecerli
- Context dosyalarinda .claude/ referansi kalmamis
- Context dosyalarinda hooks/settings referansi kalmamis
- --targets filtresi sadece belirtilen CLI'lari uretir
- --dry-run hicbir dosya yazmaz

### 9.3 Snapshot Testi

Referans manifest ile tum CLI ciktilarinin snapshot'i tutulur. Degisiklik oldugunda diff ile kontrol edilir.

### 9.4 Test Altyapisi

Mevcut generate.test.js ile ayni altyapi — yeni bagimlIlik eklenmez.

## 10. Kaynak Arastirma Referanslari

CLI dokumantasyonlari (tasarim sirasinda arastirilan):

- [Kimi CLI Skills](https://moonshotai.github.io/kimi-cli/en/customization/skills.html)
- [Kimi CLI Agents](https://moonshotai.github.io/kimi-cli/en/customization/agents.html)
- [Gemini CLI Custom Commands](https://geminicli.com/docs/cli/custom-commands/)
- [Gemini CLI Creating Skills](https://geminicli.com/docs/cli/creating-skills/)
- [Codex CLI Skills](https://developers.openai.com/codex/skills)
- [Codex CLI AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- [OpenCode Rules](https://opencode.ai/docs/rules/)
- [OpenCode Agents](https://opencode.ai/docs/agents/)

Yerel kurulumlar (dogrulanan versiyonlar):
- Kimi CLI: 1.24.0
- Codex CLI: 0.116.0
- Gemini CLI: 0.34.0
- OpenCode: 1.3.0

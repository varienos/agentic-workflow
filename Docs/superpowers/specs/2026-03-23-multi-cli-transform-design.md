# Multi-CLI Transform Pipeline — Tasarim Dokumani

**Tarih:** 2026-03-23
**Durum:** Onaylandi (rev.1 — spec review bulgulari duzeltildi)
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
                                ----> Agentbase/AGENTS.md  (Codex context)
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

### 4.1 Commands -> Commands/Skills

Claude commands → Gemini'de **command** (TOML, kullanici `/` ile tetikler), diger CLI'larda **skill** (SKILL.md, otomatik veya explicit tetiklenir).

| Kaynak (Claude) | Gemini | Codex | Kimi | OpenCode |
|---|---|---|---|---|
| `.claude/commands/X.md` | `.gemini/commands/X.toml` | `.codex/skills/X/SKILL.md` | `.kimi/skills/X/SKILL.md` | `.opencode/skills/X/SKILL.md` |

> **Not:** Gemini'de commands (TOML) ve skills (SKILL.md) farkli mekanizmalar. Commands kullanici tarafindan `/` ile tetiklenir, skills lazy-load ile otomatik aktive olur. Claude command'lari Gemini **commands**'a donusur — skills dizinine yazilmaz.

### 4.2 Agents

| Kaynak (Claude) | Gemini | Codex | Kimi | OpenCode |
|---|---|---|---|---|
| `.claude/agents/X.md` | `.gemini/agents/X.md` | `.codex/skills/X/SKILL.md` | `.kimi/agents/X.yaml` + `X-prompt.md` | `.opencode/agents/X.md` |

- Codex'te agent tanimi yok — agent'lar da skill'e donusur
- Kimi'de agent = YAML + ayri prompt dosyasi (system_prompt_path referansi)

### 4.3 Rules

| Kaynak (Claude) | Gemini | Codex | Kimi | OpenCode |
|---|---|---|---|---|
| `.claude/rules/*.md` | GEMINI.md'ye inline | AGENTS.md'ye inline | Sadece `default-prompt.md`'ye inline | .opencode/AGENTS.md'ye inline |

Rules dosyalari sadece Claude'da ayri dosya. Diger CLI'larda context dosyasina inline merge edilir.

> **Kimi ozel durumu:** Rules sadece `default-prompt.md`'ye (default agent) merge edilir. Diger agent prompt dosyalari (code-review-prompt.md vb.) kendi icerikleriyle kalir — rules tekrarlanmaz.

### 4.4 Atlanan Dosyalar

| Kaynak (Claude) | Diger CLI'lar | Gerekce |
|---|---|---|
| `.claude/hooks/*.js` | **Atlanir** | Claude-ozel mekanizma |
| `.claude/settings.json` | **Atlanir** | Claude-ozel yapilandirma |
| `.claude/reports/` | **Atlanir** | Claude runtime verisi (deploy raporlari) |
| `.claude/tracking/sessions/` | **Atlanir** | Claude runtime verisi (oturum takibi) |

### 4.5 Context Dosyasi

| Kaynak (Claude) | Gemini | Codex | Kimi | OpenCode |
|---|---|---|---|---|
| `.claude/CLAUDE.md` | `GEMINI.md` (root) | `AGENTS.md` (root) | `.kimi/agents/default.yaml` + `default-prompt.md` | `.opencode/AGENTS.md` |

> **Not:** generate.js `CLAUDE.md.skeleton`'i `.claude/CLAUDE.md` yoluna yazar (bkz. generate.js:1452 `resolveOutputPath`). transform.js bu dosyayi `.claude/CLAUDE.md`'den okur.

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
| `.claude/tracking/` | *(atlanir)* | *(atlanir)* | *(atlanir)* | *(atlanir)* |
| `.claude/reports/` | *(atlanir)* | *(atlanir)* | *(atlanir)* | *(atlanir)* |

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

**`--targets` CLI flag onceligi:** Manifest'te `targets` alani varsa CLI flag bu listeyi filtreler. Manifest'te `targets` alani YOKSA `--targets` dogrudan hedef listesi olarak kullanilir — bu, mevcut projelerin manifest degistirmeden transform calistirmasina olanak tanir. Ornek: `node transform.js manifest.yaml --targets gemini,codex`

### 6.2 CLI Kabiliyet Haritasi

```javascript
const CLI_CAPABILITIES = {
  gemini: {
    commands: { format: 'toml', dir: '.gemini/commands' },
    skills:  null,  // Claude commands → Gemini commands (TOML), skills kullanilmaz
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
    rules:   { strategy: 'inline-agent-prompt' },  // sadece default agent'a merge
    context: { file: null, strategy: 'agent-yaml-prompt' },  // file ve strategy karsilikli ozel
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

> **Not:** `context.file` ve `context.strategy` karsilikli ozeldir. Bir CLI icin sadece biri tanimlanir. Kod `else if` ile kontrol eder.

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
|   +-- agents/
|   |   +-- code-review.md
|   |   +-- ...
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

## 8. Cikti Format Ornekleri

### 8.0.1 Gemini TOML Command Ornegi

Kaynak: `.claude/commands/task-master.md`

Cikti: `.gemini/commands/task-master.toml`

```toml
description = "Backlog'daki gorevleri 4 boyutlu puanlama ile degerlendirir ve oncelik sirasi olusturur"

prompt = """
# Task Master — Backlog Oncelik Siralayici

> Backlog'daki tum gorevleri 4 boyutlu puanlama ile degerlendirir ve oncelik sirasi olusturur.
> Kullanim: `/task-master`

---

## Step 1 — Gorevleri Topla
...
(tum icerik — yol ve cagirma referanslari Gemini formatina adapte edilmis)
"""
```

> **TOML serializasyon notu:** TOML ciktisi string template ile uretilir (kutuphane gerektirmez). Varsayilan olarak multiline literal string (`'''`) kullanilir — backslash escape yorumlanmaz, icerik oldugu gibi korunur. Icerik `'''` dizisi iceriyorsa otomatik olarak multiline basic string (`"""`) formatina fallback yapilir ve backslash + cift tirnak escape edilir.

### 8.0.2 SKILL.md Ornegi (Codex/Kimi/OpenCode)

Kaynak: `.claude/commands/task-master.md`

Cikti: `.codex/skills/task-master/SKILL.md`

```markdown
---
name: task-master
description: "Backlog'daki gorevleri 4 boyutlu puanlama ile degerlendirir ve oncelik sirasi olusturur"
---

# Task Master — Backlog Oncelik Siralayici

> Backlog'daki tum gorevleri 4 boyutlu puanlama ile degerlendirir ve oncelik sirasi olusturur.
> Kullanim: `$task-master`

---

## Step 1 — Gorevleri Topla
...
(tum icerik — yol ve cagirma referanslari Codex formatina adapte edilmis)
```

**SKILL.md frontmatter alanlari (tum CLI'lar icin ayni):**

| Alan | Zorunlu | Aciklama |
|---|---|---|
| `name` | Evet | Skill adi, kucuk harf + tire (task-master) |
| `description` | Evet | Tek satirlik aciklama — CLI'in skill'i ne zaman tetikleyecegini belirler |

> **Not:** `name` ve `description` tum CLI'larin (Codex, Kimi, OpenCode) ortaklasa destekledigi minimum frontmatter. Ek alanlar (version, tags, license vb.) CLI'a ozeldir ve bu asamada eklenmez — ihtiyac olursa genisletilebilir.

### 8.0.3 Kimi Agent YAML Ornegi

Kaynak: `.claude/agents/code-review.md`

Cikti: `.kimi/agents/code-review.yaml` + `.kimi/agents/code-review-prompt.md`

**code-review.yaml:**
```yaml
version: 1
agent:
  extend: default
  name: code-review
  system_prompt_path: ./code-review-prompt.md
```

**code-review-prompt.md:**
```markdown
(Claude agent iceriginin tamami — yol ve cagirma referanslari Kimi formatina adapte edilmis)
```

**Kimi agent YAML alanlari:**

| Alan | Zorunlu | Aciklama |
|---|---|---|
| `version` | Evet | Her zaman `1` |
| `agent.extend` | Hayir | `default` ile miras alinir (tool listesi vb.) |
| `agent.name` | Evet | Agent adi |
| `agent.system_prompt_path` | Evet | Prompt dosyasinin goreceli yolu: `./${name}-prompt.md` |

### 8.0.4 OpenCode Agent Ornegi

Kaynak: `.claude/agents/code-review.md`

Cikti: `.opencode/agents/code-review.md`

```markdown
---
description: "Kod degisikliklerini kalite, guvenlik ve proje standartlarina gore inceler"
mode: subagent
---

(Claude agent iceriginin tamami — yol ve cagirma referanslari OpenCode formatina adapte edilmis)
```

**OpenCode agent frontmatter alanlari:**

| Alan | Zorunlu | Aciklama |
|---|---|---|
| `description` | Evet | Agent amaci |
| `mode` | Evet | `subagent` (alt agent olarak calisir) |

---

## 9. transform.js Ic Yapisi

### 9.0 Bagimliliklar

- **js-yaml** — mevcut (manifest okuma, SKILL.md frontmatter uretimi)
- **TOML** — yeni kutuphane GEREKMEZ. TOML ciktisi string template ile uretilir (bkz. 8.0.1)

### 9.1 Modul Yapisi

```
transform.js
|
+-- parseClaudeOutput(claudeDir)
|     .claude/ dizinini okur, dosya tiplerini siniflandirir
|     hooks/, settings.json, reports/, tracking/ atlanir
|     return { commands[], agents[], rules[], context }
|
+-- adaptContent(content, targetCli)
|     Bes adimdaki donusumu siraliyla uygulayan wrapper fonksiyon:
|     1. stripClaudeOnlySections(content)
|     2. inlineRules(content, rules[])       — sadece context icin
|     3. adaptPathReferences(content, targetCli)
|     4. adaptInvokeSyntax(content, targetCli)
|     5. return adapte edilmis content
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

### 9.2 Ana Akis

```javascript
function main() {
  const manifest = readManifest(manifestPath);
  const targets = manifest.targets?.filter(t => t !== 'claude') || [];

  if (targets.length === 0) return;

  const source = parseClaudeOutput(claudeDir);

  for (const target of targets) {
    const cap = CLI_CAPABILITIES[target];
    const fileMap = {};

    // Commands -> commands (Gemini) veya skills (diger CLI'lar)
    for (const cmd of source.commands) {
      const adapted = adaptContent(cmd.content, target);
      if (cap.commands) {
        fileMap[commandPath(cap, cmd.name)] = formatCommand(cap, cmd.name, adapted);
      } else if (cap.skills) {
        fileMap[skillPath(cap, cmd.name)] = formatSkill(cap, cmd.name, adapted);
      }
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

    // Context (rules inline merge) — file ve strategy karsilikli ozel
    if (cap.context.file) {
      fileMap[contextPath(cap)] = buildContext(source.context, source.rules, target);
    } else if (cap.context.strategy === 'agent-yaml-prompt') {
      const { yaml, prompt } = buildKimiDefault(source.context, source.rules);
      fileMap['.kimi/agents/default.yaml'] = yaml;
      fileMap['.kimi/agents/default-prompt.md'] = prompt;
    }

    writeTarget(AGENTBASE_DIR, target, fileMap);
  }

  printReport(targets);
}
```

### 9.3 Description Cikarma

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

### 9.4 Hata Yonetimi

- `.claude/` dizini yoksa → hata: "Once generate.js calistirin"
- Manifest'te tanimsiz target → uyari ve atla
- Donusum basarisiz olan dosya → logla, digerlerine devam et
- Rapor ciktisi generate.js ile ayni formatta

## 10. Test Stratejisi

### 10.1 Birim Testleri

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

### 10.2 Entegrasyon Testleri

- Ornek manifest + .claude/ ciktisi -> tum target dizinleri olusur
- Her target dizininde beklenen dosya sayisi dogru
- Gemini .toml dosyalari parseable
- SKILL.md frontmatter'lari gecerli YAML
- Kimi agent YAML'lari gecerli
- Context dosyalarinda .claude/ referansi kalmamis
- Context dosyalarinda hooks/settings referansi kalmamis
- --targets filtresi sadece belirtilen CLI'lari uretir
- --dry-run hicbir dosya yazmaz

### 10.3 Snapshot Testi

Referans manifest ile tum CLI ciktilarinin snapshot'i tutulur. Degisiklik oldugunda diff ile kontrol edilir.

### 10.4 Test Altyapisi

Mevcut generate.test.js ile ayni altyapi — yeni bagimlIlik eklenmez.

## 11. Kaynak Arastirma Referanslari

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

# 3. Parti Eklenti Referansları

Bootstrap sırasında Opus, proje ihtiyacına göre bu listeden uygun eklentileri önerir.

---

## Ekleme Şablonu

Yeni eklenti eklerken bu formatı kullan:

```markdown
| Ad | Repo | Agent | Kategori | Açıklama |
|---|---|---|---|---|
| **İsim** | [repo-adi](https://github.com/org/repo) | Claude/Gemini/Codex/Hepsi | Kategori | Tek satir aciklama |
```

---

## Skills / Commands

| Ad | Repo | Agent | Açıklama |
|---|---|---|---|
| **Superpowers** | [obra/superpowers](https://github.com/obra/superpowers) | Claude | Planlama, review, TDD ve debug için yapılandırılmış geliştirme yaşam döngüsü |
| **Trail of Bits Security** | [trailofbits/skills](https://github.com/trailofbits/skills) | Claude | Güvenlik araştırması ve zafiyet tespiti için profesyonel skill koleksiyonu |
| **Claude Command Suite** | [qdhenry/Claude-Command-Suite](https://github.com/qdhenry/Claude-Command-Suite) | Claude | 216+ slash komutu, 12 skill, 54 agent |
| **SkillKit** | [rohitg00/skillkit](https://github.com/rohitg00/skillkit) | Hepsi | Bir kez yaz, 44 agent'a dağıt — skill paket yöneticisi |
| **Awesome Agent Skills** | [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) | Hepsi | 500+ resmi ve topluluk skill'i |
| **DevKit** | [ngxtm/devkit](https://github.com/ngxtm/devkit) | Hepsi | 414+ skill, 38 agent, 57 komut |
| **Claude Scientific Skills** | [K-Dense-AI/claude-scientific-skills](https://github.com/K-Dense-AI/claude-scientific-skills) | Claude | 140 hazır bilimsel skill koleksiyonu |
| **Planning with Files** | [OthmanAdi/planning-with-files](https://github.com/OthmanAdi/planning-with-files) | Claude | Manus tarzı kalıcı markdown planlama skill'i |
| **Claude Code Guide** | [zebbern/claude-code-guide](https://github.com/zebbern/claude-code-guide) | Claude | Setup, SKILL.md, agent'lar, komutlar, workflow'lar rehberi |
| **Oh My Claude Code** | [Yeachan-Heo/oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) | Claude | 28 agent, 28 skill, delegation-first mimari, sıfır öğrenme eğrisi |

## Workflow Plugins

| Ad | Repo | Agent | Açıklama |
|---|---|---|---|
| **Ralph Playbook** | [ClaytonFarr/ralph-playbook](https://github.com/ClaytonFarr/ralph-playbook) | Claude | Ralph Wiggum otonom geliştirme rehberi |
| **RIPER Workflow** | [tony/claude-code-riper-5](https://github.com/tony/claude-code-riper-5) | Claude | Research, Innovate, Plan, Execute, Review |
| **Claude CodePro** | [maxritter/claude-codepro](https://github.com/maxritter/claude-codepro) | Claude | Spec-driven workflow ve TDD zorunluluğu |
| **AB Method** | [ayoubben18/ab-method](https://github.com/ayoubben18/ab-method) | Claude | Büyük problemleri sub-agent'lara bölen spec-driven workflow |

## Multi-Agent Orchestration

| Ad | Repo | Agent | Açıklama |
|---|---|---|---|
| **Parallel Code** | [johannesjo/parallel-code](https://github.com/johannesjo/parallel-code) | Hepsi | Claude, Codex, Gemini'yi ayrı worktree'lerde yan yana çalıştırma |
| **Claude Squad** | [smtg-ai/claude-squad](https://github.com/smtg-ai/claude-squad) | Claude | Birden fazla Claude Code örneğini tmux'ta yönetme |
| **Claude Swarm** | [parruda/claude-swarm](https://github.com/parruda/claude-swarm) | Claude | Agent sürüleri ile bağlı oturum başlatma |
| **agtx** | [fynnfluegge/agtx](https://github.com/fynnfluegge/agtx) | Hepsi | Çoklu oturum AI kodlama terminal yöneticisi |
| **Agent Orchestrator** | [ComposioHQ/agent-orchestrator](https://github.com/ComposioHQ/agent-orchestrator) | Hepsi | Görev planlama, agent atama, CI düzeltme |
| **OpenAI Symphony** | [openai/symphony](https://github.com/openai/symphony) | Codex | Task board izler → agent spawn eder → kod yazar → PR açar → CI'dan geçirir. Agentic Kanban'ın OpenAI implementasyonu |
| **ccswarm** | [nwiizo/ccswarm](https://github.com/nwiizo/ccswarm) | Claude | Git worktree izolasyonu ile çoklu agent orkestrasyon |
| **Claude Code Flow** | [ruvnet/claude-code-flow](https://github.com/ruvnet/claude-code-flow) | Claude | Production-ready multi-agent orkestrasyon sistemi |
| **Agents (wshobson)** | [wshobson/agents](https://github.com/wshobson/agents) | Claude | Akıllı otomasyon ve multi-agent orkestrasyonu |

## Memory / Context

| Ad | Repo | Agent | Açıklama |
|---|---|---|---|
| **Memorix** | [AVIDS2/memorix](https://github.com/AVIDS2/memorix) | Hepsi | Agent'lar arası paylaşımlı hafıza — MCP tabanlı |
| **Claude-SuperMemory** | [supermemoryai/claude-supermemory](https://github.com/supermemoryai/claude-supermemory) | Claude | Oturumlar arası kalıcı bellek, takım genelinde paylaşım |
| **Claude Cognitive** | [GMaN1911/claude-cognitive](https://github.com/GMaN1911/claude-cognitive) | Claude | Dikkat tabanlı dosya enjeksiyonu ile çalışma belleği |
| **Context Mode** | [mksglu/context-mode](https://github.com/mksglu/context-mode) | Claude | Tool çıktılarını sandbox'ta işleyip context'e sadece gerekli kısmı gönderiyor — %98 context tasarrufu (315KB → 5.4KB). Session state de koruyor |
| **Gemini Beads** | [thoreinstein/gemini-beads](https://github.com/thoreinstein/gemini-beads) | Gemini | Git destekli bellek sistemi |

## Code Quality / Review

| Ad | Repo | Agent | Açıklama |
|---|---|---|---|
| **Code Review Plugin** | [anthropics/claude-code](https://github.com/anthropics/claude-code) | Claude | Resmi çoklu agent PR inceleme eklentisi |
| **agnix** | [avifenesh/agnix](https://github.com/avifenesh/agnix) | Gemini | 156 doğrulama kuralı ile yapılandırma denetleyicisi |
| **cc-tools** | [Veraticus/cc-tools](https://github.com/Veraticus/cc-tools) | Claude | Go ile yazılmış yüksek performanslı hook'lar |

## Security

| Ad | Repo | Agent | Açıklama |
|---|---|---|---|
| **Codex Security** | [openai/codex-security](https://openai.com/index/codex-catches-more-than-code/) | Codex | Repo'yu okuyup threat model çıkarıyor, attack surface analizi, vulnerability tespiti, sandbox'ta doğrulama ve patch önerisi |
| **Security Scanner** | [harish-garg/security-scanner-plugin](https://github.com/harish-garg/security-scanner-plugin) | Claude | GitHub verilerini kullanarak güvenlik açığı tarama |
| **Parry** | [vaporif/parry](https://github.com/vaporif/parry) | Claude | Prompt enjeksiyon tarayıcısı, veri sızıntısı algılama |
| **Gemini Security** | [gemini-cli-extensions/security](https://github.com/gemini-cli-extensions/security) | Gemini | Google resmi güvenlik uzantısı |

## DevOps / CI-CD

| Ad | Repo | Agent | Açıklama |
|---|---|---|---|
| **Claude Code Action** | [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action) | Claude | Resmi GitHub Action — PR review, güvenlik denetimi |
| **Container Use** | [dagger/container-use](https://github.com/dagger/container-use) | Hepsi | Güvenli konteyner geliştirme ortamları |
| **Run Gemini CLI Action** | [google-github-actions/run-gemini-cli](https://github.com/google-github-actions/run-gemini-cli) | Gemini | Resmi GitHub Action |
| **Rulesync** | [dyoshikawa/rulesync](https://github.com/dyoshikawa/rulesync) | Hepsi | Çeşitli AI agent'ları için yapılandırmaları otomatik oluşturma |

## Project Management

| Ad | Repo | Agent | Açıklama |
|---|---|---|---|
| **Claude Task Master** | [eyaltoledano/claude-task-master](https://github.com/eyaltoledano/claude-task-master) | Claude | AI destekli görev yönetim sistemi |
| **CCPM** | [automazeio/ccpm](https://github.com/automazeio/ccpm) | Claude | GitHub Issues + worktree ile paralel agent yönetimi |
| **Backlog.md** | [MrLesk/Backlog.md](https://github.com/MrLesk/Backlog.md) | Hepsi | Markdown tabanlı proje planlama |

## Awesome Lists (Kaynak Listeleri)

| Ad | Repo | Agent | Açıklama |
|---|---|---|---|
| **awesome-claude-code** | [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | Claude | Skill, hook, komut ve eklenti listesi |
| **awesome-claude-code-toolkit** | [rohitg00/awesome-claude-code-toolkit](https://github.com/rohitg00/awesome-claude-code-toolkit) | Claude | 135 agent, 35 skill, 42 komut, 120 eklenti |
| **awesome-gemini-cli** | [Piebald-AI/awesome-gemini-cli](https://github.com/Piebald-AI/awesome-gemini-cli) | Gemini | Gemini CLI araçları ve uzantıları |
| **awesome-mcp-servers** | [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | Hepsi | 1200+ MCP sunucusu |

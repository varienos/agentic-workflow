# Agent Workflow Metodları

## Frameworkler

| Metod | Ne yapar? | Kaynak |
|---|---|---|
| **RPI** (Research → Plan → Implement) | 3 aşamalı döngü — her adımda ayrı context ile çalış | Topluluk |
| **BMAD Method** | 12+ uzman AI rolü ile tam SDLC simülasyonu (analist, mimar, PM, dev, QA) | [GitHub](https://github.com/bmad-code-org/BMAD-METHOD) |
| **SPARC** | 5 aşama: Specification → Pseudocode → Architecture → Refinement → Completion | [GitHub](https://github.com/ruvnet/sparc) |
| **Spec-Driven Development** | Önce detaylı spec yaz, sonra agent'a spec'ten kod ürettir | [GitHub Blog](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/) |
| **PDCA** (Plan-Do-Check-Act) | Deming döngüsünün AI kod üretimi için uyarlanmış hali | [GitHub](https://github.com/kenjudy/pdca-code-generation-process) |
| **Three Developer Loops** | Inner (saniye), Middle (saat), Outer (hafta) — farklı zaman ölçeklerinde kontrol | [IT Revolution](https://itrevolution.com/articles/the-three-developer-loops-a-new-framework-for-ai-assisted-coding/) |
| **AI-Augmented Scrum** | Sprint'te görevler "insan" ve "agent uygun" olarak sınıflandırılır | [Scrum.org](https://www.scrum.org/resources/blog/ai-augmented-scrum-framework-when-half-your-team-autonomous-agents) |

## Otonom / Loop Patternleri

| Metod | Ne yapar? |
|---|---|
| **Ralph Wiggum Loop** | Otonom görev döngüsü, belirli aralıklarla tekrar |
| **AECA** (Autonomous Error Correction) | Hata → düzelt → test → tekrar döngüsü |
| **Agentic Kanban** | Her backlog item'ı otomatik agent'a atanır, board'dan takip |
| **Self-Improving Agent Loop** | Her iterasyonda commit + diff analizi ile agent kendini iyileştirir |
| **Plan-Act-Reflect** | Planla → kodla → ne işe yaradı/yaramadı özetle, döngüyü tekrarla |
| **Headless / CI Agent** | `claude -p "görev" --headless` ile terminalsiz, pipeline'da otonom çalışma |
| **Codex Full Auto Mode** | Tam otonom — planla, düzenle, derle, hata düzelt, izin sormadan. Sandbox içinde |

## Multi-Agent Patternleri

| Metod | Ne yapar? |
|---|---|
| **Teammate Mode** | Agent eşit seviyede takım arkadaşı olarak çalışır |
| **Cross-Model Review** | Bir model yazar, farklı model review eder (Claude yaz → Codex review) |
| **Orchestrator Pattern / Conductor** | Ana agent planlar, sub-agent'lar worktree'lerde paralel çalışır |
| **Boomerang Pattern** | Görev alt-görevlere bölünür, her biri uzman moda devredilir, sonuç geri döner |
| **Agent Swarm** | Merkezi kontrol olmadan özerk agent'lar, handoff protokolleriyle görev aktarır |
| **Agent Teams** | Birden fazla Claude paralel çalışır, dosya tabanlı mailbox iletişimi |
| **Claude Squad** | tmux panellerinde çoklu agent oturumu yönetimi |
| **Fan-Out / Gather** | Aynı anda birden fazla agent farklı açılardan çalışır, sonuçlar birleştirilir |
| **Generator-Critic** | Bir agent üretir, diğer bağımsız agent kriterlere göre değerlendirir |
| **Master-Clone** | Ana agent klonlarını oluşturur, farklı perspektiflerden çözdürür, en iyisini seçer |
| **Model Musical Chairs** | Agent takılınca farklı modele geçiş (Claude → GPT-4o → Gemini) |
| **Context Cycling** | Uzun görevlerde periyodik yeni context aç, özeti aktar |

## Kalite / Review Patternleri

| Metod | Ne yapar? |
|---|---|
| **Dual-Pass Development** | İlk agent yazar, ikinci agent (temiz context) review eder |
| **Adversarial Testing** | Bir agent kod yazar, diğeri kırmaya çalışır |
| **Guardian Pattern** | Watchdog agent sürekli kod kalitesini izler |
| **Red-Green TDD for Agents** | Klasik TDD'nin agent versiyonu — önce kırmızı test, sonra geçecek kod |
| **TDFlow** | İnsan test yazar, agent bu testleri geçecek kodu üretir |

## Planlama / Teknik Patternleri

| Metod | Ne yapar? |
|---|---|
| **Ultrathink / Megathink** | Extended thinking ile derin analiz — max 31.999 token düşünme bütçesi |
| **Compact Pattern** | %70 context dolulukta proaktif sıkıştırma — otomatik (%90) yerine manuel |
| **Context Engineering** | Modele giden tüm bilgi akışını sistematik tasarlama (RAG, hafıza, sıkıştırma) |
| **Decision Journal (ADR)** | Her mimari karar `backlog/decisions/README.md` sozlesmesine gore kayit altina alinir |
| **Waterfall in 15 Minutes** | Kodlamadan önce hızlı ama yapısal planlama: beyin fırtınası → spec → plan |
| **Shadow Git Checkpointing** | Her değişiklikte gizli checkpoint — hata olursa anında geri dönüş (implement: `templates/core/hooks/git-checkpoint.js` + `/rollback` komutu) |

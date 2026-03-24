# Notlar

## Öğrenilen Dersler

1. Gereksiz MCP tool'ları kullanmak context'i gereksiz şişiriyor. Agent'ın bash erişimi varsa ve CLI ile yapılabiliyorsa MCP ekleme. MCP kullanımı majör bir ihtiyaç değilse proje bazında değerlendirilmeli.
2. Agent disiplini 3 katmanda sağlanır:
   - **Context kuralları** (CLAUDE.md'ye yaz) → %80'ini çözer, hemen uygulanır
   - **Hooks** (pre-commit, lint-staged) → Sistem zorlar, agent bypass edemez, proje başlayınca kurulur
   - **Review agent** (ikinci agent kontrol eder) → Kalite garantisi, mimari olgunlaşınca eklenir
3. Hook senaryoları (proje başlayınca kurulacak):
   - **pre-commit** → Lint + formatter çalıştır, geçemezse commit'i engelle
   - **pre-commit** → Dosya tipine göre syntax doğrulaması (php -l, tsc --noEmit, python -m py_compile)
   - **pre-commit** → Docblock/docstring eksik fonksiyon varsa uyar
   - **pre-commit** → .env, credentials gibi hassas dosyaların commit'e girmesini engelle
   - **pre-push** → Test suite çalıştır, kırık test varsa push'u engelle
   - **pre-push** → Static analysis çalıştır (PHPStan, mypy, ESLint --max-warnings=0)
   - **post-merge** → Dependency değişikliği varsa otomatik install (composer install, npm install)
   - **commit-msg** → Commit mesajı formatını doğrula (conventional commits: feat:, fix:, docs: vb.)
   - Araçlar: `husky` + `lint-staged` (JS/TS), `pre-commit` framework (Python), `captainhook` (PHP)
4. Git Hook tipleri:

   | Hook | Ne zaman çalışır? | Örnek senaryo |
   |---|---|---|
   | `pre-commit` | Commit oluşmadan hemen önce | Lint, format, syntax kontrolü, hassas dosya engelleme |
   | `prepare-commit-msg` | Commit mesajı editöre açılmadan önce | Branch adından otomatik prefix ekleme (`feature/login` → `feat: ...`) |
   | `commit-msg` | Commit mesajı yazıldıktan sonra | Conventional commit formatı doğrulama |
   | `post-commit` | Commit başarıyla oluştuktan sonra | Bildirim gönderme, log kaydetme |
   | `pre-push` | Push öncesi | Test suite ve static analysis çalıştırma |
   | `post-merge` | Merge tamamlandıktan sonra | Dependency değişikliği varsa otomatik install |
   | `post-checkout` | Branch değiştirildiğinde | Ortam değişkenlerini güncelleme, cache temizleme |
   | `pre-rebase` | Rebase başlamadan önce | Korumalı branch'lerde rebase'i engelleme |
   | `post-rewrite` | Commit amend veya rebase sonrası | Test çalıştırma, hook'ları yeniden tetikleme |

5. Skill/plugin seçimini geliştirici yapmasın, Opus yapsın. Her şeyi yüklemek context'i şişirir ve agent'ın performansını düşürür. Bootstrap sırasında Opus, proje ihtiyacına göre extensions-registry.md'den sadece gerekli olanları seçmeli. Az ama doğru > çok ama gereksiz.
6. Agent mimari karar veremez. Kod, test, review yazabilir ama "bu sistemde bu olmasın" diyemez, beklenmedik mantıksızlıkları kendi başına fark edemez. Mimari kararlar, sınırlar ve "hayır"lar insana ait. Agent verilen mimariyi uygular — mimariyi tasarlamaz. Temel bilmeyen biri AI ile doğru ürün oluşturamaz, yapsa bile sürdürülebilir olmaz.
7. Agent "test fail, benim değişikliğim değil" deyip durmamalı. Baseline comparison ile pre-existing hatayı tespit et, backlog'a kaydet, kendi işine devam et. Pre-existing hatalar ayrı task olarak takip edilmeli — yoksa kaybolur, kimse düzeltmez.

---

## Skill vs Command vs Agent — Kavram Karşılaştırması

### Claude Code

| Kavram | Ne? | Tetikleyen | Context | Ne zaman? |
|---|---|---|---|---|
| **Command** | Slash komutu (`/commit`) | Kullanıcı manuel | Ana context içinde | Tekrarlayan, kısa, tek adımlı işler |
| **Skill** | `.md` talimat dosyası | Otomatik veya `@` ile | Ana context'e enjekte | "Nasıl yapılacağını" öğretmek |
| **Agent** | Bağımsız alt-süreç | Claude kendisi spawn eder | Kendi ayrı context'i | Uzun, izole, paralel işler |

### Gemini CLI

| Kavram | Ne? | Tetikleyen | Context | Ne zaman? |
|---|---|---|---|---|
| **Slash Command** | `.toml` dosyaları (`.gemini/commands/`) | Kullanıcı `/` ile | Ana context | Namespace destekli, parametreli, shell çalıştırabilir |
| **Agent Skill** | `SKILL.md` (`.gemini/skills/`) | Lazy-loading — ihtiyaç olunca `activate_skill` ile | Ana context'e enjekte | YAML frontmatter + Markdown, otomatik taranır |
| **Subagent** | `.gemini/agents/*.md` | Gemini tetikler | Ayrı context (deneysel) | Henüz paralel çalışamıyor, sıralı |

### Codex CLI

| Kavram | Ne? | Tetikleyen | Context | Ne zaman? |
|---|---|---|---|---|
| **Slash Command** | Built-in + özel prompt'lar | Kullanıcı `/` veya `$` ile | Ana context | `/skills` ile skill'lere de erişir |
| **Agent Skill** | `SKILL.md` (`.codex/skills/`) | Progressive disclosure — otomatik | Ana context'e enjekte | `$skill-creator` ile interaktif oluşturulabilir |
| **Multi-agent** | `/experimental` ile aktif | Codex tetikler | Ayrı context (deneysel) | CSV tabanlı paralel görev dağıtımı destekler |

### Eşleştirme Özeti

| Claude Code | Gemini CLI | Codex CLI |
|---|---|---|
| `CLAUDE.md` | `GEMINI.md` | `AGENTS.md` |
| `~/.claude/CLAUDE.md` (global) | `~/.gemini/GEMINI.md` | `~/.codex/AGENTS.md` |
| Skill: saf `.md`, `@` ile yükle | Skill: `SKILL.md` + YAML frontmatter, lazy-load | Skill: `SKILL.md` + YAML frontmatter, progressive |
| Agent: native paralel, production-ready | Subagent: deneysel, sıralı | Multi-agent: deneysel, CSV paralel |

### Önemli Farklar

- **Gemini** — En güçlü custom slash command sistemi (`.toml`, namespace, shell exec)
- **Codex** — `$skill-creator` ile interaktif skill oluşturma, `AGENTS.override.md` ile geçici talimat değişikliği
- **Claude** — Alt-agent'lar native paralel çalışır (diğerlerinde deneysel), skill yapısı en basit (saf `.md`)

---

## Mimari Prensipler

- **SOLID** — Tek sorumluluk, genişletmeye açık/değiştirmeye kapalı, Liskov, arayüz ayrımı, bağımlılık terslemesi
- **DRY** — Tek bir yerde aynı kodun tekrar etmemesi
- **Separation of Concerns** — Controller → akış, Service → iş mantığı, Repository/Model → veri erişimi
- **Loose Coupling / High Cohesion** — Bağımlılıkları azalt, her modülün tek sorumluluğu olsun
- **Clean Code** — Okunabilirlik, sade isimlendirme, küçük fonksiyonlar, anlaşılır akış
- **Convention over Configuration** — Framework'in standart yolunu kullan
- **Defensive Programming** — Hatalı input, null veri, beklenmeyen durumları hesaba kat

---

## Kod Yazım Standartları

| Kavram | Ne yapar? | Örnek araç |
|---|---|---|
| **Linter** | Hatalı/riskli kod kalıplarını tespit eder | ESLint, Pylint |
| **Formatter** | Kod biçimini otomatik düzenler | Prettier, Black |
| **Static Analyzer** | Tip hataları, dead code, güvenlik açıklarını bulur | PHPStan, mypy |

### Dile Göre Araçlar

| Dil | Formatter | Linter / Analyzer |
|---|---|---|
| **JavaScript / TypeScript** | Prettier, Biome | ESLint, Biome |
| **PHP** | PHP-CS-Fixer | PHP_CodeSniffer, PHPStan, Psalm |
| **Python** | Black, Ruff | Flake8, Pylint, Ruff, mypy |
| **Go** | `gofmt` _(resmi)_ | golangci-lint |
| **Java** | Google Java Format | Checkstyle, PMD, SpotBugs |
| **C# / .NET** | `dotnet format` | StyleCop, Roslyn Analyzers |
| **Ruby** | RuboCop | RuboCop |
| **Rust** | `rustfmt` _(resmi)_ | Clippy _(resmi)_ |
| **CSS / SCSS** | Prettier | Stylelint |
| **HTML** | Prettier | HTMLHint |
| **SQL** | sqlfmt | sqlfluff |

### Entegrasyon Noktaları

- **IDE** → save-on-format
- **Pre-commit hook** → `husky`, `lint-staged`
- **CI pipeline** → her PR'da otomatik kontrol

---

## Autoloading Standards — PSR-4

- Namespace → dizin eşlemesi ile otomatik sınıf yükleme
- Composer `autoload.psr-4` ile entegre çalışır
- Modern PHP projelerinin standart yöntemi

---

## Teknik Sözleşme (Contract)

| Başlık | Açıklama |
|---|---|
| Amaç | Sistem bileşenleri arasında ortak ve net bir iletişim standardı oluşturmak |
| Kullanım Alanı | API endpoint'leri, request/response yapıları, veri modelleri, servis metodları, event yapıları |
| Sağladığı Fayda | Yanlış anlaşılmayı azaltır, geliştirme hızını artırır, test süreçlerini kolaylaştırır |
| Belirlenmezse Oluşan Risk | Entegrasyon hataları, alan uyumsuzlukları, belirsiz hata yönetimi, bakım zorluğu |
| Temel Unsurlar | Alan isimleri, veri tipleri, zorunlu alanlar, validasyon kuralları, hata formatı, versiyonlama |
| Dokümantasyon Biçimi | Swagger / OpenAPI, Postman Collection, Markdown teknik doküman, ERD ve şema dökümleri |

---

## Öğrenimler (Best Practices)

Kaynak: [shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice)

- Her zaman plan mode kullanın, Claude'a doğrulama yapabileceği bir yol verin
- Paralel geliştirme için Git Worktrees kullanın
- `/loop` ile 3 güne kadar tekrarlayan görevler planlayın
- Code Review yapın — yeni context pencereleri, ilk agent'ın kaçırdığı bug'ları yakalayabilir
- Aşama aşama planlar oluşturun ve her aşamaya test koyun
- CLAUDE.md dosyası mümkünse 200 satırın altında olmalı
- Workflow'lar için sub-agent yerine command kullanın
- Feature-özel sub-agent + skills > genel QA/backend agent
- Küçük işler için vanilla Claude Code, karmaşık workflow'lardan daha iyi çalışır

> **Not:** Metodlar → [methods.md](methods.md), eklentiler → [extensions-registry.md](../extensions-registry.md)'e taşındı.

---

## Öğrenimler (Verim Artışı)

En büyük verim artışı sadece daha iyi prompt yazmaktan gelmiyor. Asıl farkı yaratan: multi-agent orkestrasyonu, kalıcı hafıza, yapısal planlama ve alan-özel skill'ler.

---

## Kaynaklar

- Claude Native Hafıza — https://code.claude.com/docs/en/memory
- Claude Native Planlanmış Görevler — https://code.claude.com/docs/en/scheduled-tasks
- Loot Drop — https://www.loot-drop.io/ _(startup temalı AI agent rehberi)_
- Can I Run — https://www.canirun.ai/ _(bilgisayarın hangi LLM modellerini çalıştırabilir? VRAM, performans, token hızı tahmini — local AI için pratik)_
- Cloudflare Browser Rendering API — https://developers.cloudflare.com/browser-rendering/ _(tek API çağrısı ile site crawl, Markdown/JSON çıktı — RAG ve AI veri toplama için. Workers Paid plan gerektirir)_
- Awesome Agent Skills — https://github.com/VoltAgent/awesome-agent-skills _(500+ skill, Claude/Gemini/Codex uyumlu — skill yazmadan önce mutlaka bak)_

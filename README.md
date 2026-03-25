![Agentic Workflow banner](Docbase/assets/agentic-workflow-banner.png)

[![Tests](https://img.shields.io/github/actions/workflow/status/varienos/agentic-workflow/test.yml?label=tests&logo=github)](https://github.com/varienos/agentic-workflow/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Powered-blueviolet?logo=anthropic)](https://docs.anthropic.com/claude-code)
[![GitHub Stars](https://img.shields.io/github/stars/varienos/agentic-workflow)](https://github.com/varienos/agentic-workflow)

> **[English version (README.en.md)](README.en.md)**

> [!IMPORTANT]
> Bu sistem **[Backlog.md](https://github.com/MrLesk/Backlog.md)** üzerine kuruludur. Tüm görev yaşam döngüsü — oluşturma, önceliklendirme, implementasyon, review ve kapatma — Backlog.md CLI ile yönetilir. Bootstrap, Backlog.md kurulu değilse çalışmaz.

> [!NOTE]
> Otonom görev yönetimi, paralel agent spawn ve çok adımlı workflow akışları yoğun token tüketimi gerektirir. Verimli kullanım için **Claude Max** paketinin kullanılması önerilir.

Claude Code ile yazılım geliştirmenin tüm yaşam döngüsünü yöneten bir workflow sistemidir. Görev planlamadan code review'a, bug fix'ten deploy kontrolüne kadar her adımı yapılandırılmış komutlar, ajanlar ve otomatik koruma mekanizmalarıyla yönetir.

Mevcut bir projeye entegre edebilir veya sıfırdan yeni bir proje başlatabilirsiniz. `/bootstrap` komutu projenizi tanır (veya greenfield modunda stack bilgilerini sorar), sizinle kısa bir röportaj yapar ve projenize özel workflow dosyalarını üretir.

## Ne Sağlar?

- **Otonom görev yönetimi** — Backlog'dan görev al, planla, implement et, test et, commit et, kapat. Tek komutla.
- **Otomatik code review** — 3+1 agent ile her değişikliği inceler: kod kalitesi, sessiz hatalar, regresyon riski. Güvenlik değişikliklerinde koşullu Devils Advocate perspektifi.
- **Akıllı bug fix** — Root cause analizi, maks 3 hipotez, minimal fix, regresyon testi. Sonsuz derinliğe dalmaz.
- **Deploy güvenlik ağı** — İki katmanlı koruma: (1) pre-push git hook'ları ile localhost leak, migration tutarlılığı ve env sync kontrolü, (2) `/{varyant}-pre-deploy` ve `/{varyant}-post-deploy` slash komutları ile platform-spesifik kontroller (örn. `/docker-pre-deploy`, `/coolify-post-deploy`, rollback rehberi). Git hook'larının etkinleştirilmesini gerektirir (bkz. Bootstrap Akışı adım 9).
- **Codebase config koruması** — `codebase-guard` hook'u Codebase içine `.claude/`, `CLAUDE.md`, `.mcp.json` yazmayı otomatik engeller. Agent config dosyaları yalnızca Agentbase'de yaşar.
- **Test zorlama** — `test-enforcer` hook'u kaynak dosya değişikliklerinde ilgili testlerin çalıştırılmasını hatırlatır. Pre-push hook'u ile test geçmeden push engellenir.
- **Proje-spesifik kurallar** — Stack'inize göre hook'lar, framework kuralları ve koruma mekanizmaları otomatik üretilir.
- **Canlı oturum izleme** — Birden fazla Claude Code oturumunu tek terminal ekranından takip edin.
- **Worktree-dostu mimari** — Agentbase/Codebase ayrımı worktree kullanımını mimari olarak destekler (bkz. Worktree Avantajı bölümü).
- **Çoklu CLI desteği** — Claude Code çıktıları `transform.js` ile Gemini CLI, Codex CLI, Kimi CLI ve OpenCode formatlarına dönüştürülebilir.
- **Dokümantasyon senkronizasyonu** — Kod değişikliği sonrası PROJECT.md, ARCHITECTURE.md gibi dokümanların güncellenmesini öneren service-documentation agent'ı.
- **Eklenti öneri sistemi** — Bootstrap tamamlandığında projenize uygun üçüncü parti skill ve plugin'leri öneren dahili registry taraması.
- **Otomatik CHANGELOG** — Conventional Commit push'ları `main` branch'inde auto-release akışını tetikler; oluşan `v*` tag'i ayrı GitHub Action ile `CHANGELOG.md` dosyasını üretip `main` branch'ine geri yazar.
- **CI güvenlik taraması** — Her push ve PR'da gitleaks ile secret scanning, `npm audit` ile dependency güvenlik kontrolü. Dependabot haftalık npm ve GitHub Actions güncellemesi önerir.

## Temel Yaklaşım

Bu repo dört ana çalışma alanı üzerine kuruludur:

| Yol | Amaç |
| --- | --- |
| `Agentbase/` | Şablonlar, üretim mantığı, Claude komutları ve yardımcı araçlar |
| `Agentbase/backlog/` | Görev yaşam döngüsü — Backlog.md CLI ile yönetilen task'lar |
| `Codebase/` | Üzerinde çalışılacak gerçek proje kodu |
| `Docbase/agentic/` | Bootstrap tarafından üretilen manifest dosyası (`project-manifest.yaml`) |

Bu ayrımın iki önemli sonucu vardır:

- Git işlemleri hedef proje tarafında, yani `Codebase/` içinde yürür.
- Bootstrap süreci `Codebase/` dizinine yazmaz; üretimi `Agentbase/` ve `Docbase/agentic/` altında yapar. Backlog da `Agentbase/backlog/` içinde oluşturulur.

Not: Bu template repo kendi geliştirme backlog'unu kökteki `backlog/` dizininde tutar; bootstrap ile hedef workspace için üretilen backlog ise `Agentbase/backlog/` altında yaşar.

### Worktree Avantajı

Agentbase/Codebase ayrımı git worktree ile paralel geliştirmeyi mimari olarak hedefler. Şu anda komutlar sabit `../Codebase` yolunu kullanır; farklı worktree'ler arası geçiş mekanizması henüz mevcut değildir:

```
Agentbase/                  ← SABIT — tüm worktree'ler aynı config'i kullanır
│
├── .claude/commands/       ← Kurallar, hook'lar, agent'lar TEK yerde
├── .claude/hooks/
├── .claude/rules/
│
Codebase/ → proje (main)    ← Ana worktree
Codebase/ → wt-feat-auth    ← git worktree add (feature/auth branch)
Codebase/ → wt-feat-pay     ← git worktree add (feature/payment branch)
```

Geleneksel yapıda `.claude/` proje kökünde yaşar; worktree oluştururken her birinde ayrı `.claude/` kopyası oluşur, config değişiklikleri senkronize olmaz. Agentbase ayrımı bu sorunu kökten çözer:

- **Tek config, çok worktree** — Hook'lar, kurallar, agent'lar hep aynı
- **İzole git tarihçesi** — Agentbase dosyaları proje commit'lerine karışmaz
- **Paralel oturum** — 4 terminal, 4 worktree, 4 Claude Code oturumu, tek Agentbase

## Depoda Neler Var?

Bu repoda bulunan ana bileşenler:

- `Agentbase/.claude/commands/bootstrap.md` — Kurulum akışını başlatan ana komut
- `Agentbase/templates/` — Çekirdek şablonlar ve modül bazlı iskelet dosyaları
- `Agentbase/generate.js` — Manifestten deterministik içerik üreten betik
- `Agentbase/transform.js` — Claude Code çıktılarını Gemini/Codex/Kimi/OpenCode formatlarına dönüştüren pipeline
- `Agentbase/bin/session-monitor.js` — Oturum izleme aracı
- `Agentbase/tests/` — Üretim ve hook davranışlarını doğrulayan testler

Not: Bu depodaki bazı komut dosyaları örnek veya çekirdek içerik olarak yer alır. Asıl komut seti bootstrap sonrasında hedef projenin yapısına göre üretilir.

## Gereksinimler

- [Claude Code CLI](https://docs.anthropic.com/claude-code)
- [Backlog.md CLI](https://github.com/MrLesk/Backlog.md) — `npm i -g backlog.md`
- Node.js 18+ ve npm
- [jq](https://jqlang.github.io/jq/) — JSON işlemci, hook kuralları için gerekli (`brew install jq` veya `apt install jq`)
- Git 2.38+ — pre-push hook'undaki `git merge-tree --write-tree` desteği için gerekli
- Docker CLI — Docker veya Coolify deploy modülü aktifse gerekli (`docker build`, `docker compose` komutları için)
- [GitHub CLI (gh)](https://cli.github.com/) — opsiyonel, `release.js` GitHub Release oluşturma için kullanır

## Hızlı Başlangıç

### Mevcut projeye entegrasyon

```bash
git clone https://github.com/varienos/agentic-workflow
cd agentic-workflow

# Codebase klasörünü projenizle değiştirin
rm -rf Codebase
ln -s /path/to/your/project Codebase

cd Agentbase
npm install
claude
```

Claude Code içinde:

```
/bootstrap
```

### Sıfırdan yeni proje (greenfield)

```bash
git clone https://github.com/varienos/agentic-workflow
cd agentic-workflow

# Codebase klasörünü boş bırakın — Bootstrap greenfield moduna geçer
cd Agentbase
npm install
claude
```

Claude Code içinde:

```
/bootstrap
```

Bootstrap boş Codebase tespit ettiğinde greenfield moduna geçer: stack seçimini sorar, workflow dosyalarını üretir ve scaffold kurulum komutlarını gösterir. Dizin tamamen boş olmalıdır — README veya .gitkeep gibi dosyalar varsa bootstrap mevcut proje modu ile başlar.

## Bootstrap Akışı

`/bootstrap` komutu yüksek seviyede şu adımlarla çalışır:

1. **Ön koşul kontrolleri.** Backlog CLI, `Codebase/` erişimi ve varsa önceki manifest kontrol edilir.
2. **Codebase analizi.** Proje tipi, dizin yapısı, alt projeler, paket yöneticisi, test araçları ve modül adayları çıkarılır.
3. **Fazlı röportaj.** Proje, teknik tercih, geliştirici profili ve domain kuralları netleştirilir.
4. **Manifest üretimi.** `Docbase/agentic/project-manifest.yaml` dosyası oluşturulur.
5. **Dosya üretimi.** Manifeste göre komutlar, ajanlar, hook'lar, kurallar ve yardımcı dokümanlar üretilir. Hedef CLI araçları seçildiyse `transform.js` ile dönüştürme yapılır.
6. **Backlog başlatma.** Backlog `Agentbase/backlog/` dizininde oluşturulur ve başlangıç görevleri yaratılır.
7. **Tamamlanma raporu.** Onboarding rehberi (`onboarding.md`), eklenti önerileri ve git hook etkinleştirme komutu gösterilir: `cd ../Codebase && git config core.hooksPath "$(realpath ../Agentbase/git-hooks/)"`

Yeniden çalıştırmalarda `overwrite`, `merge` ve `incremental` senaryoları desteklenir.

## Komutlar

Bootstrap tamamlandıktan sonra kullanılabilir hale gelen komutlar:

### /task-plan

Bir isteği derinlemesine analiz ederek backlog görevi oluşturur. Codebase'i tarar, etkilenen dosyaları tespit eder, karmaşıklık skoru hesaplar, model önerisi yapar ve kabul kriterleriyle birlikte görevi backlog'a yazar. Scope büyükse görevi birden fazla task'a böler. Görev oluşturur ama kod YAZMAZ — implementasyon task-hunter'a bırakılır.

```
/task-plan "Kullanıcı profil sayfasına avatar yükleme özelliği ekle"
/task-plan "API rate limiting implement et"
```

### /task-master

Backlog'daki tüm açık görevleri 4 boyutlu skorlama ile önceliklendirir. Her görev için Impact (etki), Risk (risk), Dependency (bağımlılık) ve Complexity (karmaşıklık — ters orantılı) skorları hesaplanır. Sonuç olarak faz bazlı bir çalışma planı çıkarır: Faz 1 kritik görevler, Faz 2 önemli görevler, Faz 3 planlanmış görevler, MANUEL fazda kullanıcının daha önce manuel olarak önceliklendirdiği görevler (puanlama dışı tutulur, raporun sonunda ayrıca listelenir). MANUEL fazı tetiklemek için: geçmiş bir oturumda "X görevini MANUEL olarak önceliklendir" şeklinde bir yönerge verilmiş ve agent hafızasına kaydedilmiş olmalıdır.

```
/task-master
```

### /task-hunter

Backlog'daki bir görevi otonom olarak implement eder. Görev dosyasını okur, etkilenen dosyaları keşfeder, implementation planı hazırlar, kodu yazar, testleri çalıştırır, commit eder ve görevi kapatır. Karmaşık görevlerde teammate spawn ederek paralel çalışma başlatabilir. İş bittiğinde sıcak bağlam skorlamasıyla sonraki en uygun görevi önerir — vibecode akışı için context değişimini minimize eder.

```
/task-hunter 42          # Tek görev
/task-hunter 42,43,44    # Sırayla birden fazla görev (virgülle)
/task-hunter auth        # Keyword ile görev arama
```

### /task-conductor

Birden fazla görevi faz bazlı otonom olarak işler. Görevleri kendi puanlama sistemiyle önceliklendirir ve fazlara atar, her fazda sırayla veya paralel olarak implement eder, faz sonunda özet ve bütünlük kontrolü yapar. State dosyası ile kesintiye uğradığında kaldığından devam eder. Bir fazda art arda 3 hata oluşursa durur ve kullanıcıyı bildirir.

```
/task-conductor top 5        # En yüksek öncelikli 5 görev
/task-conductor all          # Tüm açık görevler
/task-conductor 3,5,8        # Virgülle ayrılmış görev ID'leri
/task-conductor keyword auth # Keyword ile görev arama
/task-conductor resume       # Kaldığı yerden devam et
```

### /task-review

Son değişiklikleri 3+1 agent ile review eder. Code Reviewer genel kod kalitesini, Silent Failure Hunter sessiz hataları ve hatalı hata yönetimini, Regression Analyzer değişikliğin mevcut işlevselliği kırma riskini değerlendirir. Güvenlik, auth, ödeme veya migration değişikliklerinde koşullu 4. agent (Devils Advocate) adversarial perspektiften kırılma noktalarını analiz eder. Bulgular karar ağacıyla değerlendirilir: düzeltilmesi gereken sorunlar raporlanır, önceden var olan sorunlar backlog'a kaydedilir — asla "scope dışı" olarak atlanmaz.

```
/task-review                    # Son commit
/task-review abc1234            # Belirli commit
/task-review HEAD~3..HEAD       # Commit aralığı
```

### /auto-review

Diff-based, loop uyumlu ve idempotent review. Son commit'ten bu yana yapılan değişiklikleri hash kontrolüyle inceler — aynı diff'i iki kez review etmez. MINOR bulguları doğrudan düzeltir ve commit eder, MAJOR bulgular için backlog task açar. Harici `/loop` skill'i (örneğin [superpowers](https://github.com/obra/superpowers) eklentisi) ile periyodik çalıştırmaya uygundur — bu skill repo ile birlikte gelmez, ayrıca kurulur. Kendi fix commit'lerini sonraki çalıştırmada tekrar review etmez.

```
/auto-review                    # Son commit
/auto-review abc1234            # Belirli commit
/auto-review HEAD~3..HEAD       # Commit aralığı
```

### /bug-hunter

Bug'in root cause'unu bulur ve düzeltir. Hata tanımını alır, codebase'de ilgili dosyaları bulur, maks 3 hipotez üretir ve her birini test eder. Root cause bulunduğunda minimal fix uygular, regresyon testi yazar, commit eder ve backlog görevi oluşturup kapatır. 3 hipotez sınırı sonsuz derinliğe dalmayı önler — 3 denemede bulunamazsa bulguları raporlar ve durur.

```
/bug-hunter "Kullanıcı giriş yaptıktan sonra profil sayfası 500 hatası veriyor"
/bug-hunter "Bildirimler sayfası sonsuz döngüye giriyor"
```

### /bug-review

Bug fix'ini 3 farklı perspektiften inceler. Code Reviewer fix'in kalitesini ve doğru root cause'u hedef alıp almadığını, Silent Failure Hunter fix'in yeni sessiz hatalar oluşturup oluşturamadığını, Regression Analyzer fix'in başka yerleri kırma riskini değerlendirir. Sonsuz döngü koruması vardır — maks 1 iterasyon.

```
/bug-review                     # Son commit
/bug-review abc1234             # Belirli commit
/bug-review HEAD~2..HEAD        # Commit aralığı
```

### /deep-audit

Bir domain modülünü (auth, profil, ödeme, mesaj vb.) tüm katmanlarda (API + DB + Mobil + Frontend) uçtan uca denetler. Bulguları iki boyutta sınıflandırır: basit olanları doğrudan düzeltir, karmaşık olanları backlog'a kaydeder.

```
/deep-audit auth        # Auth modülünü denetle
/deep-audit profil      # Profil modülünü denetle
/deep-audit odeme       # Ödeme modülünü denetle
```

### /workflow-update

Mevcut workflow konfigürasyonunu Codebase'in güncel durumuyla karşılaştırır. Tam re-bootstrap yapmaz — sadece değişen parçaları günceller (yeni modül ekleme, kaldırılan dependency tespiti, subproject değişiklikleri). Drift raporu gösterir, kullanıcı onayı ile incremental güncelleme yapar.

```
/workflow-update          # Drift raporu + onay ile güncelleme
```

### /memorize

Oturum içerisinde öğrenilen bilgileri kalıcı hafızaya kaydeder. Rutin işlemleri değil, sadece tekrarlama riski olan yapısal bilgileri kaydeder: beklenmedik tuzaklar, kullanıcı tercihleri, mimari kararlar, sürpriz keşifler, yeni tool/dependency notları. Her kayıt `Why` (neden önemli) ve `How to apply` (nasıl uygulanacak) alanlarıyla yapılır.

```
/memorize
```

### /session-status

Tüm aktif, boşta ve kapalı Claude Code oturumlarını tablo formatında gösterir. Her oturumun PID'i, üzerinde çalıştığı görev, tool kullanım istatistikleri, hata sayısı ve teammate durumu görünür. Canlı dashboard için `node bin/session-monitor.js` kullanılır.

```
/session-status
```

### /deadcode

Projede kullanılmayan kodu tespit eder ve temizlik önerir. Çağrılmayan fonksiyonlar, import edilmeyen modüller, unreachable branch'ler taranır. Her bulgu confidence seviyesiyle sınıflandırılır: HIGH (hiçbir yerden referans yok), MEDIUM (sadece test'lerden referans), LOW (dinamik import/reflection ile kullanıyor olabilir). Yüksek confidence bulguları için otomatik temizlik önerilir.

```
/deadcode
/deadcode api/src/services/    # Belirli dizin
```

### /api-smoke

API endpoint'lerini hızlıca doğrular. Post-deploy sonrası veya bağımsız olarak çalıştırılabilir. Proje manifestinden base URL'yi okur (veya özel URL kabul eder) ve kritik endpoint'ler üzerinde smoke testleri çalıştırır.

```
/api-smoke                               # Manifestteki varsayılan URL
/api-smoke staging                       # Staging ortamı
/api-smoke https://custom-url.com        # Özel URL
```

### Agent'lar

Bootstrap tarafından üretilen otonom agent'lar — komutlar bunları otomatik çağırır:

| Agent | Rol |
|-------|-----|
| `code-review` | Genel kod kalitesi ve pattern uyumu |
| `regression-analyzer` | Değişikliğin mevcut işlevselliği kırma riski |
| `devils-advocate` | Güvenlik/auth/ödeme değişikliklerinde adversarial perspektif (koşullu) |
| `frontend-expert` | Frontend mimari ve performans kararları |
| `backend-expert` | Backend API tasarımı ve veritabanı kararları |
| `mobile-expert` | Mobil platform-spesifik kararlar |
| `service-documentation` | Kod değişikliği sonrası dokümantasyon güncelleme önerisi |

### Modüler Komutlar

Bu komutlar Bootstrap'in tespit ettiği modüllere göre üretilir — her projede bulunmaz:

Komut adları `/{varyant}-{komut}` formatında üretilir — çakışmayı önlemek için varyant adı prefix olarak eklenir:

| Komut | Modül | Ne Yapar |
|-------|-------|----------|
| `/docker-pre-deploy`, `/coolify-pre-deploy`, `/vercel-pre-deploy` | Deploy | Production push öncesi kontrol. Docker/Coolify: derleme, test, migration, env sync, Docker build. Vercel: TypeScript, build, env sync, edge-runtime. PASS/FAIL/WARN raporu. |
| `/docker-post-deploy`, `/coolify-post-deploy` | Deploy | Deploy sonrası doğrulama: health check, smoke test, rollback rehberi. Vercel serverless yapısı nedeniyle desteklenmez. |
| `/security-idor-scan` | Security | API endpoint'lerinde IDOR güvenlik açığı taraması — 5 nokta kontrol matrisi. |
| `/monorepo-review-module <ad>` | Monorepo | Bir modülü uçtan uca denetler — 4 paralel agent, cross-layer analiz. |

## Canlı Oturum İzleme

Birden fazla Claude Code oturumu paralel çalışırken terminal dashboard ile takip edin.

**Ön koşul:** Bootstrap tamamlandıktan sonra `session-tracker` hook'u `.claude/hooks/` altına kopyalanır. Bu hook her tool çağrısında oturum durumunu `.claude/tracking/sessions/` dosyasına yazar. Dashboard bu dosyaları okur. Bootstrap Akışı adım 9'daki `git config core.hooksPath` komutu çalıştırılmamışsa veya bootstrap henüz yapılmamışsa hook aktif olmaz ve dashboard boş görünür:

```bash
cd Agentbase && node bin/session-monitor.js
```

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ AGENTIC WORKFLOW  [Timeline] [Agent Radar]  2 aktif 1 bosta 17:05            │
├──────────────────────────────────────────────────────────────────────────────┤
│ › ● 45012  TASK-24 Merge conflict yonetimi  [uygulama]  42dk                 │
│   Son islem: Edited workflow-lifecycle.skeleton.md                           │
│   Backlog: In Progress · high · AC 1/2  |  bekleme yok  |  hata 0  |  ajan 1 │
│                                                                              │
│   ○ 45078  TASK-11 Auto-review loop  [bekleme]  18dk                         │
│   Son islem: Test failed: npm test                                           │
│   Backlog: In Progress · medium · AC 2/5  |  bekleme test  |  hata 1         │
├──────────────────────────────────────────────────────────────────────────────┤
│ Tab Sekme  j/k Sec  Enter Detay  c Kapali gizle  h Yardim  q Cikis           │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Varsayılan `Timeline` görünümü agent-first çalışır: hangi agent hangi backlog task'ında, hangi fazda, neden bekliyor görülür.
- `Tab` ile `Agent Radar` görünümüne geçilir: yoğun tablo + event stream.
- Session state'i yerel `backlog/` dosyalarıyla zenginleştirilir; task status, priority, dependency ve acceptance ilerlemesi görünür.
- Sıfır dependency — saf Node.js + ANSI escape kodları.

## Desteklenen Modül Aileleri

Şablon sistemi modülerdir ve yalnızca tespit edilen aileler için içerik üretir.

### First-class Destek

Bu stack'ler için framework-spesifik hook'lar, kurallar ve koruma mekanizmaları üretilir:

- **ORM:** Prisma, Eloquent, Django ORM, TypeORM
- **Deploy:** Docker, Coolify, Vercel
- **Backend:** Express, Fastify, NestJS, Laravel, CodeIgniter 4, Django, FastAPI
- **Frontend:** Next.js, React SPA, yalın HTML/CSS/JS
- **Mobile:** Expo, React Native, Flutter
- **Ek alanlar:** Monorepo, güvenlik taramaları, CI/CD (GitHub Actions, GitLab CI), izleme (Sentry, Datadog), API dokümantasyonu (OpenAPI, GraphQL)

### Generic Bootstrap Desteği

Aşağıdaki stack'ler bootstrap tarafından algılanır ve manifest'e yazılır, ancak framework-spesifik hook/rule/agent şablonları yoktur — yalnızca çekirdek komutlar (task-hunter, task-review vb.) ve genel korumalar (secret tarama, lock dosyası koruması) üretilir:

- **Frontend:** Vue, Svelte
- **Backend:** Flask
- **ORM:** Sequelize, Drizzle

Go, Rust ve Java/Kotlin mevcut proje analizinde de otomatik tespit edilir (`go.mod`, `Cargo.toml`, `pom.xml`, `build.gradle`, `build.gradle.kts`). Greenfield modunda ise bu stack'ler röportajda açıkça seçilir. Her iki durumda da bu aileler generic kapsamda kalır: framework-spesifik hook/rule/agent üretimi yapılmaz; yalnızca çekirdek workflow komutları ve genel güvenlik kontrolleri üretilir. Yukarıda listelenmeyen stack'ler için manifestin elle zenginleştirilmesi gerekebilir.

## Çoklu CLI Dönüştürme

Claude Code çıktıları `transform.js` ile diğer CLI formatlarına dönüştürülebilir. Bootstrap röportajında hedef araçlar seçilir veya mevcut projeler `--targets` parametresiyle doğrudan çalıştırabilir:

```bash
cd Agentbase && node transform.js ../Docbase/agentic/project-manifest.yaml --targets gemini,codex,kimi,opencode
```

| Hedef CLI | Komut Formatı | Agent Formatı | Bağlam Dosyası |
|-----------|--------------|---------------|----------------|
| **Gemini CLI** | `.gemini/commands/*.toml` | `.gemini/agents/*.md` | `GEMINI.md` |
| **Codex CLI** | `.codex/skills/*/SKILL.md` | — | `AGENTS.md` |
| **Kimi CLI** | `.kimi/skills/*/SKILL.md` | `.kimi/agents/*.yaml` | Agent prompt içinde |
| **OpenCode** | `.opencode/skills/*/SKILL.md` | `.opencode/agents/*.md` | `.opencode/AGENTS.md` |

Dönüştürme süreci `.claude/` çıktısını kaynak olarak kullanır ve hedef CLI'ın anlayacağı formata adapte eder: komut çağırma sözdizimi (`/` → `$`, `@` vb.), dosya yolu referansları ve TOML/YAML/Markdown serializasyonu otomatik yapılır. `generate.js` hiç değiştirilmez — transform tamamen ayrı bir post-processor olarak çalışır.

## Üretimde Kanıtlanmış Desenler

Bu template'deki her kural bir production deneyiminden doğmuştur:

| Desen | Hikaye |
|-------|--------|
| `prisma db push` yasağı | 7 tablo + 3 sütun production'da kayboldu |
| 3 hipotez sınırı | Sonsuz root cause aramasının önlenmesi |
| 4D skorlama | Tutarlı, tekrarlanabilir önceliklendirme |
| 3+1 agent paralel review | Tek agent'in kaçırdığı sessiz hataların yakalanması, güvenlik değişikliklerinde adversarial perspektif |
| Faz bazlı orkestrasyon | Kaotik paralel çalışma yerine kontrollü işlem |
| Failure cascade tablosu | Aynı hatada 10+ retry döngüsünün önlenmesi |
| Destructive migration tespiti | DROP TABLE'in production'a fark edilmeden gitmesi |
| Pre-existing bulgu kuralı | "Scope dışı" diyerek güvenlik açığının atlanması |

## Geliştirme ve Doğrulama

```bash
cd Agentbase && npm test                                                    # Test suite
cd Agentbase && node bin/session-monitor.js                                 # Oturum izleme

# Bootstrap sonrası — manifest üretildikten sonra çalışır:
cd Agentbase && node generate.js ../Docbase/agentic/project-manifest.yaml --dry-run  # Kuru çalıştırma
cd Agentbase && node transform.js ../Docbase/agentic/project-manifest.yaml --targets gemini,codex --dry-run  # CLI dönüştürme
```

### Release ve CHANGELOG

```bash
cd Agentbase && node bin/release.js auto            # Otomatik: commit'lerden bump tipi belirle
cd Agentbase && node bin/release.js patch           # Manuel: patch release (1.2.3 → 1.2.4)
cd Agentbase && node bin/release.js minor           # Manuel: minor release (1.2.3 → 1.3.0)
cd Agentbase && node bin/release.js major           # Manuel: major release (1.2.3 → 2.0.0)
cd Agentbase && node bin/release.js auto --dry-run  # Kuru çalıştırma (dosya yazmaz)
```

`release.js` sırayla: version bump → CHANGELOG üret → commit → tag → push → GitHub Release oluşturur. GitHub Release için `gh` CLI gereklidir (opsiyonel — kurulu değilse atlanır).

GitHub Actions tarafında akış iki aşamalıdır: `main` push'u `auto-release.yml` ile bump/tag üretir; oluşan `v*` tag'i `changelog.yml` iş akışını tetikleyip `CHANGELOG.md` değişikliğini `main` branch'ine geri gönderir.

```bash
cd Agentbase && node bin/changelog.js --all         # Tüm tag'lerden CHANGELOG üret
cd Agentbase && node bin/changelog.js --from v1.0.0 # Belirli tag'den itibaren
cd Agentbase && node bin/changelog.js --release v2.0.0 --dry-run  # Kuru çalıştırma
```

## Katkı

Katkı yapmak istiyorsanız [CONTRIBUTING.md](CONTRIBUTING.md) dosyasını okuyun.

## Güvenlik

Güvenlik açığı bildirimi için [SECURITY.md](SECURITY.md) dosyasını okuyun. Public issue **açmayın** — hello@varien.software adresine bildirin.

## Lisans

Bu proje [MIT](LICENSE) lisansı ile sunulmaktadır. Copyright (c) 2026 Varien Software.

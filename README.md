![Agentic Workflow banner](Docbase/assets/agentic-workflow-banner.png)

[![Tests](https://img.shields.io/github/actions/workflow/status/varienos/agentic-workflow/test.yml?label=tests&logo=github)](https://github.com/varienos/agentic-workflow/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Powered-blueviolet?logo=anthropic)](https://docs.anthropic.com/claude-code)
[![GitHub Stars](https://img.shields.io/github/stars/varienos/agentic-workflow)](https://github.com/varienos/agentic-workflow)

> **[English version (README.en.md)](README.en.md)**

> [!IMPORTANT]
> Bu sistem iki zorunlu bağımlılığa dayanır:
> - **[Backlog.md](https://github.com/MrLesk/Backlog.md)** — tüm görev yaşam döngüsü (oluşturma, önceliklendirme, implementasyon, review, kapatma) Backlog.md CLI ile yönetilir.
> - **[basic-memory](https://github.com/basicmachines-co/basic-memory)** — shared agent memory layer. Tüm CLI ajanları (Claude, Codex, Gemini, Kimi, OpenCode) `Docbase/memory/` vault'ı üzerinden ortak hafızaya bağlanır. `uv` (Python paket yöneticisi) ve Python 3.12+ gerekir.
>
> Her ikisi de kurulu değilse Bootstrap çalışmaz.

Claude Code ile yazılım geliştirmenin yaşam döngüsünü yöneten bir workflow sistemidir. Görev planlama, uygulama, review, bug fix ve deploy kontrollerini yapılandırılmış komutlar, ajanlar ve koruma mekanizmalarıyla birleştirir.

Mevcut bir projeye entegre edebilir veya sıfırdan yeni bir proje başlatabilirsiniz. `/bootstrap` komutu projeyi tanır, eksik bilgileri kısa bir röportajla tamamlar ve projeye özel workflow dosyalarını üretir.

## Ne Sağlar?

- **Otonom görev yönetimi** — Backlog'dan görev al, planla, implement et, test et, commit et, kapat. Tek komutla.
- **Otomatik code review** — 3+1 agent ile her değişikliği inceler: kod kalitesi, sessiz hatalar, regresyon riski. Güvenlik değişikliklerinde koşullu Devils Advocate perspektifi.
- **Akıllı bug fix** — Root cause analizi, maks 3 hipotez, minimal fix, regresyon testi. Sonsuz derinliğe dalmaz.
- **Deploy güvenlik ağı** — Pre-push git hook'ları localhost leak, migration ve env sync kontrolleri yapar. `/{varyant}-pre-deploy` ve `/{varyant}-post-deploy` komutları da Docker, Coolify veya Vercel gibi hedeflere özel kontrol raporu üretir.
- **Shared agent memory layer** — `basic-memory` MCP ile tüm CLI ajanları (Claude, Codex, Gemini, Kimi, OpenCode) `Docbase/memory/` vault'ı üzerinden ortak Markdown knowledge graph'ına bağlanır. Oturum ve CLI arası kalıcı, paylaşılan hafıza — bir ajanın yazdığı not diğerinden anında görünür.
- **Codebase config koruması** — Claude Code runtime'ında `codebase-guard` hook'u Codebase içine `.claude/`, `CLAUDE.md`, `.mcp.json` yazmayı otomatik engeller. Agent config dosyaları yalnızca Agentbase'de yaşar.
- **Test zorlama** — Claude Code runtime'ında `test-enforcer` hook'u kaynak dosya değişikliklerinde ilgili testlerin çalıştırılmasını hatırlatır. Pre-push hook'u ile test geçmeden push engellenir.
- **Proje-spesifik kurallar** — Stack'inize göre hook'lar, framework kuralları ve koruma mekanizmaları otomatik üretilir.
- **Canlı oturum izleme** — Birden fazla Claude Code oturumunu tek terminal ekranından takip edin.
- **Worktree-dostu mimari** — Agentbase/Codebase ayrımı worktree kullanımını mimari olarak destekler (bkz. Worktree Avantajı bölümü).
- **Çoklu CLI desteği** — Claude Code çıktıları `transform.js` ile Gemini CLI, Codex CLI, Kimi CLI ve OpenCode formatlarına dönüştürülebilir. Codex hedefi skill/context yüzeyi üretir; ikinci bootstrap veya otomatik hook parity iddiası taşımaz.
- **Dokümantasyon senkronizasyonu** — Claude Code runtime'ında `doc-drift-check` hook'u kod değişikliği sonrası README, CHANGELOG veya OpenAPI güncellemesi gerekebileceğini hatırlatır.
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

Bu ayrımın üç önemli sonucu vardır:

- Git işlemleri hedef proje tarafında, yani `Codebase/` içinde yürür.
- Bootstrap süreci `Codebase/` dizinine yazmaz; üretimi `Agentbase/` ve `Docbase/agentic/` altında yapar. Backlog da `Agentbase/backlog/` içinde oluşturulur.
- **İki-repo teslimat (opsiyonel):** Proje kökü geliştiricinin kendi git reposu olabilir (Agentbase + Docbase'i versiyonlar); `Codebase/` ayrı, bağımsız bir repo olarak kalır ve müşteriye tertemiz teslim edilir (aşağıya bakın).

Not: Bu template repo kendi geliştirme backlog'unu kökteki `backlog/` dizininde tutar; bootstrap ile hedef workspace için üretilen backlog ise `Agentbase/backlog/` altında yaşar.

### İki-Repo Teslimat Modeli

Aynı `Agentbase/Codebase/Docbase` ayrımı, isteğe bağlı bir teslimat modelini de mümkün kılar (iki ayrı repo — submodule değil):

- **Üst kök (proje kökü)** geliştiricinin kendi git reposu olabilir; `Agentbase/` ve `Docbase/`'i (workflow ortamı + doküman/memory) versiyonlar, `Codebase/`'i `.gitignore` ile yok sayar.
- **`Codebase/`** kendi bağımsız git reposudur ve müşteriye **ayrı** teslim edilir.

Sonuç: geliştirici üst-kök repoyu klonlar (Agentbase + Docbase gelir) ve `Codebase`'i **ayrıca** klonlar/bağlar (gitignore'lu olduğu için üst-kök klonuyla gelmez); müşteri ise yalnızca `Codebase` reposunu klonlar — workflow düzeneğinden hiçbir iz taşımayan tertemiz bir teslimat.

Bootstrap proje köküne hazır bir `.gitignore` üretir (`Codebase` + worktree dizinleri hariç) ve isteğe bağlı `git init` rehberi sunar; ajanlar üst-kök repoya asla dokunmaz (tüm ajan git işlemleri `../Codebase/` içinde kalır).

### Worktree Avantajı

Agentbase/Codebase ayrımı git worktree ile paralel geliştirmeyi destekler.
Hedef Codebase yolu **tek sözleşmeden** çözülür: `Agentbase/.claude/hooks/shared-hook-utils.js` içindeki `resolveCodebaseRoot()` helper'ı tüm hook'lar tarafından çağrılır.
Öncelik sırası: `process.env.AGENTIC_CODEBASE_DIR` > `manifest.project.structure` > `../Codebase` fallback.

```
Agentbase/                  ← SABIT — tüm worktree'ler aynı config'i kullanır
│
├── .claude/commands/       ← Kurallar, hook'lar, agent'lar TEK yerde
├── .claude/hooks/
│   └── shared-hook-utils.js  ← resolveCodebaseRoot(): env > manifest > fallback
├── .claude/rules/
│
Codebase/ → proje (main)            ← Ana worktree
Codebase/ → Codebase-wt-feat-auth   ← git worktree add (feature/auth branch)
Codebase/ → Codebase-wt-feat-pay    ← git worktree add (feature/payment branch)
```

Geleneksel yapıda `.claude/` proje kökünde yaşar; worktree oluştururken her birinde ayrı `.claude/` kopyası oluşur, config değişiklikleri senkronize olmaz. Agentbase ayrımı bu sorunu kökten çözer:

- **Tek config, çok worktree** — Hook'lar, kurallar, agent'lar hep aynı
- **İzole git tarihçesi** — Agentbase dosyaları proje commit'lerine karışmaz
- **Paralel oturum** — 4 terminal, 4 worktree, 4 Claude Code oturumu, tek Agentbase

#### Hedef Worktree'yi Seçme

Üç yöntem, öncelik sırasına göre:

| Yöntem | Komut | Kapsam |
| --- | --- | --- |
| **Runtime override** | `export AGENTIC_CODEBASE_DIR=/abs/path/Codebase-wt-feat-auth && claude` | Tek terminal/oturum — env'i set eden Claude Code oturumu o yolu hedefler |
| **Worktree symlink** | `rm Codebase && ln -s /yeni/yol Codebase` | Kalıcı, manifest sabit kalır — repo köküne tek bir aktif Codebase bağlar |
| **Manifest güncelleme** | `Docbase/agentic/project-manifest.yaml` → `project.structure` + `/workflow-update` | Kalıcı, regenerate gerekir — üretilen hook fallback'leri yeni yolu işaret eder |

**Pratik:** Aynı anda 4 worktree'de paralel çalışmak için her terminalde farklı bir `AGENTIC_CODEBASE_DIR` set edin. Tek bir Agentbase üzerinden tüm hook'lar doğru worktree'yi hedefler.

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
/goal /bootstrap until "BOOTSTRAP_COMPLETE"
```

> **Neden `/goal` ile?** Bootstrap çok adımlıdır. `/goal`, `BOOTSTRAP_COMPLETE` marker'ı üretilene kadar eksikleri yeni turda kapatır; böylece dosyaların doğru konuma yazılması ve sürecin yarıda kalmaması daha güvenilir olur. Doğrudan `/bootstrap` da çalışır, ancak hata durumunda manuel tekrar gerekir.

### Sıfırdan yeni proje (greenfield)

```bash
git clone https://github.com/varienos/agentic-workflow
cd agentic-workflow

# Codebase klasörünü boş bırakın — Bootstrap greenfield moduna geçer
rm -f Codebase/.gitkeep
cd Agentbase
npm install
claude
```

Claude Code içinde:

```
/goal /bootstrap until "BOOTSTRAP_COMPLETE"
```

Bootstrap boş Codebase tespit ettiğinde greenfield moduna geçer: stack seçimini sorar, workflow dosyalarını üretir ve scaffold kurulum komutlarını gösterir. Dizin gerçek proje dosyası içermemelidir; `.gitkeep` ve `.DS_Store` placeholder olarak yok sayılır, README veya package dosyası gibi gerçek içerik varsa bootstrap mevcut proje modu ile başlar.

## Bootstrap Akışı

`/bootstrap` komutu yüksek seviyede şu adımlarla çalışır:

0. **`/goal` mod zorunluluğu.** Bootstrap `/goal` modunda çalıştırılır. ADIM 8'deki tamamlama kapısı geçmeden süreç bitmiş sayılmaz. Doğru çağrı: `/goal /bootstrap until "BOOTSTRAP_COMPLETE"`.
1. **Ön koşul kontrolleri.** Backlog CLI, `Codebase/` erişimi ve varsa önceki manifest kontrol edilir.
2. **Codebase analizi.** Proje tipi, dizin yapısı, alt projeler, paket yöneticisi, test araçları ve modül adayları çıkarılır.
3. **Fazlı röportaj.** Proje, teknik tercih, geliştirici profili ve domain kuralları netleştirilir.
4. **Manifest üretimi.** `Docbase/agentic/project-manifest.yaml` dosyası oluşturulur.
5. **Dosya üretimi.** Manifeste göre komutlar, ajanlar, hook'lar, kurallar ve yardımcı dokümanlar üretilir.
   Root dokümanlar (`PROJECT.md`, `STACK.md`, `DEVELOPER.md`, `ARCHITECTURE.md`, `WORKFLOWS.md`, `CLAUDE.md`, `onboarding.md`) **Agentbase root'una** yazılır; `.claude/` altına yazılmaz.
   Böylece Claude, Gemini, Codex, Kimi ve OpenCode aynı kök bağlamı okuyabilir. Codex hedefi seçildiyse ayrı bootstrap çalıştırılmaz; transform sonrası opsiyonel `/codex-verify` adımı yalnızca Codex çıktı yüzeyini denetler.
6. **Backlog başlatma.** Backlog `Agentbase/backlog/` dizininde oluşturulur ve başlangıç görevleri yaratılır.
7. **Tamamlanma raporu.** Onboarding rehberi (`onboarding.md`), eklenti önerileri ve git hook etkinleştirme komutu gösterilir: `cd ../Codebase && git config core.hooksPath "$(realpath ../Agentbase/git-hooks/)"`
8. **Tamamlama doğrulama kapısı.** Gate A-H + B2 seti manifesti, root doküman konumunu, root `CLAUDE.md` importlarını, `.claude/` runtime dosyalarını, backlog kurulumunu ve Codebase sızıntısı olmadığını doğrular. PASS durumunda `BOOTSTRAP_COMPLETE` marker'ı basılır; FAIL durumunda `/goal` yeni turla eksikleri kapatır.

Yeniden çalıştırmalarda `overwrite`, `merge` ve `incremental` senaryoları desteklenir; tüm modlarda ADIM 8 tamamlama doğrulama kapısı çalışır.

## Komutlar

Bootstrap tamamlandıktan sonra kullanılabilir hale gelen komutlar:

Bu bölüm Claude Code slash command yüzeyini anlatır. `transform.js` ile üretilen diğer CLI hedeflerinde aynı workflow dosya/skill formatına dönüştürülür; Codex hedefinde native slash command garantisi verilmez.

### /task-plan

Bir isteği analiz eder ve uygulanabilir backlog görevine dönüştürür. Etkilenen dosyaları, karmaşıklığı, kabul kriterlerini ve gerekiyorsa görev bölmeyi hazırlar. Kod yazmaz; uygulama `/task-hunter` tarafında yapılır.

```
/task-plan "Kullanıcı profil sayfasına avatar yükleme özelliği ekle"
/task-plan "API rate limiting implement et"
```

### /task-master

Backlog'daki açık görevleri etki, risk, bağımlılık ve karmaşıklık boyutlarıyla önceliklendirir. Çıktı faz bazlıdır: önce kritik görevler, sonra önemli ve planlı işler gelir. Kullanıcının elle önceliklendirdiği görevler ayrı MANUEL fazda gösterilir.

```
/task-master
```

### /task-hunter

Backlog'daki bir görevi uçtan uca uygular. Görevi okur, etkilenen dosyaları bulur, plan çıkarır, kodu yazar, testleri çalıştırır, commit eder ve görevi kapatır. Karmaşık işlerde paralel teammate çalışması başlatabilir.

```
/task-hunter 42          # Tek görev
/task-hunter 42,43,44    # Sırayla birden fazla görev (virgülle)
/task-hunter auth        # Keyword ile görev arama
```

### /task-conductor

Birden fazla görevi faz bazlı orkestre eder. Varsayılan davranış plan üretmektir; kod yazma ve backlog güncelleme yalnızca açık `run` modunda yapılır. Paralel yazım ancak izole worktree/branch ile çalışır, `all` modu ayrıca `--confirm-all` ister. Kesintiden sonra `resume` ile devam edebilir; bir fazda art arda 3 hata oluşursa durur.

```
/task-conductor plan top 5                  # En yüksek öncelikli 5 görev için plan
/task-conductor plan all                    # Tüm açık görevler için plan
/task-conductor plan 3,5,8                  # Belirli görevler için plan
/task-conductor plan keyword auth           # Keyword ile plan
/task-conductor run top 5 --max-parallel 2  # Kontrollü uygulama
/task-conductor run all --confirm-all       # Tüm açık görevleri açık onayla uygula
/task-conductor resume                      # Kaldığı yerden devam et
/task-conductor status                      # State/lock durumunu oku
/task-conductor abort                       # Aktif conductor run'ını kapat
```

### /task-review

Son değişiklikleri 3+1 agent ile inceler. Kod kalitesi, sessiz hata riski ve regresyon ihtimali ayrı ayrı değerlendirilir. Güvenlik, auth, ödeme veya migration değişikliklerinde Devils Advocate de çalışır. Önceden var olan önemli bulgular "scope dışı" diye atlanmaz; backlog'a kaydedilir.

```
/task-review                    # Son commit
/task-review abc1234            # Belirli commit
/task-review HEAD~3..HEAD       # Commit aralığı
```

### /auto-review

Son diff'i tekrar tekrar güvenli şekilde review eder. Aynı diff'i iki kez incelememek için hash kullanır. MINOR bulguları doğrudan düzeltir; MAJOR bulgular için backlog görevi açar. Periyodik çalıştırma senaryolarına uygundur.

```
/auto-review                    # Son commit
/auto-review abc1234            # Belirli commit
/auto-review HEAD~3..HEAD       # Commit aralığı
```

### /bug-hunter

Bug'in root cause'unu bulur ve düzeltir. İlgili dosyaları bulur, en fazla 3 hipotez dener, minimal fix uygular ve regresyon testi ekler. 3 denemede sonuca ulaşamazsa bulguları raporlar ve durur.

```
/bug-hunter "Kullanıcı giriş yaptıktan sonra profil sayfası 500 hatası veriyor"
/bug-hunter "Bildirimler sayfası sonsuz döngüye giriyor"
```

### /bug-review

Bug fix'ini 3 perspektiften inceler: kalite, sessiz hata riski ve regresyon riski. Sonsuz döngüyü önlemek için en fazla 1 düzeltme iterasyonu çalışır.

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

### /codex-verify

Codex hedefi seçildiyse `transform.js` çıktısını denetleyen opsiyonel adımdır. Codex için ikinci bootstrap yoktur; bu komut manifesti, `.codex/skills/*/SKILL.md` dosyalarını ve `AGENTS.md` dosyasını kontrol eder. Hook runtime parity iddiası taşımaz ve sadece Codex hedef yüzeyindeki küçük uyumsuzlukları raporlar.

```
/codex-verify
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

Projede kullanılmayan kodu tespit eder ve temizlik önerir. Çağrılmayan fonksiyonlar, import edilmeyen modüller ve unreachable branch'ler taranır. Bulgular güven seviyesine göre sınıflandırılır; yüksek güvenli bulgular için otomatik temizlik önerilir.

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

**Ön koşul:** Bootstrap tamamlandıktan sonra `session-tracker` hook'u `.claude/hooks/` altına kopyalanır. Hook her tool çağrısında oturum durumunu `.claude/tracking/sessions/` dosyasına yazar. Bootstrap tamamlanmamışsa veya `git config core.hooksPath` komutu çalıştırılmamışsa dashboard boş görünür:

```bash
cd Agentbase && node bin/session-monitor.js
```

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ AGENTIC WORKFLOW  [Timeline] [Agent Radar]  2 aktif 1 boşta 17:05            │
├──────────────────────────────────────────────────────────────────────────────┤
│ › ● 45012  TASK-24 Merge conflict yönetimi  [uygulama]  42dk                 │
│   Son işlem: Edited workflow-lifecycle.skeleton.md                           │
│   Backlog: In Progress · high · AC 1/2  |  bekleme yok  |  hata 0  |  ajan 1 │
│                                                                              │
│   ○ 45078  TASK-11 Auto-review loop  [bekleme]  18dk                         │
│   Son işlem: Test failed: npm test                                           │
│   Backlog: In Progress · medium · AC 2/5  |  bekleme test  |  hata 1         │
├──────────────────────────────────────────────────────────────────────────────┤
│ Tab Sekme  j/k Seç  Enter Detay  c Kapalı gizle  h Yardım  q Çıkış           │
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
- **Knowledge Graph:** Graphify (`/g` slash komutu, BFS query, PreToolUse hook ile akıllı yönlendirme — grep yerine `graphify query` önerisi)
- **Ek alanlar:** Monorepo, güvenlik taramaları, CI/CD (GitHub Actions, GitLab CI), izleme (Sentry, Datadog), API dokümantasyonu (OpenAPI, GraphQL)

### Generic Bootstrap Desteği

Aşağıdaki stack'ler bootstrap tarafından algılanır ve manifest'e yazılır, ancak framework-spesifik hook/rule/agent şablonları yoktur — yalnızca çekirdek komutlar (task-hunter, task-review vb.) ve genel korumalar (secret tarama, lock dosyası koruması) üretilir:

- **Frontend:** Vue, Svelte
- **Backend:** Flask
- **ORM:** Sequelize, Drizzle

Go, Rust ve Java/Kotlin mevcut proje analizinde otomatik tespit edilir (`go.mod`, `Cargo.toml`, `pom.xml`, `build.gradle`, `build.gradle.kts`).
Greenfield modunda bu stack'ler röportajda seçilir. Bu aileler generic kapsamda kalır: framework-spesifik hook/rule/agent üretimi yapılmaz; çekirdek workflow komutları ve genel güvenlik kontrolleri üretilir.
Listelenmeyen stack'ler için manifest elle zenginleştirilebilir.

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

Dönüştürme süreci `.claude/` çıktısını ana kaynak olarak kullanır ve hedef CLI'ın anlayacağı formata adapte eder. Komut çağırma sözdizimi (`/` → `$`, `@` vb.), dosya yolu referansları ve TOML/YAML/Markdown çıktıları otomatik üretilir. `generate.js` değiştirilmez; transform ayrı bir dönüştürme adımıdır.

Codex hedefinde çıktı `Agentbase/.codex/skills/*/SKILL.md` ve `Agentbase/AGENTS.md` olarak üretilir.
Codex için ikinci bootstrap yoktur: `manifest.targets` alanındaki `codex`, Claude çıktısını Codex formatına dönüştürme hedefidir.
Codex tarafı komut runtime'ı değil, skill/context yüzeyidir; native slash command garantisi verilmez.
Transform çağrı örneklerini hedef sözdizimine uyarlar; gerçek tetikleme Codex'in skill mekanizmasına ve oturum bağlamına bağlıdır.
Transformdan sonra `/codex-verify` ile skill frontmatter'ını, path adaptasyonlarını ve hook parity iddiası olmadığını kontrol edebilirsiniz.

## Üretimde Kanıtlanmış Desenler

Bu template'deki her kural bir production deneyiminden doğmuştur:

| Desen | Sağladığı koruma |
|-------|--------|
| `prisma db push` yasağı | Migration dışı schema değişikliklerinin production'a gitmesini önler |
| 3 hipotez sınırı | Sonsuz root cause aramasını durdurur |
| 4D skorlama | Tutarlı, tekrarlanabilir önceliklendirme |
| 3+1 agent paralel review | Sessiz hata ve regresyon riskini ayrı perspektiflerle yakalar |
| Faz bazlı orkestrasyon | Plan-first çalışır, paralel işi izole worktree/branch ile kontrollü fazlara böler |
| Failure cascade tablosu | Aynı hatada tekrar eden retry döngülerini durdurur |
| Destructive migration tespiti | Riskli migration değişikliklerini push öncesi görünür kılar |
| `db-migration-discipline` | Schema değişikliklerinde migration, dry-run, rollback/down ve destructive taramanın zorunlu hale gelmesi |
| Pre-existing bulgu kuralı | Önemli bulguların "scope dışı" diyerek atlanmasını önler |

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

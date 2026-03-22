# Workflow

## Geliştirme Akışı

```
Bootstrap → Planner → Hunter → Review (ops.) → Quality → Push
    │           │          │          │               │        │
    │           │          │          │               │        └── pre-push hook:
    │           │          │          │               │            son kapı (lint, test, standards)
    │           │          │          │               └── Standartlara uygun mu?
    │           │          │          │                   (naming, docblock, lint, conventions)
    │           │          │          └── Kod doğru çalışıyor mu?
    │           │          │              (mantık, edge case, test)
    │           │          └── Task'ı uygular
    │           └── Task oluşturur (metod + model + review kararı)
    └── Proje init (röportaj → workspace → backlog → ilk task'lar)
```

| Adım | Kim? | Komut | Ne yapar? | Zorunlu mu? |
|---|---|---|---|---|
| **Bootstrap** | Opus | `/bootstrap` | Röportaj, workspace oluşturma, backlog init, eklenti seçimi | Proje başında 1 kere |
| **Master** | Opus | `/task-master` | Backlog'u skorlayıp öncelik sıralaması çıkarır | İsteğe bağlı |
| **Planner** | **Opus 4.6 (max)** | `/task-plan` | Task oluşturur, derin analiz, model önerisi, kapsam bölme, review kararı | Her task |
| **Hunter** | Sonnet 4.6 | `/task-hunter` | Task'ı uygular — kod yazar, test yazar, doğrular, commit eder | Her task |
| **Review** | Sonnet (temiz) | `/task-review` | 3+1 agent: code-reviewer + silent-failure-hunter + regression-analyzer + kosullu devils-advocate | Opsiyonel — planner karar verir |
| **Quality** | Sonnet (temiz) | — | Standartlara uygunluk: CONVENTIONS.md, naming, docblock, lint | Review → otomatik, tek başına da tetiklenebilir |
| **Bug Hunter** | Sonnet 4.6 | `/bug-hunter` | Root cause bul, düzelt, test yaz, commit et | Bug bildirimi geldiğinde |
| **Bug Review** | Sonnet (temiz) | `/bug-review` | Paralel 3 agent: kalite + sessiz hata + regresyon | Bug fix sonrası |
| **Deep Audit** | Sonnet (paralel) | `/deep-audit` | Modülü uçtan uca denetler — paralel uzman agent'lar, iki boyutlu değerlendirme, basitse fix karmaşıksa backlog | Modül olgunlaşınca veya isteğe bağlı |
| **Pre-push hook** | Sistem | — | Son kapı — lint, test suite, static analysis | Her zaman zorunlu |

> **Quality tetiklenme kuralları:**
> - Review tetiklendiyse → Quality otomatik tetiklenir
> - Review tetiklenmese bile → Quality tek başına tetiklenebilir (planner kararı)
> - Her iki durumda da → Pre-push hook son kapı olarak standartları zorlar

---

## Task Planlama

Her task'a başlamadan önce iki şey belirle:
1. **Metod** — Görevin tipine göre hangi workflow metodu kullanılacak _(bkz. [methods.md](methods.md))_
2. **Model** — Görevin karmaşıklığına göre hangi model kullanılacak _(bkz. [models.md](models.md))_ — token/maliyet optimizasyonu için kritik

| Görev tipi | Önerilen metod |
|---|---|
| Yeni feature geliştirme | RPI (Research → Plan → Implement) |
| Büyük / çok dosyalı feature | Orchestrator Pattern veya Fan-Out/Gather |
| Spec'i belli, kodu belirsiz | Spec-Driven Development |
| Bug fix | AECA (hata → düzelt → test → doğrula) |
| Otonom tekrarlayan görev | Ralph Wiggum Loop |
| Kod kalitesi / review | Dual-Pass, Cross-Model Review veya Generator-Critic |
| Karmaşık problem, belirsiz çözüm | Ultrathink + Plan-Act-Reflect |
| Uzun süren görev (context tükenir) | Context Cycling + Compact Pattern |
| CI/CD pipeline otomasyonu | Headless / CI Agent |
| Agent takılıyor / kalitesiz çıktı | Model Musical Chairs |
| Tam proje yaşam döngüsü (SDLC) | BMAD Method veya SPARC |
| Sprint planlama (hangi görev agent'a uygun?) | AI-Augmented Scrum |

---

## Version Control / Git Workflow

- `main` / `master` → canlıya yakın
- `develop` → geliştirme
- `feature/...` → yeni özellik
- `hotfix/...` → acil düzeltme

---

## Merge Conflict Yönetimi

Çoklu agent/worktree çalışmasında conflict kaçınılmaz. 3 katmanlı savunma:

### Katman 1: Önleme (Planner seviyesi)

- Planner task oluştururken **dosya etki analizi** yapmalı
- Aynı dosyaya dokunan task'lar aynı anda farklı worktree'lere atanmamalı
- Task metadata'ya `affected_files` alanı ekle — planner bunu doldurur, orchestrator çakışma kontrolü yapar

### Katman 2: Tespit (Hook/script seviyesi)

```bash
# Pre-push hook: main ile trial merge
git fetch origin main
git merge-tree $(git merge-base HEAD origin/main) HEAD origin/main

# Conflict varsa → push engellenir, agent uyarılır
```

- Agent push öncesi main ile trial merge çalıştırır
- Conflict tespit edilirse push engellenir

### Katman 3: Çözüm (Agent davranışı)

Conflict tespit edildiğinde agent'ın 3 seçeneği:

| Durum | Aksiyon |
|---|---|
| **Basit conflict** (aynı dosya, farklı bölümler) | Agent otomatik resolve eder, test çalıştırır, devam eder |
| **Karmaşık conflict** (aynı satırlar, mantık çakışması) | Agent durur, insan çağırır, backlog'a `CONFLICT` task açar |
| **Kendi değişikliği önemsiz** | Agent kendi değişikliğini geri alır, main'den günceller, task'ı yeniden uygular |

### Agent disiplin kuralı

- Her task başında `git pull origin main` — güncel başla
- Task bittiğinde hemen merge et — uzun süre açık bırakma
- Push öncesi trial merge zorunlu

---

## Agent Hata Takibi

Agent'ların yaptığı hatalar `shared/errors.md` dosyasında takip edilmeli. Amaç: aynı hatanın tekrarlanmaması ve hatalardan öğrenilmesi.

### Hata Kayıt Formatı

```markdown
## [HATA-001] Kısa başlık

- **Tarih:** 2026-03-15
- **Agent:** Claude Sonnet 4.6
- **Görev:** Login endpoint refactoring
- **Hata:** Service katmanında doğrudan DB query yazıldı, repository pattern atlandı
- **Etki:** Mimari ihlal, separation of concerns bozuldu
- **Kök neden:** CLAUDE.md'de repository pattern kuralı tanımlı değildi
- **Çözüm:** CONVENTIONS.md'ye repository pattern kuralı eklendi
- **Ders:** Agent'a mimari kurallar açıkça belirtilmezse varsayılan olarak en kısa yolu seçer
```

### Hata Kategorileri

| Kategori | Açıklama |
|---|---|
| `MIMARI` | Katman ihlali, pattern atlanması, yanlış bağımlılık |
| `KALITE` | Test eksik, docblock unutulmuş, lint hatası |
| `MANTIK` | Yanlış iş kuralı uygulaması, edge case kaçırma |
| `CONTEXT` | Agent projeyi yanlış anlamış, yanlış dosyayı değiştirmiş |
| `GÜVENLIK` | Hassas veri sızıntısı, input validation eksik |
| `CONVENTION` | Naming hatası, format uyumsuzluğu, commit mesajı yanlış |

### Süreç

1. Hata fark edildiğinde `shared/errors.md`'ye kayıt formatında eklenir
2. Kök neden analiz edilir — agent mi hatalı, context mi eksik?
3. Çözüm uygulanır (genellikle CLAUDE.md veya CONVENTIONS.md güncellenir)
4. Ders çıkarılır ve tekrarı engellenir

> **Uyarı:** Bu dosyayı bürokratik hale getirme. Her küçük typo veya formatlama hatasını kaydetme — sadece **tekrarlama riski olan yapısal hataları** kaydet. Amaç arşiv değil, öğrenme.

---

## Agent Geliştirme Disiplini

- **Dalkavukluk yapma.** Hata varsa söyle, fikir kötüyse söyle, kod kalitesi düşükse söyle. Geliştiricinin duymak istediğini değil, bilmesi gerekeni söyle. Dalkavukluk geliştiricinin en çok yanıldığı ve en geç fark ettiği problem kaynağı.
- **Mimari kararlar insana ait.** Agent kod yazabilir, test yazabilir, review yapabilir — ama mimari sınır koyamaz, "bu olmasın" diyemez, beklenmedik bir mantıksızlığı kendi başına fark edip düzeltemez. Agent verilen mimariyi uygular, mimariyi tasarlamaz. Planner task oluşturur ama mimari değişiklikler geliştirici onayı olmadan yapılmaz.
- Her görev tamamlandığında ihtiyaca göre test yazılmalı ve testler çalıştırılarak hatasız olduğu doğrulanmalı
- Her dosya kaydedilmeden önce dosya tipine uygun syntax doğrulaması yapılmalı (lint/parse)
- Her fonksiyon için standart açıklama (docblock/docstring) eklenmeli
- Kod okunabilirliği öncelikli tutulmalı — anlaşılır isimlendirme, küçük fonksiyonlar, net akış

---

## API Geliştirme

- Her API endpoint'i için OpenAPI (Swagger) tanımı zorunlu — önce spec yazılır, sonra kod üretilir veya doğrulanır
- API testi otomatik olmalı — OpenAPI spec'inden otomatik test üretimi (Schemathesis, Dredd vb.)
- Postman Collection export'u zorunlu — her API sürümünde güncel collection paylaşılmalı
- Sıra: **OpenAPI spec → Kod → Otomatik test → Postman export**

---

## Test / Kalite Güvencesi

_"Yaptığımız şey gerçekten doğru çalışıyor mu?"_

### TDD — Test Driven Development

1. Önce testi yaz
2. Testi geçecek kadar kod yaz
3. Refactor et

Bu model özellikle kritik iş mantığında güçlüdür.

### BDD — Behavior Driven Development

İş kuralları davranış diliyle yazılır: Given → When → Then

İş birimi ile teknik ekip arasında köprü kurar.

### Test Pyramid

- Çok sayıda unit test
- Daha az integration test
- Daha da az E2E test

### Tam Döngü: Kod Değişikliği → Test → Commit → CI

**3 savunma hattı:**

| Hat | Ne zaman | Kim için | Davranış |
|---|---|---|---|
| **test-enforcer hook** | Her Edit/Write | Agent | systemMessage ile test yazma/guncelleme talimati verir. Test dosyasi yoksa olusturulmasini, varsa guncellenmesini ister |
| **Doğrulama kapısı + pre-commit** | Commit anı | Agent + İnsan | Agent: syntax → derleme → test çalıştırır, TESTS_VERIFIED=1 bayrağı koyar. İnsan: hook testleri koşar + baseline comparison |
| **CI pipeline** | Push/PR | Herkes | Paralel job'lar, fail → merge engellenir. Son savunma hattı |

**Pre-existing hata yönetimi:**

Agent test fail ile karşılaştığında:
1. `git stash` → baseline test çalıştır → `git stash pop`
2. Baseline da kırık mı? → **Evet:** pre-existing hata, backlog task oluştur, TESTS_VERIFIED=1 ile commit'e devam et
3. Baseline OK ama senin değişikliğin kırıyor mu? → **Düzelt**, tekrar test et

```
Agent pre-existing hata buldu
  → Backlog task: "Pre-existing test hatası: XyzTest"
  → Sonraki task-hunter çalıştığında bu task listeye girer
  → Düzeltildiğinde baseline temizlenir
```

**Eski vs yeni davranış:**

| Eski | Yeni |
|---|---|
| Agent: "Test fail, benim değişikliğim değil, commit yapamam" → DURUYOR | Agent: baseline kontrol → pre-existing mi? → backlog task → DEVAM EDİYOR |
| Pre-existing hata kayboluyor, kimse düzeltmiyor | Pre-existing hata backlog'a giriyor → takip ediliyor → düzeltiliyor |

---

## Dağıtım / DevOps / Canlıya Alma

_"Bunu güvenli ve sürdürülebilir şekilde nasıl yayınlarız?"_

| Kavram | Ne işe yarar? |
|---|---|
| CI | Kod birleşince otomatik test/build |
| CD | Otomatik dağıtım |
| IaC | Altyapıyı kodla yönetme |
| Containerization | Ortam tutarlılığı sağlar |
| Rollback | Sorunlu yayını geri çekme |

### Prensipler

- Küçük ve sık deploy
- Ortam tutarlılığı
- Otomatik test + build
- Gözlemlenebilirlik

### Araçlar

- **Docker** → uygulamayı paketleme
- **CI/CD pipelines** → GitHub Actions, GitLab CI vb.
- **Env management** → `.env`, secrets
- **Blue-Green / Canary Deployment** → risksiz geçiş

---

## Bakım / İzleme / Sürekli İyileştirme

_"Sistem canlıda sağlıklı mı ve nasıl iyileştiririz?"_

| Kavram | Ne işe yarar? |
|---|---|
| Monitoring | Sistem ayakta mı? |
| Logging | Hataları analiz etme |
| APM | Performans gözlemleme |
| SLA / SLO / SLI | Hizmet seviyesi hedefleri ve ölçüm metrikleri |
| Postmortem | Hata neden oldu, tekrar nasıl önlenir? |

Ölçmediğin şeyi yönetemezsin.

---

## Hızlı Eşleştirme — Hangi Aşamada Hangi Prensip Kritik?

| Aşama | En kritik yaklaşım / prensip |
|---|---|
| İhtiyaç Analizi | MVP, YAGNI, net scope |
| Planlama | Agile / Scrum / Kanban, backlog yönetimi |
| Tasarım | SOLID, DRY, SoC, doğru mimari |
| Geliştirme | Clean Code, code review, refactoring |
| Test | TDD, test pyramid, regression |
| Dağıtım | CI/CD, otomasyon, rollback |
| Bakım | Monitoring, logging, postmortem |

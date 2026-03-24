# Katki Rehberi

> **Note:** This document is in Turkish. For English speakers: contributions follow standard GitHub flow — fork, branch, commit (conventional format), test, PR. See sections below for details.

Agentic Workflow'a katki yapmayi dusundugunuz icin tesekkurler!

## Nasil Katki Yapabilirim?

### Hata Bildirimi

1. Once [mevcut issue'lari](https://github.com/varienos/agentic-workflow/issues) kontrol edin
2. Ayni sorun bildirilmemisse yeni issue acin
3. Sorunu yeniden uretmek icin gerekli adimlari ekleyin
4. Beklenen ve gerceklesen davranisi belirtin

### Ozellik Onerisi

1. Oneriyi [issue olarak acin](https://github.com/varienos/agentic-workflow/issues/new)
2. Onerinin ne problemi cozecegini aciklayin
3. Mumkunse cozum yaklasimini belirtin

### Kod Katkisi

1. Repo'yu fork edin
2. Yeni bir branch olusturun: `git checkout -b feat/ozellik-adi`
3. Degisikliklerinizi yapin
4. Testleri calistirin: `cd Agentbase && npm test`
5. Commit atin: `git commit -m "feat: aciklama"`
6. Push edin: `git push origin feat/ozellik-adi`
7. Pull Request acin

### Commit Kurallari

Conventional Commits formatini kullanin:

| Prefix | Kullanim |
|--------|----------|
| `feat:` | Yeni ozellik |
| `fix:` | Hata duzeltme |
| `docs:` | Dokumantasyon |
| `test:` | Test ekleme/duzeltme |
| `refactor:` | Yeniden duzenleme |

### Yeni Modul Ekleme

Yeni bir stack/framework modulu eklemek icin:

1. `Agentbase/templates/modules/` altinda uygun kategoriye dizin olusturun
2. `detect.md` dosyasinda tespit kosullarini tanimlayin
3. Hook, rule veya command skeleton'larini ekleyin
4. Mevcut modulleri pattern olarak kullanin
5. Test yazin

### detect.md Nasil Calisir?

Her modul, o modulun projeye uygulanip uygulanmayacagini belirleyen bir `detect.md` dosyasi icerir.

**Kontrol listesi (`Checks`):** Dosya varligini veya bagimlilik varligini dogrulayan maddelerin listesidir.

```markdown
## Checks

- file_exists: vercel.json
- dependency: vercel
- file_exists: .vercel/
```

**Minimum Match:** Kac kontrolun eslemesi gerektigini belirtir. `2/3` degeri, uc kontrolden en az ikisinin gerceklestiginde modulun aktive edilecegi anlamina gelir. Bu, kullanicilarin her kontrol dosyasini olusturmak zorunda kalmadan modulu aktive etmesine olanak tanir.

```markdown
## Minimum Match

2/3
```

**Cakisma Cozumu:** Birden fazla modul ayni dosyalara eslestiginde (ornegin Docker ve Coolify her ikisi de `docker-compose.yml` dosyasina bakabilir), Bootstrap roportajdaki "Deploy platformunuz nedir?" sorusu ile kullaniciyi netlestirir. Coolify secildiginde Docker modulu YERINE Coolify aktive edilir; Docker ciktisini ust katman olarak kullandigi icin cakisma ortadan kalkar.

**Kategori detect.md:** Modul dizininin kokunde bulunan `detect.md`, o kategorinin tum varyantlarini listeler ve hangisinin once kontrol edilecegini belirtir. Varyantlar sirasi onem tasiyabilir (ornegin NestJS → Fastify → Express: daha spesifik olandan daha genele dogru).

**Activates:** Modul aktive olunca `generate.js`'in uretecegi dosyalar listesidir: commands (slash komutlari), agents (sub-agent'lar), rules (kural dosyalari).

```markdown
## Activates

- commands/pre-deploy.skeleton.md (slash command)
- agents/frontend.skeleton.md (sub-agent)
```

### Dosya Isimlendirme Kurallari

**`.skeleton` suffix'i:** Template dosyalari `.skeleton.md`, `.skeleton.js` veya `.skeleton.json` uzantisi kullanir. `generate.js` bu dosyalari islerken GENERATE bloklarini doldurur ve `.skeleton` uzantisini kaldirir (`task-hunter.skeleton.md` → `task-hunter.md`). Sabit dosyalar (GENERATE blogu icermeyen hook'lar gibi) `.skeleton` suffix'i olmadan saklanir ve oldugu gibi kopyalanir.

**Dizin yapisi:**
- `templates/core/` — Her projede uretilen iskeletler (commands, hooks, rules, agents, git-hooks)
- `templates/modules/{kategori}/{varyant}/` — Modul-spesifik dosyalar (sadece aktif moduller icin uretilir)
- `templates/reference/` — Tasarim referans dokumanlari (v1 notlari, is akisi, metotlar). Bu dosyalar generate.js tarafindan ISLENMEZ — bootstrap komutunun baglam olarak okudugu dahili referanslardir.
- `templates/interview/` — Bootstrap roportaj sablonlari. generate.js tarafindan islenmez.

### Onemli Dizin Aciklamalari

- **`Codebase/`** — Uzerinde calisilan gercek proje kodunu temsil eder. Bu dizin depoda yer tutucudur; kullanici kendi projesini symlink ile baglar (`ln -s /path/to/project Codebase`). Greenfield modunda bos birakilir ve bootstrap sifirdan olusturur.
- **`Docs/agentic/project-manifest.yaml`** — Bootstrap tarafindan uretilen manifest dosyasi. Depoda bastan YOKTUR — ilk `/bootstrap` calistirmasinda olusturulur. `generate.js` ve `transform.js` bu dosyayi girdi olarak kullanir.

### Bootstrap Roportaj Sablonlari

`Agentbase/templates/interview/` dizininde dort roportaj sablon dosyasi bulunur. Bu dosyalar `generate.js` tarafindan islenmez; Bootstrap komutunun bir projeye ilk kez uygulanirken baglam olarak okudugu dahili referanslardir.

| Dosya | Amaç | Urettigi Dosyalar |
|-------|------|-------------------|
| `phase-1-project.md` | Proje temelleri — projenin ne oldugu, ortamlari, deploy yontemi | `PROJECT.md`, `ARCHITECTURE.md`, `README.md` |
| `phase-2-technical.md` | Teknik tercihler — test stratejisi, branch modeli, commit convention, ORM, auth | `STACK.md`, `WORKFLOWS.md`, hook konfigurasyonu |
| `phase-3-developer.md` | Gelistirici profili — deneyim seviyesi, calisma dili, otonom calisma beklentisi | `DEVELOPER.md`, agent davranis kalibrasyonu |
| `phase-4-rules.md` | Domain kurallari — yasakli komutlar, tasarim sistemi, guvenlik seviyesi | `rules/` dizini, koruma hook'lari |

**Nasil calisir:** Bootstrap, `/bootstrap` komutu calistirildiginda bu roportaj sablonlarini sirasi ile izler. Her phase, kullaniciya sorular sormadan once codebase'i otomatik olarak tarar (auto-detection) ve mevcut bilgileri on doldurur. Kullanicinin yanitleri `Docs/agentic/project-manifest.yaml` dosyasina kaydedilir ve `generate.js` bu manifestten proje-spesifik dosyalari uretir.

**Katkida bulunmak icin:** Yeni bir soru veya auto-detection kurali eklemek istiyorsaniz ilgili phase dosyasini duzenleyin. Mevcut soru yapisini (`Questions`, `Skip condition`, `Maps to`, `Downstream`) koru.

```bash
cd Agentbase
npm test          # Tum testler
```

Yeni eklenen her JS dosyasi icin test dosyasi ZORUNLUDUR.

### Test Dosyasi Yerlesimi

| Test Dosyasi | Ne Test Eder |
|---|---|
| `generate.test.js` | generate.js fonksiyonlari, SIMPLE_GENERATORS, CLI arguman parse |
| `transform.test.js` | transform.js donusum fonksiyonlari (extractDescription, TOML/YAML formatlari) |
| `tests/changelog.test.js` | CHANGELOG uretici yardimcilari (formatDate, groupByType) |
| `tests/codebase-guard.test.js` | codebase-guard hook'u — Codebase config path engelleme kurallari |
| `tests/core-hooks.test.js` | Core hook'lar (code-review, test-enforcer, team-trigger, auto-test-runner, auto-format, openapi-sync) |
| `tests/generate-regressions.test.js` | generate.js regresyon ve CLI entegrasyon testleri |
| `tests/git-hooks.test.js` | Git pre-commit/pre-push hook'lari (E2E: temp git repo ile) |
| `tests/guard-hooks.test.js` | Framework guard hook'lari (artisan, spark, django, manage-py) |
| `tests/hook-edge-cases.test.js` | Tum hook'larda edge case dayanikliligi (bos stdin, bozuk JSON, uzun path) |
| `tests/kutsal-rules-regressions.test.js` | Kutsal kural regresyonlari — skeleton'larda config yazma ve git siniri kontrolu |
| `tests/prisma-hooks.test.js` | Prisma-spesifik hook'lar (db-push-guard, migration-check, destructive-migration) |
| `tests/release.test.js` | Release script yardimcilari (detectBump: major/minor/patch karar mantigi) |
| `tests/session-observability.test.js` | Session-tracker ve session-monitor testleri |

### Hook Test Yardimcilari

`tests/helpers/` altindaki iki yardimci:

- **`hook-runner.js`** — `createTempProject`, `materializeHook`, `runHook`, `writeCodebaseFile`, `makeHookInput` fonksiyonlari. Hook'lari temp dizinde materyalize edip `spawnSync` ile calistirir.
- **`module-loader.js`** — `loadModuleExports` fonksiyonu. Skeleton JS dosyalarindan pure fonksiyonlari `vm.runInNewContext` ile cikarip test etmeye yarar. `replacements` ile GENERATE bloklarini doldurup `exports` ile fonksiyon listesi belirtilir.

### Eklenti Referanslari

`Agentbase/templates/extensions-registry.md` 3. parti eklenti referanslarini icerir. Bootstrap sirasinda Opus bu listeden proje ihtiyacina uygun eklentileri onerir. Bu dosya generate.js tarafindan ISLENMEZ — bootstrap komutunun baglam olarak okudugu bir referanstir. Yeni eklenti eklemek icin dosyadaki tablo formatini takip edin.

## Iletisim

Sorulariniz icin: hello@varien.software

## Lisans

Katkida bulunarak, katkinizin MIT lisansi altinda yayinlanacagini kabul etmis olursunuz.

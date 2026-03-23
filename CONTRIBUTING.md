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

### Test

```bash
cd Agentbase
npm test          # Tum testler
```

Yeni eklenen her JS dosyasi icin test dosyasi ZORUNLUDUR.

## Iletisim

Sorulariniz icin: hello@varien.software

## Lisans

Katkida bulunarak, katkinizin MIT lisansi altinda yayinlanacagini kabul etmis olursunuz.

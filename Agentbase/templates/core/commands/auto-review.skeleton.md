# Auto Review - Loop Uyumlu Diff Review

> Son review hash'ini izler, yeni diff varsa shallow review yapar, MINOR bulgulari dogrudan duzeltir, MAJOR bulgular icin backlog task acar.
> Kullanim: `/auto-review`, `/auto-review <commit_hash>`, `/auto-review HEAD~3..HEAD`

---

<!-- GENERATE: CODEBASE_CONTEXT
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.description, stack.primary, project.structure
Ornek cikti:
## Proje Baglami
- **Proje:** E-ticaret platformu (Next.js + NestJS + React Native)
- **Stack:** TypeScript, Prisma, PostgreSQL, Expo
- Auto-review sirasinda stack-spesifik kurallari goz onunde bulundur.
-->

---

## Step 1 - Diff ve State Tespiti

### 1.1 - Arguman Cozumleme

| Girdi | Davranis |
|---|---|
| Bos | Son commit: `cd ../Codebase && git diff HEAD~1..HEAD` |
| Commit hash | Belirtilen commit: `cd ../Codebase && git show <hash>` |
| Range | Aralik: `cd ../Codebase && git diff <range>` |

### 1.2 - Normalize Diff Cikar

Review edilecek diff'i deterministik sekilde cikar:

```bash
cd ../Codebase && git diff --no-ext-diff --minimal <range_veya_default>
```

Bu diff'ten su bilgileri cikar:
- Degisen dosya listesi
- Eklenen/silinen satir sayilari
- Degisiklik tipi (fix, refactor, test, config)

> **KURAL:** Diff bossa veya sadece whitespace degisikligi varsa "Incelenecek yeni degisiklik yok" deyip DUR.

### 1.3 - Hash Hesapla

Diff hash'ini stabil sekilde hesapla:

```bash
CURRENT_DIFF_HASH=$(cd ../Codebase && git diff --no-ext-diff --minimal <range_veya_default> | shasum -a 256 | awk '{print $1}')
CURRENT_HEAD=$(cd ../Codebase && git rev-parse HEAD)
```

### 1.4 - State Dosyasini Yukle

`.claude/tracking/auto-review-state.json` dosyasini kullan:

```json
{
  "last_reviewed_hash": null,
  "last_review_target": null,
  "last_reviewed_head": null,
  "last_reviewed_at": null,
  "last_fix_commit": null,
  "last_report_path": null
}
```

Dosya yoksa olustur:

```bash
mkdir -p .claude/tracking .claude/reports/reviews
```

### 1.5 - Tekrar Onleme Kapisi

State'e gore asagidaki no-op durumlarini kontrol et:

1. `CURRENT_DIFF_HASH == last_reviewed_hash` ise: ayni diff daha once incelenmis, DUR
2. `CURRENT_HEAD == last_fix_commit` ve working tree temizse: son commit auto-review tarafindan olusturulmus, yeni insan diff'i yok, DUR
3. Hedef range/hash ile state'teki `last_review_target` ayni ve yeni diff yoksa: tekrar calisma, DUR

> **KURAL:** Skip edilen durumda state'i bozma. Sadece rapora `SKIPPED_ALREADY_REVIEWED` veya `SKIPPED_AUTO_REVIEW_COMMIT` sonucu yaz.

---

## Step 2 - Shallow Review Yap

### 2.1 - Review Kapsami

Bu komut full audit yapmaz. Sadece loop-uyumlu, sinirli bir inceleme yapar:
- Sadece mevcut diff ve hemen komsu satirlari
- Maksimum 5 dosya veya 300 degisen satir
- Maksimum 3 gecerli bulgu
- Tek iterasyon, tekrar spawn veya recursive review YOK

### 2.2 - Shallow Kontrol Listesi

Her degisiklik icin hizli ama somut kontrol uygula:

- [ ] Mantik hatasi veya bariz yanlis kosul var mi?
- [ ] Sessiz hata riski var mi? (`catch {}`, eksik `await`, kayip `return`)
- [ ] Test veya dogrulama eksikligi net ve lokal mi?
- [ ] Guvenlik, veri butunlugu veya API kontrati riski var mi?
- [ ] Bu sorun diff'in kendi kodunda mi, yoksa diff-disi eski bir sorun mu?

### 2.3 - Bulgulari Siniflandir

#### MINOR Bulgular

Asagidaki tipte bulgular MINOR sayilir:
- Tek dosyada veya tek kucuk blokta cozulur
- Davranis niyeti acik, cozum deterministik
- Guvenlik, migration, veri kaybi veya API kontrati riski YOK
- Duzeltme sonrasi hedefli dogrulama komutu bellidir

#### MAJOR Bulgular

Asagidaki tipte bulgular MAJOR sayilir:
- Guvenlik, veri kaybi, yetki, migration veya production etkisi vardir
- Birden fazla dosya/modul/subsystem etkilenir
- Beklenen davranis belirsizdir, insan karari gerekir
- Duzeltme ek tasarim, buyuk refactor veya kapsamli arastirma gerektirir

### 2.4 - False Positive ve Diff-Disi Sorun Filtresi

Her bulgu icin su siralamayi uygula:

```
Bulgu var mi?
├── HAYIR -> Temiz rapor
└── EVET -> Gercek sorun mu?
    ├── HAYIR -> False positive, rapordan cikar
    └── EVET -> Diff'in kendi kodunda mi?
        ├── EVET -> MINOR veya MAJOR olarak siniflandir
        └── HAYIR -> Diff-disi teknik borc, backlog task olarak kaydet
```

> **KURAL:** Diff-disi sorunu dogrudan duzeltme. Backlog'a yaz, devam et.

---

## Step 3 - Bulgulara Gore Aksiyon Al

### 3.1 - MINOR Bulgulari Duzelt

MINOR bulgu varsa:

1. Minimal ve lokal degisikligi uygula
2. Yalnizca etkilenen alani dogrulayan komutu calistir
3. Duzeltmeleri ayri bir commit ile kaydet:

```bash
git add <ilgili_dosyalar>
git commit -m "fix: auto-review bulgusu - <kisa_ozet>"
```

4. `last_fix_commit` alanina yeni commit hash'ini yaz

> **KURAL:** Bir iterasyonda en fazla 1 auto-review fix commit'i at.
> **KURAL:** Duzeltme sonrasi AYNI KOMUTU tekrar calistirip ikinci review turu baslatma.

### 3.2 - MAJOR Bulgular Icin Backlog Task Ac

Her MAJOR bulgu icin backlog task olustur:

```bash
backlog task create "Auto-review bulgusu: <sorun_ozeti>" \
  --description "<neden major oldugu, etkilenen dosyalar, onerilen sonraki adim>" \
  --priority "medium" \
  --labels "review,auto-review,tech-debt"
```

Task aciklamasinda mutlaka sunlar olsun:
- Etkilenen diff/range veya commit
- Sorunun neden MAJOR sayildigi
- Risk alani (guvenlik, regresyon, veri, mimari)
- Onerilen ilk inceleme noktasi

### 3.3 - Diff-Disi Sorunlari Kaydet

Review sirasinda diff disi onceki bir sorun fark edilirse:

```bash
backlog task create "Auto-review tech-debt: <sorun_ozeti>" \
  --description "<sorun diff disi, bu yuzden inline fix yapilmadi>" \
  --priority "low" \
  --labels "review,auto-review,tech-debt"
```

> **KURAL:** Diff-disi bulgular icin kodu degistirme.

---

## Step 4 - Rapor ve State Guncelle

### 4.1 - Rapor Yaz

Her calismada `.claude/reports/reviews/auto-review-<timestamp>.md` dosyasini yaz:

```markdown
# Auto Review Raporu

- Hedef: <range_veya_hash>
- Diff hash: <hash>
- Sonuc: <REVIEW_OK | FIXED_MINOR | MAJOR_TASKS_CREATED | SKIPPED_ALREADY_REVIEWED | SKIPPED_AUTO_REVIEW_COMMIT>
- MINOR fix commit: <hash veya yok>
- MAJOR task'lar: <id listesi veya yok>
- Notlar: <kisa ozet>
```

### 4.2 - State Guncelle

Review tamamlandiysa state'i guncelle:

```json
{
  "last_reviewed_hash": "<CURRENT_DIFF_HASH>",
  "last_review_target": "<range_veya_hash>",
  "last_reviewed_head": "<CURRENT_HEAD veya fix sonrasi yeni HEAD>",
  "last_reviewed_at": "<timestamp>",
  "last_fix_commit": "<varsa_fix_commit>",
  "last_report_path": ".claude/reports/reviews/auto-review-<timestamp>.md"
}
```

> **KURAL:** State yalnizca review karari netlestikten sonra guncellenir.
> **KURAL:** MAJOR task acildiysa bile hash guncellenir; ayni diff sonraki loop'ta tekrar incelenmez.

---

## Step 5 - Sonuc Formati

```
## Auto Review Sonucu

### Incelenen Hedef
- Commit/Range: <hedef>
- Diff hash: <hash>

### Aksiyonlar
- MINOR fix sayisi: <0 veya 1>
- MAJOR task sayisi: <0..n>
- Diff-disi task sayisi: <0..n>

### Sonuc
- REVIEW_OK / FIXED_MINOR / MAJOR_TASKS_CREATED / SKIPPED_ALREADY_REVIEWED / SKIPPED_AUTO_REVIEW_COMMIT

### Sonraki Adim
- <gerekirse insan review veya ilgili backlog task ID'leri>
```

---

## /loop Uyumlulugu Sozlesmesi

Bu komut `/loop` ile kullanildiginda su garantileri saglar:

1. **Idempotent giris** - Ayni diff hash ikinci kez islenmez
2. **Sinirli etki** - Tek iterasyonda en fazla 1 fix commit ve sinirli sayida backlog task
3. **Kendini tekrar review etmez** - `last_fix_commit` kontrolu ile kendi commit'ine takilmaz
4. **Tek pas** - Fix yapsa bile ayni run icinde ikinci review turu baslatmaz
5. **Temiz cikis** - Yeni diff yoksa veya ayni hash gorulduyse hizli ve sessiz sekilde biter

---

## Zorunlu Kurallar

### Kutsal Kurallar (Her Komutta Gecerli)

1. **Codebase e config YAZMA** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` dosyalari SADECE Agentbase icinde olusturulur. Codebase icinde `.claude/` dizini olusturma, `../Codebase/CLAUDE.md` yazma YASAK.
2. **Git sadece Codebase de** — Tum git islemleri (commit, push, branch) `../Codebase/` icinde yapilir. Agentbase'de git YOKTUR.
3. **Codebase OKUNUR, config YAZILMAZ** — Proje dosyalari (`src/`, `app/`, vb.) okunabilir ve gorev gerekiyorsa duzenlenebilir. Config dosyalari (`.claude/`, `CLAUDE.md`) Codebase icinde YAZILAMAZ.

1. **Hash kontrolu zorunlu** - `last_reviewed_hash` karsilastirmasi olmadan review baslatma.
2. **Tek iterasyon limiti** - Bu komut kendi icinde loop kurmaz, kendini tekrar cagirma.
3. **Shallow review** - Full code audit veya kapsam genisletme YASAK.
4. **MINOR lokal olmali** - Lokal ve deterministik olmayan hicbir bulguyu inline fix yapma.
5. **MAJOR backlog'a gider** - Riskli veya belirsiz bulgular icin task ac, koda dokunma.
6. **Diff-disi sorunlari duzeltme** - Backlog'a kaydet, inline fix yapma.
7. **Ayni diff'i tekrar etme** - State guncellenmisse ayni hash icin review tekrarlanmaz.
8. **Kendi fix commit'ine takilma** - `last_fix_commit` kontrolu zorunlu.
9. **Backlog CLI kullan** - Task olusturma/guncelleme islemlerini SADECE `backlog` komutlari ile yap.
10. **Codebase yolu** - Tum git ve kod erisimleri `../Codebase/` uzerinden yapilir.

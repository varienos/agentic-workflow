# Bug Hunter — Otonom Hata Bulucu ve Duzeltucu

> Hata aciklamasini alir, kok nedeni bulur, duzeltir, test eder, commit atar.
> Kullanim: `/bug-hunter <hata_aciklamasi>`, `/bug-hunter "sepete urun eklenemiyor"`

---

<!-- GENERATE: CODEBASE_CONTEXT
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.description, stack.primary, project.structure, project.subprojects
Ornek cikti:
## Proje Baglami
- **Proje:** E-ticaret platformu (Next.js + NestJS + React Native)
- **Stack:** TypeScript, Prisma, PostgreSQL, Expo
- **Yapi:**
  - `apps/web/` — Next.js frontend
  - `apps/api/` — NestJS backend
  - `apps/mobile/` — Expo React Native
  - `packages/shared/` — Paylasilan tipler ve yardimcilar
-->

---

## Step 1 — Hata Aciklamasini Cozumle

Kullanicinin hata aciklamasından asagidaki bilgileri cikar:

| Alan | Aciklama | Ornek |
|---|---|---|
| **Belirti** | Ne oluyor? | "Sepete urun eklenemiyor" |
| **Beklenen davranis** | Ne olmali? | "Urun sepete eklenmeli" |
| **Baglam** | Nerede oluyor? | "Web uygulama, urun detay sayfasi" |
| **Tekrarlanabilirlik** | Her seferinde mi? | "Her seferinde" / "Bazen" |
| **Hata mesaji** | Varsa | "TypeError: Cannot read property..." |

> **KURAL:** Hata aciklamasi cok belirsizse (orn. "calismıyor") bile SORU SORMA. Eldeki bilgiyle analiz et.

---

## Step 2 — Hafiza Arastirmasi

Benzer hatalar daha once duzeltildi mi? Episodic memory'de ara:

1. Benzer belirti iceren gecmis oturumlar
2. Ayni modul/dosyada yapilan onceki duzeltmeler
3. Tekrarlayan hata pattern'leri

Bulgu varsa:
- Onceki cozumu referans al
- Ayni kok neden mi kontrol et
- Regresyon mu yoksa farkli hata mi ayirt et

---

## Step 3 — Kok Neden Analizi

### 3.1 — Kapsami Daralt

Hata aciklamasindan yola cikarak:

1. **Hangi alt proje?** (API, Web, Mobile, Shared)
2. **Hangi modul/ozellik?** (auth, orders, payments, ...)
3. **Hangi katman?** (UI, service, data, config)

Ilgili dosyalari belirle ve oku.

### 3.2 — Hipotez Olustur

En olasi kok nedenler icin hipotezler olustur (max 3):

```
## Hipotezler

### Hipotez 1 (En olasi)
- **Tahmin:** [ne yanlis olabilir]
- **Dosya:** [hangi dosya]
- **Neden:** [neden bu dusunuluyor]
- **Dogrulama:** [nasil dogrulanir]

### Hipotez 2
- ...

### Hipotez 3
- ...
```

### 3.3 — Hipotez Dogrulama

Her hipotezi sirayla dogrula:

1. Ilgili dosyayi oku
2. Suphelenilen kodu incele
3. Mantik akisini takip et
4. Hatanin kaynagini bul

**Dogrulama sonuclari:**
- ✅ Dogrulandi → Step 4'e gec
- ❌ Yanlis → Sonraki hipoteze gec

### 3.4 — 3 Hipotez Limiti

> **KURAL:** 3 hipotez denendiyse ve hicbiri dogrulanmadiysa → DURDUR.
> Kullaniciya bildir: "3 hipotez denendi, kok neden bulunamadi. Daha fazla baglam gerekli."

---

## Step 4 — Duzeltme Plani

### 4.1 — Plan Olustur

```
## Duzeltme Plani

### Kok Neden
[bulunan kok neden]

### Duzeltme
- **Dosya:** [yol]
- **Degisiklik:** [ne yapilacak]
- **Neden:** [neden bu cozum]

### Yan Etki Analizi
- [bu duzeltme baska yerleri etkiler mi?]
- [mevcut testler kirilir mi?]
- [performans etkisi var mi?]
```

### 4.2 — Minimal Duzeltme Ilkesi

> **KURAL:** SADECE hatayi duzelt. Refactor YAPMA, iyilestirme YAPMA, cleanup YAPMA.
> Hatanin cozumu icin gereken minimum degisikligi uygula.

---

## Step 5 — Duzeltmeyi Uygula

1. Kok neden dosyasini oku (zaten okunmus olmali)
2. Duzeltmeyi uygula
3. Degisikligi dogrula (syntax kontrolu)

> **KURAL:** Duzeltme sirasinda "bunu da iyilestireyim" dusuncesine KAPILMA. Sadece hata duzeltmesi.

---

## Step 6 — Dogrulama Kapisi

### 6.1 — Test Yaz

Hatanin tekrarlanmadigini dogrulayan bir test yaz:

```
// Bu test, [hata_aciklamasi] hatasinin duzeltildigini dogrular
test('[hata_senaryosu] artik dogru calisiyor', () => {
  // Hatayi tetikleyen senaryo
  // Beklenen dogru davranis
});
```

### 6.2 — Testleri Calistir

<!-- GENERATE: VERIFICATION_COMMANDS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.subprojects, project.scripts, stack.test_framework
Ornek cikti:
Her alt proje icin test ve dogrulama komutlari:

| Alt Proje | Komut | Aciklama |
|---|---|---|
| API | `cd ../Codebase/apps/api && npm run test` | Jest birim testleri |
| API (lint) | `cd ../Codebase/apps/api && npm run lint` | ESLint kontrolu |
| API (type) | `cd ../Codebase/apps/api && npx tsc --noEmit` | TypeScript tip kontrolu |
| Web | `cd ../Codebase/apps/web && npm run test` | Birim testleri |
| Web (build) | `cd ../Codebase/apps/web && npm run build` | Build dogrulamasi |
| Mobile | `cd ../Codebase/apps/mobile && npx tsc --noEmit` | TypeScript tip kontrolu |
-->

### 6.3 — Test Sonucu Degerlendirme

- **Tum testler gecti** → Step 7'ye gec
- **Yeni test basarisiz** → Duzeltmeyi gozden gecir (max 3 deneme)
- **Mevcut test basarisiz** → Onceden var olan hata protokolu:

**Onceden Var Olan Hata Protokolu:**
1. Duzeltmeyi geri al (git stash)
2. Testi calistir — hala basarisiz mi?
3. EVET → Onceden var olan hata, yoksay. Duzeltmeyi geri yukle.
4. HAYIR → Duzeltme mevcut testi bozmus, duzeltmeyi revize et.

---

## Step 7 — Commit

### 7.1 — Dosya Hazirlama

```bash
git add <duzeltme_dosyasi> <test_dosyasi>
```

> **KURAL:** Sadece duzeltme ve ilgili test dosyalarini ekle. `git add .` YASAK.

### 7.2 — Iliskili Gorev Tespiti

Backlog'da bu hatayla ilgili gorev var mi?

```
backlog task list --plain
```

Baslik veya aciklamada eslesen gorev bul. Bulursa commit mesajinda referans ver.

### 7.3 — Commit Mesaji

<!-- GENERATE: COMMIT_CONVENTION
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: conventions.commit_language, conventions.commit_format
Ornek cikti:
### Commit Format (Bug Fix)

```
fix: <hata_ozeti>
```

Iliskili gorev varsa:
```
fix: <hata_ozeti> (#<task_id>)
```

**Dil:** Turkce
**Ornek:** `fix: sepete urun ekleme hatasi duzeltildi (#34)`
-->

---

## Step 8 — Backlog Gorevi

### 8.1 — Mevcut Gorev Guncelleme

Eger iliskili gorev bulunduysa:
```
backlog task edit <id> -s "Done" --append-notes "[BUG FIX] <ozet>"
```

### 8.2 — Yeni Gorev Olusturma

Eger iliskili gorev yoksa, yapilan isi kaydet:
```
backlog task create \
  "fix: <hata_ozeti>" \
  --description "<detay>" \
  --priority "high" \
  --labels "bug" \
  -s "Done"
```

---

## Step 9 — Kullanici Raporu

```
## Bug Fix Raporu

### Hata
**Belirti:** [kullanicinin aciklamasi]
**Kok Neden:** [bulunan kok neden]
**Dosya:** [etkilenen dosya(lar)]

### Duzeltme
| Dosya | Degisiklik |
|---|---|
| `<yol>` | <ne yapildi> |

### Test
- [x] Regresyon testi yazildi: [test_adi]
- [x] Mevcut testler gecti
- [x] Lint/Type kontrolu temiz

### Commit
`<hash>` — `<mesaj>`

### Kok Neden Analizi
**Hipotez sureci:**
1. [Hipotez 1] — [sonuc]
2. [Hipotez 2] — [sonuc] (eger denendiyse)

**Neden bu hata olustu:**
[kisa aciklama — gelecekte benzer hatalari onlemeye yardimci olacak bilgi]
```

---

## Zorunlu Kurallar

### Kutsal Kurallar (Her Komutta Gecerli)

1. **Codebase e config YAZMA** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` dosyalari SADECE Agentbase icinde olusturulur. Codebase icinde `.claude/` dizini olusturma, `../Codebase/CLAUDE.md` yazma YASAK.
2. **Git sadece Codebase de** — Tum git islemleri (commit, push, branch) `../Codebase/` icinde yapilir. Agentbase'de git YOKTUR.
3. **Codebase OKUNUR, config YAZILMAZ** — Proje dosyalari (`src/`, `app/`, vb.) okunabilir ve gorev gerekiyorsa duzenlenebilir. Config dosyalari (`.claude/`, `CLAUDE.md`) Codebase icinde YAZILAMAZ.

1. **Kok nedeni bul** — Belirtiyi degil, kok nedeni duzelt. Band-aid cozum YASAK.
2. **Minimal duzeltme** — Sadece hatayi duzelt. Refactor, iyilestirme, cleanup YAPMA.
3. **Otonom calis** — Hata aciklamasi belirsiz olsa bile soru sorma, analiz et.
4. **3 hipotez limiti** — 3 hipotez basarisiz olursa DUR, kullaniciya bildir.
5. **Test yaz** — Her duzeltme icin regresyon testi zorunlu.
6. **Onceden var olan hatalari yoksay** — Senin duzeltmenden once var olan testleri DUZELTME.
7. **Sadece duzeltme dosyalarini commit'le** — `git add .` yasak.
8. **Iliskili gorev ara** — Backlog'da bu hatayla ilgili gorev varsa referans ver.
9. **Pattern'leri koru** — Duzeltme sirasinda mevcut pattern'leri takip et.
10. **Backlog CLI kullan** — Gorev islemlerini SADECE CLI ile yap.
11. **Codebase yolu** — Tum dosya erisimleri `../Codebase/` uzerinden.
12. **Guvenlik** — Credential, secret, `.env` degerleri ASLA log'a yazilmaz.

# Memorize — Oturum Ogrenme Kaydedici

> Mevcut oturumdaki onemli ogrenimleri analiz eder ve hafizaya kaydeder.
> Kullanim: `/memorize`, `/memorize "auth modulu icin ogrenilenler"`

---

## Felsefe

Her sey kaydetmeye deger degildir. Hafiza, gelecekte TEKRAR KARSILASILDACAK bilgileri saklar.
"Bunu bilseydim daha hizli yapardim" testini gec: ileride ayni durumla karsilasan ajan bu bilgiden faydalanir mi?

---

## Step 1 — Oturum Analizi

Mevcut konusmadaki tum etkilesimleri analiz et:

1. Hangi dosyalar uzerinde calisildi?
2. Hangi sorunlarla karsilasildi?
3. Nasil cozulduler?
4. Beklenmedik durumlar oldu mu?
5. Kullanici ozel tercihler belirtti mi?

---

## Step 2 — Ogrenimleri Siniflandir

### Kaydetmeye Deger Kategoriler

| Kategori | Aciklama | Ornek |
|---|---|---|
| **Cozum Deseni** | Belirli bir sorun icin bulunan cozum | "Prisma N+1 sorunu `include` ile cozuldu" |
| **Proje Konvansiyonu** | Kod tabanindaki kesfedilen gizli kural | "Service'ler hep `Result<T>` donuyor" |
| **Hata Tuzagi** | Kolay dusulen, zor bulunan hata | "useEffect cleanup'i eksik olunca memory leak" |
| **Mimari Karar** | Neden boyle yapilandirilmis | "Auth, gateway'de degil her service'de ayri" |
| **Kullanici Tercihi** | Kullanicinin belirttigi calisma tercihi | "PR aciklamalari Turkce olsun" |
| **Arac Kullanimi** | Belirli bir aracin kullanim detayi | "backlog CLI'da --set flag'i tirnak ister" |

### Kaydetmeye Deger OLMAYAN Seyler

- Genel programlama bilgisi (herkes bilir)
- Tek seferlik islemler (tekrarlanmayacak)
- Kisisel bilgiler (kullanici hakkinda spesifik olmayan)
- Cok spesifik debug adimlari (baglamsiz anlamsiz)
- Zaten dokumantasyonda olan bilgiler

---

## Step 3 — Hafiza Dosyalari Olustur

### 3.1 — Dosya Formati

Her ogrenme icin ayri bir hafiza dosyasi olustur:

**Kutsal Yol Kurali:**
- Agentbase .claude/memory/ dizini icine yaz
- Codebase icine hafiza dosyasi YAZMA

<!-- GENERATE: MEMORY_PATH
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.memory_path
Ornek cikti:
**Hafiza dizini:** `.claude/memory/`

Dosya yolu: `.claude/memory/<kategori>/<kebab-case-isim>.md`

Kategori dizinleri:
- `.claude/memory/patterns/` — Cozum desenleri
- `.claude/memory/conventions/` — Proje konvansiyonlari
- `.claude/memory/pitfalls/` — Hata tuzaklari
- `.claude/memory/decisions/` — Mimari kararlar
- `.claude/memory/preferences/` — Kullanici tercihleri
- `.claude/memory/tools/` — Arac kullanimi
-->

### 3.2 — Dosya Icerigi

Her hafiza dosyasi asagidaki formatta olmali:

```markdown
---
name: <kisa_isim>
description: <tek_cumle_aciklama>
type: <pattern|convention|pitfall|decision|preference|tool>
created: <tarih>
context: <hangi_gorev_veya_oturumda_orenildi>
---

## Ogrenme

[Ogrenilenin net aciklamasi — gelecekte karsilasan ajan bunu okuyup hemen anlayabilmeli]

## Baglam

[Hangi durumda karsilasildi, neden onemli]

## Ornek

[Varsa kod ornegi veya somut senaryo]
```

### 3.3 — Dosya Isimlendirme

- Kebab-case kullan: `prisma-n-plus-one-cozumu.md`
- Kisa ve aciklayici: ismi okuyan ne hakkinda oldugunu anlamali
- Tarih ekleme: dosya icindeki frontmatter'da zaten var

---

## Step 4 — Rapor

```
## Hafiza Raporu

### Kaydedilen Ogrenimler
| # | Kategori | Isim | Dosya |
|---|---|---|---|
| 1 | Cozum Deseni | Prisma N+1 cozumu | `patterns/prisma-n-plus-one-cozumu.md` |
| 2 | Hata Tuzagi | useEffect cleanup | `pitfalls/use-effect-cleanup-gerekli.md` |

### Atlanan Seyler
- [genel bilgi, tek seferlik islem vs. — neden kaydedilmedi]

### Istatistik
- **Analiz edilen etkilesim:** <sayi>
- **Kaydedilen ogrenme:** <sayi>
- **Atlanan:** <sayi>
```

---

## Zorunlu Kurallar

### Kutsal Kurallar (Her Komutta Gecerli)

1. **Codebase e config YAZMA** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` dosyalari SADECE Agentbase icinde olusturulur. Codebase icinde `.claude/` dizini olusturma, `../Codebase/CLAUDE.md` yazma YASAK.
2. **Git sadece Codebase de** — Tum git islemleri (commit, push, branch) `../Codebase/` icinde yapilir. Agentbase'de git YOKTUR.
3. **Codebase OKUNUR, config YAZILMAZ** — Proje dosyalari (`src/`, `app/`, vb.) okunabilir ve gorev gerekiyorsa duzenlenebilir. Config dosyalari (`.claude/`, `CLAUDE.md`) Codebase icinde YAZILAMAZ.

1. **Secici ol** — Her seyi kaydetme. "Bunu bilseydim daha hizli yapardim" testini uygula.
2. **Net yaz** — Gelecekte okuyan ajan bagiam olmadan anlamali.
3. **Ornek ekle** — Mumkunse somut kod ornegi veya senaryo ekle.
4. **Frontmatter zorunlu** — Her dosyada `name`, `description`, `type`, `created`, `context` olmali.
5. **Tekrar kontrol et** — Ayni ogrenme zaten kayitliysa TEKRAR KAYDETME.
6. **Kategoriyi dogru sec** — Yanlis kategoriye koymaktan kacin.
7. **Kisa tut** — Bir hafiza dosyasi 50 satirdan uzun olmamali.
8. **Hassas bilgi kaydetme** — Credential, secret, kisisel bilgi ASLA hafizaya yazilmaz.

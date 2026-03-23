# Task Review — 3+1 Ajanli Kod Inceleme

> Son commit veya belirtilen diff'i 3 paralel ajanla inceler. Guvenlik/auth/odeme/API/migration degisikliklerinde opsiyonel 4. ajan (devils-advocate) eklenir.
> Kullanim: `/task-review`, `/task-review <commit_hash>`, `/task-review HEAD~3..HEAD`

---

<!-- GENERATE: CODEBASE_CONTEXT
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.description, stack.primary, project.structure
Ornek cikti:
## Proje Baglami
- **Proje:** E-ticaret platformu (Next.js + NestJS + React Native)
- **Stack:** TypeScript, Prisma, PostgreSQL, Expo
- Review sirasinda stack-spesifik kurallari goz onunde bulundur.
-->

---

## Step 1 — Diff Cikar

### 1.1 — Arguman Cozumleme

| Girdi | Davranis |
|---|---|
| Bos | Son commit: `cd ../Codebase && git diff HEAD~1..HEAD` |
| Commit hash | Belirtilen commit: `cd ../Codebase && git show <hash>` |
| Range | Aralik: `cd ../Codebase && git diff <range>` |

### 1.2 — Diff Analizi

Diff'ten asagidaki bilgileri cikar:
- Degisen dosya listesi
- Her dosyadaki eklenen/silinen satirlar
- Degisikliklerin turu (yeni dosya, degisiklik, silme)

> **KURAL:** Diff bossa veya sadece whitespace degisikligi varsa, "Incelenecek degisiklik yok" deyip DUR.

---

## Step 2 — 3 Ajan Spawn Et

Asagidaki 3 ajanin HER BIRINI paralel olarak calistir. Her ajan diff'in tamami uzerinde calisir.

### Ajan 1 — Kod Inceleyici (Code Reviewer)

**Gorev:** Kod kalitesi, yapi, best practice kontrolu.

**Kontrol Listesi (Sabit Cekirdek):**

- [ ] **Mantik hatasi:** Yanlis kosul, eksik null check, off-by-one, yanlis operator
- [ ] **Hata yonetimi:** Try-catch eksikligi, hata yutma, generic catch, hata mesajlarinin bilgi icermemesi
- [ ] **Isimlendirme:** Degisken/fonksiyon isimleri anlamsiz, tutarsiz, yaniltici
- [ ] **Tekrar (Duplication):** Ayni kod birden fazla yerde, cikarilabilecek ortak fonksiyon
- [ ] **Performans:** Gereksiz dongu, N+1 query, eksik index kullanimi, gereksiz re-render
- [ ] **Guvenlik:** SQL injection, XSS, CSRF, yetkisiz erisim, hassas veri loglama
- [ ] **Tip guvenligi:** `any` kullanimi, eksik tip, yanlis tip assertion
- [ ] **Edge case:** Bos dizi, null/undefined, sinir degerleri, race condition

<!-- GENERATE: REVIEW_CHECKLIST
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: stack.primary, stack.conventions, project.rules
Ornek cikti:
**Stack-Spesifik Kontroller:**

- [ ] **Prisma:** Schema degisikligi varsa migration olusturulmus mu?
- [ ] **Prisma:** `findUnique` yerine `findFirst` gereksiz kullanilmis mi?
- [ ] **NestJS:** DTO validasyonu var mi? `class-validator` decorator'leri dogru mu?
- [ ] **NestJS:** Guard/Interceptor dogru uygulanmis mi?
- [ ] **Next.js:** Server/Client component ayrimi dogru mu? Gereksiz `'use client'` var mi?
- [ ] **Next.js:** `useEffect` icinde fetch yerine Server Component veya Route Handler kullanilabilir mi?
- [ ] **Expo:** Hardcoded renk var mi? `useTheme()` kullanilmis mi?
- [ ] **Expo:** Platform-spesifik kod `Platform.select()` ile mi yapilmis?
- [ ] **Guvenlik:** IDOR (Insecure Direct Object Reference) acigi var mi? Kullanici baska kullanicinin verisine erisebilir mi?
- [ ] **API:** Response format tutarli mi? Error response standarda uygun mu?
-->

### Ajan 2 — Sessiz Hata Avcisi (Silent Failure Hunter)

**Gorev:** Hata vermeden sessizce yanlis calisan kodlari bul.

**8 Noktali Kontrol Listesi:**

1. **Sessiz catch:** `catch(e) {}` veya `catch(e) { console.log(e) }` — hata yutulmus mu?
2. **Eksik await:** Async fonksiyon cagirilmis ama `await` unutulmus mu? Promise unhandled mi?
3. **Yanlis karsilastirma:** `==` vs `===`, falsy deger tuzagi (`0`, `""`, `false` vs `null`/`undefined`)
4. **Kayip return:** Fonksiyon return etmesi gereken yerde etmiyor mu? Early return eksik mi?
5. **State tutarsizligi:** Bir yer guncelleniyor ama iliskili yerler guncellenmiyor mu?
6. **Race condition:** Iki asenkron islem ayni veriye yaziyorsa siralama garanti mi?
7. **Varsayilan deger tuzagi:** `|| defaultValue` yerine `?? defaultValue` kullanilmali mi? (`0` ve `""` icin fark var)
8. **Kopyala-yapistir artigi:** Kopyalanmis ama guncellenmemis degisken/string var mi?

### Ajan 3 — Regresyon Analizcisi (Regression Analyzer)

**Gorev:** Degisikliklerin mevcut kodu bozma riskini degerlendir.

**Kontrol Alanlari:**

1. **Kaldirilan kod:** Silinen satirlar baska yerlerde kullaniliyor mu?
2. **Degisiklik yayilimi:** Degistirilen fonksiyon/tip baska dosyalarda import ediliyor mu?
3. **API kontrati:** Endpoint imzasi degistiyse consumer'lar etkilenir mi?
4. **Veritabani:** Schema degisikligi mevcut veriyi etkiler mi? Migration gerekli mi?
5. **Konfigurasyon:** Ortam degiskeni eklendi/degistiyse tum ortamlar guncellenmis mi?
6. **Test kapsami:** Degisikligin test'i var mi? Mevcut testler guncellenmis mi?

### Opsiyonel: Devils Advocate Analizi (Ajan 4)

Degisiklik asagidaki alanlardan birini etkiliyorsa `devils-advocate` agent'ini cagir:
- Guvenlik/auth/yetkilendirme dosyalari
- Odeme/finans/hassas veri isleme
- API endpoint'leri (public-facing)
- Veritabani schema/migration
- manifest.project.security_level == "high" veya "critical"

Yukaridaki kosullardan HICBIRI saglanmiyorsa bu adimi ATLA.

**Gorev:** Adversarial perspektiften kirilma noktalarini ve guvenlik aciklari bul.

**Kontrol Alanlari:**

1. **Edge case'ler:** NULL, bos, buyuk, negatif, unicode girdilerle kirilma
2. **Input fuzzing:** Malformed veri, beklenmeyen tipler, boundary degerler
3. **Olceklenebilirlik:** N+1 sorgu, bellek sizintisi, darbogazlar, 10x yuk
4. **Bagimlilk kirilganligi:** DB/API/cache cokerse ne olur? Retry/fallback var mi?
5. **Guvenlik saldiri yuzeyi:** IDOR, injection, yetki yukseltme, veri sizintisi

> **NOT:** Bu ajan diger 3 ajandan SONRA calistirilabilir (paralel olmasi zorunlu degil). Bulguları CRITICAL/HIGH/MEDIUM/LOW severity ile raporlar.

---

## Step 3 — Bulgulari Degerlendir

### 3.1 — Sonsuz Dongu Korumasi

> **KURAL:** Her ajan sadece 1 iterasyon yapar. Bulgu bulduysa raporlar, TEKRAR CALISTIRMAZ.

### 3.2 — Karar Agaci

Her bulgu icin su siralamayi uygula:

```
Bulgu var mi?
├── HAYIR → Temiz rapor
└── EVET → Bu bulgu gercek bir sorun mu?
    ├── HAYIR (False Positive) → Yanlis alarm, rapordan cikar
    └── EVET → Bu sorun diff'in kendi kodunda mi?
        ├── EVET → Duzeltilmesi GEREKEN bulgu
        └── HAYIR → Onceden var olan sorun mu?
            ├── EVET → Backlog'a gorev olustur, diff'e DOKUNMA
            └── HAYIR → Diff'in dolayli etkisi, raporda belirt
```

### 3.3 — False Positive Filtreleme

Asagidakiler genelde false positive'dir:
- Mevcut pattern'e uyan kod (proje zaten boyle yapiyor)
- Framework'un kendi pattern'i (orn. NestJS'de boilerplate)
- Kasitli trade-off (basitlik icin bilinc tercihi)

### 3.4 — Onceden Var Olan Bulgu Kurali

Diff'te olmayip onceden var olan sorunlar icin:

```
backlog task create "Review bulgusu: <sorun_ozeti>" --description "<detay>" --priority "low" --labels "tech-debt"
```

> **KURAL:** Onceden var olan sorunu DUZELTME. Backlog'a gorev olustur, raporla, devam et.

---

## Step 4 — Rapor Olustur

### 4.1 — Rapor Formati

```
## Kod Inceleme Raporu

### Incelenen Degisiklikler
- **Commit/Range:** <hash veya range>
- **Dosya sayisi:** <sayi>
- **Eklenen satirlar:** <sayi>
- **Silinen satirlar:** <sayi>

---

### 🔴 Kritik Bulgular (Duzeltilmeli)
| # | Ajan | Dosya | Satir | Sorun | Ciddiyet |
|---|---|---|---|---|---|
| 1 | Kod Inceleyici | `user.service.ts` | 42 | Eksik null check | Yuksek |
| 2 | Sessiz Hata | `auth.controller.ts` | 18 | Sessiz catch | Orta |

### 🟡 Uyarilar (Dikkate Alinmali)
| # | Ajan | Dosya | Satir | Sorun |
|---|---|---|---|---|
| 1 | Regresyon | `api.module.ts` | — | Yeni import eklenip test yazilmamis |

### 🟢 Temiz Alanlar
- [x] Guvenlik kontrolu gecti
- [x] Tip guvenligi uygun
- [x] Performans sorunu yok

### 📋 Onceden Var Olan Sorunlar (Backlog'a eklendi)
| # | Sorun | Olusturulan Task |
|---|---|---|
| 1 | `legacy.service.ts` icinde SQL injection riski | Task #45 |

### Genel Degerlendirme
**Sonuc:** ✅ Onaylandi / ⚠️ Kucuk duzeltmelerle onaylandi / ❌ Duzeltme gerekli

[Genel yorum ve oneriler]
```

### 4.2 — Duzeltme Islemleri

Eger "Duzeltme gerekli" bulgular varsa:

1. Bulguyu duzelt
2. Dogrulama kapisi uygula (test calistir)
3. Commit at:

<!-- GENERATE: COMMIT_CONVENTION
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: conventions.commit_language, conventions.commit_format
Ornek cikti:
### Commit Format (Review Duzeltmeleri)

```
fix: review bulgusu — <sorun_ozeti>
```

**Dil:** Turkce
**Ornek:** `fix: review bulgusu — eksik null check duzeltildi`
-->

> **KURAL:** Review duzeltme commit'i ayri olmali. Orijinal commit'i DEGISTIRME (amend etme).

---

## Zorunlu Kurallar

### Kutsal Kurallar (Her Komutta Gecerli)

1. **Codebase e config YAZMA** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` dosyalari SADECE Agentbase icinde olusturulur. Codebase icinde `.claude/` dizini olusturma, `../Codebase/CLAUDE.md` yazma YASAK.
2. **Git sadece Codebase de** — Tum git islemleri (commit, push, branch) `../Codebase/` icinde yapilir. Agentbase'de git YOKTUR.
3. **Codebase OKUNUR, config YAZILMAZ** — Proje dosyalari (`src/`, `app/`, vb.) okunabilir ve gorev gerekiyorsa duzenlenebilir. Config dosyalari (`.claude/`, `CLAUDE.md`) Codebase icinde YAZILAMAZ.

1. **3 ajan paralel calisir** — Birinin sonucunu beklemeden hepsini baslat.
2. **1 iterasyon limiti** — Hicbir ajan ikinci kez calismaz.
3. **Karar agacini takip et** — Her bulgu icin false positive / diff kodu / onceden var olan siralamasini uygula.
4. **Onceden var olan sorunlari duzeltme** — Backlog'a gorev olustur, diff'e dokunma.
5. **Rapor formatini koru** — Kritik / Uyari / Temiz / Onceden Var Olan kategorileri zorunlu.
6. **Duzeltme commit'i ayri** — Review duzeltmeleri icin yeni commit at, amend yapma.
7. **Bos diff kontrolu** — Diff bossa veya sadece whitespace ise inceleme yapma.
8. **False positive filtrele** — Mevcut pattern'e uyan, framework boilerplate olan bulgulari eleminasyon.
9. **Backlog CLI kullan** — Onceden var olan sorunlari `backlog task create` ile kaydet.
10. **Guvenlik** — Hassas veri (credential, token) diff'te varsa KRITIK olarak raporla.
11. **Codebase yolu** — Tum dosya erisimleri `../Codebase/` uzerinden.

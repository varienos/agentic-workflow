# Bug Review — Hata Duzeltme Kalite Kontrolu

> Bug fix commit'ini 3 perspektifle inceler: kod kalitesi, sessiz hatalar, regresyon riski.
> Kullanim: `/bug-review`, `/bug-review <commit_hash>`, `/bug-review HEAD~2..HEAD`

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

Diff'ten cikar:
- Degisen dosya listesi
- Her dosyadaki eklenen/silinen satirlar
- Degisikliklerin turu (duzeltme, test, config)
- Bug fix'e ozel: hangi satirlar "fix" icin eklendi, hangileri "test" icin?

> **KURAL:** Diff bossa "Incelenecek degisiklik yok" deyip DUR.

---

## Step 2 — 3 Ajan Spawn Et

Asagidaki 3 ajanin HER BIRINI paralel olarak calistir.

### Ajan 1 — Kod Inceleyici (Bug Fix Perspektifi)

**Gorev:** Bug fix'in kalitesini ve dogru uygulanip uygulanmadigini kontrol et.

**Bug Fix Kontrol Listesi (Sabit Cekirdek):**

- [ ] **Kok neden duzeltilmis mi?** Belirtiyi mi yoksa kok nedeni mi duzeltmis?
- [ ] **Minimal degisiklik mi?** Sadece hata duzeltilmis mi yoksa gereksiz refactor da yapilmis mi?
- [ ] **Ayni hata baska yerlerde de var mi?** Benzer pattern baska dosyalarda da geciyorsa onlar da duzeltilmis mi?
- [ ] **Regresyon testi yazilmis mi?** Hatanin tekrarlanmadigini dogrulayan test var mi?
- [ ] **Yan etkisi var mi?** Duzeltme baska islevsellik bozuyor mu?
- [ ] **Hata yonetimi uygun mu?** Try-catch, error boundary, null check yeterli mi?
- [ ] **Edge case dusunulmus mu?** Sinir degerleri, null, bos dizi, concurrent erisim

<!-- GENERATE: REVIEW_CHECKLIST
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: stack.primary, stack.conventions, project.rules
Ornek cikti:
**Stack-Spesifik Kontroller:**

- [ ] **Prisma:** Schema degisikligi varsa migration olusturulmus mu?
- [ ] **Prisma:** Transaction kullanilmasi gereken yerde kullanilmis mi?
- [ ] **NestJS:** Exception filter dogru uygulanmis mi? HttpException turleri dogru mu?
- [ ] **NestJS:** DTO validasyonu hala dogru calisiyor mu?
- [ ] **Next.js:** Server/Client component ayrimi bozulmamis mi?
- [ ] **Expo:** Theme hook'u dogru kullaniliyor mu?
- [ ] **Guvenlik:** Fix sonrasi IDOR, injection riski olusmamis mi?
- [ ] **API:** Error response formati standarda uyuyor mu?
-->

### Ajan 2 — Sessiz Hata Avcisi (Silent Failure Hunter)

**Gorev:** Bug fix'in kendisinin sessiz hata yaratip yaratmadigini kontrol et.

**8 Noktali Kontrol Listesi:**

1. **Sessiz catch:** Fix icinde `catch(e) {}` var mi? Hata yutulmus mu?
2. **Eksik await:** Yeni eklenen async cagrilarda `await` unutulmus mu?
3. **Yanlis karsilastirma:** Fix'teki kosullarda `==` vs `===`, falsy deger tuzagi var mi?
4. **Kayip return:** Fix icinde return etmesi gereken yerde return yok mu?
5. **State tutarsizligi:** Fix bir yeri guncelledi ama iliskili yerleri GUNCELLENMEDI mi?
6. **Race condition:** Fix asenkron islemlerde siralama sorunu yaratir mi?
7. **Varsayilan deger tuzagi:** `||` vs `??` kullanimi dogru mu?
8. **Kopyala-yapistir artigi:** Fix'te baska yerden kopyalanmis ama uyarlanmamis kod var mi?

### Ajan 3 — Regresyon Analizcisi

**Gorev:** Bug fix'in mevcut islevselligi bozma riskini degerlendir.

**Kontrol Alanlari:**

1. **Kaldirilan kod:** Fix sirasinda silinen satirlar baska yerlerde kullaniliyor mu?
2. **Degisiklik yayilimi:** Degistirilen fonksiyon/tip/arayuz baska dosyalarda import ediliyor mu?
3. **Davranis degisikligi:** Fix, fix edilen alan disinda davranis degisikligi yaratir mi?
4. **Test kapsami:** Fix'in tum senaryolari test edilmis mi? Sadece "happy path" mi?
5. **Veri bütunlugu:** Fix veritabani islemleri icerir mi? Mevcut veri etkilenir mi?
6. **Config etkisi:** Ortam degiskeni degisikligi tum ortamlarda gecerli mi?

---

## Step 3 — Bulgulari Degerlendir

### 3.1 — Sonsuz Dongu Korumasi

> **KURAL:** Her ajan sadece 1 iterasyon yapar. Bulgu bulduysa raporlar, TEKRAR CALISTIRMAZ.

### 3.2 — Karar Agaci

Her bulgu icin:

```
Bulgu var mi?
├── HAYIR → Temiz rapor
└── EVET → Gercek sorun mu?
    ├── HAYIR (False Positive) → Rapordan cikar
    └── EVET → Diff'in kendi kodunda mi?
        ├── EVET → Duzeltilmesi GEREKEN bulgu
        └── HAYIR → Onceden var olan sorun mu?
            ├── EVET → Backlog gorev olustur, diff'e DOKUNMA
            └── HAYIR → Diff'in dolayli etkisi, raporda belirt
```

### 3.3 — False Positive Filtreleme

Bug fix review icin ozel false positive kontrolleri:
- Fix, mevcut pattern'e uygun sekilde yapilmis (framework convention)
- Kasitli trade-off: acil fix icin gecici cozum (eger acikca belirtilmisse)
- Test scope: fix sadece spesifik case'i duzeltiyorsa, genel testi kapsamasi gerekmez

### 3.4 — Onceden Var Olan Bulgu Kurali

Diff disinda bulunan sorunlar icin:
```
backlog task create "Bug review bulgusu: <sorun_ozeti>" --description "<detay>" --priority "medium" --labels "tech-debt"
```

> **KURAL:** Onceden var olan sorunu DUZELTME. Backlog'a gorev olustur, devam et.

---

## Step 4 — Dogrulama Kapisi (Duzeltme Sonrasi)

Eger Step 3'te "duzeltilmesi gereken" bulgu ciktiysa:

### 4.1 — Duzeltmeyi Uygula

Bulguyu duzelt. Minimal degisiklik ilkesine uy.

### 4.2 — Testleri Calistir

Etkilenen alt projenin testlerini calistir (VERIFICATION_COMMANDS'dan).

### 4.3 — Test Sonucu

- Testler gecti → Step 5'e gec
- Testler basarisiz → Duzeltmeyi revize et (max 3 deneme)
- 3 denemede cozulmediyse → kullaniciya bildir

---

## Step 5 — Rapor Olustur

```
## Bug Fix Inceleme Raporu

### Incelenen Degisiklikler
- **Commit/Range:** <hash veya range>
- **Dosya sayisi:** <sayi>
- **Fix turu:** [kok neden duzeltmesi / belirtisi duzeltmesi / workaround]

---

### Kod Inceleyici Bulgulari
| # | Dosya | Satir | Sorun | Ciddiyet | Durum |
|---|---|---|---|---|---|
| 1 | `user.service.ts` | 42 | Kok neden degil, belirtisi duzeltilmis | Yuksek | Duzeltildi |

### Sessiz Hata Avcisi Bulgulari
| # | Dosya | Satir | Sorun | Ciddiyet | Durum |
|---|---|---|---|---|---|
| — | — | — | Bulgu yok | — | Temiz |

### Regresyon Analizcisi Bulgulari
| # | Dosya | Sorun | Risk | Durum |
|---|---|---|---|---|
| 1 | `order.service.ts` | Fix edilen fonksiyon 3 yerde import ediliyor | Orta | Kontrol edildi |

---

### 📋 Onceden Var Olan Sorunlar
| # | Sorun | Olusturulan Task |
|---|---|---|
| 1 | `legacy.utils.ts` icinde null check eksik | Task #52 |

### Genel Degerlendirme
**Fix kalitesi:** ⭐⭐⭐⭐ / ⭐⭐⭐⭐⭐
**Kok neden duzeltildi mi?** Evet / Hayir / Kismen
**Regresyon riski:** Dusuk / Orta / Yuksek
**Sonuc:** ✅ Onaylandi / ⚠️ Kucuk duzeltmelerle onaylandi / ❌ Yeniden duzeltme gerekli

[Genel yorum ve oneriler]
```

### 5.1 — Duzeltme Commit'i

Eger review sonucu duzeltme yapildiysa:

<!-- GENERATE: COMMIT_CONVENTION
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: conventions.commit_language, conventions.commit_format
Ornek cikti:
### Commit Format (Bug Review Duzeltmeleri)

```
fix: bug-review bulgusu — <sorun_ozeti>
```

**Dil:** Turkce
**Ornek:** `fix: bug-review bulgusu — eksik null check duzeltildi`
-->

> **KURAL:** Review duzeltme commit'i ayri olmali. Orijinal fix commit'ini DEGISTIRME.

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
5. **Kok neden kontrolu** — Fix gercekten kok nedeni mi duzeltmis, yoksa belirtiyi mi?
6. **Minimal duzeltme** — Review duzeltmeleri de minimal olmali, ek refactor YASAK.
7. **Regresyon testi kontrolu** — Fix'e regresyon testi yazilmis mi mutlaka kontrol et.
8. **Duzeltme commit'i ayri** — Review duzeltmeleri icin yeni commit at, amend yapma.
9. **Bos diff kontrolu** — Diff bossa inceleme yapma.
10. **Backlog CLI kullan** — Onceden var olan sorunlari `backlog task create` ile kaydet.
11. **Codebase yolu** — Tum dosya erisimleri `../Codebase/` uzerinden.
12. **Guvenlik** — Hassas veri diff'te varsa KRITIK olarak raporla.

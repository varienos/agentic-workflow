# Task Plan — Yuksek Baglamli Gorev Olusturucu

> Codebase'i derinlemesine analiz ederek kaliteli, uygulanabilir gorev olusturur.
> Kullanim: `/task-plan <istek>`, `/task-plan "login sayfasina remember me ekle"`

**ULTRATHINK MODE — Bu komut maksimum dusunme derinligi ile calisir.**

- ACELE ETME. Her adimda once dusun, sonra hareket et.
- Yuzeysel analiz YASAK. Varsayimlarini sorgula, alternatiflerini degerlendir.
- Bir sey "bariz" gorunuyorsa, neden bariz oldugunu kanitla.
- Ilk aklina gelen cozum muhtemelen eksik — en az 3 alternatif dusun.
- Bu komut OPUS modeli ile calistirilmalidir. Sonnet ile task-plan calistirmak YASAKTIR.

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
Kutsal Kurallar:
- Config dosyalari SADECE Agentbase icinde yasar
- Codebase icinde `.claude/` OLUSTURULMAZ
- Git sadece Codebase de calisir
-->

---

## Step 0 — Ultrathink: Derin Dusunme Fazi

**Bu faz ZORUNLUDUR. Atlanamaz. Ciktisi kullaniciya gosterilmez ama tum sonraki adimlari yonlendirir.**

Codebase'e dokunmadan ONCE, sadece dusun:

### 0.1 — Hipotez Uretimi

Istegin en az 3 farkli yorumunu uret:
- **Hipotez A:** En bariz yorum — kullanici buyuk ihtimalle bunu kastetmistir
- **Hipotez B:** Alternatif yorum — belki farkli bir aci var
- **Hipotez C:** En az bariz ama olasi yorum — gozden kacabilecek perspektif

Her hipotez icin: "Bu dogruysa ne yapilmali?" sorusunu cevapla.

### 0.2 — Varsayim Sorgulamasi

Her hipotezdeki gizli varsayimlari cikar ve sorgula:
- Hangi dosyalarin var oldugunu varsayiyorsun? (henuz dogrulamadin)
- Hangi pattern'lerin kullanildigini varsayiyorsun? (henuz okumadin)
- Kullanicinin gercekten ne istedigini varsayiyorsun? (kendi yorumun mu?)
- Kapsamin ne oldugunu varsayiyorsun? (belirtilmemis sinirlari eklemedin mi?)

### 0.3 — Devil's Advocate

En guclu hipotezi sec, sonra onu kirmaya calis:
- Bu yaklasimin en buyuk riski ne?
- Hangi durumda tamamen yanlis olur?
- Daha basit bir cozum var mi ki karmasikligi gereksiz yere artiriyorsun?
- Gozden kacirdgin bir bagimlilik veya yan etki var mi?

### 0.4 — Edge Case Taramasi

Sistematik olarak dusun:
- Bu degisiklik mevcut islevselliMgi kirar mi?
- Hangi sinir durumlari var?
- Baska hangi dosyalar dolayli etkilenir?
- Test edilmesi zor olan bir durum var mi?

### 0.5 — Kapsam Karari

Net bir karar ver ve yazili olarak ifade et:
- Bu tek bir task mi, yoksa bolunmeli mi?
- Kapsam cok genis mi? Daraltilmali mi?
- Kapsam cok dar mi? Genisletilmeli mi?
- Kesin kapsam tanimi: "[X] yapilacak, [Y] YAPILMAYACAK"

**Step 0 tamamlanmadan sonraki adimlara GECME. Step 0'in ciktilari sonraki adimlarin kalitesini belirler.**

---

## Step 1 — Istek Analizi

> **DUSUNME KAPISI:** Step 0'daki varsayimlarin hala gecerli mi? Bu adima gecmeden once Step 0'in ciktisini sorgula. Yeni bilgi varsayimlarini degistirdiyse Step 0'a don.

### 1.1 — Istegi Cozumle

Kullanicinin istegindan asagidakileri cikar:
- **Ne isteniyor?** (ozellik, duzeltme, iyilestirme, refactor)
- **Nerede?** (hangi alt proje, hangi modul)
- **Neden?** (kullanici degeri, teknik gereklilik)
- **Sinirlar** (varsa: "sadece backend", "mobilde gerekmiyor" gibi)

### 1.2 — Istek Turu Siniflandirmasi

| Tur | Tanimlama | Ornek |
|---|---|---|
| **Feature** | Yeni islevsellik | "Siparis takip sayfasi ekle" |
| **Enhancement** | Mevcut ozelligin gelistirilmesi | "Login sayfasina remember me ekle" |
| **Bug Fix** | Hata duzeltme | "Odeme sonrasi sayfa yenilenmiyor" |
| **Refactor** | Yapi degisikligi, davranis ayni | "Auth modulu yeniden yapilandir" |
| **Infra** | Altyapi, konfigurasyon | "CI/CD pipeline kur" |

---

## Step 2 — Derin Analiz

> **DUSUNME KAPISI:** Step 0'daki varsayimlarin hala gecerli mi? Bu adima gecmeden once bir onceki adimin ciktisini sorgula. Yeni bilgi varsayimlarini degistirdiyse Step 0'a don.

### 2.1 — Dosya Tespiti

<!-- GENERATE: FILE_DETECTION_PATTERNS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.structure, stack.primary, project.subprojects
Ornek cikti:
Istege gore aranacak dosya desenleri:

| Kod Turu | Aranacak Dizinler | Dosya Desenleri |
|---|---|---|
| Controller/Route | `apps/api/src/modules/` | `*.controller.ts`, `*.router.ts` |
| Service/Logic | `apps/api/src/modules/` | `*.service.ts`, `*.usecase.ts` |
| Data Model | `apps/api/prisma/` | `schema.prisma` |
| DTO/Validation | `apps/api/src/modules/` | `*.dto.ts`, `*.validator.ts` |
| Frontend Page | `apps/web/src/app/` | `page.tsx`, `layout.tsx` |
| Frontend Component | `apps/web/src/components/` | `*.tsx` |
| Mobile Screen | `apps/mobile/src/screens/` | `*.screen.tsx` |
| Mobile Component | `apps/mobile/src/components/` | `*.tsx` |
| Shared Type | `packages/shared/src/` | `*.types.ts`, `*.interface.ts` |
| Config | proje koku | `*.config.ts`, `*.config.js` |
| Test | `__tests__/`, `*.test.ts`, `*.spec.ts` | `*.test.ts`, `*.spec.ts` |
-->

### 2.2 — Mevcut Kod Analizi

Istekle ilgili alanlarda:
1. Mevcut dosyalari oku
2. Kullanilan pattern'leri anla (naming, structure, imports)
3. Benzer islev varsa onu referans al
4. Bagimli modulleri tespit et (import chain)

### 2.3 — Etki Analizi

Degisikligin etkili oldugu alanlari belirle:
- **Dogrudan etkilenen dosyalar** (degisecek)
- **Dolayli etkilenen dosyalar** (import eden, kullanan)
- **Test dosyalari** (guncellenmesi veya yazilmasi gereken)
- **Konfigurasyon** (eklenmesi gereken env, route, permission)

**ONEMLI:** Dogrudan etkilenen dosyalarin listesini `affected_files` olarak sakla — bu liste hem gorev aciklamasina hem de backlog metadata'sina yazilacak. task-conductor bu listeyi kullanarak paralel gorevler arasindaki cakismalari tespit eder.

---

## Step 3 — Uygulama Plani

> **DUSUNME KAPISI:** Step 0'daki varsayimlarin hala gecerli mi? Bu adima gecmeden once bir onceki adimin ciktisini sorgula. Yeni bilgi varsayimlarini degistirdiyse Step 0'a don.

### 3.1 — Karmasiklik Puanlama

| Puan | Seviye | Kriter |
|---|---|---|
| 1-3 | **Basit** | 1-2 dosya, net degisiklik, mevcut pattern'i takip |
| 4-6 | **Orta** | 3-5 dosya, yeni fonksiyon/component, mevcut modulu genisletme |
| 7-8 | **Karmasik** | 6-10 dosya, yeni modul, entegrasyon, migration |
| 9-10 | **Cok Karmasik** | 10+ dosya, mimari degisiklik, birden fazla alt proje |

### 3.2 — Model Oneri Matrisi

Karmasikliga gore hangi agent modeli kullanilmali:

| Karmasiklik | Onerilen Model | Gerekcesi |
|---|---|---|
| 1-3 | Opus (minimum) | Planlama kalite-kritik, dusuk karmasiklik bile derin analiz gerektirir |
| 4-6 | Opus | Pattern takibi + karar verme, kalite oncelikli |
| 7-8 | Opus | Karmasik karar verme, coklu dosya analizi gerekli |
| 9-10 | Opus + Teammate | Bolunmus calisma, paralel uygulama |

### 3.3 — Teammate Oneri Matrisi

Gorevi uygulamak icin teammate gerekli mi?

| Durum | Teammate Onerisi |
|---|---|
| Tek alt proje, 1-4 dosya | Gerek yok |
| Tek alt proje, 5-8 dosya | Opsiyonel (2 teammate) |
| Birden fazla alt proje | Onerilen (alt proje basina 1) |
| 10+ dosya | Zorunlu (dosya gruplarina gore bol) |

### 3.4 — Kapsam Bolme Stratejisi

Karmasiklik 7+ ise gorevi alt gorevlere bol:

**Bolme Kriterleri:**
1. **Alt proje bazli:** Her alt proje (API, Web, Mobile) ayri gorev
2. **Katman bazli:** Data model → Backend logic → API endpoint → Frontend
3. **Ozellik bazli:** Her bagimsiz is parcasi ayri gorev

**Bagimllik Sirasi:**
```
1. DB/Model degisiklikleri (en once)
2. Backend is mantigi
3. API endpoint'leri
4. Frontend/Mobile UI
5. Testler
6. Dokumantasyon
```

---

## Step 4 — Kalite Kontrolu

> **DUSUNME KAPISI:** Step 0'daki varsayimlarin hala gecerli mi? Bu adima gecmeden once bir onceki adimin ciktisini sorgula. Yeni bilgi varsayimlarini degistirdiyse Step 0'a don.

### 4.1 — Gorev Kalite Kontrol Listesi

Gorevi olusturmadan once dogrula:

- [ ] **Net baslik:** Gorevi okuyan kisi ne yapilacagini anliyor mu?
- [ ] **Yeterli baglam:** AC'ler spesifik mi yoksa belirsiz mi?
- [ ] **Uygulanabilir:** Mevcut codebase'de uygulanabilir mi?
- [ ] **Test kriterleri:** AC'lerde test beklentisi var mi?
- [ ] **Bagimlliklar:** Onkosuller belirtilmis mi?
- [ ] **Kapsam:** Tek gorevde makul mu, bolunmesi mi gerekiyor?

### 4.2 — Anti-Pattern Kontrolu

Asagidaki anti-pattern'lerden kacin:

- ❌ "Sistemi iyilestir" — cok genis, olculemez
- ❌ AC olmayan gorev — tamamlanma kriteri belirsiz
- ❌ Birden fazla bagimsiz isi tek gorevde birlestirme
- ❌ Uygulama detaylarini AC'ye koyma (nasil yapilacagini degil, ne yapilacagini yaz)
- ❌ Dogrulanamayen AC: "Daha hizli olmali" (ne kadar?), "Iyi gorunmeli" (neye gore?)

---

## Step 5 — Backlog Gorevi Olustur

> **DUSUNME KAPISI:** Step 0'daki varsayimlarin hala gecerli mi? Bu adima gecmeden once bir onceki adimin ciktisini sorgula. Yeni bilgi varsayimlarini degistirdiyse Step 0'a don.

### 5.1 — Kabul Kriterleri Sablonlari

Gorev turune gore AC sablonu kullan:

**Feature/Enhancement:**
```
## Kabul Kriterleri
- [ ] [Fonksiyonel kriter 1]
- [ ] [Fonksiyonel kriter 2]
- [ ] [Edge case]
- [ ] Birim test yazilmali — [neyin test edildigi]
- [ ] [Varsa entegrasyon testi]
```

**Bug Fix:**
```
## Kabul Kriterleri
- [ ] [Hata artik olusmuyor: senaryo]
- [ ] [Yan etki kontrolu]
- [ ] Hatanin tekrarlanmadigini dogrulayan test yazilmali
```

**Refactor:**
```
## Kabul Kriterleri
- [ ] [Eski davranis korunuyor]
- [ ] [Yeni yapi: aciklama]
- [ ] Mevcut testler gecmeye devam ediyor
- [ ] [Varsa yeni testler]
```

<!-- GENERATE: AC_TEMPLATES
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: stack.primary, project.conventions, project.subprojects
Ornek cikti:
**Stack-Spesifik AC Ornekleri:**

API Endpoint icin:
```
- [ ] `POST /api/v1/orders` endpointi olusturuldu
- [ ] Request body DTO ile validate ediliyor
- [ ] Yetkisiz erisimde 401 donuyor
- [ ] Basarili islemde 201 + order objesi donuyor
- [ ] Birim test: service katmani test edilmeli
- [ ] E2E test: endpoint uctan uca test edilmeli
```

Frontend Sayfa icin:
```
- [ ] `/orders` sayfasi olusturuldu
- [ ] Server Component olarak implement edildi
- [ ] Loading state var
- [ ] Error state var
- [ ] Responsive tasarim (mobile + desktop)
- [ ] Component testi yazilmali
```

Mobile Ekran icin:
```
- [ ] `OrdersScreen` olusturuldu
- [ ] `useTheme()` ile tema renkleri kullaniliyor
- [ ] Hardcoded renk yok
- [ ] Pull-to-refresh var
- [ ] Bos durum (empty state) var
```
-->

### 5.2 — Gorev Olusturma

```
backlog task create \
  "<baslik>" \
  --description "<detayli_aciklama>" \
  --priority "<high|medium|low>" \
  --labels "<feature|bug|refactor|infra>"
```

Aciklama icerigi:
```
## Baglam
[Neden bu gorev gerekli]

## Etkilenen Alanlar
- [dosya/modul listesi]

## Affected Files
[Step 2.3'teki dogrudan etkilenen dosyalarin tam yol listesi — task-conductor conflict tespiti icin]
- api/src/controllers/auth.controller.ts
- api/src/middleware/auth.ts
- api/src/routes/auth.routes.ts

## Uygulama Notlari
- Referans: [benzer mevcut implementasyon]
- Dikkat: [potansiyel riskler]
- Oneri: [model/teammate onerisi]

## Kabul Kriterleri
- [ ] [AC 1]
- [ ] [AC 2]
- [ ] [Test kriteri]
```

> **KURAL:** `Affected Files` bolumu ZORUNLU. Bu bolum olmadan task-conductor cakisma tespiti yapamaz.
> **KURAL:** Dosya yollari Codebase-relative olmali (ornekin `api/src/...`, `mobile/app/...`).

### 5.3 — Coklu Gorev (Bolunmus Kapsam)

Gorev bolundugunyse her alt gorev icin ayri olustur ve bagimlilik belirt:

```
backlog task create "feat: Order modeli ve migration (#ana_gorev)" --priority "high" --labels "feature"
backlog task create "feat: Order service katmani (#ana_gorev)" --priority "high" --labels "feature"
backlog task create "feat: Order API endpoint'leri (#ana_gorev)" --priority "medium" --labels "feature"
backlog task create "feat: Order listesi frontend sayfasi (#ana_gorev)" --priority "medium" --labels "feature"
```

---

## Step 6 — Kullanici Raporu

> **DUSUNME KAPISI:** Step 0'daki varsayimlarin hala gecerli mi? Bu adima gecmeden once bir onceki adimin ciktisini sorgula. Yeni bilgi varsayimlarini degistirdiyse Step 0'a don.

```
## Gorev Plani Raporu

### Istek
[kullanicinin orijinal istegi]

### Analiz Ozeti
- **Tur:** Feature / Enhancement / Bug Fix / Refactor
- **Karmasiklik:** <puan>/10 — <seviye>
- **Etkilenen alt projeler:** [liste]
- **Tahmini dosya sayisi:** <sayi>

### Olusturulan Gorevler
| # | ID | Baslik | Oncelik | Bagimlilik |
|---|---|---|---|---|
| 1 | #45 | Order modeli ve migration | High | — |
| 2 | #46 | Order service katmani | High | #45 |
| 3 | #47 | Order API endpoint'leri | Medium | #46 |
| 4 | #48 | Order listesi frontend | Medium | #47 |

### Oneriler
- **Model:** <Sonnet/Opus> oneriliyor
- **Teammate:** <gerekli/opsiyonel/gerek yok>
- **Siralama:** [bagimllik sirasina gore yol haritasi]

### Referans Dosyalar
[incelenmesi gereken mevcut dosyalar]
```

---

## Zorunlu Kurallar

### Kutsal Kurallar (Her Komutta Gecerli)

1. **Codebase e config YAZMA** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` dosyalari SADECE Agentbase icinde olusturulur. Codebase icinde `.claude/` dizini olusturma, `../Codebase/CLAUDE.md` yazma YASAK.
2. **Git sadece Codebase de** — Tum git islemleri (commit, push, branch) `../Codebase/` icinde yapilir. Agentbase'de git YOKTUR.
3. **Codebase OKUNUR, config YAZILMAZ** — Proje dosyalari (`src/`, `app/`, vb.) okunabilir ve gorev gerekiyorsa duzenlenebilir. Config dosyalari (`.claude/`, `CLAUDE.md`) Codebase icinde YAZILAMAZ.

1. **Once analiz et** — Codebase'i okumadan gorev olusturma. Mevcut yapiyi anla.
2. **Spesifik AC yaz** — "Iyilestir", "Duzelt" gibi belirsiz kriterler YASAK. Olculebilir olmali.
3. **Test kriteri zorunlu** — Her gorevde en az bir test AC'si olmali.
4. **Kapsam kontrolu** — Tek gorev cok genisse bol. Cok darsa birlestir.
5. **Bagimlilik belirt** — Alt gorevler arasindaki bagimliligi acikca yaz.
6. **Mevcut pattern'i referans goster** — Benzer implementasyon varsa AC'de referans ver.
7. **Anti-pattern'lerden kacin** — Belirsiz, olculemeyen, cok genis gorevler olusturma.
8. **Backlog CLI kullan** — Gorevleri SADECE `backlog task create` ile olustur.
9. **Model/Teammate onerisi** — Her gorev icin uygun model ve teammate onerisi ver.
10. **Codebase yolu** — Tum dosya analizleri `../Codebase/` uzerinden.

<!-- GENERATE: SELF_REFRESH
Aciklama: Komut son adim - self-refresh check. Bootstrap bu marker-i ortak
Self-Refresh bolumu ile degistirir. Komut kendi metnini proje gerceginin
isiginda gozden gecirir: kucuk uyumsuzluk Edit ile, buyuk degisim backlog
task-i olarak rapor edilir.
-->


# Review Module — Derin Modul Incelemesi

> Belirli bir modulu/ozelligi tum katmanlardan derinlemesine inceler, sorunlari bulur, basit olanlari duzeltir, karmasik olanlari backlog'a kaydeder.
> Kullanim: `/review-module <modul_adi>`, `/review-module auth`, `/review-module payments`

---

## Kural: OTONOM CALIS

- Kullaniciya soru SORMA — modulu belirle, incele, raporla.
- Basit sorunlari (typo, eksik import, yanlis tip, unused variable) DIREKT duzelt.
- Karmasik sorunlari (mimari degisiklik, yeni ozellik, buyuk refactor) backlog'a KAYDET.
- Tum adimlari CALISTIR — bir adimi atlama.

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

## Step 1 — Modul Tespiti ve Kapsam Belirleme

Kullanicinin verdigi modul adini codebase'deki dosyalara esle.

<!-- GENERATE: MODULE_MAPPING
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.structure, project.subprojects, project.modules
Ornek cikti:
### Modul → Dosya Esleme Tablosu

| Modul Adi | Katman | Dosya Desenleri |
|---|---|---|
| auth | API | `apps/api/src/modules/auth/**` |
| auth | Web | `apps/web/src/app/(auth)/**`, `apps/web/src/components/auth/**` |
| auth | Mobile | `apps/mobile/src/screens/Auth/**`, `apps/mobile/src/hooks/useAuth*` |
| auth | Shared | `packages/shared/src/types/auth*`, `packages/shared/src/dto/auth*` |
| products | API | `apps/api/src/modules/products/**` |
| products | Web | `apps/web/src/app/products/**` |
| products | Mobile | `apps/mobile/src/screens/Products/**` |
| payments | API | `apps/api/src/modules/payments/**` |
| payments | Web | `apps/web/src/app/checkout/**` |

**Esleme bulunamazsa:** Glob ile codebase'i tara:
```bash
cd ../Codebase && find . -path '*/node_modules' -prune -o -name "*<modul_adi>*" -print
```
-->

Modulu tum katmanlardan topla. Kapsam:
- Ana dosyalar (controller, service, component, screen)
- Iliskili dosyalar (DTO, tip, yardimci, test)
- Konfigürasyon dosyalari (route, middleware, navigation)

---

## Step 2 — Buyuk Resim: Katmanlar Arasi Iliski Haritasi

<!-- GENERATE: SUBPROJECT_LAYERS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.subprojects, stack.primary
Ornek cikti:
### Katman Yapisi

| Katman | Dizin | Rol | Stack |
|---|---|---|---|
| API | `apps/api/` | Backend, REST API, is mantigi | NestJS, Prisma |
| Web | `apps/web/` | Frontend, kullanici arayuzu | Next.js, React |
| Mobile | `apps/mobile/` | Mobil uygulama | Expo, React Native |
| Shared | `packages/shared/` | Paylasilan tipler, DTO'lar | TypeScript |

### Katmanlar Arasi Veri Akisi
```
Mobile/Web → API → Prisma → PostgreSQL
     ↑                ↓
  Shared (tipler, DTO'lar)
```
-->

Her katmandaki modul dosyalarini oku ve iliskileri cikar:
- API endpoint'leri hangi service'leri kullaniyor?
- Frontend hangi API endpoint'lerini cagiriyor?
- Paylasilan tipler dogru mu?
- DTO'lar senkron mu?

---

## Step 3 — Paralel Inceleme Agent'lari

4 paralel inceleme agent'i spawn et. Her biri farkli bir perspektiften inceler.

<!-- GENERATE: REVIEW_AGENTS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: stack.primary, project.conventions, project.rules
Ornek cikti:
### Agent 1 — Kod Kalitesi Incelemesi
**Perspektif:** Clean code, SOLID, DRY, tip guvenligi
**Kontrol listesi:**
- [ ] Tekrarlanan kod bloklari (DRY ihlali)
- [ ] Eksik veya yanlis TypeScript tipleri
- [ ] `any` tipi kullanimi
- [ ] Kullanilmayan import/degisken/fonksiyon
- [ ] Fonksiyon karmasikligi (10+ satir uyar)
- [ ] Hata yonetimi eksikligi (try/catch, error boundary)
- [ ] Magic number/string kullanimi
- [ ] Yanlis isimlendirme

### Agent 2 — Guvenlik Incelemesi
**Perspektif:** OWASP, yetkilendirme, veri guvenligi
**Kontrol listesi:**
- [ ] IDOR aciklari (ID ile erisim kontrolu)
- [ ] SQL injection riski
- [ ] XSS riski
- [ ] Eksik yetkilendirme kontrolu
- [ ] Hassas veri loglama
- [ ] Hardcoded credential
- [ ] Rate limiting eksikligi

### Agent 3 — Performans Incelemesi
**Perspektif:** N+1 query, gereksiz render, memory leak
**Kontrol listesi:**
- [ ] N+1 query problemi (Prisma include eksik)
- [ ] Gereksiz veritabani sorgusu
- [ ] Frontend'de gereksiz re-render
- [ ] Buyuk payload donusu (pagination eksik)
- [ ] Cache kullanilmayan tekrarli islemler
- [ ] Memory leak potansiyeli (event listener temizleme)

### Agent 4 — Mimari Uyumluluk Incelemesi
**Perspektif:** Proje pattern'leri, katman uyumu, convention
**Kontrol listesi:**
- [ ] Katman ihlali (frontend'de is mantigi, controller'da DB sorgusu)
- [ ] Import path convention ihlali
- [ ] Dosya isimlendirme convention ihlali
- [ ] Eksik barrel export
- [ ] Paylasilan tiplerin senkronizasyonu
- [ ] Test dosyasi eksikligi
-->

Her agent icin teammate spawn et:

```
## Teammate Gorevi: <agent_adi>_review
- Hedef dosyalar: [modul icindeki ilgili dosyalar]
- Perspektif: [yukaridaki perspektif]
- Kontrol listesi: [yukaridaki liste]
- Cikti: JSON formatinda bulgular listesi
```

---

## Step 4 — Bulgularin Siniflandirilmasi

Tum agent'larin bulgularini topla ve iki boyutlu siniflandir:

### Etki Seviyesi (Impact Level)

| Seviye | Aciklama | Ornekler |
|---|---|---|
| KRITIK | Guvenlik acigi, veri kaybi riski, crash | IDOR, SQL injection, unhandled error |
| YUKSEK | Fonksiyonel hata, performans sorunu | Yanlis is mantigi, N+1 query |
| ORTA | Kod kalitesi, convention ihlali | DRY ihlali, tip eksikligi, isimlendirme |
| DUSUK | Kozmetik, iyilestirme onerisi | Yorum eksikligi, log mesaji |

### Aksiyon Turu

| Tur | Aciklama | Karar |
|---|---|---|
| DIREKT_FIX | Basit, riski dusuk, tek dosya | Simdi duzelt |
| BACKLOG | Karmasik, coklu dosya, mimari | Gorev olustur |
| BILGI | Oneri, iyilestirme | Raporla |

### Karar Matrisi

| Etki \ Aksiyon | DIREKT_FIX | BACKLOG |
|---|---|---|
| KRITIK | Hemen duzelt + kullaniciyi bilgilendir | Gorev olustur (P1) |
| YUKSEK | Duzelt | Gorev olustur (P2) |
| ORTA | Duzelt | Gorev olustur (P3) |
| DUSUK | Duzelt (zaman varsa) | Raporla (gorev olusturma) |

---

## Step 5 — Katmanlar Arasi Etki Analizi

Moduldeki bir sorunun diger katmanlari nasil etkiledigini analiz et:

```
Ornek: API'deki auth endpoint yanlis tip donuyorsa:
  → Shared'daki DTO guncel mi?
  → Web'deki API client dogru tipi bekliyor mu?
  → Mobile'daki API client dogru tipi bekliyor mu?
```

Cross-layer sorunlari KRITIK olarak isaretle cunku birden fazla katmani etkiler.

---

## Step 6 — Direkt Duzeltmeler

DIREKT_FIX olarak isaretlenen bulgulari simdi duzelt.

### Duzeltme Karar Agaci

```
Bulgu DIREKT_FIX mi?
├── EVET
│   ├── Tek dosya mi?
│   │   ├── EVET → Duzelt
│   │   └── HAYIR → Dosyalar ayni katmanda mi?
│   │       ├── EVET → Duzelt
│   │       └── HAYIR → BACKLOG'a tasi
│   └── Risk seviyesi?
│       ├── DUSUK → Duzelt
│       ├── ORTA → Duzelt + test calistir
│       └── YUKSEK → Duzelt + test yaz + calistir
└── HAYIR → Step 7'ye gec
```

### Duzeltme Kurallari

1. Mevcut pattern'i takip et — yeni convention icat etme.
2. Minimal degisiklik yap — sadece sorunu duzelt, refactor YAPMA.
3. Ayni dosyada birden fazla duzeltme varsa hepsini tek seferde yap.
4. Import/export degisikliklerinde bagimliliklari kontrol et.

---

## Step 7 — Dogrulama Kapisi

Yapilan duzeltmelerin hicbir seyi bozmedigini dogrula.

<!-- GENERATE: VERIFICATION_COMMANDS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.subprojects, project.scripts, stack.test_framework
Ornek cikti:
### Dogrulama Komutlari

| Kontrol | Komut |
|---|---|
| API tip kontrolu | `cd ../Codebase/apps/api && npx tsc --noEmit` |
| API testler | `cd ../Codebase/apps/api && npm run test -- --passWithNoTests` |
| Web tip kontrolu | `cd ../Codebase/apps/web && npx tsc --noEmit` |
| Web build | `cd ../Codebase/apps/web && npm run build` |
| Mobile tip kontrolu | `cd ../Codebase/apps/mobile && npx tsc --noEmit` |
| Shared tip kontrolu | `cd ../Codebase/packages/shared && npx tsc --noEmit` |
| Lint | `cd ../Codebase && npm run lint` |
-->

Tum dogrulama komutlarini calistir. Basarisiz olanlar varsa:
- Bu review'dan kaynaklaniyorsa → duzelt
- Onceden var olan hata ise → yoksay ve raporla

---

## Step 8 — Duzeltme Kalite Kapisi

Yapilan duzeltmelerin kalitesini kontrol et:

- [ ] Her duzeltme mevcut pattern'i takip ediyor mu?
- [ ] Gereksiz degisiklik yapilmadi mi?
- [ ] Import/export zincirleri saglikli mi?
- [ ] Tip uyumlulugu korunuyor mu?

---

## Step 9 — Degisiklikleri Commit Et

Duzeltme yapildiysa commit at:

```bash
git add <duzeltilen_dosyalar>
git commit -m "refactor(<modul_adi>): review bulgulari duzeltildi"
```

> Duzeltme yapilmadiysa bu adimi ATLA.

---

## Step 10 — Backlog Gorev Olusturma

BACKLOG olarak isaretlenen bulgular icin gorev olustur:

```bash
backlog task create "<bulgu_ozeti>" --description "<detayli_aciklama>" --priority <high|medium|low> --labels "review-finding"
```

Her bulgu icin ayri gorev olustur. Gorev aciklamasinda:
- Sorunun ne oldugu
- Hangi dosyalarda oldugu
- Neden simdi duzeltilmedigi
- Onerilen cozum yaklasimi

---

## Step 11 — Sonuc Raporu

```
## 🔍 Modul Review Raporu — <modul_adi>

### Kapsam
- **Taranan dosya sayisi:** X
- **Taranan katmanlar:** API, Web, Mobile, Shared

### Bulgular Ozeti

| Seviye | Bulgu | Direkt Fix | Backlog | Bilgi |
|---|---|---|---|---|
| 🔴 KRITIK | X | Y | Z | - |
| 🟠 YUKSEK | X | Y | Z | - |
| 🟡 ORTA | X | Y | Z | - |
| 🟢 DUSUK | X | Y | Z | W |
| **Toplam** | **X** | **Y** | **Z** | **W** |

### Yapilan Duzeltmeler
| # | Dosya | Degisiklik | Etki |
|---|---|---|---|
| 1 | `<yol>` | <aciklama> | <seviye> |

### Olusturulan Backlog Gorevleri
| # | Baslik | Oncelik | Neden Simdi Duzeltilmedi |
|---|---|---|---|
| 1 | <baslik> | P2 | <sebep> |

### Katmanlar Arasi Bulgular
[varsa cross-layer sorunlari]

### Dead Code
[varsa kullanilmayan dosya/fonksiyon/degisken listesi]

### Commit
`<hash>` — `<mesaj>` (veya "Duzeltme yapilmadi")

### Genel Degerlendirme
[modulun genel sagligi hakkinda 2-3 cumle]
```

---

## Dead Code Tespit Metodolojisi

Modul icindeki kullanilmayan kodlari tespit et:

1. **Export edilen ama import edilmeyen fonksiyonlar:** Glob + Grep ile kontrol
2. **Tanimli ama cagrilmayan fonksiyonlar:** AST analizi (basit grep ile)
3. **Kullanilmayan dosyalar:** Hicbir yerden import edilmeyen dosyalar
4. **Yorum satiri haline getirilen kod bloklari:** `// ` veya `/* */` icindeki kod

Dead code bulgusu varsa BILGI seviyesinde raporla. Silme karari kullaniciya birakilir.

---

## Zorunlu Kurallar

### Kutsal Kurallar (Her Komutta Gecerli)

1. **Codebase e config YAZMA** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` dosyalari SADECE Agentbase icinde olusturulur. Codebase icinde `.claude/` dizini olusturma, `../Codebase/CLAUDE.md` yazma YASAK.
2. **Git sadece Codebase de** — Tum git islemleri (commit, push, branch) `../Codebase/` icinde yapilir. Agentbase'de git YOKTUR.
3. **Codebase OKUNUR, config YAZILMAZ** — Proje dosyalari (`src/`, `app/`, vb.) okunabilir ve gorev gerekiyorsa duzenlenebilir. Config dosyalari (`.claude/`, `CLAUDE.md`) Codebase icinde YAZILAMAZ.

1. **Otonom calis** — Soru sorma, modul sinirlarini belirle ve incele.
2. **Once oku, sonra yaz** — Duzeltme yapmadan once mevcut kodu anla.
3. **Pattern takip et** — Mevcut convention'lari takip et, yeni icat etme.
4. **Minimal degisiklik** — Sadece bulguyu duzelt, ek refactor YAPMA.
5. **Test calistir** — Duzeltme sonrasi mutlaka dogrulama yap.
6. **Cross-layer kontrol** — Bir katmandaki degisikligin diger katmanlari etkilemedigini dogrula.
7. **Backlog kaydi** — Duzeltilemeyen bulguları backlog'a kaydet.
8. **Rapor ZORUNLU** — Her durumda sonuc raporu olustur.
9. **Dead code raporla** — Kullanilmayan kodu sil DEGIL, raporla.
10. **Codebase yolu** — Tum proje dosyalarina `../Codebase/` uzerinden eris.

<!-- GENERATE: SELF_REFRESH
Aciklama: Komut son adim - self-refresh check. Bootstrap bu marker-i ortak
Self-Refresh bolumu ile degistirir. Komut kendi metnini proje gerceginin
isiginda gozden gecirir: kucuk uyumsuzluk Edit ile, buyuk degisim backlog
task-i olarak rapor edilir.
-->

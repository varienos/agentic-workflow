# Task Hunter — Otonom Gorev Uygulayici

> Backlog'dan gorev alir, analiz eder, uygular, test eder, commit atar.
> Kullanim: `/task-hunter <numara>`, `/task-hunter <anahtar-kelime>`, `/task-hunter 3,5,8`

---

## Arguman Cozumleme

Kullanicinin girdisini asagidaki kurallara gore cozumle:

| Girdi Tipi | Ornek | Davranis |
|---|---|---|
| Tek numara | `5` | `backlog task 5 --plain` ile gorevi oku |
| Virgullu numaralar | `3,5,8` | Sirayla her birini isle (3 → 5 → 8) |
| Anahtar kelime | `login sayfasi` | `backlog task list --plain` ile tum gorevleri listele, baslik/aciklamada eslesenleri bul |
| Bos | *(yok)* | `backlog task list -s "To Do" --plain` ile ilk uygun gorevi sec |

**Coklu gorev modu:** Virgullu numaralarda her gorev icin Step 1–7 bagimsiz tekrarlanir. Bir gorevdeki hata digerlerini durdurmaz.

---

## Step 1 — Gorevi Oku ve Sahiplen

```
backlog task <id> --plain
```

Gorev ciktisini oku. Asagidaki bilgileri cikar:
- **Baslik**
- **Aciklama**
- **Kabul kriterleri (AC)**
- **Oncelik**
- **Mevcut durum**

Gorevi hemen sahiplen:
```
backlog task edit <id> -s "In Progress"
```

> **KURAL:** Gorev "Done" durumundaysa DOKUNMA. Kullaniciya bildir ve dur.
> **KURAL:** Gorev "In Progress" durumundaysa kullaniciya sor: devam mi, sifirdan mi?

---

## Step 2 — Analiz ve Plan

### 2.1 — Codebase Kesfet

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

### 2.2 — Ilgili Dosyalari Bul

<!-- GENERATE: FILE_DISCOVERY_HINTS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.structure, stack.primary, project.subprojects
Ornek cikti:
Gorev turune gore dosya arama stratejisi:

| Gorev Turu | Aranacak Dizinler | Dosya Desenleri |
|---|---|---|
| API endpoint | `apps/api/src/modules/` | `*.controller.ts`, `*.service.ts`, `*.module.ts` |
| Frontend sayfa | `apps/web/src/app/` | `page.tsx`, `layout.tsx`, `*.tsx` |
| Mobil ekran | `apps/mobile/src/screens/` | `*.screen.tsx`, `*.tsx` |
| Veritabani | `apps/api/prisma/` | `schema.prisma`, `migrations/` |
| Paylasilan tip | `packages/shared/src/` | `*.types.ts`, `*.dto.ts` |
| Konfigurasyon | proje koku | `*.config.ts`, `*.config.js`, `.env*` |
-->

### 2.3 — Dosyalari Oku ve Anla

1. Gorev basligina ve AC'lere gore ilgili dosyalari belirle
2. Her dosyayi oku — mevcut yapiyi, pattern'leri, import'lari anla
3. Komsuluk analizi yap: ayni dizindeki diger dosyalar nasil yapilandirilmis?
4. Eger benzer bir is daha once yapildiysa (orn. baska bir controller), onu referans al

### 2.3.1 — Stack Uyumluluk Kontrolu

Etkilenen dosyalarin stack'ini taniyip manifest'teki aktif modullerle karsilastir.
Eslesmeme varsa kullaniciyi uyar — zorunlu degil, bilgilendirme amacli:

| Dosya Deseni | Beklenen Modul |
|---|---|
| `*.prisma`, `prisma/` dizini | `orm/prisma` |
| `Dockerfile`, `docker-compose*` | `deploy/docker` |
| `*.expo.*`, `app.json` (expo), `expo-*` | `mobile/expo` |
| `*.swift`, `*.xcodeproj`, `Podfile` | `mobile/react-native` veya iOS |
| `*.flutter.*`, `pubspec.yaml` | `mobile/flutter` |
| `next.config.*`, `app/` (Next.js) | `frontend/nextjs` |
| `*.module.ts` (NestJS pattern) | `backend/nodejs/nestjs` |
| `artisan`, `composer.json` (Laravel) | `backend/php/laravel` |
| `manage.py`, `settings.py` (Django) | `backend/python/django` |
| `.github/workflows/` | `ci-cd/github-actions` |

**Kontrol:**
1. Etkilenen dosya listesini yukardaki desenlerle karsilastir
2. Eslesen modul manifest'te `modules.active` icinde mi kontrol et
3. Aktif DEGILSE uyari ver:

```
⚠️ Stack Uyumsuzlugu Tespit Edildi
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Dosya: <dosya yolu>
Tespit: <stack adi> (orn: "Prisma ORM")
Beklenen modul: <modul adi> (orn: "orm/prisma")
Durum: Bu modul aktif degil.

Oneri: /workflow-update calistirarak modulu etkinlestirin.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

4. Aktif ise → sessiz gec, uyari VERME

### 2.4 — Gorev Tipi Analizi ve Yonlendirme

Gorev AC'lerini, aciklamasini ve hedef dosya listesini analiz ederek yaklasim modunu OTOMATIK sec. Bu bir menu DEGIL — task-hunter otomatik yonlendirir.

#### Ana Mod Secimi

Asagidaki kontrolleri SIRAYLA uygula. Ilk eslesen mod secilir:

| # | Kontrol | Mod | Akis |
|---|---------|-----|------|
| 1 | AC/aciklamada "bug", "hata", "fix", "duzelt", "cokme", "crash" var | **AECA** | Hipotez → test → duzelt → dogrula (maks 3 deneme) |
| 2 | Tahmini etkilenen dosya sayisi 1-2 | **RPI** | Research → Plan → Implement (tek agent, hizli) |
| 3 | Tahmini etkilenen dosya sayisi 3-9 | **Orchestrator** | Teammate spawn, paralel calisma |
| 4 | Tahmini etkilenen dosya sayisi 10+ | **Context Cycling** | Her 5 dosyada ara commit + ozet, context temizleme |

**Dosya sayisi tahmini:** Step 2.2-2.3'te bulunan ilgili dosyalari say. Kesin olmasi gerekmez — kaba tahmin yeterli.

#### Ek Modifier Kontrolleri

Ana modun USTUNE asagidaki modifier'lardan eslesen tum modifier'lar eklenir:

| Kontrol | Modifier | Ne yapar |
|---------|----------|----------|
| Hedef dosyalar controller, middleware, auth, guard, permission, token icerir | **Adversarial Testing** | Uygulama sonrasi `devils-advocate` agent'ini spawn et — adversarial perspektifli guvenlik ve dayaniklilik review |
| Hedef dosyalar component, screen, page, layout (UI) icerir | **TDD** | Once gorsel/davranis testi yaz, sonra kodu uygula |
| `test_strategy == TDD` (asagidaki yapilandirmaya bak) | **Red-Green** | Test ONCE yazilir (kirmizi), sonra gecen kod yazilir (yesil) |
| `security_level == high` (asagidaki yapilandirmaya bak) | **Dual-Pass** | Uygulama sonrasi ikinci agent temiz context ile review yapar |

<!-- GENERATE: TASK_ROUTING_CONFIG
Aciklama: Bootstrap manifest'teki test ve guvenlik yapilandirmasini yazar.
Gerekli manifest alanlari: workflows.test_strategy, project.security_level
Ornek cikti:

#### Proje Yapilandirmasi (Manifest)
- **Test stratejisi:** `TDD` — Red-Green modifier AKTIF
- **Guvenlik seviyesi:** `standard` — Dual-Pass modifier PASIF
-->

#### Karar Bildirimi

Secilen modu kullaniciya bildir. Kullanici override edebilir:

```
━━━ Gorev Tipi Analizi ━━━
Gorev: #<id> — <baslik>
Tespit: <aciklama> (ornek: "3 dosya etkileyen yeni API endpoint'i")
Mod:    <AECA | RPI | Orchestrator | Context Cycling>
Modifier: <varsa liste, yoksa "yok">
━━━━━━━━━━━━━━━━━━━━━━━━━━

Farkli bir yaklasim mi istiyorsunuz? (orn. "basit yap", "teammate kullanma")
Devam etmek icin Enter veya yaklasim belirtin >
```

> **KURAL:** Kullanici yanit vermezse veya Enter'a basarsa secilen modla devam et.
> **KURAL:** Kullanici "basit", "inline", "tek agent" gibi birsey derse RPI moduna gec.
> **KURAL:** Kullanici "teammate", "paralel" derse Orchestrator moduna gec.

#### Mod Referans Detaylari

Her modun Step 3'teki davranis farklari (detay icin bkz. Step 3):

**AECA (Autonomous Error Correction Agent):**
- Onceligi: root cause bulmak, fix denemek, dogrulamak
- Maks 3 fix denemesi — 3. denemede de basarisizsa kullaniciya bildir
- Her denemede: hipotez → fix → test → sonuc degerlendirme
- Test komutu BASARISIZ olursa bir sonraki hipoteze gec

**RPI (Research → Plan → Implement):**
- Tek agent, hizli cevrim
- Research: dosyalari oku, pattern'i anla
- Plan: kisa degisiklik listesi (max 2 dosya)
- Implement: direkt uygula, teammate SPAWN ETME

**Orchestrator:**
- Step 3.1-3.2'deki delegasyon matrisini kullan
- Her alt gorev icin uygun uzman agent sec (backend-expert, mobile-expert, frontend-expert)
- Teammate'leri PARALEL spawn et
- Sonuclari topla, merge conflict kontrolu yap

**Context Cycling:**
- Buyuk refactoring gorevleri icin
- Her 5 dosya duzenlendikten sonra:
  1. Ara commit at (`refactor: <kapsam> — ara commit (#<id>)`)
  2. Mevcut ilerlemeyi ozetle (yapilan + kalan)
  3. Ozeti bir sonraki iterasyona tasi
- Son iterasyonda nihai commit ve rapor

### 2.5 — Uygulama Plani Olustur

Step 2.4'te secilen moda uygun plan yaz:

```
## Uygulama Plani — Task #<id>

### Secilen Yaklasim
Mod: [AECA | RPI | Orchestrator | Context Cycling]
Modifier: [varsa liste]

### Degisiklik Listesi
1. [dosya_yolu] — [ne yapilacak]
2. [dosya_yolu] — [ne yapilacak]
...

### Bagimlilklar
- [varsa diger gorevler veya dosyalar]

### Risk Alanlari
- [potansiyel sorunlar]

### Tahmini Karmasiklik
- [ ] Basit (tek dosya, net degisiklik)
- [ ] Orta (2-4 dosya, mevcut pattern'i takip)
- [ ] Karmasik (5+ dosya, yeni pattern veya entegrasyon)
```

**AECA modu icin ek plan alanlari:**
```
### Hipotez
Root cause tahmini: [hipotez aciklamasi]
Dogrulama yontemi: [nasil test edilecek]
```

**Orchestrator modu icin ek plan alanlari:**
```
### Teammate Bolumu
Teammate 1: [agent] — [dosya listesi]
Teammate 2: [agent] — [dosya listesi]
```

**Context Cycling modu icin ek plan alanlari:**
```
### Iterasyon Plani
Iterasyon 1 (dosya 1-5): [kapsam]
Iterasyon 2 (dosya 6-10): [kapsam]
...
```

Plani backlog'a kaydet:
```
backlog task edit <id> --plan "<plan_metni>"
```

---

## Step 3 — Uygulama

Step 2.4'te secilen moda gore uygulama akisi degisir. Asagidaki mod-spesifik talimatlari oku ve secilen modun akisini takip et.

### 3.0 — Mod-Spesifik Uygulama Akisi

#### AECA Modu (Bug Fix)

AECA modunda sabit 7 adim DEGIL, hipotez-test dongusu uygulanir:

```
Dongu (maks 3 deneme):
  1. Hipotez olustur: root cause nedir?
  2. Fix uygula: hipoteze gore minimal degisiklik yap
  3. Test calistir: dogrulama komutlarini calistir
  4. Sonuc degerlendir:
     - Testler GECTI → donguden cik, Step 4'e devam et
     - Testler BASARISIZ → hipotezi guncelle, bir sonraki denemeye gec
  5. 3. deneme de basarisizsa → DURMA, kullaniciya bildir:
     "3 fix denemesi basarisiz. Mevcut bulgular:
      Deneme 1: [hipotez] → [sonuc]
      Deneme 2: [hipotez] → [sonuc]
      Deneme 3: [hipotez] → [sonuc]
      Lutfen yonlendirme yapin."
```

> **AECA'da Step 3.1-3.2 (delegasyon/teammate) ATLANIR.** Bug fix direkt inline yapilir.
> Backlog'a her denemeyi kaydet: `backlog task edit <id> --append-notes "AECA Deneme N: [hipotez] → [sonuc]"`

#### RPI Modu (Basit Feature)

RPI modunda teammate spawn EDILMEZ. Tek agent hizli cevrim:

1. **Research:** Hedef dosyalari oku, mevcut pattern'i anla (Step 2.2-2.3 zaten yapti)
2. **Plan:** Kisa degisiklik listesi (maks 2 dosya, Step 2.5'te yazildi)
3. **Implement:** Direkt uygula, Step 3.1 delegasyon matrisini ATLA, Step 3.3 kurallarina uy

> RPI modunda Step 3.1-3.2 ATLANIR. Dogrudan Step 3.3'e gec.

#### Orchestrator Modu (Karmasik Feature)

Orchestrator modunda Step 3.1-3.2 TAM olarak uygulanir:

1. Step 2.5'teki teammate bolumune gore alt gorevler olustur
2. Her alt gorev icin uygun uzman agent sec (Step 3.2 tablosuna bak)
3. Teammate'leri PARALEL spawn et
4. Sonuclari topla ve butunlestir
5. Teammate'ler arasi tutarlilik kontrolu yap (import'lar, tip uyumu, API contract)

#### Context Cycling Modu (Buyuk Refactoring)

Context Cycling modunda uygulama ITERASYONLARA bolunur:

```
Her iterasyonda (5 dosya):
  1. Step 2.5'teki iterasyon planindaki dosyalari isle
  2. Degisiklikleri uygula (Step 3.3 kurallarina uy)
  3. Testleri calistir
  4. Ara commit at:
     git commit -m "refactor: <kapsam> — ara commit (#<id>)"
  5. Ilerleme ozetini yaz:
     "Iterasyon N tamamlandi. Yapilan: [liste]. Kalan: [liste]."
  6. Ozeti backlog'a kaydet:
     backlog task edit <id> --append-notes "Context Cycling iterasyon N: [ozet]"
  7. Sonraki iterasyona gec
```

> Context Cycling'de nihai commit Step 5'te atilir. Ara commit'ler refactoring'in guvenli checkpoint'leridir.
> **KURAL:** Her iterasyon bagimsiz olarak derlenebilir/test edilebilir olmali. Yari birakilmis degisiklik YASAK.

### 3.0.1 — Modifier Uygulamasi

Secilen modifier'lar ana mod akisinin USTUNE eklenir. Step 3 tamamlandiktan sonra (Step 4'e gecmeden once) asagidaki modifier'lari uygula:

| Modifier | Ne zaman | Ne yap |
|----------|----------|--------|
| **Adversarial Testing** | Uygulama bittikten sonra | `devils-advocate` agent'ini spawn et. Agent kodu adversarial perspektiften inceler: edge case'ler, yanlis input, yetki bypass, race condition, N+1 sorgu, bagimlilk kirilganligi. CRITICAL ve HIGH bulgulari duzelt, MEDIUM/LOW bulgulari raporla. |
| **TDD** | Uygulama ONCE | UI component icin once test yaz (render testi, event testi), SONRA kodu uygula. |
| **Red-Green** | Uygulama ONCE | Her degisiklik icin: (1) kirmizi test yaz (fail etmeli), (2) testi gecirecek minimal kodu yaz (yesil), (3) refactor. |
| **Dual-Pass** | Uygulama bittikten sonra | `code-review` agent'ini TEMIZ context ile spawn et. Agent implementasyonu bagimsiz olarak review eder. CRITICAL bulgular varsa duzelt. |

> **TDD ve Red-Green BIRLIKTE secilmisse:** Red-Green onceliklidir (TDD'nin daha siki hali). TDD modifier'i ATLA.
> **Adversarial Testing ve Dual-Pass BIRLIKTE secilmisse:** Once adversarial testing, SONRA dual-pass. Dual-pass adversarial fix'leri de review eder.

### 3.1 — Teammate Delegasyon Matrisi

> **NOT:** Bu bolum sadece **Orchestrator** modunda aktiftir. AECA ve RPI modlarinda ATLA.

Gorev karmasikligina gore delegasyon kararini ver:

| Karmasiklik | Dosya Sayisi | Karar | Yontem |
|---|---|---|---|
| Basit | 1-2 | Direkt uygula | Inline |
| Orta | 3-5 | Direkt uygula | Inline |
| Karmasik | 6+ | Teammate spawn et | Alt gorevlere bol |
| Cok karmasik | 10+ | Kullaniciya danismadan teammate spawn etme | Plani onayla |

### 3.2 — Teammate Spawn Mekanizmasi

Karmasik gorevlerde alt gorevler olustur. Dosya tipine gore uygun **uzman agent** kullan:

#### Uzman Agent Yonlendirme Tablosu

Hedef dosyalarin tipine gore teammate'i dogru agent ile spawn et:

| Hedef Dosya Tipi | Agent | Aciklama |
|---|---|---|
| Controller, service, middleware, route, model, migration | `backend-expert` | Backend framework uzmani |
| Screen, component (mobil), navigation, hook (mobil) | `mobile-expert` | Mobil platform uzmani |
| Page, component (web), layout, style, store (web) | `frontend-expert` | Frontend framework uzmani |
| Birden fazla katman (backend + frontend) | Her katman icin ayri agent | Paralel spawn |
| Test, config, util (katman belirsiz) | Inline uygula | Uzman agent gereksiz |

**Monorepo:** Subproject-bazli uzman agent varsa (ornegin `api-expert`, `mobile-expert`), generic agent yerine subproject-spesifik agent'i tercih et. Subproject agent'i o alt projenin dizin yapisi ve convention'larini daha iyi bilir.

**Agent yoksa:** Bootstrap'in uzman agent uretmedigi durumlarda (ornegin Go projesi icin mobile-expert yok) inline uygula ve framework kurallarini IMPLEMENTATION_RULES bolumunden oku.

#### Spawn Formati

```
## Teammate Gorevi: [alt_gorev_adi]
- Agent: [backend-expert | mobile-expert | frontend-expert | {subproject}-expert]
- Hedef dosyalar: [liste]
- Yapilacak is: [net talimat]
- Referans dosya: [ornek pattern icin]
- Tamamlaninca: [beklenen cikti]
```

> **KURAL:** Her teammate'e NET sinirlar ver. Dosya listesi, beklenen cikti, referans pattern.
> **KURAL:** Teammate'ler arasi dosya catismasi OLMAMALI. Ayni dosyayi iki teammate duzenleyemez.
> **KURAL:** Uzman agent sadece kendi domain'indeki dosyalari duzenlemelidir (backend-expert frontend dosyasina dokunmaz).

### 3.3 — Uygulama Kurallari

<!-- GENERATE: IMPLEMENTATION_RULES
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: stack.primary, stack.conventions, project.rules
Ornek cikti:
### Stack-Spesifik Kurallar

**TypeScript Genel:**
- Strict mode aktif, `any` tipi yasak
- Barrel export kullan (`index.ts`)
- Path alias kullan (`@/modules/...`)

**NestJS Backend:**
- Her endpoint bir DTO ile validate edilmeli
- Service katmaninda is mantigi, controller'da sadece routing
- Guard/Interceptor pattern'ini takip et
- Prisma client enjeksiyonu `PrismaService` uzerinden

**Next.js Frontend:**
- App Router kullan, Pages Router degil
- Server Component varsayilan, `'use client'` sadece gerektiginde
- Tailwind CSS, inline style yasak

**React Native / Expo:**
- `useTheme()` hook'u ile tema renkleri, hardcoded renk yasak
- Navigation: Expo Router
- Platform-spesifik kod icin `Platform.select()` kullan
-->

### 3.4 — Ilerleme Kaydi

Her onemli adimda ilerlemeyi logla:
```
backlog task edit <id> --append-notes "[ILERLEME] Step 3.4 — UserService.createUser() tamamlandi"
```

---

## Step 4 — Dogrulama Kapisi

### 4.1 — Test Yazma Kontrolu

AC'lerde test gerektiren maddeler var mi kontrol et.
- Eger AC'de "test yazilmali" veya benzeri ifade varsa: ONCE testleri yaz
- Eger AC'de test belirtilmemisse de, yeni is mantigi eklendiyse: birim test yaz

### 4.2 — Syntax Kontrolu

Degisiklik yapilan dosyalarin syntax hatasi icermedigini dogrula:
- TypeScript: derleme hatasi yok mu?
- Import'lar gecerli mi?
- Dosya dogru formatta mi?

### 4.3 — Test Yurutme

<!-- GENERATE: VERIFICATION_COMMANDS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.subprojects, project.scripts, stack.test_framework
Ornek cikti:
Her alt proje icin test ve dogrulama komutlari:

| Alt Proje | Komut | Aciklama |
|---|---|---|
| API | `cd ../Codebase/apps/api && npm run test` | Jest birim testleri |
| API (e2e) | `cd ../Codebase/apps/api && npm run test:e2e` | Uctan uca testler |
| API (lint) | `cd ../Codebase/apps/api && npm run lint` | ESLint kontrolu |
| API (type) | `cd ../Codebase/apps/api && npx tsc --noEmit` | TypeScript tip kontrolu |
| Web | `cd ../Codebase/apps/web && npm run test` | Jest/Vitest birim testleri |
| Web (build) | `cd ../Codebase/apps/web && npm run build` | Build dogrulamasi |
| Mobile | `cd ../Codebase/apps/mobile && npx tsc --noEmit` | TypeScript tip kontrolu |
| Shared | `cd ../Codebase/packages/shared && npm run test` | Paylasilan paket testleri |
-->

### 4.4 — Hata Degerlendirme

Test basarisiz olursa:

1. **Hata bu gorevden mi kaynaklaniyor?**
   - EVET → Hatay duzelt, testleri tekrar calistir (max 3 deneme)
   - HAYIR → Onceden var olan hata protokolune gec

2. **Onceden var olan hata protokolu:**
   - Hatanin gorev oncesinde de var oldugunu dogrula (git stash + test)
   - Dogrulandi → Hatayi YOKSAY, gorevle ilgili testlerin gectiginden emin ol
   - Dogrulanamadi → Bu gorevden kaynaklaniyordur, duzelt

3. **TESTS_VERIFIED flag'i:**
   - Tum ilgili testler gectiyse: `TESTS_VERIFIED = true`
   - Testler gecmediyse: Step 5'e GECME

> **KURAL:** `TESTS_VERIFIED = false` iken ASLA commit atma.
> **KURAL:** Onceden var olan hatalari duzeltemezsin, sadece kendi gorev testlerinin gectigini dogrula.

### 4.5 — Opsiyonel Dokumantasyon Senkronizasyonu

Bu adim yalnizca gorev asagidaki alanlardan birini etkiliyorsa calisir:
- Proje yetenegi, kapsam veya ortam tanimi
- Stack, runtime, paket, tool veya entegrasyon secimi
- Dizin yapisi, modul sinirlari, veri akisi
- Git/review/test/deploy workflow'u
- README veya gelistirici onboarding bilgisi

Yukaridaki alanlardan hicbiri etkilenmiyorsa bu adimi SKIP et.

Gerekliyse `service-documentation` agent'ini cagir:

```
## Teammate Gorevi: service-documentation
- Hedef dosyalar: PROJECT.md, STACK.md, DEVELOPER.md, ARCHITECTURE.md, WORKFLOWS.md, README.md
- Yapilacak is: Mevcut diff'e gore hangi root dokumanlarin guncellenmesi gerektigini belirle, gereksiz degisiklik onermeden minimal update listesi cikar.
- Referans girdiler: git diff, degisen dosyalar, mevcut root dokumanlar
- Tamamlaninca: dosya bazli guncelleme onerileri veya "guncelleme gerekmiyor" raporu
```

Agent ciktisi geldikten sonra:
1. Onerileri oku
2. Sadece gorevle dogrudan ilgili ve diff ile dogrulanabilen guncellemeleri uygula
3. Dokumantasyon degisiklikleri yapildiysa backlog notlarina ekle
4. Dokuman disinda ek kod degisikligi yapildiysa ilgili dogrulama komutlarini tekrar calistir

---

## Step 5 — Commit

### 5.1 — Dosya Hazirlama

SADECE bu gorevle ilgili dosyalari stage'e al:
```bash
git add <dosya1> <dosya2> ...
```

> **KURAL:** `git add .` veya `git add -A` KULLANMA. Sadece gorevle ilgili dosyalari ekle.
> **KURAL:** `.env`, credentials, `node_modules`, build ciktilari ASLA commit'e dahil edilmez.

### 5.2 — Commit Mesaji

<!-- GENERATE: COMMIT_CONVENTION
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: conventions.commit_language, conventions.commit_format
Ornek cikti:
### Commit Format

```
<prefix>: <aciklama> (#<task_id>)
```

**Prefix haritasi:**
| Prefix | Kullanim |
|---|---|
| `feat` | Yeni ozellik |
| `fix` | Hata duzeltme |
| `refactor` | Yeniden yapilandirma (davranis degismez) |
| `test` | Test ekleme/duzeltme |
| `docs` | Dokumantasyon |
| `chore` | Bakim, konfigurasyon |
| `style` | Kod formatlama |

**Dil:** Turkce
**Ornek:** `feat: kullanici kayit endpointi eklendi (#12)`
-->

### 5.3 — Commit Olustur

```bash
git commit -m "<prefix>: <aciklama> (#<task_id>)"
```

---

## Step 6 — Gorevi Kapat

### 6.1 — AC Kontrolu

Tum kabul kriterlerini tek tek kontrol et:
- [ ] AC 1 — karsilandi mi?
- [ ] AC 2 — karsilandi mi?
- ...

> **KURAL:** Tum AC'ler karsilanmadikca gorevi kapatma.

### 6.2 — Ozet Yaz

```
backlog task edit <id> --append-notes "[TAMAMLANDI] <ozet>"
```

Ozet icerigi:
- Yapilan degisiklikler (dosya listesi)
- Eklenen/degistirilen satirlar (kaba rakam)
- Olusturulan testler
- Commit hash'i

### 6.3 — Durumu Guncelle

```
backlog task edit <id> -s "Done"
```

---

## Step 7 — Kullanici Raporu

Kullaniciya asagidaki formatta rapor sun:

```
## ✅ Task #<id> — <baslik>

### Yapilan Isler
- [degisiklik 1]
- [degisiklik 2]

### Degisiklik Ozeti
| Dosya | Degisiklik |
|---|---|
| `<yol>` | <aciklama> |

### Test Sonuclari
- [x] Birim testler gecti
- [x] Lint temiz
- [x] Tip kontrolu basarili

### Commit
`<hash>` — `<mesaj>`

### Notlar
[varsa ek bilgiler, uyarilar, oneriler]

### Sonraki Task Onerisi

| Sira | Task | Baslik | Skor | Neden Simdi? |
|------|------|--------|------|-------------|
| 1 | #id | baslik | skor | gerekcesi |
| 2 | #id | baslik | skor | gerekcesi |
| 3 | #id | baslik | skor | gerekcesi |

> Devam etmek icin: `/task-hunter {id}`
```

---

## ADIM 8 — Sonraki Task Onerisi

Bu adim HER ZAMAN calisir — tek task veya coklu task fark etmez, is bitince sonraki adimi onerir.
Coklu task modunda sadece TUM task'lar tamamlandiktan sonra sunulur — task'lar arasi onerilmez.

### 8.1 Acik Task'lari Tara

```bash
backlog task list -s "To Do" --plain
```

Acik task yoksa → "Backlog'da acik task kalmadi." mesaji ile bitir.

### 8.2 Sicak Baglam Analizi

Az once tamamlanan task'tan su bilgileri kullan:

| Bilgi | Kaynak | Kullanim |
|-------|--------|----------|
| **Degistirilen dosyalar** | Adim 3'ten dosya listesi | Ayni dosya/dizine dokunan task'lara bonus |
| **Etkilenen katmanlar** | Subproject/dizin tespiti | Ayni katmandaki task'lara bonus |
| **Etiketler** | Tamamlanan task'in etiketleri | Ayni etiketli task'lara bonus |
| **Ogrenilen pattern** | Implementasyon deneyimi | Ilgili alan bilgisi zaten yuklu |

### 8.3 Hizli Skorlama (5 boyutlu)

Her acik task icin hizli skor hesapla:

```
Etki (0-10):         Guvenlik/veri kaybi=10, UX/refactor=2
Risk (0-10):         Prod'da aktif tetiklenen=10, sadece dev=2
Bagimlilik (0-10):   Blocker=10, izole=2
Karmasiklik (0-10):  TERS — tek dosya=10, migration+multi-layer=2
Sicak Baglam (0-10): Ayni dosya=10, ayni dizin=8, ayni katman=6, ayni etiket=4, ilgisiz=0

Skor = (Etki x 2.5) + (Risk x 2) + (Bagimlilik x 1.5) + (Karmasiklik x 1) + (Sicak Baglam x 2)
```

**Sicak baglam bonusu:**
- Ayni **dosyaya** dokunan → 10 (baglam degisimi sifir)
- Ayni **dizin/module** dokunan → 8
- Ayni **katmana** dokunan (backend/mobile/frontend) → 6
- Ayni **etikete** sahip → 4
- Hic ilgisi yok → 0

### 8.4 Oneri Sun

En yuksek skorlu 3 task'i oner:

```markdown
## Sonraki Task Onerisi

Tamamlanan task'in baglami ve backlog analizi bazinda:

| Sira | Task | Baslik | Skor | Neden Simdi? |
|------|------|--------|------|-------------|
| 1 | #{id} | {baslik} | {skor} | {1 cumle gerekce} |
| 2 | #{id} | {baslik} | {skor} | {1 cumle gerekce} |
| 3 | #{id} | {baslik} | {skor} | {1 cumle gerekce} |

> Devam etmek icin: `/task-hunter {id}`
```

**Gerekce yazim kurallari:**
- Sicak baglam varsa belirt: "Az once calistigin `{dosya}` ile ayni modul"
- Blocker ise belirt: "#{diger_id} bu task'a bagimli"
- Quick win ise belirt: "Tek dosya degisikligi, yuksek etki"
- Risk yuksekse belirt: "Prod'da aktif tetikleniyor"

---

## Zorunlu Kurallar

### Kutsal Kurallar (Her Komutta Gecerli)

1. **Codebase e config YAZMA** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` dosyalari SADECE Agentbase icinde olusturulur. Codebase icinde `.claude/` dizini olusturma, `../Codebase/CLAUDE.md` yazma YASAK.
2. **Git sadece Codebase de** — Tum git islemleri (commit, push, branch) `../Codebase/` icinde yapilir. Agentbase'de git YOKTUR.
3. **Codebase OKUNUR, config YAZILMAZ** — Proje dosyalari (`src/`, `app/`, vb.) okunabilir ve gorev gerekiyorsa duzenlenebilir. Config dosyalari (`.claude/`, `CLAUDE.md`) Codebase icinde YAZILAMAZ.

1. **Otonom calis** — Kullaniciya soru sorma, karar al ve uygula. Sadece belirsiz AC'lerde sor.
2. **Once oku, sonra yaz** — Bir dosyayi degistirmeden once MUTLAKA oku ve mevcut pattern'i anla.
3. **Pattern takip et** — Mevcut koddaki yapiyi, isimlendirmeyi, formati takip et. Yeni convention icat etme.
4. **Minimal degisiklik** — Sadece gorev icin gerekli degisiklikleri yap. Refactor, iyilestirme, cleanup YAPMA.
5. **Test yaz** — Yeni is mantigi eklendiyse test yaz. Mevcut testleri bozma.
6. **TESTS_VERIFIED olmadan commit atma** — Testler gecmeden Step 5'e gecme.
7. **Sadece gorev dosyalarini commit'le** — `git add .` yasak. Gorevle ilgisiz dosyalari ekleme.
8. **Backlog CLI kullan** — Gorev durumunu, notlarini, kapamayi SADECE `backlog` CLI ile yap. Dosyayi elle duzenleme.
9. **Onceden var olan hatalari duzeltme** — Senin gorevinden once var olan hatalari yoksay, sadece kendi testlerinin gectigini dogrula.
10. **AC karsilanmadan kapatma** — Tum kabul kriterleri karsilanmadikca gorevi "Done" yapma.
11. **Teammate sinirlarini koru** — Teammate'lere net dosya listesi ver. Ayni dosyayi iki teammate duzenleyemez.
12. **Ilerlemeyi kaydet** — Her onemli adimda backlog'a not ekle.
13. **Hata dongusune girme** — Ayni hatayi 3'ten fazla deneme ile cozmeye calisma. 3 denemede cozulmediyse kullaniciya bildir.
14. **Codebase yolu** — Tum proje dosyalarina `../Codebase/` uzerinden eris.
15. **Guvenlik** — `.env` dosyalari, credential'lar, secret'lar ASLA commit'e dahil edilmez, log'a yazilmaz, ciktida gosterilmez.

<!-- GENERATE: PROJECT_SPECIFIC_RULES
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.rules, project.forbidden_patterns, project.domain_rules
Ornek cikti:
### Proje-Spesifik Kurallar

16. **Prisma migration** — Schema degisikligi yapildiysa `npx prisma migrate dev --name <isim>` calistir.
17. **API versiyonlama** — Tum endpointler `/api/v1/` prefix'i altinda olmali.
18. **Tema kullanimi** — React Native'de hardcoded renk YASAK, `useTheme()` kullan.
19. **DTO validasyon** — Her API endpoint'i input icin DTO + class-validator kullanmali.
20. **Error response format** — API hatalari `{ error: string, code: string, details?: any }` formatinda donmeli.
-->

<!-- GENERATE: SELF_REFRESH
Aciklama: Komut son adim - self-refresh check. Bootstrap bu marker-i ortak
Self-Refresh bolumu ile degistirir. Komut kendi metnini proje gerceginin
isiginda gozden gecirir: kucuk uyumsuzluk Edit ile, buyuk degisim backlog
task-i olarak rapor edilir.
-->

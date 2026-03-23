# Deep Audit — Domain Bazli Uctan Uca Denetim

> Bir domain modulunu (auth, profil, odeme, mesaj vb.) TUM katmanlarda (API + DB + Mobil + Frontend) derinlemesine denetler. Bulgulari iki boyutta siniflandirir, basit olanlari fix eder, karmasik olanlari backlog'a kaydeder.
> Kullanim: `/deep-audit <modul-adi>`, `/deep-audit auth`, `/deep-audit profil`, `/deep-audit odeme`

---

## Kural: OTONOM CALIS

- Kullaniciya soru SORMA — modulu belirle, incele, raporla.
- Basit sorunlari (typo, eksik import, yanlis tip, eksik null-check) DIREKT duzelt.
- Karmasik sorunlari (mimari degisiklik, yeni ozellik, migration) backlog'a KAYDET.
- Tum adimlari CALISTIR — bir adimi atlama.

---

<!-- GENERATE: CODEBASE_CONTEXT
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.description, stack.primary, project.structure, project.subprojects, stack.orm, stack.auth_method
Ornek cikti:
## Proje Baglami
- **Proje:** E-ticaret platformu
- **Stack:** TypeScript, Prisma, PostgreSQL, Expo
- **Auth:** JWT
- **Yapi:**
  - `apps/api/` — NestJS backend
  - `apps/mobile/` — Expo React Native
  - `apps/web/` — Next.js frontend
  - `packages/shared/` — Paylasilan tipler
-->

---

## BUYUK RESIM: KATMANLAR ARASI ILISKI HARITASI

<!-- GENERATE: SUBPROJECT_LAYERS
Aciklama: Bootstrap manifest'teki subproject bilgisiyle katman haritasini uretir.
Gerekli manifest alanlari: project.subprojects, project.subprojects[].role, project.subprojects[].stack
Ornek cikti:

```
┌──────────────────┐     API JSON      ┌──────────────────────┐
│   Backend API    │ ◄──────────────► │   Mobil Uygulama      │
│  (apps/api)      │                   │  (apps/mobile)        │
│  NestJS+Prisma   │                   │  Expo + React Native  │
└──────┬───────────┘                   └────────┬──────────────┘
       │  Prisma ORM                             │  Axios/fetch
       ▼                                        ▼
   [PostgreSQL]                             [Kullanici]
       ▲
       │  (varsa: eski backend, admin panel)
       └──────────────────────────────────────
```

**Kritik iliski noktalari:**

| Iliski | Kirilma Riski | Ornek |
|--------|---------------|-------|
| API response → Frontend/Mobil parser | Response'tan alan silinirse client crash | controller → screen |
| API validation → Client form | Backend validation degisirse client hata gosteremez | schema → form |
| Auth flow → Auth state | Token refresh degisirse session kaybi | auth service → auth context |
| DB schema → API query | Schema degisirse query crash | ORM model → controller |
-->

### Her Bulgu Icin Etki Zinciri Sorusu

Agent'lar ve lead, HER BULGU icin su soruyu sormali:

> "Bu bulguyu duzeltirsem/degistirsem, zincirin diger ucunda ne kirilir?"

```
API fix yapildi
  ├─ Response shape degisti mi? → Client parser'i kontrol et
  ├─ Validation kurali degisti mi? → Client form error handling'i kontrol et
  ├─ HTTP status code degisti mi? → Client interceptor'u kontrol et
  ├─ ORM query degisti mi? → Relation chain dogrulanmali
  └─ Auth flow degisti mi? → Auth context/state yonetimini kontrol et

Client fix yapildi
  ├─ API cagrisi degisti mi? → API endpoint'i kabul ediyor mu?
  ├─ Request body degisti mi? → API validation'i gecer mi?
  ├─ Yeni endpoint gerekiyor mu? → API'de tanimli mi?
  └─ State degisti mi? → Diger ekranlar/sayfalar stale data gorur mu?

DB schema degisti
  ├─ Migration gerektiriyor mu? → Production DB'ye etkisi ne?
  ├─ Ilgili controller query'leri guncel mi?
  └─ Client'ta bu alani kullanan ekran/sayfa var mi?
```

---

## ADIM 0: MODUL TESPITI VE KAPSAM BELIRLEME

`$ARGUMENTS` metnini analiz ederek modul kapsamini belirle.

### 0.1. Modul Eslestirme Tablosu

<!-- GENERATE: MODULE_MAPPING
Aciklama: Bootstrap manifest'teki proje yapisi ve domain bilgisiyle modul-dosya eslestirme tablosunu uretir.
Gerekli manifest alanlari: project.subprojects, project.modules, project.structure, rules.domain
Bootstrap, codebase analizindeki controller/service/screen/component isimlendirmelerinden domain modullerini cikarir.

Ornek cikti:

Kullanicinin verdigi modul adini asagidaki alanlarla eslestir:

| Modul Anahtar Kelimesi | Backend API | Frontend/Mobil |
|------------------------|-------------|----------------|
| `auth`, `login`, `kayit`, `oturum` | auth.controller, auth.service, auth.guard, auth.schema | LoginPage, RegisterPage, AuthContext, useAuth |
| `profil`, `profile`, `kullanici` | user.controller, user.service, profile.schema | ProfilePage, ProfileEditPage, UserContext |
| `odeme`, `payment`, `siparis` | payment.controller, order.service, payment.schema | CheckoutPage, PaymentScreen, OrderHistory |
| `mesaj`, `message`, `chat` | message.controller, chat.service, message.schema | ChatPage, MessagesScreen, ChatContext |

**Proje-spesifik moduller:** Bootstrap codebase analizinden tespit edilen ek domain modulleri buraya eklenir.
-->

Eslesme bulunamazsa kullaniciya sor: "Modul adi taninamadi. Hangi alani review etmemi istersiniz?"

### 0.2. Katman Tespiti

Modul eslestirmesinden sonra hangi katmanlarin review edilecegini belirle:

```
KATMANLAR:
- [x/—] Backend API (controller, service, route, guard, middleware)
- [x/—] Backend Validator (validation schema, DTO)
- [x/—] Database (ORM schema, migration)
- [x/—] Frontend Web (page, component, hook, store)
- [x/—] Frontend Mobil (screen, component, context, navigation)
- [x/—] Shared (tipler, utility, DTO)
```

> **NOT:** Tum katmanlar her modilde gecerli olmayabilir. Tema modulu icin API katmani gereksiz olabilir. Modul kapsamini belirlerken GEREKSIZ katmanlari atla.

---

## ADIM 1: DERIN DOSYA KESFI

Bu adim command'in kalitesini belirler. **Araclari kullanarak gercek dosya yollari ve satir numaralari topla.**

### 1.1. Backend API Dosya Tarama

Modul eslestirmesinden gelen her alan icin:

```
# Controller/Handler
Grep(pattern="{modul_terimi}", path="{api_subproject}/src/", output_mode="files_with_matches")

# Routes/Endpoints
Grep(pattern="{modul_terimi}", path="{api_subproject}/src/routes/", output_mode="files_with_matches")

# Service/Business Logic
Grep(pattern="{modul_terimi}", path="{api_subproject}/src/services/", output_mode="files_with_matches")

# Middleware/Guard
Grep(pattern="{modul_terimi}", path="{api_subproject}/src/middleware/", output_mode="files_with_matches")

# Validation Schema
Grep(pattern="{modul_terimi}", path="{api_subproject}/src/validators/", output_mode="files_with_matches")

# ORM Schema/Model
Grep(pattern="{modul_terimi}", path="{orm_schema_path}", output_mode="content")
```

### 1.2. Frontend/Mobil Dosya Tarama

```
# Sayfalar/Ekranlar
Grep(pattern="{modul_terimi}", path="{frontend_subproject}/src/", output_mode="files_with_matches")

# Componentler
Grep(pattern="{modul_terimi}", path="{mobile_subproject}/src/components/", output_mode="files_with_matches")

# Context/Store/Hook
Grep(pattern="{modul_terimi}", path="{mobile_subproject}/src/context/", output_mode="files_with_matches")
Grep(pattern="{modul_terimi}", path="{mobile_subproject}/src/hooks/", output_mode="files_with_matches")

# API Client/Service
Grep(pattern="{modul_terimi}", path="{frontend_subproject}/src/services/", output_mode="files_with_matches")
```

### 1.3. Bagimlilik Izleme (Keyword Aramanin Otesi)

Keyword aramasi modul adini icermeyen ama modulle dogrudan iliskili dosyalari KACIRIR.

**Adim 1:** Modul eslestirme tablosundaki bilinen dosyalari direkt scope'a dahil et.

**Adim 2:** Bulunan dosyalardan import/dependency trace:
```
Her controller/service dosyasi icin:
1. Dosyadaki import statement'larini tara → ilgili service/util'leri bul
2. ORM model kullanimlarini tara (hangi modeller sorgulanıyor?)
3. Client'ta: import edilen component/hook'lari izle
```

**Adim 3:** Cross-cutting concern taramasi:
```
Modulun kullandigi shared altyapiyi kontrol et:
- Auth middleware/guard (korunmus endpoint'ler)
- Error handler middleware (hata yonetimi)
- Response utility (standart response format)
- API client interceptor (client tarafta)
- Auth context/state (token, user info)
- Theme/style sistemi (tema renkleri)
```

### 1.4. Bellek Arastirmasi

```
# episodic-memory — onceki oturum gecmisi
mcp__plugin_episodic-memory_episodic-memory__search({ query: "{modul_terimi} review bug karar" })
```

### 1.5. Dosya Envanteri Cikar

Tum bulunan dosyalari yapilandirilmis sekilde listele:

```
DOSYA ENVANTERI ({modul_adi}):
─────────────────────────────────
Backend Controller:  [N dosya]
  - dosya.ts:satir — metod aciklamasi
Backend Service:     [N dosya]
Backend Route:       [N dosya]
Backend Validator:   [N dosya]
Backend Middleware:   [N dosya]
ORM Schema:          [ilgili modeller]
Frontend Page:       [N dosya]
Frontend Component:  [N dosya]
Mobil Screen:        [N dosya]
Mobil Component:     [N dosya]
Mobil Context/Store: [N dosya]
Client API Service:  [ilgili fonksiyonlar]
─────────────────────────────────
TOPLAM: [N] dosya review edilecek
```

---

## ADIM 2: PARALEL REVIEW AGENTLARI SPAWN ET

Asagidaki agent'lari **paralel** olarak spawn et.

**KRITIK:** Her agent'in prompt'una "Buyuk Resim" bolumunden ilgili iliski noktalarini dahil et. Agent'lar izole calismasin — her bulgunun diger katmanlari nasil etkiledigini raporlamali.

<!-- GENERATE: REVIEW_AGENTS
Aciklama: Bootstrap stack'e gore 4 agent'in prompt sablonlarini ozellestirir.
Gerekli manifest alanlari: stack.primary, stack.orm, stack.api_framework, stack.auth_method, project.subprojects
Bootstrap, stack'e gore agent prompt'larindaki framework-spesifik kontrolleri doldurur:
- Express/NestJS/FastAPI/Django/Laravel → farkli controller/service pattern'leri
- Prisma/TypeORM/Eloquent/Django ORM → farkli query kontrolleri
- React/Vue/Expo/Flutter → farkli component/state kontrolleri

Ornek cikti (Express + Prisma + Expo):

### Agent Prompt Sablonlari
(stack-spesifik kontrol listeleritbu GENERATE blogu icinde uretilir)
-->

### Agent 1: API Denetcisi

```
Agent(
  subagent_type="general-purpose",
  name="api-denetcisi",
  model="sonnet",
  description="{modul} API code review",
  prompt="..."
)
```

**Kontrol alanlari:**

A. **Dead Code ve Kullanilmayan Alanlar:**
   - Controller'da tanimli olup route'ta baglanmamis metodlar (dead endpoint)
   - Service'de tanimli olup hicbir yerden cagrilmayan export'lar
   - ORM schema'da tanimli olup hic sorgulanmayan alanlar
   - Validator schema'da tanimli olup controller'da kullanilmayan alanlar
   - Commented-out kod bloklari, duplicate metod

B. **Eksik Senaryo Analizi:**
   - CRUD operasyonlarinda eksik validation
   - Error handling eksikleri (try-catch yok, hata yutma, generic catch)
   - Edge case'ler: null/undefined/empty string/bos array durumlari
   - Transaction boundary eksikleri
   - Yetkilendirme kontrol eksikleri (auth guard/middleware eksik)
   - Rate limiting eksikleri (brute force'a acik endpoint'ler)

C. **Kod Kalitesi:**
   - Framework pattern uyumu
   - DRY ihlalleri (ayni logic birden fazla yerde)
   - Magic string/number kullanimi
   - Loglama eksikleri

D. **Guvenlik (IDOR dahil):**
   - Injection riski (raw query'de parametrize edilmemis deger)
   - IDOR riski (authorization kontrolu eksik — baska kullanicinin verisine erisim)
   - Auth dogrulama eksikleri
   - Input sanitization eksikleri
   - PII sizintisi (log/response'da maskelenmemis hassas veri)

**CIKTI FORMATI:**

```markdown
## API Review: {modul}

### KULLANILMAYAN ALANLAR
| # | Dosya:Satir | Alan/Metod | Durum | Aksiyon |
|---|-------------|------------|-------|---------|
| 1 | dosya.ts:45 | exportName | Hicbir yerden cagrilmiyor | KALDIR veya DOCUMENT |

### EKSIK SENARYOLAR
| # | Dosya:Satir | Senaryo | Etki | Oncelik |
|---|-------------|---------|------|---------|
| 1 | dosya.ts:120 | Null kontrolu yok | Runtime error | HIGH |

### BULGULAR
| # | Dosya:Satir | Seviye | Sorun | Karmasiklik | Onerilen Duzeltme |
|---|-------------|--------|-------|-------------|-------------------|
| 1 | dosya.ts:89 | KRITIK | IDOR | Tek dosya | req.user.id kontrolu ekle |

### GUVENLIK BULGULARI
| # | Dosya:Satir | Risk | Seviye | Aciklama |
|---|-------------|------|--------|----------|
| 1 | dosya.ts:55 | IDOR | KRITIK | Authorization kontrolu eksik |
```

---

### Agent 2: API Uyum Denetcisi

**Bu agent SADECE modul hem backend hem frontend/mobil katmani iceriyorsa spawn edilir.**

**Kontrol alanlari:**

A. **Request/Response Contract Uyumu:**
   - API'nin dondugu response alanlari vs client'in bekledigi alanlar
   - camelCase/snake_case donusum tutarliligi
   - Pagination parametreleri uyumu
   - Nullable alanlarin client'ta handle edilmesi

B. **Endpoint Eksikleri:**
   - Client'ta cagirilan ama API'de tanimsiz endpoint
   - API'de tanimli ama client'ta kullanilmayan endpoint
   - HTTP method uyumsuzlugu (GET vs POST)

C. **Error Handling Uyumu:**
   - API error response formati vs client error parser
   - HTTP status code kullanimi tutarliligi
   - Validation error format uyumu

D. **Auth Flow Uyumu:**
   - Token gonderimi (header format)
   - Token refresh flow
   - Auth state yonetimi vs API beklentisi

**CIKTI FORMATI:** API agent ile ayni tablo formatini kullan. Kategoriler: UYUMSUZLUK, EKSIK ENDPOINT, HATA YONETIMI.

---

### Agent 3: Frontend/Mobil Akis Denetcisi

**Bu agent SADECE modul frontend veya mobil katmani iceriyorsa spawn edilir.**

**Kontrol alanlari:**

A. **Kullanici Akis Butunlugu:**
   - Sayfa/ekran arasi navigation dogrulugu
   - Loading/error/empty state'lerin tumu handle ediliyor mu?
   - Pull-to-refresh, pagination, retry mekanizmalari
   - Back button/navigation davranisi

B. **State Yonetimi:**
   - Context/store guncellemesi eksik senaryolar
   - Stale data riski (cache invalidation eksik)
   - Race condition (double-tap, rapid navigation)
   - Memory leak (unmounted component state update — cleanup)

C. **UI/UX Tutarliligi:**
   - Tema/stil sistemi kurallarina uyumluluk
   - Hardcoded renk/boyut kullanimi (varsa YASAK)
   - Platform farklari (iOS vs Android, responsive) handle ediliyor mu?

D. **Performans:**
   - Gereksiz re-render (memo/callback eksik)
   - Buyuk liste optimizasyonu (virtualization)
   - Image/media optimizasyonu
   - Agir hesaplamalarin render disina alinmasi

**CIKTI FORMATI:** API agent ile ayni tablo formati.

---

### Agent 4: Senaryo Dogrulayici

**Kontrol alanlari:**

1. Modulun **tum kullanici akislarini** (happy path) listele
2. Her akis icin **edge case senaryolarini** belirle
3. Edge case'lerin kodda handle edilip edilmedigini dogrula
4. Handle edilmemis senaryolari raporla

**Senaryo kategorileri:**

A. **Veri Sinir Degerleri:** Null/undefined/empty, cok uzun string, ozel karakter, min/max asimi
B. **Zamanlama/Siralama:** Concurrent request, stale data, token expiry sirasinda islem
C. **Yetki/Erisim:** Yetkisiz erisim, cross-user veri erisimi (IDOR), session expire sonrasi
D. **Is Kurali:** Gecersiz durum gecisleri, cascade etkiler, bagimli veri tutarliligi
E. **Altyapi:** DB connection kaybi, cache unavailable, file upload limitleri, push notification basarisizligi

**CIKTI FORMATI:**

```markdown
## Senaryo Analizi: {modul}

### KULLANICI AKISLARI (Happy Path)
| # | Akis | Adimlar | Durum |
|---|------|---------|-------|
| 1 | Yeni kayit | Form → Kaydet → Login | OK/EKSIK |

### HANDLE EDILMEMIS EDGE CASE'LER
| # | Akis | Senaryo | Dosya:Satir | Etki | Oncelik |
|---|------|---------|-------------|------|---------|
| 1 | Kayit | Null deger gonderimi | controller.ts:45 | 500 error | HIGH |

### TEST ONERILERI
| # | Senaryo | Test Tipi | Kapsam |
|---|---------|-----------|--------|
| 1 | Concurrent request | Integration | API |
```

---

## ADIM 3: SONUCLARI TOPLA VE KATEGORIZE ET

Tum agent'lar tamamlandiginda, bulgulari tek bir yapida birlestir.

### 3.1. Iki Boyutlu Siniflandirma

Her bulguyu iki BAGIMSIZ boyutta degerlendir:

**Boyut 1 — Etki Seviyesi:**

| Seviye | Anlam | Ornek |
|--------|-------|-------|
| **KRITIK** | Runtime crash, veri kaybi, guvenlik acigi | Type hatasi, IDOR, transaction eksikligi |
| **MAJOR** | Yanlis davranis, eksik ozellik, veri tutarsizligi | Response'ta eksik alan, validation eksik |
| **MINOR** | Stil, tutarlilik, iyilestirme | DRY ihlali, magic string, yorum eksik |

**Boyut 2 — Aksiyon:**

| Aksiyon | Kriter | Karar |
|---------|--------|-------|
| **DOGRUDAN FIX** | Tek dosya + deterministik + tahmin gerektirmiyor | ADIM 4'te fix et |
| **BACKLOG TASK** | Cok dosya baglimli, migration gerekli, veya davranis belirsiz | ADIM 5'te task ac |
| **TEMIZLIK** | Dead code — guvenli temizlik kriterlerini karsiliyorsa fix, yoksa backlog | Karar agacina bak |
| **DOKUMAN** | Eksik/guncel olmayan code comment | Dogrudan guncelle |

**DIKKAT:** Seviye ve aksiyon BAGIMSIZ. KRITIK bir bulgu DOGRUDAN FIX edilebilir (eksik null-check). MINOR bir bulgu BACKLOG gerektirebilir (10 dosyadaki DRY ihlali). Aksiyon kararini ADIM 4'teki karar agaci belirler, seviye degil.

### 3.2. Katmanlar Arasi Etki Analizi

Agent bulgulari geldiginde lead olarak cross-layer analiz yap:

**Her API bulgusu icin:**
1. Bu degisiklik response shape'ini etkiler mi? → API Uyum agent'inin bulgulariyla cross-check
2. Client bu response'u parse ediyor mu? → Frontend/Mobil agent'inin bulgulariyla cross-check
3. ORM schema'da ilgili degisiklik gerekiyor mu?

**Her client bulgusu icin:**
1. Client'in bekledigi API contract karsilaniyor mu? → API Uyum agent'i dogrulamali
2. Auth state etkileniyor mu?
3. Offline/network hata durumunda kullanici deneyimi tutarli mi?

**Etki zinciri raporu:**

```
KATMANLAR ARASI ETKI ANALIZI:
| # | Fix | Kaynak Katman | Etkilenen Katman | Etki | Dogrulandi? |
|---|-----|---------------|------------------|------|-------------|
| 1 | Response'a alan eklendi | API | Mobil | Yeni alan kullanilabilir | Evet |
| 2 | Validation kurali eklendi | API | Mobil | Yeni hata kodu handle edilmeli | HAYIR → TASK |
```

### 3.3. Capraz Dogrulama

- Ayni dosya/satir hakkinda farkli degerlendirme → daha yuksek oncelikli olani al
- False positive suphesi → ilgili dosyayi kendin oku ve dogrula
- **Tek tarafli fix riski**: API'de fix yapildi ama client'ta karsiligi yoksa → backlog task ac

---

## ADIM 4: DOGRUDAN DUZELTILEBILIR HATALARI FIX ET

### Dogrudan Fix Karari (Karar Agaci)

```
Bulgu tespit edildi
  ├─ Degisiklik TEK DOSYA mi?
  │   ├─ Evet → Fix net ve deterministik mi? (varsayilan deger tahmin gerekmiyor mu?)
  │   │   ├─ Evet → DOGRUDAN FIX ET (seviye fark etmez)
  │   │   └─ Hayir → BACKLOG TASK AC
  │   └─ Hayir → Degisen dosyalar birbirine baglimli mi?
  │       ├─ Evet → BACKLOG TASK AC
  │       └─ Hayir (bagimsiz fixler) → DOGRUDAN FIX ET
  └─ Migration / DB sema degisikligi gerekiyor mu?
      ├─ Evet → BACKLOG TASK AC (her zaman)
      └─ Hayir → Yukaridaki agaci takip et
```

### Duzeltme Kurallari

1. **Her duzeltme oncesi dosyayi oku** — mevcut kodu anla
2. **Mevcut stil takip** — dosyanin mevcut kodlama stilini koru
3. **Yan etki kontrolu** — fix'in baska bir akisi kirip kirmadığını kontrol et (Grep ile consumer'lari tara)
4. **Her fix'e seviye ata**: KRITIK, MAJOR, MINOR
5. **ASLA YAPMA**:
   - ORM migration veya DB sema degisikligi
   - Route/middleware konfigürasyon degisikligi
   - Dosya silme (dead code bile olsa — backlog'a gonder)
   - Varsayilan deger TAHMIN etme (net degilse backlog'a gonder)

---

## ADIM 4.5: DOGRULAMA KAPISI (VERIFICATION GATE)

Fix'ler yapildiktan sonra dogrulama calistir. Bu adim ATLANAMAZ.

<!-- GENERATE: VERIFICATION_COMMANDS
Aciklama: Bootstrap manifest'teki stack bilgisiyle dogrulama komutlarini uretir.
Gerekli manifest alanlari: project.subprojects, stack.test_framework, stack.typescript, stack.linter
Ornek cikti:

### Dogrulama Komutlari

| Katman | Komut |
|--------|-------|
| API TypeScript | `cd apps/api && npx tsc --noEmit` |
| API Test | `cd apps/api && npm test` |
| Mobile TypeScript | `cd apps/mobile && npx tsc --noEmit` |
| Mobile Test | `cd apps/mobile && npm test` |
| Web TypeScript | `cd apps/web && npx tsc --noEmit` |
-->

### Dogrulama Sonucu Degerlendirme

| Sonuc | Aksiyon |
|-------|---------|
| Tum kontroller gecti | Rapora gec |
| Derleme hatasi | Fix'i geri al, hatayi duzelt, tekrar dogrula |
| Test basarisiz | Fix'in test'i kirip kirmadığını analiz et |

---

## ADIM 4.7: FIX KALITE KAPISI (Self-Review)

ADIM 4'te yapilan duzeltmeler de hata icerebilir. Degistirilen dosyalar `code-review` ve (varsa) `devils-advocate` agent'lariyla review edilir.

### Ne Zaman Calisir

- ADIM 4'te **en az 1 dosya duzenlendiyse** calisir
- Hicbir fix yapilmadiysa bu adim ATLANIR
- ADIM 4.5 dogrulamasi gecildikten SONRA calisir

### Sonsuz Dongu Korumasi

Self-review duzeltmeleri uzerinde TEKRAR self-review calistirilMAZ. Maksimum 1 iterasyon.

---

## ADIM 4.9: DEGISIKLIKLERI COMMIT ET

### Commit Kurallari

1. **Sadece ADIM 4'te duzenlenen dosyalari stage et** (git add -A YAPMA)
2. **Commit mesaji:**

```bash
git commit -m "$(cat <<'EOF'
duzeltme({modul}): deep-audit — {N} fix uygulandı

- {KRITIK fix ozeti varsa}
- {MAJOR fix ozeti varsa}
- {MINOR fix ozeti varsa}
EOF
)"
```

3. **Push YAPMA** — push karari kullaniciya aittir

---

## ADIM 5: BACKLOG AKSIYONLU BULGULAR ICIN TASK AC

### 5.0. Duplicate Kontrolu (ZORUNLU)

Task acmadan ONCE mevcut backlog'u tara:

```
backlog task search "{modul} {bulgu anahtar kelimeleri}"
```

- Ayni bulgu zaten bir task'ta varsa → YENI TASK ACMA, mevcut task'a not ekle
- Benzer ama farkli scope'ta → yeni task ac, notlarina mevcut task referansi ekle

### 5.1. Task Olusturma

```
backlog task create \
  "deep-audit: [{modul}] {bulgu basligi}" \
  --description "## Review Bulgusu\n\n**Kaynak:** /deep-audit {modul}\n**Agent:** {bulguyu bulan agent}\n**Dosya:** {dosya:satir}\n\n## Sorun\n{Detayli aciklama}\n\n## Etki\n{Risk seviyesi}\n\n## Onerilen Cozum\n{Nasil duzeltilmeli}\n\n## Affected Files\n{Degismesi gereken dosya listesi}" \
  --priority "{high|medium|low}" \
  -l "deep-audit,{modul},{kategori}"
```

### 5.2. Guvenlik Bulgulari Icin Oncelik Kurali

- IDOR, Injection, XSS → `priority: "high"`, label: `security`
- Race condition, transaction eksikligi → `priority: "high"`, label: `bug`
- PII sizintisi → `priority: "high"`, label: `security`
- N+1 query, performans → `priority: "medium"`, label: `performance`
- DRY ihlali, refactor → `priority: "low"`, label: `refactor`

### 5.3. Iliskili Bulgulari Gruplama

Ayni kok nedene sahip birden fazla bulgu varsa → tek task ac, notlarina tum bulgulari listele.

---

## ADIM 5.5: IDOR TARAMASI (ENTEGRE)

Bu adim Agent 1'in guvenlik bulgulariyla birlikte veya AYRI calisir. Auth/profil/odeme gibi kullaniciya ozel veri iceren moduller icin ZORUNLU.

<!-- GENERATE: IDOR_CHECKLIST
Aciklama: Bootstrap stack ve auth bilgisiyle IDOR kontrol listesini ozellestirir.
Gerekli manifest alanlari: stack.api_framework, stack.orm, stack.auth_method, project.subprojects
Bootstrap, framework-spesifik IDOR pattern'lerini uretir:
- Express + Prisma: req.user.id + prisma.where kontrolu
- NestJS + TypeORM: @User() decorator + ownership guard
- Django + Django ORM: request.user filtreleme
- Laravel + Eloquent: auth()->id() filtreleme

Ornek cikti:

### 5 Nokta IDOR Kontrol Matrisi

Her endpoint icin su 5 noktayi kontrol et:

| # | Kontrol Noktasi | Ne Araniyor |
|---|----------------|-------------|
| 1 | Parametre Erisimi | req.params.id kullanan endpoint var mi? |
| 2 | Sahiplik Filtresi | ORM sorgusunda user_id/owner_id filtresi var mi? |
| 3 | Blok Kontrolu | Engellenmis kullanicilar arasi veri paylasimi engellenmis mi? |
| 4 | Taraf Kontrolu | Islem yapan kisi yetkili mi? (admin, owner, participant) |
| 5 | Bilgi Sizintisi | Response'ta baska kullanicinin hassas verisi var mi? |
-->

### Tehlikeli Pattern'ler

**Pattern A — Ownership filtresi eksik:**
```
orm.model.findFirst({ where: { id: req.params.id } })
// user_id/owner_id filtresi OLMADAN → baska kullanicinin verisine erisim
```

**Pattern B — Toplu sorguda filtresiz listeleme:**
```
orm.model.findMany({ where: { userId: req.params.userId } })
// req.params.userId != authenticated_user.id kontrol edilmemis
```

**Pattern C — Blok kontrolu eksik:**
```
// getUserById gibi endpoint'lerde
// engellenmis kullanicilar arasinda veri paylasimi engellenmemis
```

### IDOR Rapor Formati

```
| Endpoint | HTTP | Parametre | ORM Sorgusu | Ownership | IDOR Riski |
|----------|------|-----------|-------------|-----------|-----------|
| getUser  | GET  | :id       | findFirst   | VAR       | YOK       |
| updateX  | PUT  | :id       | update      | EKSIK     | KRITIK    |
```

---

## ADIM 6: KULLANICIYA RAPOR SUN

### Tablo 1: Duzeltilen Hatalar (N fix, M dosya)

```
| #  | Seviye | Dosya                    | Fix                                        |
|----|--------|--------------------------|--------------------------------------------|
| 1  | KRITIK | controller.ts:45         | IDOR: ownership kontrolu eklendi           |
| 2  | MAJOR  | auth.service.ts:120      | Token expiry kontrolu eklendi              |
| 3  | MINOR  | screen.tsx:89            | Hata mesaji duzeltildi                     |
```

**Siralama**: KRITIK → MAJOR → MINOR

### Tablo 2: Backlog'a Eklenen Konular (N task)

```
| Task     | Oncelik | Konu                                                  |
|----------|---------|-------------------------------------------------------|
| TASK-XX  | High    | Token refresh mekanizmasi yeniden yazilmasi            |
| TASK-XX  | Medium  | ORM schema guvenlik audit'i                           |
```

### Tablo 3: Katmanlar Arasi Etki (varsa)

```
| # | Fix/Bulgu | Kaynak | Etkilenen | Etki | Durum |
|---|-----------|--------|-----------|------|-------|
| 1 | Response'a field eklendi | API | Mobil | Yeni alan parse edilebilir | Dogrulandi |
```

### Rapor Sonu

```
Dogrulama: ✅ TypeScript OK | ✅ Test OK | ✅ Self-review OK
✅ Commit: {commit_hash} — duzeltme({modul}): deep-audit — {N} fix uygulandı
⚠️ Push yapilmadi — hazir oldugunuzda push edin.
```

---

## ADIM 7: SONRAKI REVIEW ONERILERI (EN AZ 5 SENARYO)

### 7.1. Oneri Kaynagi Analizi

Onerileri su kaynaklardan turet:

**A. Zincir Etki Analizi (ADIM 3.2'den):**
- Review edilen modulun dokundugu ama review EDILMEYEN moduller

**B. Cross-Cutting Concern Oruntuleri:**
- Ayni tur bulgu (dead code, IDOR, null-check eksigi) baska modullerde de olabilir mi?

**C. Bagimsiz Modul Kesfi:**
- Review sirasinda kapsam DISINDA kalan ama ilgili dosyalar

**D. Backlog Task Yogunlugu:**
- Bu review'da acilan task'larin dolayli etkiledigi moduller

**E. Zaman Bazli Risk:**
- Uzun suredir review edilmemis moduller

### 7.2. Ihtiyac ve Fayda Degerlendirmesi

Her oneri icin iki boyutlu degerlendirme:

| Skor | Ihtiyac | Fayda |
|------|---------|-------|
| 5 | Acil — bilinen sorun isareti | Cok yuksek — guvenlik acigi bulma olasiligi yuksek |
| 4 | Yuksek — cross-cutting risk | Yuksek — birden fazla ekrani duzeltir |
| 3 | Orta — dolayli baglanti | Orta — teknik borc azaltma |
| 2 | Dusuk — genel hijyen | Dusuk — kozmetik iyilestirme |
| 1 | Opsiyonel | Minimal — sadece cleanup |

### 7.3. Oneri Tablosu

```
## Sonraki Review Onerileri

| # | Komut | Ihtiyac | Fayda | Toplam | Gerekce |
|---|-------|---------|-------|--------|---------|
| 1 | `/deep-audit bildirim` | 5 | 5 | ★★★★★ | Push akisinda sorun tespit edildi |
| 2 | `/deep-audit profil` | 4 | 4 | ★★★★ | IDOR pattern'i bulundu |
| 3 | `/deep-audit mesaj` | 4 | 3 | ★★★½ | Son degisiklikler review edilmedi |
| 4 | `/deep-audit arama` | 3 | 4 | ★★★½ | Rate limiting eksik olabilir |
| 5 | `/deep-audit odeme` | 3 | 3 | ★★★ | Odeme akisi dogrulanmali |
```

**Siralama:** Toplam skor yuksekten dusuge.

### 7.4. Oneri Kurallari

1. **EN AZ 5 oneri zorunlu**
2. **Kendini onerme** — Az once review edilen modulu tekrar onerME
3. **Gerekcede SOMUT kanit** — review sirasinda tespit edilen bulgu/pattern belirt
4. **Duplicateleri eleme** — Backlog'da zaten review task'i olan modulu oneceliklendirME

---

## DEAD CODE TESPITI VE TEMIZLIGI

### Tespit Metodolojisi

**1. Cagrilmayan Fonksiyon Tespiti:**
```
Her export edilen fonksiyon icin:
1. Grep(pattern="fonksiyonAdi", path="{subproject}/src/", output_mode="count")
2. Sonuc = 1 (sadece tanim) → ADAY
3. Sonuc > 1 → Aktif, atla
4. ADAY'lar icin dinamik cagri kontrolu (route string ref, middleware chain)
```

**2. Orphan Route Tespiti:**
```
Route dosyalarindan tum route'lari cikar.
Her route'un hedef controller fonksiyonunun var oldugunu dogrula.
Var olmayan hedef → DEAD ROUTE
```

**3. ORM Schema-Controller Uyumu:**
```
Schema'dan model alanlarini cikar.
Controller query'lerinde kullanilan alanlari izle.
Hic sorgulanmayan alan → UNQUERIED FIELD
```

### Dead Code Temizlik Kurallari

**GUVENLI TEMIZLIK (dogrudan yap):** Kullanilmayan local variable, commented-out kod, kullanilmayan import
**DIKKATLI TEMIZLIK (grep + dogrulama sonrasi):** Export'lu fonksiyon, constant
**BACKLOG'A GONDER (dogrudan YAPMA):** DB kolonlari, dosya silme, ORM schema degisikligi

---

## BELLEK SISTEMI ENTEGRASYONU

### Review Oncesi: Hatirla
Agent spawn etmeden ONCE, modulle ilgili gecmis bilgiyi topla (episodic-memory).

### Review Sonrasi: Ogrenilenleri Kaydet
Kalici bulgulari memory sistemiyle kaydet.

---

## OGRENIM KAYDI

> Is tamamlandiginda ogrenim kaydi kurallari icin bkz: `.claude/rules/memory-protocol.md`

---

## ZORUNLU KURALLAR

### Kutsal Kurallar (Her Komutta Gecerli)

1. **Codebase e config YAZMA** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` dosyalari SADECE Agentbase icinde olusturulur. Codebase icinde `.claude/` dizini olusturma, `../Codebase/CLAUDE.md` yazma YASAK.
2. **Git sadece Codebase de** — Tum git islemleri (commit, push, branch) `../Codebase/` icinde yapilir. Agentbase'de git YOKTUR.
3. **Codebase OKUNUR, config YAZILMAZ** — Proje dosyalari (`src/`, `app/`, vb.) okunabilir ve gorev gerekiyorsa duzenlenebilir. Config dosyalari (`.claude/`, `CLAUDE.md`) Codebase icinde YAZILAMAZ.

1. **ADIM 1 ATLANAMAZ** — Dosya kesfi yapilmadan agent spawn ETME.
2. **Agent'lar PARALEL spawn edilir** — Bagimsiz agent'lar tek mesajda spawn et.
3. **Iki boyutlu siniflandirma** — Her bulgu (seviye + aksiyon) ayri belirlenir.
4. **Backlog-aksiyonlu bulgular MUTLAKA task olur** — Backlog CLI ile olustur.
5. **Backlog duplicate kontrolu ZORUNLU** — Task acmadan once tara.
6. **Dogrulama kapisi ZORUNLU** — Fix sonrasi derleme + test kontrolu yapilmadan rapora gecme.
7. **Self-review kapisi** — ADIM 4'te dosya duzenlendiyse review agent calistir.
8. **False positive eleme** — Response utility formatini, mevcut guard'lari kontrol et.
9. **Fix'ler dogrulandiktan sonra COMMIT ET** — Push YAPMA.
10. **Mevcut kodu bozma** — Her duzeltme oncesi dosyayi oku, mevcut stili takip et.
11. **Dead code temizliginde YUKSEK guven gerekli** — Dinamik cagri riski olan bulgular ASLA dogrudan temizlenmez.
12. **IDOR taramasi ZORUNLU** — Kullaniciya ozel veri iceren moduller icin.

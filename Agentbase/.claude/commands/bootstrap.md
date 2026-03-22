# Bootstrap — Agentic Workflow Kurulum Sihirbazi

Bu komut projenizi analiz eder, sizinle kisa bir roportaj yapar ve tum agentic workflow yapilandirmasini olusturur. Her adim konsolda gorunur. Islem sonunda `.claude/` dizini, root dosyalar, manifest ve backlog hazir olur.

**KURAL: Bu talimatlari harfi harfine, ADIM ADIM, sirasiyla uygula. Hicbir adimi atlama, hicbir adimi birlestirme. Her adimdaki ciktilari kullaniciya goster.**

## KUTSAL KURALLAR

Bu kurallar Bootstrap'in ve urettigi tum dosyalarin temelini olusturur:

### 1. Git sadece Codebase'de calisir
- Agentbase'de `.git/` YOKTUR. Agentbase sadece bir konfigürasyon dizinidir.
- Tum git islemleri (commit, push, branch, worktree) `../Codebase/` icinde yapilir.
- Command'lardaki git komutlari: `cd ../Codebase && git ...`
- Worktree izolasyonu: `cd ../Codebase && git worktree add ...`
- Bu ayrim Codebase'in guvenli worktree izolasyonunu saglar — agent ve backlog dosyalarindan bagimsiz.

### 2. Bootstrap Codebase'e ASLA yazmaz
- Bootstrap Codebase'i OKUR → Agentbase'i YAPILANDIRIR.
- Codebase'deki hicbir dosya degistirilmez, eklenmez veya silinmez.
- Tum uretilen dosyalar Agentbase/.claude/ altina gider.
- Manifest `../Docs/agentic/` altina gider (Codebase disinda).
- Projenin mevcut .gitignore, package.json, CI config dosyalari korunur.

---

## ADIM 1 — ON KOSUL KONTROLLERI

Asagidaki kontrolleri SIRAYLA yap. Herhangi biri basarisiz olursa DUR, devam etme.

### 1.0 Izin Modu Onerisi

Bootstrap cok sayida dosya olusturma, dizin yaratma ve backlog islemleri yapacak. Her bir islem icin izin sormak sureci yavaslatir. Kullaniciya su oneriyi goster:

```
💡 Bootstrap cok sayida dosya islemi yapacak.
   Sureci hizlandirmak icin --bypass-permissions ile calistirmanizi oneriyoruz.

   Mevcut oturumda bypass aktif mi kontrol edin.
   Degilse bu oturumu kapatip su komutla yeniden baslatabilirsiniz:
     claude --bypass-permissions

   Devam etmek icin Enter'a basin >
```

> Bu bir ONERI — zorunluluk degil. Kullanici devam etmek isterse bypass olmadan da calisir.

### 1.1 Backlog CLI Kontrolu

Bash ile calistir: `which backlog`

- **Bulunamazsa** → Kullaniciya su mesaji goster ve KOMPLE DUR, hicbir adima devam etme:

```
❌ Backlog.md CLI kurulu degil. Bu workflow Backlog.md olmadan calismaz.

Kurulum secenekleri:
  npm i -g backlog.md
  veya
  brew install backlog-md

Kurduktan sonra /bootstrap komutunu tekrar calistirin.
```

- **Bulunursa** → `✅ Backlog CLI bulundu` yazdir ve devam et.

### 1.2 Codebase Kontrolu

`../Codebase/` dizinini kontrol et (Agentbase'e gore goreceli yol).

Bash ile calistir: `ls ../Codebase/ 2>/dev/null | head -5`

- **Dizin yoksa** → Kullaniciya su mesaji goster ve KOMPLE DUR:

```
❌ Codebase/ dizini bulunamadi.
Projenizi bu dizine koyun veya sembolik link olusturun:

  ln -s /path/to/your/project ../Codebase

Ardindan /bootstrap komutunu tekrar calistirin.
```

- **Dizin var ama bos** → Greenfield moduna gec. Kullaniciya sor:

```
📦 Codebase/ dizini bos. Sifirdan yeni bir proje mi basliyorsunuz?
   a) Evet — greenfield modunda devam et (stack ve proje bilgileri roportajda sorulacak)
   b) Hayir — once projeyi Codebase/ dizinine koyacagim

>
```

  - **a secilirse** → `GREENFIELD_MODE = true` olarak kaydet. `✅ Greenfield modu aktif` yazdir ve devam et.
  - **b secilirse** → KOMPLE DUR (mevcut davranis).

- **Dosyalar varsa** → `GREENFIELD_MODE = false`. `✅ Codebase bulundu` yazdir, bulunan ust-duzey dosya/klasorleri listele ve devam et.

### 1.3 Onceki Bootstrap Kontrolu

`../Docs/agentic/project-manifest.yaml` dosyasinin varligini kontrol et.

- **Dosya varsa**:

  1. Mevcut manifesti oku.
  2. `manifest.version` alanini kontrol et. Beklenen major surum `1` kabul edilir.
  3. Uyumluluk kararini ver:
     - major ayniysa → `UYUMLU` (`merge` ve `incremental` kullanilabilir)
     - major farkliysa veya alan yoksa → `UYUMSUZ` (yalnizca `overwrite` veya iptal)
  4. Bootstrap-yonetimli dosyalarda yerel degisiklik var mi kontrol et. Yonetilen kapsam:
     - `.claude/commands/`
     - `.claude/agents/`
     - `.claude/hooks/`
     - `.claude/rules/`
     - Agentbase root'unda bootstrap'in urettigi dosyalar (`CLAUDE.md`, `.mcp.json`, `.claude-ignore`, `PROJECT.md`, `STACK.md`, `DEVELOPER.md`, `ARCHITECTURE.md`, `WORKFLOWS.md`)
  5. Her yonetilen dosya icin manifestteki checksum ile mevcut dosyayi karsilastir:
     - eslesiyorsa → Bootstrap-yonetimli ve temiz
     - eslesmiyorsa → kullanici customization'i olarak isaretle
     - dosya `.claude/custom/` altindaysa → her zaman kullaniciya ait kabul et ve dokunma
  6. Kullaniciya su menuyu goster:

```
⚠️  Daha once Bootstrap calistirilmis.
Manifest surumu: [mevcut veya yok] (beklenen major: 1) → [UYUMLU/UYUMSUZ]
Template surumu: [manifest.template_version veya bilinmiyor]
Yerel customization: [yok | dosya listesi]

Yeniden calistirma modu secin:
  1) overwrite   — Bootstrap-yonetimli dosyalari sifirdan uret; `.claude/custom/`, `reports/`, `tracking/` korunur
  2) merge       — Manifest farklarini birlestir; yeni modulleri ekle; artik tespit edilmeyen modulleri pasife al; sadece etkilenen dosyalari guncelle
  3) incremental — Sadece girdisi veya template'i degisen dosyalari guncelle
  4) iptal

Secim: [1/2/3/4]
```

  7. `UYUMSUZ` ise `merge` ve `incremental` seceneklerini sunma; kullanici sadece `overwrite` veya `iptal` secsin.
  8. `overwrite` secilirse:
     - checksum farki olan her yonetilen dosyayi yazmadan once `.claude/custom/_rescued/[timestamp]/` altina kopyala
     - sonra bootstrap-yonetimli dosyalari sifirdan uret
  9. `merge` secilirse:
     - onceki manifestteki interview cevaplarini koru
     - yeni codebase analizinden gelen ek modulleri/alanlari ekle
     - artik tespit edilmeyen leaf'leri `modules.skipped` altina tasi
     - checksum farki olan dosyayi yerinde ezme; yeni icerigi `.claude/custom/_rescued/[timestamp]/candidate/` altina yaz ve kullaniciya raporla
  10. `incremental` secilirse:
      - sadece template checksum'u veya ilgili manifest girdisi degisen dosyalari yeniden uret
      - checksum farki olan dosyayi yerinde ezme; yeni icerigi `.claude/custom/_rescued/[timestamp]/candidate/` altina yaz ve kullaniciya raporla
  11. `iptal` secilirse → DUR.

- **Dosya yoksa** → Sessizce devam et.

Tum kontroller basarili oldugunda:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Bootstrap baslatiliyor...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ADIM 2 — CODEBASE ANALIZI (Otomatik)

> **GREENFIELD_MODE = true ise** bu adimin tamamini atla. Asagidaki mesaji goster ve dogrudan ADIM 3'e gec:
>
> ```
> 🌱 Greenfield modu — otomatik codebase analizi atlanıyor.
>    Tum proje bilgileri roportajda sorulacak.
> ```

`../Codebase/` dizinini tarayarak proje hakkinda mumkun olan her seyi otomatik tespit et. Her alt adimin sonucunu bir degiskende tut — roportajda ve manifest'te kullanilacak.

Her alt adimi yaptiginda konsolda sonuclari goster.

### 2.1 Proje Tipi Tespiti

`../Codebase/` dizininde asagidaki dosyalari ara:

| Dosya | Proje Tipi | Detay Kontrolu |
|-------|-----------|----------------|
| `package.json` | Node.js | `dependencies`/`devDependencies` icinde: express→Express API, fastify→Fastify API, next→Next.js, `expo`→Expo, `react-native`→React Native, react→React SPA, vue→Vue, svelte→Svelte |
| `package.json` icinde `workspaces` alani | Monorepo | npm/yarn workspaces |
| `lerna.json` | Monorepo | Lerna |
| `turbo.json` veya `nx.json` | Monorepo | Turbo/Nx |
| `composer.json` | PHP | `require` icinde: laravel→Laravel, codeigniter→CodeIgniter |
| `go.mod` | Go | — |
| `Cargo.toml` | Rust | — |
| `requirements.txt` veya `pyproject.toml` | Python | django→Django, fastapi→FastAPI, flask→Flask |
| `pom.xml` | Java | — |
| `build.gradle` veya `build.gradle.kts` | Kotlin/Java | — |

Monorepo tespiti icin ek kontrol: Root'ta birden fazla alt dizin kendi `package.json` veya `composer.json` dosyasina sahipse → monorepo olarak isaretle.

Monorepo ise her alt projeyi (subproject) ayri ayri analiz et — her birinin adi, yolu, tipi ve stack'i.

Sonucu goster:

```
📦 Proje Tipi: [tespit edilen tip]
   Alt projeler: [varsa listele]
```

### 2.2 Dizin Haritasi

Bash ile `../Codebase/` icinde 3 seviye derinlige kadar dizin agacini olustur.

Ozel olarak tespit et:
- Kaynak dizinleri: `src/`, `app/`, `lib/`, `source/`, `pkg/`
- Test dizinleri: `test/`, `tests/`, `__tests__/`, `spec/`, `cypress/`
- Config dizinleri: `config/`, `.config/`
- Docs dizinleri: `docs/`, `documentation/`

Sonucu goster:

```
📁 Dizin Yapisi:
   [tree ciktisi]

   Kaynak dizinleri: [bulunanlar]
   Test dizinleri: [bulunanlar]
```

### 2.3 Tech Stack Tespiti

Asagidaki her bir bileseni dosya varligina gore tespit et:

**Paket Yoneticisi:**
| Dosya | Yonetici |
|-------|----------|
| `pnpm-lock.yaml` | pnpm |
| `yarn.lock` | yarn |
| `bun.lockb` veya `bun.lock` | bun |
| `package-lock.json` | npm |
| `composer.lock` | composer |
| `Pipfile.lock` veya `poetry.lock` | pip/poetry |
| `Cargo.lock` | cargo |
| `go.sum` | go modules |

**TypeScript:** `tsconfig.json` dosyasi varsa → TypeScript aktif.

**Test Framework:**
- `jest.config.*` veya package.json icinde `jest` → Jest
- `vitest.config.*` veya package.json icinde `vitest` → Vitest
- `mocha` bagimliligi → Mocha
- `pytest.ini` veya `conftest.py` → pytest
- `phpunit.xml` → PHPUnit

**Linter/Formatter:**
- `eslint.config.*` veya `.eslintrc*` → ESLint
- `.prettierrc*` veya `prettier.config.*` → Prettier
- `biome.json` → Biome
- `ruff.toml` veya `pyproject.toml` icinde `[tool.ruff]` → Ruff

**ORM/Database:**
- `prisma/schema.prisma` → Prisma
- `typeorm` bagimliligi → TypeORM
- `sequelize` bagimliligi → Sequelize
- `drizzle.config.*` → Drizzle
- `eloquent` (Laravel icinde) → Eloquent

**Database:** package.json veya config dosyalarinda: mysql, pg/postgres, sqlite3, mongodb/mongoose

**CI/CD:**
- `.github/workflows/` dizini → GitHub Actions
- `.gitlab-ci.yml` → GitLab CI
- `Jenkinsfile` → Jenkins
- `.circleci/` → CircleCI

**Container:**
- `Dockerfile` → Docker
- `docker-compose.yml` veya `docker-compose.yaml` veya `compose.yml` → Docker Compose

Sonucu tablo olarak goster:

```
🔧 Tech Stack:
   Runtime:        [tespit edilen]
   Paket Yonetici: [tespit edilen]
   TypeScript:     [evet/hayir]
   Test:           [tespit edilen]
   Linter:         [tespit edilen]
   Formatter:      [tespit edilen]
   ORM:            [tespit edilen]
   Veritabani:     [tespit edilen]
   CI/CD:          [tespit edilen]
   Container:      [tespit edilen]
```

### 2.4 Modul Tespiti

Moduller kategori bazli organize edilmistir. Tespit recursive yapilir:

1. **Kategori seviyesi:** `templates/modules/*/detect.md` — kategori aktif mi? (orm, deploy, backend, mobile, frontend)
2. **Ara dugum / aile seviyesi:** `templates/modules/*/*/detect.md` — gerekiyorsa aile veya runtime secimi (ornegin `backend/nodejs`)
3. **Leaf seviyesi:** `templates/modules/**/*/detect.md` — nihai teknoloji secimi (ornegin `backend/nodejs/express`)

#### detect.md Yapisal Formati

Tum detect.md dosyalari asagidaki yapisal formati kullanir. Bu format hem Claude tarafindan okunabilir hem de ileride programatik islemeye uygundur.

**Leaf / Standalone / Aile detect.md:**

```markdown
# [Modul Adi]

## Checks
- file_exists: prisma/schema.prisma
- dependency: @prisma/client | prisma
- env_var: DATABASE_URL

## Minimum Match
2/3

## Activates
- hooks/prisma-db-push-guard.js (PreToolUse Bash)
- rules/prisma-rules.md

## Affects Core
- task-hunter: VERIFICATION_COMMANDS'a prisma validate eklenir
- settings.json: 3 hook tanimi eklenir
```

**Kategori detect.md (alt varyantlari olan):**

```markdown
# [Kategori Adi]

## Variants
| Name | Path | Priority |
|------|------|----------|
| Prisma | orm/prisma/detect.md | 1 |
| Eloquent | orm/eloquent/detect.md | 2 |

## Provides
- Tum varyantlarda ortak ozellikler listesi

## Affects Core
- ...
```

**Desteklenen check tipleri:**

| Tip | Syntax | Aciklama |
|-----|--------|----------|
| `file_exists` | `file_exists: path/to/file` | Dosya veya dizin mevcut mu. `\|` ile alternatif yollar, `*/` ile wildcard |
| `dependency` | `dependency: pkg-name` | Package dependency mevcut mu (package.json, composer.json, requirements.txt, pyproject.toml, pubspec.yaml). `\|` ile alternatif paketler |
| `env_var` | `env_var: VAR_NAME` | .env veya config dosyasinda tanimli mi |
| `file_pattern` | `file_pattern: **/*.controller.ts` | Glob pattern ile dosya eslesmesi |
| `code_pattern` | `code_pattern: express() \| Router()` | Kod icinde regex/metin eslesmesi |
| `config_key` | `config_key: package.json -> workspaces` | Config dosyasinda belirli bir key var mi |
| `not_dependency` | `not_dependency: next` | Paketin dependency'lerde OLMAMASI gerektigi (negatif kontrol) |

**Minimum Match formati:** `X/Y` — Y kontrol icinden minimum X'inin saglanmasi gerekir. Standalone moduller icin `1/N` (herhangi 1 yeterli) kullanilir.

**Tespit akisi:**

```
templates/modules/ altindaki her dizin icin:
  detect.md'yi oku ve Checks bolumunu isle

  EGER dizin bagimsiz modul ise (= monorepo, security gibi kendi commands/hooks/rules klasorleri var):
    Checks kosullarini kontrol et -> ACTIVE veya INACTIVE

  AKSI HALDE (= kategori veya ara dugum):
    Checks bolumu varsa kosullari kontrol et (yoksa Variants tablosu ile devam)

    EGER tespit gecmezse:
      Bu dugum ve altindaki tum leaf'ler INACTIVE

    EGER tespit gecer ve alt dugum yoksa:
      Mevcut dugum aktif leaf kabul edilir

    EGER tespit gecer ve alt dugum varsa:
      Variants tablosundaki oncelik sirasina gore alt dugumleri kontrol et
      Ilk eslesen alt dugume in
      Daha derin leaf eslesirse aktif yol olarak kaydet
      Eslesmeyen kardes dugumleri SKIPPED olarak kaydet
```

**Kategoriler ve leaf yollari:**

**orm kategorisi:**
- Kategori kosulu: Herhangi bir ORM/migration aracinin tespiti
- Alt varyantlar:
  - `prisma` — `prisma/schema.prisma` MEVCUT VE `@prisma/client` bagimliliklarda
  - `eloquent` — `composer.json` MEVCUT VE `laravel/framework` bagimliliklarda
  - `django-orm` — `manage.py` MEVCUT VE `django` bagimliliklarda
  - `typeorm` — `typeorm` bagimliliklarda VE config dosyasi mevcut

**deploy kategorisi:**
- Kategori kosulu: Deploy ile ilgili dosya/config tespiti
- Leaf'ler:
  - `docker` — `Dockerfile` MEVCUT
  - `coolify` — `Dockerfile` + Coolify config veya etiketleri mevcut
  - `vercel` — `vercel.json` MEVCUT VEYA `next` bagimliliklarda

**backend kategorisi:**
- Kategori kosulu: Backend framework tespiti
- Aileler ve leaf'ler:
  - `nodejs`
    - `nestjs` — `@nestjs/core` bagimliliklarda
    - `fastify` — `fastify` bagimliliklarda
    - `express` — `express` bagimliliklarda
  - `php`
    - `laravel` — `composer.json` icinde `laravel/framework`
    - `codeigniter4` — `composer.json` icinde `codeigniter4/framework`
  - `python`
    - `django` — `manage.py` MEVCUT VE `django` bagimliliklarda
    - `fastapi` — `fastapi` bagimliliklarda

**mobile kategorisi:**
- Kategori kosulu: Mobil framework tespiti
- Leaf'ler:
  - `expo` — `app.json` veya `app.config.js` icinde expo config VE `expo` bagimliligi
  - `react-native` — `react-native` bagimliliklarda VE expo config YOKSA
  - `flutter` — `pubspec.yaml` MEVCUT VE `flutter` dependency'si tespit ediliyorsa

**frontend kategorisi:**
- Kategori kosulu: Frontend meta-framework tespiti
- Leaf'ler:
  - `nextjs` — `next` bagimliliklarda VE `next.config.*` dosyasi mevcut
  - `react` — `react` ve `react-dom` bagimliliklarda VE `next` YOKSA
  - `html` — `.html` dosyalari mevcut VE framework tespiti yoksa

**ci-cd kategorisi:**
- Kategori kosulu: CI/CD pipeline dosya/config tespiti
- Leaf'ler:
  - `github-actions` — `.github/workflows/` dizini VE workflow YAML dosyalari mevcut
  - `gitlab-ci` — `.gitlab-ci.yml` MEVCUT

**monitoring kategorisi:**
- Kategori kosulu: Hata takibi / performans izleme SDK tespiti
- Leaf'ler:
  - `sentry` — `@sentry/*` bagimliliklarda VE `SENTRY_DSN` env var tanimli
  - `datadog` — `dd-trace` veya `@datadog/*` bagimliliklarda

**api-docs kategorisi:**
- Kategori kosulu: API dokumantasyon araclari tespiti
- Leaf'ler:
  - `openapi` — `openapi.yaml` / `swagger.yaml` dosyasi MEVCUT VEYA swagger dependency'si var
  - `graphql` — `schema.graphql` MEVCUT VEYA `graphql` bagimliliklarda

**Bagimsiz moduller (kategori degil):**

**monorepo modulu:**
- Kosul: `workspaces` alani VEYA `lerna.json` VEYA `turbo.json` VEYA `nx.json` MEVCUT
- Durum: ACTIVE veya INACTIVE

**security modulu:**
- Kosul: API controller veya route dosyalari mevcut (ornegin `controllers/`, `routes/` dizinleri)
- Durum: ACTIVE veya INACTIVE

**Monorepo subproject-bazli tespit (project.type == "monorepo"):**

Monorepo tespit edildiginde modul tespiti IKI asamali calisir:

1. **Subproject-bazli tespit:** Her `project.subprojects[]` icin modul tespitini AYRI calistir.
   - Tespit kontexti subproject'in root dizinine (`path`) odaklanir
   - Ornegin `apps/api/` icinde `express` + `prisma` tespiti, `apps/admin/` icinde `django` + `django-orm` tespiti
   - Her subproject'in sonucu `subproject.modules` alanina yazilir

2. **Global aggregation:** Tum subproject modullerin UNION'ini `modules.active`'e yaz.
   - Birden fazla subproject ayni kategoriyi farkli leaf ile kullanabilir
   - Ornegin: `active.orm: ["prisma", "django-orm"]`, `active.backend: ["nodejs/express", "python/django"]`
   - Bu sayede teammate'ler TUM gerekli modul dosyalarini uretir

3. **Deploy ve standalone moduller:** Bunlar subproject-bazli DEGIL, proje genelinde tespit edilir (deploy config ve monorepo/security kosullari projenin tamami icin gecerlidir).

Ornek cikti (Express+Prisma API + Django Admin monorepo):

```
🧩 Moduller (Subproject Bazli):

   apps/api (API):
     orm:      prisma ✅
     backend:  nodejs/express ✅
     mobile:   INACTIVE ⬜
     frontend: INACTIVE ⬜

   apps/admin (Admin):
     orm:      django-orm ✅
     backend:  python/django ✅
     mobile:   INACTIVE ⬜
     frontend: INACTIVE ⬜

   apps/mobile (Mobile):
     orm:      INACTIVE ⬜
     backend:  INACTIVE ⬜
     mobile:   expo ✅
     frontend: INACTIVE ⬜

   Global (aggregation):
     orm:      [prisma, django-orm] ✅
     deploy:   docker ✅
     backend:  [nodejs/express, python/django] ✅
     mobile:   expo ✅
     frontend: INACTIVE ⬜

   Bagimsiz:
     monorepo: ACTIVE ✅
     security: ACTIVE ✅

   Atlanan varyantlar: orm: [eloquent, typeorm], backend: [nodejs/fastify, php/laravel], ...
```

**Single proje (project.type == "single"):**

Mevcut davranista degisiklik yok. Sonucu goster:

```
🧩 Moduller:

   Kategoriler:
   orm:        [eslesen varyant ✅ / INACTIVE ⬜]
   deploy:     [eslesen varyant ✅ / INACTIVE ⬜]
   backend:    [nodejs/express gibi aktif yol ✅ / INACTIVE ⬜]
   mobile:     [eslesen varyant ✅ / INACTIVE ⬜]
   frontend:   [eslesen varyant ✅ / INACTIVE ⬜]

   Bagimsiz:
   monorepo:   INACTIVE ⬜
   security:   [ACTIVE ✅ / INACTIVE ⬜]

   Atlanan varyantlar: [kategori bazinda listelenen inaktif varyantlar]
```

### 2.5 Script Tespiti

**package.json scripts:** Root ve her alt projenin package.json icindeki `scripts` bolumunu oku. Ozellikle: `dev`, `build`, `test`, `lint`, `start`, `format`, `typecheck`, `migrate`

**Makefile:** Root'ta `Makefile` varsa hedefleri listele.

Sonucu goster:

```
📜 Tespit Edilen Scriptler:
   [proje adi]:
     dev:   [komut]
     build: [komut]
     test:  [komut]
     lint:  [komut]
```

### 2.6 Analiz Ozeti

Tum sonuclari bir ozet halinde goster:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Codebase Analiz Sonucu
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Proje Tipi:    [tip]
Runtime:       [runtime]
Alt Projeler:  [sayi]
Aktif Moduller:[liste]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Simdi eksik bilgileri tamamlamak icin kisa bir roportaj yapacagim.
Her seferinde tek soru soracagim.
```

---

## ADIM 3 — FAZLI ROPORTAJ

**KURALLAR:**
1. Her seferinde SADECE BIR soru sor.
2. Onceki adimda tespit edilen bilgiyi once goster — kullanici onaylarsa veya duzeltirse devam et.
3. Tespit edilip dogrulama gerektirmeyen sorulari atla.
4. Mumkun olan her yerde coktan secmeli (a/b/c/d) format kullan.
5. Kullanicinin cevabini al, kaydet, sonraki soruya gec.
6. Her fazin basinda faz basligini goster.

Eger `templates/interview/phase-{N}-*.md` dosyalari mevcutsa onlari oku ve soru sablonlarini oradan al. Mevcut degilse asagidaki varsayilan sorulari kullan.

### Faz 1 — Proje Temelleri
*Bu faz PROJECT.md ve ARCHITECTURE.md icin veri toplar.*

> **GREENFIELD_MODE = true ise** otomatik tespit sonuclari yok. Bu fazda S0 (stack secimi) ek sorusu sorulur ve tum sorular (S2, S3 dahil) skip condition'siz sorulur.

**S0 (SADECE GREENFIELD_MODE — stack secimi):**
```
━━━ Faz 1/4: Proje Temelleri (Greenfield) ━━━

S0: Hangi teknoloji stack'ini kullanacaksiniz?
    a) Node.js (Express/Fastify/Next.js/Expo)
    b) Python (Django/FastAPI/Flask)
    c) PHP (Laravel/CodeIgniter)
    d) Go
    e) Rust
    f) Java/Kotlin
    g) Diger: ___

    Birden fazla secebilirsiniz (orn: a,c)

>
```

S0 cevabina gore:
- `manifest.stack.primary` ve `manifest.stack.detected` doldurulur.
- Sonraki sorulardaki "[Tespit edilen: ...]" ipuclari bos birakilir.

**S1 (her zaman sor):**
```
━━━ Faz 1/4: Proje Temelleri ━━━

S1: Bu projeyi kisaca tanimlar misiniz?
    (Ne yapar, kimin icin, temel amaci nedir?)

>
```

**S2 (ortamlar — greenfield'da da sor, skip condition yok):**
```
S2: Projenin calisma ortamlari nelerdir?
    a) Sadece local
    b) Local + staging
    c) Local + production
    d) Local + staging + production

    [Tespit edilen: production URL varsa belirt]

    Production URL (varsa):
>
```

**S3 (deploy — greenfield'da da sor, skip condition yok):**
```
S3: Deploy yonteminiz nedir?
    a) Manuel (SSH/FTP)
    b) CI/CD (GitHub Actions, GitLab CI vb.)
    c) Platform (Vercel, Netlify, Railway vb.)
    d) Container (Docker + Coolify/Portainer vb.)
    e) Henuz deploy yok

>
```

**S4 (alt proje rolleri — sadece monorepo ise sor):**
```
S4: Alt projelerin rollerini dogrulayalim:
    [Tespit edilen alt projeler ve tahmin edilen roller]

    Duzeltme veya ekleme var mi? (tamam/duzelt)
>
```

**S5 (API prefix — sadece API tespit edildiyse veya S0'da secildiyse sor):**
```
S5: API prefix'iniz nedir?
    a) /api
    b) /api/v1
    c) /v1
    d) Prefix yok
    e) Diger: ___

    [Tespit edilen: route dosyalarindan tahmin]
>
```

### Faz 2 — Teknik Tercihler
*Bu faz STACK.md ve WORKFLOWS.md icin veri toplar.*

**S1 (test stratejisi):**
```
━━━ Faz 2/4: Teknik Tercihler ━━━

S1: Test stratejiniz nedir?
    a) TDD — once test, sonra kod
    b) Testler var — feature sonrasi test yaziliyor
    c) Minimal — kritik yerler icin test
    d) Test yok

    [Tespit edilen test framework: ...]
>
```

**S2 (branch modeli):**
```
S2: Git branch modeliniz nedir?
    a) Direct push — main/master'a direkt push
    b) Feature branch + PR
    c) GitFlow (develop/release/hotfix)
    d) Trunk-based (kisa omurlu branch'ler)

>
```

**S3 (commit convention):**
```
S3: Commit mesaj konvansiyonunuz?
    a) Conventional Commits (feat:, fix:, refactor: vb.)
    b) Serbest format
    c) Ozel format (aciklayiniz)

>
```

**S4 (migration stratejisi — sadece DB tespit edildiyse sor):**
```
S4: Veritabani migration stratejiniz?
    a) ORM migration (Prisma migrate, Eloquent migrate vb.)
    b) Manuel SQL dosyalari
    c) Henuz migration sistemi yok

    [Tespit edilen ORM: ...]
>
```

**S5 (format hook — sadece formatter tespit edildiyse sor):**
```
S5: Commit oncesi otomatik format hook istiyor musunuz?
    a) Evet — her commit'te otomatik formatla
    b) Hayir — manuel calistiracagim

    [Tespit edilen formatter: ...]
>
```

**S6 (authentication tipi):**
```
S6: Projede authentication var mi? Hangi yontem?
    a) JWT (token-based)
    b) OAuth2 (Google, GitHub, vb.)
    c) Session-based
    d) API key
    e) Yok / henuz planlanmadi

>
```

→ Manifest: `stack.auth_method` alanina yaz (`jwt`, `oauth2`, `session`, `api-key`, `none`).
→ code-review agent checklist'ine auth-spesifik kontroller eklenecek.

### Faz 3 — Gelistirici Profili
*Bu faz DEVELOPER.md icin veri toplar.*

**S1 (deneyim seviyesi):**
```
━━━ Faz 3/4: Gelistirici Profili ━━━

S1: Bu projenin tech stack'indeki deneyim seviyeniz?
    a) Junior — ogrenme asamasindayim, detayli aciklama isterim
    b) Mid — temel bilgiler var, karmasik konularda rehberlik isterim
    c) Senior — deneyimliyim, kisa ve oz yanitlar yeterli
    d) Stack'e yeniyim — baska stack'lerde deneyimliyim ama bu stack yeni

>
```

**S2 (iletisim dili):**
```
S2: Claude ile iletisim diliniz?
    a) Turkce
    b) English
    c) Diger (belirtiniz)

>
```

**S3 (otonomi seviyesi):**
```
S3: Claude'un otonomi seviyesi ne olsun?
    a) Her adimda sor — her islemden once onay al
    b) Planla ve uygula — plani goster, onay al, sonra otonom calis
    c) Tam otonom — direkt yap, sadece sonuc bildir

>
```

**S4 (calisma modu):**
```
S4: Projede tek mi calisiyorsun, ekip mi?
    a) Solo — tek gelistirici
    b) Kucuk ekip (2-4 kisi)
    c) Buyuk ekip (5+ kisi)

>
```

→ Manifest: `project.team_size` alanina yaz (`solo`, `small-team`, `large-team`).
→ WORKFLOWS.md review surecini etkiler (solo: opsiyonel, kucuk ekip: onerilen, buyuk ekip: zorunlu PR).

### Faz 4 — Domain Kurallari
*Bu faz rules/ dosyalari icin veri toplar.*

**S1 (yasakli komutlar):**
```
━━━ Faz 4/4: Domain Kurallari ━━━

S1: Yasaklanmasi gereken komut veya pattern var mi?
    (Ornek: "git push --force", "DROP TABLE", "rm -rf /")

    Virgul ile ayirarak yazin veya "yok" deyin:
>
```

**S2 (design system — sadece UI framework tespit edildiyse sor):**
```
S2: Kullandiginiz tasarim sistemi / component kutuphanesi?
    a) Material UI / MUI
    b) Ant Design
    c) Shadcn/ui
    d) React Native Paper
    e) Tailwind UI
    f) Ozel component kutuphanesi
    g) Yok / belirli bir sey kullanmiyorum

    [Tespit edilen: ...]
>
```

**S3 (domain kurallari):**
```
S3: Projeye ozel kurallar var mi?
    (Ornek: "API response formati her zaman {status, message, data} olsun",
     "Tum componentlerde tema renkleri kullanilsin", "Log seviyesi: info")

    Her kurali ayri satirda yazin veya "yok" deyin:
>
```

**S4 (guvenlik oncelik seviyesi):**
```
S4: Projenin guvenlik oncelik seviyesi nedir?
    a) Standart — genel web uygulamasi
    b) Yuksek — finans, saglik, kisisel veri (KVKK/GDPR)
    c) Kritik — odeme isleme, devlet sistemleri

>
```

→ Manifest: `project.security_level` alanina yaz (`standard`, `high`, `critical`).
→ task-hunter Dual-Pass modifier'i etkiler (high/critical = AKTIF).
→ Guvenlik hook'lari ve pre-commit taramasi seviyesini belirler.

**S5 (ek notlar):**
```
S5: Eklemek istediginiz baska bir sey var mi?
    (Herhangi bir kural, not, tercih)

    Yazin veya "yok/gecis" deyin:
>
```

Roportaj tamamlaninca:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Roportaj tamamlandi!
   Simdi manifest olusturuyorum...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ADIM 4 — MANIFEST OLUSTURMA

Toplanan tum verileri birlestirerek `../Docs/agentic/project-manifest.yaml` dosyasini olustur.

Onemli: Once `../Docs/agentic/` dizininin var oldugundan emin ol, yoksa olustur.

### Manifest Yapisi

Asagidaki YAML sablonunu doldur. Bos kalan alanlara `null` yaz, bilinmeyen alanlari tamamen kaldir.

```yaml
manifest:
  version: "1.0.0"
  template_version: "1.0.0"
  generated_at: "[tarih-saat]"
  generation_mode: "[fresh|overwrite|merge|incremental]"
  managed_files:
    - path: ".claude/commands/task-hunter.md"
      checksum: "sha256:[dosya-ozeti]"

project:
  name: "[proje adi]"
  description: "[S1 cevabindan]"
  type: "[single|monorepo]"
  language: "[ana dil]"
  team_size: "[solo|small-team|large-team]"
  security_level: "[standard|high|critical]"
  subprojects:
    - name: "[alt proje adi]"
      path: "[goreceli yol]"
      role: "[api|mobile|web|admin|worker|shared|legacy]"
      stack: "[kisa stack tanimi]"
      test_command: "[test komutu]"
      build_command: "[build komutu]"
      dev_command: "[dev komutu]"
      modules:                                            # subproject-bazli modul tespiti (monorepo)
        orm: "[eslesen leaf yolu veya null]"
        backend: "[eslesen leaf yolu veya null]"
        frontend: "[eslesen leaf yolu veya null]"
        mobile: "[eslesen leaf yolu veya null]"

stack:
  runtime: "[node|python|go|rust|php|java]"
  runtime_version: "[versiyon — tespit edilebildiyse]"
  package_manager: "[npm|yarn|pnpm|bun|composer|pip|cargo]"
  typescript: [true|false]
  test_framework: "[jest|vitest|mocha|pytest|phpunit|null]"
  formatter: "[prettier|biome|ruff|null]"
  linter: "[eslint|biome|ruff|null]"
  orm: "[prisma|typeorm|sequelize|drizzle|eloquent|null]"
  database: "[mysql|postgres|sqlite|mongodb|null]"
  auth_method: "[jwt|oauth2|session|api-key|none]"

environments:
  - name: "local"
    api_url: "[local url]"
  - name: "staging"
    api_url: "[staging url — varsa]"
  - name: "production"
    api_url: "[production url — varsa]"
    deploy_platform: "[platform]"
    deploy_trigger: "[tetikleyici]"

developer:
  experience: "[junior|mid|senior|new-to-stack]"
  autonomy: "[ask-every-step|plan-then-auto|full-auto]"

workflows:
  branch_model: "[direct-push|feature-pr|gitflow|trunk]"
  commit_convention: "[conventional|free|custom]"
  commit_prefix_map:
    feat: "Yeni ozellik"
    fix: "Hata duzeltme"
    refactor: "Yeniden yapilandirma"
    docs: "Dokumantasyon"
    test: "Test"
    chore: "Bakim"
    style: "Stil/format"
    perf: "Performans"
    ci: "CI/CD"
  test_strategy: "[tdd|tests-exist|minimal|none]"
  auto_format_hook: [true|false]
  migration_strategy: "[orm|manual-sql|none|null]"

modules:
  # Single proje: Her kategori tek bir leaf secer.
  # Monorepo: Tum subproject.modules degerlerinin UNION'i. Ornegin api/ prisma + admin/ django-orm
  # kullaniyorsa active.orm: [prisma, django-orm] olur. Bu sekilde tum gerekli modul dosyalari uretilir.
  active:
    orm: "[leaf veya leaf listesi]"                 # single: "prisma", monorepo: ["prisma", "django-orm"]
    deploy: "[leaf veya leaf listesi]"              # ornek: "docker"
    backend: "[leaf veya leaf listesi]"             # single: "nodejs/express", monorepo: ["nodejs/express", "python/django"]
    mobile: "[leaf veya leaf listesi]"              # ornek: "expo"
    frontend: "[leaf veya leaf listesi]"            # ornek: "nextjs"
    ci-cd: "[leaf veya leaf listesi veya null]"      # ornek: "github-actions"
    monitoring: "[leaf veya leaf listesi veya null]"  # ornek: "sentry"
    api-docs: "[leaf veya leaf listesi veya null]"   # ornek: "openapi"
  standalone: ["[aktif bagimsiz moduller]"]          # ornek: [monorepo, security]
  skipped:
    orm: ["[eslesmemis leaf'ler]"]                  # ornek: [eloquent, typeorm]
    deploy: ["[eslesmemis leaf'ler]"]               # ornek: [vercel]
    backend: ["[eslesmemis leaf yollari]"]          # ornek: [nodejs/fastify, php/laravel]
    mobile: ["[eslesmemis leaf'ler]"]               # ornek: [react-native]
    frontend: ["[eslesmemis leaf'ler]"]             # ornek: [react]
    ci-cd: ["[eslesmemis leaf'ler]"]                # ornek: [gitlab-ci]
    monitoring: ["[eslesmemis leaf'ler]"]            # ornek: [datadog]
    api-docs: ["[eslesmemis leaf'ler]"]             # ornek: [graphql]

rules:
  forbidden:
    - command: "[yasakli komut]"
      reason: "[sebep]"
      hook_type: "pre-commit"
  domain:
    - name: "[kural adi]"
      rule: "[kural aciklamasi]"
  design_system: "[kullanilan UI kutuphanesi veya null]"
```

Uyumluluk kurali:

- `manifest.version` major surumu beklenen major ile ayniysa `merge` ve `incremental` desteklenir.
- `manifest.version` yoksa veya major farkliysa manifest uyumsuz kabul edilir; yalnizca `overwrite` veya iptal sunulur.
- Ayni major icinde eksik alanlar varsa default degerleri doldur, manifesti yeni surume yukselt ve devam et.

#### Ornek: Monorepo Coklu Stack Senaryosu

Express+Prisma API ve Django Admin iceren bir monorepo icin manifest ornegi:

```yaml
project:
  name: "acme-platform"
  type: "monorepo"
  language: "TypeScript + Python"
  subprojects:
    - name: "api"
      path: "apps/api"
      role: "api"
      stack: "Node.js + Express + Prisma + PostgreSQL"
      test_command: "cd apps/api && npm test"
      build_command: "cd apps/api && npx tsc --noEmit"
      dev_command: "cd apps/api && npm run dev"
      modules:
        orm: "prisma"
        backend: "nodejs/express"
        frontend: null
        mobile: null
    - name: "admin"
      path: "apps/admin"
      role: "admin"
      stack: "Python + Django + Django ORM + PostgreSQL"
      test_command: "cd apps/admin && python manage.py test"
      build_command: "cd apps/admin && python manage.py check"
      dev_command: "cd apps/admin && python manage.py runserver"
      modules:
        orm: "django-orm"
        backend: "python/django"
        frontend: null
        mobile: null
    - name: "mobile"
      path: "apps/mobile"
      role: "mobile"
      stack: "TypeScript + Expo + React Native"
      test_command: "cd apps/mobile && npx jest"
      build_command: "cd apps/mobile && npx tsc --noEmit"
      dev_command: "cd apps/mobile && npx expo start"
      modules:
        orm: null
        backend: null
        frontend: null
        mobile: "expo"

modules:
  active:
    orm: ["prisma", "django-orm"]
    deploy: "docker"
    backend: ["nodejs/express", "python/django"]
    mobile: "expo"
    frontend: null
  standalone: ["monorepo", "security"]
```

Bu yapilandirmada:
- Teammate 2 hem Prisma hem Django ORM rule dosyalarini, hem Express hem Django backend rule dosyalarini, hem Expo rule dosyalarini uretir
- VERIFICATION_COMMANDS blogu 3 ayri subproject icin test/build/lint komutlari icerir
- IMPLEMENTATION_RULES her subproject'in stack'ine ozel kurallar tasir

### Manifest Onay

Olusturulan manifesti kullaniciya YAML olarak goster ve onay iste:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Proje Manifesti
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[YAML icerigini goster]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bu manifest doğru mu?
  a) Evet, devam et
  b) Duzeltme yapmak istiyorum (neyi?)
>
```

- `b` secilirse → kullanicinin duzeltmesini al, manifesti guncelle, tekrar goster.
- `a` secilirse → manifesti `../Docs/agentic/project-manifest.yaml` olarak yaz ve devam et.

```
✅ Manifest yazildi: ../Docs/agentic/project-manifest.yaml
```

---

## ADIM 5 — DOSYA OLUSTURMA (TEAMMATE MODU)

**ONEMLI:** Bu adim TEAMMATE mekanizmasi ile paralel calisir. Lead (sen) teammate'leri spawn eder, her biri bagimsiz bir dosya grubunu uretir. Bu yaklasim hem hiz hem tutarlilik saglar — her teammate'in context'i temiz ve odakli kalir.

### 5.0 Dizin Yapisi Olusturma

Once hedef dizinlerin var oldugundan emin ol:

```bash
mkdir -p .claude/{commands,agents,hooks,rules,reports/deploys,tracking/errors} .claude/custom/{commands,agents,hooks,rules,_rescued} git-hooks
```

### 5.1 Teammate Spawn Plani

Manifest verisini ve aktif modul listesini hazirla. Sonra asagidaki 5 teammate'i PARALEL olarak spawn et. Her teammate'e manifest verisinin TAMAMI + ilgili skeleton dosya yollarini ver.

**KRITIK:** Teammate'ler Codebase'e YAZMAZ. Sadece Agentbase/.claude/ ve Agentbase/ root dizinine yazarlar.

```
Lead (sen)
  │
  ├──► Teammate 1: core-generator (Agent tool)
  │    Gorev: Core command, agent ve rule skeleton'larini isle,
  │           stack ve subproject bazli uzman agent'lar uret
  │    Girdi: manifest + templates/core/commands/*.skeleton.md
  │                     + templates/core/agents/*.skeleton.md
  │                     + templates/core/rules/*.md (sabit) ve *.skeleton.md
  │    Cikti: .claude/commands/ (8 dosya)
  │           .claude/agents/ (3 core + uzman agent'lar)
  │           .claude/rules/ (2 dosya)
  │    UZMAN AGENT URETIMI (bkz. 5.1.2):
  │
  ├──► Teammate 2: module-generator (Agent tool)
  │    Gorev: Aktif modullerin skeleton'larini isle
  │    Girdi: manifest.modules.active listesi
  │           + her aktif modul icin templates/modules/{kategori}/{varyant}/ altindaki dosyalar
  │    Cikti: Modul commands/ → .claude/commands/
  │           Modul agents/ → .claude/agents/
  │           Modul rules/ → .claude/rules/
  │    NOT: Sadece ACTIVE modullerin dosyalarini isler. Pasif modulleri ATLA.
  │         Monorepo'da modules.active listelerden TUM leaf'lerin dosyalarini uret
  │         (ornegin active.orm: ["prisma", "django-orm"] ise her ikisinin rule dosyalarini isle).
  │         GENERATE bloklarini doldururken hangi subproject'in hangi modulu kullandigini
  │         manifest.project.subprojects[].modules'dan oku.
  │
  ├──► Teammate 3: hook-generator (Agent tool)
  │    Gorev: Core + modul hook'larini isle, kullanici yasaklarini hook'a donustur,
  │           git hook'larini (pre-commit, pre-push) uret
  │    Girdi: manifest (yasaklar dahil)
  │           + templates/core/hooks/*.skeleton.js
  │           + templates/core/git-hooks/*.skeleton (pre-commit, pre-push)
  │           + aktif modullerin hooks/ dizinlerindeki dosyalar
  │    Cikti: .claude/hooks/ (core + modul hook'lari)
  │           git-hooks/ (pre-commit, pre-push — Codebase git islemleri icin)
  │    RAPOR: Urettigi hook dosya yollarini (.claude/hooks/*.js) Lead'e listele —
  │           Lead bu listeyi settings.json montajinda kullanir (bkz. 5.2.2).
  │    NOT: manifest.rules.forbidden listesindeki her "block" tipi yasak icin
  │         PreToolUse(Bash) hook'una jq bloklama kurali ekle.
  │         Her "warn" tipi yasak icin PostToolUse(Edit|Write) hook'una uyari ekle.
  │    JS MARKER FORMATI: Hook skeleton dosyalari (.js) MD'den farkli marker
  │         formati kullanir. HTML comment yerine JS comment syntax:
  │           /* GENERATE: BLOCK_NAME ... */  →  marker baslangici
  │           /* END GENERATE */              →  marker bitisi
  │         Wrapper satirlari (// ─── GENERATE BOLUMU BASLANGIC/BITIS ───)
  │         bilgilendirme amaclidir, korunmalidir.
  │
  ├──► Teammate 4: config-generator (Agent tool)
  │    Gorev: CLAUDE.md, .mcp.json, .claude-ignore dosyalarini uret
  │    Girdi: manifest + templates/core/CLAUDE.md.skeleton
  │                     + templates/core/claude-ignore.skeleton
  │    Cikti: ./CLAUDE.md (root)
  │           .claude/CLAUDE.md (inner)
  │           .mcp.json
  │           .claude-ignore
  │    NOT: CLAUDE.md.skeleton'daki GENERATE bloklarini manifest'ten doldur.
  │         Backlog CLI rehberi SABIT kalir, proje bilgileri GENERATE bloklarina girer.
  │
  └──► Teammate 5: root-generator (Agent tool)
       Gorev: Root dokumantasyon dosyalarini uret
       Girdi: manifest + codebase analiz sonuclari (Adim 2'den)
       Cikti: ./PROJECT.md
              ./STACK.md
              ./DEVELOPER.md
              ./ARCHITECTURE.md
              ./WORKFLOWS.md
       NOT: Bu dosyalar sifirdan uretilir (skeleton kullanilMAZ).
            Manifest + codebase analizindeki bilgilerle doldurulur.

### 5.1.2 Uzman Agent Uretimi

Core-generator (Teammate 1), core skeleton agent'lara ek olarak stack ve subproject'e gore **uzman agent'lar** uretir. Bu agent'lar task-hunter'in teammate olarak spawn edebilecegi domain-spesifik uzmanlardir.

#### Hangi Uzman Agent Uretilir?

| Kosul | Uretilecek Agent | Kaynak Skeleton |
|-------|------------------|-----------------|
| `stack.runtime` backend (node, php, python, go, rust, java) | `backend-expert.md` | `templates/core/agents/backend-expert.skeleton.md` |
| `modules.active.mobile` mevcut | `mobile-expert.md` | `templates/core/agents/mobile-expert.skeleton.md` |
| `modules.active.frontend` mevcut | `frontend-expert.md` | `templates/core/agents/frontend-expert.skeleton.md` |

#### Monorepo: Subproject-Bazli Agent Uretimi

Monorepo tespit edildiginde (`project.type == "monorepo"`), core-generator her subproject icin ilgili uzman skeleton'u **klonlayip ozellestirerek** ek agent uretir:

1. Her subproject icin `manifest.project.subprojects[]` listesini tara
2. Subproject'in `role` alanina gore kaynak skeleton'u sec:
   - `role: api | worker | backend` → `backend-expert.skeleton.md`
   - `role: mobile` → `mobile-expert.skeleton.md`
   - `role: web | admin | frontend` → `frontend-expert.skeleton.md`
3. Skeleton'u isle ve cikti dosyasini `{subproject.name}-expert.md` olarak yaz
4. GENERATE bloklarini subproject-spesifik doldur:
   - `CODEBASE_CONTEXT` → sadece o subproject'in dizin yapisi ve stack'i
   - Framework rules → sadece o subproject'in framework'u
5. Agent frontmatter'ini guncelle:
   - `name: {subproject.name}-expert` (ornegin `api-expert`, `mobile-expert`, `admin-expert`)
   - `tools`, `model`, `color` kaynak skeleton'dan miras alinir

**Ornek:** `project.subprojects` icinde api (Express), mobile (Expo), admin (Django) varsa:
- `api-expert.md` ← backend-expert.skeleton + Express kurallari
- `mobile-expert.md` ← mobile-expert.skeleton + Expo kurallari
- `admin-expert.md` ← backend-expert.skeleton + Django kurallari

**NOT:** Single proje ise subproject-bazli agent uretimi ATLANIR. Sadece stack-bazli generic agent'lar uretilir.

**NOT:** Subproject-bazli agent isimleri mevcut core agent isimleriyle (code-review, regression-analyzer, service-documentation) CARPISTIRILMAMALIDIR.

### 5.1.1 Hibrit Mod: Script-First Yaklasim

Skeleton isleme iki asamali calisiir — once deterministik script, sonra Claude:

**Adim A — Deterministik Isleme (generate.js):**

```bash
cd Agentbase && node generate.js ../Docs/agentic/project-manifest.yaml --verbose
```

Script su isleri yapar:
1. Manifest.yaml okur
2. Aktif modullere gore skeleton dosyalarini tarar
3. **Basit GENERATE bloklarini** deterministik doldurur (komut tablolari, path listeleri, uzanti dizileri vb.)
4. **Karmasik GENERATE bloklarini** `<!-- CLAUDE_FILL: BLOCK_NAME -->` marker'i ile isaretler
5. `.skeleton` uzantisini kaldirarak cikti dosyalarini yazar
6. Rapor ciktisi verir: kac blok dolduruldu, kac blok Claude'a birakildi

**Script tarafindan doldurulan basit bloklar:**
`COMMIT_CONVENTION`, `VERIFICATION_COMMANDS`, `TEST_COMMANDS`, `COMPILE_COMMANDS`, `BUILD_COMMANDS`, `MIGRATION_COMMANDS`, `FILE_EXTENSIONS`, `CODE_EXTENSIONS`, `MEMORY_PATH`, `PRISMA_PATH`, `LARAVEL_PATHS`, `DJANGO_PATHS`, `TYPEORM_PATHS`, `SECURITY_PATTERNS`, `LAYER_TESTS`, `SUBPROJECT_CONFIGS`, `STACK_SPECIFIC_IGNORES`, `DEPLOY_LOG_PATH`, `HEALTH_CHECK_URL`, `SMOKE_TEST_ENDPOINTS`, `TASK_ROUTING_CONFIG`, `GIT_PRECOMMIT_COMPILE`, `GIT_PRECOMMIT_TEST`, `GIT_PRECOMMIT_LINT`, `GIT_PRECOMMIT_FORMAT`, `GIT_PREPUSH_LOCALHOST`, `GIT_PREPUSH_MIGRATION`, `GIT_PREPUSH_ENV`, `GIT_PREPUSH_DESTRUCTIVE`

**Claude'a birakilacak karmasik bloklar (CLAUDE_FILL ile isaretlenir):**
`CODEBASE_CONTEXT`, `PROJECT_CHECKLIST`, `IMPLEMENTATION_RULES`, `PROJECT_SPECIFIC_RULES`, `REVIEW_CHECKLIST`, `FILE_DISCOVERY_HINTS`, `FILE_DETECTION_PATTERNS`, `AC_TEMPLATES`, `DEPLOY_TOPOLOGY`, `DEPLOY_STEPS`, `ENVIRONMENT_DIFFERENCES`, `HOOK_BEHAVIORS`, `CRITICAL_RULES`, `PROJECT_CONVENTIONS`, `STYLING_APPROACH`, `ROUTER_TYPE`, `STATE_MANAGEMENT` ve diger bağlam-yoğun bloklar.

**Adim B — Claude Tamamlama (Teammate Modu):**

Script tamamlandiktan sonra teammate'ler spawn edilir. Ancak artik teammate'lerin isi AZALMISTIR:
- Dosyalar zaten yaratilmis ve basit bloklar doldurulmustur
- Teammate'ler sadece `<!-- CLAUDE_FILL: ... -->` marker'larini bulup manifest + codebase analizi ile doldurur
- Bu yaklasim teammate timeout riskini azaltir ve tutarliligi arttirir

**ONEMLI:** Script hata verirse (ornegin manifest parse hatasi), DURMA — hatayi kullaniciya bildir ve klasik teammate-only moduna geri don.

**Avantajlar:**
- **Idempotent:** Ayni manifest → ayni basit blok ciktisi
- **Hizli:** Basit bloklar icin Claude token harcanmaz
- **Test edilebilir:** `node --test generate.test.js` ile dogrulanir
- **Debug edilebilir:** Hata durumunda stack trace mevcut

### 5.2 Teammate Spawn Uygulamasi

Her teammate icin Agent tool kullan. `run_in_background: false` — tum teammate'ler tek bir mesajda paralel baslatilir ve sonuclari beklenir.

Her teammate'e gonderilecek prompt formati:

```
Sen Bootstrap'in bir teammate'isin. Gorevin: [gorev aciklamasi]

## Manifest
[manifest.yaml icerigi — TAMAMI]

## Skeleton Dosyalari
[ilgili skeleton dosya yollari]

## Kurallar
1. Dosyalar generate.js tarafindan olusturulmus olabilir. Oncelik: `<!-- CLAUDE_FILL: BLOCK_NAME -->` marker'larini bul ve doldur.
2. CLAUDE_FILL olmayan GENERATE bloklarini da manifest verisiyle doldur (format asagida)
3. .skeleton uzantisini kaldir (eger generate.js zaten kaldirmissa atlat)
4. Statik dosyalari oldugu gibi kopyala
5. Hedef dizine yaz: [hedef yol]
6. Codebase'e ASLA yazma
7. Her dosya yazildiginda bildir
8. Monorepo (project.type == "monorepo") icin GENERATE bloklarini subproject-scope'lu doldur:
   - VERIFICATION_COMMANDS, TEST_COMMANDS, COMPILE_COMMANDS → her subproject icin AYRI satir uret
   - IMPLEMENTATION_RULES, REVIEW_CHECKLIST → her subproject'in modules alanindaki stack'e gore kurallar ekle
   - CODEBASE_CONTEXT → tum subproject'leri ve her birinin stack'ini listele
   - Kaynak: `manifest.project.subprojects[].modules` alanlari (her subproject kendi modul setini tasir)

## Skeleton Marker Formatlari (Dosya Tipine Gore)

Skeleton dosyalarinda iki farkli marker formati kullanilir. Dosya uzantisina gore dogru formati isle:

**Markdown / Config dosyalari (.md, .skeleton, .json):**
```
<!-- GENERATE: BLOCK_NAME -->
...icerik...
<!-- END GENERATE -->
```

**JavaScript dosyalari (.js):**
```javascript
/* GENERATE: BLOCK_NAME
 * ...aciklama/ornekler...
 */
...icerik...
/* END GENERATE */
```

JS dosyalarinda bolum basinda `// ─── GENERATE BOLUMU BASLANGIC ───` ve sonunda `// ─── GENERATE BOLUMU BITIS ───` wrapper satirlari bulunur. Bu satirlar bilgilendirme amaclidir, isleme sirasinda degistirilmez.

## Hedef Yol Haritasi
- templates/core/commands/*.md → .claude/commands/
- templates/core/agents/*.md → .claude/agents/
- templates/core/hooks/* → .claude/hooks/
- templates/core/git-hooks/* → git-hooks/
- templates/core/rules/*.md → .claude/rules/
- templates/modules/{kat}/{var}/commands/*.md → .claude/commands/
- templates/modules/{kat}/{var}/agents/*.md → .claude/agents/
- templates/modules/{kat}/{var}/hooks/* → .claude/hooks/
- templates/modules/{kat}/{var}/rules/*.md → .claude/rules/
```

### 5.2.1 GENERATE Blok Haritasi

Teammate'ler skeleton dosyalarini islerken hangi GENERATE bloklarinin hangi dosyada oldugunu bilmelidir. Lead bu tabloyu ilgili teammate'in prompt'una dahil eder:

| Skeleton Dosyasi | GENERATE Bloklari |
|-----------------|-------------------|
| task-hunter.skeleton.md | CODEBASE_CONTEXT, FILE_DISCOVERY_HINTS, IMPLEMENTATION_RULES, VERIFICATION_COMMANDS, COMMIT_CONVENTION, PROJECT_SPECIFIC_RULES, TASK_ROUTING_CONFIG |
| task-master.skeleton.md | CODEBASE_CONTEXT |
| task-conductor.skeleton.md | CODEBASE_CONTEXT, VERIFICATION_COMMANDS, COMMIT_CONVENTION |
| task-review.skeleton.md | CODEBASE_CONTEXT, REVIEW_CHECKLIST, COMMIT_CONVENTION |
| task-plan.skeleton.md | CODEBASE_CONTEXT, FILE_DETECTION_PATTERNS, AC_TEMPLATES |
| bug-hunter.skeleton.md | CODEBASE_CONTEXT, VERIFICATION_COMMANDS, COMMIT_CONVENTION |
| bug-review.skeleton.md | CODEBASE_CONTEXT, REVIEW_CHECKLIST, COMMIT_CONVENTION |
| deep-audit.skeleton.md | CODEBASE_CONTEXT, MODULE_MAPPING, SUBPROJECT_LAYERS, REVIEW_AGENTS, VERIFICATION_COMMANDS, IDOR_CHECKLIST |
| deadcode.skeleton.md | CODEBASE_CONTEXT, DEADCODE_TOOLS, COMMIT_CONVENTION |
| memorize.skeleton.md | MEMORY_PATH |
| code-review.skeleton.md (agent) | CODEBASE_CONTEXT, PROJECT_CHECKLIST |
| regression-analyzer.skeleton.md (agent) | CODEBASE_CONTEXT, PROJECT_PATHS |
| workflow-lifecycle.skeleton.md (rule) | COMMIT_CONVENTION, DEPLOY_TOPOLOGY, DEPLOY_STEPS, ROLLBACK_PLATFORM_STEPS, ENVIRONMENT_DIFFERENCES, TEAM_REVIEW_POLICY, HOOK_BEHAVIORS, CRITICAL_RULES |
| code-review-check.skeleton.js (hook — JS format) | SECURITY_PATTERNS, FILE_EXTENSIONS |
| test-reminder.skeleton.js (hook — JS format) | LAYER_TESTS, CODE_EXTENSIONS |
| auto-test-runner.skeleton.js (hook — JS format) | LAYER_TESTS, CODE_EXTENSIONS |
| team-trigger.skeleton.js (hook — JS format) | LAYER_TESTS |
| backend-expert.skeleton.md (agent) | CODEBASE_CONTEXT, BACKEND_FRAMEWORK_RULES |
| mobile-expert.skeleton.md (agent) | CODEBASE_CONTEXT, MOBILE_PLATFORM_RULES |
| frontend-expert.skeleton.md (agent) | CODEBASE_CONTEXT, FRONTEND_FRAMEWORK_RULES |
| pre-commit.skeleton (git-hook) | GIT_PRECOMMIT_COMPILE, GIT_PRECOMMIT_TEST, GIT_PRECOMMIT_LINT, GIT_PRECOMMIT_FORMAT |
| pre-push.skeleton (git-hook) | GIT_PREPUSH_LOCALHOST, GIT_PREPUSH_MIGRATION, GIT_PREPUSH_ENV, GIT_PREPUSH_DESTRUCTIVE |
| CLAUDE.md.skeleton (config) | PROFESSIONAL_STANCE, PROJECT_DEFINITION, TECH_STACK, ENVIRONMENTS, COMMANDS, ARCHITECTURE, CONVENTIONS, AVAILABLE_COMMANDS |
| settings.skeleton.json (Lead — bkz. 5.2.2) | PRETOOLUSE_EDITWRITE_HOOKS, PRETOOLUSE_BASH_HOOKS, POSTTOOLUSE_EDITWRITE_HOOKS, POSTTOOLUSE_BASH_HOOKS, ENABLED_PLUGINS |
| claude-ignore.skeleton (config) | STACK_SPECIFIC_IGNORES |

**CODEBASE_CONTEXT** her skeleton'da vardir ve manifest'in project + stack + subprojects bolumleriyle doldurulur.

### 5.2.2 Lead: settings.json Montaji

Tum teammate'ler tamamlandiktan sonra, Lead `settings.json` dosyasini asagidaki adimlarla uretir. Bu dosya hicbir teammate tarafindan yazilmaz — sahiplik tamamen Lead'dedir.

1. **Skeleton'u oku:** `templates/core/settings.skeleton.json` dosyasini oku
2. **Hook GENERATE bloklarini doldur:** Manifest verisini ve Teammate 3'un raporladigi hook dosya listesini kullanarak su bloklari isle:
   - `__GENERATE__PRETOOLUSE_EDITWRITE_HOOKS__` — manifest.rules.forbidden + aktif modul Edit/Write hook'lari
   - `__GENERATE__PRETOOLUSE_BASH_HOOKS__` — aktif modul Bash hook'lari
   - `__GENERATE__POSTTOOLUSE_EDITWRITE_HOOKS__` — aktif modul post-edit hook'lari
   - `__GENERATE__POSTTOOLUSE_BASH_HOOKS__` — aktif modul post-bash hook'lari
3. **Plugin GENERATE blogunu doldur:** Manifest.modules.active listesine gore:
   - `__GENERATE__ENABLED_PLUGINS__` — aktif modullerin plugin tanimlamalari (root seviyesine merge edilir)
4. **Meta-anahtarlari temizle:** Cikti JSON'indan `__doc__` ve `__GENERATE__*` wrapper anahtarlarini cikar
5. **Dosyayi yaz:** `.claude/settings.json` olarak kaydet
6. **Cross-check:** Uretilen settings.json'daki her hook `command` alaninda referans edilen dosya yolunun (ornegin `node .claude/hooks/code-review-check.js`) Teammate 3 tarafindan gercekten uretildigini dogrula. Eksik dosya varsa UYARI ver.

**GENERATE Blok Doldurma Kurallari:**
- Her `__GENERATE__*` blogu icindeki alt anahtarlar kosula baglidir (ornegin `prisma_active` sadece prisma modulu aktifse eklenir)
- Kosul eslesen alt-objelerin degerleri parent `hooks` array'ine yeni eleman olarak eklenir
- `__GENERATE__ENABLED_PLUGINS__` blogu root seviyesine merge edilir (cikti JSON'una dogrudan key-value olarak eklenir)

### 5.2.3 Teammate Recovery Mekanizmasi

Teammate'ler paralel calisirken basarisizlik olabilir. Lead asagidaki recovery stratejisini uygular:

#### Timeout Limitleri

Her teammate icin **5 dakika (300.000 ms)** timeout limiti gecerlidir. Agent tool'un `timeout` parametresi bu degerle ayarlanir.

| Teammate | Timeout | Gerekce |
|----------|---------|---------|
| 1 (core-generator) | 300s | 12 dosya — skeleton isleme + GENERATE doldurma |
| 2 (module-generator) | 300s | Degisken dosya sayisi — modul adedine bagli |
| 3 (hook-generator) | 300s | JS dosyalari + yasak kurallari isleme |
| 4 (config-generator) | 300s | CLAUDE.md skeleton'u buyuk olabilir |
| 5 (root-generator) | 300s | Sifirdan icerik uretimi — LLM yogun |

**NOT:** Monorepo projelerinde subproject sayisi fazlaysa Lead timeout'u **450s**'ye yukseltebilir.

#### Basarisizlik Tespiti

Bir teammate asagidaki durumlardan birinde **basarisiz** sayilir:

1. **Timeout:** Belirlenen sure icinde yanit donmedi
2. **Hata:** Agent tool hata mesaji dondurdu (crash, context overflow vb.)
3. **Bos cikti:** Teammate hicbir dosya uretmeden tamamlandi
4. **Eksik cikti:** Beklenen dosya sayisindan az dosya uretildi (sanity check'te tespit edilir — bkz. 5.3)

#### Retry Stratejisi

```
Teammate basarisiz oldu
  │
  ├─ Ilk basarisizlik mi?
  │   ├─ EVET → Retry (1 kez)
  │   │         • Ayni prompt ile yeniden spawn et
  │   │         • run_in_background: false
  │   │         • Diger teammate'lerin ciktilari KORUNUR
  │   │         • Retry'da timeout ayni kalir
  │   │
  │   └─ HAYIR (2. basarisizlik) → Kullaniciya bildir
  │         • Basarisiz teammate'in gorevini raporla
  │         • Uretilemeyen dosya listesini goster
  │         • Kullaniciya sec:
  │           (a) Manuel mudahale — kullanici dosyalari kendisi olusturur
  │           (b) Atla — eksik dosyalar olmadan devam et
  │           (c) Bootstrap'i iptal et
  │
  └─ Basarili teammate'lerin ciktilari HER DURUMDA korunur
```

**KRITIK:** Retry sirasinda diger teammate'lerin urettigi dosyalar ASLA silinmez veya tekrar uretilmez. Sadece basarisiz teammate yeniden calistirilir.

#### Retry Uygulama Formati

Retry'da teammate'e gonderilecek prompt basina su ek eklenir:

```
[RETRY] Bu gorev daha once basarisiz oldu. Sebep: [timeout/hata/bos cikti]
Onceki hata detayi: [varsa hata mesaji]
Lutfen gorevi bastan tamamla. Tum dosyalari uret.
```

#### Kismi Basari Yonetimi

Bir teammate BAZI dosyalari uretip BAZILARI icin basarisiz olabilir (ornegin 8 dosyadan 6'sini yazdiktan sonra timeout). Bu durumda:

1. **Uretilen dosyalar korunur** — Lead bunlari silmez
2. **Eksik dosyalar tespit edilir** — Beklenen cikti listesi ile gercek dosyalar karsilastirilir
3. **Retry sadece eksik dosyalar icin yapilir** — Retry prompt'una su ek eklenir:

```
[KISMI RETRY] Onceki calistirmada su dosyalar basariyla uretildi ve KORUNUYOR:
- [uretilmis dosya listesi]

Sadece su EKSIK dosyalari uret:
- [eksik dosya listesi]

Zaten uretilmis dosyalarin UZERINE YAZMA.
```

#### Kullanici Bildirim Formati

2. basarisizlik sonrasinda kullaniciya gosterilecek mesaj:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Teammate Basarisizlik Raporu
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Basarisiz Teammate: [numara] ([isim])
Basarisizlik Sebebi: [timeout / hata / bos cikti]
Retry Sonucu: Basarisiz (2/2 deneme tukendi)

Uretilemeyen Dosyalar:
  ✗ [dosya yolu 1]
  ✗ [dosya yolu 2]
  ...

Basarili Uretilen Dosyalar (korunuyor):
  ✓ [dosya yolu 1]
  ✓ [dosya yolu 2]
  ...

Diger Teammate'ler: ✅ Tamamlandi (ciktilari korunuyor)

Secenekler:
  (a) Manuel mudahale — eksik dosyalari kendiniz olusturun
  (b) Eksikleri atlayip devam et — bootstrap kismi tamamlanir
  (c) Bootstrap'i iptal et
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Secenek (b) secilirse:** Lead, eksik dosyalari Sanity Check raporunda "EKSIK" olarak isaretler ve bootstrap'a devam eder. settings.json montajinda eksik hook dosyalarina referans EKLENMEZ.

### 5.3 Lead Sanity Check

Tum teammate'ler tamamlandiktan sonra Lead (sen) su kontrolleri yap:

1. **Dosya sayisi kontrolu:** Beklenen dosya sayisi ile .claude/ altindaki gercek dosya sayisini karsilastir
2. **Carpisan dosya kontrolu:** Ayni isme sahip dosya birden fazla teammate'den geldiyse UYARI ver
3. **settings.json tutarliligi (Lead uretimi — bkz. 5.2.2):**
   a. settings.json'daki her `command` alanindaki `.claude/hooks/*.js` dosyasinin fiziksel olarak var oldugunu dogrula
   b. .claude/hooks/ altindaki her .js dosyasinin settings.json'da en az bir hook'ta referans edildigini kontrol et (orphan hook uyarisi)
   c. `__doc__` veya `__GENERATE__` anahtarlarinin cikti dosyasina sizmadigini dogrula
   d. JSON syntax dogrulamasi yap (valid JSON mi?)
4. **CLAUDE.md komut listesi:** Config-generator'in urettigi CLAUDE.md'deki komut tablosunu .claude/commands/ altindaki gercek dosyalarla karsilastir

Tutarsizlik varsa kullaniciya bildir ve duzelt.

### 5.4 Dosya Olusturma Raporu

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 Dosya Olusturma Raporu (Teammate Modu)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Teammate 1 (core-generator):     [DURUM] [X] dosya uretildi
Teammate 2 (module-generator):   [DURUM] [X] dosya uretildi
Teammate 3 (hook-generator):     [DURUM] [X] hook dosyasi + [Y] git-hook uretildi
Lead (settings.json montaji):    [DURUM] settings.json uretildi
Teammate 4 (config-generator):   [DURUM] [X] dosya uretildi
Teammate 5 (root-generator):     [DURUM] [X] dosya uretildi

Lead Sanity Check:               [DURUM]
Toplam dosya:                    [X]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DURUM gosterimleri:
  ✅  — Basarili (ilk denemede)
  🔄✅ — Retry sonrasi basarili (2. denemede)
  ⚠️  — Kismi basarili ([Y]/[X] dosya uretildi, [Z] eksik)
  ❌  — Basarisiz (2 deneme tukendi, kullanici karari: [a/b/c])

Retry veya kismi basari varsa ek detay:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Teammate [N]: [basarisizlik sebebi]
    1. deneme: [timeout/hata/eksik cikti] → retry baslatildi
    2. deneme: [basarili/basarisiz]
    Uretilen:  [dosya listesi]
    Eksik:     [dosya listesi] (veya "yok")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5.5 Teammate Referans Sablonlari

Asagidaki sablonlar teammate'lerin dosya uretirken kullanacagi formatlari tanimlar. Lead bu sablonlari ilgili teammate'in prompt'una dahil eder.

#### Root Dokumantasyon Dosyalari (Teammate 5 icin)

Manifest verisini kullanarak asagidaki dosyalari Agentbase root'una (`./`) olustur. Her dosya icin once `templates/core/` altinda ayni isimde skeleton dosya aranir, bulunursa o kullanilir, bulunamazsa asagidaki sablonlarla olusturulur.

**PROJECT.md:**
```markdown
# [proje adi]

## Proje Tanimi
[manifest.project.description]

## Proje Tipi
[manifest.project.type] ([manifest.project.language])

## Alt Projeler
[Her subproject icin: isim, yol, rol, stack]

## Ortamlar
[Her environment icin: isim, URL]

## Onemli Kurallar
[manifest.rules.domain'den]
[manifest.rules.forbidden'den]

## Hizli Baslatma
[Her subproject icin dev komutu]
```

**STACK.md:**
```markdown
# Tech Stack

## Runtime
[manifest.stack.runtime] [manifest.stack.runtime_version]

## Paket Yoneticisi
[manifest.stack.package_manager]

## Dil & Tip Sistemi
[TypeScript durumu, diger diller]

## Test
Framework: [manifest.stack.test_framework]
Strateji: [manifest.workflows.test_strategy]

## Lint & Format
Linter: [manifest.stack.linter]
Formatter: [manifest.stack.formatter]

## Veritabani & ORM
ORM: [manifest.stack.orm]
DB: [manifest.stack.database]

## CI/CD & Deploy
[Tespit edilen CI/CD araclari]
[Deploy bilgisi]
```

**DEVELOPER.md:**
```markdown
# Gelistirici Profili

## Deneyim Seviyesi
[manifest.developer.experience]

## Iletisim
Dil: [manifest.project.language]

## Otonomi
[manifest.developer.autonomy]
[Otonomi seviyesine gore davranis aciklamasi]

## Davranis Rehberi
[Deneyim seviyesine gore Claude'un nasil davranmasi gerektigi]
```

**ARCHITECTURE.md:**
```markdown
# Mimari

## Dizin Yapisi
[Adim 2.2'deki tespit edilen dizin haritasi]

## Alt Proje Yapisi
[Her subproject icin: rol, sorumluluk alani, ana dizinler]

## Veri Akisi
<!-- Bu bolum proje gelistirme sirasinda detaylandirilacak -->

## Bagimlilik Kurallari
<!-- Bu bolum proje gelistirme sirasinda detaylandirilacak -->

> Bu dosya ilk bootstrap sirasinda iskelet olarak olusturulmustur.
> Detaylandirmak icin: backlog'daki "ARCHITECTURE.md'yi detaylandir" gorevini tamamlayin.
```

**WORKFLOWS.md:**
```markdown
# Is Akislari

## Git Workflow
Branch Modeli: [manifest.workflows.branch_model]
Commit Convention: [manifest.workflows.commit_convention]

### Commit Prefix'leri
[manifest.workflows.commit_prefix_map'den tablo]

## Test Workflow
Strateji: [manifest.workflows.test_strategy]
[Her subproject icin test komutu]

## Deploy Workflow
[Environment ve deploy bilgileri]

## Code Review
[Branch modeline gore review sureci]

## Migration Workflow
[manifest.workflows.migration_strategy'ye gore]
```

#### CLAUDE.md Dosyalari (Teammate 4 icin)

Iki ayri CLAUDE.md dosyasi olustur:

**Root CLAUDE.md (`./CLAUDE.md`):**
```markdown
# [proje adi] — Claude Code Yapilandirmasi

Bu proje agentic workflow kullanir. Tum yapilandirma Agentbase dizinindedir.

## Calisma Dizini
- **Agentbase/** — Agent yapilandirmasi, komutlar, kurallar (BURADASIN)
- **../Codebase/** — Proje kaynak kodu (BURAYA ERISIRSIN)
- **../Docs/** — Proje dokumantasyonu

## Temel Kurallar
- Dil: [manifest.project.language]
- Commit: [manifest.workflows.commit_convention]
- Otonomi: [manifest.developer.autonomy]
- [manifest.rules.domain'den onemli kurallar]

## Yasakli Islemler
[manifest.rules.forbidden'den — her biri icin: komut ve sebep]

## Aktif Moduller
[manifest.modules.active listesi]

## Kullanilabilir Komutlar
[.claude/commands/ altindaki tum komutlari listele]

@ import PROJECT.md
@ import STACK.md
@ import DEVELOPER.md
```

**Inner CLAUDE.md (`.claude/CLAUDE.md`):**
```markdown
# Agent Dahili Yapilandirma

Bu dizin Claude Code agent yapilandirmasini icerir.

## Dizin Yapisi
- `commands/` — Slash komutlari (/bootstrap, /task-hunter, vb.)
- `agents/` — Alt agent tanimlamalari
- `hooks/` — Pre/post commit ve diger hook'lar
- `rules/` — Kural dosyalari
- `reports/` — Agent raporlari
- `tracking/` — Hata ve islem takibi

## Manifest
Proje manifesti: ../Docs/agentic/project-manifest.yaml
Tum yapilandirma bu manifest'ten turetilmistir.
```

#### settings.json (Lead montaji — Adim 5.2.2)

Lead, tum teammate'ler tamamlandiktan sonra `templates/core/settings.skeleton.json` dosyasindan `.claude/settings.json` dosyasini uretir. Hook GENERATE bloklari manifest + Teammate 3 ciktilariyla, plugin GENERATE blogu manifest.modules.active ile doldurulur.

```
Girdi:  templates/core/settings.skeleton.json
Cikti:  .claude/settings.json

Montaj sureci:
1. Skeleton'u oku (tum __doc__ ve __GENERATE__* meta-anahtarlari tasinmaz)
2. Her __GENERATE__* blogundaki kosullu alt-objeleri manifest'e gore degerlendir
3. Kosul saglanan objeleri parent array/objeye ekle
4. ENABLED_PLUGINS blogunu root seviyesine merge et
5. Teammate 3'un raporladigi hook dosya listesiyle cross-check yap
6. Clean JSON olarak .claude/settings.json'a yaz
```

#### .claude-ignore (Teammate 4 icin)

`Agentbase/.claude-ignore` dosyasini olustur veya guncelle:
```
node_modules/
.env
.env.*
*.log
dist/
build/
.next/
coverage/
.DS_Store
*.sqlite
*.db
```

#### Modul Etkilesim Matrisi (Tum teammate'ler icin referans)

Birden fazla modul aktifse, dosyalar arasindaki katkilari birlestir:

**Dogrulama Komutlari (task-hunter vb. icin VERIFICATION_COMMANDS):**
- Core: `tsc --noEmit` (TypeScript varsa) + `[test_command]`
- orm/* aktifse ekle: ORM validate komutu (ornegin prisma icin `npx prisma validate`)
- monorepo aktifse: Her alt proje icin ayri dogrulama blogu

**Code Review Checklist (code-review icin PROJECT_CHECKLIST):**
- Core: Genel kod kalitesi kontrolleri
- security aktifse ekle: IDOR, SQL injection, auth bypass kontrolleri
- mobile/* aktifse ekle: Tema uygunlugu, platform-specific kontroller
- backend/* aktifse ekle: Framework-spesifik kontroller
- frontend/* aktifse ekle: Framework-spesifik kontroller

**Workflow Lifecycle:**
- Core: Branch → commit → push → merge
- deploy/* aktifse ekle: Deploy adimlari (docker icin Docker build, vercel icin build kontrolu)
- orm/* aktifse ekle: Migration adimlari

**Hook'lar:**
- Core hook'lari
- orm/* aktifse: ORM'e ozel hook'lar (prisma icin pre-commit'e `prisma validate` + `prisma format`)
- monorepo aktifse: pre-commit'e cross-package format kontrolu
- backend/* aktifse: Framework-spesifik hook'lar

**NOT:** Eski monolitik "Dosya Olusturma Raporu" kaldirildi. Teammate modu kendi raporunu uretir (Adim 5.4).

Template'den olusturulan:
  [template'den okunan ve olusturulan dosya listesi]

Atlanan (template bulunamadi):
  [varsa atlanan dosyalar]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ADIM 6 — BACKLOG BASLANGIC

### 6.1 Backlog Baslatma

Bash ile kontrol et: `ls backlog/config.yml 2>/dev/null`

- **Mevcutsa** → Atlat, mevcut backlog'u koru.
- **Mevcut degilse** → Once `backlog init` dene. Eger interaktif mod gerektirirse (prompt bekler ve tamamlanmazsa), fallback olarak elle olustur:

```bash
mkdir -p backlog/tasks backlog/completed backlog/drafts backlog/decisions backlog/docs
cat > backlog/config.yml << EOF
project_name: [manifest.project.name]
version: 1
milestones: []
definition_of_done:
  - Tum testler geciyor
  - Kod review yapildi
  - Dokumantasyon guncellendi
EOF
```

### 6.2 Baslangic Gorevleri

Asagidaki gorevleri olustur (backlog CLI ile):

**GREENFIELD_MODE = false (mevcut proje):**

```bash
backlog task create "Codebase'i incele ve ARCHITECTURE.md'yi detaylandir" \
  -d "Bootstrap tarafindan olusturulan iskelet ARCHITECTURE.md dosyasini, codebase'i derinlemesine inceleyerek detaylandir. Katman yapisi, veri akisi, bagimlilik kurallari, onemli pattern'ler ekle." \
  --priority high \
  -l bootstrap

backlog task create "Ilk feature/bug task'ini olustur" \
  -d "Codebase'i inceledikten sonra, en oncelikli feature veya bug icin bir backlog task'i olustur. Kabul kriterleri ve implementation plani ekle." \
  --priority medium \
  -l bootstrap
```

**GREENFIELD_MODE = true (yeni proje):**

```bash
backlog task create "Proje scaffold'unu olustur" \
  -d "Codebase/ dizininde proje scaffold'unu olustur. Stack: [manifest.stack.primary]. Gerekli komutlar Bootstrap raporunda listelenmistir." \
  --priority high \
  -l bootstrap -l greenfield

backlog task create "ARCHITECTURE.md'yi proje planina gore yaz" \
  -d "Greenfield projesi icin hedef mimariyi, katmanlari ve veri akisini tanimla. Henuz kod yok — bu bir hedef dokuman." \
  --priority high \
  -l bootstrap -l greenfield

backlog task create "Ilk feature'i planla ve implement et" \
  -d "Proje scaffold'u olustuktan sonra ilk feature'i planla. /task-plan ile baslayabilirsiniz." \
  --priority medium \
  -l bootstrap -l greenfield
```

```
✅ Backlog hazir — [2|3] baslangic gorevi olusturuldu.
```

---

## ADIM 7 — TAMAMLANMA RAPORU

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Bootstrap Tamamlandi!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Proje: [proje adi]
📁 Tip:   [single/monorepo]
🔧 Stack: [ana teknolojiler]

🧩 Aktif Moduller:
   Kategoriler:
     [her aktif kategori icin: kategori → varyant]
   Bagimsiz:
     [her aktif bagimsiz modul icin satir]

📄 Olusturulan Dosyalar: [toplam sayi]
   Root:    [sayi] dosya
   .claude: [sayi] dosya

📋 Backlog — Baslangic Gorevleri:
   TASK-1 [HIGH] Codebase'i incele ve ARCHITECTURE.md'yi detaylandir
     → Calistir: /task-hunter 1
   TASK-2 [MEDIUM] Ilk feature/bug task'ini olustur
     → Calistir: /task-plan <istek>

🚀 Kullanilabilir Komutlar:
   [.claude/commands/ altindaki her komut icin]
   /bootstrap  — Kurulumu ilk kez yapar veya kontrollu sekilde yeniden calistirir
   [diger komutlar]

🔒 Git Hook Kurulumu:
   Codebase'de commit/push kontrollerini aktif etmek icin:

   cd ../Codebase && git config core.hooksPath "$(realpath ../Agentbase/git-hooks/)"

   Bu komut pre-commit (test, lint, guvenlik) ve pre-push (migration,
   env sync, localhost leak) kontrollerini devreye sokar.
   Bypass: TESTS_VERIFIED=1 git commit -m "..."

📖 Sonraki Adimlar:
   [GREENFIELD_MODE ise asagidaki blogu goster:]
   🌱 Greenfield — Proje Scaffold Kurulumu:
      Stack'inize gore asagidaki komutu Codebase/ icinde calistirin:

      Node.js:     cd ../Codebase && npm init -y
      Next.js:     cd ../Codebase && npx create-next-app@latest .
      Expo:        cd ../Codebase && npx create-expo-app@latest .
      Python:      cd ../Codebase && python -m venv venv && pip init
      Django:      cd ../Codebase && django-admin startproject myproject .
      FastAPI:     cd ../Codebase && pip install fastapi uvicorn
      Laravel:     cd ../Codebase && composer create-project laravel/laravel .
      Go:          cd ../Codebase && go mod init [modul-adi]

      Scaffold olustuktan sonra: /task-hunter 1

   [Her durumda goster:]
   1. /task-hunter 1 → [Greenfield: scaffold olustur | Normal: ARCHITECTURE.md detaylandir]
   2. /task-plan "istediginiz ozellik veya bug" → backlog'a yeni gorev olusturur
   3. /task-master → tum acik gorevleri onceliklendirir
   4. /task-hunter <id> → gorevi otonom implement eder

📡 Canli Oturum Izleme:
   Ayri bir terminal penceresinde oturumlari canli takip edebilirsiniz:

   cd Agentbase && node bin/session-monitor.js

   Dashboard tum aktif Claude Code oturumlarini gosterir:
   - Hangi task uzerinde calisildigini
   - Tool kullanim istatistiklerini (read/write/bash)
   - Teammate spawn durumlarini
   - Hata sayilarini
   - Backlog ve git aktivitesini

   Kisayollar: q=cikis, 1-9=detay, r=yenile, c=kapali gizle, h=yardim

[EKLENTI ONERISI BOLUMU — asagiya bkz.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 7.1 Eklenti Oneri Sistemi

Tamamlanma raporundan sonra, eklenti havuzunu tarayarak projeye uygun eklentileri oner.

#### Eslesme Mantigi

1. `templates/extensions-registry.yaml` dosyasini oku
2. Her eklenti icin `triggers` listesini kontrol et:
   - `module: X` → `manifest.modules.active` veya `manifest.modules.standalone` icinde `X` var mi?
   - `stack: [X, Y]` → `manifest.stack.runtime`, `manifest.stack.detected` veya `manifest.modules.active.backend/frontend/mobile` icinde herhangi biri var mi?
   - `condition: "alan == deger"` → Manifest'teki alan belirtilen degere esit mi?
   - `condition: "alan >= sayi"` → Manifest'teki alan belirtilen sayidan buyuk veya esit mi?
3. Herhangi bir trigger eslesiyor → eklentiyi oneri listesine ekle
4. `conflicts` alani doluysa → uyari ekle ("Agentbase zaten [ozellik] iceriyor")

#### Cakisma Kontrolu

Eklentinin `conflicts` alaninda listelenen Agentbase ozellikleriyle cakisma varsa, oneri yanina uyari ekle:

```
⚠️  Bu eklenti Agentbase'in [ozellik] ozelligi ile cakisabilir.
    [cakisma aciklamasi]
```

#### Rapor Ciktisi

Eslesen eklentiler varsa raporun sonuna ekle:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧩 Onerilen Eklentiler (projenize uygun)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [Kategori]:
    [Eklenti Adi] — [aciklama]
      Kurulum: [install komutu]
      [varsa: ⚠️  Cakisma notu]

  [Baska Kategori]:
    ...

  Not: Bu oneriler OPSIYONELDIR. Hicbiri Bootstrap icin zorunlu degildir.
  Eklenti havuzunu genisletmek icin: templates/extensions-registry.yaml
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Eslesen eklenti yoksa bu bolumu ATLA — gereksiz bos bolum gosterme.

---

## HATA YONETIMI

Bu kurallari tum adimlar boyunca uygula:

1. **Bash komutu basarisiz olursa:** Hatayi kullaniciya goster, mumkunse alternatif dene, degiilse o adimi atlayip devam et (kritik adimlar haric).

2. **Template dosyasi bulunamazsa:** Uyari ver, o dosyayi atla, bos template ile devam et. Bootstrap'i DURDURMA.

3. **Dizin olusturulamazsa:** Hatayi goster ve DUR — dosya sistemi erisim sorunu kritik.

4. **Backlog komutu basarisizsa:** Uyari ver ama bootstrap'i tamamla. Backlog gorevleri sonra manuel olusturulabilir.

5. **Kullanici roportajda gecersiz cevap verirse:** Secenekleri tekrar goster, tekrar sor.

6. **Teammate basarisiz olursa (Adim 5):** Ayni prompt ile 1 kez retry yap. 2. basarisizlikta kullaniciya bildir ve secenek sun (manuel mudahale / atla / iptal). Basarili teammate'lerin ciktilari HER DURUMDA korunur. Kismi basarilarda uretilen dosyalar silinmez, sadece eksikler retry edilir. Detaylar icin bkz. Adim 5.2.3.

---

## TEKRAR CALISTIRMA DAVRANISI

`/bootstrap` tekrar calistirildiginda (manifest zaten mevcutsa):

1. Adim 1.3'te manifest uyumlulugunu kontrol et ve kullaniciya `overwrite` / `merge` / `incremental` / `iptal` menusu sun.
2. `manifest.version` ayni major surumdeyse `merge` ve `incremental` izinli; degilse yalnizca `overwrite` veya `iptal`.
3. `.claude/custom/` kullaniciya aittir; Bootstrap bu dizine yazmaz ve buradaki dosyalari korur.
4. Yonetilen dosyalarda checksum farki varsa dosyayi sessizce ezme:
   - `overwrite` modunda once rescue kopyasi al, sonra yeniden uret
   - `merge` / `incremental` modunda aday ciktiyi rescue alanina yaz ve kullaniciya raporla
5. `merge` modunda manifest cevaplarini koru, yeni modulleri ekle, artik tespit edilmeyen leaf'leri `modules.skipped` altina tasi.
6. `incremental` modunda yalnizca template'i veya ilgili manifest girdisi degisen dosyalari yeniden uret.
7. Backlog'a yeni bootstrap init gorevleri EKLEME (zaten mevcut backlog korunur).

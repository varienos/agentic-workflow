# Pre-Deploy — Coolify Production Push Kontrolu

> Coolify uzerinden production'a deploy oncesi tum kontrolleri calistirir, sonuc raporunu sunar.
> Kullanim: `/pre-deploy`

---

## Kural: OTONOM CALIS

- Kullaniciya soru SORMA — tum kontrolleri sirayla calistir.
- Hic bir seyi PUSH etme — sadece kontrol et ve raporla.
- Hata bulursan DUZELTME — raporla ve kullaniciya birak.
- Tum adimlari CALISTIR — bir adimi atlama.

---

<!-- GENERATE: CODEBASE_CONTEXT
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.description, stack.primary, project.structure, project.subprojects
Ornek cikti:
## Proje Baglami
- **Proje:** SaaS API platformu (NestJS + PostgreSQL)
- **Stack:** TypeScript, Prisma, PostgreSQL, Redis
- **Deploy:** Coolify (self-hosted, Hetzner VPS)
- **Yapi:**
  - `apps/api/` — NestJS backend
  - `apps/web/` — Next.js frontend
  - `packages/shared/` — Ortak kutuphaneler
Kutsal Kurallar:
- Config dosyalari SADECE Agentbase icinde yasar
- Codebase icinde `.claude/` OLUSTURULMAZ
- Git sadece Codebase de calisir
-->

---

## Step 1 — Baslangic Kontrolu (Git Durumu + Branch)

```bash
cd ../Codebase && git status && git branch --show-current && git log --oneline -1
```

Kontrol et:
- [ ] Commit edilmemis degisiklik var mi?
- [ ] Hangi branch'tesin? (main/master disinda UYAR — Coolify genellikle main push'ta otomatik deploy yapar)
- [ ] Remote ile senkron mu? (`git status` ciktisinda "ahead/behind" kontrolu)

Eger commit edilmemis degisiklik varsa:
```
FAIL: Commit edilmemis degisiklikler var. Once commit atilmali.
```

Eger branch main/master degilse:
```
WARN: Su an '{branch}' branch'indesin. Coolify otomatik deploy genellikle main branch'e push ile tetiklenir.
```

---

## Step 2 — Degisiklik Ozeti

Son deploy'dan bu yana yapilan degisiklikleri listele:

```bash
cd ../Codebase && git log --oneline HEAD~20..HEAD
```

Degisiklikleri kategorize et:
- **Yeni ozellikler** (feat:)
- **Hata duzeltmeleri** (fix:)
- **Yikici degisiklikler** (breaking change iceren commit'ler)
- **Veritabani degisiklikleri** (migration iceren commit'ler)
- **Altyapi degisiklikleri** (Dockerfile, docker-compose, entrypoint.sh, CI/CD)

Onemli: Dockerfile, docker-compose.prod.yml veya entrypoint.sh degismisse bunu ozellikle vurgula — Coolify bunlari kullanarak build yapar.

---

## Step 3 — Derleme Kontrolu

Tum alt projelerin basariyla derlendigi dogrulanir.

<!-- GENERATE: COMPILE_COMMANDS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.subprojects, project.scripts, stack.primary
Ornek cikti:
| Alt Proje | Komut | Beklenen Sonuc |
|---|---|---|
| API | `cd ../Codebase/apps/api && npx tsc --noEmit` | Tip hatasi yok |
| Web | `cd ../Codebase/apps/web && npm run build` | Build basarili |
| Shared | `cd ../Codebase/packages/shared && npx tsc --noEmit` | Tip hatasi yok |
-->

Her komutu calistir. Hata varsa kaydet, durma — sonraki adima gec.

---

## Step 4 — Test Suiti

Tum testleri calistir.

<!-- GENERATE: TEST_COMMANDS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.subprojects, project.scripts, stack.test_framework
Ornek cikti:
| Alt Proje | Komut | Tip |
|---|---|---|
| API (unit) | `cd ../Codebase/apps/api && npm run test` | Jest birim testleri |
| API (e2e) | `cd ../Codebase/apps/api && npm run test:e2e` | Uctan uca testler |
| Web (unit) | `cd ../Codebase/apps/web && npm run test` | Vitest birim testleri |
-->

Her testi calistir. Basarisiz testleri kaydet, durma — sonraki adima gec.

---

## Step 5 — Veritabani Migration Kontrolu

Migration durumunu kontrol et. Eger ORM modulu aktifse, o modulun migration kontrol mekanizmasini kullan.

```bash
# Prisma kontrolu
cd ../Codebase && npx prisma migrate status 2>/dev/null || echo "Prisma yok veya baglanti hatasi"

# TypeORM kontrolu (alternatif)
cd ../Codebase && npx typeorm migration:show 2>/dev/null || true

# Drizzle kontrolu (alternatif)
cd ../Codebase && npx drizzle-kit check 2>/dev/null || true
```

Kontrol et:
- [ ] Uygulanmamis migration var mi? → Varsa FAIL (Coolify entrypoint.sh icinde migration calisacak — migration dosyasi commit edilmis olmali)
- [ ] Migration dosyalari commit edilmis mi?
- [ ] Yikici migration var mi? (DROP TABLE, DROP COLUMN, ALTER COLUMN type change)

Eger yikici migration varsa:
```
WARN: Yikici migration tespit edildi. Coolify otomatik rollback yaparsa eski container eski sema ile calisir — veri kaybi riski var.
```

---

## Step 6 — Ortam Degiskeni Senkronizasyonu

Production ortam degiskenlerinin tutarli oldugunu dogrula.

<!-- GENERATE: ENV_CHECKS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: environments.env_files, environments.required_vars, stack.validation
Ornek cikti:
### Kontrol Edilecek Ortam Degiskenleri

**Zod schema:** `apps/api/src/config/env.ts`
**Docker Compose:** `docker-compose.prod.yml`
**Env ornegi:** `.env.example`

| Degisken | Zorunlu | Kontrol |
|---|---|---|
| DATABASE_URL | Evet | Zod + docker-compose + .env.example |
| JWT_SECRET | Evet | Zod + .env.example |
| REDIS_URL | Evet | Zod + docker-compose |
| COOLIFY_URL | Hayir | Coolify dashboard'dan yonetilir |
-->

### 6a — Kaynak Karsilastirmasi

Uc kaynagi karsilastir:

```bash
# Zod schema'dan beklenen degiskenleri cikart (varsa)
cd ../Codebase && grep -oE '[A-Z_]{3,}' apps/api/src/config/env.ts 2>/dev/null | sort -u || echo "Zod schema bulunamadi"

# docker-compose.prod.yml'dan environment degiskenlerini cikart
cd ../Codebase && grep -A 50 'environment:' docker-compose.prod.yml 2>/dev/null | grep -oE '\$\{[A-Z_]+\}' | tr -d '${|}' | sort -u || echo "docker-compose.prod.yml bulunamadi"

# .env.example'dan degiskenleri cikart
cd ../Codebase && grep -E '^[A-Z_]+=' .env.example 2>/dev/null | cut -d= -f1 | sort -u || echo ".env.example bulunamadi"
```

Her uc kaynakta da tanimli olmasi gereken degiskenleri karsilastir. Eksik varsa FAIL.

### 6b — Guvenlik Kontrolleri

```bash
cd ../Codebase

# NODE_ENV kontrolu — docker-compose.prod.yml icinde "production" olmali
grep -E 'NODE_ENV' docker-compose.prod.yml 2>/dev/null || echo "NODE_ENV tanimli degil"

# CORS origin kontrolu — localhost veya wildcard olmamali
grep -rn 'CORS\|cors\|origin' --include="*.ts" --include="*.js" --include="*.yml" --include="*.yaml" . 2>/dev/null | grep -iE 'localhost|127\.0\.0\.1|\*' | grep -v node_modules | grep -v '.test.' | grep -v '.spec.' || echo "CORS sorunu yok"

# Localhost leak taramasi — test dosyalari HARIC hardcoded localhost
grep -rn 'localhost\|127\.0\.0\.1' --include="*.ts" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v '.test.' | grep -v '.spec.' | grep -v '.mock.' | grep -v '__test__' | grep -v 'README' | head -20 || echo "Localhost referansi yok"

# JWT/secret placeholder kontrolu
grep -rn 'your-secret\|changeme\|CHANGE_ME\|TODO.*secret\|placeholder' --include="*.ts" --include="*.js" --include="*.env*" --include="*.yml" . 2>/dev/null | grep -v node_modules | grep -v '.test.' | head -10 || echo "Placeholder yok"
```

| Kontrol | Durum | Kural |
|---|---|---|
| NODE_ENV = production | Zorunlu | FAIL eger "production" degilse |
| CORS origin | Zorunlu | FAIL eger localhost veya * iceriyorsa |
| Localhost leak | Uyari | WARN eger non-test dosyada localhost varsa |
| JWT/secret placeholder | Zorunlu | FAIL eger placeholder deger varsa |

---

## Step 7 — Docker Build Kontrolu (Opsiyonel)

Coolify Docker uzerinden build yapar. Lokal Docker build testi opsiyoneldir.

### Tetikleme Kosullari

Bu adim SADECE asagidaki dosyalardan biri degismisse calistirilir:

```bash
cd ../Codebase && git diff --name-only HEAD~5..HEAD | grep -E 'Dockerfile|docker-compose|entrypoint\.sh|package.*\.json' || echo "Docker-related degisiklik yok"
```

Eger degisiklik yoksa bu adimi ATLA, raporda SKIP olarak isaretle.

<!-- GENERATE: DEPLOY_CONFIG
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: environments.deploy_platform, environments.docker_compose, project.subprojects
Ornek cikti:
### Docker Build Komutlari

| Servis | Komut |
|---|---|
| API | `cd ../Codebase && docker build -f apps/api/Dockerfile -t coolify-api-test .` |
| Web | `cd ../Codebase && docker build -f apps/web/Dockerfile -t coolify-web-test .` |

### Docker Compose Dosyalari
- Production: `../Codebase/docker-compose.prod.yml`
- Development: `../Codebase/docker-compose.yml`

### Entrypoint Kontrolu
```bash
cd ../Codebase && cat entrypoint.sh 2>/dev/null || echo "entrypoint.sh yok"
```

### Health Check Konfigurasyonu
- API: `http://localhost:3000/health`
- Interval: 30s, Timeout: 10s, Retries: 3

### Coolify Build Bilgileri
- Coolify build sirasinda `docker build` calistirir
- `entrypoint.sh` container baslatildiginda calisir (migration, seed vb.)
- Health check basarisiz olursa Coolify eski container'i korur (otomatik rollback)
-->

Eger Docker build calistirilacaksa:

```bash
# entrypoint.sh'nin executable oldugunu kontrol et
cd ../Codebase && test -f entrypoint.sh && ls -la entrypoint.sh | grep -q 'x' && echo "entrypoint.sh executable" || echo "WARN: entrypoint.sh executable degil veya yok"

# Dockerfile syntax kontrolu (hadolint varsa)
cd ../Codebase && which hadolint > /dev/null 2>&1 && hadolint Dockerfile || echo "hadolint yuklu degil, Dockerfile syntax kontrolu atlandi"
```

> **NOT:** Docker build uzun surebilir. `SKIP_DOCKER_BUILD` flag'i varsa bu adimi atla.

---

## Step 8 — Sonuc Raporu

Tum adimlarin sonuclarini asagidaki formatta raporla:

```
## Pre-Deploy Raporu (Coolify)

### Genel Durum: [PASS / FAIL / WARN]

### Degisiklik Ozeti
- X yeni ozellik, Y hata duzeltme, Z diger
- Yikici degisiklik: [var/yok]
- DB migration: [var/yok]
- Altyapi degisikligi: [var/yok] (Dockerfile, docker-compose, entrypoint.sh)

### Kontrol Sonuclari

| # | Adim | Durum | Detay |
|---|---|---|---|
| 1 | Git durumu | PASS/FAIL | ... |
| 2 | Degisiklik ozeti | INFO | X commit, Y degisiklik |
| 3 | Derleme | PASS/FAIL | ... |
| 4 | Testler | PASS/FAIL | X/Y gecti |
| 5 | Migration | PASS/FAIL/WARN | ... |
| 6 | Env senkronizasyonu | PASS/FAIL | ... |
| 7 | Docker build | PASS/FAIL/SKIP | ... |

### Basarisiz Kontroller
[varsa detayli liste — hangi adim, hangi hata, ne yapilmali]

### Coolify Deploy Notu
- Push yapildiginda Coolify otomatik build baslatacak
- Build suresi tahmini: ~60-90 saniye
- Health check basarisiz olursa Coolify eski container'i korur
- Deploy sonrasi `/post-deploy` komutu ile dogrulama yapilmali

### Oneriler
[varsa aksiyonlar]
```

---

## Karar Matrisi

| Durum | Karar | Aksiyon |
|---|---|---|
| Tum adimlar PASS | PASS | Deploy edilebilir — `git push origin main` |
| Tum PASS, bazi WARN | WARN | Deploy edilebilir — uyarilari gozden gecir |
| Testler FAIL | FAIL | Deploy edilemez, testler duzeltilmeli |
| Derleme FAIL | FAIL | Deploy edilemez, derleme hatalari duzeltilmeli |
| Migration eksik | FAIL | Migration dosyasi commit edilmeli |
| Env eksik/uyumsuz | FAIL | Ortam degiskenleri tamamlanmali |
| NODE_ENV != production | FAIL | docker-compose.prod.yml'da NODE_ENV=production olmali |
| CORS localhost/wildcard | FAIL | CORS konfigurasyonu duzeltilmeli |
| Secret placeholder | FAIL | Placeholder degerler gercek degerlerle degistirilmeli |
| Docker build FAIL | WARN | Docker build sorunu arastirilmali (Coolify'da da basarisiz olacak) |
| Commit edilmemis degisiklik | FAIL | Once commit atilmali |
| SKIP (tetikleme kosulu yok) | — | Atlanan adimlar sonucu etkilemez |

---

## Zorunlu Kurallar

### Kutsal Kurallar (Her Komutta Gecerli)

1. **Codebase e config YAZMA** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` dosyalari SADECE Agentbase icinde olusturulur. Codebase icinde `.claude/` dizini olusturma, `../Codebase/CLAUDE.md` yazma YASAK.
2. **Git sadece Codebase de** — Tum git islemleri (commit, push, branch) `../Codebase/` icinde yapilir. Agentbase'de git YOKTUR.
3. **Codebase OKUNUR, config YAZILMAZ** — Proje dosyalari (`src/`, `app/`, vb.) okunabilir ve gorev gerekiyorsa duzenlenebilir. Config dosyalari (`.claude/`, `CLAUDE.md`) Codebase icinde YAZILAMAZ.

1. **Soru sorma** — Tum kontrolleri sessizce calistir, sadece sonuc raporunu goster.
2. **Push etme** — Bu komut sadece kontrol eder, hicbir seyi push etmez.
3. **Duzeltme yapma** — Hata bulursan raporla, duzeltmeye calisma.
4. **Tum adimlari calistir** — Bir adim basarisiz olsa bile sonraki adima gec.
5. **SKIP != FAIL** — Atlanan adimlar (tetikleme kosulu saglanmamis) sonucu etkilemez.
6. **Missing migration = FAIL** — Commit edilmemis migration dosyasi her zaman FAIL.
7. **Kisa rapor** — Gereksiz detaydan kacin, sadece durum + aksiyon.
8. **Sonuc raporu ZORUNLU** — Her durumda Step 8 raporu olusturulmali.

<!-- GENERATE: SELF_REFRESH
Aciklama: Komut son adim - self-refresh check. Bootstrap bu marker-i ortak
Self-Refresh bolumu ile degistirir. Komut kendi metnini proje gerceginin
isiginda gozden gecirir: kucuk uyumsuzluk Edit ile, buyuk degisim backlog
task-i olarak rapor edilir.
-->

# Pre-Deploy — Production Push Kontrolu

> Production'a gondermeden once tum kontrolleri calistirir, sonuc raporunu sunar.
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
- **Proje:** E-ticaret platformu (Next.js + NestJS + React Native)
- **Stack:** TypeScript, Prisma, PostgreSQL, Expo
- **Yapi:**
  - `apps/web/` — Next.js frontend
  - `apps/api/` — NestJS backend
  - `apps/mobile/` — Expo React Native
Kutsal Kurallar:
- Config dosyalari SADECE Agentbase icinde yasar
- Codebase icinde `.claude/` OLUSTURULMAZ
- Git sadece Codebase de calisir
-->

---

## Step 1 — Baslangic Kontrolu

```bash
cd ../Codebase && git status
```

Kontrol et:
- [ ] Commit edilmemis degisiklik var mi?
- [ ] Hangi branch'tesin? (main/master disinda UYAR)
- [ ] Remote ile senkron mu?

Eger commit edilmemis degisiklik varsa:
```
⚠️ Commit edilmemis degisiklikler var. Once commit atilmali.
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
| Shared | `cd ../Codebase/packages/shared && npm run test` | Birim testleri |
-->

Her testi calistir. Basarisiz testleri kaydet, durma — sonraki adima gec.

---

## Step 5 — Veritabani Migration Kontrolu

Migration durumunu kontrol et:
- Uygulanmamis migration var mi?
- Migration dosyalari commit edilmis mi?
- Yikici migration var mi? (DROP TABLE, DROP COLUMN)

```bash
cd ../Codebase && npx prisma migrate status 2>/dev/null || echo "Prisma yok veya baglanti hatasi"
```

---

## Step 6 — Ortam Degiskeni Senkronizasyonu

Production ortam degiskenlerinin tanimli oldugunu dogrula.

<!-- GENERATE: ENV_CHECKS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: environments.env_files, environments.required_vars, stack.validation
Ornek cikti:
### Kontrol Edilecek Ortam Degiskenleri

**Kaynak:** `.env.example` veya Zod schema (`apps/api/src/config/env.ts`)

| Degisken | Zorunlu | Kontrol Yontemi |
|---|---|---|
| DATABASE_URL | Evet | `.env` icinde tanimli mi? |
| JWT_SECRET | Evet | `.env` icinde tanimli mi? |
| REDIS_URL | Evet | `.env` icinde tanimli mi? |
| SMTP_HOST | Hayir | Opsiyonel |

**Docker Compose kontrol:**
```bash
cd ../Codebase && grep -E '^\s+\w+:$' docker-compose.yml | head -20
```
-->

---

## Step 7 — Docker Build Kontrolu (Opsiyonel)

Docker image basariyla build edilebildigini dogrula:

<!-- GENERATE: DEPLOY_CONFIG
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: environments.deploy_platform, environments.docker_compose, project.subprojects
Ornek cikti:
### Docker Build Komutlari

| Servis | Komut |
|---|---|
| API | `cd ../Codebase && docker build -f apps/api/Dockerfile -t api-test .` |
| Web | `cd ../Codebase && docker build -f apps/web/Dockerfile -t web-test .` |

### Docker Compose Dosyalari
- Production: `../Codebase/docker-compose.prod.yml`
- Development: `../Codebase/docker-compose.yml`

### Health Check URL'leri
- API: `http://localhost:3000/health`
- Web: `http://localhost:3001`
-->

> **NOT:** Docker build uzun surebilir. Eger `SKIP_DOCKER_BUILD` flag'i varsa bu adimi atla.

---

## Step 8 — Sonuc Raporu

Tum adimlarin sonuclarini asagidaki formatta raporla:

```
## 📋 Pre-Deploy Raporu

### Genel Durum: [PASS ✅ / FAIL ❌ / WARN ⚠️]

### Degisiklik Ozeti
- X yeni ozellik, Y hata duzeltme, Z diger
- Yikici degisiklik: [var/yok]
- DB migration: [var/yok]

### Kontrol Sonuclari

| Adim | Durum | Detay |
|---|---|---|
| Git durumu | ✅/❌ | ... |
| Derleme | ✅/❌ | ... |
| Testler | ✅/❌ | X/Y gecti |
| Migration | ✅/❌/⚠️ | ... |
| Env sync | ✅/❌ | ... |
| Docker build | ✅/❌/⏭️ | ... |

### Basarisiz Kontroller
[varsa detayli liste]

### Oneriler
[varsa aksiyonlar]
```

---

## Karar Matrisi

| Durum | Karar | Aksiyon |
|---|---|---|
| Tum adimlar PASS | ✅ PASS | Deploy edilebilir |
| Testler FAIL | ❌ FAIL | Deploy edilemez, testler duzeltilmeli |
| Derleme FAIL | ❌ FAIL | Deploy edilemez, derleme hatalari duzeltilmeli |
| Env eksik | ❌ FAIL | Ortam degiskenleri tamamlanmali |
| Migration uyarisi | ⚠️ WARN | Deploy edilebilir, dikkatli olunmali |
| Docker build FAIL | ⚠️ WARN | Docker build sorunu arastirilmali |
| Commit edilmemis degisiklik | ❌ FAIL | Once commit atilmali |

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
5. **Sonuc raporu ZORUNLU** — Her durumda Step 8 raporu olusturulmali.

<!-- GENERATE: SELF_REFRESH
Aciklama: Komut son adim - self-refresh check. Bootstrap bu marker-i ortak
Self-Refresh bolumu ile degistirir. Komut kendi metnini proje gerceginin
isiginda gozden gecirir: kucuk uyumsuzluk Edit ile, buyuk degisim backlog
task-i olarak rapor edilir.
-->

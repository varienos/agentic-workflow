# Post-Deploy — Deploy Dogrulama

> Deploy sonrasinda production ortaminin sagligini dogrular.
> Kullanim: `/post-deploy`

---

## Kural: OTONOM CALIS

- Kullaniciya soru SORMA — tum kontrolleri sirayla calistir.
- Hicbir seyi DEGISTIRME — sadece kontrol et ve raporla.
- Tum adimlari CALISTIR — bir adimi atlama.
- Rollback gerekirse TALIMAT ver, kendin yapma.

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
-->

---

## Step 1 — Bekleme Suresi

Deploy isleminin tamamlanmasini bekle:

```bash
echo "Deploy sonrasi bekleniyor (30 saniye)..." && sleep 30
```

> Deploy platformuna gore bu sure degisebilir. Container'larin ayaga kalkmasini beklemek gerekir.

---

## Step 2 — Health Check

Production ortaminin saglik durumunu kontrol et.

<!-- GENERATE: HEALTH_CHECK_URL
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: environments.health_check, environments.production_url
Ornek cikti:
### Health Check Endpoint'leri

| Servis | URL | Beklenen | Timeout |
|---|---|---|---|
| API | `https://api.example.com/health` | HTTP 200 + `{"status":"ok"}` | 10s |
| Web | `https://www.example.com` | HTTP 200 | 10s |
| WebSocket | `wss://api.example.com/ws` | Baglanti basarili | 5s |

```bash
curl -sf --max-time 10 https://api.example.com/health | jq .
curl -sf --max-time 10 -o /dev/null -w "%{http_code}" https://www.example.com
```
-->

Her endpoint icin 3 deneme yap (5 saniye arayla). 3 denemede de basarisiz olursa FAIL olarak isaretle.

---

## Step 3 — Smoke Test

Temel kullanici akislarinin calistigini dogrula.

<!-- GENERATE: SMOKE_TEST_ENDPOINTS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: environments.production_url, project.api_endpoints
Ornek cikti:
### Smoke Test Endpoint'leri

| Test | Method | URL | Beklenen |
|---|---|---|---|
| Ana sayfa | GET | `https://www.example.com` | HTTP 200 |
| API root | GET | `https://api.example.com/api/v1` | HTTP 200 |
| Auth health | GET | `https://api.example.com/api/v1/auth/health` | HTTP 200 |
| Public listing | GET | `https://api.example.com/api/v1/products?limit=1` | HTTP 200 + JSON array |

```bash
# Smoke test ornegi
curl -sf --max-time 10 "https://api.example.com/api/v1/products?limit=1" | jq 'length'
```
-->

---

## Step 4 — Migration Durumu

Veritabani migration'larinin basariyla uygulandigini dogrula:

```bash
cd ../Codebase && npx prisma migrate status 2>/dev/null || echo "Prisma kontrol edilemiyor"
```

Kontrol et:
- [ ] Tum migration'lar uygulanmis mi?
- [ ] Bekleyen migration var mi?

---

## Step 5 — Versiyon Dogrulama

Deploy edilen versiyonun beklenen versiyon oldugunu dogrula:

```bash
# Lokal versiyon
cd ../Codebase && git rev-parse --short HEAD

# Production versiyon (health endpoint'ten)
# curl -sf https://api.example.com/health | jq '.version'
```

Lokal commit hash ile production'daki hash eslesiyorsa PASS.

---

## Step 6 — Platform Kontrolleri

Deploy platformuna ozgu kontrolleri calistir.

<!-- GENERATE: DEPLOY_PLATFORM
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: environments.deploy_platform, environments.deploy_config
Ornek cikti:
### Coolify Platform Kontrolleri

```bash
# Container durumu
ssh deploy@server "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep myapp"

# Container loglari (son 20 satir)
ssh deploy@server "docker logs --tail 20 myapp-api"

# Disk kullanimi
ssh deploy@server "df -h | head -5"

# Memory kullanimi
ssh deploy@server "free -h"
```

### Kontrol Edilecekler
- [ ] Tum container'lar "Up" durumunda mi?
- [ ] Container restart dongusu yok mu? (restart count kontrol et)
- [ ] Disk dolulugu %90'in altinda mi?
- [ ] Memory kullanimi normal aralikta mi?
-->

---

## Step 7 — Deploy Logu

Deploy sonucunu kaydet.

<!-- GENERATE: DEPLOY_LOG_PATH
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.structure, conventions.log_path
Ornek cikti:
### Log Kaydi

Deploy sonucunu asagidaki dosyaya kaydet:

```bash
echo "$(date '+%Y-%m-%d %H:%M:%S') | $(cd ../Codebase && git rev-parse --short HEAD) | [DURUM] | [OZET]" >> ../Codebase/deploy.log
```

**Log formati:**
```
TARIH | COMMIT | DURUM | OZET
2024-01-15 14:30:00 | a1b2c3d | DEPLOY_OK | 3 ozellik, 0 hata
2024-01-14 10:00:00 | d4e5f6g | DEPLOY_WARN | health check 2. denemede gecti
```

**Log dosyasi:** `../Codebase/deploy.log`
-->

---

## Step 8 — Sonuc Raporu

```
## 🚀 Post-Deploy Raporu

### Genel Durum: [DEPLOY_OK ✅ / DEPLOY_WARN ⚠️ / DEPLOY_FAIL ❌]

### Deploy Bilgileri
- **Commit:** <hash>
- **Tarih:** <tarih>
- **Platform:** <platform>

### Kontrol Sonuclari

| Adim | Durum | Detay |
|---|---|---|
| Health check | ✅/❌ | ... |
| Smoke test | ✅/❌ | X/Y gecti |
| Migration | ✅/❌/⏭️ | ... |
| Versiyon | ✅/❌ | ... |
| Platform | ✅/❌ | ... |

### Basarisiz Kontroller
[varsa detayli liste]

### Rollback Gerekli mi?
[EVET: rollback talimatlari / HAYIR]
```

---

## Karar Matrisi

| Durum | Karar | Aksiyon |
|---|---|---|
| Tum kontroller PASS | ✅ DEPLOY_OK | Deploy basarili |
| Health check FAIL | ❌ DEPLOY_FAIL | Rollback gerekli |
| Smoke test kismi FAIL | ⚠️ DEPLOY_WARN | Etkilenen ozellikler arastirilmali |
| Migration FAIL | ❌ DEPLOY_FAIL | Rollback gerekli |
| Versiyon uyumsuz | ⚠️ DEPLOY_WARN | Deploy islemi kontrol edilmeli |
| Platform sorunlu | ⚠️ DEPLOY_WARN | Altyapi kontrolu gerekli |

---

## Rollback Rehberi

Eger DEPLOY_FAIL durumu olusursa:

1. **Onceki versiyon belirle:**
   ```bash
   cd ../Codebase && git log --oneline -5
   ```

2. **Platform rollback:**
   - Coolify: Onceki deployment'a geri don
   - Docker: `docker-compose -f docker-compose.prod.yml down && git checkout <onceki_hash> && docker-compose -f docker-compose.prod.yml up -d`
   - Vercel/Netlify: Dashboard'dan onceki deployment'a rollback

3. **Migration rollback (gerekirse):**
   > ⚠️ Migration rollback risklidir. Sadece bu deploy'da eklenen migration'lar geri alinmali.

4. **Dogrulama:**
   Rollback sonrasi `/post-deploy` komutunu tekrar calistir.

---

## Zorunlu Kurallar

### Kutsal Kurallar (Her Komutta Gecerli)

1. **Codebase e config YAZMA** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` dosyalari SADECE Agentbase icinde olusturulur. Codebase icinde `.claude/` dizini olusturma, `../Codebase/CLAUDE.md` yazma YASAK.
2. **Git sadece Codebase de** — Tum git islemleri (commit, push, branch) `../Codebase/` icinde yapilir. Agentbase'de git YOKTUR.
3. **Codebase OKUNUR, config YAZILMAZ** — Proje dosyalari (`src/`, `app/`, vb.) okunabilir ve gorev gerekiyorsa duzenlenebilir. Config dosyalari (`.claude/`, `CLAUDE.md`) Codebase icinde YAZILAMAZ.

1. **Soru sorma** — Tum kontrolleri sessizce calistir, sadece sonuc raporunu goster.
2. **Degisiklik yapma** — Bu komut sadece kontrol eder, hicbir seyi degistirmez.
3. **Rollback yapma** — Rollback gerekirse TALIMAT ver, kendin uygulama.
4. **Tum adimlari calistir** — Bir adim basarisiz olsa bile sonraki adima gec.
5. **Deploy logu ZORUNLU** — Her durumda Step 7 log kaydi olusturulmali.
6. **Sonuc raporu ZORUNLU** — Her durumda Step 8 raporu olusturulmali.

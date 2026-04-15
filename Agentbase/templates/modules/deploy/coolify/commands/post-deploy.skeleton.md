# Post-Deploy — Coolify Deploy Dogrulama

> Coolify uzerinden deploy sonrasinda production ortaminin sagligini dogrular.
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
- **Proje:** SaaS API platformu (NestJS + PostgreSQL)
- **Stack:** TypeScript, Prisma, PostgreSQL, Redis
- **Deploy:** Coolify (self-hosted, Hetzner VPS)
- **Yapi:**
  - `apps/api/` — NestJS backend
  - `apps/web/` — Next.js frontend
Kutsal Kurallar:
- Config dosyalari SADECE Agentbase icinde yasar
- Codebase icinde `.claude/` OLUSTURULMAZ
- Git sadece Codebase de calisir
-->

---

## Step 1 — Deploy Bekleme Suresi

Coolify build + deploy isleminin tamamlanmasini bekle:

```bash
echo "Coolify build + deploy bekleniyor (90 saniye)..." && sleep 90
```

> **NOT:** Coolify build suresi projeye gore degisir. Tipik sureler:
> - Basit Node.js uygulamasi: 30-60 saniye
> - Multi-stage Docker build: 60-120 saniye
> - Monorepo build: 90-180 saniye
>
> Build tamamlandigini Coolify dashboard'dan kontrol edebilirsiniz.

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

```bash
# API health check
curl -sf --max-time 10 https://api.example.com/health | jq .

# Web health check
curl -sf --max-time 10 -o /dev/null -w "%{http_code}" https://www.example.com
```
-->

### Retry Mekanizmasi

Her endpoint icin 3 deneme yap (15 saniye arayla — Coolify container'in ayaga kalkmasi icin daha uzun aralik):

```
Deneme 1 → basarisiz → 15 saniye bekle
Deneme 2 → basarisiz → 15 saniye bekle
Deneme 3 → basarisiz → FAIL
```

3 denemede de basarisiz olursa FAIL olarak isaretle.

### Coolify-Spesifik Health Check Bilgisi

Coolify kendi health check mekanizmasina sahiptir. Eger Coolify health check basarisiz olursa:
- Yeni container otomatik olarak durdurulur
- Eski container korunur ve trafik eski container'a yonlendirilir
- Bu durumda production hala eski versiyonda calisir

Bu komutu (`/post-deploy`) Coolify'in build + health check'i gectiginden emin olduktan sonra calistiriniz.

---

## Step 3 — Smoke Test

Temel kullanici akislarinin calistigini dogrula.

<!-- GENERATE: SMOKE_TEST_ENDPOINTS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: environments, api_endpoints, project.api_prefix
Ornek cikti:
## Smoke Test Endpoint'leri

| Endpoint | Beklenen | Auth |
|---|---|---|
| `GET https://api.example.com/health` | 200 OK | — |
| `GET https://api.example.com/api/v1/users` | 200 | Authorization gerekli |
| `POST https://api.example.com/api/v1/orders` | 201 | Authorization gerekli |
| `GET https://api.example.com/api/v1/products` | 200 | — |
-->

Her endpoint icin HTTP status code ve response body kontrol et. Beklenenden farkli bir yanit varsa WARN olarak isaretle.

---

## Step 4 — Migration Durumu

Veritabani migration'larinin basariyla uygulandigini dogrula.

Coolify'da migration genellikle `entrypoint.sh` icerisinde container basladiginda calistirilir. Bu adim migration'in tamamlandigini dogrulamali:

```bash
# Prisma migration durumu (lokal baglanti veya SSH uzerinden)
cd ../Codebase && npx prisma migrate status 2>/dev/null || echo "Prisma kontrol edilemiyor"
```

Kontrol et:
- [ ] Tum migration'lar uygulanmis mi?
- [ ] Bekleyen migration var mi?
- [ ] entrypoint.sh icinde migration komutu var mi?

```bash
# entrypoint.sh icindeki migration komutunu kontrol et
cd ../Codebase && grep -E 'migrate|migration' entrypoint.sh 2>/dev/null || echo "entrypoint.sh icinde migration komutu yok"
```

> **UYARI:** Eger entrypoint.sh icinde migration komutu yoksa ve yeni migration varsa, bu migration'lar UYGULANMAMIS olabilir.

---

## Step 5 — Versiyon Dogrulama

Deploy edilen versiyonun beklenen versiyon oldugunu dogrula:

```bash
# Lokal versiyon (son push edilen commit)
cd ../Codebase && git rev-parse --short HEAD
```

Production'daki versiyon kontrolu:

```bash
# Health endpoint'ten versiyon bilgisi (proje destekliyorsa)
# curl -sf https://api.example.com/health | jq '.version // .commit // .hash'

# Alternatif: Coolify API ile deploy durumu kontrolu
# curl -sf -H "Authorization: Bearer $COOLIFY_TOKEN" https://coolify.example.com/api/v1/applications/{uuid}/deployments | jq '.[0]'
```

Lokal commit hash ile production'daki hash eslesiyorsa PASS. Eslenemiyorsa WARN (versiyon bilgisi health endpoint'ten sunulmuyorsa bu normal olabilir).

---

## Step 6 — Sonuc Belirleme

Tum kontrol sonuclarini degerlendirerek nihai durumu belirle:

| Kombinasyon | Sonuc |
|---|---|
| Tum kontroller PASS | DEPLOY_OK |
| Health PASS, smoke kismi FAIL | DEPLOY_WARN |
| Versiyon dogrulanamadi ama health PASS | DEPLOY_WARN |
| Health check FAIL (3 denemede) | DEPLOY_FAIL |
| Migration uygulanmamis | DEPLOY_FAIL |
| Smoke test tamamen FAIL | DEPLOY_FAIL |

---

## Step 7 — Rollback Rehberi

> Bu bolum SADECE DEPLOY_FAIL durumunda gosterilir. DEPLOY_OK veya DEPLOY_WARN'da atla.

### Yontem 1 — Coolify Dashboard (Onerilen)

```
1. Coolify Dashboard'a git → Proje → Uygulamayi sec
2. "Deployments" sekmesine git
3. Son basarili deployment'i bul (yesil isaretli)
4. "Redeploy" butonuna tikla
5. Coolify eski image'dan yeni container olusturacak
6. Deploy tamamlaninca `/post-deploy` ile dogrula
```

### Yontem 2 — Coolify API ile Rollback

```bash
# Son basarili deployment'i bul
# curl -sf -H "Authorization: Bearer $COOLIFY_TOKEN" \
#   "https://coolify.example.com/api/v1/applications/{uuid}/deployments" | \
#   jq '[.[] | select(.status == "finished")] | .[0]'

# Redeploy tetikle
# curl -sf -X POST -H "Authorization: Bearer $COOLIFY_TOKEN" \
#   "https://coolify.example.com/api/v1/applications/{uuid}/restart"
```

### Yontem 3 — Git Revert (Son Care)

```bash
cd ../Codebase
git log --oneline -5          # Son basarili commit'i bul
git revert HEAD               # Son commit'i geri al
git push origin main          # Coolify otomatik olarak yeni build baslatacak
```

### Migration Rollback (Gerekirse)

> DIKKAT: Migration rollback risklidir. Sadece bu deploy'da eklenen migration'lar geri alinmali.

```bash
# Prisma — belirli migration'a geri don
# cd ../Codebase && npx prisma migrate resolve --rolled-back <migration_name>

# TypeORM
# cd ../Codebase && npx typeorm migration:revert
```

Eger yikici migration uygulandiysa (DROP TABLE, DROP COLUMN):
```
KRITIK: Yikici migration geri alinamaz. Veri kaybini engellemek icin:
1. Backup'tan restore yapin
2. Yeni migration ile eski semaya donun
3. Asla dogrudan DROP kullanmayin — once yeni kolonu ekle, veriyi tasi, sonra eski kolonu kaldir
```

### Coolify Otomatik Rollback Notu

Coolify, health check basarisiz oldugunda eski container'i otomatik olarak korur:
- Yeni container baslatilir → health check calistirilir → basarisiz → yeni container durdurulur
- Eski container hala calisir, trafik eski container'a yonlendirilir
- Bu durumda "rollback" zaten gerceklesmistir, ancak root cause arastirilmali

---

## Step 8 — Deploy Logu

Deploy sonucunu kaydet.

<!-- GENERATE: DEPLOY_LOG_PATH
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.structure, conventions.log_path
Ornek cikti:
### Log Kaydi

Deploy sonucunu asagidaki dosyaya kaydet:

```bash
mkdir -p ../.claude/reports/deploys
echo "$(date '+%Y-%m-%d %H:%M:%S') | $(cd ../Codebase && git rev-parse --short HEAD) | [DURUM] | Coolify | [OZET]" >> ../.claude/reports/deploys/deploy-log.md
```

### Detayli Rapor

Her deploy icin ayri bir dosya olustur:

```bash
cat > ../.claude/reports/deploys/deploy-$(date '+%Y%m%d-%H%M%S').md << 'DEPLOY_EOF'
# Deploy Raporu — {tarih}

- **Commit:** {hash}
- **Platform:** Coolify
- **Durum:** {DEPLOY_OK/DEPLOY_WARN/DEPLOY_FAIL}
- **Health Check:** {PASS/FAIL}
- **Smoke Test:** {X/Y gecti}
- **Migration:** {PASS/FAIL/N/A}
- **Versiyon:** {eslesti/eslenemedi}
- **Notlar:** {ek bilgi}
DEPLOY_EOF
```

**Log formati (ozet satiri):**
```
TARIH | COMMIT | DURUM | PLATFORM | OZET
2024-01-15 14:30:00 | a1b2c3d | DEPLOY_OK | Coolify | 3 ozellik, 0 hata
2024-01-14 10:00:00 | d4e5f6g | DEPLOY_WARN | Coolify | smoke test 1/3 basarisiz
```

**Log dizini:** `../.claude/reports/deploys/`
-->

---

## Step 9 — Sonuc Raporu

```
## Post-Deploy Raporu (Coolify)

### Genel Durum: [DEPLOY_OK / DEPLOY_WARN / DEPLOY_FAIL]

### Deploy Bilgileri
- **Commit:** <hash>
- **Tarih:** <tarih>
- **Platform:** Coolify (self-hosted)
- **Build Suresi:** ~<sure> (tahmini)

### Kontrol Sonuclari

| # | Adim | Durum | Detay |
|---|---|---|---|
| 1 | Bekleme | INFO | 90 saniye beklendi |
| 2 | Health check | PASS/FAIL | ... |
| 3 | Smoke test | PASS/FAIL | X/Y gecti |
| 4 | Migration | PASS/FAIL/N/A | ... |
| 5 | Versiyon | PASS/WARN | ... |

### Basarisiz Kontroller
[varsa detayli liste — hangi endpoint, hangi hata, HTTP status]

### Rollback Gerekli mi?
[EVET: yukaridaki rollback rehberini takip edin / HAYIR]

### Coolify Notlari
- Dashboard: [Coolify dashboard URL]
- Eger health check Coolify tarafinda da basarisiz olduysa, eski container otomatik korunmustur
- Sonraki deploy icin root cause cozulmelidir
```

---

## Karar Matrisi

| Durum | Karar | Aksiyon |
|---|---|---|
| Tum kontroller PASS | DEPLOY_OK | Deploy basarili |
| Health check FAIL | DEPLOY_FAIL | Rollback gerekli |
| Smoke test kismi FAIL | DEPLOY_WARN | Etkilenen ozellikler arastirilmali |
| Smoke test tamamen FAIL | DEPLOY_FAIL | Rollback gerekli |
| Migration FAIL | DEPLOY_FAIL | Rollback gerekli, migration kontrol edilmeli |
| Versiyon uyumsuz | DEPLOY_WARN | Coolify dashboard'dan deploy durumu kontrol edilmeli |
| Platform sorunlu | DEPLOY_WARN | Sunucu kaynaklari kontrol edilmeli |

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
5. **Deploy logu ZORUNLU** — Her durumda Step 8 log kaydi olusturulmali.
6. **Sonuc raporu ZORUNLU** — Her durumda Step 9 raporu olusturulmali.
7. **Rollback rehberi SADECE DEPLOY_FAIL'de** — DEPLOY_OK/WARN durumunda rollback bolumu gosterilmez.

<!-- GENERATE: SELF_REFRESH
Aciklama: Komut son adim - self-refresh check. Bootstrap bu marker-i ortak
Self-Refresh bolumu ile degistirir. Komut kendi metnini proje gerceginin
isiginda gozden gecirir: kucuk uyumsuzluk Edit ile, buyuk degisim backlog
task-i olarak rapor edilir.
-->

# Pre-Deploy — Vercel Production Push Kontrolu

> Vercel'e deploy oncesi tum kontrolleri calistirir, sonuc raporunu sunar.
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
- **Proje:** SaaS dashboard (Next.js + Tailwind)
- **Stack:** TypeScript, Next.js, Prisma, PostgreSQL
- **Yapi:**
  - `src/` — Next.js app directory
  - `prisma/` — Veritabani semasi
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

## Step 2 — TypeScript / Build Kontrolu

Tip hatalarini kontrol et:

<!-- GENERATE: BUILD_COMMANDS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.subprojects, project.scripts, stack.primary
Ornek cikti:
### Derleme Komutlari

| Kontrol | Komut | Beklenen Sonuc |
|---|---|---|
| TypeScript | `cd ../Codebase && npx tsc --noEmit` | Tip hatasi yok |
| ESLint | `cd ../Codebase && npm run lint` | Lint hatasi yok |
-->

Her komutu calistir. Hata varsa kaydet, durma — sonraki adima gec.

---

## Step 3 — Test Suiti

Tum testleri calistir.

<!-- GENERATE: TEST_COMMANDS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.subprojects, project.scripts, stack.test_framework
Ornek cikti:
### Test Komutlari

| Test | Komut | Tip |
|---|---|---|
| Birim testler | `cd ../Codebase && npm run test` | Jest/Vitest birim testleri |
| E2E testler | `cd ../Codebase && npm run test:e2e` | Playwright/Cypress testleri |
-->

Her testi calistir. Basarisiz testleri kaydet, durma — sonraki adima gec.

---

## Step 4 — Ortam Degiskeni Senkronizasyonu

Vercel ortam degiskenleri ile lokal `.env.local` dosyasini karsilastir:

```bash
# .env.local veya .env dosyasindaki degiskenleri listele
cd ../Codebase && grep -E '^[A-Z_]+=' .env.local 2>/dev/null | cut -d= -f1 | sort || echo ".env.local bulunamadi"
```

Kontrol et:
- [ ] `.env.local`'deki tum degiskenler Vercel dashboard'da tanimli mi?
- [ ] `NEXT_PUBLIC_` prefix'li degiskenler dogru mu? (client-side'da gorunur olacaklar)
- [ ] Hassas bilgiler (API key, secret) sadece server-side mi? (`NEXT_PUBLIC_` ile baslaMAMALI)

> **NOT:** `vercel env pull` komutu ile Vercel'deki env degiskenleri cekilebilir. Ancak bu komut otomatik calistirilMAZ — sadece uyumsuzluk varsa kullaniciya onerilir.

---

## Step 5 — Edge Function Dogrulama (Uygulanabilirse)

Edge runtime kullanan dosyalari kontrol et:

```bash
cd ../Codebase && grep -rl "runtime.*=.*'edge'" src/ app/ --include="*.ts" --include="*.tsx" 2>/dev/null || echo "Edge runtime kullanilmiyor"
```

Eger edge function varsa kontrol et:
- [ ] Node.js API'leri kullanilmiyor mu? (`fs`, `path`, `child_process` gibi — edge'de calismaz)
- [ ] Desteklenmeyen paketler yok mu? (edge runtime sinirli npm destegi sunar)
- [ ] `export const runtime = 'edge'` dogru dosyalarda mi?

Edge function yoksa bu adimi ATLA, raporda "N/A" olarak isaretle.

---

## Step 6 — Vercel Build Testi

<!-- GENERATE: VERCEL_CONFIG
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: environments.deploy_platform, project.scripts, stack.framework
Ornek cikti:
### Vercel Yapilandirmasi

**Build komutu:** `npm run build` veya `next build`
**Output dizini:** `.next`
**Framework:** Next.js

### Build Testi
```bash
cd ../Codebase && npm run build
```

### vercel.json Kontrolu
```bash
cd ../Codebase && cat vercel.json 2>/dev/null || echo "vercel.json yok (varsayilan ayarlar kullanilacak)"
```

### Kontrol Edilecekler
- [ ] `vercel.json` dosyasinda `regions` tanimli mi? (performans icin onemli)
- [ ] `headers`, `redirects`, `rewrites` dogru mu?
- [ ] `functions` konfigurasyonu (maxDuration, memory) uygun mu?
-->

Build komutunu calistir. Basarisiz olursa FAIL olarak isaretle.

> **NOT:** Build uzun surebilir. Eger `SKIP_BUILD_TEST` flag'i varsa bu adimi atla.

---

## Step 7 — Sonuc Raporu

Tum adimlarin sonuclarini asagidaki formatta raporla:

```
## 📋 Pre-Deploy Raporu (Vercel)

### Genel Durum: [PASS ✅ / FAIL ❌ / WARN ⚠️]

### Degisiklik Ozeti
- Son commit: <hash> — <mesaj>
- Branch: <branch_adi>

### Kontrol Sonuclari

| Adim | Durum | Detay |
|---|---|---|
| Git durumu | ✅/❌ | ... |
| TypeScript/Build | ✅/❌ | ... |
| Testler | ✅/❌ | X/Y gecti |
| Env senkronizasyonu | ✅/❌/⚠️ | ... |
| Edge function | ✅/⏭️ | ... |
| Build testi | ✅/❌/⏭️ | ... |

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
| TypeScript FAIL | ❌ FAIL | Deploy edilemez, tip hatalari duzeltilmeli |
| Build FAIL | ❌ FAIL | Deploy edilemez, build hatasi giderilmeli |
| Env eksik/uyumsuz | ⚠️ WARN | Vercel env degiskenleri kontrol edilmeli |
| Edge function uyarisi | ⚠️ WARN | Edge uyumluluk sorunu incelenmeli |
| Commit edilmemis degisiklik | ❌ FAIL | Once commit atilmali |

---

## Zorunlu Kurallar

### Kutsal Kurallar (Her Komutta Gecerli)

1. **Codebase e config YAZMA** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` dosyalari SADECE Agentbase icinde olusturulur. Codebase icinde `.claude/` dizini olusturma, `../Codebase/CLAUDE.md` yazma YASAK.
2. **Git sadece Codebase de** — Tum git islemleri (commit, push, branch) `../Codebase/` icinde yapilir. Agentbase'de git YOKTUR.
3. **Codebase OKUNUR, config YAZILMAZ** — Proje dosyalari (`src/`, `app/`, vb.) okunabilir ve gorev gerekiyorsa duzenlenebilir. Config dosyalari (`.claude/`, `CLAUDE.md`) Codebase icinde YAZILAMAZ.

1. **Soru sorma** — Tum kontrolleri sessizce calistir, sadece sonuc raporunu goster.
2. **Push etme** — Bu komut sadece kontrol eder, hicbir seyi push etmez.
3. **Deploy etme** — `vercel deploy` gibi komutlari CALISTIRMA.
4. **Duzeltme yapma** — Hata bulursan raporla, duzeltmeye calisma.
5. **Tum adimlari calistir** — Bir adim basarisiz olsa bile sonraki adima gec.
6. **Sonuc raporu ZORUNLU** — Her durumda Step 7 raporu olusturulmali.

<!-- GENERATE: SELF_REFRESH
Aciklama: Komut son adim - self-refresh check. Bootstrap bu marker-i ortak
Self-Refresh bolumu ile degistirir. Komut kendi metnini proje gerceginin
isiginda gozden gecirir: kucuk uyumsuzluk Edit ile, buyuk degisim backlog
task-i olarak rapor edilir.
-->

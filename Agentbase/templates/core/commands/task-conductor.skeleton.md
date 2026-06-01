# Task Conductor — Plan-First Faz Orkestratoru

> Backlog'daki birden fazla gorevi once faz planina donusturur; yalnizca acik `run` modunda uygular.
> Kullanim: `/task-conductor plan top 5`, `/task-conductor run top 5 --max-parallel 2`, `/task-conductor resume`, `/task-conductor status`, `/task-conductor abort`

---

## Temel Sozlesme

1. **Varsayilan mod PLAN'dir.** Kullanici `run` yazmadikca kod, backlog status'u, state veya git degisikligi yapma.
2. **`run` acik niyet ister.** Eski kullanimlar (`top 5`, `3,5,8`, `keyword auth`) geriye uyumluluk icin `plan ...` gibi yorumlanir.
3. **`run all` sadece `--confirm-all` ile calisir.** Tum acik backlog'u otonom calistirmak yuksek risklidir; bayrak yoksa plan uret ve dur.
4. **Paralel yazim sadece izole worktree/branch ile yapilir.** Izolasyon yoksa veya dogrulanamiyorsa ayni fazdaki gorevleri sirayla isle.
5. **Puanlama sozlesmesi `/task-master` ile aynidir.** Formul veya agirliklar degisecekse iki komut birlikte guncellenir.
6. **Resume sadece conductor state'inden devam eder.** State yoksa veya schema uyumsuzsa yeni run baslatma; kullaniciya rapor ver.

---

## Mod Cozumleme

| Komut | Ornek | Davranis |
|---|---|---|
| **Plan Top X** | `plan top 5` | En yuksek puanli X gorev icin faz/catisma plani uret, dur |
| **Plan All** | `plan all` | Tum acik gorevleri planla, run yapma |
| **Plan Manuel ID** | `plan 3,5,8` | Belirtilen gorevler icin plan uret |
| **Plan Keyword** | `plan keyword auth` | Anahtar kelimeyle eslesen gorevleri planla |
| **Run Top X** | `run top 5 --max-parallel 2` | Planla, on kontrolleri yap, uygun fazlari uygula |
| **Run All** | `run all --confirm-all` | Tum acik gorevleri yalnizca acik onay bayragiyla uygula |
| **Run Manuel ID** | `run 3,5,8` | Belirtilen gorevleri faz planina gore uygula |
| **Run Keyword** | `run keyword auth` | Eslesen gorevleri faz planina gore uygula |
| **Resume** | `resume` | `conductor-state.json` dosyasindan kaldigi yerden devam et |
| **Status** | `status` | State ve lock dosyalarindan mevcut durumu oku, hicbir sey degistirme |
| **Abort** | `abort` | Aktif state'i `aborted` isaretle, lock'u kaldir, kod degistirme |

### Geriye Uyumluluk

```
/task-conductor top 5        -> /task-conductor plan top 5
/task-conductor all          -> /task-conductor plan all
/task-conductor 3,5,8        -> /task-conductor plan 3,5,8
/task-conductor keyword auth -> /task-conductor plan keyword auth
```

> **KURAL:** Geriye uyumlu kisa kullanimlar ASLA otomatik run'a donusmez.

---

## On Kontrol

### Plan / Status

`plan` ve `status` read-only'dir:
- Git dirty state kontrolu bilgi amaclidir; dirty state varsa rapora ekle ama planlamayi durdurma.
- Backlog status'u, state dosyasi, lock dosyasi ve Codebase dosyalari degistirilmez.

### Run / Resume

Kod veya backlog degistirmeden once asagidaki kontrolleri yap:

```bash
cd ../Codebase && git status --porcelain
```

- Cikti BOSSA → devam et
- Cikti DOLUYSA → **DUR**, kullaniciya bildir:
  ```
  Calisma dizininde commit edilmemis degisiklikler var.
  Task Conductor run/resume baslatilmadi.
  Once bunlari commit'leyin veya stash'leyin.
  ```

Ek kontroller:
1. `.claude/tracking/conductor.lock` varsa ve aktif run'a ait degilse DUR, `status` oner.
2. `--max-parallel` yoksa varsayilan `1` kabul edilir.
3. `--max-parallel > 1` ise izole worktree/branch kullanilabildigini dogrula; dogrulanamiyorsa `max_parallel=1` olarak sirayla devam et ve rapora yaz.
4. `run all` icin `--confirm-all` yoksa run yapma; plan uret ve bayragi iste.

---

## Step 1 — Gorevleri Topla ve Puanla

### 1.1 — Gorev Toplama

```
backlog task list --plain
```

Moda gore gorevleri filtrele:
- `top X`: "Done" olmayan gorevleri puanla, en yuksek X gorevi sec
- `all`: "Done" olmayan tum gorevleri sec
- `3,5,8`: yalnizca belirtilen ID'leri sec
- `keyword auth`: once `backlog search "auth" --type task --plain`, gerekirse `backlog task list --plain` ile baslik/aciklama eslesmesi yap

> **KURAL:** "Done" gorevleri atla. "In Progress" gorevler planda `needs_decision` olarak isaretlenir; state bu gorevi sahiplenmediyse run sirasinda otomatik islenmez.

### 1.2 — 4 Boyutlu Puanlama

Her gorevi `/task-master` ile ayni 4 boyutta degerlendir (1-10 arasi):

**Etki (Impact) — Agirlik: x3**
| Puan | Anlam |
|---|---|
| 9-10 | Kritik is fonksiyonu |
| 7-8 | Onemli ozellik |
| 5-6 | Faydali iyilestirme |
| 3-4 | Kucuk iyilestirme |
| 1-2 | Kozmetik |

**Risk — Agirlik: x2.5**
| Puan | Anlam |
|---|---|
| 9-10 | Guvenlik acigi, veri kaybi |
| 7-8 | Performans, kullanici kaybi |
| 5-6 | Teknik borc |
| 3-4 | Kucuk teknik borc |
| 1-2 | Risk yok |

**Bagimlilik (Dependency) — Agirlik: x2**
| Puan | Anlam |
|---|---|
| 9-10 | 5+ gorev bagimli |
| 7-8 | 3-4 gorev bagimli |
| 5-6 | 1-2 gorev bagimli |
| 3-4 | Dolayili bagimlilik |
| 1-2 | Bagimsiz |

**Karmasiklik (Complexity) — Agirlik: x1.5 (TERS)**
| Puan | Anlam |
|---|---|
| 9-10 | Cok basit |
| 7-8 | Basit |
| 5-6 | Orta |
| 3-4 | Karmasik |
| 1-2 | Cok karmasik |

```
Toplam = (Etki x 3) + (Risk x 2.5) + (Bagimlilik x 2) + (Karmasiklik x 1.5)
Maksimum = 90
```

> **KURAL:** Bu formul `/task-master` ile drift etmeyecek. Oradaki agirliklar degisirse burasi da ayni commit'te guncellenir.

---

## Step 2 — Faz Atamasi

### 2.1 — Puan Bazli Faz

| Faz | Puan Araligi | Mod |
|---|---|---|
| **Faz 1 — Kritik** | 65+ | Genelde sirayla |
| **Faz 2 — Onemli** | 45-64 | Paralel mumkun |
| **Faz 3 — Planli** | 25-44 | Paralel mumkun |

### 2.2 — Cakisma Kontrolu (Conflict Graph)

Ayni faza atanan gorevler arasinda dosya catismasi var mi? **Katman 1: Onleme** — conflict'i run'dan ONCE tespit et.

#### Affected Files Okuma

1. Her gorev icin `backlog task <id> --plain` ciktisindaki `## Affected Files` bolumunu oku
2. Bu bolum yoksa: baslik + AC analizinden tahmini dosya listesi cikar
3. Tahmini liste guvenilir degilse gorevi `unknown_files=true` isaretle
4. Dosya listelerini gorev-dosya haritasina kaydet

#### Conflict Graph Olusturma

```
Gorevler: A, B, C, D
A.affected_files = [auth.controller.ts, auth.routes.ts]
B.affected_files = [auth.controller.ts, user.service.ts]
C.affected_files = [order.service.ts, order.routes.ts]
D.affected_files = [user.service.ts, user.routes.ts]

Conflict graph:
  A ←→ B  (auth.controller.ts — CAKISMA)
  B ←→ D  (user.service.ts — CAKISMA)
  A ←→ C  (yok — paralel olabilir)
  C ←→ D  (yok — paralel olabilir)

Sonuc:
  Grup 1 (sirayla): A → B → D  (baglantili conflict zinciri)
  Grup 2 (paralel): C           (hicbir conflict'i yok)
```

#### Karar Matrisi

| Conflict Durumu | Karar | Gerekce |
|---|---|---|
| Ortak dosya YOK | Paralel isle | Cakisma riski sifir |
| Ortak dosya VAR, farkli bolumler | Sirayla isle | Ayni dosyada ayni anda iki edit tehlikeli |
| Ortak dosya VAR, conflict zinciri | Zinciri sirayla, geri kalani paralel | Zincirdeki gorevler birbirini etkiler |

#### Catisma Matrisi Ciktisi

```
## Catisma Matrisi
| Task A | Task B | Ortak Dosyalar | Karar |
|---|---|---|---|
| #12 | #15 | `user.service.ts` | Sirayla isle |
| #12 | #22 | (yok) | Paralel olabilir |
| #15 | #22 | (yok) | Paralel olabilir |

Conflict zincirleri:
  Zincir 1: #12 → #15 (sirayla)
Bagimsiz gorevler: #22 (paralel)
```

> **KURAL:** Conflict zincirindeki gorevler her zaman SIRAYLA islenir. Zincir icinde oncelik sirasini puanlama belirler.
> **KURAL:** Affected files listesi olmayan gorevler MUHAFAZAKAR olarak sirayla islenir — conflict riski bilinmiyor.
> **KURAL:** Plan ciktisinda catisma matrisi zorunludur. Run baslamadan once ayni analiz yeniden dogrulanir.

### 2.3 — Plan Ciktisi

`plan` modu burada durur ve asagidaki raporu verir:

```
## Task Conductor Plan

Mod: plan top 5
Secilen gorevler: #12, #8, #22
Run onerisi: /task-conductor run top 5 --max-parallel 2

### Fazlar
| Faz | Gorevler | Mod | Gerekce |
|---|---|---|---|
| Faz 1 | #12, #8 | Sirayli | Kritik + ortak auth dosyalari |
| Faz 2 | #22 | Paralel olabilir | Catisma yok |

### Risk Kapilari
- #15 In Progress: state sahiplenmiyor, run icin karar gerekir
- #30 Affected Files yok: sirayli islenecek
```

> **KURAL:** Plan modu state yazmaz, backlog status'u degistirmez, commit atmaz.

---

## Step 3 — State Dosyasi Yonetimi

### 3.1 — State Dosyasi Olustur

Sadece `run` veya `resume` modunda `.claude/tracking/conductor-state.json` dosyasini olustur/guncelle:

```json
{
  "schema_version": 2,
  "session_id": "<uuid>",
  "started_at": "<timestamp>",
  "command_mode": "run",
  "selection": {
    "type": "<top|all|manual|keyword>",
    "value": "<5|3,5,8|auth|null>",
    "confirm_all": false
  },
  "max_parallel": 1,
  "lock_path": ".claude/tracking/conductor.lock",
  "phases": [
    {
      "phase": 1,
      "label": "Kritik",
      "execution_mode": "sequential",
      "status": "pending",
      "consecutive_errors": 0,
      "tasks": [
        {
          "id": 12,
          "title": "...",
          "score": 76.0,
          "affected_files": ["apps/api/src/auth.controller.ts"],
          "unknown_files": false,
          "status": "pending",
          "started_at": null,
          "completed_at": null,
          "commit_hash": null,
          "worktree_path": null,
          "branch": null,
          "error": null
        }
      ]
    }
  ],
  "current_phase": 1,
  "current_task": null,
  "total_tasks": 10,
  "completed_tasks": 0,
  "failed_tasks": 0,
  "updated_at": "<timestamp>"
}
```

### 3.2 — State Guncelleme

Her gorev tamamlandiginda veya hata alindiginda state dosyasini guncelle.

> **KURAL:** State dosyasi her zaman guncel olmali. Crash durumunda `resume` ile devam edilebilmeli.
> **KURAL:** `schema_version` 2 degilse otomatik resume yapma; kullaniciya state migrasyonu veya yeni run secenegi sun.

### 3.3 — Lock Dosyasi

Run basinda `.claude/tracking/conductor.lock` olustur:

```json
{
  "session_id": "<uuid>",
  "pid": "<pid>",
  "started_at": "<timestamp>",
  "state_path": ".claude/tracking/conductor-state.json"
}
```

- `status` lock'u okur ve raporlar.
- `abort` state'i `aborted` yapar, lock'u kaldirir.
- Crash sonrasi `resume`, lock stale ise bunu raporlar ve state'den devam etmeden once kullanici niyetini netlestirir.

---

## Step 4 — Faz Dongusu

> **KURAL:** Bu bolum sadece `run` veya `resume` modunda calisir.

### 4.1 — Faz Baslangici

Her faz icin:
1. Fazin gorevlerini state'den oku
2. Catisma matrisini ve dirty state'i yeniden dogrula
3. Yurutme modunu belirle (sequential / parallel)
4. Gorevleri isle
5. Faz sonunda ozet + butunluk kontrolu yap

### 4.2 — Paralel Mod

Catisma olmayan gorevler sadece asagidaki kosullar birlikte saglanirsa paralel islenebilir:

1. `--max-parallel` degeri 2 veya daha yuksek
2. Gorevlerin `Affected Files` listeleri guvenilir ve ortak dosya yok
3. Her gorev icin ayri izole worktree/branch acilabiliyor
4. Teammate runtime'i dosya sinirini ve commit hash raporunu destekliyor

**Dosya Haritasi:**
```
Task #8  → [rate-limiter.ts, api.module.ts]
Task #22 → [user.controller.ts, user.service.ts]
Task #30 → [dashboard.tsx, stats.api.ts]
```

**Catisma Grafi:**
- #8 ve #22: catisma YOK → paralel
- #22 ve #30: catisma YOK → paralel
- Uc gorev birden paralel islenebilir

**Teammate Spawn:**

Her paralel gorev icin izole branch/worktree ile bir teammate spawn et:

```
## Teammate: Task #<id> — <baslik>

### Gorev Detayi
<backlog task ciktisi>

### Hedef Dosyalar
<dosya listesi — sadece bu dosyalara dokunabilirsin>

### Kurallar
1. Sadece listelenen dosyalari duzenle
2. Izole branch/worktree disina cikma
3. Bitirince commit at
4. Test sonuclarini ve commit hash'ini raporla
```

> **KURAL:** Paralel teammate'ler ASLA ayni dosyaya dokunemez.
> **KURAL:** Paralel yazim sadece izole worktree/branch ile yapilir. Izolasyon yoksa `sequential` moda dus.
> **KURAL:** Teammate bittiginde commit hash'ini state'e yaz.
> **KURAL:** Merge/cherry-pick oncesi trial merge veya esit dogrulama yap. Conflict varsa gorevi failed isaretle, otomatik riskli conflict cozme yapma.

### 4.3 — Sirayli Mod

Sirayla islenen gorevlerde task-hunter mantigi inline uygulanir:

1. `backlog task <id> --plain` → gorevi oku
2. `backlog task edit <id> -s "In Progress"` → sahiplen
3. Dosyalari kesfet, oku, anla
4. Uygula
5. Test et (dogrulama kapisi)
6. Commit at
7. `backlog task edit <id> -s "Done"` → kapat
8. State dosyasini guncelle

### 4.3.1 — Hata Davranisi

Her gorev hatasinda:
1. Gorevi `failed` isaretle, hatayi state'e ve faz raporuna yaz
2. Fazin `consecutive_errors` sayacini artir
3. Hata olmayan basarili gorevden sonra sayaci sifirla
4. `consecutive_errors >= 3` ise fazi `blocked` yap, run'i durdur, kullaniciya rapor ver

> **KURAL:** Bir fazda art arda 3 hata olursa DUR. Sonraki gorevlere veya faza gecme.
> **KURAL:** Fazda hata varsa sonraki faza otomatik gecme; faz sonu raporu ver ve `resume`/devam niyeti bekle.

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

### 4.4 — Dogrulama Kapisi (Her Gorev Icin)

<!-- GENERATE: VERIFICATION_COMMANDS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: project.subprojects, project.scripts, stack.test_framework
Ornek cikti:
Her alt proje icin test ve dogrulama komutlari:

| Alt Proje | Komut | Aciklama |
|---|---|---|
| API | `cd ../Codebase/apps/api && npm run test` | Jest birim testleri |
| API (lint) | `cd ../Codebase/apps/api && npm run lint` | ESLint kontrolu |
| API (type) | `cd ../Codebase/apps/api && npx tsc --noEmit` | TypeScript tip kontrolu |
| Web | `cd ../Codebase/apps/web && npm run build` | Build dogrulamasi |
| Mobile | `cd ../Codebase/apps/mobile && npx tsc --noEmit` | TypeScript tip kontrolu |
-->

### 4.5 — Commit Kurallari

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
| `refactor` | Yeniden yapilandirma |
| `test` | Test ekleme/duzeltme |
| `docs` | Dokumantasyon |
| `chore` | Bakim, konfigurasyon |

**Dil:** Turkce
**Ornek:** `feat: kullanici kayit endpointi eklendi (#12)`
-->

---

## Step 5 — Faz Sonu Inceleme

Her faz tamamlandiginda:

### 5.1 — Faz Ozeti

```
## Faz <N> Tamamlandi

### Tamamlanan Gorevler
| ID | Baslik | Commit | Sure |
|---|---|---|---|
| #12 | Auth sistemi | `abc123` | 15 dk |
| #8 | Rate limiting | `def456` | 8 dk |

### Basarisiz Gorevler
| ID | Baslik | Hata |
|---|---|---|
| (yok) | | |
```

### 5.2 — Butunluk Kontrolu

Faz sonunda:
1. Tum commit'ler basarili mi?
2. State dosyasi guncel mi?
3. Backlog status'lari commit'lerle tutarli mi?
4. Paralel branch/worktree ciktilari ana hedefe temiz entegre edildi mi?
5. Sonraki faz icin hazirlik gerekiyor mu?

### 5.3 — Sonraki Faza Gec

- Basarisiz gorev varsa: kullaniciya bildir, state'i guncelle, `resume` ile devam secenegi sun
- Tum gorevler basarili → sonraki faza otomatik gec

---

## Step 6 — Final Raporu

Tum fazlar tamamlandiginda:

```
## Conductor Raporu

### Genel Ozet
- **Toplam gorev:** <sayi>
- **Tamamlanan:** <sayi>
- **Basarisiz:** <sayi>
- **Toplam sure:** <sure>

### Faz Detayi
| Faz | Gorev Sayisi | Tamamlanan | Basarisiz | Mod |
|---|---|---|---|---|
| Faz 1 | 3 | 3 | 0 | Sirayli |
| Faz 2 | 4 | 4 | 0 | Paralel |
| Faz 3 | 3 | 2 | 1 | Paralel |

### Commit Gecmisi
| Commit | Mesaj | Task |
|---|---|---|
| `abc123` | feat: auth sistemi (#12) | #12 |
| `def456` | feat: rate limiting (#8) | #8 |

### Basarisiz Gorevler (Detay)
| ID | Hata | Onerilen Aksiyon |
|---|---|---|
| #30 | Test hatasi: ... | Manuel inceleme gerekli |

### Oneriler
- [varsa sonraki adimlar]
```

---

## Zorunlu Kurallar

### Kutsal Kurallar (Her Komutta Gecerli)

1. **Codebase e config YAZMA** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` dosyalari SADECE Agentbase icinde olusturulur. Codebase icinde `.claude/` dizini olusturma, `../Codebase/CLAUDE.md` yazma YASAK.
2. **Git sadece Codebase de** — Tum git islemleri (commit, push, branch) `../Codebase/` icinde yapilir. Agentbase'de git YOKTUR.
3. **Codebase OKUNUR, config YAZILMAZ** — Proje dosyalari (`src/`, `app/`, vb.) okunabilir ve gorev gerekiyorsa duzenlenebilir. Config dosyalari (`.claude/`, `CLAUDE.md`) Codebase icinde YAZILAMAZ.

1. **Varsayilan PLAN** — `run` yazilmadikca hicbir degisiklik yapma.
2. **Run dirty state kontrolu** — Commit edilmemis Codebase degisikligi varsa run/resume BASLATMA.
3. **`run all` kilidi** — `run all` sadece `--confirm-all` ile calisir.
4. **State dosyasi zorunlu** — Run'daki her islem state'e yazilmali. Crash'te `resume` calismali.
5. **Schema kontrolu** — `schema_version` uyumsuzsa otomatik resume yapma.
6. **Faz sirasi bozulmaz** — Faz 1 bitmeden Faz 2 baslamaz.
7. **Paralel izolasyon zorunlu** — Paralel yazim sadece izole worktree/branch ile yapilir.
8. **Paralel gorevler cakismaz** — Ayni dosyaya iki teammate dokunemez.
9. **Her gorev icin dogrulama kapisi** — Test gecmeden commit atilmaz.
10. **Hata limiti** — Bir fazda 3+ ardisik hata olursa DURDUR, kullaniciya bildir.
11. **Faz hatasi sonraki fazi kilitler** — Fazda hata varsa sonraki faza otomatik gecme; rapor + resume secenegi sun.
12. **Teammate'lere net sinirlar** — Dosya listesi, branch/worktree, beklenen cikti, kurallar.
13. **Commit sadece gorev dosyalari** — `git add .` yasak.
14. **Backlog CLI kullan** — Gorev durumlarini SADECE CLI ile guncelle.
15. **Resume modu sadece state'den** — `conductor-state.json` yoksa resume BASARISIZ.
16. **Status read-only** — `status` hicbir dosya veya backlog status'u degistirmez.
17. **Abort kontrollu** — `abort` state'i kapatir ve lock'u kaldirir; kod degistirmez.
18. **Catisma matrisi zorunlu** — Paralel mod oncesinde dosya catismasi analiz edilmeli.
19. **Faz sonu inceleme** — Her faz sonunda ozet rapor olustur.
20. **Codebase yolu** — Tum proje dosyalarina `../Codebase/` uzerinden eris.
21. **Once oku, sonra yaz** — Bir dosyayi degistirmeden once MUTLAKA oku.
22. **Pattern takip et** — Mevcut koddaki yapiyi takip et. Yeni convention icat etme.
23. **Guvenlik** — `.env`, credential, secret ASLA commit'e dahil edilmez.
24. **Otonom calis** — Belirsiz AC, In Progress sahiplik veya hata fazi disinda kullaniciya soru sorma.

<!-- GENERATE: SELF_REFRESH
Aciklama: Komut son adim - self-refresh check. Bootstrap bu marker-i ortak
Self-Refresh bolumu ile degistirir. Komut kendi metnini proje gerceginin
isiginda gozden gecirir: kucuk uyumsuzluk Edit ile, buyuk degisim backlog
task-i olarak rapor edilir.
-->

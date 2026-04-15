# Task Conductor — Otonom Faz Bazli Orkestrator

> Backlog'daki gorevleri puanlar, fazlara ayirir ve sirayla/paralel olarak uygular.
> Kullanim: `/task-conductor top 5`, `/task-conductor all`, `/task-conductor 3,5,8`, `/task-conductor keyword auth`, `/task-conductor resume`

---

## Mod Cozumleme

| Mod | Ornek | Davranis |
|---|---|---|
| **Top X** | `top 5` | En yuksek puanli X gorevi sec |
| **All** | `all` | Tum "To Do" gorevleri isle |
| **Manuel ID** | `3,5,8` | Belirtilen gorevleri isle |
| **Keyword** | `keyword auth` | Anahtar kelimeyle eslesen gorevleri isle |
| **Resume** | `resume` | `conductor-state.json` dosyasindan kaldigi yerden devam et |

---

## On Kontrol — Dirty State

Devam etmeden once calisma dizininin temiz oldugunu dogrula:

```bash
cd ../Codebase && git status --porcelain
```

- Cikti BOSSA → devam et
- Cikti DOLUYSA → **DUR**, kullaniciya bildir:
  ```
  ⚠️ Calisma dizininde commit edilmemis degisiklikler var.
  Once bunlari commit'leyin veya stash'leyin.
  ```

---

## Step 1 — Gorevleri Topla ve Puanla

### 1.1 — Gorev Toplama

```
backlog task list --plain
```

Moda gore gorevleri filtrele (yukardaki tabloya bak).

### 1.2 — 4 Boyutlu Puanlama

Her gorevi 4 boyutta degerlendir (1-10 arasi):

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

---

## Step 2 — Faz Atamasi

### 2.1 — Puan Bazli Faz

| Faz | Puan Araligi | Mod |
|---|---|---|
| **Faz 1 — Kritik** | 65+ | Genelde sirayla |
| **Faz 2 — Onemli** | 45-64 | Paralel mumkun |
| **Faz 3 — Planli** | 25-44 | Paralel mumkun |

### 2.2 — Cakisma Kontrolu (Conflict Graph)

Ayni faza atanan gorevler arasinda dosya catismasi var mi? **Katman 1: Onleme** — conflict'i paralel calistirmadan ONCE tespit et.

#### Affected Files Okuma

1. Her gorev icin `backlog task <id> --plain` ciktisindaki `## Affected Files` bolumunu oku
2. Bu bolum yoksa: baslik + AC analizinden tahmini dosya listesi cikar
3. Dosya listelerini gorev-dosya haritasina kaydet

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

---

## Step 3 — State Dosyasi Yonetimi

### 3.1 — State Dosyasi Olustur

`.claude/tracking/conductor-state.json` dosyasini olustur:

```json
{
  "session_id": "<uuid>",
  "started_at": "<timestamp>",
  "mode": "<top_5|all|manual|keyword|resume>",
  "phases": [
    {
      "phase": 1,
      "label": "Kritik",
      "tasks": [
        {
          "id": 12,
          "title": "...",
          "score": 76.0,
          "status": "pending",
          "started_at": null,
          "completed_at": null,
          "commit_hash": null,
          "error": null
        }
      ],
      "execution_mode": "sequential",
      "status": "pending"
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

---

## Step 4 — Faz Dongusu

### 4.1 — Faz Baslangici

Her faz icin:
1. Fazin gorevlerini state'den oku
2. Yurutme modunu belirle (sequential / parallel)
3. Gorevleri isle

### 4.2 — Paralel Mod

Catisma olmayan gorevler paralel islenebilir.

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

Her paralel gorev icin bir teammate spawn et:

```
## Teammate: Task #<id> — <baslik>

### Gorev Detayi
<backlog task ciktisi>

### Hedef Dosyalar
<dosya listesi — sadece bu dosyalara dokunabilirsin>

### Kurallar
1. Sadece listelenen dosyalari duzenle
2. Bitirince commit at
3. Test sonuclarini raporla
```

> **KURAL:** Paralel teammate'ler ASLA ayni dosyaya dokunemez.
> **KURAL:** Teammate bittiginde commit hash'ini state'e yaz.

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
3. Sonraki faz icin hazirlik gerekiyor mu?

### 5.3 — Sonraki Faza Gec

- Basarisiz gorev varsa: kullaniciya bildir, devam etmek isteyip istemedigini sor
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

1. **Dirty state kontrolu** — Commit edilmemis degisiklik varsa BASLATMA.
2. **State dosyasi zorunlu** — Her islem state'e yazilmali. Crash'te `resume` calismali.
3. **Faz sirasi bozulmaz** — Faz 1 bitmeden Faz 2 baslamaz.
4. **Paralel gorevler cakismaz** — Ayni dosyaya iki teammate dokunemez.
5. **Her gorev icin dogrulama kapisi** — Test gecmeden commit atilmaz.
6. **Basarisiz gorev sonraki fazi durdurmaz** — Hatayi logla, diger gorevlere devam et.
7. **Teammate'lere net sinirlar** — Dosya listesi, beklenen cikti, kurallar.
8. **Commit sadece gorev dosyalari** — `git add .` yasak.
9. **Backlog CLI kullan** — Gorev durumlarini SADECE CLI ile guncelle.
10. **Resume modu sadece state'den** — `conductor-state.json` yoksa resume BASARISIZ.
11. **Catisma matrisi zorunlu** — Paralel mod oncesinde dosya catismasi analiz edilmeli.
12. **Faz sonu inceleme** — Her faz sonunda ozet rapor olustur.
13. **Hata limiti** — Bir fazda 3+ ardisik hata olursa DURDUR, kullaniciya bildir.
14. **Codebase yolu** — Tum proje dosyalarina `../Codebase/` uzerinden eris.
15. **Once oku, sonra yaz** — Bir dosyayi degistirmeden once MUTLAKA oku.
16. **Pattern takip et** — Mevcut koddaki yapiyi takip et. Yeni convention icat etme.
17. **Guvenlik** — `.env`, credential, secret ASLA commit'e dahil edilmez.
18. **Otonom calis** — Belirsiz AC disinda kullaniciya soru sorma.

<!-- GENERATE: SELF_REFRESH
Aciklama: Komut son adim - self-refresh check. Bootstrap bu marker-i ortak
Self-Refresh bolumu ile degistirir. Komut kendi metnini proje gerceginin
isiginda gozden gecirir: kucuk uyumsuzluk Edit ile, buyuk degisim backlog
task-i olarak rapor edilir.
-->

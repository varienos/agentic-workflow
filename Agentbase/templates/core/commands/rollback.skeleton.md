# Rollback — Shadow Git Checkpoint Geri Yukleme

> Agent'in attigi son commit'leri gizli checkpoint'lerden geri yukler. `git-checkpoint.js` hook'unun `refs/checkpoints/agent/*` altinda biriktirdigi ref'leri listeler, secileni `git reset --hard` veya `git revert` ile uygular.
> Kullanım: `/rollback`

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
- **Codebase yolu:** `../Codebase/`

Kutsal Kurallar:
- Git islemleri SADECE Codebase icinde
- Agentbase git'siz — Agentbase'de rollback YOK
- Checkpoint ref'leri `refs/checkpoints/agent/<id>-<ts>` formatinda
-->

---

<!-- GENERATE: COMMIT_CONVENTION
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: conventions.commit_language, conventions.commit_format
Ornek cikti:
## Commit Format (Rollback Sonrasi)

`reset --hard` modu commit yaratmaz (history rewrite). `revert` modu yeni commit yaratir:

```
revert: <orijinal-commit-ozeti> (rollback to <ref>)
```

**Dil:** Turkce
**Ornek:** `revert: hatalı kullanıcı tablosu migration'i geri alindi (rollback to checkpoint/agent/220-...)`
-->

---

## Step 1 — Onkosul Kontrolu

### 1.1 — Git Repo Dogrulamasi

```bash
cd ../Codebase && git rev-parse --git-dir
```

Eger Codebase git repo'su DEGILSE, kullaniciya bildir ve cik:

> "Codebase git repo'su olarak baslatilmamis. Rollback için `git init` gerekli."

### 1.2 — Calisma Agaci Temiz mi?

```bash
cd ../Codebase && git status --porcelain
```

Stage'lenmemis veya commit'lenmemis degisiklik VARSA kullaniciya sor:

> "Calisma agacinda commit'lenmemis değişiklik var. Rollback bunlari kaybedebilir.
> - [S] Stash et ve devam (`git stash push -u`)
> - [I] İptal et
> - [Z] Riski kabul et, devam et"

> **KURAL:** Kullanıcı onayi olmadan ASLA `reset --hard` veya `revert` calistirma.

---

## Step 2 — Checkpoint Listesi

### 2.1 — Mevcut Checkpoint'leri Cek

```bash
cd ../Codebase && git for-each-ref \
  --sort=-committerdate \
  --format='%(refname)|%(objectname:short)|%(committerdate:iso-strict)|%(contents:subject)' \
  refs/checkpoints/agent/
```

Ciktiyi parse et — her satir bir checkpoint:
- **Ref adi:** `refs/checkpoints/agent/<task-id>-<timestamp>`
- **Kisa SHA:** Commit SHA'si (kisa form)
- **Tarih:** Checkpoint olusturulma anindaki commit tarihi
- **Konu:** Commit basligi

Eger HIC checkpoint yoksa kullaniciya bildir:

> "Checkpoint bulunamadi. Hook (git-checkpoint.js) henuz tetiklenmemis veya GC ile temizlenmis olabilir.
> Manuel rollback için: `git reflog` + `git reset --hard <hash>`"

### 2.2 — Listeyi Kullaniciya Goster

Son 10 checkpoint'i tablo halinde sun:

```
| # | Tarih              | Task    | SHA      | Commit Konusu               |
|---|--------------------|----- ---|----------|-----------------------------|
| 1 | 2026-05-07 14:32   | 220     | a3f9c1e  | feat(hooks): checkpoint...  |
| 2 | 2026-05-07 14:18   | 220     | b1e8d4a  | refactor(hooks): cleanup    |
| 3 | 2026-05-07 13:55   | 219     | f7c2b9d  | fix(parse): null guard      |
```

---

## Step 3 — Checkpoint Secimi

`AskUserQuestion` ile checkpoint sec ettir:

> "Hangi checkpoint'e geri donmek istiyorsunuz?"
> - 1: 2026-05-07 14:32 — feat(hooks): checkpoint... (a3f9c1e)
> - 2: 2026-05-07 14:18 — refactor(hooks): cleanup (b1e8d4a)
> - 3: 2026-05-07 13:55 — fix(parse): null guard (f7c2b9d)

> **KURAL:** Tek checkpoint varsa bile sor — yanlislikla geri yükleme onlemi.

Kullanici iptal ederse adim 7'ye atla (rapor: "İptal edildi").

---

## Step 4 — Rollback Modu Secimi

Secilen checkpoint'in commit'i remote'a push edildi mi kontrol et:

```bash
cd ../Codebase && git branch -r --contains <secilen-sha>
```

### 4.1 — Mod Tablosu

| Mod | Komut | Ne zaman? | Risk |
|---|---|---|---|
| **hard reset** | `git reset --hard <ref>` | Commit LOCAL — push edilmedi | Sonraki commit'ler KAYBOLUR |
| **revert** | `git revert <commit>` | Commit PUSH edildi | History korunur, yeni revert commit |
| **soft reset** | `git reset --soft <ref>` | Stage'i koru, sadece HEAD geri | Degisiklikler stage'de kalir |

### 4.2 — Otomatik Oneri

- Push edilmemisse → **hard reset** oner (en temiz)
- Push edilmisse → **revert** oner (history guvenli)
- Kullanici emin degilse → **soft reset** oner (geri donulebilir)

`AskUserQuestion` ile mod onayla:

> "Onerilen mod: <mod>. Devam etmek istiyor musunuz?"

---

## Step 5 — Rollback Uygula

### 5.1 — Hard Reset

```bash
cd ../Codebase && git reset --hard <secilen-ref>
```

> **DIKKAT:** Bu komuttan sonra checkpoint'ten sonraki tum commit'ler erisilemez olur (reflog haric).

### 5.2 — Revert

> **ONEMLI:** Checkpoint, kotu commit'ten ONCEKI saglam HEAD'dir. Revert etmek istedigimiz checkpoint SHA'si DEGIL, checkpoint sonrasi gelen commit'lerdir. Bu yuzden range syntax kullanilir.

Checkpoint sonrasi tek commit varsa (HEAD = kotu commit):
```bash
cd ../Codebase && git revert --no-edit HEAD
```

Checkpoint sonrasi birden fazla commit varsa (range — checkpoint dahil DEGIL, HEAD dahil):
```bash
cd ../Codebase && git revert --no-edit <secilen-ref>..HEAD
```

> **DIKKAT:** `git revert --no-edit <secilen-ref>` (range YOK) YANLIS — bu checkpoint'in kendisini geri alir, kotu commit'i degil.

### 5.3 — Soft Reset

```bash
cd ../Codebase && git reset --soft <secilen-ref>
```

Sonra kullaniciya bildir: "Degisiklikler stage'de korunuyor. Inceleyip yeni commit yapabilirsiniz."

---

## Step 6 — Dogrulama

### 6.1 — HEAD Konumu

```bash
cd ../Codebase && git log -1 --format='%H %s'
```

Ciktinin beklenen SHA'ya esit oldugunu dogrula.

### 6.2 — Calisma Agaci

```bash
cd ../Codebase && git status
```

Modu hard reset ise: clean olmali.
Modu revert ise: yeni revert commit gorunmeli.
Modu soft reset ise: stage'de degisiklikler olmali.

### 6.3 — Test

Kritik testleri calistir:

```bash
cd ../Codebase && <test_komutu>
```

Test BASARISIZ ise kullaniciya bildir — rollback'in koka inmesi gerekebilir.

---

## Step 7 — Backlog Notu

```bash
backlog task edit <aktif-task-id> --append-notes "[ROLLBACK] <secilen-ref> — mod: <hard|revert|soft>"
```

Eger aktif task yoksa, yapilan rollback'i kayıt altina al:

```bash
backlog task create \
  "rollback: <commit-ozeti>" \
  --description "Checkpoint <ref> uygulandi (<mod>)" \
  --priority "low" \
  --labels "rollback,recovery" \
  -s "Done"
```

---

## Step 8 — Kullanici Raporu

```
## Rollback Raporu

### Geri Donulen Checkpoint
- **Ref:** `refs/checkpoints/agent/<id>-<ts>`
- **SHA:** `<short-sha>`
- **Konu:** `<commit-konusu>`
- **Tarih:** `<iso-tarih>`

### Mod
- **Secilen:** `<hard|revert|soft>`
- **Gerekce:** `<push edildi mi / kullanıcı tercihi>`

### Sonuc
- HEAD: `<yeni-sha>`
- Calisma agaci: `<temiz|stage var|değişiklik var>`
- Testler: `<gecti|kaldi|calistirilmadi>`

### Backlog
- Not eklenen task: `#<id>`

> Geri yükleme tamamlandi. Inceleme için: `git log -5`
```

---

## Zorunlu Kurallar

1. **Onaysiz reset/revert YASAK** — Hicbir destruktif komut kullanici onayi olmadan calisamaz.
2. **Calisma agaci temiz olmalı** — `git status --porcelain` cikti varsa once stash veya iptal.
3. **Push kontrolu zorunlu** — Pushed commit icin hard reset varsayilan DEGIL; revert oner.
4. **Tek mod tek seferde** — `reset` ve `revert` ayni rollback'te birlestirilmez.
5. **Reflog garantisi** — Hard reset sonrasi kullaniciya hatirlat: kayip commit'ler `git reflog` ile 90 gun erisilebilir.
6. **Codebase yolu** — Tum git islemleri `../Codebase/` icinde. Agentbase'de git YOK.
7. **Backlog kayit** — Her rollback ya mevcut task notuna ya da yeni task'a kaydedilir — auditability icin.
8. **Kucuk adim** — Coklu checkpoint birbirine yakinsa tek tek rollback uygula, toplu degil.
9. **Hata durumunda durdur** — `git reset/revert` fail olursa devam etme, kullaniciya bildir ve manuel inceleme iste.
10. **Guvenlik** — Credential, secret iceren commit'ler rollback ile geri gelebilir. Secret detection çağır veya uyarı ver.

<!-- GENERATE: SELF_REFRESH
Aciklama: Komut son adim - self-refresh check. Bootstrap bu marker-i ortak
Self-Refresh bolumu ile degistirir. Komut kendi metnini proje gerceginin
isiginda gozden gecirir: kucuk uyumsuzluk Edit ile, buyuk degisim backlog
task-i olarak rapor edilir.
-->

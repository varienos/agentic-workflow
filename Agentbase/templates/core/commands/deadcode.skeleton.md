# Dead Code Hunter — Kullanilmayan Kod Tespiti ve Temizligi

> Codebase'i tarar, kullanilmayan export'lari, cagirilmayan fonksiyonlari ve import edilmeyen dosyalari bulur, guven seviyesine gore siniflandirir, onay sonrasi temizler.
> Kullanim: `/deadcode [dizin]`

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
  - `packages/shared/` — Paylasilan tipler ve yardimcilar
Kutsal Kurallar:
- Config dosyalari SADECE Agentbase icinde yasar
- Codebase icinde `.claude/` OLUSTURULMAZ
- Git sadece Codebase de calisir
-->

---

<!-- GENERATE: DEADCODE_TOOLS
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: stack.primary, stack.languages, project.subprojects
Ornek cikti:
## Dead Code Analiz Araclari

Stack'e gore kullanilacak araclar:

| Stack | Arac | Komut | Aciklama |
|---|---|---|---|
| JS/TS | knip | `npx knip --reporter compact` | Kullanilmayan export, dosya, dependency tespiti |
| JS/TS | ts-prune | `npx ts-prune` | Kullanilmayan TypeScript export'lari |
| JS/TS | unimported | `npx unimported` | Import edilmeyen dosya tespiti |
| Python | vulture | `vulture <dizin> --min-confidence 80` | Kullanilmayan kod tespiti |
| Python | autoflake | `autoflake --check --remove-all-unused-imports -r <dizin>` | Kullanilmayan import temizligi |
| PHP | psalm | `./vendor/bin/psalm --find-dead-code` | Dead code analizi |
| Go | staticcheck | `staticcheck -checks U1000 ./...` | Kullanilmayan fonksiyon/tip/degisken |
| Rust | cargo-udeps | `cargo +nightly udeps` | Kullanilmayan dependency tespiti |

**Not:** Arac yoksa `grep` tabanli manuel tarama yapilir (Step 2.2).
-->

---

## Step 1 — Kapsam Belirleme

### 1.1 — Arguman Cozumleme

| Girdi | Davranis |
|---|---|
| Bos | Tum proje: `../Codebase/` dizinini tara |
| Dizin yolu | Belirtilen dizin: `../Codebase/<dizin>/` |
| Alt proje adi | Monorepo alt projesi: `../Codebase/apps/<ad>/` veya `../Codebase/packages/<ad>/` |

### 1.2 — Monorepo Tespiti

Proje monorepo ise (birden fazla alt proje varsa):

1. Her alt proje icin AYRI tarama yap
2. `packages/` altindaki paylasilan kodlari TANIMLAYICI olarak isle — diger alt projelerden import edilip edilmedigini kontrol et
3. Alt projeler arasi cross-reference analizi yap

### 1.3 — Guvenli Dosya Listesi (Dokunulmaz)

Asagidaki dosyalar ASLA dead code olarak isaretlenmez:

- Entry point'ler: `main.ts`, `index.ts`, `app.ts`, `server.ts`, `main.py`, `__main__.py`, `main.go`, `main.rs`
- Konfigurasyon: `*.config.ts`, `*.config.js`, `*.config.py`, `.env*`, `Makefile`, `Dockerfile`
- Package tanimlari: `package.json`, `setup.py`, `pyproject.toml`, `Cargo.toml`, `go.mod`
- Framework convention'lari: `page.tsx`, `layout.tsx`, `middleware.ts`, `+page.svelte`, `views.py`
- Migration dosyalari: `migrations/`, `prisma/migrations/`
- CI/CD: `.github/`, `.gitlab-ci.yml`, `Jenkinsfile`
- Tip tanimlari: `*.d.ts`, `*.types.ts` (kullanim harici export edilebilir)

> **KURAL:** Bir dosyanin guvenli listede olup olmadigindan supheliysen, onu LOW guven seviyesine koy. Silme.

---

## Step 2 — Tarama

### 2.1 — Arac Tabanli Tarama

DEADCODE_TOOLS bolumundeki stack'e uygun araci calistir:

```bash
cd ../Codebase && <arac_komutu>
```

Arac ciktisini parse et. Her bulgu icin kaydet:
- **Dosya yolu**
- **Satir numarasi** (varsa)
- **Sembol adi** (fonksiyon, class, degisken, export)
- **Bulgu tipi** (kullanilmayan export, cagirilmayan fonksiyon, import edilmeyen dosya, kullanilmayan dependency)

### 2.2 — Grep Tabanli Manuel Tarama (Fallback)

Arac mevcut degilse veya ek dogrulama gerekiyorsa:

#### Export Taramasi
```bash
# Tum export'lari bul
cd ../Codebase && grep -rn "export " <dizin> --include="*.ts" --include="*.tsx" --include="*.js"
```

Her export icin referans kontrolu:
```bash
# Bu sembol baska yerde kullaniliyor mu?
cd ../Codebase && grep -rn "<sembol_adi>" --include="*.ts" --include="*.tsx" --include="*.js" | grep -v "<kaynak_dosya>"
```

#### Dosya Taramasi
```bash
# Bu dosya baska yerden import ediliyor mu?
cd ../Codebase && grep -rn "from.*<dosya_adi>" --include="*.ts" --include="*.tsx" --include="*.js"
```

> **KURAL:** Manuel taramada max 100 export kontrol et. Daha fazlasi icin araci yukle.

---

## Step 3 — Guven Siniflandirmasi

Her bulguyu asagidaki kriterlere gore siniflandir:

### HIGH — Hicbir Referans Yok

Asagidakilerin TUMU gecerli:
- grep ile projenin HICBIR yerinde referans bulunamadi (tanimlama noktasi haric)
- Re-export zincirinde yer almiyor (`index.ts` barrel export kontrolu)
- Guvenli dosya listesinde DEGIL
- Framework convention'i DEGIL (lifecycle hook, decorator handler vb.)

### MEDIUM — Sadece Test Referansi

Asagidakilerin EN AZ BIRI gecerli:
- Sadece test dosyalarinda (`*.test.*`, `*.spec.*`, `__tests__/`) referans var
- Sadece storybook/dokumantasyon dosyalarinda referans var
- Sadece yorum icerisinde referans var (string match, gercek import degil)

### LOW — Dinamik/Belirsiz Kullanim

Asagidakilerin EN AZ BIRI gecerli:
- Dinamik import kullanimi olabilir: `import()`, `require()`, `importlib`
- Reflection/decorator ile kullaniliyor olabilir
- String-based lookup: `getattr()`, `Reflect.get()`, IoC container
- Diger paketler tarafindan kullaniliyor olabilir (library/package)
- Plugin sistemi veya lazy loading mekanizmasi mevcut
- Sembol adi cok genel (orn. `handle`, `process`, `init`)

### 3.1 — Siniflandirma Tablosu

Bulgulari asagidaki formatta raporla:

```
## Dead Code Tarama Sonuclari

### Ozet
| Guven | Sayi | Otomatik Temizlik |
|---|---|---|
| HIGH | <n> | Evet (onay ile) |
| MEDIUM | <n> | Hayir (manuel inceleme) |
| LOW | <n> | Hayir (bilgilendirme) |

### HIGH Guven Bulgulari
| # | Dosya | Satir | Sembol | Tip | Son Degisiklik |
|---|---|---|---|---|---|
| 1 | `src/utils/old-helper.ts` | 15 | `formatLegacy()` | fonksiyon | 6 ay once |
| 2 | `src/models/deprecated.ts` | — | (tum dosya) | dosya | 1 yil once |

### MEDIUM Guven Bulgulari
| # | Dosya | Satir | Sembol | Referans | Neden MEDIUM |
|---|---|---|---|---|---|
| 1 | `src/auth/token.ts` | 42 | `validateOld()` | test.ts | Sadece testte |

### LOW Guven Bulgulari
| # | Dosya | Satir | Sembol | Neden LOW |
|---|---|---|---|---|
| 1 | `src/plugins/base.ts` | 10 | `register()` | Dinamik cagirim mumkun |
```

---

## Step 4 — Temizlik

### 4.1 — Otomatik Temizlik (Sadece HIGH)

HIGH guven seviyesindeki bulgular icin otomatik temizlik oner:

```
## Temizlik Plani

### Silinecek Dosyalar (tum dosya kullanilmiyor)
- `src/utils/old-helper.ts`
- `src/models/deprecated.ts`

### Cikarilacak Export'lar (dosya kalacak, sembol silinecek)
- `src/services/user.ts` → `formatLegacyUser()` (satir 45-62)
- `src/utils/string.ts` → `slugifyV1()` (satir 12-18)

### Temizlenecek Import'lar (silinen sembollere referans)
- `src/services/index.ts` → `export { formatLegacyUser }` satirini kaldir

Toplam: <n> dosya silinecek, <m> dosyada export cikarilacak
```

### 4.2 — Kullanici Onayi

> **KURAL:** Temizlik ASLA otomatik baslamaz. Kullanicidan acik onay ALINMADAN hicbir dosya silinmez veya duzenlenmez.

```
Yukaridaki temizlik planini uygulamak istiyor musunuz?
- [E] Tamamini uygula
- [K] Kismi sec (numara ile)
- [H] Hayir, sadece rapor yeterli
```

### 4.3 — Temizligi Uygula

Onay alindiktan sonra:

1. Her dosya degisikligi ONCESI dosyayi oku — kor duzenleme YASAK
2. Tum dosya silinecekse: `git rm <dosya>`
3. Kismi temizlikse: ilgili satirlari/bloklari kaldir
4. Silinen export'lara referans veren `index.ts` veya barrel dosyalarini guncelle
5. Import satirlarini temizle (artik kullanilmayan import'lari kaldir)

> **KURAL:** Her degisiklik sonrasi syntax kontrolu yap. Build kirilirsa degisikligi geri al.

---

## Step 5 — Dogrulama

### 5.1 — Build Kontrolu

```bash
cd ../Codebase && <build_komutu>
```

Build BASARISIZ ise:
1. Hatayi analiz et — hangi silme/temizlik soruna neden oldu?
2. Sorunlu degisikligi geri al: `git checkout -- <dosya>`
3. O bulguyu HIGH'dan LOW'a dusur
4. Kalan degisikliklerle devam et

### 5.2 — Test Kontrolu

```bash
cd ../Codebase && <test_komutu>
```

Test BASARISIZ ise:
1. Basarisiz testin silinen koda bagli olup olmadigini kontrol et
2. Test silinen kodu test ediyorsa: testi de sil (MEDIUM kategorisindeki test-only referans)
3. Test baska sebeple kiriliyorsa: degisikligi geri al

### 5.3 — Lint Kontrolu

```bash
cd ../Codebase && <lint_komutu>
```

Kullanilmayan import uyarilari ciktiysa bunlari da temizle.

---

## Step 6 — Commit

### 6.1 — Dosya Hazirlama

```bash
cd ../Codebase && git add <degisen_ve_silinen_dosyalar>
```

> **KURAL:** `git add .` YASAK. Sadece temizlenen dosyalari ekle.

### 6.2 — Iliskili Gorev Tespiti

```
backlog task list --plain
```

Dead code temizligi ile iliskili gorev varsa commit mesajinda referans ver.

### 6.3 — Commit Mesaji

<!-- GENERATE: COMMIT_CONVENTION
Aciklama: Bu bolum Bootstrap tarafindan manifest verileriyle doldurulur.
Gerekli manifest alanlari: conventions.commit_language, conventions.commit_format
Ornek cikti:
### Commit Format (Dead Code Temizligi)

```
refactor: <temizlik_ozeti>
```

Iliskili gorev varsa:
```
refactor: <temizlik_ozeti> (#<task_id>)
```

**Dil:** Turkce
**Ornek:** `refactor: kullanilmayan export ve dosyalar temizlendi (#42)`
-->

---

## Step 7 — Backlog Gorevi

### 7.1 — Mevcut Gorev Guncelleme

Eger iliskili gorev bulunduysa:
```
backlog task edit <id> -s "Done" --append-notes "[DEAD CODE] <ozet>"
```

### 7.2 — Yeni Gorev Olusturma

Eger iliskili gorev yoksa, yapilan isi kaydet:
```
backlog task create \
  "refactor: dead code temizligi — <kapsam>" \
  --description "<detay>" \
  --priority "low" \
  --labels "refactor,cleanup" \
  -s "Done"
```

### 7.3 — MEDIUM Bulgular Icin Takip Gorevi

MEDIUM guven seviyesinde bulgu varsa inceleme icin gorev ac:
```
backlog task create \
  "review: dead code adaylari — manuel inceleme gerekli" \
  --description "MEDIUM guven seviyesindeki bulgular:\n<bulgu_listesi>" \
  --priority "low" \
  --labels "review,cleanup,tech-debt"
```

---

## Step 8 — Kullanici Raporu

```
## Dead Code Temizlik Raporu

### Tarama Kapsami
- **Dizin:** <taranan_dizin>
- **Alt projeler:** <varsa_liste>
- **Kullanilan arac:** <arac_adi_veya_manuel>

### Sonuclar
| Guven | Bulunan | Temizlenen | Kalan |
|---|---|---|---|
| HIGH | <n> | <m> | <k> |
| MEDIUM | <n> | — | <n> |
| LOW | <n> | — | <n> |

### Yapilan Temizlik
| Dosya | Islem | Detay |
|---|---|---|
| `<yol>` | Silindi | Tum dosya kullanilmiyordu |
| `<yol>` | Export cikarildi | `<sembol>` kaldirildi |

### Dogrulama
- [x] Build basarili
- [x] Testler gecti
- [x] Lint temiz

### Commit
`<hash>` — `<mesaj>`

### Takip
- MEDIUM bulgular icin inceleme gorevi: #<task_id>
- LOW bulgular bilgilendirme amacli, aksiyon gerekmez
```

---

## Zorunlu Kurallar

### Kutsal Kurallar (Her Komutta Gecerli)

1. **Codebase e config YAZMA** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` dosyalari SADECE Agentbase icinde olusturulur. Codebase icinde `.claude/` dizini olusturma, `../Codebase/CLAUDE.md` yazma YASAK.
2. **Git sadece Codebase de** — Tum git islemleri (commit, push, branch) `../Codebase/` icinde yapilir. Agentbase'de git YOKTUR.
3. **Codebase OKUNUR, config YAZILMAZ** — Proje dosyalari (`src/`, `app/`, vb.) okunabilir ve gorev gerekiyorsa duzenlenebilir. Config dosyalari (`.claude/`, `CLAUDE.md`) Codebase icinde YAZILAMAZ.

1. **Guvenli dosyalara dokunma** — Entry point, config, migration, CI/CD dosyalari ASLA silinmez.
2. **Onaysiz temizlik YASAK** — HIGH bulgular bile kullanici onayi olmadan silinmez.
3. **Build kirilirsa geri al** — Temizlik sonrasi build basarisizsa degisikligi geri al, guven seviyesini dusur.
4. **Monorepo farkindaligi** — Cross-project referanslari kontrol et, paylasilan paketteki kodu sirf bir alt proje kullanmiyor diye silme.
5. **Barrel export zincirleri** — `index.ts` uzerinden re-export edilen sembolleri takip et, zincirin sonuna kadar kontrol et.
6. **Dinamik kullanimi yoksayma** — `import()`, reflection, IoC container ile kullanilabilecek kodu LOW olarak isaretle.
7. **Framework convention'lari koru** — Lifecycle hook, decorator handler, convention-based dosyalar (page.tsx, middleware.ts) dead code DEGIL.
8. **Sadece temizlenen dosyalari commit'le** — `git add .` yasak.
9. **MEDIUM icin takip gorevi** — Test-only referansli bulgular icin backlog gorevi olustur.
10. **Backlog CLI kullan** — Gorev islemlerini SADECE CLI ile yap.
11. **Codebase yolu** — Tum dosya erisimleri `../Codebase/` uzerinden.
12. **Guvenlik** — Credential, secret, `.env` degerleri ASLA log'a yazilmaz.

<!-- GENERATE: SELF_REFRESH
Aciklama: Komut son adim - self-refresh check. Bootstrap bu marker-i ortak
Self-Refresh bolumu ile degistirir. Komut kendi metnini proje gerceginin
isiginda gozden gecirir: kucuk uyumsuzluk Edit ile, buyuk degisim backlog
task-i olarak rapor edilir.
-->

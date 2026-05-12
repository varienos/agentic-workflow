# Workflow Lifecycle Kurallari

> Bu dosya tum workflow'larin yasam dongusu kurallarini, akim diyagramlarini ve hata yonetim protokollerini tanimlar.

---

## Tekil Task Akisi

```
kullanici → /task-hunter <task-no>
  │
  ├─ 1. Backlog'dan task detayini oku
  ├─ 2. Ilgili dosyalari analiz et
  ├─ 3. Implementasyon planini olustur
  ├─ 3b. Mimari karar varsa ADR kapisini uygula
  ├─ 4. Kodu yaz/duzenle
  │     └─ [auto-test-runner hook: erken test sinyali — opsiyonel]
  ├─ 4b. FINAL VERIFICATION — testleri calistir (ZORUNLU)
  ├─ 6. Degisiklikleri commit et
  ├─ 7. Backlog task'ini DONE yap
  └─ 8. Ogrenim kaydini degerlendir (memory-protocol)
```

### Test Tetikleme Katmanlari

| Katman | Ne zaman | Zorunlu mu | Amac |
|--------|----------|------------|------|
| **auto-test-runner hook** | Edit/Write sonrasi (debounce ile) | HAYIR | Erken geri bildirim — hata hemen farkedilsin |
| **Final verification (Step 4)** | Task tamamlamadan once | EVET | Tum testlerin gectigi garanti edilsin |
| **pre-commit hook** | git commit sirasinda | EVET | Commit oncesi son engel |
| **pre-push hook** | git push sirasinda | EVET | Push oncesi son engel |

> **KURAL:** auto-test-runner sinyali final verification'in YERINI ALMAZ. Hook basarisiz olsa bile Step 5 tum testleri calistirir.

---

## Mimari Karar (ADR) Kapisi

Mimari davranis degisikligi iceren task'larda uygulama baslamadan once ADR kapisi calisir.

ADR gerektiren tetikleyiciler:

- Katman siniri, modul sahipligi veya public API kontrati degisiyor
- Veri akisi, kalicilik modeli, migration stratejisi veya entegrasyon kontrati degisiyor
- Runtime, deploy modeli, framework, package manager veya ana teknoloji secimi degisiyor
- Guvenlik, auth, yetki, loglama, hata yonetimi veya observability gibi cross-cutting policy degisiyor
- Birden fazla alt projeyi etkileyen yeni workflow veya otomasyon ekleniyor

Zorunlu cikti:

- Yeni karar icin `backlog/decisions/YYYYMMDD-kebab-case-karar-basligi.md` dosyasi yazilir; format icin `backlog/decisions/0000-adr-template.md` kullanilir.
- Daha once alinmis karar uygulanacaksa task notu ve final summary mevcut ADR dosya yolunu referans verir.
- ADR gerekmiyorsa task notunda kisa gerekce yazilir: kucuk refactor, typo, test ekleme veya mevcut karari uygulayan dar fix.

---

## Coklu Task Akisi

```
kullanici → /task-hunter <task-1> <task-2> ...
  │
  ├─ 1. Tum task'lari oku, bagimlilik sirasi belirle
  ├─ 2. Bagimsiz task'lari paralel, bagimli olanlari sirali isle
  ├─ 3. Her task icin: plan → implement → test → commit
  ├─ 4. Bir task basarisiz olursa:
  │     ├─ Bagimsizsa: diger task'lara devam et, basarisizi raporla
  │     └─ Bagimli task'lar varsa: zinciri durdur, raporla
  └─ 5. Ozet rapor sun
```

---

## Bug Fix Akisi

```
kullanici → /bug-hunter <aciklama>
  │
  ├─ 1. Hata aciklamasini analiz et
  ├─ 2. Ilgili kodu bul (Grep, Glob, Read)
  ├─ 3. Root cause analizi (maks 3 hipotez — asagiya bkz.)
  ├─ 4. Fix uygula
  ├─ 5. Yan etki kontrolu
  ├─ 6. Test calistir
  ├─ 7. Commit et
  └─ 8. Backlog'a kaydet (bug-fix task olarak)
```

---

## Review Akisi

```
kullanici → /task-review veya /bug-review
  │
  ├─ 1. Son commit'lerin diff'ini al
  ├─ 2. code-review agent'i spawn et → kalite analizi
  ├─ 3. regression-analyzer agent'i spawn et → regresyon riski
  ├─ 4. (bug-review icin) silent-failure-hunter → sessiz hata taramasi
  ├─ 5. Tum agent raporlarini birlestirilmis ozet olarak sun
  └─ 6. APPROVE / REQUEST_CHANGES / CRITICAL_BLOCK sonucu bildir
```

---

## Auto Review Akisi

```
kullanici → /auto-review
  │
  ├─ 1. Diff target'ini ve mevcut HEAD'i belirle
  ├─ 2. Diff hash'ini hesapla
  ├─ 3. `.claude/tracking/auto-review-state.json` dosyasini oku
  ├─ 4. Ayni hash veya kendi fix commit'i ise SKIP et
  ├─ 5. Yeni diff varsa shallow review yap
  ├─ 6. MINOR bulgulari lokal fix + verify + ayri commit olarak uygula
  ├─ 7. MAJOR bulgular icin backlog task ac
  ├─ 8. Raporu `.claude/reports/reviews/` altina yaz
  └─ 9. Hash/state bilgisini guncelleyip tek pas sonunda cik
```

> **Loop prensibi:** Ayni diff hash ikinci kez incelenmez. Auto-review kendi olusturdugu fix commit'ini yeni insan diff'i gelmeden tekrar review etmez.

---

## Modul Review Akisi

```
kullanici → /review-module <modul-adi>
  │
  ├─ 1. Modul sinirlarini belirle (dizin, dosyalar, bagimliliklari)
  ├─ 2. Moduldeki tum dosyalari oku
  ├─ 3. code-review agent'i ile tam modul review'u
  ├─ 4. regression-analyzer ile cross-module etki analizi
  ├─ 5. Birlestirilmis rapor sun
  └─ 6. Oneri listesi olustur (backlog task adaylari)
```

---

## Otonom Review Akisi

```
kullanici → /varien <istek>
  │
  ├─ 1. Istegi muhendislik perspektifinden analiz et
  ├─ 2. Task breakdown olustur
  ├─ 3. Her task icin:
  │     ├─ Implementasyon planini yaz
  │     ├─ Risk degerlendirmesi yap
  │     └─ Effort tahmini ver
  ├─ 4. Backlog task'larini olustur
  └─ 5. Ozet planı sun
```

---

## Conductor Akisi

```
conductor → alt-agent'lari yonetir
  │
  ├─ 1. Gorevi alt gorevlere bol
  ├─ 2. Her alt gorev icin uygun agent'i sec
  ├─ 3. Agent'lari sirayla veya paralel calistir
  ├─ 4. Her agent sonucunu degerlendir
  │     ├─ Basarili → sonraki adima gec
  │     └─ Basarisiz → retry veya escalate (asagidaki tabloya bkz.)
  └─ 5. Tum sonuclari birlestir, kullaniciya sun
```

---

## Deploy Akisi

```
pre-deploy → deploy → post-deploy
  │
  ├─ PRE-DEPLOY:
  │   ├─ Testleri calistir (tumu gecmeli)
  │   ├─ Build kontrol (basarili olmali)
  │   ├─ Migration durumu kontrol (pending migration varsa uyar)
  │   └─ Environment degiskenleri kontrol
  │
  ├─ DEPLOY:
  │   ├─ Build ve push (Docker ise image build + push)
  │   ├─ Deployment tetikle (platform-spesifik)
  │   └─ Health check bekle
  │
  └─ POST-DEPLOY:
      ├─ Health check dogrula
      ├─ Smoke test calistir (varsa)
      ├─ Rollback plani hazir tut
      └─ Deploy kaydini logla
```

---

## Hata Kaskadi Onleme Tablosu

Bir adim basarisiz oldugunda ne yapilacagi:

| Adim | Maks Retry | Retry Arasi | Basarisizlik Aksiyonu |
|------|-----------|-------------|----------------------|
| Test calistirma | 2 | Aninda | Hatayi analiz et, fix dene, 2. retry sonrasi durdur ve raporla |
| Build | 1 | Aninda | Hatayi raporla, devam etme |
| Lint/Format | 1 | Aninda | Auto-fix dene, basarisizsa raporla |
| Agent spawn | 2 | 5 saniye | Alternatif agent dene, yoksa raporla |
| Git commit | 1 | Aninda | Hook hatasini fix et, YENI commit olustur (amend YAPMA) |
| Deploy | 0 | — | Otomatik retry YOK — kullanici onayiyla tekrar dene |
| Migration | 0 | — | Otomatik retry YOK — rollback planini sun |

**Kritik kural:** 3 ardisik basarisizlik = akisi tamamen durdur, durumu raporla, kullanici mudahalesi bekle.

---

## Pre-Commit Hook Hata Kurtarma

Pre-commit hook basarisiz oldugunda:

```
hook basarisiz
  │
  ├─ 1. Hata mesajini oku ve analiz et
  ├─ 2. Hatanin turunu belirle:
  │     ├─ Lint hatasi → auto-fix calistir, tekrar stage et
  │     ├─ Format hatasi → formatter calistir, tekrar stage et
  │     ├─ Test hatasi → testi fix et
  │     └─ Custom hook hatasi → hata mesajina gore islem yap
  ├─ 3. Fix uygulandiktan sonra:
  │     ├─ Degisiklikleri TEKRAR STAGE ET (git add)
  │     └─ YENI COMMIT OLUSTUR (git commit -m "...")
  │         ⚠ ASLA git commit --amend YAPMA
  │         ⚠ --amend onceki commit'i degistirir, calismani kaybedebilirsin
  └─ 4. 2 denemeden sonra hala basarisizsa → durdur, raporla
```

---

## Root Cause Analizi — 3 Hipotez Limiti

Bug fix sirasinda root cause ararken:

1. **Maksimum 3 hipotez** olustur
2. Her hipotezi sirayla test et
3. Hipotez dogrulandiginda dur, geriye kalan hipotezleri atla
4. 3 hipotezin hicbiri dogrulanmazsa:
   - Toplanan kanıtları ozetle
   - Kullaniciya danıs
   - Daha fazla baglam iste

**Anti-pattern:** 10 farkli olasıligi araştırarak zaman kaybetme. Ilk 3 hipotez cogunlukla yeterlidir.

---

<!-- GENERATE: COMMIT_CONVENTION
Commit mesaji kurallari — prefix map, dil, format ve ornekler.
Required manifest fields: workflows.commit_convention, workflows.commit_prefix_map

Bootstrap manifest'teki commit convention tercihine gore bu bolumu doldurur.
Conventional commits secildiyse prefix haritasi ve ornekler uretilir.

Example output:

## Commit Convention

**Format:** `{prefix}: {aciklama}`
**Dil:** Turkce
**Mood:** Imperative (yap, ekle, duzelt — yapildi, eklendi DEGIL)

### Prefix Haritasi

| Prefix | Kullanim | Ornek |
|--------|----------|-------|
| `feat` | Yeni ozellik | `feat: siparis raporu sayfasi ekle` |
| `fix` | Bug fix | `fix: JWT token yenileme hatasini duzelt` |
| `refactor` | Kod yeniden yapilandirma | `refactor: auth middleware'i ayir` |
| `style` | Gorsel/format degisikligi | `style: profil sayfasi spacing duzelt` |
| `docs` | Dokumantasyon | `docs: API endpoint listesini guncelle` |
| `test` | Test ekleme/duzeltme | `test: auth controller unit testleri ekle` |
| `chore` | Arac/config degisikligi | `chore: eslint kurallarini guncelle` |
| `perf` | Performance iyilestirme | `perf: kullanici listesi sorgusunu optimize et` |
| `ci` | CI/CD degisikligi | `ci: deploy workflow'una staging ekle` |

### Kurallar

- Baslik satiri maks 72 karakter
- Baslik kucuk harfle baslar (prefix'ten sonra)
- Satir sonu nokta konmaz
- Body gerekiyorsa bos satir birak, detayi acikla
-->

---

<!-- GENERATE: DEPLOY_WORKFLOW
Deploy topolojisi ve rollback prosedürleri.
Required manifest fields: environments[], environments[].deploy_platform, environments[].deploy_trigger

Bu blok SADECE docker modulu aktifse veya deploy konfigürasyonu varsa eklenir.
Yoksa bu bolumun tamami atlanir.

Example output (Coolify + Docker projesi):

## Deploy Workflow

### Topoloji

<!-- GENERATE: DEPLOY_TOPOLOGY
Aciklama: Bootstrap manifest'teki environments ve deploy bilgisinden uretilir.
Gerekli manifest alanlari: environments[], deploy_platform, deploy_trigger
Ornek cikti:
| Ortam | Platform | Tetikleyici | URL |
|-------|----------|-------------|-----|
| Production | Coolify | `main` branch push | api.example.com |
| Staging | Coolify | `develop` branch push | staging-api.example.com |
-->

### Deploy Adimlari

<!-- GENERATE: DEPLOY_STEPS
Aciklama: Deploy platformuna gore adimlar.
Ornek cikti (Coolify):
1. `main`'e merge/push yapilir
2. Coolify webhook tetiklenir
3. Docker image build edilir
4. Container yeniden baslatilir
Ornek cikti (Vercel):
1. `main`'e merge/push yapilir
2. Vercel otomatik build baslatir
3. Preview deploy olusturulur
4. Production'a promote edilir
-->
5. Health check dogrulanir

### Rollback Proseduru — 6 Senaryo Karar Agaci

Deploy basarisizliginda asagidaki karar agacini takip et. Once senaryoyu tespit et, sonra ilgili protokolu uygula.

```
Deploy sonucu nedir?
  │
  ├─ Build BASARISIZ → S1
  ├─ Migration BASARISIZ → S2
  ├─ Migration OK + uygulama BASARISIZ → S3
  ├─ Deploy OK + runtime HATA (calisirken cokuyor) → S4
  ├─ Deploy OK + veri SILINDI (DROP TABLE vb.) → S5
  └─ Her sey OK + is mantigi HATALI → S6
```

#### RTO Hedefleri

| Senaryo | RTO | Aciklama |
|---------|-----|----------|
| S1: Build fail | 0 dk | Eski container/deployment zaten calisiyor |
| S2: Migration fail | 5-15 dk | Kismi migration geri alinmali |
| S3: Migration OK + app fail | 15-30 dk | Migration rollback + container rollback |
| S4: Runtime hata | 5 dk | Onceki deployment'a rollback |
| S5: Veri silindi | 1-4 saat | Backup restore + migration replay |
| S6: Is mantigi hatali | 30-60 dk | Hotfix veya revert deploy |

---

#### S1 — Build Basarisiz (Eski Container Calisiyor)

**Durum:** Build/CI pipeline basarisiz oldu. Yeni image/artifact olusturulamadi.
**Etki:** SIFIR — eski deployment hala calisiyor.

**Protokol:**
1. Build hatasini oku (CI log veya terminal ciktisi)
2. Hatayi duzelt (derleme hatasi, dependency sorunu, test basarisizligi)
3. Yeniden build et ve deploy et
4. Backlog'a not ekle: "S1: Build basarisiz → [hata ozeti] → duzeltildi"

> **Agent davranisi:** Uyari ver, fix dene, kullaniciya raporla. Acil mudahale GEREKSIZ — eski deploy calisiyor.

---

#### S2 — Migration Basarisiz (DB Kismi Degismis)

**Durum:** Migration basladi ama tamamlanamadi. Veritabani TUTARSIZ durumda olabilir.
**Etki:** YUKSEK — kismi schema degisikligi mevcut verileri bozabilir.

**Protokol:**
1. Migration hatasini oku
2. Veritabani durumunu kontrol et:
   - Hangi migration'lar uygulandi, hangileri uygulANMADI?
   - Kismi degisiklik var mi? (ornekin tablo olusturuldu ama index eklenmedi)
3. Kismi migration'i geri al:
   - ORM rollback komutu calistir (asagidaki platform-spesifik blogu bkz.)
   - ORM rollback desteklemiyorsa: kismi degisiklikleri MANUEL SQL ile geri al
4. Uygulama container'ini DEGISTIRME — eski kod eski schema ile calismaya devam etsin
5. Root cause'u duzelt, migration'i tekrar olustur ve test ortaminda dogrula
6. Backlog'a not: "S2: Migration fail → [hata] → [geri alma yontemi]"

> **Agent davranisi:** KRITIK — kullaniciya HEMEN bildir. Otomatik fix DENEME. Veritabani durumu raporla.

---

#### S3 — Migration Basarili + Uygulama Basarisiz (DB Ileri Gitmis)

**Durum:** Migration tamamlandi, yeni schema aktif. Ama yeni uygulama kodu calismiyor.
**Etki:** KRITIK — eski kod yeni schema ile UYUMSUZ olabilir. Eski container'a rollback DB'yi bozabilir.

**Protokol:**
1. **Once:** Yeni schema ile eski kodun uyumluluguny kontrol et:
   - Yeni sutunlar eklendiyse (additive) → eski kod genellikle calismaya devam eder → S4'e gec
   - Sutun silindi/yeniden adlandirildi (breaking) → eski kod CALISALAMAZ
2. **Breaking change varsa:**
   a. Migration rollback calistir (schema'yi eski haline getir)
   b. Eski container'a rollback yap
   c. Fix'i hazirla: migration + kod BIRLIKTE deploy edilmeli
3. **Additive change varsa:**
   a. Eski container calismaya devam edebilir
   b. Uygulama hatasini duzelt
   c. Yeni kodu tekrar deploy et
4. Backlog'a not: "S3: Migration OK + app fail → [breaking/additive] → [rollback yontemi]"

> **Agent davranisi:** KRITIK — kullaniciya HEMEN bildir. Schema degisikliginin breaking mi additive mi oldugunu analiz et ve raporla.

---

#### S4 — Deploy Basarili + Runtime Hata (Calisirken Cokuyor)

**Durum:** Deployment tamamlandi, health check gecti, ama uygulama runtime'da cokuyor.
**Etki:** YUKSEK — kullanicilar etkileniyor.

**Protokol:**
1. Hata loglarini oku (container log, monitoring, error tracker)
2. Onceki deployment'a rollback:
   - Platform-spesifik rollback (asagidaki GENERATE blogu)
   - Veya: `git revert HEAD && git push` ile revert commit
3. Root cause analiz et (AECA yaklasimi: hipotez → test → fix)
4. Fix'i staging'de test et
5. Yeniden deploy et
6. Backlog'a not: "S4: Runtime hata → [hata ozeti] → onceki deployment'a rollback → fix deploy edildi"

> **Agent davranisi:** Hizli rollback → root cause analiz → fix. Rollback sonrasi kullaniciya bildir.

---

#### S5 — Deploy Basarili + Veri Silindi (DROP TABLE vb.)

**Durum:** Destructive migration calistirildi, veri kayboldu.
**Etki:** KRITIK — veri kaybi geri alinamaz olabilir.

**Veri Kaybi Mudahale Plani:**

```
VERi KAYBI TESPIT EDILDI
  │
  ├─ 1. PANIGE KAPILMA — sakin kal, asagidaki adimlari takip et
  │
  ├─ 2. Uygulamayi MAINTENANCE MODE'a al (mumkunse)
  │     → Yeni veri yazilmasini engelle, mevcut durumu koru
  │
  ├─ 3. Backup mevcut mu?
  │     ├─ EVET:
  │     │   ├─ En son backup'in tarihini belirle
  │     │   ├─ Backup ile mevcut durum arasindaki veri farkini degerlendir
  │     │   ├─ Backup'i AYRI bir veritabanina restore et (production'in ustune YAZMA)
  │     │   ├─ Eksik verileri manuel olarak aktar
  │     │   └─ Production'i restore edilmis veritabaniyla degistir
  │     │
  │     └─ HAYIR:
  │         ├─ Transaction log / WAL / binlog mevcut mu?
  │         ├─ Cloud provider'in point-in-time recovery'si var mi?
  │         ├─ Replika veritabani var mi?
  │         └─ Hicbiri yoksa: VERI KAYBI KALICI — durumu belgele
  │
  ├─ 4. Destructive migration'i geri al:
  │     → Yeni migration ile silinen tablo/sutunu yeniden olustur
  │     → Restore edilen veriyi yeni yapiya aktar
  │
  └─ 5. Post-mortem yaz:
        → Ne oldu, neden oldu, nasil onlenebilir
        → pre-push hook'a destructive migration uyarisi eklendi mi kontrol et
```

> **Agent davranisi:** KRITIK — kullaniciya HEMEN bildir, "veritabani backup'iniz var mi?" sor. Otomatik fix DENEME.

---

#### S6 — Her Sey Basarili + Is Mantigi Hatali

**Durum:** Deploy tamamlandi, testler gecti, hata yok. Ama is mantigi yanlis calisiyor (yanlis hesaplama, yanlis filtreleme vb.).
**Etki:** ORTA-YUKSEK — kullanicilar yanlis veri goruyor ama sistem calisir durumda.

**Protokol:**
1. Hatanin kapsamini belirle:
   - Kac kullanici/kayit etkilendi?
   - Veri bozulmasi var mi yoksa sadece goruntuleme hatasi mi?
2. Karar ver:
   - **Veri bozulmasi VARSA** → Onceki deployment'a rollback + veri duzeltme script'i
   - **Sadece goruntuleme** → Hotfix: fix'i hazirla, test et, deploy et (rollback gereksiz)
3. Hotfix akisi:
   ```
   git checkout -b hotfix/<aciklama>
   # Fix'i uygula
   # Test et (ozellikle hatali senaryo icin test yaz)
   git push && PR ac
   ```
4. Backlog'a not: "S6: Is mantigi hatasi → [etki kapsami] → [hotfix/rollback]"

> **Agent davranisi:** Hotfix modunda calis (RPI yaklasimi: research → plan → implement). Rollback sadece veri bozulmasi varsa.

---

### Kismi Deploy Kurtarma Protokolu

Coklu servis deploy'larinda (monorepo, microservice) bazi servisler basarili, bazilari basarisiz olabilir:

```
Kismi deploy durumu:
  Servis A: BASARILI
  Servis B: BASARISIZ
  Servis C: BASARILI

Karar agaci:
  │
  ├─ B, A ve C'ye bagimli mi?
  │   ├─ EVET → TUM servisleri rollback et (tutarsiz durum tehlikeli)
  │   └─ HAYIR → Sadece B'yi rollback et, A ve C'yi koru
  │
  ├─ B'nin basarisizligi A veya C'yi etkiliyor mu?
  │   ├─ EVET → Etkilenen servisleri de rollback et
  │   └─ HAYIR → Sadece B'yi rollback et
  │
  └─ API contract degisikligi var mi?
      ├─ EVET → Tum servisleri BIRLIKTE rollback et
      └─ HAYIR → Bagimsiz rollback mumkun
```

---

### Platform-Spesifik Rollback Adimlari

<!-- GENERATE: ROLLBACK_PLATFORM_STEPS
Deploy platformuna gore rollback komutlari.
Required manifest fields: environments[].deploy_platform

Example output (Coolify):

#### Coolify Rollback
1. Coolify Dashboard → Applications → ilgili servis
2. Deployments sekmesi → onceki basarili deployment'i sec → "Rollback" tiklA
3. Veya API ile: `curl -X POST https://coolify.example.com/api/v1/applications/{id}/rollback`
4. Health check'in gecmesini bekle
5. Coolify otomatik rollback: health check basarisiz olursa eski container OTOMATIK korunur

#### Docker (Manuel) Rollback
1. `docker ps` ile mevcut container'i bul
2. `docker images` ile onceki image tag'ini bul
3. `docker stop <container> && docker run -d <onceki_image>` ile eski image'i baslat
4. Veya docker-compose ile: `docker-compose up -d --force-recreate`

#### Vercel Rollback
1. Vercel Dashboard → Project → Deployments
2. Onceki basarili deployment'i sec → "Promote to Production"
3. Veya CLI: `vercel rollback`
4. Instant rollback — sifir downtime

#### Migration Rollback (ORM-spesifik)
- Prisma: `npx prisma migrate resolve --rolled-back <migration_name>`
- TypeORM: `npx typeorm migration:revert`
- Eloquent: `php artisan migrate:rollback --step=1`
- Django: `python manage.py migrate <app_name> <onceki_migration>`
-->

### Dikkat Edilecekler

- Migration iceren deploy'larda once migration'i ayri commit'le
- Buyuk schema degisikliklerinde maintenance mode ac
- Deploy sonrasi smoke test'leri calistir
- Destructive migration (DROP) oncesi MUTLAKA backup al
- Rollback sonrasi HER ZAMAN health check ve smoke test calistir
-->

---

<!-- GENERATE: ENVIRONMENT_DIFFERENCES
Development ve production ortam farkliliklari.
Required manifest fields: environments[], environments[].config

Bu blok SADECE birden fazla ortam varsa eklenir.

Example output:

## Ortam Farkliliklari

| Ayar | Development | Production |
|------|-------------|------------|
| Database | localhost MySQL | Remote MySQL (connection pool) |
| File storage | Local disk | S3/Cloud storage |
| Email | Mailtrap/console | Gercek SMTP |
| Debug | Acik (verbose log) | Kapali (sadece error) |
| CORS | * (tum origin'ler) | Sadece izinli domain'ler |
| Rate limiting | Kapali | Aktif |

### Ortama Gore Dikkat

- **Development:** Debug modunda calis, seed data kullan
- **Production:** Asla `prisma db push` kullanma, her zaman `migrate deploy`
-->

---

<!-- GENERATE: TEAM_REVIEW_POLICY
Ekip buyuklugune gore review sureci politikasi.
Required manifest fields: project.team_size, workflows.branch_model

Example output (small-team + feature-pr):

## Review Sureci Politikasi

**Ekip Buyuklugu:** Kucuk ekip (2-4 kisi)
**Review Zorunlulugu:** Onerilen (zorunlu degil)

| Durum | Politika |
|-------|---------|
| Feature branch | PR acilmasi onerilen, direkt merge de kabul edilir |
| Bug fix | PR onerilen, acil durumlarda direkt merge |
| Hotfix | Direkt merge, post-merge review |
| Review sayisi | En az 1 reviewer onerilen |
| Self-merge | Kabul edilir (reviewer onayindan sonra) |

Example output (large-team + feature-pr):

## Review Sureci Politikasi

**Ekip Buyuklugu:** Buyuk ekip (5+ kisi)
**Review Zorunlulugu:** Zorunlu

| Durum | Politika |
|-------|---------|
| Feature branch | PR ZORUNLU, direkt merge YASAK |
| Bug fix | PR zorunlu, en az 1 review |
| Hotfix | Acil PR, post-merge review kabul edilir |
| Review sayisi | En az 1 reviewer zorunlu, 2 onerilen |
| Self-merge | YASAK — baskasi merge etmeli |
| CODEOWNERS | Kritik dizinler icin owner atamasi onerilen |

Example output (solo):

## Review Sureci Politikasi

**Ekip Buyuklugu:** Solo gelistirici
**Review Zorunlulugu:** Opsiyonel (self-review)

| Durum | Politika |
|-------|---------|
| Feature branch | PR opsiyonel — direkt push kabul edilir |
| Bug fix | Direkt commit |
| Review | /task-review veya /auto-review ile self-review onerilen |
| CI kontrol | Varsa CI pipeline yeterli |
-->

---

<!-- GENERATE: HOOK_BEHAVIORS
Pre-commit ve pre-push hook'larinin kontrol ettigi seyler.
Required manifest fields: workflows.auto_format, stack.linter, stack.formatter, rules.forbidden

Example output:

## Hook Davranislari

### Pre-Commit Hook

| Kontrol | Aksiyon | Basarisizlik |
|---------|---------|--------------|
| Lint (ESLint) | `npx eslint --fix` | Auto-fix dener, basarisizsa commit engellenir |
| Format (Prettier) | `npx prettier --write` | Auto-fix, her zaman basarili |
| Type check | `npx tsc --noEmit` | Basarisizsa commit engellenir |
| Yasakli komut | Pattern tarama | Engellenir, uyari gosterilir |

### Pre-Push Hook

| Kontrol | Aksiyon | Basarisizlik |
|---------|---------|--------------|
| Testler | `npm test` | Basarisizsa push engellenir |
| Build | `npm run build` | Basarisizsa push engellenir |
| Trial merge | `git merge-tree` ile conflict testi | Conflict varsa push engellenir |
| Localhost leak | URL taramasi | Tespit edilirse push engellenir |
| Migration tutarliligi | Schema vs migration karsilastirmasi | Eksik migration varsa push engellenir |
-->

---

<!-- GENERATE: CRITICAL_RULES
Proje-spesifik kritik kurallar — yasakli komutlar ve zorunlu kontroller.
Required manifest fields: rules.forbidden[], rules.domain[]

Example output:

## Kritik Kurallar

### Yasakli Komutlar

| Komut | Sebep | Aksiyon |
|-------|-------|---------|
| `prisma db push` | Production'da schema bozuldu | ENGELLE |
| `git push --force main` | History kaybolur | ENGELLE |
| `rm -rf /` | Acik sebep | ENGELLE |
| `npm audit fix --force` | Breaking change riski | UYAR |

### Zorunlu Kontroller

- Her API endpoint'inde auth middleware olmali
- Her Prisma sorgusunda userId filtresi olmali (IDOR onlemi)
- Her yeni component useTheme() ile tema renklerini kullanmali
- .env dosyalari asla commit edilmemeli
-->

---

## Merge Conflict Yonetim Protokolu (3 Katmanli Savunma)

Paralel teammate'ler, worktree izolasyonu ve coklu branch calismasinda merge conflict riski olusur. Asagidaki 3 katmanli savunma sistemi bu riski yonetir.

### Katman 1 — Onleme (Planlama Seviyesi)

task-plan ve task-conductor seviyesinde conflict ONCE tespit edilir ve onlenir:

1. **task-plan** her gorev icin `Affected Files` listesi uretir (dogrudan degisecek dosyalar)
2. **task-conductor** faz planlarken conflict graph olusturur:
   - Ortak dosyasi olan gorevler → ayni fazda SIRAYLA islenir
   - Ortak dosyasi olmayan gorevler → PARALEL islenebilir
3. **task-hunter** Orchestrator modunda teammate'lere dosya sinirlari verir:
   - Her teammate sadece kendisine atanan dosyalari duzenleyebilir
   - Iki teammate'e ayni dosya ATANMAZ

### Katman 2 — Tespit (Push Seviyesi)

pre-push hook'ta trial merge ile conflict ONCE tespit edilir:

```bash
# Trial merge: push oncesi main ile conflict kontrolu
git fetch origin main
MERGE_BASE=$(git merge-base HEAD origin/main)
git merge-tree "$MERGE_BASE" HEAD origin/main
# Conflict marker (<<<<<<) varsa → push engellenir
```

Bu kontrol otonoim calisir — agent veya insan, her push'ta calisir.

### Katman 3 — Cozum (Agent Davranisi)

Conflict tespit edildiginde agent asagidaki karar agacini takip eder:

```
Conflict tespit edildi
  │
  ├─ Conflict tipi nedir?
  │
  ├─ BASIT (farkli bolumler, ayni dosya):
  │   → Agent otomatik resolve eder
  │   → Resolve sonrasi TESTI CALISTIR
  │   → Testler gecerse → devam et
  │   → Testler basarisizsa → KARMASIK'a gec
  │
  ├─ KARMASIK (ayni satirlar, mantik catismasi):
  │   → Agent DURUR, kullaniciya bildirir
  │   → Conflict detayini gosterir (her iki tarafin degisikligi)
  │   → Backlog'a conflict-resolution gorevi acar
  │   → Kullanici yonlendirmesi bekler
  │
  └─ KENDI DEGISIKLIGI ONEMSIZ:
      → Agent kendi degisikligini geri alir (git checkout -- <dosya>)
      → Main'den guncel versiyonu alir
      → Gorevi yeniden uygular (sifirdan)
      → Backlog notuna "Conflict: gorev yeniden uygulandi" yazar
```

### Conflict Karar Kriterleri

| Durum | Karar | Ornek |
|-------|-------|-------|
| Farkli fonksiyonlar, ayni dosya | **Otomatik resolve** | A: yeni endpoint ekledi, B: mevcut endpoint'i duzenledi |
| Ayni fonksiyon, farkli satirlar | **Otomatik resolve** (dikkatli) | A: fonksiyon basi, B: fonksiyon sonu |
| Ayni satirlar | **Kullaniciya bildir** | A ve B ayni degiskeni farkli sekilde degistirdi |
| Import/dependency catismasi | **Otomatik resolve** | Her iki tarafin import'larini birlestir |
| Migration catismasi | **Kullaniciya bildir** | Iki farkli migration ayni tabloyu degistiriyor |
| Config dosyasi catismasi | **Kullaniciya bildir** | package.json, tsconfig.json gibi paylasilan config |

> **KURAL:** Otomatik resolve sonrasi TEST CALISTIRMAK ZORUNLU. Test basarisizsa resolve gecersiz — kullaniciya bildir.
> **KURAL:** Migration ve config dosya conflict'leri ASLA otomatik resolve edilmez.

---

## Genel Workflow Kurallari

Bu kurallar tum workflow'lar icin gecerlidir ve GENERATE bloklarindan bagimsizdir:

### Dosya Islemleri

- Bir dosyayi duzenlemeden once **mutlaka oku**
- Mevcut pattern'leri takip et, yeni convention icat etme
- Yeni dosya olusturmadan once mevcut dosyalari kontrol et

### Git Islemleri

- Her commit atomik olsun — tek bir amaci kapsasin
- Commit oncesi `git diff --cached` ile degisiklikleri dogrula
- Hook hatasi sonrasi **YENI commit** olustur, `--amend` kullanma
- `--force` push sadece acik kullanici talimatıyla

### Agent Iletisimi

- Agent raporlari Turkce yazilir
- Ozet once, detay sonra — onemliyi one koy
- Belirsiz durumlarda kullaniciya sor, varsayimla ilerleme
- Her agent kendi sorumluluk alaninda kalir, baska agent'in isine karisma

### Hata Yonetimi

- Sessiz hata yakalama (catch + ignore) YASAK
- Her hata loglanir veya raporlanir
- Retry limitlerine uy (yukaridaki tabloya bkz.)
- 3 ardisik basarisizlikta dur, raporla

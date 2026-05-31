# Lessons

> Bu dosya ajanların **öz-gelişim döngüsünü** taşır. `ORCHESTRATION.md` "Bölüm 3 — Öz-Gelişim Döngüsü"
> kurallarına göre her düzeltmeden sonra burada bir ders kaydı tutulur.
> Root `CLAUDE.md` üzerinden `@LESSONS.md` satırı (Claude Code resmi import syntax'ı — boşluksuz) ile context'e enjekte edilir.

<!-- Bu dosya zamanla ajanlar tarafindan doldurulur. -->
<!-- Icerik: Kullanicidan gelen duzeltmelerin kalibi, tekrar etmemesi icin yazilan kurallar -->
<!-- Kaynak: Oturum icindeki feedback'ler, /memorize akisi, kullanici uyarilari -->
<!-- Tum agent context'lerine @ ile enjekte edilir -->

---

## Ders Kayıt Formatı

Her ders aşağıdaki yapıyı izler:

```markdown
### [YYYY-MM-DD] — Kısa başlık

**Bağlam:** Hatanın yapıldığı durum — hangi task, hangi katman, hangi komut.

**Yanlış davranış:** Ne yapıldı (kısa, suçlama yok).

**Doğru kural:** Bir dahaki sefere ne yapılmalı (imperative cümle — "şunu kontrol et", "şunu yapmadan önce şunu sor").

**Why:** Neden bu kural önemli (kayba neden olan kök).

**How to apply:** Hangi tetikleyici görüldüğünde devreye girer.

**Etiketler:** `bootstrap`, `backlog`, `git`, `codebase-leak`, `agent-spawn`, vb.
```

---

## Dersler

<!-- Yeni dersler buraya tarihten yeni → eski sırayla eklenir. -->
<!-- İlk ders eklenene kadar bu bölüm boş kalır. -->

### [2026-05-31] — Teslimat modeli ifadelerini tum yuzeylerde tara

**Bağlam:** TASK-237/TASK-238 iki-repo teslimat modeli review'unde README ve bootstrap metni duzeltilmisken `root-gitignore.skeleton` ayni eski klonlama iddiasini tasimaya devam ediyordu.

**Yanlış davranış:** Sadece gorunur README/bootstrap yuzeyi kontrol edilirse, kaynak skeleton yorumlarindaki kullaniciya donuk yanlis model anlatimi kacabilir.

**Doğru kural:** Teslimat/repo modeli gibi kontrat ifadeleri degistiginde README, bootstrap komutu, skeleton kaynaklari ve regresyon testleri birlikte taranmalidir.

**Why:** Bootstrap'in uretecegi hedef dosyalar skeleton kaynaklarindan beslendigi icin dokumantasyon duzelse bile uretilen model yanlis kalabilir.

**How to apply:** `Codebase`, `iki-repo`, `submodule`, `gitignore`, `klon` veya `clone` ifadeleri degistiginde `rg` ile tum yuzeylerde stale ifade taramasi yap.

**Etiketler:** `bootstrap`, `git`, `two-repo`, `skeleton`, `review`

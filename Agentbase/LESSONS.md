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

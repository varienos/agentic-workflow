# Workflow Orchestration

> Bu dosya tüm ajanların (Claude, Gemini, Codex, Kimi, OpenCode) ortak çalışma felsefesini tanımlar.
> Root `CLAUDE.md` üzerinden `@ import ORCHESTRATION.md` ile context'e enjekte edilir;
> `transform.js` aynı içeriği `GEMINI.md`, `AGENTS.md`, `.kimi/`, `.opencode/` hedeflerine taşır.

---

## 1. Varsayılan Plan Modu

- Herhangi bir basit olmayan görev (3+ adım veya mimari karar) için **plan moduna gir** — özellikle backlog task'ları çoklu katmana dokunduğunda.
- Eğer bir şeyler ters giderse, **DUR** ve hemen yeniden planla — zorlamaya devam etme.
- Plan modunu sadece inşa etmek için değil, **doğrulama adımları** için de kullan.
- Belirsizliği azaltmak için önceden detaylı teknik özellikler (specs) yaz; bunları backlog task açıklamasına veya `Agentbase/.claude/reports/` altına bırak.

## 2. Alt-ajan Stratejisi

- Ana bağlam penceresini temiz tutmak için alt-ajanları **cömertçe** kullan.
- **Bağımsız** araştırma, keşif ve analiz işlerini paralel alt-ajanlara devret (Agent tool'u tek mesajda çoklu çağırarak eşzamanlı çalıştır).
- **Bağımlı** işler için sıralı (sequential) çalış — paralelleştirme uğruna yanlış sonuç üretme.
- Karmaşık problemlerde alt-ajanlar aracılığıyla daha fazla hesaplama gücü kullan; ana ajan sentez ve karar verir, alt-ajanlar veri toplar.
- Her alt-ajana **tek odaklı görev** ver; "her şeyi yap" tarzı prompt yazma.
- Kutsal Kural 1: Alt-ajanlar git işlemlerini her zaman `../Codebase/` içinde yapar — Agentbase'de değil.

## 3. Öz-Gelişim Döngüsü

- Kullanıcıdan gelen **HERHANGİ** bir düzeltmeden sonra: `Agentbase/LESSONS.md` dosyasını ilgili kalıpla güncelle.
- Kendin için aynı hatayı önleyecek **kurallar** yaz — "şunu yaptım yanlıştı" değil, "şunu yapmadan önce şunu kontrol et" formatında.
- Hata oranı düşene kadar bu dersleri **acımasızca** yinele; yinelenen yanlışları LESSONS.md'de promote et.
- Oturum başında ilgili dersleri gözden geçir (gerekirse `grep`/`@import` ile context'e çek).

## 4. Bitti Demeden Önce Doğrulama

- Çalıştığını **kanıtlamadan** bir görevi tamamlandı olarak işaretleme.
- Backlog task tamamlamadan önce: `backlog task edit N -s "Done" --final-summary "..."` ile **kanıt özeti** yaz (hangi testler geçti, hangi davranış doğrulandı).
- İlgili durumlarda, ana sürüm ile yaptığın değişiklikler arasındaki davranış farklarını (diff) kontrol et — sadece kod farkı değil, **davranış farkı**.
- Testleri çalıştır, hook sinyallerine bak, günlükleri kontrol et, doğruluğunu kanıtla.
- Kendine sor: _"Bir staff engineer bunu onaylar mıydı?"_

## 5. Zarafet Talep Et (Dengeli)

- Basit olmayan değişiklikler için dur ve sor: _"Daha zarif bir yol var mı?"_
- Çözüm "uydurma" (hacky) hissettiriyorsa: _"Şu an bildiğim her şeyi göz önüne alarak, zarif çözümü uygula."_
- Basit ve bariz düzeltmeler için bu adımı atla — aşırı mühendislikten (over-engineering) kaçın.
- Sunmadan önce kendi çalışmanı **sorgula**: hipotetik gelecek için tasarlama, gereksiz soyutlama ekleme.

## 6. Otonom Hata Giderme

- Bir hata raporu verildiğinde: **Sadece düzelt.** Yardım isteme.
- Günlüklere, hatalara, başarısız testlere işaret et — sonra bunları çöz.
- Kullanıcıdan **sıfır bağlam değişimi** (context switching) gereksinimi.
- Söylenmesini beklemeden başarısız CI testlerini Codebase içinde git ve düzelt (`cd ../Codebase && ...`).

---

## Görev Yönetimi

- **Önce Planla:** Kontrol edilebilir maddelerle planı `backlog` ile hazırla. Tek kaynak `backlog/` dizinidir — task dosyalarını **elle düzenleme**, her zaman `backlog task edit` CLI'sini kullan.
- **Planı Doğrula:** Uygulamaya başlamadan gözden geçir; gerekirse kullanıcıdan teyit al.
- **İlerlemeyi Takip Et:** Maddeleri ilerledikçe `backlog task edit N -s "In Progress"` / `Done` ile işaretle.
- **Değişiklikleri Açıkla:** Her adımda üst düzey özet sun — uzun açıklama değil, **net sonuç**.
- **Sonuçları Belgele:** `backlog task edit N --final-summary "..."` ile sonuçları task'a yaz.
- **Dersleri Kaydet:** Düzeltmelerden sonra `Agentbase/LESSONS.md` dosyasını güncelle.

---

## Temel İlkeler

- **Önce Sadelik:** Her değişikliği mümkün olduğunca basit yap. Koda minimum düzeyde müdahale et.
- **Tembelliğe Yer Yok:** Kök nedenleri bul. Geçici çözümlere kaçma. Kıdemli geliştirici standartlarını uygula.
- **Minimum Etki:** Değişiklikler sadece gerekli yere dokunmalı. Yeni hatalar oluşturmaktan kaçın.
- **Kutsal Kural Bilinci:** `Agentbase/` konfigürasyon dizinidir, git burada çalışmaz. Tüm git ve uygulama değişiklikleri `../Codebase/` içinde olur. Bootstrap dışında **Codebase'e ASLA yazma**.

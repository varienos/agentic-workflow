# Phase 3 — Developer Profile

> **Feeds:** `DEVELOPER.md`, agent behavior calibration
> **Goal:** Gelistiricinin deneyim seviyesini, dil tercihini ve otonom calisma beklentisini belirlemek.

---

## Auto-Detection

Bu phase'de otomatik tespit yoktur. Tum sorular her zaman sorulur.

---

## Questions

### Q1 — Deneyim Seviyesi
- **Text:** `"Deneyim seviyeniz? (Agent'ların açıklama derinliğini belirler)"`
- **Options:**
  - `a)` Junior — detayli aciklama ve rehberlik isterim
  - `b)` Mid — baglami anliyorum, sadece karar noktalarini goster
  - `c)` Senior — kisa ve oz, gereksiz aciklama yapma
  - `d)` Bu stack'te yeniyim ama genel deneyimim var
- **Skip condition:** never — always ask
- **Maps to:** `manifest.developer.experience`
- **Downstream:**
  - **a → junior:**
    - Agent aciklamalari detayli ve adim adim
    - Kod snippet'larinda yorum satiri eklenir
    - Karar noktalarinda alternatifler gosterilir
    - `DEVELOPER.md` explanation_depth: detailed
  - **b → mid:**
    - Sadece karar noktalarinda aciklama
    - Standart islemler sessizce yapilir
    - `DEVELOPER.md` explanation_depth: moderate
  - **c → senior:**
    - Minimum aciklama, maksimum verimlilik
    - Sadece sonuc ve degisiklik ozeti
    - `DEVELOPER.md` explanation_depth: minimal
  - **d → stack-newcomer:**
    - Stack-spesifik konularda detayli aciklama
    - Genel yazilim konularinda kisa tutulur
    - `DEVELOPER.md` explanation_depth: stack-focused

### Q2 — Calisma Dili
- **Text:** `"Calisma dili? (Commit, yorum, agent iletisimi)"`
- **Options:**
  - `a)` Turkce
  - `b)` English
  - `c)` Diger (belirt)
- **Follow-up (if c):** `"Hangi dil?"`
- **Skip condition:** never — always ask
- **Maps to:** `manifest.project.language`
- **Downstream:**
  - Agent iletisim dili
  - Commit mesaj dili
  - Kod icindeki yorum dili
  - Dokumantasyon dili
  - `DEVELOPER.md` language field
  - All generated markdown files language

### Q3 — Agent Otonomi Seviyesi
- **Text:** `"Agent'lar ne kadar otonom olmali?"`
- **Options:**
  - `a)` Her adimda onay iste
  - `b)` Plan goster, onayladiktan sonra otonom calis
  - `c)` Tam otonom — sadece sonucu goster
- **Skip condition:** never — always ask
- **Maps to:** `manifest.developer.autonomy`
- **Downstream:**
  - **a → ask-every-step:**
    - task-hunter her dosya degisikligi oncesi onay ister
    - Her komut calistirmadan once soru sorar
    - Yuksek guvenlik, dusuk hiz
    - Hook: confirmation_required = always
    - Enforce: task-hunter.skeleton.md ADIM 2.3 "Onay BEKLEME" → "Onay BEKLE"
  - **b → plan-then-autonomous:**
    - task-hunter once plan sunar
    - Plan onaylaninca otonom calisir
    - Dengeli guvenlik/hiz
    - Hook: confirmation_required = plan-phase-only
    - Enforce: task-hunter.skeleton.md ADIM 2.3 "Planı kullanıcıya göster ve onay bekle"
  - **c → full-autonomous:**
    - task-hunter plani gosterip direkt calisir
    - Sadece hata veya belirsizlikte durur
    - Dusuk guvenlik, yuksek hiz
    - Hook: confirmation_required = on-error-only
    - Enforce: task-hunter.skeleton.md ADIM 2.3 "Plani kaydet ve HEMEN uygulamaya basla"

### Q4 — Calisma Modu
- **Text:** `"Projede tek mi calisiyorsun, ekip mi?"`
- **Options:**
  - `a)` Solo — tek gelistirici
  - `b)` Kucuk ekip (2-4 kisi)
  - `c)` Buyuk ekip (5+ kisi)
- **Skip condition:** never — always ask
- **Maps to:** `manifest.project.team_size`
- **Downstream:**
  - **a → solo:**
    - Self-review yeterli, PR zorunlulugu yok
    - task-review onerir ama zorlamaz
    - `WORKFLOWS.md` review sureci: opsiyonel
  - **b → small-team:**
    - PR onerisi (zorunlu degil), review-module sprint sonunda
    - Branch protection onerisi
    - `WORKFLOWS.md` review sureci: onerilen
  - **c → large-team:**
    - PR zorunlu, branch protection kurallari
    - Code ownership dosyasi (CODEOWNERS) onerisi
    - Her PR'da en az 1 review zorunlu
    - `WORKFLOWS.md` review sureci: zorunlu

---

## Batch Delivery

Tüm 4 soru subjektiftir ve birbirinden bağımsızdır. Bootstrap, ADIM 3'te bu phase'i **tek `AskUserQuestion` çağrısında 4 element olarak** sorar (questions array). Bireysel sırayla sormaz. Bkz: `bootstrap.md` ADIM 3 KURAL 1 ve Faz 3 batch tanımı.

---

## Phase Completion

When all questions are answered, Bootstrap:

1. Populates `manifest.developer.*` and `manifest.project.team_size` fields
2. Generates `DEVELOPER.md` with experience level, language preference, and autonomy setting
3. Calibrates agent behavior parameters across all agent configurations
4. Proceeds to **Phase 4 — Domain Rules**

# Phase 4 — Domain Rules

> **Feeds:** `rules/`, hooks (forbidden commands)
> **Goal:** Projeye ozel kurallar, yasaklar ve domain bilgisi toplamak. Bu phase'in ciktilari koruma hook'larina ve agent kurallarina donusur.

---

## Auto-Detection

Bu phase'de otomatik tespit sinirlidir. Asagidaki ipuclari sorulara eklenir:

| Field                    | Detection Source                                      | Usage                              |
|--------------------------|-------------------------------------------------------|------------------------------------|
| UI framework             | React/Vue/Svelte/Expo imports, component directories  | Q2 skip condition                  |
| Design system hints      | Tailwind config, MUI theme, styled-components usage   | Q2 follow-up context               |
| Existing lint rules      | Custom ESLint/Biome rules that imply domain rules     | Q3 pre-fill suggestions            |

---

## Questions

### Q1 — Yasakli Komutlar / Islemler
- **Text:** `"Projede kesinlikle YAPILMAMASI gereken seyler var mi? (Ornek: 'prisma db push YASAK' — bir hata sonucu bu kural dogdu) Varsa listele. Her biri bir koruma hook'una donusturulecek."`
- **Type:** open-ended, multi-value
- **Format:** Her kural ayri satirda. Ornek:
  ```
  prisma db push — production'da schema bozuldu
  rm -rf / — acik sebep
  git push --force main — history kaybolur
  ```
- **Skip condition:** never — always ask
- **Maps to:** `manifest.rules.forbidden[]`
  - Each entry: `{ command: string, reason: string, hook_type: "block" | "warn" }`
- **YAML safety:** Kullanici cevabindaki `command` ve `reason` alanlari manifest'e yazilirken YAML cift tirnak icinde yazilmali. YAML ozel karakterler (`: # [ ]`) iceriyorsa escape zorunlu.
- **Downstream:**
  - `rules/forbidden-commands.md` generation
  - Pre-exec hook: block or warn when forbidden command detected
  - Agent instructions: never suggest or execute these commands
  - **block** → komut calistirilmaz, hata mesaji gosterilir
  - **warn** → uyari gosterilir, onay istenir

### Q2 — Tasarim Sistemi / Component Library
- **Text:** `"Bir tasarım sistemi/component library kullanıyor musunuz? (Örn: Material UI, Tailwind, özel design system)"`
- **Type:** yes/no + follow-up
- **Skip condition:** Aşağıdaki koşullardan biri sağlanırsa sorulmaz:
  - `manifest.detected.design_system.confidence == "high"` (MUI/Shadcn/Antd/RN-Paper paketi tespit edildi)
  - UI framework hiç tespit edilmediyse (mevcut davranış korundu — TASK-209/T5 bu durumu değiştirebilir)
- **Default selection:** `manifest.detected.design_system.confidence == "medium"` ise tespit edilen değer default seçili (örn: Tailwind only). `low` ise default yok, standart soru.
- **Follow-up (if yes):** `"Temel kurallarini kisa acikla (renk kullanimi, component pattern, vb.)"`
- **Maps to:** `manifest.rules.domain[]` (category: design-system)
- **Downstream:**
  - `rules/design-system.md` generation
  - Agent UI component generation rules
  - Style/theme consistency enforcement
  - Example generated rules:
    - "Sadece Tailwind utility class'lari kullan, inline style yazma"
    - "Renk degerleri theme config'den alinir, hardcoded hex kullanilmaz"
    - "Her yeni component Storybook story'si ile birlikte olusturulur"

### Q3 — Domain-Spesifik Kurallar
- **Text:** `"Projede agent'ların bilmesi gereken domain-spesifik kurallar var mı? (Örn: 'API response formatı her zaman {status, data, message}', 'Kullanıcı verisi log'a yazılmaz') Serbest format."`
- **Type:** open-ended, multi-value
- **Format:** Her kural ayri satirda. Serbest format kabul edilir.
- **Skip condition:** never — always ask
- **Maps to:** `manifest.rules.domain[]` (category: domain)
- **YAML safety:** Serbest metin kurallari manifest'e yazilirken YAML cift tirnak icinde yazilmali. Secret, credential veya API key iceriyorsa UYARI ver — manifest'e secret yazmak yerine env var referansi kullan.
- **Downstream:**
  - `rules/domain-rules.md` generation
  - Agent instructions per rule
  - Validation hooks where applicable
  - Example categories that may emerge:
    - **API contract:** response format, error handling, status codes
    - **Security:** data logging restrictions, auth patterns
    - **Code patterns:** naming conventions, file organization
    - **Business logic:** calculation rules, state machine constraints

### Q4 — Guvenlik Oncelik Seviyesi
- **Text:** `"Projenin guvenlik oncelik seviyesi nedir?"`
- **Options:**
  - `a)` Standart — genel web uygulamasi
  - `b)` Yuksek — finans, saglik, kisisel veri (KVKK/GDPR)
  - `c)` Kritik — odeme isleme, devlet sistemleri
- **Skip condition:** never — always ask
- **Maps to:** `manifest.project.security_level`
- **Downstream:**
  - **a → standard:**
    - Mevcut security modulu yeterli
    - task-hunter Dual-Pass modifier PASIF
    - Guvenlik hook'lari (codebase-guard) her zaman aktif, ek kontrol yok
    - Enforce: manifest.task_hunter_directives.dual_pass = false
  - **b → high:**
    - IDOR scan zorunlu (opsiyonel degil)
    - Ek guvenlik hook'lari aktif
    - Security review her PR'da
    - task-hunter Dual-Pass modifier AKTIF
    - pre-commit hook'ta secret scanning siki mod
    - Enforce: manifest.task_hunter_directives.dual_pass = true
    - Enforce: task-review.skeleton.md devils-advocate ZORUNLU (kosulsuz)
  - **c → critical:**
    - Tum guvenlik kontrolleri maksimum
    - pre-commit'te guvenlik taramasi genisletilmis
    - git hook'lara ek secret scanning
    - task-hunter Dual-Pass modifier AKTIF
    - Adversarial Testing her guvenlik-iliskili gorevde ZORUNLU
    - Enforce: manifest.task_hunter_directives.dual_pass = true
    - Enforce: manifest.task_hunter_directives.adversarial_testing = always
    - Enforce: task-review.skeleton.md devils-advocate ZORUNLU + maks 2 iterasyon

### Q5 — Hedef CLI Araclari
- **Text:** `"Claude Code disinda hangi CLI araclarini kullaniyorsunuz? (Agentbase bu araclara da komut/skill uretecek)"`
- **Options:**
  - `a)` Gemini CLI
  - `b)` Codex CLI
  - `c)` Kimi CLI
  - `d)` OpenCode
  - `e)` Hicbiri — sadece Claude Code
- **Multi-select:** Virgul ile birden fazla secilebilir (orn: a,b,c). `claude` her zaman dahil edilir.
- **Skip condition:** never — always ask
- **Maps to:** `manifest.targets`
- **Downstream:**
  - `transform.js` secilen hedeflere gore `.gemini/`, `.codex/`, `.kimi/`, `.opencode/` dizinleri uretir
  - Sadece `e` secilirse `targets: [claude]` — transform atlanir

### Q6 — Son Eklemeler
- **Text:** `"Baska eklemek istedigin bir sey var mi? Bu son soru."`
- **Type:** open-ended, optional
- **Skip condition:** never — always ask
- **Maps to:** `manifest.rules.domain[]` (if applicable)
- **Downstream:**
  - Routed to appropriate manifest field based on content analysis
  - May generate additional rules, workflow notes, or project documentation
  - If empty/skipped: no action taken

---

## Phase Completion

When all applicable questions are answered, Bootstrap:

1. Populates `manifest.rules.forbidden[]` and `manifest.rules.domain[]`
2. Generates `rules/` directory → hedef: `Agentbase/.claude/rules/`:
   - `.claude/rules/forbidden-commands.md` — yasakli komutlar ve hook tanimlari
   - `.claude/rules/design-system.md` — UI/tasarim kurallari (if applicable)
   - `.claude/rules/domain-rules.md` — domain-spesifik kurallar
3. Configures pre-exec hooks for forbidden commands
4. Completes the interview — proceeds to **manifest compilation and file generation**

---

## Post-Interview: Manifest Compilation

After all 4 phases, Bootstrap:

1. Compiles the full `project-manifest.yaml` from all collected answers
2. Generates all target files (`PROJECT.md`, `ARCHITECTURE.md`, `STACK.md`, `WORKFLOWS.md`, `DEVELOPER.md`, `README.md`)
3. Generates `rules/` directory with all rule files
4. Configures hooks based on manifest
5. Presents summary to developer for final review

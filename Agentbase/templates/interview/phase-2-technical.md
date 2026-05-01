# Phase 2 — Technical Preferences

> **Feeds:** `STACK.md`, `WORKFLOWS.md`, hook/rule configuration
> **Goal:** Gelistirme surecleri, test stratejisi ve teknik convention'lari belirlemek.

---

## Auto-Detection (Sorulardan Once Calistir)

| Field                  | Detection Source                                           | Manifest Path                        |
|------------------------|------------------------------------------------------------|--------------------------------------|
| Test framework         | `jest.config.*`, `vitest.config.*`, `pytest.ini`, `phpunit.xml`, test directories | `manifest.stack.test_framework`      |
| Test commands          | `package.json#scripts.test`, `Makefile` test targets       | `manifest.stack.test_commands`       |
| Linter config          | `.eslintrc.*`, `biome.json`, `.flake8`, `.rubocop.yml`     | `manifest.stack.linter`              |
| Formatter config       | `.prettierrc.*`, `biome.json`, `.editorconfig`, `ruff.toml` | `manifest.stack.formatter`           |
| Branch model           | `git branch -a` analysis, CI branch triggers               | `manifest.workflows.branch_model`    |
| CI/CD pipeline         | `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`      | `manifest.workflows.ci_pipeline`     |
| ORM / Database         | Prisma schema, TypeORM config, SQLAlchemy, Django models   | `manifest.stack.orm`                 |
| Migration files        | `migrations/` directory, Prisma migrations, Alembic        | `manifest.stack.migration_strategy`  |

---

## Questions

### Q1 — Test Stratejisi
- **Text:** `"Test stratejiniz nedir?"`
- **Options:**
  - `a)` Her degisiklikte test yazilir (TDD/test-first)
  - `b)` Testler var ama her zaman yazilmiyor
  - `c)` Minimal test — sadece kritik path'ler
  - `d)` Henuz test yok
- **Skip condition:** `manifest.detected.test_framework.confidence == "high"` ise sorulmaz (test framework paketi tespit edildi → test stratejisi `tests-exist` varsayılır).
- **Default selection:** `manifest.detected.test_framework.confidence == "medium"` ise tespit edilen değer default seçili (`b` testler var). `low` ise default yok, standart soru.
- **Maps to:** `manifest.workflows.test_strategy`
- **Downstream:**
  - **a → TDD:** task-hunter her task'a test yazma adimi ekler, verification gate test pass gerektirir
  - **b → moderate:** task-hunter test oneriri ama zorunlu tutmaz
  - **c → minimal:** sadece kritik path'lerde test beklenir
  - **d → none:** test adimi atlanir, ileride eklenebilir notu duser

### Q2 — Branch Modeli
- **Text:** `"Branch modeli?"`
- **Show hint:** Auto-detected branch info (e.g. `"[main + develop branch'leri tespit edildi]"`)
- **Options:**
  - `a)` main/master direkt push
  - `b)` Feature branch → PR → merge
  - `c)` Gitflow (develop/release/hotfix)
  - `d)` Trunk-based development
- **Skip condition:** never — always ask
- **Maps to:** `manifest.workflows.branch_model`
- **Downstream:**
  - Branch naming rules in `WORKFLOWS.md`
  - PR template generation (if b or c)
  - Hook: block direct push to protected branches (if b or c)

### Q3 — Commit Convention
- **Text:** `"Commit mesaj convention'i?"`
- **Options:**
  - `a)` Conventional Commits (feat:, fix:, refactor:)
  - `b)` Serbest format
  - `c)` Proje-spesifik convention var (acikla)
- **Follow-up (if c):** `"Convention'inizi kisa aciklayin"`
- **Skip condition:** `manifest.detected.commit_convention.confidence == "high"` ise sorulmaz (git log heuristic > %60 conventional eşleşme).
- **Default selection:** `manifest.detected.commit_convention.confidence == "medium"` ise tespit edilen değer default seçili (genellikle `a` conventional). `low` ise default yok, standart soru.
- **Maps to:** `manifest.workflows.commit_convention`, `manifest.workflows.commit_prefix_map`
- **Downstream:**
  - Commit message validation hook
  - Agent commit message formatting rules
  - `WORKFLOWS.md` commit section

### Q4 — Veritabani Migration
- **Text:** `"Veritabani migration stratejiniz?"`
- **Show hint:** `"[{detected_orm} tespit edildi]"` if applicable
- **Options:**
  - `a)` ORM migration ({detected_orm})
  - `b)` Manuel SQL
  - `c)` Migration yok
- **Skip condition:** Aşağıdaki koşullardan biri sağlanırsa sorulmaz:
  - `manifest.detected.migration.confidence == "high"` (ORM tespit edildi → otomatik `a`)
  - Database/ORM hiç tespit edilmediyse (mevcut davranış korundu)
- **Default selection:** `manifest.detected.migration.confidence == "medium"` ise tespit edilen değer default seçili (genellikle `b` manuel SQL). `low` ise default yok, standart soru.
- **Maps to:** `manifest.stack.migration_strategy`
- **Downstream:**
  - `STACK.md` database section
  - Migration safety hooks (e.g. block `prisma db push` in production)
  - Schema change workflow in `WORKFLOWS.md`

### Q5 — Auto-Format Hook
- **Text:** `"Auto-format hook'u isteniyor mu? [{detected_formatter}] tespit edildi."`
- **Options:**
  - `a)` Evet — her dosya kaydinda otomatik format
  - `b)` Hayir — manuel calistiririm
- **Skip condition:** No formatter detected (prettier/biome/ruff/black)
- **Maps to:** `manifest.workflows.auto_format`
- **Downstream:**
  - Pre-commit hook generation (if a)
  - `WORKFLOWS.md` formatting section
  - Agent behavior: auto-format before commit (if a)

### Q6 — Authentication Tipi
- **Text:** `"Projede authentication var mi? Hangi yontem?"`
- **Options:**
  - `a)` JWT (token-based)
  - `b)` OAuth2 (Google, GitHub, vb.)
  - `c)` Session-based
  - `d)` API key
  - `e)` Yok / henuz planlanmadi
- **Skip condition:** `manifest.detected.auth_method.confidence == "high"` ise sorulmaz. (Not: T3 implementasyonunda auth tespitleri `medium` ile sınırlı; `high` confidence yalnızca ileride netleşmiş kullanım kalıbı doğrulaması ile döner — pratikte bu soru genellikle `medium` default ile sorulur.)
- **Default selection:** `manifest.detected.auth_method.confidence == "medium"` ise tespit edilen değer default seçili (jwt/oauth2/session). `low` ise default yok, standart soru.
- **Maps to:** `manifest.stack.auth_method`
- **Downstream:**
  - **a → JWT:**
    - code-review checklist: token expiry kontrolu, refresh token mekanizmasi, JWT secret guvenli depolama
    - IDOR kontrolleri: userId/ownerId filtreleme zorunlu
  - **b → OAuth2:**
    - code-review checklist: scope validation, token revocation, callback URL guvenlik kontrolu
  - **c → Session:**
    - code-review checklist: CSRF token kontrolu, session fixation korunmasi, cookie guvenlik flag'leri (httpOnly, secure, sameSite)
  - **d → API key:**
    - code-review checklist: key rotation mekanizmasi, rate limiting, key loglama yasagi
  - **e → none:**
    - Auth-spesifik checklist maddeleri eklenmez

### Q7 — Kod Isimlendirme Kurallari
- **Text:** `"Projede hangi isimlendirme konvansiyonu kullaniliyor?"`
- **Options:**
  - `a)` camelCase (JavaScript/TypeScript varsayilani)
  - `b)` snake_case (Python/PHP varsayilani)
  - `c)` PascalCase + camelCase (C#, Java pattern)
  - `d)` Mevcut linter/formatter config'den tespit et
  - `e)` Ozel (acikla)
- **Auto-detect:** `.eslintrc.*`, `biome.json`, `ruff.toml`, `.editorconfig` dosyalarindan naming rule cikarilir. Tespit edildiyse hint olarak gosterilir.
- **Follow-up:** `"Dosya isimlendirme kurali? (kebab-case, snake_case, PascalCase)"`
- **Skip condition:** never — always ask
- **Maps to:** `manifest.conventions.naming`, `manifest.conventions.file_naming`
- **Downstream:**
  - `.claude/CONVENTIONS.md` icindeki NAMING_RULES blogu doldurulur
  - code-review-check hook'unda naming pattern kontrolu aktif olur
  - Tum agent'lar yeni kod yazarken bu konvansiyona uyar
  - **a → camelCase:** `functionName`, `variableName`, dosya: `kebab-case.js`
  - **b → snake_case:** `function_name`, `variable_name`, dosya: `snake_case.py`
  - **c → PascalCase+camelCase:** `ClassName`, `methodName`, dosya: `PascalCase.cs`

---

## Phase Completion

When all applicable questions are answered, Bootstrap:

1. Populates `manifest.workflows.*`, `manifest.stack.*` and `manifest.conventions.*` fields
2. Generates draft `STACK.md` with detected + confirmed tech details
3. Generates draft `WORKFLOWS.md` with branch/test/commit rules
4. Configures hook templates based on answers
5. Proceeds to **Phase 3 — Developer Profile**

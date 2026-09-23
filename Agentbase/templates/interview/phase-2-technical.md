# Phase 2 — Technical Preferences

> **Feeds:** `STACK.md`, `WORKFLOWS.md`, hook/rule configuration
> **Goal:** Decide development processes, test strategy, and technical conventions.

---

## Auto-Detection (Run Before Questions)

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

### Q1 — Test Strategy
- **Text:** `"What is your test strategy?"`
- **Options:**
  - `a)` Write tests on every change (TDD/test-first)
  - `b)` Tests exist but are not always written
  - `c)` Minimal tests — critical paths only
  - `d)` No tests yet
- **Skip condition:** Not asked if `manifest.detected.test_framework.confidence == "high"` (test framework package detected → test strategy assumed `tests-exist`).
- **Default selection:** If `manifest.detected.test_framework.confidence == "medium"`, detected value is the default (`b` tests exist). If `low`, no default; standard question.
- **Maps to:** `manifest.workflows.test_strategy`
- **Downstream:**
  - **a → TDD:** task-hunter adds a write-tests step to every task; verification gate requires tests to pass
  - **b → moderate:** task-hunter suggests tests but does not require them
  - **c → minimal:** tests expected only on critical paths
  - **d → none:** test step skipped; note left that they can be added later

### Q2 — Branch Model
- **Text:** `"Branch model?"`
- **Show hint:** Auto-detected branch info (e.g. `"[main + develop branches detected]"`)
- **Options:**
  - `a)` Direct push to main/master
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
- **Text:** `"Commit message convention?"`
- **Options:**
  - `a)` Conventional Commits (feat:, fix:, refactor:)
  - `b)` Free-form
  - `c)` Project-specific convention exists (explain)
- **Follow-up (if c):** `"Briefly describe your convention"`
- **Skip condition:** Not asked if `manifest.detected.commit_convention.confidence == "high"` (git log heuristic > 60% conventional match).
- **Default selection:** If `manifest.detected.commit_convention.confidence == "medium"`, detected value is the default (usually `a` conventional). If `low`, no default; standard question.
- **Maps to:** `manifest.workflows.commit_convention`, `manifest.workflows.commit_prefix_map`
- **Downstream:**
  - Commit message validation hook
  - Agent commit message formatting rules
  - `WORKFLOWS.md` commit section

### Q4 — Database Migration
- **Text:** `"What is your database migration strategy?"`
- **Show hint:** `"[{detected_orm} detected]"` if applicable
- **Options:**
  - `a)` ORM migration ({detected_orm})
  - `b)` Manual SQL
  - `c)` No migration
- **Skip condition:** Not asked if either condition holds:
  - `manifest.detected.migration.confidence == "high"` (ORM detected → automatic `a`)
  - Database/ORM was never detected (existing behavior preserved)
- **Default selection:** If `manifest.detected.migration.confidence == "medium"`, detected value is the default (usually `b` manual SQL). If `low`, no default; standard question.
- **Maps to:** `manifest.stack.migration_strategy`
- **Downstream:**
  - `STACK.md` database section
  - Migration safety hooks (e.g. block `prisma db push` in production)
  - Schema change workflow in `WORKFLOWS.md`

### Q5 — Auto-Format Hook
- **Text:** `"Do you want an auto-format hook? [{detected_formatter}] detected."`
- **Options:**
  - `a)` Yes — auto-format on every file save
  - `b)` No — I will run it manually
- **Skip condition:** No formatter detected (prettier/biome/ruff/black)
- **Maps to:** `manifest.workflows.auto_format`
- **Downstream:**
  - Pre-commit hook generation (if a)
  - `WORKFLOWS.md` formatting section
  - Agent behavior: auto-format before commit (if a)

### Q6 — Authentication Type
- **Text:** `"Does the project have authentication? Which method?"`
- **Options:**
  - `a)` JWT (token-based)
  - `b)` OAuth2 (Google, GitHub, etc.)
  - `c)` Session-based
  - `d)` API key
  - `e)` None / not planned yet
- **Skip condition:** Not asked if `manifest.detected.auth_method.confidence == "high"`. (Note: In the T3 implementation, auth detections are capped at `medium`; `high` confidence only returns later with a confirmed usage-pattern check — in practice this question is usually asked with a `medium` default.)
- **Default selection:** If `manifest.detected.auth_method.confidence == "medium"`, detected value is the default (jwt/oauth2/session). If `low`, no default; standard question.
- **Maps to:** `manifest.stack.auth_method`
- **Downstream:**
  - **a → JWT:**
    - code-review checklist: token expiry check, refresh token mechanism, secure JWT secret storage
    - IDOR checks: userId/ownerId filtering required
  - **b → OAuth2:**
    - code-review checklist: scope validation, token revocation, callback URL security check
  - **c → Session:**
    - code-review checklist: CSRF token check, session fixation protection, cookie security flags (httpOnly, secure, sameSite)
  - **d → API key:**
    - code-review checklist: key rotation mechanism, rate limiting, ban on logging keys
  - **e → none:**
    - Auth-specific checklist items are not added

### Q7 — Code Naming Rules
- **Text:** `"Which naming convention is used in the project?"`
- **Options:**
  - `a)` camelCase (JavaScript/TypeScript default)
  - `b)` snake_case (Python/PHP default)
  - `c)` PascalCase + camelCase (C#, Java pattern)
  - `d)` Detect from existing linter/formatter config
  - `e)` Custom (explain)
- **Auto-detect:** Naming rules are extracted from `.eslintrc.*`, `biome.json`, `ruff.toml`, `.editorconfig`. If detected, shown as a hint.
- **Follow-up:** `"File naming rule? (kebab-case, snake_case, PascalCase)"`
- **Skip condition:** never — always ask
- **Maps to:** `manifest.conventions.naming`, `manifest.conventions.file_naming`
- **Downstream:**
  - NAMING_RULES block inside `.claude/CONVENTIONS.md` is filled
  - Naming pattern check becomes active in the code-review-check hook
  - All agents follow this convention when writing new code
  - **a → camelCase:** `functionName`, `variableName`, file: `kebab-case.js`
  - **b → snake_case:** `function_name`, `variable_name`, file: `snake_case.py`
  - **c → PascalCase+camelCase:** `ClassName`, `methodName`, file: `PascalCase.cs`

---

## Phase Completion

When all applicable questions are answered, Bootstrap:

1. Populates `manifest.workflows.*`, `manifest.stack.*` and `manifest.conventions.*` fields
2. Generates draft `STACK.md` with detected + confirmed tech details
3. Generates draft `WORKFLOWS.md` with branch/test/commit rules
4. Configures hook templates based on answers
5. Proceeds to **Phase 3 — Developer Profile**

# Phase 1 — Project Foundations

> **Feeds:** `PROJECT.md`, `ARCHITECTURE.md`, `README.md`
> **Goal:** Understand what the project is, whom it serves, and how it is deployed.

---

## Auto-Detection (Run Before Questions)

> **If GREENFIELD_MODE = true:** Auto-detection is skipped entirely (nothing to scan).
> All information is gathered from the user in the interview. The S0 (stack selection) question is asked additionally.

Before starting this phase, Bootstrap automatically extracts the following from the codebase:

| Field                        | Detection Source                                  | Manifest Path                     |
|------------------------------|---------------------------------------------------|-----------------------------------|
| Project name                 | `package.json#name` / `pyproject.toml#name` / directory name | `manifest.project.name`           |
| Tech stack                   | Dependency files, framework imports, file extensions | `manifest.stack.detected`         |
| Directory structure          | Filesystem scan (max depth 3)                     | `manifest.project.structure`      |
| Existing scripts             | `package.json#scripts` / `Makefile` / `pyproject.toml#scripts` | `manifest.project.scripts`        |
| Monorepo subprojects         | Workspace config / multiple package.json / apps+packages dirs | `manifest.project.subprojects[]`  |
| API framework                | Express/Fastify/Django/Laravel/FastAPI imports     | `manifest.stack.api_framework`    |
| Deploy config                | `Dockerfile`, `docker-compose.yml`, `.github/workflows/`, `vercel.json`, `netlify.toml`, `coolify` config | `manifest.environments.deploy_hints` |

---

## Questions

### S0 — Stack Selection (GREENFIELD_MODE ONLY)
- **Text:** `"Which technology stack will you use?"`
- **Options:**
  - `a)` Node.js (Express/Fastify/Next.js/Expo)
  - `b)` Python (Django/FastAPI/Flask)
  - `c)` PHP (Laravel/CodeIgniter)
  - `d)` Go
  - `e)` Rust
  - `f)` Java/Kotlin
  - `g)` Other: ___
- **Multi-select:** Multiple can be selected (e.g. a,c)
- **Skip condition:** GREENFIELD_MODE = false (if an existing project exists, stack is auto-detected)
- **Maps to:** `manifest.stack.runtime`, `manifest.stack.detected`
- **Downstream:** Auto-detection hints in all later questions are left empty

### Q1 — Project Description
- **Text:** `"I analyzed the codebase. This looks like a [{detected_stack}] project. What does the project do? Who is it for? (One sentence is enough)"`
- **Type:** open-ended
- **Skip condition:** never — always ask
- **Maps to:** `manifest.project.description`
- **YAML safety:** Free text — when writing to the manifest, wrap in YAML double quotes.
- **Downstream:** `PROJECT.md` header, `README.md` description section

### Q2 — Environments
- **Text:** `"Which environments does it run in?"`
- **Options:**
  - `a)` Local only
  - `b)` Local + staging
  - `c)` Local + production
  - `d)` Local + staging + production
- **Follow-up (if c or d):** `"What is the production URL/domain?"`
- **Skip condition:** No deploy config detected AND no Dockerfile AND no docker-compose (if GREENFIELD_MODE, skip condition is off — always ask)
- **Maps to:** `manifest.environments[]`
- **YAML safety:** Production URL must not contain an API key or secret when written to the manifest. If the URL has a secret as a query param, use an env var reference: `"$PROD_URL"`. The manifest is git-committable — it must not contain sensitive information.
- **Downstream:** `PROJECT.md` environments table, `ARCHITECTURE.md` deployment section

### Q3 — Deploy Method
- **Text:** `"How is deploy done?"`
- **Show hint:** `"[Dockerfile found]"` or `"[CI config found]"` if applicable
- **Options:**
  - `a)` Manual (SSH/FTP)
  - `b)` CI/CD (GitHub Actions, GitLab CI, etc.)
  - `c)` Platform (Vercel, Netlify, Railway, etc.)
  - `d)` Container (Docker + Coolify/Portainer, etc.)
  - `e)` No deploy yet
- **Follow-up (if c):** `"Which platform?"`
- **Follow-up (if d):** `"Which orchestrator? (Coolify/Portainer/direct Docker)"`
- **Skip condition:** No Dockerfile AND no CI config AND no docker-compose (if GREENFIELD_MODE, skip condition is off — always ask)
- **Maps to:** `manifest.environments[].deploy_platform`, `manifest.environments[].deploy_trigger`
- **Downstream:** `ARCHITECTURE.md` deploy pipeline section, CI/CD hook generation

### Q4 — Monorepo Subprojects
- **Text:** `"I detected these subprojects: [{subprojects}]. What is the role of each?"`
- **Type:** key=value list (e.g. `api=backend REST API, mobile=user app`)
- **Skip condition:** Monorepo NOT detected (single project)
- **Maps to:** `manifest.project.subprojects[].role`
- **Downstream:** `ARCHITECTURE.md` subproject sections, per-subproject rules generation

### Q5 — API Prefix
- **Text:** `"What is your API prefix? (e.g. /api/v1, /v1, no prefix)"`
- **Type:** short text
- **Skip condition:** No API framework detected (if GREENFIELD_MODE and a backend stack was selected in S0, ask)
- **Maps to:** `manifest.project.api_prefix`
- **Downstream:** `ARCHITECTURE.md` API structure section, route rules

---

## Phase Completion

When all applicable questions are answered, Bootstrap:

1. Populates `manifest.project.*` and `manifest.environments[]`
2. Generates draft `PROJECT.md` → target: `Agentbase/PROJECT.md`
3. Generates draft `ARCHITECTURE.md` → target: `Agentbase/ARCHITECTURE.md`
4. Proceeds to **Phase 2 — Technical Preferences**

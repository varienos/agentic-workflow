# Phase 1 — Project Foundations

> **Feeds:** `PROJECT.md`, `ARCHITECTURE.md`, `README.md`
> **Goal:** Projenin ne oldugunu, kime hizmet ettigini ve nasil deploy edildigini anlamak.

---

## Auto-Detection (Sorulardan Once Calistir)

> **GREENFIELD_MODE = true ise:** Auto-detection tamamen atlanir (taranacak dosya yok).
> Tum bilgiler roportajda kullanicidan alinir. S0 (stack secimi) sorusu ek olarak sorulur.

Bootstrap bu phase'e baslamadan once asagidaki bilgileri codebase'den otomatik cikarir:

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

### S0 — Stack Secimi (SADECE GREENFIELD_MODE)
- **Text:** `"Hangi teknoloji stack'ini kullanacaksiniz?"`
- **Options:**
  - `a)` Node.js (Express/Fastify/Next.js/Expo)
  - `b)` Python (Django/FastAPI/Flask)
  - `c)` PHP (Laravel/CodeIgniter)
  - `d)` Go
  - `e)` Rust
  - `f)` Java/Kotlin
  - `g)` Diger: ___
- **Multi-select:** Birden fazla secilebilir (orn: a,c)
- **Skip condition:** GREENFIELD_MODE = false (mevcut proje varsa stack auto-detect edilir)
- **Maps to:** `manifest.stack.runtime`, `manifest.stack.detected`
- **Downstream:** Tum sonraki sorulardaki auto-detection ipuclari bos birakilir

### Q1 — Proje Aciklamasi
- **Text:** `"Codebase'i analiz ettim. Bu bir [{detected_stack}] projesi gibi gorunuyor. Proje ne yapiyor? Kim icin? (Tek cumle yeterli)"`
- **Type:** open-ended
- **Skip condition:** never — always ask
- **Maps to:** `manifest.project.description`
- **YAML safety:** Serbest metin — manifest'e yazilirken YAML cift tirnak icinde yazilmali.
- **Downstream:** `PROJECT.md` header, `README.md` description section

### Q2 — Ortamlar (Environments)
- **Text:** `"Hangi ortamlarda calisiyor?"`
- **Options:**
  - `a)` Sadece local
  - `b)` Local + staging
  - `c)` Local + production
  - `d)` Local + staging + production
- **Follow-up (if c or d):** `"Production URL/domain nedir?"`
- **Skip condition:** No deploy config detected AND no Dockerfile AND no docker-compose (GREENFIELD_MODE ise skip condition yok — her zaman sor)
- **Maps to:** `manifest.environments[]`
- **YAML safety:** Production URL manifest'e yazilirken API key veya secret icermemeli. URL'de query param olarak secret varsa env var referansi kullan: `"$PROD_URL"`. Manifest git'e eklenebilir — sensitive bilgi icermemeli.
- **Downstream:** `PROJECT.md` environments table, `ARCHITECTURE.md` deployment section

### Q3 — Deploy Yontemi
- **Text:** `"Deploy nasil yapiliyor?"`
- **Show hint:** `"[Dockerfile bulundu]"` or `"[CI config bulundu]"` if applicable
- **Options:**
  - `a)` Manuel (SSH/FTP)
  - `b)` CI/CD (GitHub Actions, GitLab CI vb.)
  - `c)` Platform (Vercel, Netlify, Railway vb.)
  - `d)` Container (Docker + Coolify/Portainer vb.)
  - `e)` Henuz deploy yok
- **Follow-up (if c):** `"Hangi platform?"`
- **Follow-up (if d):** `"Hangi orchestrator? (Coolify/Portainer/direkt Docker)"`
- **Skip condition:** No Dockerfile AND no CI config AND no docker-compose (GREENFIELD_MODE ise skip condition yok — her zaman sor)
- **Maps to:** `manifest.environments[].deploy_platform`, `manifest.environments[].deploy_trigger`
- **Downstream:** `ARCHITECTURE.md` deploy pipeline section, CI/CD hook generation

### Q4 — Monorepo Alt Projeler
- **Text:** `"Su alt projeleri tespit ettim: [{subprojects}]. Her birinin rolu ne?"`
- **Type:** key=value list (e.g. `api=backend REST API, mobile=kullanici uygulamasi`)
- **Skip condition:** Monorepo NOT detected (single project)
- **Maps to:** `manifest.project.subprojects[].role`
- **Downstream:** `ARCHITECTURE.md` subproject sections, per-subproject rules generation

### Q5 — API Prefix
- **Text:** `"API prefix yapisiniz nedir? (orn: /api/v1, /v1, prefix yok)"`
- **Type:** short text
- **Skip condition:** No API framework detected (GREENFIELD_MODE ise S0'da backend stack secildiyse sor)
- **Maps to:** `manifest.project.api_prefix`
- **Downstream:** `ARCHITECTURE.md` API structure section, route rules

---

## Phase Completion

When all applicable questions are answered, Bootstrap:

1. Populates `manifest.project.*` and `manifest.environments[]`
2. Generates draft `PROJECT.md` → hedef: `Agentbase/.claude/PROJECT.md`
3. Generates draft `ARCHITECTURE.md` → hedef: `Agentbase/.claude/ARCHITECTURE.md`
4. Proceeds to **Phase 2 — Technical Preferences**

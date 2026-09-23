# Pre-Deploy — Coolify Production Push Check

> Runs all pre-deployment checks for Coolify production and presents the test report.

> Usage: `/pre-deploy`

---

## Rule: Work Autonomously

* Run all checks in sequence.
* Do not push; this command only checks.
* If an error occurs, report it; do not ask the user mid-flow.
* Complete every step — do not skip a step.

---

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.description, stack.primary, project.structure, project.subprojects
Example output:
## Project Context
- **Project:** SaaS API platform (NestJS + PostgreSQL)
- **Stack:** TypeScript, Prisma, PostgreSQL, Redis
- **Deploy:** Coolify (self-hosted, Hetzner VPS)
- **Structure:**
  - `apps/api/` — NestJS backend
  - `apps/web/` — Next.js frontend
  - `packages/shared/` — Shared libraries

Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## Step 1 — Initial Check (Git Status + Branch)

```bash
cd ../Codebase && git status && git branch --show-current && git log --oneline -1
```

Check:
- [ ] Are there uncommitted changes?
- [ ] Which branch are you on? (WARN if not main/master — Coolify usually auto-deploys on main push)
- [ ] In sync with remote? (check "ahead/behind" in `git status` output)

If there are uncommitted changes:

```
FAIL: Uncommitted changes exist. Commit first.
```

If the branch is not main/master:

```
WARN: You are on '{branch}'. Coolify auto-deploy is usually triggered by a push to main.
```

## Step 2 — Summary of Changes Since Last Deployment

List changes made since the last deployment:
```bash
cd ../Codebase && git log --oneline HEAD~20..HEAD
```

Categorize:

1. **New Features** (feat:)
2. **Bug Fixes** (fix:)
3. **Breaking Changes** (commits containing breaking change)
4. **Database Migrations** (commits containing migration)
5. **Infrastructure Updates** (Dockerfile, docker-compose, entrypoint.sh, CI/CD)

Important: If Dockerfile, docker-compose.prod.yml, or entrypoint.sh changed, call that out especially because those affect the build.

---

## Step 3 — Build Check

Verify successful builds for all sub-projects.

<!-- GENERATE: COMPILE_COMMANDS
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: project.subprojects, project.scripts, stack.primary
Example output:
| Sub-project | Command | Expected Result |
|---|---|---|
| API | `cd ../Codebase/apps/api && npx tsc --noEmit` | No type error |
| Web | `cd ../Codebase/apps/web && npm run build` | Build successful |
| Shared | `cd ../Codebase/packages/shared && npx tsc --noEmit` | No type error |
-->

Run each command. If an error occurs, record it and continue — move on to the next step.

---

## Step 4 — Test Suite

Run all tests.

<!-- GENERATE: TEST_COMMANDS
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: project.subprojects, project.scripts, stack.test_framework
Example output:
| Sub-project | Command | Type |
|---|---|---|
| API (unit) | `cd ../Codebase/apps/api && npm run test` | Jest unit tests |
| API (e2e) | `cd ../Codebase/apps/api && npm run test:e2e` | Integration tests |
| Web (unit) | `cd ../Codebase/apps/web && npm run test` | Vitest unit tests |
-->

Run each test. Record failed tests and continue — move on to the next step.

---

## Step 5 — Database Migration Check

Check database migration status. If an ORM module is active, use its migration control mechanism.

```bash
# Prisma check
cd ../Codebase && npx prisma migrate status 2>/dev/null || echo "Prisma not present or connection error"

# TypeORM check (alternative)
cd ../Codebase && npx typeorm migration:show 2>/dev/null || true

# Drizzle check (alternative)
cd ../Codebase && npx drizzle-kit check 2>/dev/null || true
```

### Validation Checklist

### 1. Unapplied migrations?
*   [ ] Does an unapplied migration exist? → Yes, FAIL (Coolify entrypoint.sh runs migrations — migration file may not have been committed)
*   [ ] Have migration files been committed?

### 2. Destructive migrations?
*   [ ] Is there a destructive migration (DROP TABLE, DROP COLUMN, ALTER COLUMN type change)?

#### If Destructive Migrations Exist
```
WARN: Destructive migration detected. If Coolify auto-rollbacks, the old container runs with the old schema — data loss risk.
```

---

## Step 6 — Environment Variable Consistency

Enforce consistency of production environment variables.

<!-- GENERATE: ENV_CHECKS
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: environments.env_files, environments.required_vars, stack.validation
Example output:
### Environment Variables to Check

**Zod schema:** `apps/api/src/config/env.ts`
**Docker Compose:** `docker-compose.prod.yml`
**Environment Example:** `.env.example`

| Variable | Required | Control |
|---|---|---|
| DATABASE_URL | Yes | Zod + docker-compose + .env.example |
| JWT_SECRET | Yes | Zod + .env.example |
| REDIS_URL | Yes | Zod + docker-compose |
| COOLIFY_URL | No | Controlled by Coolify dashboard |
-->

### 6a — Source Matching

Match the three sources:

```bash
# Extract expected variables from Zod schema (if present)
cd ../Codebase && grep -oE '[A-Z_]{3,}' apps/api/src/config/env.ts 2>/dev/null | sort -u || echo "Zod schema not found"

# Extract environment variables from docker-compose.prod.yml
cd ../Codebase && grep -A 50 'environment:' docker-compose.prod.yml 2>/dev/null | grep -oE '\$\{[A-Z_]+\}' | tr -d '${|}' | sort -u || echo "docker-compose.prod.yml not found"

# Extract variables from .env.example
cd ../Codebase && grep -E '^[A-Z_]+=' .env.example 2>/dev/null | cut -d= -f1 | sort -u || echo ".env.example not found"
```

Compare variables that must be defined in all three sources. FAIL if any are missing.

### 6b — Security Checks

```bash
cd ../Codebase

# NODE_ENV check — must be "production" in docker-compose.prod.yml
grep -E 'NODE_ENV' docker-compose.prod.yml 2>/dev/null || echo "NODE_ENV not defined"

# CORS origin check — must not be localhost or wildcard
grep -rn 'CORS\|cors\|origin' --include="*.ts" --include="*.js" --include="*.yml" --include="*.yaml" . 2>/dev/null | grep -iE 'localhost|127\.0\.0\.1|\*' | grep -v node_modules | grep -v '.test.' | grep -v '.spec.' || echo "No CORS issue"

# Localhost leak scan — hardcoded localhost except test files
grep -rn 'localhost\|127\.0\.0\.1' --include="*.ts" --include="*.js" . 2>/dev/null | grep -v node_modules | grep -v '.test.' | grep -v '.spec.' | grep -v '.mock.' | grep -v '__test__' | grep -v 'README' | head -20 || echo "No localhost reference"

# JWT/secret placeholder check
grep -rn 'your-secret\|changeme\|CHANGE_ME\|TODO.*secret\|placeholder' --include="*.ts" --include="*.js" --include="*.env*" --include="*.yml" . 2>/dev/null | grep -v node_modules | grep -v '.test.' | head -10 || echo "No placeholder"
```

| Control | Condition | Rule |
| --- | --- | --- |
| NODE_ENV = production | Mandatory | FAIL if "production" is not present |
| CORS origin | Mandatory | FAIL if localhost or * is present |
| Localhost leak | Warning | WARN if non-test files contain localhost |
| JWT/secret placeholder | Mandatory | FAIL if placeholder value is present |

## Step 7 — Docker Build Check (Optional)

Coolify performs the build from Docker. Local Docker build testing is optional.

### Triggers

This step runs ONLY if one of the following files changed:

```bash
cd ../Codebase && git diff --name-only HEAD~5..HEAD | grep -E 'Dockerfile|docker-compose|entrypoint\.sh|package.*\.json' || echo "No Docker-related changes"
```

If no changes are made, SKIP this step and mark SKIP in the report.

<!-- GENERATE: DEPLOY_CONFIG
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: environments.deploy_platform, environments.docker_compose, project.subprojects

Example output:

### Docker Build Commands

| Service | Command |
|---|---|
| API | `cd ../Codebase && docker build -f apps/api/Dockerfile -t coolify-api-test .` |
| Web | `cd ../Codebase && docker build -f apps/web/Dockerfile -t coolify-web-test .` |

### Docker Compose Files
- Production: `../Codebase/docker-compose.prod.yml`
- Development: `../Codebase/docker-compose.yml`

### Health Check Configuration
- API: `http://localhost:3000/health`
- Interval: 30s, Timeout: 10s, Retries: 3

### Coolify Build Info
- Coolify runs `docker build` during build
- `entrypoint.sh` runs when the container starts (migration, seed, etc.)
- If health check fails, Coolify keeps the old container (automatic rollback)
-->

If a Docker build will be run:

```bash
# Check that entrypoint.sh is executable
cd ../Codebase && test -f entrypoint.sh && ls -la entrypoint.sh | grep -q 'x' && echo "entrypoint.sh executable" || echo "WARN: entrypoint.sh not executable or missing"

# Dockerfile syntax check (if hadolint is available)
cd ../Codebase && which hadolint > /dev/null 2>&1 && hadolint Dockerfile || echo "hadolint not installed; Dockerfile syntax check skipped"
```

> **NOTE:** Docker build time can be long. If the `SKIP_DOCKER_BUILD` flag is present, skip this step.

---

## Step 8 — Result Report

Report all steps' results in the following format:

```
## Pre-Deploy Report (Coolify)

### Overall Status: [PASS / FAIL / WARN]

### Change Summary
- X new features, Y bug fixes, Z other
- Breaking change: [yes/no]
- DB migration: [yes/no]
- Infrastructure change: [yes/no] (Dockerfile, docker-compose, entrypoint.sh)

### Check Results

| # | Step | Status | Detail |
|---|---|---|---|
| 1 | Git status | PASS/FAIL | ... |
| 2 | Change summary | INFO | X commits, Y changes |
| 3 | Build | PASS/FAIL | ... |
| 4 | Tests | PASS/FAIL | X/Y passed |
| 5 | Migration | PASS/FAIL/WARN | ... |
| 6 | Env sync | PASS/FAIL | ... |
| 7 | Docker build | PASS/FAIL/SKIP | ... |

### Failed Checks
[detailed list if any — which step, which error, what to do]

### Coolify Deploy Note
- When pushed, Coolify will start an automatic build
- Estimated build time: ~60-90 seconds
- If health check fails, Coolify keeps the old container
- After deploy, validate with `/post-deploy`

### Recommendations
[actions if any]
```

Commit completed non-sensitive work in the same session without asking. Do not push unless the user asks.

---

## Decision Matrix

| Condition | Decision | Action |
| --- | --- | --- |
| All steps PASS | PASS | Deployable — `git push origin main` |
| All PASS, some WARN | WARN | Deployable — notify on review |
| Tests FAIL | FAIL | Deploy not possible; tests need to be fixed |
| Compilation FAIL | FAIL | Deploy not possible; compilation errors need to be fixed |
| Missing migration | FAIL | Migration file needs to be committed |
| Environment missing/unconfigured | FAIL | Environment variables need to be completed |
| NODE_ENV != production | FAIL | `docker-compose.prod.yml` should have NODE_ENV=production |
| CORS localhost/wildcard | FAIL | CORS configuration needs to be fixed |
| Secret placeholder | FAIL | Placeholder values need to be replaced with actual values |
| Docker build FAIL | WARN | Investigate Docker build issue (will also fail in Coolify) |
| Uncommitted changes | FAIL | Commit first |
| SKIP (no trigger condition) | — | Does not affect the result |

---

## Mandatory Rules

### Invariant rules (apply to every command)

1. **Do not write config into Codebase** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` files are created ONLY inside Agentbase. Creating a `.claude/` directory inside Codebase or writing `../Codebase/CLAUDE.md` is FORBIDDEN.
2. **Git runs only in Codebase** — All git operations (commit, push, branch) run inside `../Codebase/`. There is NO git in Agentbase.
3. **Codebase is readable; config is not written there** — Project files (`src/`, `app/`, etc.) can be read and edited when the task requires it. Config files (`.claude/`, `CLAUDE.md`) CANNOT be written inside Codebase.

1. **Do not ask questions mid-check** — All checks run silently; only the result is reported.
2. **Do not push** — This command only checks; never pushes anything.
3. **Report findings** — If an error is found, report it.
4. **Run all steps** — Even if one step fails, proceed to the next step.
5. **SKIP != FAIL** — SKIP does not affect the overall result the way FAIL does.
6. **Missing migration = FAIL** — Uncommitted migration files always fail.
7. **Short report** — Omit unnecessary details; only report condition + action.
8. **Result report mandatory** — A result report is required in all situations.

<!-- GENERATE: SELF_REFRESH
Description: Command final step - self-refresh check. Bootstrap replaces this marker
with the shared Self-Refresh section. The command reviews its own text against the
project reality: small mismatches via Edit, large changes reported as a backlog task.
-->

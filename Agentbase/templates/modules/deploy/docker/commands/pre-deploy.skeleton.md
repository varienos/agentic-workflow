# Pre-Deploy — Production Push Check

> Runs all checks before sending to production and presents a result report.
> Usage: `/pre-deploy`

---

## Rule: WORK AUTONOMOUSLY

- Do NOT ask the user questions — run all checks in order.
- Do NOT PUSH anything — only check and report.
- If you find an error, do NOT FIX it — report and leave it to the user.
- RUN every step — do not skip a step.

---

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: project.description, stack.primary, project.structure, project.subprojects
Example output:
## Project Context
- **Project:** E-commerce platform (Next.js + NestJS + React Native)
- **Stack:** TypeScript, Prisma, PostgreSQL, Expo
- **Structure:**
  - `apps/web/` — Next.js frontend
  - `apps/api/` — NestJS backend
  - `apps/mobile/` — Expo React Native
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## Step 1 — Initial Check

```bash
cd ../Codebase && git status
```

Check:
- [ ] Are there uncommitted changes?
- [ ] Which branch are you on? (WARN if outside main/master)
- [ ] Synced with remote?

If there are uncommitted changes:
```
⚠️ There are uncommitted changes. Commit first.
```

---

## Step 2 — Change Summary

List changes since the last deploy:

```bash
cd ../Codebase && git log --oneline HEAD~20..HEAD
```

Categorize changes:
- **New features** (feat:)
- **Bug fixes** (fix:)
- **Breaking changes** (commits containing a breaking change)
- **Database changes** (commits containing a migration)

---

## Step 3 — Compile Check

Verify that all subprojects compile successfully.

<!-- GENERATE: COMPILE_COMMANDS
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: project.subprojects, project.scripts, stack.primary
Example output:
| Subproject | Command | Expected Result |
|---|---|---|
| API | `cd ../Codebase/apps/api && npx tsc --noEmit` | No type errors |
| Web | `cd ../Codebase/apps/web && npm run build` | Build successful |
| Shared | `cd ../Codebase/packages/shared && npx tsc --noEmit` | No type errors |
-->

Run each command. If there is an error, record it and continue — do not stop.

---

## Step 4 — Test Suite

Run all tests.

<!-- GENERATE: TEST_COMMANDS
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: project.subprojects, project.scripts, stack.test_framework
Example output:
| Subproject | Command | Type |
|---|---|---|
| API (unit) | `cd ../Codebase/apps/api && npm run test` | Jest unit tests |
| API (e2e) | `cd ../Codebase/apps/api && npm run test:e2e` | End-to-end tests |
| Web (unit) | `cd ../Codebase/apps/web && npm run test` | Vitest unit tests |
| Shared | `cd ../Codebase/packages/shared && npm run test` | Unit tests |
-->

Run each test. Record failures and continue — do not stop.

---

## Step 5 — Database Migration Check

Check migration status:
- Are there unapplied migrations?
- Are migration files committed?
- Is there a destructive migration? (DROP TABLE, DROP COLUMN)

```bash
cd ../Codebase && npx prisma migrate status 2>/dev/null || echo "Prisma missing or connection error"
```

---

## Step 6 — Environment Variable Synchronization

Verify that production environment variables are defined.

<!-- GENERATE: ENV_CHECKS
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: environments.env_files, environments.required_vars, stack.validation
Example output:
### Environment Variables to Check

**Source:** `.env.example` or Zod schema (`apps/api/src/config/env.ts`)

| Variable | Required | Check Method |
|---|---|---|
| DATABASE_URL | Yes | Defined in `.env`? |
| JWT_SECRET | Yes | Defined in `.env`? |
| REDIS_URL | Yes | Defined in `.env`? |
| SMTP_HOST | No | Optional |

**Docker Compose check:**
```bash
cd ../Codebase && grep -E '^\s+\w+:$' docker-compose.yml | head -20
```
-->

---

## Step 7 — Docker Build Check (Optional)

Verify that the Docker image can be built successfully:

<!-- GENERATE: DEPLOY_CONFIG
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: environments.deploy_platform, environments.docker_compose, project.subprojects
Example output:
### Docker Build Commands

| Service | Command |
|---|---|
| API | `cd ../Codebase && docker build -f apps/api/Dockerfile -t api-test .` |
| Web | `cd ../Codebase && docker build -f apps/web/Dockerfile -t web-test .` |

### Docker Compose Files
- Production: `../Codebase/docker-compose.prod.yml`
- Development: `../Codebase/docker-compose.yml`

### Health Check URLs
- API: `http://localhost:3000/health`
- Web: `http://localhost:3001`
-->

> **NOTE:** Docker build can take a long time. Skip this step if the `SKIP_DOCKER_BUILD` flag is set.

---

## Step 8 — Result Report

Report the results of all steps in the following format:

```
## 📋 Pre-Deploy Report

### Overall Status: [PASS ✅ / FAIL ❌ / WARN ⚠️]

### Change Summary
- X new features, Y bug fixes, Z other
- Breaking change: [yes/no]
- DB migration: [yes/no]

### Check Results

| Step | Status | Detail |
|---|---|---|
| Git status | ✅/❌ | ... |
| Compile | ✅/❌ | ... |
| Tests | ✅/❌ | X/Y passed |
| Migration | ✅/❌/⚠️ | ... |
| Env sync | ✅/❌ | ... |
| Docker build | ✅/❌/⏭️ | ... |

### Failed Checks
[detailed list if any]

### Recommendations
[actions if any]
```

---

## Decision Matrix

| Status | Decision | Action |
|---|---|---|
| All steps PASS | ✅ PASS | Ready to deploy |
| Tests FAIL | ❌ FAIL | Cannot deploy; tests must be fixed |
| Compile FAIL | ❌ FAIL | Cannot deploy; compile errors must be fixed |
| Env missing | ❌ FAIL | Environment variables must be completed |
| Migration warning | ⚠️ WARN | Can deploy; proceed carefully |
| Docker build FAIL | ⚠️ WARN | Investigate Docker build issue |
| Uncommitted changes | ❌ FAIL | Commit first |

---

## Mandatory Rules

### Invariant Rules (Valid in Every Command)

1. **Do not write config into Codebase** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` files are created ONLY inside Agentbase. Creating a `.claude/` directory inside Codebase or writing `../Codebase/CLAUDE.md` is FORBIDDEN.
2. **Git runs only in Codebase** — All git operations (commit, push, branch) run inside `../Codebase/`. There is NO git in Agentbase.
3. **Codebase is readable; config is not written there** — Project files (`src/`, `app/`, etc.) can be read and edited when the task requires it. Config files (`.claude/`, `CLAUDE.md`) CANNOT be written inside Codebase.

1. **Do not ask questions** — Run all checks silently and only show the result report.
2. **Do not push** — This command only checks; it pushes nothing.
3. **Do not fix** — If you find an error, report it; do not try to fix it.
4. **Run every step** — Even if one step fails, continue to the next.
5. **Result report is REQUIRED** — The Step 8 report must be produced in every case.

<!-- GENERATE: SELF_REFRESH
Description: Command last step - self-refresh check. Bootstrap replaces this marker
with the shared Self-Refresh section. The command reviews its own text in light of
project reality: small mismatches via Edit, large changes reported as a backlog task.
-->

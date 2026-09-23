# Post-Deploy — Coolify Deploy Validation

> Coolify from user-side validates the production environment's stability after deployment.
> Usage: `/post-deploy`

---

## Invariant Rule: Automation Test

- Perform sequential tests on all controls — do not change anything.
- Do not modify any element — only test and report.
- Execute all steps — complete one step.
- If rollback is required, follow instructions — do not attempt to make changes yourself.

---

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields:
  - project.description
  - stack.primary
  - project.structure
  - project.subprojects
Example output:
## Project Overview
- **Project:** SaaS API platform (NestJS + PostgreSQL)
- **Stack:** TypeScript, Prisma, PostgreSQL, Redis
- **Deploy:** Coolify (self-hosted, Hetzner VPS)
- **Architecture:**
  - `apps/api/` — NestJS backend
  - `apps/web/` — Next.js frontend
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
- Git only operates on the codebase -->

---

## Step 1 — Deployment Wait Period

Wait for the Coolify build + deployment process to complete:
```bash
echo "Coolify build + deploy bekleniyor (90 saniye)..." && sleep 90
```
> **NOT:** The build duration changes based on the project. Typical times:
>
> - Simple Node.js application: 30-60 seconds
> - Multi-stage Docker build: 60-120 seconds
> - Monorepo build: 90-180 seconds
>
> You can control whether the build has completed by checking Coolify dashboard.

---

## Step 2 — Health Check

Check the health status of your production environment.

<!-- GENERATE: HEALTH_CHECK_URL
Description: This section is populated with manifest data from Bootstrap.
Required manifest fields: environments.health_check, environments.production_url
Example output:
### Health Check Endpoints

| Service | URL | Expected Response | Timeout |
|---|---|---|---|
| API | `https://api.example.com/health` | HTTP 200 + `{"status":"ok"}` | 10s |
| Web | `https://www.example.com` | HTTP 200 | 10s |

---
```bash
# API health check
curl -sf --max-time 10 https://api.example.com/health | jq .

# Web health check
curl -sf --max-time 10 -o /dev/null -w "%{http_code}" https://www.example.com
```

### Retry Mechanism

For each endpoint, perform three retries (15 seconds apart) to avoid Coolify container restarts:

```
Deneme 1 → failed → wait 15 seconds
Deneme 2 → failed → wait 15 seconds
Deneme 3 → failed → FAIL
```
### Invariant Rules

Invariant rules:

3. If the first test fails, mark it as FAIL.

### Coolify-Specific Health Check Information

Coolify has a health check mechanism. If the Coolify health check fails:
- New container will be automatically stopped
- Old container will be preserved and traffic will be redirected to the old version
- In this case, production will still run on the old version

Run this command (`/post-deploy`) after verifying that Coolify's build and health check are successful.

>>>

---

## Step 3 — Smoke Test

Verify basic user workflows.

<!-- GENERATE: SMOKE_TEST_ENDPOINTS
Explanation: This section is populated by Bootstrap using manifest data.
Required manifest fields: environments, api_endpoints, project.api_prefix
Example output:
## Smoke Test Endpoints

| Endpoint | Expected | Auth |
|---|---|---|
| `GET https://api.example.com/health` | 200 OK | — |
| `GET https://api.example.com/api/v1/users` | 200 | Authorization necesario |
| `POST https://api.example.com/api/v1/orders` | 201 | Authorization necessário |
| `GET https://api.example.com/api/v1/products` | 200 | — |

-->

For each endpoint, check the HTTP status code and response body. If there is a difference from the expected response, warn.

---

## Step 4 — Migration Status

Verify that database migrations were successful.

In Coolify, migration typically runs when the container starts up in `entrypoint.sh`. Verify that this step completes successfully:

```shell
# Shell command to check migration status
# Replace 'path/to/migration/check' with actual path
bash
# Path to the migration check
/path/to/migration/check
bash
# Local version (last pushed commit)
cd ../Codebase && git rev-parse --short HEAD
## Step 7 — Rollback Guide

> This section is only displayed in case of a DEPLOY_FAIL. Skip DEPLOY_OK or DEPLOY_WARN.

### Method 1 — Coolify Dashboard (Recommended)


```
1. Navigate to the Coolify Dashboard → Project → Select Application
2. Go to the "Deployments" tab
3. Find the latest successful deployment (green marked)
4. Click on the "Redeploy" button
5. Coolify will create a new container from the old image
6. Wait for the deployment to complete and verify `/post-deploy`
```


### Method 2 — Coolify API with Rollback


```bash
# Find the latest successful deployment
# curl -sf -H "Authorization: Bearer $COOLIFY_TOKEN" \
#   "https://coolify.example.com/api/v1/applications/{uuid}/deployments" | \
#   jq '[.[] | select(.status == "finished")] | .[0]'

# Trigger redeployment
# curl -sf -X POST -H "Authorization: Bearer $COOLIFY_TOKEN" \
#   "https://coolify.example.com/api/v1/applications/{uuid}/restart"
```


### Method 3 — Git Revert (Last Resort)

>>>
bash
cd ../Codebase
git log --oneline -5          # Find the most recent successful commit
git revert HEAD               # Revert to the last commit
git push origin main          # Automatically start a new build
- A new container is started → The health check is performed → Failure → The new container is stopped
- The old container still runs, and traffic is redirected to the previous container
- In this situation, "rollback" has already occurred, but the root cause needs to be investigated

### Step 8 — Deploy Log

Save the deployment result.

<!-- GENERATE: DEPLOY_LOG_PATH
Description: This section will be filled in by Bootstrap with manifest data.
Required manifest areas: project.structure, conventions.log_path
Example output:
### Log Entry

Save the deployment result to the following file:

```bash
$ DEPLOY_LOG_PATH
```
```bash
mkdir -p ../.claude/reports/deploys
echo "$(date '+%Y-%m-%d %H:%M:%S') | $(cd ../Codebase && git rev-parse --short HEAD) | [STATUS] | Coolify | [SUMMARY]" >> ../.claude/reports/deploys/deploy-log.md
```


### Detailed Report

Create a separate file for each deployment:


```bash
cat > ../.claude/reports/deploys/deploy-$(date '+%Y%m%d-%H%M%S').md << 'DEPLOY_EOF'
# Deployment Report — {date}

>>>
- **Commit:** {hash}
- **Platform:** Coolify
- **Status:** {DEPLOY_OK/DEPLOY_WARN/DEPLOY_FAIL}
- **Health Check:** {PASS/FAIL}
- **Smoke Test:** {X/Y successful}
- **Migration:** {PASS/FAIL/N/A}
- **Version:** {tested/untested}
- **Notes:** {additional information}

## Log Format (Summary Line):

```
DATE | COMMIT | STATUS | PLATFORM | SUMMARY
2024-01-15 14:30:00 | a1b2c3d | DEPLOY_OK | Coolify | 3 characteristics, 0 errors
2024-01-14 10:00:00 | d4e5f6g | DEPLOY_WARN | Coolify | smoke test 1/3 unsuccessful
```

## Log Directory: `../.claude/reports/deploys/`
-->

---

## Step 9 — Post-Deploy Report


```
## Post-Deploy Report (Coolify)

### Overall Status: [DEPLOY_OK / DEPLOY_WARN / DEPLOY_FAIL]
```
### Deployment Information
- **Commit:** `<hash>`
- **Date:** `<date>`
- **Platform:** Coolify (self-hosted)
- **Build Time:** `~<time>` (estimated)

### Control Results

| # | Step | Status | Detail |
|---|---|---|---|
| 1 | Waiting | INFO | Expected for 90 seconds |
| 2 | Health check | PASS/FAIL | ... |
| 3 | Smoke test | PASS/FAIL | X/Y completed |
| 4 | Migration | PASS/FAIL/N/A | ... |
| 5 | Version | PASS/WARN | ... |

### Failed Controls
[various detailed list — which endpoint, what error, HTTP status]

### Rollback Required?
[YES: follow the rollback guide above / NO]

### Coolify Notes
- Dashboard: [Coolify dashboard URL]
- If health check fails on Coolify side as well, previous container will be automatically restored
- Root cause must be fixed for next deploy
| Health Check Failure | Deployment Failure | Rollback Required |
| Smoke Test Partial Failure | Deployment Warning | Investigate Affected Features |
| Smoke Test Complete Failure | Deployment Failure | Rollback Required |
| Migration Failure | Deployment Failure | Rollback Required, Migration Control Required |
| Version Incompatible | Deployment Warning | Control Deploy Status from Dashboard |
| Platform Issue | Deployment Warning | Check Server Resources |

## Mandatory Rules

### Invariant Rules (Always Applied)

1. **Codebase and Config Write** — Only `.claude/`, `CLAUDE.md`, `.mcp.json`, and `.claude-ignore` files are created within the Agentbase. Creating a `.claude/` directory outside of the Codebase is **FORBIDDEN**.
2. **Git Operations in Codebase** — All Git operations (commit, push, branch) should be performed within the `../Codebase/` directory. The Agentbase does not have Git.
3. **Codebase Readable, Config Write-Forbidden** — Project files (`src/`, `app/`, etc.) are readable and can be modified if necessary. Config files (`.claude/`, `CLAUDE.md`) are NOT ALLOWED within the Codebase.

1. **Ask Question** — All controllers will silently run, only reporting the result.
2. **Modify Change** — This command only checks, does not modify anything.
3. **Rollback** — If rollback is required, follow instructions provided. Do not automate.
4. **Execute all steps** — Run all steps even if one fails.
5. **Deploy Log Required** — A log must be created for Step 8 in every situation.
6. **Result Report Required** — A report must be generated for Step 9 in every situation.
7. **Rollback Guide Only for Deploy Fail** — The rollback section is not displayed when `DEPLOY_OK/WARN` conditions are met.

### Invariant Rules (Valid in Every Command)

1. **Do Not Write Config into Codebase** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` files are created ONLY inside Agentbase. Creating a `.claude/` directory inside Codebase or writing `../Codebase/CLAUDE.md` is **FORBIDDEN**.
2. **Git Runs Only in Codebase** — All git operations (commit, push, branch) run inside `../Codebase/`. There is NO git in Agentbase.
3. **Codebase is Readable; Config is Not Written There** — Project files (`src/`, `app/`, etc.) can be read and edited when the task requires it. Config files (`.claude/`, `CLAUDE.md`) CANNOT be written inside Codebase.

### Invariant Rules (Valid in Every Command)

1. **Do not write config into Codebase** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` files are created ONLY inside Agentbase. Creating a `.claude/` directory inside Codebase or writing `../Codebase/CLAUDE.md` is FORBIDDEN.
2. **Git runs only in Codebase** — All git operations (commit, push, branch) run inside `../Codebase/`. There is NO git in Agentbase.
3. **Codebase is readable; config is not written there** — Project files (`src/`, `app/`, etc.) can be read and edited when the task requires it. Config files (`.claude/`, `CLAUDE.md`) CANNOT be written inside Codebase.

<!-- GENERATE: SELF_REFRESH
Explanation: Command last step - self-refresh check. Bootstrap this marker-common
Self-Refresh area modifies it. The command examines its own text under project's current state:
Small discrepancy with Edit, big change backlog task as reported.
-->
  <!-- GENERATED: SELF_REFRESH -->

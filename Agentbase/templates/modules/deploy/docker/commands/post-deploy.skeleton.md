# Post-Deploy — Deploy Validation

> Validates the stability of the production environment after deployment.
> Usage: `/post-deploy`

---

## Rule: Automation Testing

- Run user input validation on all controls in a sequential manner.
- Never change any value except for testing and reporting.
- Perform all steps to skip one step.
- If rollback is required, follow the instructions; do not attempt it yourself.

---

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section will be filled with information by Bootstrap.
Required manifest areas:
project.description, stack.primary, project.structure, project.subprojects
Example output:
## Project Overview
- **Project:** E-commerce platform (Next.js + NestJS + React Native)
- **Stack:** TypeScript, Prisma, PostgreSQL, Expo
- **Architecture:**
  - `apps/web/` — Next.js frontend
  - `apps/api/` — NestJS backend
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase

---

## Step 1 — Waiting Period

Wait for the deployment to complete:
```bash
echo "Waiting after deploy (30 seconds)..." && sleep 30
```
# Invariant Rules

## Step 2 — Health Check

Check the health status of your production environment.

> The container's startup may be delayed, and this should be monitored.

---

## Step 2 — Health Check

### Production Health Status Check

Check the production environment's health status.

<!-- GENERATE: HEALTH_CHECK_URL -->
Description: This section is populated by Bootstrap with manifest data.
Required manifest areas:
* environments.health_check
* environments.production_url
Example output:

### Health Check Endpoints

| Service | URL | Expected Response | Timeout |
|---|---|---|---|
| API | `https://api.example.com/health` | HTTP 200 + `{"status":"ok"}` | 10s |
| Web | `https://www.example.com` | HTTP 200 | 10s |
| WebSocket | `wss://api.example.com/ws` | Connection established | 5s |

```bash
curl -sf --max-time 10 https://api.example.com/health | jq .
curl -sf --max-time 10 -o /dev/null -w "%{http_code}" https://www.example.com
```
### Invariant Rules

- For each endpoint, perform 3 tests (5 seconds apart). If all 3 tests fail, indicate FAIL.

---

## Step 3 — Smoke Test

Verify that the basic user workflows are working as expected.

<!-- GENERATE: SMOKE_TEST_ENDPOINTS
Explanation: This section is populated by Bootstrap using manifest data.
Required manifest fields: environments, api_endpoints, project.api_prefix
Example output:
## Smoke Test Endpoints

| Endpoint | Expected | Auth |
|---|---|---|
| `GET https://api.example.com/health` | 200 OK | — |
| `GET https://api.example.com/api/v1/users` | 200 | Authorization required |
| `POST https://api.example.com/api/v1/orders` | 201 | Authorization required |

---

## Step 4 — Migration Status

Verify that database migrations were successful:

---
```bash
cd ../Codebase && npx prisma migrate status 2>/dev/null || echo "Prisma status could not be checked"
```


Check:
- [ ] Were all migrations applied?
- [ ] Is any migration still pending?

---

## Step 5 — Version Check

Confirm the deployed version is the expected version:


```bash
# Local version
cd ../Codebase && git rev-parse --short HEAD

# Production version (from the health endpoint)
# curl -sf https://api.example.com/health | jq '.version'
```
Invariant rules:

6. Platform Control

If the local commit hash matches the production hash, PASS.

---

## Step 6 — Platform Controls

Deploy to platform with extra controls.

<!-- GENERATE: DEPLOY_PLATFORM
Description: This section is populated by Bootstrap using manifest files.
Required manifest fields: environments.deploy_platform, environments.deploy_config
Example output:
### Coolify Platform Controls


 
# Example usage:

 
 
  # deploy_platform environment configuration
  # deploy_config environment configuration

 

 
 
  # Deploy platform example with environment configurations
  # Pass if local commit hash matches production hash
```bash
# Container status
ssh deploy@server "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep myapp"

# Container logs (last 20 lines)
ssh deploy@server "docker logs --tail 20 myapp-api"

# Disk usage
ssh deploy@server "df -h | head -5"

# Memory usage
ssh deploy@server "free -h"
```
### Controllable Items

- [ ] Are all container statuses "Up"?
- [ ] Does a restart counter exist for containers? (Restart count check)
- [ ] Is disk usage below 90%?
- [ ] Is memory usage within the normal range?

---

## Step 7 — Deploy Log

Save the deployment result.

<!-- GENERATE: DEPLOY_LOG_PATH
Description: This section is populated by Bootstrap with manifest data.
Required manifest areas: project.structure, conventions.log_path
Example output:
### Deployment Log

Save the deployment result to the following file:

```markdown
-- YAML/JSON --
```

```bash
echo "$(date '+%Y-%m-%d %H:%M:%S') | $(cd ../Codebase && git rev-parse --short HEAD) | [STATUS] | [SUMMARY]" >> ../Codebase/deploy.log
```


**Log format:**

```
DATE | COMMIT | STATUS | SUMMARY
2024-01-15 14:30:00 | a1b2c3d | DEPLOY_OK | 3 features, 0 errors
2024-01-14 10:00:00 | d4e5f6g | DEPLOY_WARN | health check passed on the 2nd attempt
```


**Log file:** `../Codebase/deploy.log`
-->

---

## Step 8 — Result Report


```
## Post-Deploy Report

### Overall status: [DEPLOY_OK / DEPLOY_WARN / DEPLOY_FAIL]

### Deploy details
- **Commit:** <hash>
- **Date:** <date>
- **Platform:** <platform>

### Check results

| Step | Status | Detail |
|---|---|---|
| Health check | pass/fail | ... |
| Smoke test | pass/fail | X/Y passed |
| Migration | pass/fail/skipped | ... |
| Version | pass/fail | ... |
| Platform | pass/fail | ... |

### Failed checks
[detailed list when any check failed]

### Is rollback required?
[YES: rollback instructions / NO]
```


---

## Decision Matrix

| Condition | Decision | Action |
|---|---|---|
| All checks PASS | DEPLOY_OK | Deploy succeeded |
| Health check FAIL | DEPLOY_FAIL | Rollback required |
| Smoke test partial FAIL | DEPLOY_WARN | Investigate the affected features |
| Migration FAIL | DEPLOY_FAIL | Rollback required |
| Version mismatch | DEPLOY_WARN | Check the deploy operation |
| Platform problem | DEPLOY_WARN | Check the platform |

---

## Rollback Guide

If the status is DEPLOY_FAIL:

1. **Identify the previous version:**
   
```bash
   cd ../Codebase && git log --oneline -5
   ```
2. Platform Rollback:

   - Coolify: Go back to the previous deployment
   - Docker: `docker-compose -f docker-compose.prod.yml down && git checkout <previous_hash> && docker-compose -f docker-compose.prod.yml up -d`
   - Vercel/Netlify: Roll back from the dashboard

3. Migration Rollback (as needed):

   > ⚠️ Migration rollback carries risk. Only add new migrations that need to be rolled back.

4. Verification:

   After rollback, re-run `/post-deploy` command.

---

## Invariant Rules

### Immutable Rules (Apply Everywhere)

1. **Codebase and config write access** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` files can only be created inside Agentbase.
   Writing to `.claude/` directory, writing to `../Codebase/CLAUDE.md`, is FORBIDDEN.

2. **Git operations only within Codebase** — All Git operations (commit, push, branch) must be performed within the Codebase.
   Agentbase does not have Git.

3. **Read-only codebase, write-only config** — Project files (`src/`, `app/`, etc.) can be read and modified as needed.
   Configuration files (`.claude/`, `CLAUDE.md`) are FORBIDDEN within the Codebase.

1. **Ask questions** — All controls run silently, only reporting results.
2. **Make changes** — This command only checks, does not modify anything.
3. **Rollback** — When rollback is required, follow the instructions. Do not invent a rollback.
4. **Complete all steps** — Proceed to next step even if one fails.
5. **Deploy log is mandatory** — Step 7 log must be generated everywhere.
6. **Result report is mandatory** — Step 8 report must be generated everywhere.

### Invariant Rules (Valid in Every Command)

1. **Do not write config into Codebase** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` files are created ONLY inside Agentbase. Creating a `.claude/` directory inside Codebase or writing `../Codebase/CLAUDE.md` is FORBIDDEN.
2. **Git runs only in Codebase** — All git operations (commit, push, branch) run inside `../Codebase/`. There is NO git in Agentbase.
3. **Codebase is readable; config is not written there** — Project files (`src/`, `app/`, etc.) can be read and edited when the task requires it. Config files (`.claude/`, `CLAUDE.md`) CANNOT be written inside Codebase.

<!-- GENERATE: SELF_REFRESH
Explanation: Command for last step - self-refresh check. Bootstrap uses this marker.
Self-Refresh section changes the command. The command checks its own text within project scope when executed:
  - small discrepancy Edit, big change - as a backlog task is reported.
-->

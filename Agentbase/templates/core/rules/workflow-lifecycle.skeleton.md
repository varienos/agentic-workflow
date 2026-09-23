# Workflow Lifecycle Rules

> This file defines the rules for the workflow lifecycle, diagrams, and error management protocols.

---

## Individual Task Summary

Task: read the backlog item, implement only that scope, and run the verification named in its acceptance checks.

```
user → /task-hunter <task-no>
  │
  ├─ 1. Read task details from backlog
  ├─ 2. Analyze related files
  ├─ 3. Create implementation plan
  ├─ 3b. Apply Architecture decision (ADR) gate if necessary
  ├─ 4. Write/modify code
  │     └─ [auto-test-runner hook: early test signal — optional]
  ├─ 4b. FINAL VERIFICATION — run tests (Mandatory)
  ├─ 6. Commit changes
  ├─ 7. Mark backlog task as DONE
  └─ 8. Evaluate learning record (memory-protocol)
```

### Test Trigger Layers

| Layer | When | Mandatory | Purpose |
|--------|----------|------------|------|
| **auto-test-runner hook** | Edit/Write after debounce (delay) | NO | Early feedback — detect errors immediately |
| **Final verification (Step 4)** | Before task completion | YES | Guarantee all tests pass |
| **pre-commit hook** | During git commit | YES | Commit-time barrier |
| **pre-push hook** | During git push | YES | Push-time barrier |

> **RULE:** auto-test-runner signal does not replace Final verification. If the hook fails, Step 5 will run all tests regardless.

---

## Architecture decision (ADR) gate

For tasks that change architectural behavior, the Architecture decision (ADR) gate runs before implementation starts.
Commit completed non-sensitive work in the same session without asking. Do not push unless the user asks.

ADR required triggers:

- Layer boundary, module ownership or public API contract changes
- Data flow, cyclic model, migration strategy or integration contract changes
- Runtime, deploy model, framework, package manager or primary technology switch
- Security, auth, permission, logging, error management or observability cross-cutting policies change
- New workflow or automation affecting multiple sub-projects

Mandatory cycle:

### Discipline for Database Migrations

#### New Decision File

- For new decisions, files are written in `backlog/decisions/YYYYMMDD-kebab-case-decision-title.md` format; templates used in `backlog/decisions/0000-adr-template.md`.

- If a previously made decision is applied, the task note and final summary refer to the existing ADR file path.

#### No Decision Required

- If no decision is required, write a short justification in the task note: small refactor, typo, test addition, or applying an existing decision with a minor fix.

---

### Multi-Task Procedure

```
user → /task-hunter <task-1> <task-2> ...
  │
  ├─ 1. Read all tasks, determine dependency order
  ├─ 2. Parallelize independent tasks, sequence dependent ones
  ├─ 3. For each task: plan → implement → test → commit
  ├─ 4. If a task fails:
  │     ├─ Independent one: continue with other tasks and report failure
  │     └─ Dependent tasks: stop the chain, report failure
  └─ 5. Summarize the report
```

---

### Bug Fix Procedure

```
user → /bug-hunter <description>
  │
  ├─ 1. Analyze error description
  ├─ 2. Find related code (Grep, Glob, Read)
  ├─ 3. Root cause analysis (max 3 hypotheses — see below for details)
  ├─ 4. Apply fix
  ├─ 5. Check side effects
  ├─ 6. Test
  ├─ 7. Commit
  └─ 8. Save to backlog (as a bug-fix task)
```

---

### Review Procedure

Review: review the diff for correctness, silent failures, and regressions before closing the task.

```
user → /task-review or /bug-review
  │
  ├─ 1. Get the diff of last commits
  ├─ 2. Spawn code-review agent → quality analysis
  ├─ 3. Spawn regression-analyzer agent → risk assessment
  ├─ 4. (For bug-review) silent-failure-hunter → silent failure detection
  ├─ 5. Combine all agents' reports into a summarized overview
```

### 6. APPROVE / REQUEST_CHANGES / CRITICAL_BLOCK Result

---

## Auto Review Summary

```
user → /auto-review
  |
  |-- 1. Identify the diff target and current HEAD
  |-- 2. Calculate the diff hash
  |-- 3. Read `.claude/tracking/auto-review-state.json` file
  |-- 4. Skip if same hash or own fix commit exists
  |-- 5. Shallow review for new diff
  |-- 6. Apply minor issues locally with verify and separate commit
  |-- 7. Create backlog task for major issues
  |-- 8. Write report to `.claude/reports/reviews/`
  |-- 9. Update hash/state information after one pass
```

> **Loop principle:** Same diff hash is not reviewed again. Auto-review does not review its own fix commit until a new human diff arrives.

---

## Module Review Summary

```
user → /review-module <module-name>
  |
  |-- 1. Define module boundaries (directories, files, dependencies)
  |-- 2. Read all files in the module
  |-- 3. Perform full module review with code-review agent
  |-- 4. Analyze cross-module effects with regression-analyzer
  |-- 5. Present integrated report
  |-- 6. Create list of suggestions (backlog task candidates)
```

---

## Autonomous Review Summary

```
user → /variant <request>
  |
  |-- 1. Analyze request from engineering perspective
  |-- 2. Create task breakdown
  |-- 3. For each task:
  |     |-- Implement plan write
  |     |-- Risk assessment
```
### Effort Estimation

#### 4. Create Backlog Tasks

#### 5. Present Summary Plan

---

## Conductor Flow

```markdown
conductor → manages sub-agents
  │
  ├─ 1. Assign tasks to sub-governors
  ├─ 2. Select suitable agent for each task
  ├─ 3. Execute agents in sequence or parallel
  ├─ 4. Evaluate agent results
  │     ├─ Successful → next step
  │     └─ Unsuccessful → retry or escalate (see table below)
  └─ 5. Integrate all results, present to user
```

---

## Deploy Flow

```markdown
pre-deploy → deploy → post-deploy
  │
  ├─ PRE-DEPLOY:
  │   ├─ Run tests (mandatory for all)
  │   ├─ Build validation (must be successful)
  │   ├─ Migration status check (check pending migration if any)
  │   └─ Environment variables control
  │
  ├─ DEPLOY:
  │   ├─ Build and push (Docker build + push if applicable)
  │   ├─ Deployment trigger (platform-specific)
  │   └─ Health check wait
  │
  └─ POST-DEPLOY:
      ├─ Health check validation
      ├─ Smoke test run (if applicable)
      ├─ Rollback plan preparation
      └─ Deploy record logging
```

---

## Error Cascade Resolution Table

### Failure Handling Steps

| Step | Max Retry | Retry Interval | Action on Failure |
|------|-----------|-------------|----------------------|
| Test Initiation | 2 | In-Place | Analyze error, fix, retry after 2nd attempt, stop and report |
| Build | 1 | In-Place | Report error, continue |
| Lint/Format | 1 | In-Place | Auto-fix, report failure if unsuccessful |
| Agent Spawn | 2 | 5 seconds | Try alternative agent, report if none available |
| Git Commit | 1 | In-Place | Fix hook error, create new commit (do NOT amend) |
| Deploy | 0 | — | No retry, user interaction required to repeat |
| Migration | 0 | — | No retry, rollback plan provided |

### Critical Rule: 3 consecutive failures = stop completely, report status, wait for user intervention

---

## Pre-Commit Hook Error Prevention

Pre-commit hook failure:

```
hook failed
  │
  ├─ 1. Read error message and analyze it
  ├─ 2. Determine error type:
  │     ├─ Lint error → run auto-fix, repeat stage
  │     ├─ Format error → run formatter, repeat stage
  │     ├─ Test error → fix test
  │     └─ Custom hook error → perform action based on error message
  ├─ 3. After fixing:
  │     ├─ Repeat stage (git add)
  │     └─ Create new commit (git commit -m "...") ⚠️ NEVER use git commit --amend
  │         ⚠️ — amend rewrites the previous commit and can lose your work
  └─ 4. After 2 attempts → stop, report
```

---

## Root Cause Analysis — 3 Hypothesis Limit

During bug fix process:

1. **Maximum 3 hypotheses** created
2. Test each hypothesis in sequence
3. Stop if a hypothesis is proven correct, skip remaining hypotheses
4. If none of the hypotheses are proven correct:
   - Summarize collected evidence
   - Inform user
   - Request additional context

**Anti-pattern:** Exploring 10 different possible scenarios wastes time. The first three hypotheses are sufficient most of the time.

---

<!-- GENERATE: COMMIT_CONVENTION
Commit message conventions — prefix map, language, format and examples.
Required manifest fields: workflows.commit_convention, workflows.commit_prefix_map

The section will be filled in according to the preferred commit convention in the Bootstrap manifest. Conventional commits will result in creating a prefix map and examples.

Example output:

## Commit Convention

**Format:** `{prefix}: {description}`
**Language:** English
**Mood:** Imperative (add, append, update — not done, added)

### Prefix Map

| Prefix | Usage | Example |
|--------|----------|-------|
| `feat` | New feature | `feat: add order report page` |
| `fix` | Bug fix | `fix: JWT token renewal error fixed` |
| `refactor` | Code refactoring | `refactor: auth middleware separation` |
| `style` | Visual/format changes | `style: profile page spacing updated` |
| `docs` | Documentation | `docs: API endpoint list updated` |
| `test` | Adding/Updating tests | `test: auth controller unit test added` |
| `chore` | Configuration/arbitrary change | `chore: ESLint rules updated` |
| `perf` | Performance improvement | `perf: user list query optimized` |
| `ci` | CI/CD changes | `ci: deploy workflow stage added` |

### Rules

- Title line maximum 72 characters
- Title starts with small letter (after prefix)
- No period at the end of line
- If body is required, leave a blank line for detail explanation
## Deploy Workflow

### Topology

<!-- GENERATE: DEPLOY_TOPOLOGY -->
Description: The deploy topology is generated from the environments and deploy information in the bootstrap manifest.
Required manifest fields: environments[], deploy_platform, deploy_trigger
Example output:
| Environment | Platform | Trigger | URL |
|-------------|----------|---------|-----|
| Production   | Coolify  | `main` branch push | api.example.com |
| Staging      | Coolify  | `develop` branch push | staging-api.example.com |

### Deploy Phases

<!-- GENERATE: DEPLOY_STEPS -->
Description: The deploy phases are related to the deploy platform.
Example output (Coolify):
1. Merge/push to `main`
2. Coolify webhook is triggered
3. Docker image is built
4. Container is restarted
Example output (Vercel):
1. Merge/push to `main`
2. Vercel automatic build starts
3. Preview deploy is created
4. Promoted to Production

### Health Check

5. Health check is performed

### Rollback Procedure — 6 Scenario Decision Tree

Follow the decision tree below in case of deployment failure. Once the scenario is detected, apply the relevant protocol.

```
Deploy result?
  │
  ├─ Build FAILED → S1
  ├─ Migration FAILED → S2
  ├─ Migration OK + application FAILED → S3
  ├─ Deploy OK + runtime ERROR (running slowly) → S4
  ├─ Deploy OK + data DROPPED (DROP TABLE etc.) → S5
  └─ Everything OK + logic ERROR → S6
```

#### RTO Goals

| Scenario | RTO | Description |
|---------|-----|----------|
| S1: Build Failure | 0 hours | Old container/deployment was still running |
| S2: Migration Failure | 5-15 minutes | Partial migration must be retried |
| S3: Migration OK + App Failure | 15-30 minutes | Migration rollback + container rollback |
| S4: Runtime Error | 5 minutes | Rollback to previous deployment |
| S5: Data Deleted | 1-4 hours | Backup restore + migration replay |
| S6: Incorrect Logic | 30-60 minutes | Hotfix or revert deploy |

---

#### S1 — Build Failure (Old Container Running)

**Status:** Build/CI pipeline failed. New image/artifact could not be created.
**Impact:** ZERO — old deployment is still running.

**Protocol:**
1. Read the build error (CI log or terminal output)
2. Fix the error (compile error, dependency issue, test failure)
3. Rebuild and deploy
4. Log to backlog: "S1: Build failed → [error summary] → fixed"

> **Agent behavior:** Notify user, fix, report back. Non-urgent response REQUIRED — old deployment is running.

---

#### S2 — Migration Failure (DB Partially Changed)

**Status:** Migration started but not completed. Database may be in an uncertain state.
**Impact:** HIGH — partial schema change may affect existing data.

**Protocol:**
1. Read the migration error
2. Check database status:
   - Which migrations were applied, which ones were not?
   - Are there any partial changes (e.g., created table without index)?
3. Partially revert migration:
   - Use ORM rollback command (see platform-specific steps below)
   - If ORM rollback is not supported: manually apply partial reverts using SQL
4. Update application container — old code with old schema should continue to run
5. Root cause fix, retry migration, and test in production environment
6. Log to backlog: "S2: Migration failed → [error] → [revert method]"

> **Agent behavior:** CRITICAL — inform user IMMEDIATELY. Automated fix ATTEMPT. Report database status.

---

#### S3 — Migration Successful + App Failure (DB Advanced)

**Status:** Migration completed, new schema is active. But the new application code does not work.
**Impact:** CRITICAL — old code may be incompatible with the new schema. Rolling back DB to the old container can break.

**Protocol:**
1. **Once:** Check compatibility of old code with new schema:
   - If new columns are added (additive) → old code usually continues to work → S4 deployed
   - If column is deleted or renamed (breaking) → old code will NOT WORK
2. **Breaking change occurs:**
   a. Roll back migration (restore schema to previous state)
   b. Rollback to old container
   c. Prepare fix: migration + code should be deployed together
3. **Additive change occurs:**
   a. Old container can continue to work
   b. Fix application error
   c. Deploy new code again
4. Backlog note: "S3: Migration OK + app fail → [breaking/additive] → [rollback method]"

> **Agent behavior:** CRITICAL — inform user IMMEDIATELY. Analyze whether the change is breaking or additive and report.

---

#### S4 — Deployment Successful + Runtime Error (Running Slowly)

**Status:** Deployment completed, health check passed, but application is running slowly.
**Impact:** HIGH — users are affected.

**Protocol:**
1. Read error logs (container log, monitoring, error tracker)
2. Rollback to previous deployment:
   - Platform-specific rollback (see GENERATE block below)
   - Or: `git revert HEAD && git push` to revert commit
3. Analyze root cause (AECM approach: hypothesis → test → fix)
4. Test and deploy fix
5. Deploy again
6. Backlog note: "S4: Runtime error → [error summary] → rollback to previous deployment → fix deployed"

> **Agent behavior:** Fast rollback → root cause analysis → inform user.

---

#### S5 — Deployment Successful + Data Deleted (DROP TABLE etc.)

**Status:** Destructive migration performed, data lost.
**Impact:** CRITICAL — data loss may not be recoverable.

**Data Loss Mitigation Plan:**

```
DATA LOSS DETECTED
  │
```

### Migration Discipline Rules

#### 1. Initial Migration — Stay Calm, Follow the Steps Below

#### 2. Put the Application in Maintenance Mode (if possible)

    → Prevent new data from being written, preserve the current state
    →

#### 3. Backup Existing Data?

    ├─ YES:
        ├─ Determine the date of the most recent backup
        ├─ Evaluate the difference between the backup and the current state
        ├─ Restore the backup to a separate database (production's ongoing write)
        ├─ Manually transfer missing data
        └─ Update production with the restored database
    │

    └─ NO:
        ├─ Check if transaction log / WAL / binlog exists?
        ├─ Is there a point-in-time recovery available for the cloud provider?
        ├─ Is there a replica database?
        └─ If none of the above: PERMANENT DATA LOSS — document the situation
    │

#### 4. Rollback Destructive Migration:

    → Rebuild the table/structure that was deleted with the new migration
    → Transfer restored data to the new structure
    →

#### 5. Post-Mortem Analysis:

    → What happened, why did it happen, and how can it be fixed?
    → Check if a pre-push hook has been added for destructive migration warnings
```bash
git checkout -b hotfix/<name>
# Apply the fix
# Test (especially write a test for the faulty scenario)
git push && open PR
```
> **Agent Behavior:** CRITICAL — immediately inform the user, ask "Do you have a backup of your database?". Attempt automatic fix.
---

#### S6 — Everything is Fine + Logic Error

**Status:** Deployment completed, tests passed, no errors. However, there is a logic error (wrong calculation, wrong filtering, etc.).
**Impact:** MEDIUM-SEVERE — users are seeing incorrect data, but the system remains operational.

**Protocol:**
1. Determine the scope of the error:
    - How many users/accounts were affected?
    - Was it a data corruption or just a display issue?
2. Make a decision:
    - **Data Corruption:** → Rollback to the previous deployment + fix script
    - **Only Display Issue:** → Hotfix: create and test the fix, deploy (no rollback required)
3. Hotfix sequence:
```bash
git checkout -b hotfix/<name>
# Apply the fix
# Test (especially write a test for the faulty scenario)
git push && open PR
```
### 4. Backlog Entry

> **Agent Behavior:** Perform hotfix in the hotfix mode (RPI approach: research → plan → implement). Only rollback if data corruption occurs.

---

### Mini Deploy Recovery Protocol

In multi-service deployments (monorepo, microservice), some services may be successful while others fail:

```
Mini deploy status:
  Service A: SUCCESSFUL
  Service B: UNSUCCESSFUL
  Service C: SUCCESSFUL

Decision tree:
  │
  ├─ Is B dependent on A and C?
  │   ├─ YES → Rollback all services (inconsistent state is dangerous)
  │   └─ NO → Only rollback B, keep A and C intact
  │
  ├─ Does B's failure affect A or C?
  │   ├─ YES → Rollback affected services as well
  │   └─ NO → Only rollback B
  │
  └─ Is there a change in API contract?
      ├─ YES → Rollback all services together
      └─ NO → Is independent rollback possible
```

---

### Platform-Specific Rollback Steps

<!-- GENERATE: ROLLBACK_PLATFORM_STEPS
Deploy platform-specific rollback commands.
Required manifest fields: environments[].deploy_platform

Example output (Coolify):

#### Coolify Rollback
1. Coolify Dashboard → Applications → relevant service
2. Deployments section → select previous successful deployment → "Rollback" button
3. Or via API: `curl -X POST https://coolify.example.com/api/v1/applications/{id}/rollback`
4. Wait for health check to pass
5. Coolify automatic rollback: if health check fails, old container is preserved automatically

#### Docker (Manual) Rollback

1. `docker ps` to find the current container
2. `docker images` to find the previous image tag
3. `docker stop <container> && docker run -d <previous_image>` to start the old image
4. Or, using Docker Compose: `docker-compose up -d --force-recreate`

#### Vercel Rollback

1. Vercel Dashboard → Project → Deployments
2. Select the previous successful deployment → "Promote to Production"
3. Or, CLI: `vercel rollback`
4. Instant rollback — zero downtime

#### Migration Rollback (ORM-specific)

- Prisma: `npx prisma migrate resolve --rolled-back <migration_name>`
- TypeORM: `npx typeorm migration:revert`
- Eloquent: `php artisan migrate:rollback --step=1`
- Django: `python manage.py migrate <app_name> <previous_migration>`

### Important Notes

- Make sure to separate the migration from the deployment
- Enable maintenance mode for large schema changes
- Run smoke tests after each deployment
- Always perform a backup before destructive migrations (DROP)
- Perform health checks and smoke tests after rollback
- **Development:** Debug in the mode, use seed data.
- **Production:** Never use `prisma db push`, always use `migrate deploy`.

---

<!-- GENERATE: TEAM_REVIEW_POLICY
Team size-based review process policy.

Required manifest fields: project.team_size, workflows.branch_model

Example output (small-team + feature-pr):

## Review Process Policy

**Team Size:** Small team (2-4 people)
**Review Requirement:** Optional (not required)

| Condition | Policy |
|-----------|--------|
| Feature branch | PR is approved immediately, direct merge is accepted |
| Bug fix | PR is approved, immediate merge in emergency cases |
| Hotfix | Direct merge, post-merge review |
| Review count | At least 1 reviewer is required |
| Self-merge | Approved (after reviewer approval) |

Example output (large-team + feature-pr):

## Review Process Policy

**Team Size:** Large team (5+ people)
**Review Requirement:** Mandatory

| Condition | Policy |
|-----------|--------|
| Feature branch | PR MANDATORY, direct merge is NOT ALLOWED |
| Bug fix | PR Mandatory, at least 1 review |
| Hotfix | Emergency PR, post-merge review accepted |
| Review count | At least 1 reviewer Mandatory, 2 reviewers are required |
| Self-merge | NOT ALLOWED — all merges must be done by owner |
| CODEOWNERS | File ownership assignment is required for critical files |

Example output (solo):

## Review Process Policy

**Team Size:** Solo developer
**Review Requirement:** Optional (self-review)

| Condition | Policy |
|-----------|--------|
| Feature branch | Branch feature optional — direct push accepted |
| Bug fix | Direct commit |
| Review | /task-review or /auto-review required for self-review |
| CI control | If available, the CI pipeline is sufficient |

---

<!-- GENERATE: HOOK_BEHAVIORS
Controls of pre-commit and pre-push hooks.
Required manifest fields: workflows.auto_format, stack.linter, stack.formatter, rules.forbidden

Example output:

## Hook Behaviors

### Pre-Commit Hook

| Control | Action | Failure |
|---------|---------|----------|
| Lint (ESLint) | `npx eslint --fix` | Auto-fix attempted, fails if unsuccessful, commit blocked |
| Format (Prettier) | `npx prettier --write` | Always successful |
| Type check | `npx tsc --noEmit` | Blocked if unsuccessful |
| Forbidden commands | Pattern scanning | Blocked, warning displayed |

### Pre-Push Hook

| Control | Action | Failure |
|---------|---------|----------|
| Tests | `npm test` | Blocked if unsuccessful |
| Build | `npm run build` | Blocked if unsuccessful |
| Trial merge | Conflict testing using `git merge-tree` | Blocked if conflict exists |
| Localhost leak | URL scanning | Detected, push blocked |
| Migration validity | Schema vs migration comparison | Blocked if missing migration |
-->

---

<!-- GENERATE: CRITICAL_RULES
Project-specific critical rules — forbidden commands and mandatory controls.
Required manifest fields: rules.forbidden[], rules.domain[]

Example output:

## Critical Rules

### Forbidden Commands

| Command | Reason | Action |
|---------|--------|--------|
| `prisma db push` | Schema updated in production | BLOCK |
| `git push --force main` | History lost | BLOCK |
| `rm -rf /` | Clear reason | BLOCK |
| `npm audit fix --force` | Breaking change risk | WARN |

### Mandatory Checks

- All API endpoints must have authentication middleware
- All Prisma queries must include a userId filter (IDOR mitigation)
- All new components must use the `useTheme()` function to use theme colors
- `.env` files should never be committed -->

---

## Merge Conflict Management Protocol (3-Layer Defense)

Parallel teammates, worktree isolation and multi-branch testing can lead to merge conflict risks. The following 3-layer defense system mitigates this risk.

### Layer 1 — Resolution (Planning Level)

Conflicts are detected and resolved at the task-plan and task-conductor levels:

1. **task-plan** creates an `Affected Files` list for each task (files that will be directly modified)
2. **task-conductor** creates a conflict graph during planning:
   - Tasks with shared files → proceed in the same phase
   - Tasks without shared files → can only be processed in isolated worktree/branch if necessary
   - The `plan` mode remains read-only; changes to code/backlog are only made in the `run` mode
3. **task-hunter** provides teammates with file boundaries in the orchestrator mode:
   - Each teammate can only modify assigned files
   - Two teammates cannot be assigned the same file

### Layer 2 — Detection (Push Level)

A pre-push hook detects conflicts using a trial merge:

```bash
# Trial merge: conflict check against main before push
git fetch origin main
MERGE_BASE=$(git merge-base HEAD origin/main)
git merge-tree "$MERGE_BASE" HEAD origin/main
# If conflict markers (<<<<<<) exist → push is blocked
```

This control is automated — the agent or human performs it for every push.

### Layer 3 — Resolution (Agent Behavior)

When conflicts are detected, the agent follows this decision tree:

Conflict Resolution Criteria

| Condition | Decision | Example |
|-----------|-----------|---------|
| Different functions in the same file | **Automated resolve** | A: added a new endpoint, B: updated an existing endpoint |
| Same function with different lines | **Automated resolve (careful)** | A: function start, B: function end |
| Same lines | **Notify user** | A and B changed the same variable differently |
| Import/dependency check | **Automated resolve** | Both sides integrate imports |
| Migration check | **Notify user** | Two different migrations updating the same table |
| Configuration file check | **Notify user** | package.json, tsconfig.json like shared config |

> **RULE:** After automated resolve, TEST EXECUTION IS MANDATORY. If test fails, resolve is invalid — notify user.
> **RULE:** Migration and configuration file conflicts should NEVER be resolved automatically.

---

## General Workflow Rules

These rules apply to all workflows and are independent of the GENERATE blocks:

### File Operations

- Always read a file before editing it
- Follow existing patterns, don't introduce new conventions
- Check existing files before creating a new one
### Git Operations

- Each commit should be atomic — contain only one purpose
- Verify changes with `git diff --cached` before committing
- After a hook error, create a **NEW** commit; do **not** use `--amend`
- Use `--force` push only with clear user instructions

### Agent Communication

- Agent reports are written in English
- Summary first, details second — prioritize the important one
- In uncertain situations, ask the user; do not assume progress
- Each agent stays within its own responsibility area, not trespassing on another's work

### Error Management

- Silent error catching (catch + ignore) IS PROHIBITED
- Every error logs or reports
- Adhere to retry limits (see table above)
- Stop after three consecutive failures and report

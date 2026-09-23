# Pre-Deploy — Vercel Production Push Control

> Verifies all pre-deploy checks and displays the result.
> Usage: `/pre-deploy`

---

## Invariant Rule: Autonomy Test

- User Input Validation — runs tests in sequence.
- Only PUSH operation — only test and report.
- Error occurs — reports and leaves user alone.
- Runs all steps — skips a step.

---

<!-- GENERATE: CODEBASE_CONTEXT
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.description, stack.primary, project.structure, project.subprojects
Example output:
## Project Overview
- **Project:** SaaS dashboard (Next.js + Tailwind)
- **Stack:** TypeScript, Next.js, Prisma, PostgreSQL
- **Architecture:**
  - `src/` — Next.js app directory
  - `prisma/` — Database schema
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
- Git repository operates only on Codebase -->

---

## Step 1 — Initial Control

- 
- 
-
```bash
cd ../Codebase && git status
```


Check:
- [ ] Are there uncommitted changes?
- [ ] Which branch are you on? (warn when it is not main/master)
- [ ] Is the branch in sync with the remote?

If there are uncommitted changes:

```
Uncommitted changes exist. Commit them before continuing.
```
### Step 2 — TypeScript / Build Control

Control tip errors:

<!-- GENERATE: BUILD_COMMANDS
Description: This section is populated by Bootstrap with manifest data.
Required manifest areas: project.subprojects, project.scripts, stack.primary
Example output:
#### Build Commands

| Control | Command | Expected Outcome |
|---|---|---|
| TypeScript | `cd ../Codebase && npx tsc --noEmit` | No type error |
| ESLint | `cd ../Codebase && npm run lint` | Lint error is not found |

Run each command. If an error occurs, record it and proceed to the next step.

---

### Step 3 — Test Suite

Run all tests.

<!-- GENERATE: TEST_COMMANDS
Description: This section is populated by Bootstrap with manifest data.
Required manifest areas: project.subprojects, project.scripts, stack.test_framework
Example output:
#### Test Commands

| Test | Command | Type |
|---|---|---|
| Unit tests | `cd ../Codebase && npm run test` | Jest/Vitest unit tests |
| End-to-End tests | `cd ../Codebase && npm run test:e2e` | Playwright/Cypress tests |

Run each test. Record failed tests and proceed to the next step.

---

### Step 4 — Environment Variable Synchronization

Synchronize Vercel environment variables with local `.env.local` file:

 
```bash
# List variable names in .env.local or .env
cd ../Codebase && grep -E '^[A-Z_]+=' .env.local 2>/dev/null | cut -d= -f1 | sort || echo ".env.local was not found"
```
Control:
- [ ] Are all environment variables in `.env.local` defined on the Vercel dashboard?
- [ ] Are `NEXT_PUBLIC_` prefixed environment variables correct? (will be displayed client-side)
- [ ] Are sensitive information (API key, secret) only available server-side? (`NEXT_PUBLIC_` should not be used)

> **NOT:** The `vercel env pull` command can retrieve Vercel environment variables. However, this command does not automate testing — it is recommended for use only when there are inconsistencies.

## Step 5 — Edge Function Validation (If Applicable)

Control Edge runtime using files:
```bash
cd ../Codebase && grep -rl "runtime.*=.*'edge'" src/ app/ --include="*.ts" --include="*.tsx" 2>/dev/null || echo "Edge runtime is not used"
```
Here is the translated text:

In case of an edge function, verify:

- Are Node.js APIs being used? (`fs`, `path`, `child_process` etc. - do not work on edge)
- Is there no unsupported package? (edge runtime provides weak npm support)
- Is the correct line `export const runtime = 'edge'` present in files?

Edge function - If this step is skipped, indicate "N/A" in the report.

## Step 6 — Vercel Build Test

<!-- GENERATE: VERCEL_CONFIG
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: environments.deploy_platform, project.scripts, stack.framework
Example output:
### Vercel Deployment

**Build command:** `npm run build` or `next build`
**Output directory:** `.next`
**Framework:** Next.js

### Build Test
```bash
cd ../Codebase && npm run build
```


### vercel.json check

```bash
cd ../Codebase && cat vercel.json 2>/dev/null || echo "vercel.json is missing (default settings will be used)"
```
### Invariant Rules
- [ ] Is the `regions` property defined in `vercel.json` file? (important for performance)
- [ ] Are `headers`, `redirects`, and `rewrites` correct?
- [ ] Is the `functions` configuration (maxDuration, memory) suitable?

Run build command. Fail if unsuccessful. Mark as FAIL.

> **NOT:** Build may take a long time. If the `SKIP_BUILD_TEST` flag is set, skip this step.

---

## Step 7 — Result Report

Report the results of all steps in the following format:
```
## Pre-Deploy Report (Vercel)

### Overall status: [PASS / FAIL / WARN]

### Change summary
- Latest commit: <hash> — <message>
- Branch: <branch_name>

### Check results

| Step | Status | Detail |
|---|---|---|
| Git status | pass/fail | ... |
| TypeScript/Build | pass/fail | ... |
| Tests | pass/fail | X/Y passed |
| Env sync | pass/fail/warn | ... |
| Edge function | pass/skipped | ... |
| Build test | pass/fail/skipped | ... |

### Failed checks
[detailed list when any check failed]

### Recommendations
[actions when any are needed]
```
---

## Invariant Rules

| Condition | Rule | Action |
|---|---|---|
| All steps PASS | PASS | Deployable |
| Tests FAIL | ❌ FAIL | Deploy not possible, tests need to be improved |
| TypeScript FAIL | ❌ FAIL | Deploy not possible, type errors need to be fixed |
| Build FAIL | ❌ FAIL | Deploy not possible, build error needs to be resolved |
| Env missing/uncompatible | ⚠️ WARN | Vercel env variables need to be controlled |
| Edge function adaptation | ⚠️ WARN | Edge compatibility issue needs to be investigated |
| Uncommitted changes | FAIL | Commit the changes first |

---

## Mandatory Rules

### Invariant Rules (Applicable Everywhere)

1. **Write to codebase config** — Only `.claude/`, `CLAUDE.md`, `.mcp.json`, and `.claude-ignore` files can be created inside Agentbase. Creating the `.claude/` directory or writing to `../Codebase/CLAUDE.md` is FORBIDDEN.
2. **Git only in Codebase** — All Git operations (commit, push, branch) must be performed inside `../Codebase/`. Agentbase does not have Git.
3. **Codebase readable but config writable** — Project files (`src/`, `app/`, etc.) are readable and can be adjusted if necessary. Config files (`*.claude/`, `CLAUDE.md`) cannot be written to within Codebase.

1. **Ask questions** — All controls run silently, only showing the result report.
2. **Push** — This command only checks and does not push anything.
3. **Deploy** — Execute commands like `vercel deploy`.
4. **Fix errors** — If an error is found, report it and fix it.
5. **Run all steps** — Even if one step fails, proceed to the next step.
6. **Result report MANDATORY** — A result report must be generated everywhere.

### Invariant Rules (Valid in Every Command)

1. **Do not write config into Codebase** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` files are created ONLY inside Agentbase. Creating a `.claude/` directory inside Codebase or writing `../Codebase/CLAUDE.md` is FORBIDDEN.
2. **Git runs only in Codebase** — All git operations (commit, push, branch) run inside `../Codebase/`. There is NO git in Agentbase.
3. **Codebase is readable; config is not written there** — Project files (`src/`, `app/`, etc.) can be read and edited when the task requires it. Config files (`.claude/`, `CLAUDE.md`) CANNOT be written inside Codebase.

<!-- GENERATE: SELF_REFRESH
Description: Command performs self-refresh check in the last step - Bootstrap marker. Self-Refresh section changes this marker. The command looks at its own content in front of project execution: small inconsistency Edit or big change backlog task is reported.
-->

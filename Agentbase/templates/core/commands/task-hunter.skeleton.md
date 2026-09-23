# Task Hunter — Autonomous Task Application

> Backlog retrieves tasks, analyzes them, applies them, tests them, and commits.
> Usage: `/task-hunter <number>`, `/task-hunter <keyword>`, `/task-hunter 3,5,8`

---

## Argument Resolution

The user's input is resolved according to the following rules:

| Input Type | Example | Behavior |
|---|---|---|
| Single number | `5` | Retrieve task 5 with `backlog task 5 --plain` |
| Comma-separated numbers | `3,5,8` | Iterate through each one sequentially (3 → 5 → 8) |
| Keyword | `login page` | List all tasks with `backlog task list --plain`, regardless of title/description |
| Empty input | *(none)* | Select the first suitable task with `backlog task list -s "To Do" --plain`

**Multi-task mode:** Each task's Step 1–7 repeat independently, except for errors in one task do not affect others.

---

## Step 1 — Read and Claim Task

```
backlog task <id> --plain
```

Read the task details. Extract the following information:
- **Title**
- **Description**
- **Acceptance criteria (AC)**
- **Priority**
- **Current status**

Immediately claim the task:
```
backlog task edit <id> -s "In Progress"
```

> **RULE:** If the task is already in the "Done" state, DO NOT TOUCH. Inform the user and stop.
> **RULE:** If the task is in the "In Progress" state, ask the user: continue or start from scratch?

---

## Step 2 — Analysis and Planning

### 2.1 — Codebase Cleanup

<!-- GENERATE: CODEBASE_CONTEXT

>>>
### 2.2 — File Discovery

#### Description
This section is populated by Bootstrap using manifest files.

#### Required manifest fields:
- project.structure
- stack.primary
- project.subprojects

#### Example output:

| Project Context |
| --- |
| **Project:** E-commerce platform (Next.js + NestJS + React Native) |
| **Stack:** TypeScript, Prisma, PostgreSQL, Expo |

### 2.3 — File Reading and Analysis

1. Determine the relevant files based on the task name and ACs.
2. Read each file — understand the current architecture, patterns, imports.
3. Perform community analysis: how do other files in the same directory get organized?
4. If a similar task was done before (e.g., another controller), use it as a reference.

### 2.3.1 — Stack Compatibility Check

Identify the stack for affected files and compare them with active modules in the manifest.
If there's an inconsistency, inform the user — not mandatory, but informative:

| File Design | Expected Module |
| --- | --- |
| `*.prisma`, `prisma/` directory | `orm/prisma` |

>>>
| `Dockerfile`, `docker-compose*` | `deploy/docker` |
| `*.expo.*`, `app.json` (expo), `expo-*` | `mobile/expo` |
| `*.swift`, `*.xcodeproj`, `Podfile` | `mobile/react-native` veya iOS |
| `*.flutter.*`, `pubspec.yaml` | `mobile/flutter` |
| `next.config.*`, `app/` (Next.js) | `frontend/nextjs` |
| `*.module.ts` (NestJS pattern) | `backend/nodejs/nestjs` |
| `artisan`, `composer.json` (Laravel) | `backend/php/laravel` |
| `manage.py`, `settings.py` (Django) | `backend/python/django` |
| `.github/workflows/` | `ci-cd/github-actions` |

**Control:**
1. Compare the list of affected files with the above diagram.
2. Check if the module is active in the manifest's `modules.active`.
3. Display warning:

```
⚠️ Incompatible Stack Detected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
File: <file path>
Test: <stack name> (e.g., "Prisma ORM")
Expected Module: <module name> (e.g., "orm/prisma")
Status: This module is not active.

Suggestion: Run /workflow-update to enable the module.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
4. If active → silent, warning display

### 2.4 — Task Type Analysis and Guidance

Analyze the task AC's description, target file list, and approach mode automatically. This is a menu DEPENDING — task-hunter will automatically guide.

#### Main Mode Selection

Apply the following controls in sequence. First, select the module if it exists:

| # | Control | Module | Action |
|---|---------|-----|------|
| 1 | AC description contains "bug", "fix", or "crash" | **AECA** | Hypothesis → test → fix → verify (max 3 attempts) |
| 2 | Estimated number of affected files is between 1-2 | **RPI** | Research → Plan → Implement (fast agent, fast) |
| 3 | Estimated number of affected files is between 3-9 | **Orchestrator** | Teammate spawn, parallel work |
| 4 | Estimated number of affected files is 10+ | **Context Cycling** | Every 5 files, commit + summary, context cleanup |

**File count estimation:** Step 2.2-2.3's relevant files should be counted — no need for exactness — rough estimate is sufficient.

#### Modifier Control

If the main mode is above, apply these modifier controls in sequence:

>>>
| Control | Modifier | Does It |
|---------|----------|----------|
| Application files controller, middleware, auth, guard, permission, token icerir | **Adversarial Testing** | Applies to application files after `devils-advocate` agent is spawned — adversarial perspective on security and reliability review |
| Application files component, screen, page, layout (UI) icerir | **TDD** | Once write visual/dynamic test, then apply code |
| `test_strategy == TDD` (below for configuration) | **Red-Green** | Test ONCE written (red), then write previous code (green) |
| `security_level == high` (below for configuration) | **Dual-Pass** | Application review after second agent with clean context |

<!-- GENERATE: TASK_ROUTING_CONFIG
Description: Writes test and security configuration in the bootstrap manifest.
Required manifest fields: workflows.test_strategy, project.security_level
Example output:

#### Project Configuration (Manifest)
- **Test strategy:** `TDD` — Red-Green modifier ACTIVE
- **Security level:** `standard` — Dual-Pass modifier PASSIVE
-->

#### Decision Making

Informs user of selected mode. User can override:

```
━━━ Task Type Analysis ━━━
Task: #<id> — <title>
Findings: <description> (example: "3 files affected by new API endpoint")
Mode:    <AECA | RPI | Orchestrator | Context Cycling>
Modifier: <variable list, otherwise "none">
━━━━━━━━━━━━━━━━━━━━━━━━━━

Do you want to try a different approach? (e.g. "simple implementation", "team collaboration")
Press Enter or specify alternative >
```

> **RULE:** User does not respond or presses Enter, continues with selected mode.
> **RULE:** If user says "simple", "inline", or "single agent", goes to RPI mode.
> **RULE:** If user says "team" or "parallel", goes to Orchestrator mode.

#### Mode Reference Details

Differences in behavior for each mode (see Step 3):

**AECA (Autonomous Error Correction Agent):**
- First step: find root cause, try fix, validate
- Maximum of 3 attempts — if fails after 3rd attempt, informs user
- Each attempt: hypothesis → fix → test → evaluation
- Test command fails, moves to next hypothesis

**RPI (Research → Plan → Implement):**
- Single agent, fast workflow
- Research: reads files, understands pattern

>>>
- Plan: brief change list (max 2 files)
- Implement: direct application, teammate SPAWN ETME

**Orchestrator:**
- Use the delegation matrix from steps 3.1-3.2
- Select a suitable expert agent for each subtask (backend-expert, mobile-expert, frontend-expert)
- Spawn teammates in parallel
- Sum up results and handle merge conflict control

**Context Cycling:**
- For large refactoring tasks
- Every 5 files ordered:
  1. Insert an intermediate commit (`refactor: <scope> — intermediate commit (#<id>)`)
  2. Describe the current progress (done + remaining)
  3. Pass the summary to the next iteration
- Final commit and report in the last iteration

### 2.5 — Application Plan Creation

Step 2.4's chosen approach should be used for the plan:

```
## Application Plan — Task #<id>

### Chosen Approach
Mode: [AECA | RPI | Orchestrator | Context Cycling]
Modifiers: [list]

### Change List
1. [file_path] — [what to do]
2. [file_path] — [what to do]
...

### Dependencies
- [list of other tasks or files]

### Risk Areas
- [potential issues]

### Estimated Complexity
- [ ] Simple (single file, minor changes)
- [ ] Medium (2-4 files, following existing pattern)
- [ ] Complex (5+ files, new pattern or integration)
```

**AECA mode-specific additional plan areas:**
```
### Hypothesis
Root cause estimation: [hypothesis explanation]
Verification method: [how to test it]

>>>
**Application Flow for Orchestrator Mode**

### Teammate Module
Teammate 1: [agent] — [file list]
Teammate 2: [agent] — [file list]

**Context Cycling Mode Application Flow**

### Iteration Plan

Iteration 1 (files 1-5): [scope]
Iteration 2 (files 6-10): [scope]
...

**Save Plan to Backlog**
```
backlog task edit <id> --plan "<plan_text>"
```

---

## Step 3 — Application Flow

Step 2.4's selected mode will change the application flow. Follow the following mode-specific instructions and select the application flow for the chosen mode.

### 3.0 — Mode-Specific Application Flow

#### AECA Mode (Bug Fix)

In AECA mode, follow these steps:

```
Loop (max 3 attempts):
  1. Create hypothesis: what is the root cause?
  2. Apply fix: apply minimal change based on hypothesis
  3. Test run: execute verification commands
  4. Result evaluation:
     - Tests PASSED → exit loop, proceed to Step 4
     - Tests FAILED → update hypothesis, proceed to next attempt
  5. If all three attempts fail → STOP, inform user:
     "3 fix attempts failed. Current findings:
      Attempt 1: [hypothesis] → [result]
      Attempt 2: [hypothesis] → [result]
      Attempt 3: [hypothesis] → [result]
      Please provide guidance."
```
**AECA'da Step 3.1-3.2 (delegasyon/teammate) WILL BE APPLIED. Bug fix will be done inline.**

#### RPI Mode (Simple Feature)

RPI mode does not allow teammate spawning. Fast agent interaction:

1. **Research:** Read target files, understand the existing pattern (Steps 2.2-2.3 already completed)
2. **Plan:** Short change list (max 2 files, Step 2.5 written)
3. **Implement:** Directly apply, Step 3.1 delegate matrix will be applied, Step 3.3 rules will be followed

> RPI mode will apply Steps 3.1-3.2 directly to Step 3.3.

#### Orchestrator Mode (Complex Feature)

Orchestrator mode will apply Steps 3.1-3.2 fully:

1. Create subtasks below Step 2.5
2. Select the appropriate specialist agent for each subtask (Step 3.2 table)
3. Spawn teammates in parallel
4. Summarize results and consolidate
5. Maintain continuity between agents (import compatibility, type consistency, API contract)

#### Context Cycling Mode (Major Refactoring)

Context Cycling mode will be applied iteratively:

```
Each iteration (5 files):
  1. Apply the iteration plan from Step 2.5
  2. Apply changes (Step 3.3 rules)
  3. Run tests
  4. Make an intermediate commit:
     git commit -m "refactor: <scope> — intermediate commit (#<id>)"
  5. Progress summary:
     "Iteration N completed. Done: [list]. Remaining: [list]."
  6. Summary will be logged to backlog:
     `backlog task edit <id> --append-notes "Context Cycling iteration N: [summary]"`
  7. Move on to the next iteration
```

> The final commit will be made at Step 5. Intermediate commits are safe checkpoints for refactoring.
> **RULE:** Each iteration can be independent and testable. Half-done changes are NOT ALLOWED.

### 3.0.1 — Modifier Application

Selected modifiers will be added to the main application's upper layer. After completing Step 4 (before applying the next step), apply the following modifiers:

| Modifier | When | What |
|----------|----------|--------|

>>>
| **Adversarial Testing** | After application completion | Spawn `devils-advocate` agent. The agent code examines adversarial perspectives: edge cases, wrong input, permission bypass, race conditions, N+1 queries, and dependency issues. Report MEDIUM/LOW-level findings, and fix CRITICAL-level issues. |
| **TDD** | Once | Write UI component tests (render test, event test) once, then apply the code. |
| **Red-Green** | Once | For each change: (1) write red test (must fail), (2) write green test (minimal code that passes), and (3) refactor. |
| **Dual-Pass** | After application completion | Spawn `code-review` agent with CLEAN context. The agent implements independently, reviewing the implementation. Fix CRITICAL-level issues if found. |

> **TDD and Red-Green TOGETHER selected:** Red-Green takes priority (in a more refined TDD state). TDD modifier is ATLA.
> **Adversarial Testing and Dual-Pass TOGETHER selected:** Once adversarial testing, then dual-pass. Dual-pass also reviews adversarial fixes.

### 3.1 — Teammate Delegation Matrix

> **NOT:** This section only applies to the Orchestrator mode. AECA and RPI modes skip this.

Decide delegation based on complexity:

| Complexity | File Count | Decision | Method |
|---|---|---|---|
| Simple | 1-2 | Directly apply | Inline |
| Medium | 3-5 | Directly apply | Inline |
| Complex | 6+ | Spawn teammate | Delegate to lower tasks |
| Very complex | 10+ | Get user input without spawning teammate | Plan and approve |

### 3.2 — Teammate Spawn Mechanism

Create subtasks for complex tasks. Use the **expert agent** suitable for the file type:

#### Expert Agent Guidance Table

Determine the correct expert agent based on the target file type:

| Target File Type | Agent | Description |
|---|---|---|
| Controller, service, middleware, route, model, migration | `backend-expert` | Backend framework expert |
| Screen, component (mobil), navigation, hook (mobil) | `mobile-expert` | Mobile platform expert |
| Page, component (web), layout, style, store (web) | `frontend-expert` | Frontend framework expert |
| Multi-layered (backend + frontend) | Separate agent for each layer | Parallel spawn |
| Test, config, util (layer unclear) | Inline apply | No need for expert agent |

**Monorepo:** If a subproject-based expert agent exists (e.g., `api-expert`, `mobile-expert`), prefer the specific agent over the generic one. The subproject agent should be familiar with the project's directory structure and conventions.

**Agent Not Available:** Bootstrap's expert agent creation is not available for certain projects (e.g., Go project without `mobile-expert`). Inline apply and follow framework rules in the IMPLEMENTATION_RULES section.

#### Spawn Format

```
## Teammate Task: [task_name]
- Agent: [backend-expert | mobile-expert | frontend-expert | {subproject}-expert]
- Target files: [list]
- Action to perform: [net instruction]
- Reference file: [example pattern for]
- Completed with: [expected output]

>>>
> **Rule:** Each teammate should set NET boundaries. File list, expected output, reference pattern.
> **Rule:** Teammates should not perform file comparison between each other. The same file cannot be edited by two teammates.
> **Rule:** Expert agent should only edit files in their own domain (backend-expert should not touch frontend files).

### 3.3 — Implementation Rules

<!-- GENERATE: IMPLEMENTATION_RULES
Description: This section will be filled with data from Bootstrap's manifest.
Required manifest fields: stack.primary, stack.conventions, project.rules
Example output:
### Stack-Specific Rules

**TypeScript General:**
- Strict mode is active, `any` type is forbidden
- Barrel export use (`index.ts`)
- Path alias use (`@/modules/...`)

**NestJS Backend:**
- Each endpoint should be validated with a DTO
- The logic of the service layer and only routing in the controller
- Follow the Guard/Interceptor pattern
- Prisma client injection through `PrismaService`

**Next.js Frontend:**
- Use App Router, not Pages Router
- Server Component is assumed, `'use client'` only when necessary
- Tailwind CSS, inline style is forbidden

**React Native / Expo:**
- Use the `useTheme()` hook to set theme colors, hardcoded color is forbidden
- Navigation: Expo Router
- Platform-specific code use `Platform.select()`
-->

### 3.4 — Progress Log

Log each important step:
```
backlog task edit <id> --append-notes "[PROGRESS] Step 3.4 — UserService.createUser() completed"
```

---

## Step 4 — Validation Gate

### 4.1 — Test Write Control

Check if there are any items that require testing.

>>>
### 4.2 — Syntax Control

Verify that the files affected by changes do not have syntax errors:
- TypeScript: Does it have a compilation error?
- Are imports valid?
- Is the file in the correct format?

### 4.3 — Test Execution

<!-- GENERATE: VERIFICATION_COMMANDS
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.subprojects, project.scripts, stack.test_framework
Example output:
Test and verification commands for each subproject:

| Subproject | Command | Explanation |
|---|---|---|
| API | `cd ../Codebase/apps/api && npm run test` | Jest unit tests |
| API (e2e) | `cd ../Codebase/apps/api && npm run test:e2e` | End-to-end tests |
| API (lint) | `cd ../Codebase/apps/api && npm run lint` | ESLint checks |
| API (type) | `cd ../Codebase/apps/api && npx tsc --noEmit` | TypeScript type checking |
| Web | `cd ../Codebase/apps/web && npm run test` | Jest/Vitest unit tests |
| Web (build) | `cd ../Codebase/apps/web && npm run build` | Build validation |
| Mobile | `cd ../Codebase/apps/mobile && npx tsc --noEmit` | TypeScript type checking |
| Shared | `cd ../Codebase/packages/shared && npm run test` | Package tests |
-->

### 4.4 — Error Handling

If a test fails:

1. **Is the error related to this task?**
   - YES → Fix the error, re-run the tests (max 3 attempts)
   - NO → Follow the existing error protocol
2. **Existing error protocol:**
   - Verify that the error existed before (git stash + test)
   - Verified → FIX, ensure that all relevant tests have passed
   - Not verified → This task is related to the error, fix it
3. **TESTS_VERIFIED flag:**
   - If all relevant tests pass: `TESTS_VERIFIED = true`
   - If tests do not pass: Proceed to Step 5

> **RULE:** Do not commit with `TESTS_VERIFIED = false`.
> **RULE:** You cannot fix existing errors, only verify that your own task's tests have passed.
### 4.5 — Optional Documentation Synchronization

This step will only be executed if one of the following areas is affected:

* Project capabilities, scope, or environment definition
* Stack, runtime, package, tool, or integration selection
* Directory structure, module boundaries, data flow
* Git/review/test/deploy workflow
* README or onboarding information for developers

If none of these areas are affected, skip this step.

If necessary, run the `service-documentation` agent:

```
## Teammate Task: service-documentation
- Target files: PROJECT.md, STACK.md, DEVELOPER.md, ARCHITECTURE.md, WORKFLOWS.md, README.md
- Action to perform: Determine which root documents need updating based on current diff, and extract minimal update list without unnecessary changes.
- Reference materials: git diff, changed files, existing root documents
- Completion outcome: File-based update recommendations or "no update required" report
```

After the agent's output is received:

1. Read the recommendations
2. Apply only updates directly related to the task and verified by diff
3. If documentation changes were made, add notes to backlog
4. If code outside of documents was changed, re-run relevant verification commands

---

### 5.1 — File Preparation

**ONLY execute this step for files related to this task:**

```bash
git add <file1> <file2> ...
```

> **RULE:** Use `git add .` or `git add -A`. Only include files related to this task.
> **RULE:** Do not commit `.env`, credentials, `node_modules`, build artifacts.

---

### 5.2 — Commit Message

<!-- GENERATE: COMMIT_CONVENTION
Description: This section will be filled by Bootstrap with manifest data.
Required manifest fields: conventions.commit_language, conventions.commit_format
Example output:
### Commit Format

```

>>>
### Prefix Dictionary:
| Prefix | Usage |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code refactoring (no behavior change) |
| `test` | Add or modify test |
| `docs` | Documentation |
| `chore` | Maintenance, configuration |
| `style` | Code formatting |

### Language: English
**Example:** `feat: user registration endpoint added (#12)`
-->

### 5.3 — Create Commit

```bash
git commit -m "<prefix>: <description> (#<task_id>)"
```

---

## Step 6 — Task Completion

### 6.1 — AC Control

Manually check all acceptance criteria:
- [ ] AC 1 — was it accepted?
- [ ] AC 2 — was it accepted?
- ...

> **RULE:** If none of the ACs were accepted, close the task.

### 6.2 — Summary Write

```
backlog task edit <id> --append-notes "[DONE] <summary>"
```

Summary contents:
- Applied changes (file list)
- Added/modified lines (column count)
- Created tests
- Commit hash

### 6.3 — Status Update

>>>
### backlog task edit <id> -s "Done"

---

## Step 7 — User Report

Present the following format to the user:

```
## Task #<id> — <title>

### Completed Tasks
- [Change 1]
- [Change 2]

### Change Summary
| File | Changes |
|---|---|
| `<path>` | <description> |

### Test Results
- [x] Unit tests passed
- [x] Lint clean
- [x] Code review successful

### Commit
`<hash>` — `<message>`

### Notes
[If any additional information, warnings, or suggestions]

### Next Task Suggestion

| Order | Task | Title | Score | Reason |
|------|------|--------|------|-------------|
| 1 | #id | title | score | reason |
| 2 | #id | title | score | reason |
| 3 | #id | title | score | reason |

> To continue: `/task-hunter {id}`
```

---

## Step 8 — Next Task Suggestion

This step is always performed — whether it's a single task or multiple tasks, once the previous task is completed.

>>>
# Multiple Task Mode

In the multiple task mode, only completed TUM tasks are displayed — task completion is not recommended.

### 8.1 Completing Open Tasks

```bash
backlog task list -s "To Do" --plain
```

If there are no open tasks → "There are no open tasks in the backlog." message to complete.

### 8.2 Task Context Analysis

Use information from recently completed tasks:

| Information | Source | Usage |
|-------------|--------|-------|
| **Modified Files** | Step 3's file list | Bonus for tasks touching the same file/directory |
| **Affected Layers** | Subproject/Directory Detection | Bonus for tasks in the same layer (backend/mobile/frontend) |
| **Tags** | Tags of completed task | Bonus for tasks with the same tag |
| **Learned Patterns** | Implementation Experience | Already loaded knowledge |

### 8.3 Fast Scoring (5-Dimensional)

Calculate fast score for each open task:

```bash
Etki (0-10):         Security/Data Loss=10, UX/Refactor=2
Risk (0-10):         Active in Production=10, Only Dev=2
Maturity (0-10):   Blocker=10, Isolated=2
Complexity (0-10):  Single File=10, Migration+Multi-Layer=2
Similarity (0-10):  Same File=10, Same Directory=8, Same Layer=6, Same Tag=4, Irrelevant=0

Score = (Etki x 2.5) + (Risk x 2) + (Maturity x 1.5) + (Complexity x 1) + (Similarity x 2)
```

**Similarity Bonus:**
- Touching the **same file** → 10 (context change zero)
- Touching the **same directory** → 8
- Touching the **same layer** (backend/mobile/frontend) → 6
- Having the **same tag** → 4
- No relevance → 0

### 8.4 Suggesting Tasks

Suggest the top 3 tasks with the highest score:

```markdown
## Next Task Suggestions

Based on completed task's context and backlog analysis:
>>>
| Sira | Task | Title | Score | Why Today? |
|------|------|--------|------|-------------|
| 1   | #{id} | {Title} | {Score} | {One sentence explanation} |
| 2   | #{id} | {Title} | {Score} | {One sentence explanation} |
| 3   | #{id} | {Title} | {Score} | {One sentence explanation} |

> To continue: `/task-hunter {id}`

**Writing Style Rules**

- If a hotfix is required, specify: "Fixed in the last commit of `{file}` with the same module"
- If a blocker is required, specify: "#{other_id} this task is related to"
- If it's a quick win, specify: "A single file change, high impact"
- If there's a high risk, specify: "Active on production"

---

## Mandatory Rules

### Invariant rules (apply to every command)

1. **Do not write config into Codebase** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` files should only be created inside the Agentbase directory. Creating a `.claude/` directory in the codebase, writing to `../Codebase/CLAUDE.md` is NOT ALLOWED.
2. **Git runs only in Codebase** — All Git operations (commit, push, branch) should be performed inside the codebase. The Agentbase does not have Git.
3. **Codebase is readable; config is not written there** — Project files (`src/`, `app/`, etc.) are readable and can be modified if necessary. Config files (`.claude/`, `CLAUDE.md`) should NOT be written in the codebase.

1. **Autonomous execution** — User interaction, decision-making, and application execution. Only for uncertain AC's.
2. **Read once, write never** — Read a file without modifying it first. Always read before writing.
3. **Pattern follow** — Follow the existing code structure, naming conventions, formatting, and style. Do not introduce new conventions.
4. **Minimal changes** — Make only necessary changes for the task. Refactor, improve, clean up.
5. **Test write** — Write a test when a new task is added. Do not modify existing tests.
6. **TESTS_VERIFIEDWITHOUT commit atma** — Commit without verifying tests first. Follow Step 5.
7. **Only task files commit'le** — `git add .` is NOT ALLOWED. Only commit task-related files.
8. **Backlog CLI use** — Use the `backlog` CLI to manage tasks, notes, and shutdowns. Do not manually edit files.
9. **Fix previous errors** — Fix existing errors before introducing new ones. Only test your own tests.
10. **Close without consensus** — Close a task if all acceptance criteria are met. Otherwise, mark it as "Done".
11. **Team member boundaries** — Provide clear file lists to teammates. Do not allow simultaneous modifications of the same file.
12. **Logging progress** — Log important steps in the backlog.
13. **Error handling** — Handle errors after three attempts. If not resolved, inform the user.
14. **Codebase path** — Access all project files through `../Codebase/`.
15. **Security** — Do not commit `.env` files, credentials, or secrets. Log them instead, and do not display them.

16. **DB schema discipline** — Follow the DB schema/model/migration change checklist: migration file, dry-run/preview, rollback/down, and destructive flag review.
17. **ADR discipline** — When introducing architectural changes, follow the ADR process: write or reference an existing ADR in `backlog/decisions/`. If layer boundaries, data flow, integration contracts, runtime/deploy models, or cross-cutting policies change, ADR control is mandatory.
### API Versioning

All endpoints must be under the `/api/v1/` prefix.

### Theme Usage

In React Native, hardcoded color YASAK should not be used. Instead, use `useTheme()`.

### DTO Validation

Every API endpoint must use a DTO (Data Transfer Object) with class-validator for input validation.

### Error Response Format

API errors must be in the format `{ error: string, code: string, details?: any }`.

16. **DB schema discipline** — if you changed a DB schema, model, or migration, follow `.claude/rules/db-migration-discipline.md`: migration file, dry-run/preview, rollback/down script, and a destructive-flag scan.

Invariant rules:

1. **Do not write config into Codebase** — create `.claude/`, `CLAUDE.md`, `.mcp.json`, and `.claude-ignore` only inside Agentbase.
2. **Git runs only in Codebase** — product git operations stay in `../Codebase/`.
3. **Codebase is readable; config is not written there**.

Commit completed non-sensitive work in the same session without asking. Do not push unless the user asks.

<!-- GENERATE: SELF_REFRESH
Last step. Compare this command with what the run observed.
-->


## Invariant rules

- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
- Do not write config into Codebase
- Codebase is readable; config is not written there

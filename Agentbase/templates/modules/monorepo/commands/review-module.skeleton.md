# Review Module — Deep Module Review

> Deeply reviews a specific module/feature across all layers, finds issues, fixes simple ones, and records complex ones in the backlog.
> Usage: `/review-module <module_name>`, `/review-module auth`, `/review-module payments`

---

## Rule: WORK AUTONOMOUSLY

- Do NOT ask the user questions — determine the module, review, and report.
- Fix simple issues (typo, missing import, wrong type, unused variable) DIRECTLY.
- RECORD complex issues (architectural change, new feature, large refactor) in the backlog.
- RUN every step — do not skip a step.

---

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.description, stack.primary, project.structure, project.subprojects
Example output:
## Project Context
- **Project:** E-commerce platform (Next.js + NestJS + React Native)
- **Stack:** TypeScript, Prisma, PostgreSQL, Expo
- **Structure:**
  - `apps/web/` — Next.js frontend
  - `apps/api/` — NestJS backend
  - `apps/mobile/` — Expo React Native
  - `packages/shared/` — Shared types and helpers
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## Step 1 — Module Detection and Scope

Map the user-provided module name to files in the codebase.

<!-- GENERATE: MODULE_MAPPING
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.structure, project.subprojects, project.modules
Example output:
### Module → File Mapping Table

| Module Name | Layer | File Patterns |
|---|---|---|
| auth | API | `apps/api/src/modules/auth/**` |
| auth | Web | `apps/web/src/app/(auth)/**`, `apps/web/src/components/auth/**` |
| auth | Mobile | `apps/mobile/src/screens/Auth/**`, `apps/mobile/src/hooks/useAuth*` |
| auth | Shared | `packages/shared/src/types/auth*`, `packages/shared/src/dto/auth*` |
| products | API | `apps/api/src/modules/products/**` |
| products | Web | `apps/web/src/app/products/**` |
| products | Mobile | `apps/mobile/src/screens/Products/**` |
| payments | API | `apps/api/src/modules/payments/**` |
| payments | Web | `apps/web/src/app/checkout/**` |

**If no mapping is found:** Scan the codebase with Glob:
```bash
cd ../Codebase && find . -path '*/node_modules' -prune -o -name "*<module_name>*" -print
```
-->

Collect the module across all layers. Scope:
- Main files (controller, service, component, screen)
- Related files (DTO, type, helper, test)
- Configuration files (route, middleware, navigation)

This is a monorepo review across the mapped layers.

---

## Step 2 — Big Picture: Cross-Layer Relationship Map

<!-- GENERATE: SUBPROJECT_LAYERS
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.subprojects, stack.primary
Example output:
### Layer Structure

| Layer | Directory | Role | Stack |
|---|---|---|---|
| API | `apps/api/` | Backend, REST API, business logic | NestJS, Prisma |
| Web | `apps/web/` | Frontend, user interface | Next.js, React |
| Mobile | `apps/mobile/` | Mobile application | Expo, React Native |
| Shared | `packages/shared/` | Shared types, DTOs | TypeScript |

### Cross-Layer Data Flow
```
Mobile/Web → API → Prisma → PostgreSQL
     ↑                ↓
  Shared (types, DTOs)
```
-->

Read module files in each layer and extract relationships:
- Which services do API endpoints use?
- Which API endpoints does the frontend call?
- Are shared types correct?
- Are DTOs in sync?

---

## Step 3 — Parallel Review Agents

Spawn 4 parallel review agents. Each reviews from a different perspective.

<!-- GENERATE: REVIEW_AGENTS
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: stack.primary, project.conventions, project.rules
Example output:
### Agent 1 — Code Quality Review
**Perspective:** Clean code, SOLID, DRY, type safety
**Checklist:**
- [ ] Repeated code blocks (DRY violation)
- [ ] Missing or wrong TypeScript types
- [ ] Use of `any` type
- [ ] Unused import/variable/function
- [ ] Function complexity (warn at 10+ lines)
- [ ] Missing error handling (try/catch, error boundary)
- [ ] Magic number/string usage
- [ ] Wrong naming

### Agent 2 — Security Review
**Perspective:** OWASP, authorization, data security
**Checklist:**
- [ ] IDOR vulnerabilities (ID-based access control)
- [ ] SQL injection risk
- [ ] XSS risk
- [ ] Missing authorization check
- [ ] Sensitive data logging
- [ ] Hardcoded credential
- [ ] Missing rate limiting

### Agent 3 — Performance Review
**Perspective:** N+1 query, unnecessary render, memory leak
**Checklist:**
- [ ] N+1 query problem (missing Prisma include)
- [ ] Unnecessary database query
- [ ] Unnecessary re-render on frontend
- [ ] Large payload return (missing pagination)
- [ ] Repeated work without cache
- [ ] Memory leak potential (event listener cleanup)

### Agent 4 — Architecture Compatibility Review
**Perspective:** Project patterns, layer fit, convention
**Checklist:**
- [ ] Layer violation (business logic in frontend, DB query in controller)
- [ ] Import path convention violation
- [ ] File naming convention violation
- [ ] Missing barrel export
- [ ] Shared type synchronization
- [ ] Missing test file
-->

Spawn a teammate for each agent:

```
## Teammate Task: <agent_name>_review
- Target files: [relevant files inside the module]
- Perspective: [perspective above]
- Checklist: [list above]
- Output: findings list in JSON format
```

---

## Step 4 — Finding Classification

Collect all agent findings and classify in two dimensions:

### Impact Level

| Level | Description | Examples |
|---|---|---|
| CRITICAL | Security hole, data-loss risk, crash | IDOR, SQL injection, unhandled error |
| HIGH | Functional bug, performance issue | Wrong business logic, N+1 query |
| MEDIUM | Code quality, convention violation | DRY violation, missing type, naming |
| LOW | Cosmetic, improvement suggestion | Missing comment, log message |

### Action Type

| Type | Description | Decision |
|---|---|---|
| DIRECT_FIX | Simple, low risk, single file | Fix now |
| BACKLOG | Complex, multi-file, architectural | Create task |
| INFO | Suggestion, improvement | Report |

### Decision Matrix

| Impact \ Action | DIRECT_FIX | BACKLOG |
|---|---|---|
| CRITICAL | Fix immediately + notify user | Create task (P1) |
| HIGH | Fix | Create task (P2) |
| MEDIUM | Fix | Create task (P3) |
| LOW | Fix (if time allows) | Report (do not create task) |

---

## Step 5 — Cross-Layer Impact Analysis

Analyze how an issue in the module affects other layers:

```
Example: If an auth endpoint in the API returns the wrong type:
  → Is the Shared DTO up to date?
  → Does the Web API client expect the correct type?
  → Does the Mobile API client expect the correct type?
```

Mark cross-layer issues as CRITICAL because they affect multiple layers.

---

## Step 6 — Direct Fixes

Fix findings marked DIRECT_FIX now.

### Fix Decision Tree

```
Is the finding DIRECT_FIX?
├── YES
│   ├── Single file?
│   │   ├── YES → Fix
│   │   └── NO → Are the files in the same layer?
│   │       ├── YES → Fix
│   │       └── NO → Move to BACKLOG
│   └── Risk level?
│       ├── LOW → Fix
│       ├── MEDIUM → Fix + run tests
│       └── HIGH → Fix + write test + run
└── NO → Go to Step 7
```

### Fix Rules

1. Follow the existing pattern — do not invent a new convention.
2. Make a minimal change — only fix the issue; do NOT refactor.
3. If there are multiple fixes in the same file, do them in one pass.
4. Check dependents when import/export changes.

---

## Step 7 — Verification Gate

Verify that the fixes did not break anything.

<!-- GENERATE: VERIFICATION_COMMANDS
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.subprojects, project.scripts, stack.test_framework
Example output:
### Verification Commands

| Check | Command |
|---|---|
| API type check | `cd ../Codebase/apps/api && npx tsc --noEmit` |
| API tests | `cd ../Codebase/apps/api && npm run test -- --passWithNoTests` |
| Web type check | `cd ../Codebase/apps/web && npx tsc --noEmit` |
| Web build | `cd ../Codebase/apps/web && npm run build` |
| Mobile type check | `cd ../Codebase/apps/mobile && npx tsc --noEmit` |
| Shared type check | `cd ../Codebase/packages/shared && npx tsc --noEmit` |
| Lint | `cd ../Codebase && npm run lint` |
-->

Run all verification commands. If any fail:
- If caused by this review → fix
- If a pre-existing error → ignore and report

---

## Step 8 — Fix Quality Gate

Check the quality of the fixes:

- [ ] Does each fix follow the existing pattern?
- [ ] Were unnecessary changes avoided?
- [ ] Are import/export chains healthy?
- [ ] Is type compatibility preserved?

---

## Step 9 — Commit Changes

If fixes were made, create a commit:

```bash
git add <fixed_files>
git commit -m "refactor(<module_name>): review findings fixed"
```

> If no fixes were made, SKIP this step.

Commit completed non-sensitive work in the same session without asking. Do not push unless the user asks.

---

## Step 10 — Create Backlog Tasks

Create a task for findings marked BACKLOG:

```bash
backlog task create "<finding_summary>" --description "<detailed_description>" --priority <high|medium|low> --labels "review-finding"
```

Create a separate task per finding. In the task description include:
- What the issue is
- Which files it is in
- Why it was not fixed now
- Suggested solution approach

---

## Step 11 — Result Report

```
## 🔍 Module Review Report — <module_name>

### Scope
- **Files scanned:** X
- **Layers scanned:** API, Web, Mobile, Shared

### Findings Summary

| Level | Finding | Direct Fix | Backlog | Info |
|---|---|---|---|---|
| 🔴 CRITICAL | X | Y | Z | - |
| 🟠 HIGH | X | Y | Z | - |
| 🟡 MEDIUM | X | Y | Z | - |
| 🟢 LOW | X | Y | Z | W |
| **Total** | **X** | **Y** | **Z** | **W** |

### Fixes Applied
| # | File | Change | Impact |
|---|---|---|---|
| 1 | `<path>` | <description> | <level> |

### Backlog Tasks Created
| # | Title | Priority | Why Not Fixed Now |
|---|---|---|---|
| 1 | <title> | P2 | <reason> |

### Cross-Layer Findings
[cross-layer issues if any]

### Dead Code
[unused file/function/variable list if any]

### Commit
`<hash>` — `<message>` (or "No fixes applied")

### Overall Assessment
[2-3 sentences about the module's overall health]
```

---

## Dead Code Detection Methodology

Detect unused code inside the module:

1. **Exported but never imported functions:** Check with Glob + Grep
2. **Defined but never called functions:** AST analysis (simple grep)
3. **Unused files:** Files never imported from anywhere
4. **Commented-out code blocks:** Code inside `// ` or `/* */`

If dead code is found, report at INFO level. Deletion is left to the user.

---

## Mandatory Rules

### Invariant rules (apply to every command)

1. **Do not write config into Codebase** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` files are created ONLY inside Agentbase. Do not create a `.claude/` directory inside Codebase; writing `../Codebase/CLAUDE.md` is FORBIDDEN.
2. **Git runs only in Codebase** — All git operations (commit, push, branch) run inside `../Codebase/`. There is NO git in Agentbase.
3. **Codebase is readable; config is not written there** — Project files (`src/`, `app/`, etc.) can be read and edited when the task requires it. Config files (`.claude/`, `CLAUDE.md`) CANNOT be written inside Codebase.

1. **Work autonomously** — Do not ask questions; determine module boundaries and review.
2. **Read first, write later** — Understand existing code before fixing.
3. **Follow patterns** — Follow existing conventions; do not invent new ones.
4. **Minimal change** — Only fix the finding; do NOT add extra refactor.
5. **Run tests** — Always verify after a fix.
6. **Cross-layer check** — Verify a change in one layer does not break others.
7. **Backlog record** — record findings that were not fixed.
8. **Report is MANDATORY** — Always produce a result report.
9. **Report dead code** — Do NOT delete unused code; report it.
10. **Codebase path** — Access all project files via `../Codebase/`.

<!-- GENERATE: SELF_REFRESH
Description: Command final step - self-refresh check. Bootstrap replaces this marker
with the shared Self-Refresh section. The command reviews its own text against the
project reality: small mismatches via Edit, large changes reported as a backlog task.
-->


## Invariant rules

- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
- Do not write config into Codebase
- Codebase is readable; config is not written there

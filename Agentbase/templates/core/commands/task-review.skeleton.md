# Task Review — 3+1 Agent-Based Code Inspection

> Inspect the last commit or specified diff with at least 3 parallel agents. Add an optional 4th agent (devils-advocate) for security/auth/odeme/API/migration changes.

> Usage: `/task-review`, `/task-review <commit_hash>`, `/task-review HEAD~3..HEAD`

---

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.description, stack.primary, project.structure
Example output:
## Project Context
- **Project:** E-commerce platform (Next.js + NestJS + React Native)
- **Stack:** TypeScript, Prisma, PostgreSQL, Expo
- Review in sequence to scrutinize stack-specific rules.
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## Step 1 — Extract Diff

### 1.1 — Argument Resolution

| Input | Behavior |
|---|---|
| Empty | Son commit: `cd ../Codebase && git diff HEAD~1..HEAD` |
| Commit hash | Belirtilen commit: `cd ../Codebase && git show <hash>` |
| Range | Aralik: `cd ../Codebase && git diff <range>` |

### 1.2 — Diff Analysis

Extract the following information from the diff:
- List of changed files
- Added/deleted lines in each file
- Type of changes (new file, modification, deletion)
> **Rule:** If the diff is empty or only whitespace changes, say "No changes to be applied" and STOP.

---

## Step 2 — 3 Agent Spawn

Perform the following three agents in parallel. Each agent will work on the entire diff.

### Agent 1 — Code Reviewer

**Task:** Quality control of code, architecture, best practices.

**Control List (Fixed Foundation):**

- [ ] **Logical Error:** Incorrect condition, missing null check, off-by-one, wrong operator
- [ ] **Error Handling:** Missing try-catch block, error swallowing, generic catch, lack of informative error messages
- [ ] **Naming Conventions:** Variable/function names unclear, inconsistent, misleading
- [ ] **Duplication (Code Repeat):** Same code in multiple places, extractable common function
- [ ] **Performance:** Unnecessary loop, N+1 query, missing index usage, unnecessary re-render
- [ ] **Security:** SQL injection, XSS, CSRF, unauthorized access, sensitive data logging
- [ ] **Type Security:** `any` usage, missing type, wrong type assertion
- [ ] **Edge Case:** Empty array, null/undefined, edge values, race condition

<!-- GENERATED: REVIEW_CHECKLIST
Description: This section will be filled by Bootstrap with manifest data.
Required manifest fields: stack.primary, stack.conventions, project.rules
Example output:
**Stack-Specific Controls:**

- [ ] **Prisma:** Is a migration created when schema changes?
- [ ] **Prisma:** Is `findUnique` unnecessarily used instead of `findFirst`?
- [ ] **NestJS:** Does validation exist for DTOs? Are `class-validator` decorators correctly applied?
- [ ] **NestJS:** Are guards/interceptors correctly implemented?
- [ ] **Next.js:** Is the server/client component separation correct? Is there unnecessary `'use client'`?
- [ ] **Next.js:** Can `useEffect` contain fetch instead of Server Component or Route Handler?
- [ ] **Expo:** Is a hardcoded color present? Is `useTheme()` used?
- [ ] **Expo:** Are platform-specific codes using `Platform.select()`?
- [ ] **Security:** Is IDOR (Insecure Direct Object Reference) vulnerability present? Can another user access another user's data?
- [ ] **API:** Is the response format consistent? Is it in line with the standard error response?
-->
### Silent Failure Hunter — Agent 2

**Task:** Find silent errors in code without throwing exceptions.

#### 8-Point Control List:

1. **Silent catch**: `catch(e) {}` or `catch(e) { console.log(e) }` — Has the error been swallowed?
2. **Missing await**: Async function called but `await` forgotten? Is the promise unhandled?
3. **Incorrect comparison**: `==` vs `===`, falsy value semantics (`0`, `""`, `false` vs `null`/`undefined`)
4. **Missing return**: Does the function return where it should? Is early return missing?
5. **State inconsistency**: Is something being updated but related areas not updating?
6. **Race condition**: Are concurrent asynchronous operations writing to the same value, guaranteed for order?
7. **Expected default value semantics**: Should `|| defaultValue` be used instead of `?? defaultValue` (`0` and `""` have different implications)?
8. **Copied-but-not-updated variable/string**: Is there a copied but not updated variable/string?

### Regression Analyzer — Agent 3

**Task:** Evaluate the risk of breaking existing code with changes.

#### Control Areas:

1. **Removed code**: Are removed lines being used elsewhere?
2. **Change propagation**: Does the changed function/type propagate to other files via import?
3. **API contract**: If the endpoint signature is changed, do consumers get affected?
4. **Database**: Does a schema change affect existing data? Is migration necessary?
5. **Configuration**: Has an environment variable been added or changed, affecting all environments?
6. **Test scope**: Is there a test for the change? Are current tests updated?

### Optional: Devils Advocate Analysis (Agent 4)

If the change affects any of the following areas, trigger the `devils-advocate` agent:
* Security/auth/authorization files
* Payment/finance/hot data processing
* Public-facing API endpoints
* Database schema/migration
* `manifest.project.security_level == "high"` or `"critical"`

If none of these conditions are met, skip this step.
**Task:** Identify points of entry from an adversarial perspective and identify security vulnerabilities.

**Control Areas:**

1. **Edge Cases:** Handling NULL, empty, large, negative, Unicode input values
2. **Input Fuzzing:** Malformed data, unexpected types, boundary values
3. **Vulnerability Assessment:** N+1 queries, memory leaks, deadlocks, 10x load
4. **Dependency Vulnerabilities:** What happens when the database/API/cache is compromised? Is there a retry/fallback mechanism?
5. **Security Attack Surface:** IDOR, injection, privilege escalation, data vulnerabilities

> **NOTE:** This agent can run after the other three (parallel execution is not required). Report findings as CRITICAL, HIGH, MEDIUM, or LOW.

---

## Step 3 — Evaluating Findings

### 3.1 — Infinite Loop Protection

> **RULE:** Each agent only performs one iteration. If a finding is made, report it; do not repeat the process.

### 3.2 — Decision Tree

For each finding, apply the following sequence:

```
Is there a finding?
├── NO → Clean report
└── YES → Is this a real issue?
    ├── NO (False Positive) → False alarm, remove from report
    └── YES → Is this a bug in our own code?
        ├── YES → This is a critical bug
        └── NO → Is this an existing issue?
            ├── YES → Create a backlog item for the task, do not touch the diff
            └── NO → Describe the impact of the diff on the report
```

### 3.3 — False Positive Filtering

The following are generally false positives:
- Existing code that matches the pattern (the project already has this implementation)

>>>
### 3.4 — Pre-existing Issue Rules

In diffs, for pre-existing issues:

```
backlog task create "Review evidence: <issue summary>" --description "<detail>" --priority "low" --labels "tech-debt"
```

> **RULE:** Fix pre-existing issue. Create a task in the backlog to review and resolve it.

---

## Step 4 — Report Generation

### 4.1 — Report Format

```
## Code Review Report

### Changes Inspected
- **Commit/Range:** `<hash or range>`
- **Number of files:** `<number>`
- **Added lines:** `<number>`
- **Deleted lines:** `<number>`

---

### 🔴 Critical Issues (Must be fixed)
| # | Agent | File | Line | Issue | Severity |
|---|---|---|---|---|---|
| 1 | Code Reviewer | `user.service.ts` | 42 | Missing null check | High |
| 2 | Idle Error | `auth.controller.ts` | 18 | Sessiz catch | Medium |

### 🟡 Warnings (Should be noted)
| # | Agent | File | Line | Issue |
|---|---|---|---|---|
| 1 | Regression | `api.module.ts` | — | New import added without testing |
```

>>>
### Clean Areas
- [x] Security control passed
- [x] Type security is compliant
- [x] Performance issue is resolved

### Previous Issues (Added to Backlog)
| # | Issue | Created Task |
|---|---|---|
| 1 | SQL injection risk in `legacy.service.ts` | Task #45 |

### General Evaluation
**Result:** 

[General comments and suggestions]
```

### 4.2 — Changes

If "Fix Required" indicators are present:

1. Fix the indicator
2. Validate the application (test run)
3. Commit:
```markdown
fix: review indicator — <issue summary>
```
**Language:** English
**Example:** `fix: review indicator — incomplete null check fixed`

> **RULE:** Review fix commit should be separate. Do not modify original commit (amend).

>>>
## Mandatory Rules

### Invariant rules (apply to every command)

1. **Do not write config into Codebase** — Only `.claude/`, `CLAUDE.md`, `.mcp.json`, and `.claude-ignore` files should be created within the Agentbase directory. Creating a `.claude/` directory in the Codebase or writing to `../Codebase/CLAUDE.md` is NOT ALLOWED.
2. **Git runs only in Codebase** — All Git operations (commit, push, branch) should be performed within the `../Codebase/` directory. The Agentbase does not have Git installed.
3. **Codebase is readable; config is not written there** — Project files (`src/`, `app/`, etc.) are readable and can be formatted as needed. Config files (`.claude/`, `CLAUDE.md`) should NOT be written in the Codebase.

1. **Three agents run concurrently** — Run all agents without waiting for one another to complete.
2. **One iteration limit** — No agent will attempt a second iteration.
3. **Follow the decision tree** — Apply false positives, diffs, and previous ordering when encountering new issues.
4. **Fix existing issues first** — Create backlog tasks based on outstanding issues, avoiding diffs.
5. **Maintain report format** — Enforce critical, warning, clean, and previously existing categories.
6. **Separate commit for changes** — Make a new commit for review-only changes; do not amend the previous commit.
7. **Control whitespace diff** — Inspect only empty or whitespace diffs; otherwise, investigate further.
8. **Filter false positives** — Eliminate issues matching the current pattern and framework boilerplate.
9. **Use Backlog CLI** — Record outstanding issues using `backlog task create`.
10. **Security** — Report critical sensitive data (credentials, tokens) in diffs.
11. **Codebase path** — All file access should be through `../Codebase/`.

<!-- GENERATE: SELF_REFRESH
Description: Command final step - self-refresh check. Bootstrap this marker to modify the Self-Refresh section. The command is reviewed within the project's context: small inconsistency Edit or large change backlog task is reported.
-->

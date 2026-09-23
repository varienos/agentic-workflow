# Bug Review — Quality Control for Fix Commit

> View bug fix commit in three perspectives: code quality, silent errors, and regression risk.
> Usage: `/bug-review`, `/bug-review <commit_hash>`, `/bug-review HEAD~2..HEAD`

---

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section will be populated with data from Bootstrap's manifest files.
Required manifest fields: project.description, stack.primary, project.structure
Example output:
## Project Context
- **Project:** E-commerce platform (Next.js + NestJS + React Native)
- **Stack:** TypeScript, Prisma, PostgreSQL, Expo
- Review the stack-specific rules in mind during the review process.
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## Step 1 — Extract Diff

### 1.1 — Argument Resolution

| Input | Action |
|---|---|
| Empty | Son commit: `cd ../Codebase && git diff HEAD~1..HEAD` |
| Commit hash | Belirtilen commit: `cd ../Codebase && git show <hash>` |
| Range | Aralik: `cd ../Codebase && git diff <range>` |

### 1.2 — Diff Analysis

Diff output:
- List of changed files
- Added/removed lines in each file
- Change history (update, test, config)
- Bug fix-specific: which lines were added for "fix", which for "test"? 

>>>
> **Rule:** Don't say "There are no changes to be made" and just wait.

---

## Step 2 — 3 Agent Spawn

Train each of the three agents in parallel.

### Agent 1 — Code Reviewer (Bug Fix Perspective)

**Task:** Verify the quality and correctness of bug fixes.

**Bug Fix Control List (Fixed Framework):**

- [ ] **Why was this change made?** Was it a fix or just a cosmetic change?
- [ ] **Was it a minimal change?** Was it just a single line change or a full refactor?
- [ ] **Are there similar issues elsewhere?** Are there similar patterns in other files?
- [ ] **Has the regression test been written?** Has a test been written to verify that the fix doesn't introduce new errors?
- [ ] **Is there any side effect?** Does the change break any existing functionality?
- [ ] **Is error handling adequate?** Are try-catch blocks, error boundaries, and null checks sufficient?
- [ ] **Have edge cases been considered?** Have we considered edge cases such as null values, empty arrays, concurrent access?

<!-- GENERATE: REVIEW_CHECKLIST
Description: This section will be filled in by Bootstrap using manifest data.
Required manifest fields: stack.primary, stack.conventions, project.rules
Example output:
**Stack-Specific Checks:**

- [ ] **DB schema:** Is there a migration file for schema/model/field/table changes? Was it run dry-run or rollback/down script available?
- [ ] **Prisma:** Are transactions being used in places where they should be?
- [ ] **NestJS:** Are exception filters correctly applied? Are HTTP exceptions properly handled?
- [ ] **NestJS:** Is DTO validation still working correctly?
- [ ] **Next.js:** Has the server/client component separation been preserved?
- [ ] **Expo:** Is the theme hook being used correctly?
- [ ] **Security:** Does the fix prevent IDOR and injection risks?
- [ ] **API:** Are error responses conforming to a standard format?
-->
**Task:** Verify that the bug fix does not create its own silent error.

**8-Point Control List:**

1. **Silent catch**: Is there a `catch(e) {}` in the fix? Has the error been swallowed?
2. **Missing await**: Have new async blocks forgotten to include `await`?
3. **Incorrect comparison**: Are `==` vs `===` used incorrectly in conditions within the fix?
4. **Missing return**: Is there a `return` statement where it should be?
5. **State inconsistency**: Has the fix updated one place but not related places?
6. **Race condition**: Does the fix create a timing issue with asynchronous operations?
7. **Expected value consistency**: Are `||` vs `??` usage correct?
8. **Copied-but-not-applied code**: Is there copied code from another location that hasn't been updated?

### Agent 3 — Regression Analyst

**Task:** Evaluate the risk of disruption to existing functionality.

**Control Areas:**

1. **Removed code**: Are removed lines still being used elsewhere in the codebase?
2. **Changes propagation**: Does a change in one function/type/namespace affect other files through import?
3. **Behavioral changes**: Does the fix introduce behavior changes outside the fixed area?
4. **Test coverage**: Have all scenarios of the fix been tested? Only "happy path"?
5. **Data integrity**: Does the fix touch database operations? Affect existing data?
6. **Configuration impact**: Do environment variables change affect the entire environment?

---

## Step 3 — Findings Evaluation

### 3.1 — Infinite Loop Detection

> **RULE:** Each agent only performs one iteration. Report findings, NO REPEAT.

### 3.2 — Decision Tree

For each finding:

```
>>>
Is there a solution?
```
├── NO → Clean report
└── YES → Is it a real issue?
    ├── NO (False Positive) → Remove from report
    └── YES → Is the issue in the code itself?
        ├── YES → Mark as needing improvement
        └── NO → Was there an existing problem?
            ├── YES → Create backlog task, do not touch diff
            └── NO → Describe the indirect effect on the report
```

### 3.3 — False Positive Filtering

Special false positive controls for bug fix review:
- Fix should be done in accordance with framework conventions (consistent)
- Trade-off: temporary solution for urgent fix (if explicitly stated)
- Test scope: fix only affects specific case, general test is not necessary

### 3.4 — Pre-existing Issue Rule

For issues outside the diff:
```
backlog task create "Bug review issue: <issue summary>" --description "<detail>" --priority "medium" --labels "tech-debt"
```

> **RULE:** Fix existing problem. Create a backlog task, proceed.

---

## Step 4 — Verification Gate (After Improvement)

If a "improvement needed" bug was found:

### 4.1 — Apply the Fix

Fix the issue. Follow minimal change principle.

### 4.2 — Run Tests

Run tests for affected sub-project (from `VERIFICATION_COMMANDS`).

>>>
### 4.3 — Test Results

- Tests completed → Proceed to Step 5
- Tests failed → Review and revise fixes (max 3 attempts)
- Failed after 3 attempts → Inform user

---

## Step 5 — Report Generation

```
## Bug Fix Analysis Report

### Analyzed Changes
- **Commit/Range:** `<hash or range>`
- **Number of files:** `<number>`
- **Fix type:** [why fix / fix description / workaround]

---

### Code Review Findings
| # | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| 1 | `user.service.ts` | 42 | Why not fixed, fix applied | High | Fixed |

### Silent Error Detector Findings
| # | File | Line | Issue | Severity | Status |
|---|---|---|---|---|---|
| — | — | — | No finding | — | Cleaned |

### Regression Analysis Findings
| # | File | Issue | Risk | Status |
|---|---|---|---|---|
| 1 | `order.service.ts` | Fix applied function imported in 3 places | Medium | Monitored |

---

### Previous Issues
| # | Issue | Created Task |

>>>
|---|---|---|
| 1 | `legacy.utils.ts` contains missing null check | Task #52 |

### General Evaluation
**Fix quality:** ⭐⭐⭐⭐ / ⭐⭐⭐⭐⭐
**Was the fix made?** Yes / No / Partially
**Regression risk:** Low / Medium / High
**Result:** ✅ Approved / ⚠️ Small fixes approved / ❌ Further fix required

[General comments and suggestions]
```

### 5.1 — Fix Commit

If a review-based fix was applied:

<!-- GENERATE: COMMIT_CONVENTION
Description: This section will be filled by Bootstrap with manifest data.
Required manifest fields: conventions.commit_language, conventions.commit_format
Example output:
### Commit Format (Bug Review Fixes)

```
fix: bug-review description — <fix_description>
```

**Language:** English
**Example:** `fix: bug-review description — missing null check fixed`
-->

> **RULE:** The fix commit should be separate. Do not modify the original fix commit.

---

## Mandatory Rules

### Invariant rules (apply to every command)

1. **Do not write config into Codebase** — Only `.claude/`, `CLAUDE.md`, `.mcp.json`, and `.claude-ignore` files can be created inside Agentbase. Creating a `.claude/` directory in the codebase, writing to `../Codebase/CLAUDE.md`, is PROHIBITED.
2. **Git runs only in Codebase** — All Git operations (commit, push, branch) must be performed inside the codebase. Git is NOT ALLOWED on Agentbase.
### 3. Codebase Readability and Configuration Separation

#### 1. **Codebase is readable; config is not written there**

- The codebase should be readable and maintainable (`src/`, `app/`, etc.). If necessary, it can be refactored.
- Configuration files (`.claude/`, `CLAUDE.md`) should not be part of the codebase.

### 2. **3-Agency Parallel Execution**

- All agencies should run in parallel without waiting for one another's results.

### 3. **1 Iteration Limit**

- No agency should execute more than once.

### 4. **Following Decision Trees**

- Each finding should apply false positives/diff codes or previous ordering.

### 5. **Prioritizing Fixes**

- Prioritize fixes based on whether they actually fix the issue or just correct a typo.

### 6. **Minimal Refactoring**

- Minimal refactoring is allowed, but excessive refactorings are discouraged (YASAK).

### 7. **Regression Testing Control**

- If a regression test exists for a fix, it must be run.

### 8. **Separate Commit for Review Changes**

- New commits should be made specifically for review changes; do not amend existing commits.

### 9. **Diff Boss Inspection**

- Diff inspection is required (BOSSA).

### 10. **Using Backlog CLI**

- Prior issues should be recorded using `backlog task create`.

### 11. **Codebase Path**

- All file access should come from the `../Codebase/` path.

### 12. **Security**

- If there are sensitive data in a diff, it is reported as CRITICAL.

<!-- GENERATE: SELF_REFRESH
Description: Command final step - self-refresh check. Bootstrap this marker.
Self-Refresh section changes the command's content. The command itself looks at the project's current state: small discrepancies Edit or big changes backlog task-i olarak rapor edilir.
-->

- [ ] **DB schema:** If a schema, model, column, or table changed, is there a migration file, did dry-run pass, and is the rollback/down script ready? Detail: `.claude/rules/db-migration-discipline.md`

# Bug Hunter — Autonomous Error Detector and Corrector

> Extracts the issue description, identifies the cause, corrects it, tests it, and commits.
> Usage: `/bug-hunter <issue_description>`, `/bug-hunter "item cannot be added to cart"`

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
  - `packages/shared/` — Shared types and utilities
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## Step 1 — Extracting the Issue Description

Extract the following information from the user's bug report:

| Field | Description | Example |
| --- | --- | --- |
| **Description** | What's happening? | "Item cannot be added to cart" |
| **Expected behavior** | What should happen? | "Item should be added to cart" |
| **Context** | Where is it happening? | "Web application, item detail page" |
| **Repeatability** | Is this happening every time? | "Every time" / "Sometimes" |
| **Error message** | Is there an error message? | "TypeError: Cannot read property..." |

> **RULE:** If the report is vague, do not ask a question. Analyze with the information you have.

>>>
## Step 2 — Investigation of Similar Errors

Have similar errors already been fixed? In the case of episodic memory:

1. Similar error descriptions
2. Same module/directory previous fixes
3. Repeated error patterns

If found:
- Reference to previous solution
- Why is this similar? Investigate further
- Is regression or a different error distinguished?

## Step 3 — Cause Analysis

### 3.1 — Narrow Down Scope

Starting from the error description:

1. **Which sub-project?** (API, Web, Mobile, Shared)
2. **Which module/feature?** (auth, orders, payments, ...)
3. **Which layer?** (UI, service, data, config)

Identify and read relevant files.

### 3.2 — Hypothesis Formation

Form hypotheses for most likely cause reasons (max 3):

```
## Hypotheses

### Hypothesis 1 (Most Likely)
- **Assumption:** [what is wrong here]
- **File:** [which file]

>>>
Here is the translated text:

- **Reason:** [Why is this being considered?]
- **Validation:** [How to validate it]

### Hypothesis 2
- ...

### Hypothesis 3
- ...
```

### 3.3 — Hypothesis Validation

Validate each hypothesis in sequence:

1. Read the relevant file
2. Inspect the code that needs validation
3. Follow the logical flow
4. Find the source of the error

**Validation Results:**
- ✅ Validated → Proceed to Step 4
- ❌ Invalid → Move on to the next hypothesis

### 3.4 — Hypothesis Limitation

> **RULE:** If all three hypotheses are attempted and none are validated, then **BLOCK**.
> Inform the user: "Three hypotheses were attempted, but no error was found. More debugging is required."

---

## Step 4 — Troubleshooting Plan

### 4.1 — Create a Plan

```
## Troubleshooting Plan

### What Went Wrong
[The reason for the issue]
```
### Correction

#### Adjustment
- **File:** [path]
- **Changes:** [what to do]
- **Reason:** [why this solution]

#### Side Effect Analysis
- Does this adjustment affect other areas?
- Do current tests fail after applying this change?
- Is there a performance impact?

---

#### Minimal Adjustment Principle (4.2)

> **RULE:** Only fix the error. Refactor, improve, or clean up only when necessary.
> The minimum change required to fix the error must be applied.

---

## Step 5 — Applying the Adjustment

1. Read the file that needs adjustment (even if it's already read)
2. Apply the adjustment
3. Verify the changes (syntax checking)

> **RULE:** Never consider "and also improve this" in the adjustment process. Only fix the error.

---

## Step 6 — Verification Checkpoint

### 6.1 — Writing a Test

Write a test to verify that the error is no longer repeated:

```
// This test verifies that [error_description] error is fixed
test('[error_scenario] works correctly again', () => {
  // The scenario that triggered the error
  // Expected correct behavior
});

>>>
```
### 6.2 — Running Tests

<!-- GENERATE: VERIFICATION_COMMANDS
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.subprojects, project.scripts, stack.test_framework
Example output:
Tests and verification commands for each subproject:

| Subproject | Command | Description |
|---|---|---|
| API | `cd ../Codebase/apps/api && npm run test` | Unit tests |
| API (lint) | `cd ../Codebase/apps/api && npm run lint` | ESLint checks |
| API (type) | `cd ../Codebase/apps/api && npx tsc --noEmit` | TypeScript type checking |
| Web | `cd ../Codebase/apps/web && npm run test` | Unit tests |
| Web (build) | `cd ../Codebase/apps/web && npm run build` | Build validation |
| Mobile | `cd ../Codebase/apps/mobile && npx tsc --noEmit` | TypeScript type checking |
-->

### 6.3 — Evaluating Test Results

- **All tests passed** → Proceed to Step 7
- **New test failed** → Review and revise (max 3 attempts)
- **Existing test failed** → Follow the existing error protocol:

**Existing Error Protocol:**
1. Revert changes (git stash)
2. Run the test — did it pass?
3. YES → Ignore the previous error, revert changes.
4. NO → The revision caused a current test to fail; review and revise.

---

## Step 7 — Commit

### 7.1 — Preparing Files

```bash
git add <revision_file> <test_file>

>>>
> **Rule:** Only update and add related test files. `git add .` IS PROHIBITED.

### 7.2 — Task Identification

Check if there is a task related to this issue in the backlog?

```
backlog task list --plain
```

Find the task by title or description. If found, reference it in the commit message.

### 7.3 — Commit Message

<!-- GENERATE: COMMIT_CONVENTION
Description: This section will be filled by Bootstrap with manifest data.
Required manifest fields: conventions.commit_language, conventions.commit_format
Example output:
### Commit Format (Bug Fix)

```
fix: <bug description>
```

If related task exists:

```
fix: <bug description> (#<task_id>)
```

**Language:** Turkish
**Example:** `fix: Adding product to cart error fixed (#34)`
-->
If the related task exists:
```
backlog task edit <id> -s "Done" --append-notes "[BUG FIX] <summary>"
```

### 8.2 — Creating a New Task

If the related task does not exist, record the done work:
```
backlog task create \
  "fix: <error_summary>" \
  --description "<detail>" \
  --priority "high" \
  --labels "bug" \
  -s "Done"
```
### Commit
`<hash>` — `<message>`

### Code Analysis

**Hypothesis Period:**
1. [Hypothesis 1] — [Result]
2. [Hypothesis 2] — [Result] (if applicable)

**Why this error occurred:**
[ Brief explanation — Future similar errors will be mitigated with this information]

---

## Mandatory Rules

### Invariant rules (apply to every command)

1. **Do not write config into Codebase** — Only `.claude/`, `CLAUDE.md`, `.mcp.json`, and `.claude-ignore` files should exist within the Agentbase directory. Creating a `.claude/` directory outside of the Codebase is forbidden.
2. **Git runs only in Codebase** — All Git operations (commit, push, branch) must be performed within the `../Codebase/` directory. The Agentbase does not have Git installed.
3. **Codebase is readable; config is not written there** — Project files (`src/`, `app/`, etc.) are readable and can be refactored as needed. Config files (`.claude/`, `CLAUDE.md`) should not be written in the Codebase.

1. **Identify the root cause** — Fix the root cause, not just mask it with a band-aid.
2. **Minimal fix** — Only fix the issue at hand. Refactor, improve, and clean up are not allowed.
3. **Autonomous operation** — Ask questions or analyze even if the error is unclear.
4. **Three hypothesis limit** — If three hypotheses fail, STOP and inform the user.
5. **Write tests** — Mandatory for every fix.
6. **Prioritize existing errors** — Refactor existing tests before introducing new ones.
7. **Only commit fix files** — `git add .` is forbidden.
8. **Reference related tasks** — If a task in the backlog is related to this error, reference it.
9. **Follow patterns** — Follow established patterns during the refactoring process.
10. **Use Backlog CLI** — Only use the Backlog CLI for task operations.
11. **Codebase path** — All file access should be through `../Codebase/`.
12. **Security** — Credential, secret, and `.env` values are never logged to the log.

<!-- GENERATE: SELF_REFRESH
Description: Command final step - self-refresh check. Bootstrap this marker for common use.
Self-Refresh section will replace this. The command will review its own content in the project's current state: small discrepancy Edit or large change backlog task is reported.

>>>
-->

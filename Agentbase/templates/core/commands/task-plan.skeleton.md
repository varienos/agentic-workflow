# Task Plan — High-Level Task Creator

> Analyzes the codebase deeply to create high-quality tasks.
> Usage: `/task-plan <request>`, `/task-plan "login page remember me add"`

**ULTRATHINK MODE — This command works with maximum comprehension depth.**

- TAKE YOUR TIME. Think before acting.
- Superficial analysis IS PROHIBITED. Verify assumptions and consider alternatives.
- If something appears "obvious", prove why it's obvious.
- If the first solution that comes to mind is likely incomplete, think of at least three alternative solutions.
- This command should be executed with the OPUS model. Using Sonnet for task-plan execution IS PROHIBITED.

---

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is filled by Bootstrap using manifest data.
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

## Step 0 — Ultrathink: Deep Comprehension Phase

**This phase IS MANDATORY. It cannot be skipped. The result will not be shown to the user, but it will guide subsequent steps.**

Codebase without touching ONCE, just think:

>>>
### 0.1 — Hypothesis Generation

Provide at least three distinct hypotheses:
- **Hypothesis A:** Most likely interpretation - The user probably meant this
- **Hypothesis B:** Alternative interpretation - Maybe there's a different pain point
- **Hypothesis C:** Least likely but possible interpretation - Something that could be seen from the perspective

For each hypothesis: Answer the question "What should you do if this is correct?"

### 0.2 — Assumption Testing

Extract and test assumptions for each hypothesis:
- What files are assumed to exist? (Not yet validated)
- Which patterns are assumed to be used? (Not yet read)
- What does the user actually want? (Is it your own comment?)
- What is the scope of this change? (Are undefined boundaries added?)

### 0.3 — Devil's Advocate

Choose the strongest hypothesis and try to poke holes in it:
- What is the biggest risk associated with this approach?
- In what situations would it be completely wrong?
- Is there a simpler solution that wouldn't unnecessarily complicate things?
- Are there any dependencies or side effects that could be seen from the outside?

### 0.4 — Edge Case Analysis

Systematically think through:
- Does this change affect the functionality of the system?
- What are the relevant stress scenarios?
- Which other files might be affected indirectly?
- Is there a difficult-to-test situation?

### 0.5 — Scope Decision

Make a clear decision and write it down in words:
- Is this a single task or should it be broken down into smaller tasks?
- Is the scope too broad? Should it be narrowed down?
- Is the scope too narrow? Should it be expanded?

>>>
- **CLOSING STATEMENT:** "Step 0 must be completed before proceeding to the next steps. Step 0's results determine the quality of subsequent steps."

---

## Step 1 — Request Analysis

> **DECISION POINT:** Are the assumptions made in Step 0 still valid? Before proceeding with this step, review the output of Step 0.

### 1.1 — Problem Resolution

Extract the following from the user's request:
- **What is being requested?** (e.g., improvement, enhancement, refactoring)
- **Where is it located?** (e.g., which sub-project, which module)
- **Why is it needed?** (e.g., user value, technical requirement)
- **Constraints** (if any): "only backend", "not required for mobile"

### 1.2 — Request Classification

| Type | Description | Example |
|---|---|---|
| **Feature** | New functionality | "Add a tracking page for orders" |
| **Enhancement** | Improvement of existing feature | "Add a 'remember me' option to the login page" |
| **Bug Fix** | Error correction | "Fix the payment page not refreshing after completion" |
| **Refactor** | Code improvement, same behavior | "Reorganize the Auth module" |
| **Infra** | Infrastructure, configuration | "Set up a CI/CD pipeline" |

---

## Step 2 — Deep Analysis

> **DECISION POINT:** Are the assumptions made in Step 0 still valid? Before proceeding with this step, review the output of a previous step. If new information has changed the assumptions, return to Step 0.

### 2.1 — File Detection

<!-- GENERATE: FILE_DETECTION_PATTERNS
Description: This section will be populated by Bootstrap using manifest data.
Required manifest fields: project.structure, stack.primary, project.subprojects
Example output:

>>>
### Current File Designs to be Analyzed:

| Code Type | Searchable Directories | File Designs |
|---|---|---|
| Controller/Route | `apps/api/src/modules/` | `*.controller.ts`, `*.router.ts` |
| Service/Logic | `apps/api/src/modules/` | `*.service.ts`, `*.usecase.ts` |
| Data Model | `apps/api/prisma/` | `schema.prisma` |
| DTO/Validation | `apps/api/src/modules/` | `*.dto.ts`, `*.validator.ts` |
| Frontend Page | `apps/web/src/app/` | `page.tsx`, `layout.tsx` |
| Frontend Component | `apps/web/src/components/` | `*.tsx` |
| Mobile Screen | `apps/mobile/src/screens/` | `*.screen.tsx` |
| Mobile Component | `apps/mobile/src/components/` | `*.tsx` |
| Shared Type | `packages/shared/src/` | `*.types.ts`, `*.interface.ts` |
| Config | project settings | `*.config.ts`, `*.config.js` |
| Test | `__tests__/`, `*.test.ts`, `*.spec.ts` | `*.test.ts`, `*.spec.ts` |
>>>
-->

### 2.2 — Current Code Analysis

In the relevant areas:
1. Read existing files
2. Understand used patterns (naming, structure, imports)
3. Identify similar functions to reference them
4. Detect protected modules (import chain)

### 2.3 — Effect Analysis

Determine affected areas of change:
- **Directly affected files** (to be changed)
- **Indirectly affected files** (importing, using)
- **Test files** (to be updated or created)
- **Configuration** (required env, route, permission)

**IMPORTANT:** List directly affected files as `affected_files` — this list will be used for task assignment and to detect parallel tasks.

---

## Step 3 — Application Plan

> **DECISION POINT:** Is the assumption still valid? Check once more before proceeding with this step. If new information changes assumptions, go back to Step 0.

>>>
### 3.1 — Cyclic Complexity Scoring

| Score | Level | Criteria |
| --- | --- | --- |
| 1-3 | **Simple** | 1-2 files, minimal changes, following existing pattern |
| 4-6 | **Moderate** | 3-5 files, new function/component, extending existing module |
| 7-8 | **Cyclic** | 6-10 files, new module, integration, migration |
| 9-10 | **Very Cyclic** | 10+ files, architectural changes, multiple sub-projects |

### 3.1b — Architecture Decision / ADR Check

Add ADR check if the task contains keywords like `architecture`, `design`, `layer`, `boundary`, `data flow`, `runtime`, `deploy`, `framework`, `integration`, `auth`, `security`, or `observability`. If the plan changes the existing layer boundary / public contract / cross-cutting policy, add ADR check.

ADR can be a new file or reference an existing one. For small refactor, typo, test addition, and fix for existing decision, adding a new ADR is sufficient. The task note should indicate whether ADR is required or not.

```
## Acceptance Criteria
- [ ] Architecture decision impact was evaluated; did ADR need to be added?
- [ ] If necessary, `backlog/decisions/YYYYMMDD-kebab-case-karar-basligi.md` ADR file was written or referenced the existing one
- [ ] If necessary, ADR minimum requirements were completed: context, decision, alternatives, consequences, rollback/revisit trigger, related tasks
```

### 3.2 — Model Recommendation Matrix

Which agent model should be used based on cyclic complexity:

| Cyclic Complexity | Recommended Model | Necessity |
| --- | --- | --- |
| 1-3 | Opus (minimum) | Planning quality-critical, minimal cyclic complexity requires deep analysis |
| 4-6 | Opus | Pattern tracking + decision-making, high-quality planning |
| 7-8 | Opus | Cyclic decision-making, complex file analysis required |
| 9-10 | Opus + Teammate | Distributed work, parallel application |

### 3.3 — Teammate Recommendation Matrix

Is a teammate necessary for the task?

| Situation | Teammate Recommendation |
| --- | --- |

>>>
### 3.4 — Scope Division Strategy

If the complexity is 7+, tasks are divided into subtasks:

**Division Criteria:**
1. **Project-based:** Each project (API, Web, Mobile) has separate tasks
2. **Layer-based:** Data model → Backend logic → API endpoint → Frontend
3. **Feature-based:** Each independent feature has separate tasks

**Dependency Order:**
```
1. DB/Model changes (most critical)
2. Backend logic implementation
3. API endpoints
4. Frontend/Mobile UI
5. Testing
6. Documentation
```

---

## Step 4 — Quality Control

> **CHECKPOINT:** Before proceeding to this step, verify if the assumptions made in Step 0 are still valid? Check the output of the previous step before moving on.

### 4.1 — Task Quality Control Checklist

Verify tasks before creating them:

- [ ] **Clear task title:** Does the person reading the task know what needs to be done?
- [ ] **Specific scope:** Are ACs specific or vague?
- [ ] **Applicability:** Is it applicable to the current codebase?
- [ ] **Test criteria:** Are test expectations defined in ACs?
- [ ] **Dependencies:** Are oncosules specified?
- [ ] **Scope:** Is the task reasonable for a single task, or should it be split?

>>>
### 4.2 — Anti-Pattern Prevention

Prevent the following anti-patterns:

- ❌ "System Improvement" — too broad, unachievable
- ❌ AC-only task — unclear completion criteria
- ❌ Overlapping independent tasks merged into a single task
- ❌ Applying application details to AC (what does it mean?)
- ❌ Unclear AC: "Faster" or "Better-looking" (how much?, what for?)

---

## Step 5 — Creating a Backlog Item

> **DECISION POINT:** Is the assumption still valid from Step 0? Before proceeding with this step, review the outcome of the previous step. If new information changes the assumptions, return to Step 0.

### 5.1 — Acceptance Criteria Templates

Use AC templates based on the type of task:

**Feature/Enhancement:**
```
## Acceptance Criteria
- [ ] [Functional criterion 1]
- [ ] [Functional criterion 2]
- [ ] [Edge case]
- [ ] Unit test must be written for [specificity]
- [ ] [Any integration test]
```

**Bug Fix:**
```
## Acceptance Criteria
- [ ] [Error condition resolved: scenario]
- [ ] [Side effect control]
- [ ] Test written to verify that the error is not repeated
```

**Refactor:**

>>>
## Acceptance Criteria
- [ ] Migration file created and will be committed with schema/model changes
- [ ] Dry-run/preview command executed and result written to task notes
- [ ] Rollback/down script or file path is ready
- [ ] Destructive flag validation performed; risk exists, backup/revert plan was written

<!-- AC Templates
Description: This section will be filled by Bootstrap with manifest data.
Required manifest fields: stack.primary, project.conventions, project.subprojects
Example output:
**Stack-Specific AC Examples:**

API Endpoint for:
```
- [ ] `POST /api/v1/orders` endpoint created
- [ ] Request body DTO is validated
- [ ] Unauthorized access returns 401
- [ ] Successful operation returns 201 + order object
- [ ] Unit test: service layer test should be performed
- [ ] E2E test: endpoint-to-endpoint test should be performed
```

Frontend Page for:
```
- [ ] `/orders` page created
- [ ] Implemented as Server Component
>>>
### 5.2 — Task Creation

#### Backlog Task Create

```markdown
backlog task create \
  "<title>" \
  --description "<detailed explanation>" \
  --priority "<high|medium|low>" \
  --labels "<feature|bug|refactor|infra>"
```

**Description**

*   **Reason for this task**: [Insert reason]
*   **Affected Areas**: 
    -   [List of files/directories affected]
*   **Affected Files**:
    -   [List of directly affected files, as per Step 2.3 — conflict resolution]
        -   `api/src/controllers/auth.controller.ts`
        -   `api/src/middleware/auth.ts`
        -   `api/src/routes/auth.routes.ts`
## Application Notes
- Reference: [similar existing implementation]
- Warning: [potential risks]
- Suggestion: [model/teammate suggestion]

## Acceptance Criteria
- [ ] [AC 1]
- [ ] [AC 2]
- [ ] [Test criteria]

**RULE:** The `Affected Files` section is MANDATORY. This section must be provided for task-conductor to detect issues.
**RULE:** File paths must be relative to the codebase (e.g., `api/src/...`, `mobile/app/...`).

### 5.3 — Multi-Task (Split Scope)

If a scope is split, create separate tasks for each sub-task and specify dependency:

```
backlog task create "feat: Order modeli ve migration (#ana_gorev)" --priority "high" --labels "feature"
backlog task create "feat: Order service katmani (#ana_gorev)" --priority "high" --labels "feature"
backlog task create "feat: Order API endpoint'leri (#ana_gorev)" --priority "medium" --labels "feature"
backlog task create "feat: Order listesi frontend sayfasi (#ana_gorev)" --priority "medium" --labels "feature"
```

---

## Step 6 — User Report

> **DECISION POINT:** Is the assumption still valid from Step 0? Check the outcome of the previous step before proceeding to this step. If new information changes the assumptions, go back to Step 0.

```
## Task Plan Report

### Request
[original user request]

### Analysis Summary
- **Type:** Feature / Enhancement / Bug Fix / Refactor
- **Complexity:** <score>/10 — <level>

>>>
### Affected Projects
| List |
| --- |

### Estimated File Count
<Number>

### Created Tasks
| # | ID | Title | Priority | Dependence |
|---|---|---|---|---|
| 1 | #45 | Order model and migration | High | — |
| 2 | #46 | Order service layer | High | #45 |
| 3 | #47 | Order API endpoints | Medium | #46 |
| 4 | #48 | Order list frontend | Medium | #47 |

### Recommendations
- **Model:** <Sonnet/Opus> recommended
- **Teammate:** <required/optional/not required>
- **Dependency Chart:** [dependency chart in order of dependence]

### Reference Files
[files to be analyzed]
```

---

## Mandatory Rules

### Invariant rules (apply to every command)

1. **Do not write config into Codebase** — Only `.claude/`, `CLAUDE.md`, `.mcp.json`, and `.claude-ignore` files are allowed in the Agentbase directory. Writing `.claude/` directory or `../Codebase/CLAUDE.md` is NOT ALLOWED.
2. **Git runs only in Codebase** — All Git operations (commit, push, branch) should be performed within the `../Codebase/` directory. The Agentbase does not have Git.
3. **Codebase is readable; config is not written there** — Project files (`src/`, `app/`, etc.) are readable and can be modified if necessary. Config files (`.claude/`, `CLAUDE.md`) should NOT be written in the Codebase.

1. **Analyze once** — Create tasks without reading the Codebase first. Understand the existing code.
2. **Specify AC clearly** — "Improve", "Refactor" like vague criteria are NOT ALLOWED. They must be specific and measurable.
3. **Test criterion is mandatory** — Each task should have at least one test criterion.
4. **Scope control** — Avoid creating too broad tasks. Too many tasks can lead to duplication.
5. **Dependence specify clearly** — Clearly specify the dependence between tasks.
6. **Refer to existing pattern** — If a similar implementation exists, refer to it in the task description.
7. **Avoid anti-patterns** — Avoid creating vague, unmeasurable, or too broad tasks.
8. **Use Backlog CLI** — Create tasks only using `backlog task create`.
9. **Model/Teammate recommendation** — Specify an appropriate model and teammate for each task.
10. **Codebase path** — All file analysis should be performed within the `../Codebase/` directory.
<!-- GENERATE: SELF_REFRESH
Description: Last step - self-refresh check. Common to Bootstrap
Self-Refresh section changes the command. The command looks through the project's content:
small inconsistency Edit, large change backlog
is reported as a task.
-->

### 3.1b — Architecture decision / ADR check

Task metninde `schema`, `migration`, `model`, `kolon`, `tablo`, `column`, `table`, `database` kelimeleri geciyorsa veya manifest'te ORM/database tespiti bu taskla iliskiliyse asagidaki AC'leri otomatik ekle. Detay kural: `.claude/rules/db-migration-discipline.md`.

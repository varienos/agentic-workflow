# Task Master — Backlog Priority Ranker

> Evaluates all backlog tasks with 4-dimension scoring and builds a priority order.
> Usage: `/task-master`

---

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is filled by Bootstrap from manifest data.
Required manifest fields: project.description, stack.primary
Example output:
## Project Context
- **Project:** E-commerce platform (Next.js + NestJS + React Native)
- **Stack:** TypeScript, Prisma, PostgreSQL, Expo
- Keep project context in mind while scoring.
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## Step 1 — Collect Tasks

```
backlog task list --plain
```

List all tasks. For each task extract:
- ID
- Title
- Status (To Do, In Progress, Done)
- Priority (if any)
- Labels (if any)
- Dependencies (if any)

> **RULE:** SKIP tasks in "Done" status. Score only "To Do" and "In Progress" tasks.

To read each task in detail:
```
backlog task <id> --plain
```

---

## Step 2 — 4-Dimension Scoring

Evaluate each task on 4 dimensions (1-10):

### 2.1 — Impact — Weight: x3

How much value does the task add to the project when done?

| Score | Meaning |
|---|---|
| 9-10 | Critical business function; project does not work without it |
| 7-8 | Important feature; seriously affects user experience |
| 5-6 | Useful improvement; creates a visible difference |
| 3-4 | Small improvement; "nice to have" |
| 1-2 | Cosmetic; minimal impact |

### 2.2 — Risk — Weight: x2.5

What happens if this task is not done?

| Score | Meaning |
|---|---|
| 9-10 | Security hole, data-loss risk, legal issue |
| 7-8 | Performance problem, user-churn risk |
| 5-6 | Technical debt buildup, maintenance difficulty |
| 3-4 | Small technical debt; may become a problem later |
| 1-2 | No risk; fully optional |

### 2.3 — Dependency — Weight: x2

Do other tasks depend on this?

| Score | Meaning |
|---|---|
| 9-10 | 5+ tasks depend on this; blocker |
| 7-8 | 3-4 tasks depend |
| 5-6 | 1-2 tasks depend |
| 3-4 | Indirect dependency exists |
| 1-2 | Independent; affects nothing |

### 2.4 — Complexity — Weight: x1.5 (INVERSE)

How easy is the task? (Easy tasks = high score, quick win)

| Score | Meaning |
|---|---|
| 9-10 | Very simple; done in 30 min |
| 7-8 | Simple; 1-2 hours |
| 5-6 | Medium; half a day |
| 3-4 | Complex; 1 day |
| 1-2 | Very complex; multiple days |

### 2.5 — Total Score Calculation

```
Total = (Impact x 3) + (Risk x 2.5) + (Dependency x 2) + (Complexity x 1.5)
Maximum = (10 x 3) + (10 x 2.5) + (10 x 2) + (10 x 1.5) = 90
```

---

## Step 3 — Dependency Analysis

### 3.1 — Dependency Graph

For each task:
1. Are there references to other tasks in ACs or the description?
2. Are there tasks that will affect the same files? (file conflict)
3. Are there tasks that require logical ordering? (e.g. DB schema → API → Frontend)

### 3.2 — Blocker Detection

- Task A → depends on Task B → A cannot start until B is done
- If there is a cyclic dependency: **WARN** and notify the user
- Add a +5 bonus to blocker task scores

---

## Step 4 — Memory Check

Was similar scoring done before? Search episodic memory:
- Priority reports created in the past
- Priorities the user changed manually (respect these)

> **RULE:** If the user previously prioritized a task as "MANUAL", leave that task outside the calculation and list it separately at the end of the report.

> **HOW IT IS TRIGGERED:** In a previous session the user must have given an instruction like "prioritize task X as MANUAL" or "always put task X at the top without scoring", and that must be recorded in memory. There is no automatic detection — only user instructions in memory trigger the MANUAL phase.

---

## Step 5 — Build Report

### 5.1 — Top 10 Table

```
## Backlog Priority Report

| Rank | ID | Title | Impact | Risk | Dep. | Comp. | TOTAL | Phase |
|---|---|---|---|---|---|---|---|---|
| 1 | #12 | User auth system | 9 | 9 | 8 | 7 | 76.0 | Phase 1 |
| 2 | #8 | API rate limiting | 8 | 8 | 5 | 8 | 66.0 | Phase 1 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... |
```

### 5.2 — Phase Assignment

| Phase | Score Range | Meaning |
|---|---|---|
| **Phase 1 — Critical** | 65+ | Do immediately |
| **Phase 2 — Important** | 45-64 | Do soon |
| **Phase 3 — Planned** | 25-44 | Can wait in queue |
| **MANUAL** | — | Prioritized by the user |

### 5.3 — Dependency Warnings

```
### Dependency Warnings
- ⚠️ Task #12 → cannot start until Task #5 is done
- ⚠️ Task #8 and Task #15 affect the same files (conflict risk)
```

### 5.4 — Suggestions

```
### Suggestions
- **Start now:** Task #12 (highest score, blocker)
- **Quick win:** Task #22 (high impact, low complexity)
- **Caution:** Task #8 and #15 should be planned together (file conflict)
```

---

## Required Rules

### Invariant rules (apply to every command)

1. **Do not write config into Codebase** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` files are created ONLY inside Agentbase. Creating a `.claude/` directory inside Codebase or writing `../Codebase/CLAUDE.md` is FORBIDDEN.
2. **Git runs only in Codebase** — All git operations (commit, push, branch) run inside `../Codebase/`. There is NO git in Agentbase.
3. **Codebase is readable; config is not written there** — Project files (`src/`, `app/`, etc.) can be read and, if the task requires it, edited. Config files (`.claude/`, `CLAUDE.md`) cannot be written inside Codebase.

1. **Score all "To Do" and "In Progress" tasks** — Skip none.
2. **Scoring must be objective** — Score by project needs, not personal preference.
3. **Dependency analysis is critical** — Detect blocker tasks and reflect them in the score.
4. **Do not touch MANUAL tasks** — Preserve tasks the user prioritized.
5. **Warn on cyclic dependency** — If detected, notify the user.
6. **Score calculation must be consistent** — Do not change the formula; same weights on every task.
7. **Assign phases by score range** — Do not assign subjectively.
8. **Suggest quick wins** — Highlight low-complexity + high-impact tasks.
9. **Use the Backlog CLI** — Read tasks ONLY with the `backlog` CLI. Do not read files by hand.
10. **Present the report to the user** — Report results in table format, readable.
11. **Codebase path** — For file-conflict analysis, check files via `../Codebase/`.

<!-- GENERATE: SELF_REFRESH
Description: Command final step - self-refresh check. Bootstrap replaces this marker
with the shared Self-Refresh section. The command reviews its own text against the
project reality: small mismatches via Edit, large changes reported as a backlog task.
-->

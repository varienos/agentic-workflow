# Task Conductor — Plan-First Faz Orkestratoru

> Backlog'daki birden fazla gorevi once faz planina donusturur; yalnizca acik `run` modunda uygular.
> Kullanim: `/task-conductor plan top 5`, `/task-conductor run top 5 --max-parallel 2`, `/task-conductor resume`, `/task-conductor status`, `/task-conductor abort`

---

## Basic Usage

1. **The default mode is PLAN.** When the user does not type `run`, the code will use the backlog's status, state, or change.
2. **`run` command requires explicit intent.** Old commands (`top 5`, `3,5,8`, `keyword auth`) should be used with a comment like `/task-conductor plan ...`.
3. **`run all` runs only with `--confirm-all`.** Running all tasks at once is a high-risk operation; if the flag is not present, create a plan and stop.
4. **Parallel writes only with an isolated worktree/branch.** If isolation is missing or cannot be verified, process tasks in the same phase sequentially.
5. **Scoring agreement is identical to `/task-master`.** When formulas or weights change, both commands should be updated together.
6. **Resume only continues from conductor state.** State does not exist or schema is incompatible; start a new run and report to the user.

---

## Command Usage

| Command | Example | Behavior |
|---|---|---|
| **Plan Top X** | `plan top 5` | Creates a plan for the top 5 highest-scoring tasks, stops execution |
| **Plan All** | `plan all` | Plans and runs all tasks, with confirmation flag |
| **Plan Manuel ID** | `plan 3,5,8` | Creates a plan for specific tasks by ID |
| **Plan Keyword** | `plan keyword auth` | Plans tasks using a keyword-based authentication method |
| **Run Top X** | `run top 5 --max-parallel 2` | Runs the top 5 highest-scoring tasks with up to 2 parallel executions |
| **Run All** | `run all --confirm-all` | Runs all tasks without confirmation flag, high-risk operation |
| **Run Manuel ID** | `run 3,5,8` | Runs specific tasks by ID according to the plan |
| **Run Keyword** | `run keyword auth` | Runs tasks using a keyword-based authentication method according to the plan |
| **Resume** | `resume` | Continues from the last saved state in `/conductor-state.json` |
| **Status** | `status` | Reads the current status and lock files, does not modify anything |
| **Abort** | `abort` | Marks the active state as aborted, releases the lock, and does not modify the code |

### Backward Compatibility

```
/task-conductor top 5        -> /task-conductor plan top 5
/task-conductor all          -> /task-conductor plan all
/task-conductor 3,5,8        -> /task-conductor plan 3,5,8
```
### Task Collection and Scoring

Collect tasks and score them:

```bash
cd ../Codebase && git status --porcelain
```

- If the output is **OK**, proceed.
- If the output is **DIFF**, **ADD**, or **RENAME**, **STOP**, inform the user:
  ```
  There are unsaved changes in the working directory.
  Task Conductor run/resume was not started.
  Please commit or stash these changes.
  ```

Additional checks:

1. If `.claude/tracking/conductor.lock` exists but is not for an active run, **STOP**, and suggest checking `status`.
2. If `--max-parallel` is not specified, assume it to be `1`.
3. If `--max-parallel > 1`, verify that the worktree/branch is isolated; if not, set `max_parallel=1` and continue in a linear fashion, logging this issue.
4. For running all tasks, if `--confirm-all` is not specified, run anyway, create a plan, and log the result.
### 1.1 — Task Collection

```plain
backlog task list --plain
```

Filter tasks by mode:
- `top X`: Select top X uncompleted tasks scored, with the highest score selected
- `all`: Select all uncompleted tasks
- `3,5,8`: Only select tasks with specified IDs
- `keyword auth`: If necessary, use `backlog search "auth" --type task --plain` to find tasks and then use `backlog task list --plain` for title/summary matching

> **RULE:** Skip completed tasks. Uncompleted tasks are marked as `needs_decision` in the plan; if no one takes over the task, it will not be automated.

### 1.2 — 4-Dimensional Scoring

Evaluate each task with the same 4-dimensional score (`1-10` range):

**Effect (Impact) — Severity: x3**
| Score | Meaning |
|---|---|
| 9-10 | Critical function impact |
| 7-8 | Important characteristic |
| 5-6 | Beneficial improvement |
| 3-4 | Small improvement |
| 1-2 | Cosmetic |

**Risk (Severity) — Severity: x2.5**
| Score | Meaning |
|---|---|
| 9-10 | Security breach, data loss |
| 7-8 | Performance, user loss |
| 5-6 | Technical debt |
| 3-4 | Small technical debt |
| 1-2 | No risk |

**Dependency (Severity) — Severity: x2**
| Score | Meaning |
|---|---|
```
>>>
| 9-10 | Highly Unstructured |
| 7-8 | Moderately Unstructured |
| 5-6 | Slightly Unstructured |
| 3-4 | Structured with Dependencies |
| 1-2 | Independent |

**Complexity (Agility) — Weight: x1.5 (TERS)**
| Points | Meaning |
|---|---|
| 9-10 | Very Simple |
| 7-8 | Simple |
| 5-6 | Average |
| 3-4 | Complex |
| 1-2 | Very Complex |

```
Total = (Effectiveness x 3) + (Risk x 2.5) + (Dependency x 2) + (Complexity x 1.5)
Maximum = 90
```

> **RULE:** This formula will not drift with `/task-master`. If the weights change, this will be updated in the same commit.

---

## Step 2 — Faz Assignment

### 2.1 — Point-Based Faz

| Faz | Points Range | Mod |
|---|---|---|
| **Faz 1 — Critical** | 65+ | Generally sequential |
| **Faz 2 — Important** | 45-64 | Parallel possible |
| **Faz 3 — Planned** | 25-44 | Parallel possible |

### 2.2 — Conflict Control (Conflict Graph)

Are there conflicts between tasks assigned to the same faz? **Layer 1: Resolution** — Detect conflict from run-time ONCE.

#### Affected Files Reading


>>>
### Workflow Process

1. For each task, read the `## Affected Files` section from the output of `backlog task <id> --plain`.
2. If this section does not exist, extract a title and an estimated file list from AC analysis.
3. If the estimated list is unreliable, mark the task as `unknown_files=true`.
4. Store the file lists in the task-file matrix.

#### Conflict Graph Creation

```
Tasks: A, B, C, D
A.affected_files = [auth.controller.ts, auth.routes.ts]
B.affected_files = [auth.controller.ts, user.service.ts]
C.affected_files = [order.service.ts, order.routes.ts]
D.affected_files = [user.service.ts, user.routes.ts]

Conflict graph:
  A ←→ B  (auth.controller.ts — CAKISMA)
  B ←→ D  (user.service.ts — CAKISMA)
  A ←→ C  (no conflict — possible parallel)
  C ←→ D  (no conflict — possible parallel)

Result:
  Group 1 (sequential): A → B → D  (connected conflict chain)
  Group 2 (parallel): C           (no conflicts)
```

#### Decision Matrix

| Conflict Status | Decision | Necessity |
|---|---|---|
| No shared files | Parallel process | Zero risk of collision |
| Shared files, different sections | Sequential process | Risk of collision in same file |
| Shared files, conflict chain | Chain sequential, parallel otherwise | Conflicting tasks affect each other |

#### Conflict Matrix Content

```
## Conflict Matrix
| Task A | Task B | Shared Files | Decision |
|---|---|---|---|
| #12 | #15 | `user.service.ts` | Sequential process |

>>> 
```
| #12 | #22 | (no) | Can be Parallel |
| #15 | #22 | (no) | Can be Parallel |

Conflict Chains:
  Chain 1: #12 → #15 (sequential)
Unbound Tasks: #22 (parallel)

**RULE:** Conflict chain tasks are always done sequentially. The order of priority in the chain determines the order.
**RULE:** Unbound tasks without an affected files list are done sequentially with unknown conflict risk — sequential execution is assumed.
**RULE:** Plan output matrix is mandatory when there's a plan cut. Analysis is re-run before running.

### 2.3 — Plan Cut

`plan` mode stops here and provides the following report:

```
## Task Conductor Plan

Mode: top 5
Selected tasks: #12, #8, #22
Run order: /task-conductor run top 5 --max-parallel 2

### Phases
| Phase | Tasks | Mode | Required |
|---|---|---|---|
| Phase 1 | #12, #8 | Sequential | Critical + shared auth files |
| Phase 2 | #22 | Parallelizable | No conflict |

### Risk Windows
- #15 In Progress: state is unknown, decision required for run
- #30 Affected Files no: sequential execution assumed
```

**RULE:** Plan mode does not write state, changes backlog status, or commit.

---

## Step 3 — File System Management of State


>>>
### 3.1 — Create the Conductor State File

Create or update the `.claude/tracking/conductor-state.json` file only when in `run` or `resume` mode:

```json
{
  "schema_version": 2,
  "session_id": "<uuid>",
  "started_at": "<timestamp>",
  "command_mode": "run",
  "selection": {
    "type": "<top|all|manual|keyword>",
    "value": "<5|3,5,8|auth|null>",
    "confirm_all": false
  },
  "max_parallel": 1,
  "lock_path": ".claude/tracking/conductor.lock",
  "phases": [
    {
      "phase": 1,
      "label": "Critical",
      "execution_mode": "sequential",
      "status": "pending",
      "consecutive_errors": 0,
      "tasks": [
        {
          "id": 12,
          "title": "...",
          "score": 76.0,
          "affected_files": ["apps/api/src/auth.controller.ts"],
          "unknown_files": false,
          "status": "pending",
          "started_at": null,
          "completed_at": null,
          "commit_hash": null,
          "worktree_path": null,
          "branch": null,
          "error": null
        }
      ]
    }
}
```
json
{
  "current_phase": 1,
  "current_task": null,
  "total_tasks": 10,
  "completed_tasks": 0,
  "failed_tasks": 0,
  "updated_at": "<timestamp>"
}
### 4.1 — Initialization of Phases

For each phase:
1. Read the responsibilities from the state.
2. Revalidate the checksum matrix and dirty state.
3. Determine the execution mode (sequential or parallel).
4. Execute the tasks.
5. Validate summary and uniqueness at the end.

### 4.2 — Parallel Execution

Parallel execution is possible for non-critical tasks under the following conditions:

1. The `--max-parallel` value is 2 or higher.
2. The task's `Affected Files` list is trusted, and there are no shared files.
3. Each task can have a separate isolated worktree/branch.
4. Teammate runtime supports file sensitivity and commit hash reporting.

**File Diagram:**
```
Task #8  → [rate-limiter.ts, api.module.ts]
Task #22 → [user.controller.ts, user.service.ts]
Task #30 → [dashboard.tsx, stats.api.ts]
```

**Validation Graph:**
- #8 and #22: no validation → parallel
- #22 and #30: no validation → parallel
- Up to three tasks can be executed in parallel

**Teammate Spawn:**

For each parallel task, spawn a teammate with an isolated branch/worktree:

```
## Teammate: Task #<id> — <title>

### Task Details
[backlog task excerpt]

>>>
```
### Target Files
<file list - only these files can be modified>

### Rules
1. Only the listed files should be sorted.
2. Isolated branch/worktree is required for parallel writes.
3. Commit after completing a task.
4. Report test results and commit hash.

> **RULE:** Parallel teammates are NOT allowed to write to the same file.
> **RULE:** Parallel writes only with an isolated worktree/branch. If isolation is missing, fall back to `sequential` mode.
> **RULE:** Teammate should report commit hash after completing a task.
> **RULE:** Merge or cherry-pick before trial merge or equality check. If conflicts arise, mark the failed operation and perform automatic risk-free conflict resolution.

### 4.3 — Parallel Mode

Parallel operations follow the `task-hunter` logic:

1. `backlog task <id> --plain` → read the task
2. `backlog task edit <id> -s "In Progress"` → assign
3. Filter, read, and understand files
4. Apply
5. Test (lock)
6. Commit
7. `backlog task edit <id> -s "Done"` → complete
8. Update the state file

### 4.3.1 — Error Handling

In case of an error:
1. Mark the operation as `failed`, report the error to the state and log.
2. Increment the `consecutive_errors` counter.
3. Reset the counter after a successful operation.
4. If `consecutive_errors >= 3`, mark the phase as `blocked`, stop the run, and report to the user.

> **RULE:** If there are three consecutive errors in a phase, STOP. Do not proceed to the next task or phase.
> **RULE:** If an error occurs in a phase, proceed automatically to the next phase; report the error, update the state, and wait for `resume`/continue permission.
### 4.4 — Verification Gate (For Each Task)

#### Verification Commands

This section is populated by Bootstrap using manifest fields.

**Required manifest fields:** `project.subprojects`, `project.scripts`, `stack.test_framework`

**Example output:**

Verification commands for each sub-project:

| Sub-Project | Command | Description |
| --- | --- | --- |
| API | `cd ../Codebase/apps/api && npm run test` | Jest unit tests |
| API (lint) | `cd ../Codebase/apps/api && npm run lint` | ESLint validation |
| API (type) | `cd ../Codebase/apps/api && npx tsc --noEmit` | TypeScript type checking |
| Web | `cd ../Codebase/apps/web && npm run build` | Build verification |
| Mobile | `cd ../Codebase/apps/mobile && npx tsc --noEmit` | TypeScript type checking |

### 4.5 — Commit Conventions

#### Commit Convention

This section is populated by Bootstrap using manifest fields.

**Required manifest fields:** `conventions.commit_language`, `conventions.commit_format`

>>>
### Commit Format

```
prefix: Description (#<task_id>)
```

**Prefix Map:**
| Prefix | Usage |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code refactoring |
| `test` | Adding or fixing tests |
| `docs` | Documentation |
| `chore` | Maintenance, configuration |

**Language:** English
**Example:** `feat: User registration endpoint added (#12)`
-->

---

## Step 5 — Final Review

After each commit:

### 5.1 — Commit Summary

```
## Commit <N> Completed

### Completed Tasks
| ID | Title | Commit Hash | Time |
|---|---|---|---|
| #12 | Authentication system | `abc123` | 15 minutes |
| #8 | Rate limiting | `def456` | 8 minutes |

### Failed Tasks
| ID | Title | Error |
```

>>>
### Full Control

Faz End:
1. Are all commits successful?
2. Is the state file updated?
3. Do backlog statuses match with commit?
4. Have parallel branch/worktree results been integrated into the main target?
5. Is preparation ready for the next phase?

### Full Phase Transition

- If a failed task: inform the user, update the state, and show the `resume` sequence
- All tasks successful → automatic transition to the next phase

---

## Step 6 — Final Report

When all phases are completed:

```
## Conductor Report

### General Summary
- **Total Task:** <number>
- **Completed:** <number>
- **Failed:** <number>
- **Total Time:** <time>

### Phase Details
| Phase | Number of Tasks | Completed | Failed | Mode |
|---|---|---|---|---|
| Phase 1 | 3 | 3 | 0 | Sequential |
| Phase 2 | 4 | 4 | 0 | Parallel |
| Phase 3 | 3 | 2 | 1 | Parallel |

>>>
### Commit History
| Commit | Message | Task |
|---|---|---|
| `abc123` | feat: auth system (#12) | #12 |
| `def456` | feat: rate limiting (#8) | #8 |

### Failed Tasks (Details)
| ID | Error | Recommended Action |
|---|---|---|
| #30 | Test error: ... | Manual investigation required |

### Suggestions
- [varsa next steps]

---

## Mandatory Rules

### Invariant rules (apply to every command)

1. **Do not write config into Codebase** — Only `.claude/`, `CLAUDE.md`, `.mcp.json`, and `.claude-ignore` files are allowed within the Agentbase. Creating a `.claude/` directory outside of the Codebase, writing to `../Codebase/CLAUDE.md`, or modifying `../Codebase/` is NOT ALLOWED.
2. **Git runs only in Codebase** — All Git operations (commit, push, branch) must be performed within the Codebase directory. The Agentbase does not have Git installed.
3. **Codebase is readable; config is not written there** — Project files (`src/`, `app/`, etc.) are readable and editable. Config files (`.claude/`, `CLAUDE.md`) MUST NOT be written within the Codebase.

1. **The default mode is PLAN** — No changes will be made unless explicitly stated as `run`.
2. **Run dirty state control** — If a commit has not been made to the Codebase, any changes must be resumed.
3. **`run all` lock** — The `run all` command can only be executed with `--confirm-all`.
4. **State file is mandatory** — Every operation must write to a state file. In case of a crash, the `resume` command must be used.
5. **Schema control** — If `schema_version` is out of sync, automatic resume will be performed.
6. **Sequence order is preserved** — No sequence can be skipped without explicit permission.
7. **Parallel isolation required** — Parallel writes are only allowed with an isolated worktree/branch.
8. **Parallel operations do not collide** — Two teammates cannot access the same file simultaneously.
9. **Each task has a lock** — Test must be completed before committing changes.
10. **Error limit** — If more than 3+ consecutive errors occur in a phase, the operation will be halted and notified to the user.
11. **Phase error next phase lock** — If an error occurs in a phase, the next phase will automatically resume; report + resume sequence is provided.
12. **Teammate boundaries** — File list, branch/worktree, expected output, and rules.
13. **Commit only work files** — `git add .` is NOT ALLOWED.
14. **Backlog CLI usage** — Only the CLI can update task statuses.
15. **Resume mode only from state** — The `conductor-state.json` file must exist for resume to be successful.
### 16. Read-only Status — The `status` field does not change any file or backlog status.

### 17. Controlled Abort — Closes the `abort` state and releases the lock; does not modify the code.

### 18. Mandatory Merge Matrix — File merge analysis must be performed before entering parallel mode.

### 19. Review at End of Phase — Generates a summary report after each phase.

### 20. Codebase Path — All project files are accessible from `../Codebase/`.

### 21. Read Before Write — Always read a file before modifying it.

### 22. Follow Pattern — Follow the existing code structure and follow new conventions.

### 23. Security — `.env`, credentials, and secrets should never be committed to version control.

### 24. Autonomous Execution — Ask the user for input when AC is set to In Progress or in a non-error state.

Invariant rules:

1. **Do not write config into Codebase** — create `.claude/`, `CLAUDE.md`, `.mcp.json`, and `.claude-ignore` only inside Agentbase.
2. **Git runs only in Codebase** — product git operations stay in `../Codebase/`.
3. **Codebase is readable; config is not written there**.

The default mode is PLAN. `run all` runs only with `--confirm-all`. Parallel writes only with an isolated worktree/branch.

Commit completed non-sensitive work in the same session without asking. Do not push unless the user asks.

<!-- GENERATE: SELF_REFRESH
Last step. Compare this command with what the run observed.
-->

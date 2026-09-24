# Task Plan Review — 3+1 Agent Plan Inspection

> Inspect backlog tasks that are not implemented yet. Check the plan against the current codebase and apply the needed corrections on the task.
> Usage: `/task-plan-review <task-id>`, `/task-plan-review task-123 task-456`, `/task-plan-review --status "To Do"`
> **Divider:** This reviews an unimplemented plan. For delivered code, use `/task-review`.

**Purpose:** Review plans created by `/task-plan` before `/task-hunter` implements them. Do not write product code. Correct plan quality, file references, acceptance checks, and scope.

**A blind review is forbidden.** Do not spawn agents, edit the plan, or raise the review count until the validity gate in section 1.4 passes.

**Several reviews of the same plan are allowed.** The goal is the best plan, not a single pass. Earlier `## Plan Review` notes are audit history. They are not a reason to skip this pass. Each finished pass writes a `[N]` counter at the start of the title (Step 4.4).

**No model pin.** The active host chooses the model. Subagents inherit it. Claude is one host, not the product.

---

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is filled by Bootstrap using manifest data.
Required manifest fields: project.description, stack.primary, project.structure, project.subprojects
Example output:
## Project Context
- **Project:** Example application
- **Stack:** the stack named in the manifest
- **Code:** `../Codebase/`
- **Workflow config:** Agentbase
- **Backlog:** `backlog/tasks/` — edit only through the `backlog` CLI
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

Code relationship: search, read, and the shell. Do not assume a product layout. Use the paths in the manifest and in `../Codebase/`.

---

## Step 1 — Load the task

### 1.1 — Resolve the argument

| Input | Behavior |
|---|---|
| `task-123` / `TASK-123` / `123` | One task |
| Several ids | Review them in order. Independent tasks may be loaded together |
| `--status "To Do"` | `backlog task list -s "To Do"`. Show the list. Continue after confirmation, or with `--all` |
| Empty | List the latest 5 `To Do` tasks and ask which ones to review |

### 1.2 — Read the task

```
backlog task <id> --plain
```

Extract title, description, acceptance checks, plan, notes, references, affected files, dependencies, labels, priority, and status.

### 1.3 — Pre-filter

| State | Behavior |
|---|---|
| `Done` and delivery evidence exists (notes contain `[COMMITS] delivery`, or `git log --grep <TASK-N>` shows a commit) | **STOP and redirect.** One line: `Delivery exists; use /task-review TASK-N for the code review.` A silent skip is forbidden |
| `Done` and the user explicitly asked for an archive plan review | Continue the plan review. Do not redirect to `/task-review` |
| `Done` and no delivery evidence | Skip. One line: this task is not a plan-review target |
| `In Progress` and a code commit exists | Suggest `/task-review`. Continue the plan review only if the user asks |
| Description or plan is empty | Stop, or ask for a plan to be written. There is nothing to review |
| An existing `## Plan Review` note | Do not skip. That note is audit history. This pass is a new review |

> **Rule:** Do not hand-edit `backlog/tasks/*.md`. Use `backlog task edit`.
> **Rule:** Do not refuse a second pass because an earlier review exists.
> **Rule:** On Done plus delivery evidence, the `/task-review TASK-N` redirect is required unless the user asked for an archive plan review.

### 1.4 — Validity gate (required)

Before Step 2, and before any edit to the task, check that the task is still valid. Do not treat the task text as proof. The codebase, the project docs, and the backlog must support it.

| Question | Typical evidence |
|---|---|
| Does the problem still exist? | Search and read. Is the fix already present? |
| Is the task obsolete, superseded, or a duplicate? | Done and In Progress tasks, commits, and current behavior |
| Is the premise true? | Does the surface the task names actually exist? |
| Does it conflict with a project rule? | Rules under `.claude/rules/` and the manifest |
| Does a dependency block a meaningful plan? | The state of the dependent task and the contract it produces |
| Can plan drift be fixed? | The goal is valid, and only paths, checks, or references are stale |

**Decision:**

| Result | Behavior |
|---|---|
| `OK — clean` | Append `[VALIDITY] OK` and go to Step 2 |
| `OK — review-revise` | The goal is valid and the plan has drifted. Append `[VALIDITY] OK — plan drift is the review target` and fix it in Step 2. A stale plan alone is not a block |
| `BLOCK` | Obsolete, superseded, duplicate, false premise, a policy conflict that changes the goal, an open decision blocker, or not enough evidence. Append the evidence and the suggested action, then stop this task |

```bash
backlog task edit <id> --append-notes "[VALIDITY] OK — <the problem still exists; the task is not superseded; blocker result>"
backlog task edit <id> --append-notes "[VALIDITY] BLOCK — <class + concrete evidence + close, revise, or dependency suggestion>"
```

**Block invariant:** Do not spawn the 3 agents. Do not change the description, plan, acceptance checks, or title. Do not write a `## Plan Review (... task-plan-review ...)` note. Do not raise the `[N]` counter. If several ids were given, stop only this task and run the next one through the same gate.

**Fail closed:** If the problem and the premise are not supported by evidence, do not treat the task as valid. Report `insufficient_evidence` and name the missing evidence. Do not state a root cause, a numeric threshold, or that a fix works without a falsifiable measurement. Label anything unmeasured.

**Not a block:** The work is large, an earlier review exists, or the goal is valid while the plan is only stale. Those are review subjects.

Block report: task id, class (`obsolete`, `superseded`, `duplicate`, `false_premise`, `policy`, `dependency`, `insufficient_evidence`), concrete evidence, and the suggested action. State that no review note was written and the counter did not change.

---

## Step 2 — Spawn 3 agents

Run all three in parallel. Each agent reads the whole plan.

### 2.0 — Shared spawn prefix

Start every subagent prompt with the text from `.claude/rules/subagent-tool-surface.md`:

```
SUBAGENT TOOL SURFACE: do not call parent-only tools (MCP tools that exist only in the parent session, ToolSearch, or ctx_*). Use the file, search, and shell tools available in the subagent session.
```

Do not tell a subagent to call a tool that exists only in the parent session.

Add: the validity gate already passed; if you find obsolete or false-premise evidence, report it as critical. No model pin — inherit the host model. Paths come from the manifest and `../Codebase/`.

### Agent 1 — Plan accuracy

**Task:** File paths, references, and implementation notes match the current codebase.

- [ ] Affected files and references exist (search or read)
- [ ] Paths match the project layout in the manifest
- [ ] A line reference still points at the named symbol
- [ ] The plan names the right layer for this repo
- [ ] The codebase has not moved on since the task was written
- [ ] A similar existing implementation is cited when one exists
- [ ] A `## Plan Review (self-review, ...)` note may exist. It is not this pass

### Agent 2 — Acceptance checks

**Task:** Each acceptance check is measurable and names evidence.

Each acceptance check names an evidence class and an owner. Human-only acceptance is not an agent Done gate. Rule: `.claude/rules/evidence-gated-acceptance.md`.

- [ ] Each check can be marked done from an observable result
- [ ] At least one check is a test or another verification command
- [ ] Schema work names the project's migration command and forbids a down script when the project rule does
- [ ] A check that needs a person is in `## Human acceptance`, class `human-authority`, and is not an agent Done gate
- [ ] A check that cannot be run is marked `[EVIDENCE_UNAVAILABLE]`, not invented
- [ ] Independent pieces of work are not packed into one task

### Agent 3 — Scope and dependencies

**Task:** Split, order, and overlap.

1. Is the file count reasonable? Suggest a split when the plan itself says the scope is too wide
2. Does the dependency order match how this codebase is built?
3. Do affected files overlap another open task?
4. Does a similar open or finished task already exist?
5. Do priority and labels match the content?
6. Are non-goals written down?
7. Does the plan add machinery the request did not ask for?

### Optional agent 4 — Devils advocate

Call `devils-advocate` when any of these are true. No model pin.

- Security, auth, or permissions
- Schema or migration
- A public API contract
- A cross-cutting runtime or deploy change

**Task:** Break the plan. Name a missing threat, a wrong assumption, or a failure that is not closed.

This agent may run after the three required agents.

---

## Step 3 — Confirm in the codebase

Before merging findings:

1. Search and read the modules the findings name
2. Read a sample of the critical paths, not every file
3. Compare the plan with the project rules that apply, including `.claude/rules/db-migration-discipline.md` when the task touches schema

### 3.1 — Decision tree

When a workflow chain breaks (hook rejection, path or working-directory error, backlog CLI failure, or an MCP/tool error that blocks the chain), record a backlog item.

```
Is there a finding?
├── No → clean
└── Yes → Is it a real problem?
    ├── No (false positive) → drop it from the report
    └── Yes → Fix the plan, or open a new task?
        ├── Plan fix, critical or major → backlog task edit
        ├── Out-of-scope debt → backlog task create
        └── Unclear → ask the user
```

### 3.2 — Several passes, one loop per run

An earlier `## Plan Review` note is not a reason to skip.

- Read earlier findings. Repeat one that is still true. Mark one that was fixed as already fixed. Look for a new finding
- Each pass appends its own note. Do not delete earlier notes
- In this run: review, fix when needed, report, then stop
- Do not spawn the 3 agents again inside the same run
- A new `/task-plan-review` call is a new pass

### 3.3 — Planner quality scorecard (required, user-facing)

The model that wrote the plan does not score it. Only this command writes the scorecard. Put it in the user report. Do not write it into the task description, notes, or plan body.

**Weights:** codebase grounding 25%, measurable acceptance checks 25%, scope and dependencies 20%, safety and risk 15%, test and runtime evidence plan 15%.

Score each row from 0 to 10. Weighted result = `sum(weight * score) / 100`, one decimal place.

**Caps, each one falsifiable from the task text:**

- No exact affected-file paths → overall at most 5/10
- No test or runtime check → overall at most 5/10
- High-risk work with no safety note → overall at most 4/10

**Original** is the plan before this pass. **Post-fix** is the plan after the corrections in this pass. If nothing was corrected, Post-fix equals Original and the evidence cell says so.

```markdown
### Planner quality scorecard

| Area | Weight | Original | Post-fix | Evidence |
|---|---:|---:|---:|---|
| Codebase grounding | 25% | 4/10 | 9/10 | The first plan missed the path; the fix names the file |
| Measurable checks | 25% | 2/10 | 9/10 | Checks were vague; the fix names a command and an evidence class |
| Scope and dependencies | 20% | 4/10 | 9/10 | Order was missing; the fix names the dependency |
| Safety and risk | 15% | 3/10 | 9/10 | Failure behavior was added |
| Test and runtime evidence | 15% | 5/10 | 9/10 | A test command was added |
| **Weighted result** | **100%** | **3.5/10** | **9.2/10** | |
```

A one-column score, or a table without Post-fix, is not this scorecard. A commit that landed after the plan was written does not lower the score.

---

## Step 4 — Apply plan edits

### 4.1 — Severity

| Severity | Action | backlog task edit |
|---|---|---|
| critical | The plan cannot be implemented, the module is wrong, or a safety hole is open | `--description`, `--plan`, `--ac`, notes |
| major | Missing check, wrong path, or missing dependency | The field that is wrong |
| minor | Informational | `--append-notes` |
| dismissed | False positive | Reason in the report only |

### 4.2 — Edit shape

```bash
backlog task edit 123 --append-notes "$(cat <<'EOF'
## Plan Review (YYYY-MM-DD, task-plan-review, model: <name>)

**Overall:** revise (2 major fixed, 1 minor informational)

**Summary:** The affected-file path was corrected and a test check was added.

### Applied findings
- **[MAJOR FIXED]** Affected files: the path now matches the codebase.
- **[MAJOR FIXED]** Acceptance check: a test command and an evidence class were added.

### Informational
- **[MINOR - NOT APPLIED]** A teammate remains optional.
EOF
)"
```

> **Rule:** `--notes` replaces notes. Use `--append-notes` to add a pass.
> **Rule:** The scorecard is not written into the task. It is only in the Step 5 report.
> **Rule:** After the note, record the pass:

```bash
backlog task edit <id> --append-notes "[TASK_PLAN_REVIEW] pass finished — Overall: <approve|revise|reject>"
```

### 4.3 — Split or new task

1. Suggest the split to the user
2. After confirmation, `backlog task create` and run this review on the new task
3. Update the parent task with the dependency

### 4.4 — Review counter `[N]` (required)

After each finished pass, write the pass count at the start of the title.

| Counts | Does not count |
|---|---|
| Each finished `/task-plan-review` pass, including the post-create pass inside `/task-plan` | The create-time `## Plan Review (self-review, ...)` note |
| | A hand edit of the title |

Algorithm:

1. Write this pass's `## Plan Review (... task-plan-review ...)` note first
2. Read the title with `backlog task <id> --plain`
3. `baseTitle` is the title with one leading `[digits]` prefix removed. Do not leave a double prefix
4. `N` is the number of `## Plan Review (` lines whose text contains `task-plan-review`, including the note just written. Self-review lines do not count
5. Set the title to `[N] <baseTitle>`

```bash
backlog task edit <id> -t "[N] <baseTitle>"
```

| Title before | Title after this pass |
|---|---|
| `feat: foo bar` | `[1] feat: foo bar` |
| `[1] feat: foo bar` | `[2] feat: foo bar` |

`[N]` is the review-pass count. It is not priority and it is not severity.

---

## Step 5 — Report

```
## Plan review report

### Tasks reviewed
| ID | Title | Validity | Review # | Status | Result |
|---|---|---|---|---|---|
| task-123 | [1] feat: example | OK — problem still exists | 1 | To Do | Revise — 2 fixes |

### Plan summary (task-123)
- **Affected files:** 4
- **Dependencies:** task-120
- **Earlier Plan Review note:** present or absent. This pass was not skipped

### Critical and major findings (applied)
| # | Agent | Where | Problem | Action |
|---|---|---|---|---|
| 1 | Plan accuracy | Affected files | Wrong path | Corrected |

### Warnings
| # | Agent | Problem |
|---|---|---|
| 1 | Scope | File overlap with another open task |

### Clean areas
- [x] Dependency order
- [x] Labels

### Planner quality scorecard
(the table from Step 3.3)

### Overall
**Result:** Approved / Approved with small fixes / Replan required
Ready for task-hunter: yes or no, with the reason
```

Commit completed non-sensitive work in the same session without asking. Do not push unless the user asks. This command's own edits are backlog edits. It does not commit product code.

---

## Mandatory rules

### Invariant rules (apply to every command)

1. **Do not write config into Codebase** — workflow config stays in Agentbase.
2. **Git runs only in Codebase** — this command does not commit product code. It edits backlog items through the backlog CLI.
3. **Codebase is readable; config is not written there.**

1. **Validity first** — no agents, no review note, and no counter until section 1.4 passes. A block is fail-closed and evidenced.
2. **Three agents in parallel** — accuracy, acceptance checks, and scope.
3. **Another pass is allowed** — an earlier Plan Review note is not a skip. The same run does not loop.
4. **Do not write product code** — correct the plan.
5. **A finding needs a read** — do not claim a file is missing without looking.
6. **Done plus delivery evidence** — stop and send the user to `/task-review TASK-N`, except an explicit archive plan review.
7. **The Plan Review note is required** — `--append-notes`, heading `## Plan Review (YYYY-MM-DD, task-plan-review, model: <name>)`.
8. **The planner does not score the plan** — the scorecard exists only in this report.

<!-- GENERATE: SELF_REFRESH
Description: Command final step - self-refresh check. Bootstrap this marker to modify the Self-Refresh section. The command is reviewed within the project's context: small inconsistency Edit or large change backlog task is reported.
-->

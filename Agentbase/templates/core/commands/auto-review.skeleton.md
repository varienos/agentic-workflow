# Auto Review - Loop-Compatible Diff Review

> Tracks the last review hash, runs a shallow review when there is a new diff, fixes MINOR findings directly, and opens backlog tasks for MAJOR findings.
> Usage: `/auto-review`, `/auto-review <commit_hash>`, `/auto-review HEAD~3..HEAD`

---

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.description, stack.primary, project.structure
Example output:
## Project Context
- **Project:** E-commerce platform (Next.js + NestJS + React Native)
- **Stack:** TypeScript, Prisma, PostgreSQL, Expo
- Consider stack-specific rules during auto-review.
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## Step 1 - Diff and State Detection

### 1.1 - Argument Parsing

| Input | Behavior |
|---|---|
| Empty | Last commit: `cd ../Codebase && git diff HEAD~1..HEAD` |
| Commit hash | Specified commit: `cd ../Codebase && git show <hash>` |
| Range | Range: `cd ../Codebase && git diff <range>` |

### 1.2 - Extract Normalized Diff

Extract the diff to review in a deterministic way:

```bash
cd ../Codebase && git diff --no-ext-diff --minimal <range_or_default>
```

From this diff extract:
- Changed file list
- Added/deleted line counts
- Change type (fix, refactor, test, config)

> **RULE:** If the diff is empty or only whitespace changed, say "No new changes to review" and STOP.

### 1.3 - Compute Hash

Compute the diff hash stably:

```bash
CURRENT_DIFF_HASH=$(cd ../Codebase && git diff --no-ext-diff --minimal <range_or_default> | shasum -a 256 | awk '{print $1}')
CURRENT_HEAD=$(cd ../Codebase && git rev-parse HEAD)
```

### 1.4 - Load State File

Use `.claude/tracking/auto-review-state.json`:

```json
{
  "last_reviewed_hash": null,
  "last_review_target": null,
  "last_reviewed_head": null,
  "last_reviewed_at": null,
  "last_fix_commit": null,
  "last_report_path": null
}
```

If the file does not exist, create it:

```bash
mkdir -p .claude/tracking .claude/reports/reviews
```

### 1.5 - Repeat-Prevention Gate

Based on state, check these no-op cases:

1. If `CURRENT_DIFF_HASH == last_reviewed_hash`: the same diff was already reviewed, STOP
2. If `CURRENT_HEAD == last_fix_commit` and the working tree is clean: the last commit was created by auto-review, there is no new human diff, STOP
3. If the target range/hash matches `last_review_target` in state and there is no new diff: do not run again, STOP

> **RULE:** Do not corrupt state on skip. Only write `SKIPPED_ALREADY_REVIEWED` or `SKIPPED_AUTO_REVIEW_COMMIT` to the report.

---

## Step 2 - Run Shallow Review

### 2.1 - Review Scope

This command does not run a full audit. It only does a loop-compatible, limited review:
- Only the current diff and immediately adjacent lines
- Maximum 5 files or 300 changed lines
- Maximum 3 valid findings
- Single iteration; no re-spawn or recursive review

### 2.2 - Shallow Checklist

Apply a fast but concrete check for each change:

- [ ] Is there a logic error or an obviously wrong condition?
- [ ] Is there a silent-failure risk? (`catch {}`, missing `await`, missing `return`)
- [ ] Is a missing test or validation clear and local?
- [ ] Is there a security, data-integrity, or API-contract risk?
- [ ] Is this issue in the diff's own code, or an older out-of-diff problem?

### 2.3 - Classify Findings

#### MINOR Findings

The following count as MINOR:
- Fixable in a single file or a small block
- Intended behavior is clear; the fix is deterministic
- NO security, migration, data-loss, or API-contract risk
- A targeted verification command after the fix is obvious

#### MAJOR Findings

The following count as MAJOR:
- Security, data loss, authorization, migration, or production impact
- Multiple files/modules/subsystems are affected
- Expected behavior is unclear; human judgment is needed
- The fix needs extra design, a large refactor, or broad research

### 2.4 - False Positive and Out-of-Diff Filter

Apply this order for every finding:

```
Is there a finding?
├── NO -> Clean report
└── YES -> Is it a real issue?
    ├── NO -> False positive; remove from report
    └── YES -> Is it in the diff's own code?
        ├── YES -> Classify as MINOR or MAJOR
        └── NO -> Out-of-diff tech debt; record as a backlog task
```

> **RULE:** Do not fix out-of-diff issues directly. Write them to the backlog and continue.

---

## Step 3 - Act on Findings

### 3.1 - Fix MINOR Findings

If there is a MINOR finding:

1. Apply a minimal, local change
2. Run only the command that verifies the affected area
3. Save fixes in a separate commit:

```bash
git add <related_files>
git commit -m "fix: auto-review finding - <short_summary>"
```

4. Write the new commit hash to `last_fix_commit`

> **RULE:** At most 1 auto-review fix commit per iteration.
> **RULE:** After a fix, do not re-run the same command to start a second review pass.

### 3.2 - Open Backlog Tasks for MAJOR Findings

Create a backlog task for each MAJOR finding:

```bash
backlog task create "Auto-review finding: <issue_summary>" \
  --description "<why major, affected files, suggested next step>" \
  --priority "medium" \
  --labels "review,auto-review,tech-debt"
```

The task description must include:
- Affected diff/range or commit
- Why the issue is MAJOR
- Risk area (security, regression, data, architecture)
- Suggested first inspection point

### 3.3 - Record Out-of-Diff Issues

If an older out-of-diff issue is noticed during review:

```bash
backlog task create "Auto-review tech-debt: <issue_summary>" \
  --description "<issue is out of diff, so no inline fix>" \
  --priority "low" \
  --labels "review,auto-review,tech-debt"
```

> **RULE:** Do not change code for out-of-diff findings.

---

## Step 4 - Update Report and State

### 4.1 - Write Report

On every run, write `.claude/reports/reviews/auto-review-<timestamp>.md`:

```markdown
# Auto Review Report

- Target: <range_or_hash>
- Diff hash: <hash>
- Result: <REVIEW_OK | FIXED_MINOR | MAJOR_TASKS_CREATED | SKIPPED_ALREADY_REVIEWED | SKIPPED_AUTO_REVIEW_COMMIT>
- MINOR fix commit: <hash or none>
- MAJOR tasks: <id list or none>
- Notes: <short summary>
```

### 4.2 - Update State

If the review completed, update state:

```json
{
  "last_reviewed_hash": "<CURRENT_DIFF_HASH>",
  "last_review_target": "<range_or_hash>",
  "last_reviewed_head": "<CURRENT_HEAD or new HEAD after fix>",
  "last_reviewed_at": "<timestamp>",
  "last_fix_commit": "<fix_commit_if_any>",
  "last_report_path": ".claude/reports/reviews/auto-review-<timestamp>.md"
}
```

> **RULE:** State is updated only after the review decision is clear.
> **RULE:** Even if a MAJOR task was opened, the hash is updated so the same diff is not reviewed again in the next loop.

---

## Step 5 - Result Format

```
## Auto Review Result

### Reviewed Target
- Commit/Range: <target>
- Diff hash: <hash>

### Actions
- MINOR fix count: <0 or 1>
- MAJOR task count: <0..n>
- Out-of-diff task count: <0..n>

### Result
- REVIEW_OK / FIXED_MINOR / MAJOR_TASKS_CREATED / SKIPPED_ALREADY_REVIEWED / SKIPPED_AUTO_REVIEW_COMMIT

### Next Step
- <human review or related backlog task IDs if needed>
```

Commit completed non-sensitive work in the same session without asking. Do not push unless the user asks.

---

## /loop Compatibility Contract

When used with `/loop`, this command guarantees:

1. **Idempotent entry** - The same diff hash is not processed twice
2. **Bounded effect** - At most 1 fix commit and a limited number of backlog tasks per iteration
3. **Does not re-review itself** - `last_fix_commit` prevents getting stuck on its own commit
4. **Single pass** - Even after a fix, it does not start a second review pass in the same run
5. **Clean exit** - Ends quickly and quietly when there is no new diff or the same hash is seen

---

## Mandatory Rules

### Invariant rules (apply to every command)

1. **Do not write config into Codebase** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` files are created ONLY inside Agentbase. Do not create a `.claude/` directory inside Codebase; writing `../Codebase/CLAUDE.md` is FORBIDDEN.
2. **Git runs only in Codebase** — All git operations (commit, push, branch) run inside `../Codebase/`. There is NO git in Agentbase.
3. **Codebase is readable; config is not written there** — Project files (`src/`, `app/`, etc.) can be read and edited when the task requires it. Config files (`.claude/`, `CLAUDE.md`) CANNOT be written inside Codebase.

1. **Hash check is mandatory** - Do not start a review without comparing `last_reviewed_hash`.
2. **Single-iteration limit** - This command does not build an inner loop or call itself again.
3. **Shallow review** - Full code audit or scope expansion is FORBIDDEN.
4. **MINOR must be local** - Do not inline-fix any finding that is not local and deterministic.
5. **MAJOR goes to backlog** - For risky or unclear findings, open a task; do not touch the code.
6. **Do not fix out-of-diff issues** - Record them in the backlog; do not inline-fix.
7. **Do not repeat the same diff** - Once state is updated, the same hash is not reviewed again.
8. **Do not get stuck on your own fix commit** - `last_fix_commit` check is mandatory.
9. **Use backlog CLI** - Create/update tasks ONLY with `backlog` commands.
10. **Codebase path** - All git and code access goes through `../Codebase/`.

<!-- GENERATE: SELF_REFRESH
Description: Command final step - self-refresh check. Bootstrap replaces this marker
with the shared Self-Refresh section. The command reviews its own text against the
project reality: small mismatches via Edit, large changes reported as a backlog task.
-->

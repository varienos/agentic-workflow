# Rollback — Shadow Git Checkpoint Restore

> Restores the agent's recent commits from hidden checkpoints. Lists refs accumulated by the `git-checkpoint.js` hook under `refs/checkpoints/agent/*`, then applies the selected one with `git reset --hard` or `git revert`.
> Usage: `/rollback`

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
- **Codebase path:** `../Codebase/`

Invariant rules:
- Do not write config into Codebase — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` are created ONLY inside Agentbase.
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
- Codebase is readable; config is not written there — rollback reads/changes git state and does not write Codebase config files.
- Agentbase has no git — no rollback inside Agentbase
- Checkpoint refs use the format `refs/checkpoints/agent/<id>-<ts>`
-->

---

<!-- GENERATE: COMMIT_CONVENTION
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: conventions.commit_language, conventions.commit_format
Example output:
## Commit Format (After Rollback)

`reset --hard` mode does not create a commit (history rewrite). `revert` mode creates a new commit:

```
revert: <original-commit-summary> (rollback to <ref>)
```

**Language:** English
**Example:** `revert: roll back the user-table migration (rollback to checkpoint/agent/220-...)`
-->

---

## Step 1 — Prerequisite Check

### 1.1 — Git Repo Validation

```bash
cd ../Codebase && git rev-parse --git-dir
```

If Codebase is NOT a git repo, tell the user and exit:

> "Codebase is not a git repository. Rollback needs `git init`."

### 1.2 — Is the Working Tree Clean?

```bash
cd ../Codebase && git status --porcelain
```

If there are unstaged or uncommitted changes, ask the user:

> "The working tree has uncommitted changes. Rollback can lose them.
> - [S] Stash and continue (`git stash push -u`)
> - [I] Cancel
> - [Z] Accept the risk and continue"

> **RULE:** Never run `reset --hard` or `revert` without an explicit user request.

---

## Step 2 — Checkpoint List

### 2.1 — Fetch Existing Checkpoints

```bash
cd ../Codebase && git for-each-ref \
  --sort=-committerdate \
  --format='%(refname)|%(objectname:short)|%(committerdate:iso-strict)|%(contents:subject)' \
  refs/checkpoints/agent/
```

Parse the output — each line is a checkpoint:
- **Ref name:** `refs/checkpoints/agent/<task-id>-<timestamp>`
- **Short SHA:** Commit SHA (short form)
- **Date:** Commit date at checkpoint creation
- **Subject:** Commit title

If there are NO checkpoints, tell the user:

> "No checkpoints found. The hook (git-checkpoint.js) may not have fired yet, or GC may have cleaned them.
> Manual rollback: `git reflog` + `git reset --hard <hash>`"

### 2.2 — Show the List to the User

Present the last 10 checkpoints as a table:

```
| # | Date               | Task    | SHA      | Commit Subject              |
|---|--------------------|---------|----------|-----------------------------|
| 1 | 2026-05-07 14:32   | 220     | a3f9c1e  | feat(hooks): checkpoint...  |
| 2 | 2026-05-07 14:18   | 220     | b1e8d4a  | refactor(hooks): cleanup    |
| 3 | 2026-05-07 13:55   | 219     | f7c2b9d  | fix(parse): null guard      |
```

---

## Step 3 — Checkpoint Selection

Use `AskUserQuestion` to let the user pick a checkpoint:

> "Which checkpoint do you want to restore?"
> - 1: 2026-05-07 14:32 — feat(hooks): checkpoint... (a3f9c1e)
> - 2: 2026-05-07 14:18 — refactor(hooks): cleanup (b1e8d4a)
> - 3: 2026-05-07 13:55 — fix(parse): null guard (f7c2b9d)

> **RULE:** Ask even when there is one checkpoint, so a restore is not accidental.

If the user cancels, skip to step 7 (report: "Cancelled").

---

## Step 4 — Rollback Mode Selection

Check whether the selected checkpoint's commit was pushed to remote:

```bash
cd ../Codebase && git branch -r --contains <selected-sha>
```

### 4.1 — Mode Table

| Mode | Command | When? | Risk |
|---|---|---|---|
| **hard reset** | `git reset --hard <ref>` | Commit is LOCAL — not pushed | Later commits are LOST |
| **revert** | `git revert <commit>` | Commit was PUSHED | History preserved; new revert commit |
| **soft reset** | `git reset --soft <ref>` | Keep the stage; only move HEAD back | Changes remain staged |

### 4.2 — Automatic Suggestion

- If not pushed → suggest **hard reset** (cleanest)
- If pushed → suggest **revert** (history-safe)
- If the user is unsure → suggest **soft reset** (recoverable)

Confirm the mode with `AskUserQuestion`:

> "Suggested mode: <mode>. Do you want to continue?"

---

## Step 5 — Apply Rollback

### 5.1 — Hard Reset

```bash
cd ../Codebase && git reset --hard <selected-ref>
```

> **WARNING:** After this command, all commits after the checkpoint become unreachable (except via reflog).

### 5.2 — Revert

> **IMPORTANT:** The checkpoint is the healthy HEAD BEFORE the bad commit. What we want to revert is NOT the checkpoint SHA, but the commits that came after the checkpoint. That is why range syntax is used.

If there is a single commit after the checkpoint (HEAD = bad commit):
```bash
cd ../Codebase && git revert --no-edit HEAD
```

If there are multiple commits after the checkpoint (range — checkpoint NOT included, HEAD included):
```bash
cd ../Codebase && git revert --no-edit <selected-ref>..HEAD
```

> **WARNING:** `git revert --no-edit <selected-ref>` (NO range) is WRONG — that reverts the checkpoint itself, not the bad commit.

### 5.3 — Soft Reset

```bash
cd ../Codebase && git reset --soft <selected-ref>
```

Then tell the user: "Changes are kept in the stage. You can inspect and make a new commit."

---

## Step 6 — Verification

### 6.1 — HEAD Position

```bash
cd ../Codebase && git log -1 --format='%H %s'
```

Verify the output matches the expected SHA.

### 6.2 — Working Tree

```bash
cd ../Codebase && git status
```

If mode is hard reset: should be clean.
If mode is revert: a new revert commit should appear.
If mode is soft reset: changes should be staged.

### 6.3 — Tests

Run critical tests:

```bash
cd ../Codebase && <test_command>
```

If tests FAIL, tell the user — the rollback may need to go deeper.

---

## Step 7 — Backlog Note

```bash
backlog task edit <active-task-id> --append-notes "[ROLLBACK] <selected-ref> — mode: <hard|revert|soft>"
```

If there is no active task, record the rollback:

```bash
backlog task create \
  "rollback: <commit-summary>" \
  --description "Checkpoint <ref> applied (<mode>)" \
  --priority "low" \
  --labels "rollback,recovery" \
  -s "Done"
```

---

## Step 8 — User Report

```
## Rollback Report

### Restored Checkpoint
- **Ref:** `refs/checkpoints/agent/<id>-<ts>`
- **SHA:** `<short-sha>`
- **Subject:** `<commit-subject>`
- **Date:** `<iso-date>`

### Mode
- **Selected:** `<hard|revert|soft>`
- **Reason:** `<was it pushed / user choice>`

### Result
- HEAD: `<new-sha>`
- Working tree: `<clean|staged|dirty>`
- Tests: `<passed|failed|not-run>`

### Backlog
- Task with note: `#<id>`

> Restore finished. Inspect with: `git log -5`
```

Commit completed non-sensitive work in the same session without asking. Do not push unless the user asks.

---

## Mandatory Rules

1. **No unapproved reset/revert** — No destructive command may run without user approval.
2. **The working tree must be clean** — if `git status --porcelain` prints anything, stash or cancel first.
3. **Push check is mandatory** — hard reset is NOT the default for a pushed commit; suggest revert.
4. **One mode at a time** — `reset` and `revert` are not combined in the same rollback.
5. **Reflog guarantee** — After hard reset, remind the user: lost commits are reachable via `git reflog` for 90 days.
6. **Codebase path** — All git operations run inside `../Codebase/`. There is NO git in Agentbase.
7. **Backlog record** — Every rollback is recorded either on an existing task note or a new task — for auditability.
8. **Small steps** — If multiple checkpoints are close together, roll back one at a time, not in bulk.
9. **Stop on error** — If `git reset/revert` fails, do not continue; tell the user and ask for manual inspection.
10. **Security** — a rollback can restore a commit that contains a secret. Warn before restoring it.

<!-- GENERATE: SELF_REFRESH
Description: Command final step - self-refresh check. Bootstrap replaces this marker
with the shared Self-Refresh section. The command reviews its own text against the
project reality: small mismatches via Edit, large changes reported as a backlog task.
-->

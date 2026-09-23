# Session Status — Session and Backlog Status

This command reads `session-*.json` files under `.claude/tracking/sessions/` and summarizes which agent is on which task, in which phase, and what it is waiting on.

If live interactive monitoring is needed:

```bash
node bin/session-monitor.js
```

This TUI opens in the `Timeline` view by default; press `Tab` to switch to the `Agent Radar` view.

---

## Steps

### 1. Read Session Files

Scan all `session-*.json` files under `.claude/tracking/sessions/`.

```bash
ls -la .claude/tracking/sessions/session-*.json 2>/dev/null
```

Evaluation:
- If the directory is missing: tracker may be inactive or this workspace may not be materialized yet
- If no files: the hook may be active but no session data has been written yet
- If broken JSON exists: skip bad files and keep showing the rest

### 2. Extract Status and Phase Info

For each session, read or derive these fields:
- `current_focus.task_id`, `title`, `status`, `priority`
- `phase` (`planning`, `implementing`, `testing`, `reviewing`, `waiting`, `done`)
- `waiting_on` (`none`, `test`, `user`, `review`, `dependency`)
- `last_meaningful_action`
- `backlog_sync.acceptance.completed/total`

Classify session status by `last_activity` time:

| Range | Status | Symbol |
|--------|-------|-------|
| < 5 minutes | active | `●` |
| 5 — 30 minutes | idle | `○` |
| > 30 minutes | closed | `─` |

### 3. Show Summary Table

Provide an agent-first summary with one row per agent/session:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Session Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Session | Status | Task    | Phase      | Waiting  | Last Action     |
|--------|-------|---------|------------|----------|-----------------|
| 45012  | ●   | TASK-24 | implement  | none     | Edited monitor  |
| 45078  | ○   | TASK-11 | waiting    | test     | npm test fail   |
| 45123  | ─   | —       | planning   | none     | Read backlog    |
```

Additional backlog summary:
- task status (`In Progress`, `Done`, ...)
- priority
- acceptance progress (`AC 2/5`)
- dependency count if needed

### 4. Detail View

When a single session is selected, show these fields:
- task id and title
- backlog status / priority / acceptance progress
- phase and waiting reason
- tool distribution
- recently read / written files
- recent event stream
- teammate status
- error summary

Example:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Session Detail: 45012
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Task:        TASK-24 Merge conflict management
Backlog:     In Progress  |  high  |  AC 1/2
Phase:       implementing
Waiting:     none
Action:      Edited workflow-lifecycle.skeleton.md

Recent Events:
  10s  Started TASK-24
   8s  Edited workflow-lifecycle.skeleton.md
   4s  Teammate completed: review-agent
```

### 5. Problem Diagnosis

If data is insufficient, state it separately:
- `Tracker inactive` — session directory missing
- `No session files yet` — directory exists but no session files
- `Unreadable session JSON` — files that cannot be parsed
- `Linked backlog task missing` — session linked to a task but task markdown file not found

## Required Rules

### Invariant rules (apply to every command)

1. **Do not write config into Codebase** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` files are created ONLY inside Agentbase. Creating a `.claude/` directory inside Codebase or writing `../Codebase/CLAUDE.md` is FORBIDDEN.
2. **Git runs only in Codebase** — All git operations (commit, push, branch) run inside `../Codebase/`. There is NO git in Agentbase.
3. **Codebase is readable; config is not written there** — Project files (`src/`, `app/`, etc.) can be read and, if the task requires it, edited. Config files (`.claude/`, `CLAUDE.md`) cannot be written inside Codebase.

1. READ only — do not MODIFY session or backlog files
2. If session JSON arrives with an old schema, use fallback — best-effort from `backlog_activity` and `last_tool`
3. Use the local timezone
4. Do not break the entire output because of one bad file
5. Keyboard guide for the interactive monitor:
   `Tab`, `j/k`, `↑/↓`, `Enter`, `Esc`, `c`, `h`, `q`

<!-- GENERATE: SELF_REFRESH
Description: Command final step - self-refresh check. Bootstrap replaces this marker
with the shared Self-Refresh section. The command reviews its own text against the
project reality: small mismatches via Edit, large changes reported as a backlog task.
-->

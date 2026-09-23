# Memorize — Session Learning Recorder

> Analyzes important learnings from the current session and records them to memory.
> Usage: `/memorize`, `/memorize "learnings for the auth module"`

---

## Philosophy

Not everything is worth recording. Memory stores information that will be ENCOUNTERED AGAIN later.
Pass the "I would have been faster if I had known this" test: will an agent facing the same situation later benefit from this?

---

## Step 1 — Session Analysis

Analyze all interactions in the current conversation:

1. Which files were worked on?
2. Which problems were encountered?
3. How were they solved?
4. Were there unexpected situations?
5. Did the user state special preferences?

---

## Step 2 — Classify Learnings

### Categories Worth Recording

| Category | Description | Example |
|---|---|---|
| **Solution Pattern** | Solution found for a specific problem | "Prisma N+1 solved with `include`" |
| **Project Convention** | Hidden rule discovered in the codebase | "Services always return `Result<T>`" |
| **Pitfall** | Easy to fall into, hard to find | "Memory leak when useEffect cleanup is missing" |
| **Architecture Decision** | Why it is structured this way | "Auth is per service, not at the gateway" |
| **User Preference** | Working preference stated by the user | "PR descriptions should be in English" |
| **Tool Usage** | Usage detail for a specific tool | "backlog CLI `--set` flag needs quotes" |

### Things NOT Worth Recording

- General programming knowledge (everyone knows)
- One-off operations (will not repeat)
- Personal information (not project-specific about the user)
- Overly specific debug steps (meaningless without context)
- Information already in documentation

---

## Step 3 — Create Memory Files

### 3.1 — File Format

Create a separate memory file for each learning:

**Invariant Path Rule:**
- Write into the Agentbase .claude/memory/ directory
- Do not write memory files into Codebase

<!-- GENERATE: MEMORY_PATH
Description: This section is filled by Bootstrap from manifest data.
Required manifest fields: paths.memory
Example output:
**Memory directory:** `.claude/memory/`

File path: `.claude/memory/<category>/<kebab-case-name>.md`

Category directories:
- `.claude/memory/patterns/` — Solution patterns
- `.claude/memory/conventions/` — Project conventions
- `.claude/memory/pitfalls/` — Pitfalls
- `.claude/memory/decisions/` — Architecture decisions
- `.claude/memory/preferences/` — User preferences
- `.claude/memory/tools/` — Tool usage
-->

### 3.2 — File Content

Every memory file must use this format:

```markdown
---
name: <short_name>
description: <one_sentence_description>
type: <pattern|convention|pitfall|decision|preference|tool>
created: <date>
context: <which_task_or_session_it_was_learned_in>
---

## Learning

[Clear explanation of what was learned — a future agent should understand immediately]

## Context

[In which situation it was encountered, why it matters]

## Example

[Code example or concrete scenario if available]
```

### 3.3 — File Naming

- Use kebab-case: `prisma-n-plus-one-solution.md`
- Short and descriptive: a reader should understand the topic from the name
- Do not add a date: it is already in the frontmatter inside the file

---

## Step 4 — Report

```
## Memory Report

### Recorded Learnings
| # | Category | Name | File |
|---|---|---|---|
| 1 | Solution Pattern | Prisma N+1 solution | `patterns/prisma-n-plus-one-solution.md` |
| 2 | Pitfall | useEffect cleanup | `pitfalls/use-effect-cleanup-required.md` |

### Skipped
- [general knowledge, one-off operation, etc. — why not recorded]

### Stats
- **Interactions analyzed:** <count>
- **Learnings recorded:** <count>
- **Skipped:** <count>
```

---

## Required Rules

### Invariant rules (apply to every command)

1. **Do not write config into Codebase** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` files are created ONLY inside Agentbase. Creating a `.claude/` directory inside Codebase or writing `../Codebase/CLAUDE.md` is FORBIDDEN.
2. **Git runs only in Codebase** — All git operations (commit, push, branch) run inside `../Codebase/`. There is NO git in Agentbase.
3. **Codebase is readable; config is not written there** — Project files (`src/`, `app/`, etc.) can be read and, if the task requires it, edited. Config files (`.claude/`, `CLAUDE.md`) cannot be written inside Codebase.

1. **Be selective** — Do not record everything. Apply the "I would have been faster if I had known this" test.
2. **Write clearly** — A future agent must understand without the original context.
3. **Add an example** — Include a concrete code example or scenario when possible.
4. **Frontmatter required** — Every file must have `name`, `description`, `type`, `created`, `context`.
5. **Check for duplicates** — If the same learning is already recorded, do NOT record again.
6. **Pick the right category** — Avoid putting it in the wrong category.
7. **Keep it short** — A memory file should not exceed 50 lines.
8. **Do not record sensitive information** — Credentials, secrets, personal data are NEVER written to memory.

<!-- GENERATE: SELF_REFRESH
Description: Command final step - self-refresh check. Bootstrap replaces this marker
with the shared Self-Refresh section. The command reviews its own text against the
project reality: small mismatches via Edit, large changes reported as a backlog task.
-->

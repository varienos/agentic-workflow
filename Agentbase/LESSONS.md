# Lessons

> This file carries the agents' **self-improvement loop**. Per `ORCHESTRATION.md` "Section 3 — Self-Improvement Loop",
> a lesson record is kept here after every correction.
> It is injected into context via the `@LESSONS.md` line in root `CLAUDE.md` (Claude Code official import syntax — no spaces).

<!-- This file is filled over time by agents. -->
<!-- Content: patterns from user corrections, and rules written so they do not repeat -->
<!-- Source: in-session feedback, /memorize flow, user warnings -->
<!-- Injected into all agent contexts via @ -->

---

## Lesson Record Format

Every lesson follows this structure:

```markdown
### [YYYY-MM-DD] — Short title

**Context:** Situation where the mistake happened — which task, layer, or command.

**Wrong behavior:** What was done (short, no blame).

**Correct rule:** What to do next time (imperative — "check X", "ask Y before doing Z").

**Why:** Why this rule matters (the root that caused loss).

**How to apply:** Which trigger brings this rule into play.

**Tags:** `bootstrap`, `backlog`, `git`, `codebase-leak`, `agent-spawn`, etc.
```

---

## Lessons

<!-- New lessons are added here newest → oldest. -->
<!-- This section stays empty until the first lesson is added. -->

### [2026-05-31] — Scan delivery-model wording on every surface

**Context:** During the TASK-237/TASK-238 two-repo delivery model review, README and bootstrap text were fixed while `root-gitignore.skeleton` still carried the same old cloning claim.

**Wrong behavior:** Checking only the visible README/bootstrap surface lets user-facing wrong model wording in source skeleton comments slip through.

**Correct rule:** When contract wording such as delivery/repo model changes, scan README, the bootstrap command, skeleton sources, and regression tests together.

**Why:** Target files Bootstrap generates are fed by skeleton sources, so the generated model can stay wrong even after documentation is fixed.

**How to apply:** When phrases like `Codebase`, `two-repo`, `submodule`, `gitignore`, `clone`, or `klon` change, run `rg` across all surfaces for stale wording.

**Tags:** `bootstrap`, `git`, `two-repo`, `skeleton`, `review`

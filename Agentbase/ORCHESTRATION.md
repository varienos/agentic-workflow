# Workflow Orchestration

> This file defines the shared working philosophy for all agents (Claude, Gemini, Codex, Kimi, OpenCode, and other hosts).
> It is injected into context via the `@ORCHESTRATION.md` line in root `CLAUDE.md` (Claude Code official import syntax — no spaces);
> `transform.js` carries the same content to `GEMINI.md`, `AGENTS.md`, `.kimi/`, `.opencode/`, and other host targets.

---

## 1. Default Plan Mode

- For any non-trivial task (3+ steps or an architectural decision), **enter plan mode** — especially when a backlog task touches multiple layers.
- If something goes wrong, **STOP** and replan immediately — do not keep forcing the same approach.
- Use plan mode not only for building, but also for **verification steps**.
- Reduce ambiguity by writing detailed technical specs up front; put them in the backlog task description or under `Agentbase/.claude/reports/`.

## 2. Sub-agent Strategy

- Use sub-agents **generously** to keep the main context window clean.
- Delegate **independent** research, discovery, and analysis to parallel sub-agents (invoke the Agent tool multiple times in one message for concurrent work).
- For **dependent** work, run sequentially — do not parallelize at the cost of wrong results.
- On complex problems, use sub-agents for more compute; the lead agent synthesizes and decides while sub-agents gather data.
- Give each sub-agent a **single focused task**; do not write "do everything" prompts.
- Do **not** tell sub-agents to call parent-only tools (for example parent session controls, goal evaluators, or tools only the lead may use). Pass needed context in the spawn prompt instead.
- Sacred Rule 1: Sub-agents always run product git operations inside `../Codebase/` — never inside Agentbase. For a generated project, product git stays in Codebase.

## 3. Self-Improvement Loop

- After **ANY** correction from the user: update `Agentbase/LESSONS.md` with the relevant pattern.
- Write **rules** that prevent the same mistake — not "I did X wrong", but "before doing X, check Y".
- Repeat these lessons **ruthlessly** until the error rate drops; promote recurring mistakes in LESSONS.md.
- At session start, review relevant lessons (pull them into context with `grep` / `@import` if needed).

## 4. Verify Before Declaring Done

- Never mark a task complete without **proof** that it works.
- Before completing a backlog task: write an **evidence summary** with `backlog task edit N -s "Done" --final-summary "..."` (which tests passed, which behavior was verified).
- When relevant, check behavioral diffs between main and your changes — not only code diffs, but **behavior diffs**.
- Run tests, read hook signals, check logs, and prove correctness.
- Ask yourself: _"Would a staff engineer approve this?"_

## 5. Demand Elegance (Balanced)

- For non-trivial changes, pause and ask: _"Is there a more elegant path?"_
- If a solution feels hacky: _"Given everything I know now, apply the elegant solution."_
- Skip this for simple, obvious fixes — avoid over-engineering.
- Before presenting work, **challenge** it: do not design for hypothetical futures or add unnecessary abstraction.

## 6. Autonomous Troubleshooting

- When given a bug report: **Just fix it.** Do not ask for help first.
- Point at logs, errors, and failing tests — then resolve them.
- Require **zero context switching** from the user.
- Fix failing CI tests in Codebase without waiting to be told (`cd ../Codebase && ...`).

## 7. Session Git Hygiene

- When non-sensitive work is complete in the same session, **commit it in Codebase without asking** (`cd ../Codebase && git ...`).
- **Do not push** unless the user explicitly asks.
- Never commit secrets, credentials, or sensitive local config.

---

## Task Management

- **Plan first:** Prepare a controllable plan with `backlog`. The single source of truth is the `backlog/` directory — **do not edit task files by hand**; always use the `backlog task edit` CLI.
- **Validate the plan:** Review before implementing; get user confirmation when needed.
- **Track progress:** Mark items with `backlog task edit N -s "In Progress"` / `Done` as you go.
- **Explain changes:** Give a high-level summary at each step — not a long essay, a **clear outcome**.
- **Document results:** Write outcomes with `backlog task edit N --final-summary "..."`.
- **Record lessons:** After corrections, update `Agentbase/LESSONS.md`.

---

## Core Principles

- **Simplicity first:** Keep every change as simple as possible. Touch the least code needed.
- **No laziness:** Find root causes. Do not escape into temporary workarounds. Apply senior-developer standards.
- **Minimum impact:** Changes should touch only what is necessary. Avoid introducing new bugs.
- **Sacred Rule awareness:** `Agentbase/` is a configuration directory; git does not run there. All git and application changes happen in `../Codebase/`. Outside Bootstrap, **never write into Codebase** for config/workflow purposes. The project root (above Agentbase/Codebase/Docbase) may be the developer's OPTIONAL git repo (versions Agentbase + Docbase, ignores Codebase via `.gitignore`) — that is the **developer's manual tool**: agents never touch the upper-root repo; all agent git operations stay in `../Codebase/`.

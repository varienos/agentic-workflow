![Agentic Workflow banner](Docbase/assets/agentic-workflow-banner.png)

[![Tests](https://img.shields.io/github/actions/workflow/status/varienos/agentic-workflow/test.yml?label=tests&logo=github)](https://github.com/varienos/agentic-workflow/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude_Code-Powered-blueviolet?logo=anthropic)](https://docs.anthropic.com/claude-code)
[![GitHub Stars](https://img.shields.io/github/stars/varienos/agentic-workflow)](https://github.com/varienos/agentic-workflow)

> **[Türkçe versiyon (README.md)](README.md)**

> [!IMPORTANT]
> This system requires two mandatory dependencies:
> - **[Backlog.md](https://github.com/MrLesk/Backlog.md)** — the entire task lifecycle (creation, prioritization, implementation, review, closure) is managed through the Backlog.md CLI.
> - **[basic-memory](https://github.com/basicmachines-co/basic-memory)** — shared agent memory layer. All CLI agents (Claude, Codex, Gemini, Antigravity, Kimi, OpenCode) connect to the same `Docbase/memory/` vault via MCP. Never store secrets, tokens, `.env` values, or PII in persistent memory; redact before writing memory. Requires `uv` (Python package manager) and Python 3.12+.
>
> Bootstrap will not run without both installed.

> [!NOTE]
> Autonomous task management, parallel agent spawning, and multi-step workflow pipelines require high token consumption. **Claude Max** plan is recommended for efficient usage.

A workflow system that manages the entire lifecycle of software development with Claude Code. From task planning to code review, bug fixing to deploy control — every step is managed through structured commands, agents, and automated protection mechanisms.

You can integrate it into an existing project or start a brand new one from scratch. The `/bootstrap` command recognizes your project (or asks for stack info in greenfield mode), runs a short interview, and generates project-specific workflow files.

## What Does It Provide?

- **Autonomous task management** — Pick a task from backlog, plan, implement, test, commit, close. Single command.
- **Automatic code review** — 3+1 agents review every change: code quality, silent failures, regression risk. Conditional Devils Advocate perspective for security changes.
- **Smart bug fix** — Root cause analysis, max 3 hypotheses, minimal fix, regression test. Doesn't dive into endless depth.
- **Deploy safety net** — Two layers: (1) pre-push git hooks for localhost leak, migration consistency, and env sync checks, (2) `/{variant}-pre-deploy` and `/{variant}-post-deploy` slash commands for platform-specific controls (for example `/docker-pre-deploy`, `/coolify-post-deploy`, plus rollback guidance). Requires git hook activation (see the Bootstrap completion report).
- **Shared agent memory layer** — Via `basic-memory` MCP, all CLI agents (Claude, Codex, Gemini, Antigravity, Kimi, OpenCode) connect to a shared Markdown knowledge graph in the `Docbase/memory/` vault. Persistent memory across sessions and CLIs — a note written by one agent is instantly visible to the others. Never store secrets, tokens, `.env` values, or PII in persistent memory.
- **Codebase config protection** — In the Claude Code runtime, the `codebase-guard` hook automatically blocks writing `.claude/`, `CLAUDE.md`, `.mcp.json` inside Codebase. Agent config lives exclusively in Agentbase.
- **Test enforcement** — In the Claude Code runtime, the `test-enforcer` hook reminds you to run related tests when source files change. Pre-push hook prevents pushing without passing tests.
- **Project-specific rules** — Hooks, framework rules, and protection mechanisms are auto-generated based on your stack.
- **Live session monitoring** — Track multiple Claude Code sessions from a single terminal screen.
- **Worktree-friendly architecture** — Agentbase/Codebase separation enables single config, multiple worktrees, parallel development.
- **Multi-CLI support** — Claude Code outputs can be transformed to Gemini CLI, Antigravity, Codex CLI, Kimi CLI, and OpenCode formats via `transform.js`. The Codex target produces a skill/context surface; it does not imply a second bootstrap or automatic hook parity.
- **Documentation sync** — In the Claude Code runtime, the `doc-drift-check` hook warns about README/CHANGELOG/OpenAPI staleness after code changes and points to the service-documentation agent for analysis.
- **Extension recommendations** — Built-in registry scan suggests relevant third-party skills and plugins after bootstrap completes.
- **Automatic CHANGELOG** — Conventional Commit pushes on the `main` branch trigger the auto-release flow; the resulting `v*` tag triggers a separate GitHub Action that regenerates `CHANGELOG.md` and writes it back to `main`.
- **CI security scanning** — Gitleaks secret scanning and `npm audit` dependency checks run on every push and PR. Dependabot proposes weekly npm and GitHub Actions updates.

## Core Approach

This repo is built on four main workspaces:

| Path | Purpose |
| --- | --- |
| `Agentbase/` | Templates, generation logic, Claude commands, and helper tools |
| `Agentbase/backlog/` | Task lifecycle — tasks managed via Backlog.md CLI |
| `Codebase/` | The actual project code to work on |
| `Docbase/agentic/` | Manifest file generated by Bootstrap (`project-manifest.yaml`) |

Three important consequences of this separation:

- Git operations run on the project side, inside `Codebase/`.
- Bootstrap never writes to `Codebase/`; it produces output under `Agentbase/` and `Docbase/agentic/`. The backlog is also created inside `Agentbase/backlog/`.
- **Two-repo delivery (optional):** The project root can be the developer's own git repo (versioning Agentbase + Docbase); `Codebase/` stays a separate, independent repo delivered to the customer clean (see below).

Note: This template repo keeps its own development backlog in the root-level `backlog/` directory; the backlog produced by bootstrap for the target workspace lives under `Agentbase/backlog/`.

### Two-Repo Delivery Model

The same `Agentbase/Codebase/Docbase` separation also enables an optional delivery model (two separate repos — not a submodule):

- **The top root (project root)** can be the developer's own git repo; it versions `Agentbase/` and `Docbase/` (the workflow environment + docs/memory) and ignores `Codebase/` via `.gitignore`.
- **`Codebase/`** is its own independent git repo, delivered to the customer **separately**.

Result: the developer clones the top-root repo (Agentbase + Docbase come along) and clones/links `Codebase` **separately** (being gitignored, it does not come with the top-root clone), while the customer clones only the `Codebase` repo — a clean delivery carrying no trace of the workflow tooling.

Bootstrap generates a ready-made `.gitignore` at the project root (excluding `Codebase` + worktree directories) and offers optional `git init` guidance; agents never touch the top-root repo (all agent git operations stay inside `../Codebase/`).

### Worktree Advantage

The Agentbase/Codebase separation supports parallel development with git worktrees. The target Codebase path is resolved through **a single contract**: `Agentbase/.claude/hooks/shared-hook-utils.js` exposes a `resolveCodebaseRoot()` helper called by every hook. The resolution order is `process.env.AGENTIC_CODEBASE_DIR` > `manifest.project.structure` > `../Codebase` fallback.

```
Agentbase/                  ← FIXED — all worktrees share the same config
│
├── .claude/commands/       ← Rules, hooks, agents in ONE place
├── .claude/hooks/
│   └── shared-hook-utils.js  ← resolveCodebaseRoot(): env > manifest > fallback
├── .claude/rules/
│
Codebase/ → project (main)          ← Main worktree
Codebase/ → Codebase-wt-feat-auth   ← git worktree add (feature/auth branch)
Codebase/ → Codebase-wt-feat-pay    ← git worktree add (feature/payment branch)
```

In a traditional setup, `.claude/` lives in the project root; creating a worktree copies `.claude/` into each one, and config changes don't sync. The Agentbase separation solves this fundamentally:

- **Single config, multiple worktrees** — Hooks, rules, agents always the same
- **Isolated git history** — Agentbase files don't leak into project commits
- **Parallel sessions** — 4 terminals, 4 worktrees, 4 Claude Code sessions, one Agentbase

#### Selecting the Target Worktree

Three methods, in priority order:

| Method | Command | Scope |
| --- | --- | --- |
| **Runtime override** | `export AGENTIC_CODEBASE_DIR=/abs/path/Codebase-wt-feat-auth && claude` | Single terminal/session — the Claude Code session inheriting the env targets that path |
| **Worktree symlink** | `rm Codebase && ln -s /new/path Codebase` | Permanent, manifest unchanged — pins a single active Codebase at the repo root |
| **Manifest update** | Edit `Docbase/agentic/project-manifest.yaml` → `project.structure` + run `/workflow-update` | Permanent, regenerate required — generated hook fallbacks point at the new path |

**In practice:** to work on four worktrees simultaneously, export a different `AGENTIC_CODEBASE_DIR` in each terminal. One Agentbase, every hook targets the correct worktree.

## What's in the Repo?

Main components:

- `Agentbase/.claude/commands/bootstrap.md` — The main command that starts the setup flow
- `Agentbase/templates/` — Core templates and module-based skeleton files
- `Agentbase/generate.js` — Script that produces deterministic content from the manifest
- `Agentbase/transform.js` — Pipeline that transforms Claude Code outputs to Gemini/Antigravity/Codex/Kimi/OpenCode formats
- `Agentbase/bin/session-monitor.js` — Session monitoring tool
- `Agentbase/tests/` — Tests validating generation and hook behaviors

Note: Some command files in this repo serve as examples or core content. The actual command set is generated after bootstrap based on the target project's structure.

## Requirements

- [Claude Code CLI](https://docs.anthropic.com/claude-code)
- [Backlog.md CLI](https://github.com/MrLesk/Backlog.md) — `npm i -g backlog.md`
- Node.js 18+ and npm
- [jq](https://jqlang.github.io/jq/) — JSON processor, required for hook rules (`brew install jq` or `apt install jq`)
- [graphify](https://pypi.org/project/graphifyy/) — **mandatory** knowledge graph tool; bootstrap installs it automatically via `uv tool install graphifyy` (package name is double-y `graphifyy`, command is `graphify`). Requires Python 3.10+ (already satisfied by the 3.12+ requirement) and uses `uv` (already mandatory for `basic-memory`). No additional prerequisites.
- Git 2.38+ — required for `git merge-tree --write-tree` support in pre-push hook
- Docker CLI — required if Docker or Coolify deploy module is active (`docker build`, `docker compose` commands)
- [GitHub CLI (gh)](https://cli.github.com/) — optional, used by `release.js` for GitHub Release creation

## Quick Start

### Integrating into an existing project

```bash
git clone https://github.com/varienos/agentic-workflow
cd agentic-workflow

# Remove the Codebase placeholder only if it is empty; stop if it contains files
rm -f Codebase/.gitkeep && rmdir Codebase
ln -s /path/to/your/project Codebase

cd Agentbase
npm install
claude
```

Inside Claude Code:

```
/goal /bootstrap until "BOOTSTRAP_COMPLETE"
```

> **Why with `/goal`?** Bootstrap is a multi-step, multi-teammate process. The native `/goal` command introduced in Claude Code 2.1.139+ runs an evaluator model after every turn; it automatically verifies that Bootstrap wrote all files to the correct locations and no step was left half-done. Until the `BOOTSTRAP_COMPLETE` marker is produced, it continues new turns to close gaps. Plain `/bootstrap` also works, but failures require manual retry.

### Starting a new project from scratch (greenfield)

```bash
git clone https://github.com/varienos/agentic-workflow
cd agentic-workflow

# Leave Codebase empty — Bootstrap will switch to greenfield mode
rm -f Codebase/.gitkeep
cd Agentbase
npm install
claude
```

Inside Claude Code:

```
/goal /bootstrap until "BOOTSTRAP_COMPLETE"
```

When Bootstrap detects an empty Codebase, it switches to greenfield mode: asks for stack selection, generates workflow files, and shows scaffold setup commands. The directory must not contain real project files; `.gitkeep` and `.DS_Store` are ignored as placeholders, while files like README or package manifests make bootstrap start in existing-project mode.

## Bootstrap Flow

### Optional pre-step: `npm run init` (terminal seam)

On heavy projects, leaving the entire configuration burden to the model can produce incomplete or incorrect config. To reduce this, a CLI moves the deterministic part (codebase detection + interview + manifest + `generate.js`) into the terminal:

```bash
cd Agentbase
npm run init            # interactive wizard (real terminal)
npm run init:yes        # non-interactive: detection + defaults (CI/agent)
npm run init:dry        # detection report, writes nothing
# or: node bin/init.js --answers init-answers.yaml   # replay
```

`init` validates the manifest with `templates/manifest.schema.js` (fail-loud) and runs `generate.js` to produce deterministic output. It also guarantees the mandatory graphify CLI: it checks `which graphify` and, if missing, installs it automatically via `uv tool install graphifyy` (idempotent; `--dry-run` installs nothing and only reports). When `/bootstrap` runs afterwards the **SLIM PATH** kicks in: detect/interview/manifest steps are skipped and only the `CLAUDE_FILL` narrative blocks are left for the model. If `init` is not run, `/bootstrap` performs the full (legacy) flow on its own — backward compatibility is preserved.

### `/bootstrap` steps

The `/bootstrap` command works through these high-level steps (steps 2–4 are skipped if `init` ran):

0. **`/goal` mode requirement.** Bootstrap runs in the native `/goal` mode introduced in Claude Code 2.1.139+. After every turn `/goal`'s evaluator checks the completion gate in Step 8; if anything is missing, Claude continues a new turn to close the gap. The correct invocation: `/goal /bootstrap until "BOOTSTRAP_COMPLETE"`.
1. **Prerequisite checks.** Backlog CLI, `Codebase/` access, and any previous manifest are checked. The graphify CLI presence is confirmed with `which graphify`; if missing, it is installed automatically via `uv tool install graphifyy` (Step 1.1.6 — graphify is a mandatory module; bootstrap stops if installation fails).
2. **Codebase analysis.** Project type, directory structure, subprojects, package manager, test tools, and module candidates are extracted.
3. **Phased interview.** Project, technical preferences, developer profile, and domain rules are clarified.
4. **Manifest generation.** The `Docbase/agentic/project-manifest.yaml` file is created.
5. **File generation.** Commands, agents, hooks, rules, and supporting docs are produced from the manifest. Root documents (`PROJECT.md`, `STACK.md`, `DEVELOPER.md`, `ARCHITECTURE.md`, `WORKFLOWS.md`, `CLAUDE.md`, `onboarding.md`) are written to **Agentbase root**; writing them under `.claude/` is forbidden — the reason is that all models (Claude, Gemini, Antigravity, Codex, Kimi, OpenCode) must be able to read the same root context. The root `CLAUDE.md` pulls in other documents via `@ import <file>.md` lines, establishing the injection chain — Claude reaches all project knowledge by reading a single context file. If target CLI tools were selected, `transform.js` converts the root `CLAUDE.md` into `GEMINI.md` / `AGENTS.md` / `.agents/...` / `.kimi/...` / `.opencode/...` formats — the injection chain is preserved automatically for every model. If Codex was selected, do not run a separate bootstrap; the optional `/codex-verify` step only checks the Codex target surface after transform.
6. **Backlog initialization.** The backlog is created in `Agentbase/backlog/` with starter tasks.
7. **Completion report.** Onboarding guide (`onboarding.md`), extension suggestions, and the git hook activation command are shown: `cd ../Codebase && git config core.hooksPath "$(realpath ../Agentbase/git-hooks/)"`
8. **Completion verification gate.** The Gate A-H + B2 set (manifest, root document paths, root `CLAUDE.md` import chain, `.claude/` runtime files, `.claude-ignore`, no remaining `CLAUDE_FILL` markers, backlog initialized, non-empty content, no Codebase leakage) is checked with bash `test`/`find`/`grep`. On PASS the `BOOTSTRAP_COMPLETE` marker is printed; on FAIL the `/goal` evaluator triggers a new turn, or — in single-turn mode — the user is shown the `/goal` retry command.

Re-runs support `overwrite`, `merge`, and `incremental` scenarios; the Step 8 completion gate runs in every mode.

## Commands

Commands available after bootstrap completes:

This section describes the Claude Code slash-command surface. Other CLI targets generated by `transform.js` receive the same workflows as files or skills; the Codex target does not guarantee native slash-command behavior.

### /task-plan

Deeply analyzes a request to create a backlog task. Scans the codebase, identifies affected files, calculates complexity score, suggests a model, and writes the task to the backlog with acceptance criteria. Splits into multiple tasks if the scope is too large. Creates tasks but does NOT write code — implementation is left to task-hunter.

```
/task-plan "Add avatar upload to user profile page"
/task-plan "Implement API rate limiting"
```

### /task-master

Prioritizes all open tasks using 4-dimensional scoring. Calculates Impact, Risk, Dependency, and Complexity (inverse) scores for each task. Produces a phase-based work plan: Phase 1 critical tasks, Phase 2 important tasks, Phase 3 planned tasks, MANUAL phase for tasks requiring human intervention (excluded from scoring, listed separately at the end of the report). To trigger the MANUAL phase: a directive such as "Prioritize task X manually" must have been given in a previous session and saved to agent memory.

```
/task-master
```

### /task-hunter

Autonomously implements a task from the backlog. Reads the task file, discovers affected files, prepares an implementation plan, writes code, runs tests, commits, and closes the task. Can spawn teammates for parallel work on complex tasks. After completion, suggests the next best task using hot-context scoring — minimizes context switching for vibecode flow.

```
/task-hunter 42          # Single task
/task-hunter 42,43,44    # Multiple tasks in sequence (comma-separated)
/task-hunter auth        # Search task by keyword
```

### /task-conductor

Orchestrates multiple tasks in phases. The default behavior is to produce a plan; code changes and backlog updates happen only in explicit `run` mode. Parallel writes require isolated worktrees/branches, and `all` mode additionally requires `--confirm-all`. It can resume from a state file and stops after 3 consecutive errors in a phase.

```
/task-conductor plan top 5                  # Plan the top 5 highest-priority tasks
/task-conductor plan all                    # Plan all open tasks
/task-conductor plan 3,5,8                  # Plan specific task IDs
/task-conductor plan keyword auth           # Plan tasks matching a keyword
/task-conductor run top 5 --max-parallel 2  # Guarded execution
/task-conductor run all --confirm-all       # Execute all open tasks with explicit confirmation
/task-conductor resume                      # Resume from where it left off
/task-conductor status                      # Read state/lock status
/task-conductor abort                       # Close the active conductor run
```

### /task-review

Reviews recent changes with 3+1 agents. Code Reviewer evaluates overall code quality, Silent Failure Hunter checks for silent errors and flawed error handling, Regression Analyzer assesses the risk of breaking existing functionality. For security, auth, payment, or migration changes, a conditional 4th agent (Devils Advocate) analyzes breaking points from an adversarial perspective. Findings are evaluated through a decision tree: issues to fix are reported, pre-existing issues are recorded in the backlog — never dismissed as "out of scope."

```
/task-review                    # Last commit
/task-review abc1234            # Specific commit
/task-review HEAD~3..HEAD       # Commit range
```

### /auto-review

Diff-based, loop-compatible, and idempotent review. Examines changes since the last commit with hash checking — never reviews the same diff twice. Fixes MINOR findings directly and commits, opens backlog tasks for MAJOR findings. Compatible with an external `/loop` skill or plugin for periodic execution, for example the [superpowers](https://github.com/obra/superpowers) extension — it is not bundled with this repo. Does not re-review its own fix commits in subsequent runs.

```
/auto-review                    # Last commit
/auto-review abc1234            # Specific commit
/auto-review HEAD~3..HEAD       # Commit range
```

### /bug-hunter

Finds the root cause of a bug and fixes it. Takes a bug description, finds related files in the codebase, generates max 3 hypotheses and tests each one. When root cause is found, applies minimal fix, writes regression test, commits, and creates+closes a backlog task. The 3-hypothesis limit prevents diving into endless depth — reports findings and stops if not found in 3 attempts.

```
/bug-hunter "Profile page returns 500 error after user login"
/bug-hunter "Notifications page enters infinite loop"
```

### /bug-review

Reviews a bug fix from 3 different perspectives. Code Reviewer evaluates fix quality and whether it targets the correct root cause, Silent Failure Hunter checks if the fix creates new silent errors, Regression Analyzer assesses the risk of breaking other areas. Infinite loop protection — max 1 iteration.

```
/bug-review                     # Last commit
/bug-review abc1234             # Specific commit
/bug-review HEAD~2..HEAD        # Commit range
```

### /deep-audit

Audits a domain module (auth, profile, payment, messaging, etc.) end-to-end across all layers (API + DB + Mobile + Frontend). Classifies findings in two dimensions: fixes simple ones directly, records complex ones in the backlog.

```
/deep-audit auth        # Audit auth module
/deep-audit profile     # Audit profile module
/deep-audit payment     # Audit payment module
```

### /workflow-update

Compares current workflow configuration with the Codebase's current state. Does NOT perform a full re-bootstrap — only updates changed parts (new module detection, removed dependency handling, subproject changes). Shows a drift report and applies incremental updates with user confirmation.

```
/workflow-update          # Drift report + update with confirmation
```

### /codex-verify

Optional verify/adapt step for the Codex target after `transform.js` runs. In the Claude Code bootstrap session it runs as `/codex-verify`; in the Codex target the same content is generated as the `codex-verify` skill. There is no second Codex bootstrap; this command checks the manifest, `.agents/skills/*/SKILL.md`, and `AGENTS.md`. It does not claim hook runtime parity, and it only reports or suggests narrow adaptations for the Codex target surface.

```
/codex-verify
```

### /memorize

Records learned information from the session to persistent memory. Records only structural information with repetition risk, not routine operations: unexpected traps, user preferences, architectural decisions, surprise discoveries, new tool/dependency notes. Each record includes `Why` (why it matters) and `How to apply` (how to use it) fields.
Never store secrets, tokens, `.env` values, or PII in persistent memory; redact before writing.

```
/memorize
```

### /session-status

Displays all active, idle, and closed Claude Code sessions in table format. Shows each session's PID, current task, tool usage statistics, error count, and teammate status. Use `node bin/session-monitor.js` for a live dashboard.

```
/session-status
```

### /deadcode

Detects unused code in the project and suggests cleanup. Scans for uncalled functions, unimported modules, unreachable branches. Each finding is classified by confidence level: HIGH (no references anywhere), MEDIUM (referenced only from tests), LOW (may be used via dynamic import/reflection). Automatic cleanup is suggested for high-confidence findings.

```
/deadcode
/deadcode api/src/services/    # Specific directory
```

### /api-smoke

Quickly validates API endpoints. Can be run post-deploy or independently at any time. Reads base URL from project manifest (or accepts a custom URL) and runs smoke tests on critical endpoints.

```
/api-smoke                               # Default URL from manifest
/api-smoke staging                       # Staging environment
/api-smoke https://custom-url.com        # Custom URL
```

### Agents

Autonomous agents generated by bootstrap — commands invoke these automatically:

| Agent | Role |
|-------|------|
| `code-review` | General code quality and pattern compliance |
| `regression-analyzer` | Risk of breaking existing functionality |
| `devils-advocate` | Adversarial perspective for security/auth/payment changes (conditional) |
| `frontend-expert` | Frontend architecture and performance decisions |
| `backend-expert` | Backend API design and database decisions |
| `mobile-expert` | Mobile platform-specific decisions |
| `service-documentation` | Post-change documentation update suggestions |

### Modular Commands

These commands are generated based on modules Bootstrap detects — not present in every project:

Command names use `/{variant}-{command}` format to prevent collisions — variant name is added as prefix:

| Command | Module | What It Does |
|---------|--------|-------------|
| `/docker-pre-deploy`, `/coolify-pre-deploy`, `/vercel-pre-deploy` | Deploy | Pre-production push control. Docker/Coolify: compile, test, migration, env sync, Docker build. Vercel: TypeScript, build, env sync, edge-runtime. PASS/FAIL/WARN report. |
| `/docker-post-deploy`, `/coolify-post-deploy` | Deploy | Post-deploy verification: health check, smoke test, rollback guide. Not supported for Vercel due to serverless architecture. |
| `/security-idor-scan` | Security | IDOR vulnerability scan on API endpoints — 5-point control matrix. |
| `/monorepo-review-module <name>` | Monorepo | Audits a module end-to-end — 4 parallel agents, cross-layer analysis. |

## Live Session Monitoring

Track multiple Claude Code sessions running in parallel with a terminal dashboard.

**Prerequisite:** After bootstrap completes, the `session-tracker` hook is copied to `.claude/hooks/`. This hook writes session state to `.claude/tracking/sessions/` on every tool call. The dashboard reads these files. If the `git config core.hooksPath` command from the Bootstrap completion report hasn't been run, or bootstrap hasn't been completed yet, the hook won't be active and the dashboard will appear empty:

```bash
cd Agentbase && node bin/session-monitor.js
```

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ AGENTIC WORKFLOW  [Timeline] [Agent Radar]  2 active 1 idle 17:05           │
├──────────────────────────────────────────────────────────────────────────────┤
│ › ● 45012  TASK-24 Merge conflict management  [implement]  42min            │
│   Action: Edited workflow-lifecycle.skeleton.md                             │
│   Backlog: In Progress · high · AC 1/2  |  no wait  |  err 0  |  mates 1   │
│                                                                              │
│   ○ 45078  TASK-11 Auto-review loop  [waiting]  18min                       │
│   Action: Test failed: npm test                                             │
│   Backlog: In Progress · medium · AC 2/5  |  wait test  |  err 1           │
├──────────────────────────────────────────────────────────────────────────────┤
│ Tab Switch  j/k Select  Enter Detail  c Toggle closed  h Help  q Quit       │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Default `Timeline` view works agent-first: see which agent is on which backlog task, in which phase, and why it's waiting.
- Switch to `Agent Radar` with `Tab`: dense table + event stream.
- Session state is enriched with local `backlog/` files; task status, priority, dependency, and acceptance progress are shown.
- Zero dependencies — pure Node.js + ANSI escape codes.

## Supported Module Families

The template system is modular and only generates content for detected families:

### First-class Support

For these stacks, Bootstrap generates framework-specific hooks, rules, and protection mechanisms:

- **ORM:** Prisma, Eloquent, Django ORM, TypeORM
- **Deploy:** Docker, Coolify, Vercel
- **Backend:** Express, Fastify, NestJS, Laravel, CodeIgniter 4, Django, FastAPI
- **Frontend:** Next.js, React SPA, plain HTML/CSS/JS
- **Mobile:** Expo, React Native, Flutter
- **Knowledge Graph:** Graphify — **mandatory module**, active on every bootstrap (`/g` slash command, BFS query, smart redirection via a PreToolUse hook — suggests `graphify query` instead of grep). The CLI is installed automatically via `uv tool install graphifyy`.
- **Additional:** Monorepo, security scanning, CI/CD, monitoring, API documentation (OpenAPI, GraphQL)

### Generic Bootstrap Support

The following stacks are detected and written to the manifest, but no framework-specific hook/rule/agent templates are generated for them. Bootstrap only produces the core commands (`task-hunter`, `task-review`, etc.) plus general protections such as secret scanning and lockfile protection:

- **Frontend:** Vue, Svelte
- **Backend:** Flask
- **ORM:** Sequelize, Drizzle

Go, Rust, and Java/Kotlin are also auto-detected during existing-project analysis through files such as `go.mod`, `Cargo.toml`, `pom.xml`, `build.gradle`, and `build.gradle.kts`. In greenfield mode, those stacks are chosen explicitly during the interview instead. In both cases they remain in the generic tier: no framework-specific hooks, rules, or agents are generated for them. Stacks not listed above may require manual manifest enrichment.

## Multi-CLI Transform

Claude Code outputs can be transformed to other CLI formats via `transform.js`. Target tools are selected during the bootstrap interview, or existing projects can run directly with the `--targets` flag:

```bash
cd Agentbase && node transform.js ../Docbase/agentic/project-manifest.yaml --targets gemini,antigravity,codex,kimi,opencode
```

| Target CLI | Command Format | Agent Format | Context File |
|-----------|--------------|---------------|----------------|
| **Gemini CLI** | `.gemini/commands/*.toml` | `.gemini/agents/*.md` | `GEMINI.md` |
| **Antigravity 2.0** | `.agents/workflows/*.md` | `.agents/skills/*/SKILL.md` | `GEMINI.md` + `.agents/rules/*.md` |
| **Codex CLI** | `.agents/skills/*/SKILL.md` | — | `AGENTS.md` |
| **Kimi CLI** | `.kimi/skills/*/SKILL.md` | `.kimi/agents/*.yaml` | `.kimi/agents/default-prompt.md` via `default.yaml` |
| **OpenCode** | `.opencode/skills/*/SKILL.md` | `.opencode/agents/*.md` | `.opencode/AGENTS.md` |

The transform process uses `.claude/` output as the canonical source and adapts it to the target CLI's format: invoke syntax (`/` to `$`, `@`, etc.), file path references, and TOML/YAML/Markdown serialization are handled automatically. `generate.js` is never modified — transform runs as a completely separate post-processor.

The Antigravity target is separate from the Gemini CLI target: Gemini receives `.gemini/commands/*.toml`, while Antigravity 2.0 receives commands as `.agents/workflows/*.md`, agents as `.agents/skills/*/SKILL.md`, and rules as `.agents/rules/*.md`. Older `.agent/*` layouts may still be backward-compatible in Antigravity; the default output follows the current `.agents/*` surface.

For Codex, the output is `Agentbase/.agents/skills/*/SKILL.md` and `Agentbase/AGENTS.md`. There is no second Codex bootstrap: `codex` in `manifest.targets` means "transform the Claude canonical output for Codex." The Codex target is a skill/context surface, not a command runtime; no native slash-command guarantee is made. Transform adapts in-text invocation examples to the target syntax, but actual triggering depends on Codex's skill mechanism and session context. After transform, you can optionally run `/codex-verify` to check skill frontmatter, path adaptation, and that no automatic hook parity is claimed. If only Claude Code is selected, transform and Codex verify/adapt are skipped.

## Production-Proven Patterns

Every rule in this template was born from a production experience:

| Pattern | Story |
|---------|-------|
| `prisma db push` ban | 7 tables + 3 columns lost in production |
| 3-hypothesis limit | Preventing endless root cause searching |
| 4D scoring | Consistent, repeatable prioritization |
| 3+1 agent parallel review | Catching silent failures a single agent misses, adversarial perspective for security changes |
| Phase-based orchestration | Plan-first processing with parallel work guarded by isolated worktrees/branches |
| Failure cascade table | Preventing 10+ retry loops on the same error |
| Destructive migration detection | DROP TABLE going to production unnoticed |
| `db-migration-discipline` | Making migration files, dry-run, rollback/down, and destructive scanning mandatory for schema changes |
| Pre-existing finding rule | Preventing security gaps from being dismissed as "out of scope" |

## Development and Validation

```bash
cd Agentbase && npm test                                                    # Test suite
cd Agentbase && node bin/session-monitor.js                                 # Session monitoring

# After bootstrap — runs once manifest has been generated:
cd Agentbase && node generate.js ../Docbase/agentic/project-manifest.yaml --dry-run  # Dry run
cd Agentbase && node transform.js ../Docbase/agentic/project-manifest.yaml --targets gemini,codex --dry-run  # CLI transform
```

### Release and CHANGELOG

```bash
cd Agentbase && node bin/release.js auto            # Auto: determine bump type from commits
cd Agentbase && node bin/release.js patch           # Manual: patch release (1.2.3 → 1.2.4)
cd Agentbase && node bin/release.js minor           # Manual: minor release (1.2.3 → 1.3.0)
cd Agentbase && node bin/release.js major           # Manual: major release (1.2.3 → 2.0.0)
cd Agentbase && node bin/release.js auto --dry-run  # Dry run (no file changes)
```

`release.js` runs sequentially: version bump → generate CHANGELOG → commit → tag → push → create GitHub Release. GitHub Release creation requires `gh` CLI (optional — skipped if not installed).

In GitHub Actions the flow has two stages: a `main` push runs `auto-release.yml` to calculate the bump and create the tag; the resulting `v*` tag then triggers `changelog.yml`, which commits the regenerated `CHANGELOG.md` back to `main`.

```bash
cd Agentbase && node bin/changelog.js --all          # Generate CHANGELOG from all tags
cd Agentbase && node bin/changelog.js --from v1.0.0  # Generate from specific tag onwards
cd Agentbase && node bin/changelog.js --release v2.0.0 --dry-run  # Dry run
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Security

For security vulnerability reports, see [SECURITY.md](SECURITY.md). Do **not** open a public issue — report to hello@varien.software.

## License

This project is licensed under [MIT](LICENSE). Copyright (c) 2026 Varien Software.

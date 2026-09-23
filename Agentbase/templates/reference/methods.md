# Agent Workflow Methods

## Frameworks

| Method | What it does | Source |
|---|---|---|
| **RPI** (Research → Plan → Implement) | 3-stage loop — work with a separate context at each step | Community |
| **BMAD Method** | Full SDLC simulation with 12+ expert AI roles (analyst, architect, PM, dev, QA) | [GitHub](https://github.com/bmad-code-org/BMAD-METHOD) |
| **SPARC** | 5 stages: Specification → Pseudocode → Architecture → Refinement → Completion | [GitHub](https://github.com/ruvnet/sparc) |
| **Spec-Driven Development** | Write a detailed spec first, then have the agent generate code from the spec | [GitHub Blog](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/) |
| **PDCA** (Plan-Do-Check-Act) | Deming cycle adapted for AI code generation | [GitHub](https://github.com/kenjudy/pdca-code-generation-process) |
| **Three Developer Loops** | Inner (seconds), Middle (hours), Outer (weeks) — control at different time scales | [IT Revolution](https://itrevolution.com/articles/the-three-developer-loops-a-new-framework-for-ai-assisted-coding/) |
| **AI-Augmented Scrum** | Sprint tasks are classified as "human" vs "agent-suitable" | [Scrum.org](https://www.scrum.org/resources/blog/ai-augmented-scrum-framework-when-half-your-team-autonomous-agents) |

## Autonomous / Loop Patterns

| Method | What it does |
|---|---|
| **Ralph Wiggum Loop** | Autonomous task loop that repeats at set intervals |
| **AECA** (Autonomous Error Correction) | Error → fix → test → repeat loop |
| **Agentic Kanban** | Each backlog item is auto-assigned to an agent and tracked on a board |
| **Self-Improving Agent Loop** | Agent improves itself each iteration via commit + diff analysis |
| **Plan-Act-Reflect** | Plan → code → summarize what worked/did not, repeat the loop |
| **Headless / CI Agent** | Autonomous, terminal-less pipeline work via `claude -p "task" --headless` |
| **Codex Full Auto Mode** | Fully autonomous — plan, edit, build, fix errors, no permission prompts. Inside a sandbox |

## Multi-Agent Patterns

| Method | What it does |
|---|---|
| **Teammate Mode** | Agent works as an equal-level teammate |
| **Cross-Model Review** | One model writes, a different model reviews (Claude write → Codex review) |
| **Orchestrator Pattern / Conductor** | Main agent plans; sub-agents work in parallel in worktrees |
| **Boomerang Pattern** | Task is split into sub-tasks; each is delegated to an expert mode; results return |
| **Agent Swarm** | Autonomous agents without central control; hand off work via protocols |
| **Agent Teams** | Multiple Claude instances run in parallel with file-based mailbox communication |
| **Claude Squad** | Multi-agent session management in tmux panes |
| **Fan-Out / Gather** | Multiple agents work from different angles at once; results are merged |
| **Generator-Critic** | One agent produces; another independent agent evaluates against criteria |
| **Master-Clone** | Main agent creates clones, solves from different perspectives, picks the best |
| **Model Musical Chairs** | Switch models when stuck (Claude → GPT-4o → Gemini) |
| **Context Cycling** | On long tasks, periodically open a new context and transfer a summary |

## Quality / Review Patterns

| Method | What it does |
|---|---|
| **Dual-Pass Development** | First agent writes; second agent (clean context) reviews |
| **Adversarial Testing** | One agent writes code; another tries to break it |
| **Guardian Pattern** | Watchdog agent continuously monitors code quality |
| **Red-Green TDD for Agents** | Classic TDD agent version — red test first, then code that passes |
| **TDFlow** | Human writes tests; agent produces code that passes them |

## Planning / Technical Patterns

| Method | What it does |
|---|---|
| **Ultrathink / Megathink** | Deep analysis with extended thinking — up to 31,999 token thinking budget |
| **Compact Pattern** | Proactive compression at ~70% context fill — manual instead of automatic (~90%) |
| **Context Engineering** | Systematically design all information flow to the model (RAG, memory, compression) |
| **Decision Journal (ADR)** | Every architecture decision is recorded per the `backlog/decisions/README.md` contract |
| **Waterfall in 15 Minutes** | Fast but structured planning before coding: brainstorm → spec → plan |
| **Shadow Git Checkpointing** | Hidden checkpoint on every change — instant rollback on error (implement: `templates/core/hooks/git-checkpoint.js` + `/rollback` command) |

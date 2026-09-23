# Third-Party Extension References

This Markdown file is a human-readable quick-reference catalog.
The Bootstrap extension recommendation system reads `extensions-registry.yaml` as its structured source.

## Scope Difference (YAML ↔ MD)

The two files serve **different purposes** and are **not required** to stay in 1:1 sync:

| File | Purpose | Scope |
|-------|------|--------|
| `extensions-registry.yaml` | Bootstrap programmatic source | Extensions to auto-recommend (~15 items, with trigger rules + install commands) |
| `extensions-registry.md` (this file) | Human-readable expanded catalog | Notable community extensions (~50 items — manual install reference) |

**Rule:** Every extension added to YAML must also appear in the MD; but not every extension listed in the MD must enter YAML. Extensions added to YAML should have a meaningful **automatic trigger** (e.g. consistent match with a module/stack/condition). Otherwise they create recommendation spam.

---

## Addition Template

Use this Markdown table format when adding a new reference.
Also update `extensions-registry.yaml` for extensions that should enter the Bootstrap recommendation system:

```markdown
| Name | Repo | Agent | Category | Description |
|---|---|---|---|---|
| **Name** | [repo-name](https://github.com/org/repo) | Claude/Gemini/Codex/All | Category | One-line description |
```

---

## Skills / Commands

| Name | Repo | Agent | Description |
|---|---|---|---|
| **Superpowers** | [obra/superpowers](https://github.com/obra/superpowers) | Claude | Structured development lifecycle for planning, review, TDD, and debug |
| **Trail of Bits Security** | [trailofbits/skills](https://github.com/trailofbits/skills) | Claude | Professional skill collection for security research and vulnerability detection |
| **Claude Command Suite** | [qdhenry/Claude-Command-Suite](https://github.com/qdhenry/Claude-Command-Suite) | Claude | 216+ slash commands, 12 skills, 54 agents |
| **SkillKit** | [rohitg00/skillkit](https://github.com/rohitg00/skillkit) | All | Write once, distribute to 44 agents — skill package manager |
| **Awesome Agent Skills** | [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) | All | 500+ official and community skills |
| **DevKit** | [ngxtm/devkit](https://github.com/ngxtm/devkit) | All | 414+ skills, 38 agents, 57 commands |
| **Claude Scientific Skills** | [K-Dense-AI/claude-scientific-skills](https://github.com/K-Dense-AI/claude-scientific-skills) | Claude | Collection of 140 ready scientific skills |
| **Planning with Files** | [OthmanAdi/planning-with-files](https://github.com/OthmanAdi/planning-with-files) | Claude | Manus-style persistent markdown planning skill |
| **Claude Code Guide** | [zebbern/claude-code-guide](https://github.com/zebbern/claude-code-guide) | Claude | Setup, SKILL.md, agents, commands, workflows guide |
| **Oh My Claude Code** | [Yeachan-Heo/oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode) | Claude | 28 agents, 28 skills, delegation-first architecture, zero learning curve |

## Workflow Plugins

| Name | Repo | Agent | Description |
|---|---|---|---|
| **Ralph Playbook** | [ClaytonFarr/ralph-playbook](https://github.com/ClaytonFarr/ralph-playbook) | Claude | Ralph Wiggum autonomous development guide |
| **RIPER Workflow** | [tony/claude-code-riper-5](https://github.com/tony/claude-code-riper-5) | Claude | Research, Innovate, Plan, Execute, Review |
| **Claude CodePro** | [maxritter/claude-codepro](https://github.com/maxritter/claude-codepro) | Claude | Spec-driven workflow and TDD enforcement |
| **AB Method** | [ayoubben18/ab-method](https://github.com/ayoubben18/ab-method) | Claude | Spec-driven workflow that splits large problems across sub-agents |

## Multi-Agent Orchestration

| Name | Repo | Agent | Description |
|---|---|---|---|
| **Parallel Code** | [johannesjo/parallel-code](https://github.com/johannesjo/parallel-code) | All | Run Claude, Codex, and Gemini side by side in separate worktrees |
| **Claude Squad** | [smtg-ai/claude-squad](https://github.com/smtg-ai/claude-squad) | Claude | Manage multiple Claude Code instances in tmux |
| **Claude Swarm** | [parruda/claude-swarm](https://github.com/parruda/claude-swarm) | Claude | Start linked sessions with agent swarms |
| **agtx** | [fynnfluegge/agtx](https://github.com/fynnfluegge/agtx) | All | Multi-session AI coding terminal manager |
| **Agent Orchestrator** | [ComposioHQ/agent-orchestrator](https://github.com/ComposioHQ/agent-orchestrator) | All | Task planning, agent assignment, CI fixing |
| **OpenAI Symphony** | [openai/symphony](https://github.com/openai/symphony) | Codex | Watches a task board → spawns agents → writes code → opens PRs → passes CI. OpenAI implementation of Agentic Kanban |
| **ccswarm** | [nwiizo/ccswarm](https://github.com/nwiizo/ccswarm) | Claude | Multi-agent orchestration with git worktree isolation |
| **Claude Code Flow** | [ruvnet/claude-code-flow](https://github.com/ruvnet/claude-code-flow) | Claude | Production-ready multi-agent orchestration system |
| **Agents (wshobson)** | [wshobson/agents](https://github.com/wshobson/agents) | Claude | Smart automation and multi-agent orchestration |

## Memory / Context

| Name | Repo | Agent | Description |
|---|---|---|---|
| **Memorix** | [AVIDS2/memorix](https://github.com/AVIDS2/memorix) | All | Shared memory across agents — MCP-based |
| **Claude-SuperMemory** | [supermemoryai/claude-supermemory](https://github.com/supermemoryai/claude-supermemory) | Claude | Persistent memory across sessions, team-wide sharing |
| **Claude Cognitive** | [GMaN1911/claude-cognitive](https://github.com/GMaN1911/claude-cognitive) | Claude | Working memory via attention-based file injection |
| **Gemini Beads** | [thoreinstein/gemini-beads](https://github.com/thoreinstein/gemini-beads) | Gemini | Git-backed memory system |
| **Graphify** | [safishamsi/graphify](https://github.com/safishamsi/graphify) | All | Turn any folder (code, docs, articles, images, videos) into a queryable knowledge graph |
| **RTK** (Rust Token Killer) | [rtk-ai/rtk](https://github.com/rtk-ai/rtk) | All | CLI proxy that rewrites bash commands (git, ls, cat, etc.) via hooks for ~60–90% token savings on dev operations |

## Code Quality / Review

| Name | Repo | Agent | Description |
|---|---|---|---|
| **Code Review Plugin** | [anthropics/claude-code](https://github.com/anthropics/claude-code) | Claude | Official multi-agent PR review extension |
| **agnix** | [avifenesh/agnix](https://github.com/avifenesh/agnix) | Gemini | Configuration auditor with 156 validation rules |
| **cc-tools** | [Veraticus/cc-tools](https://github.com/Veraticus/cc-tools) | Claude | High-performance hooks written in Go |

## Security

| Name | Repo | Agent | Description |
|---|---|---|---|
| **Codex Security** | [openai/codex-security](https://openai.com/index/codex-catches-more-than-code/) | Codex | Reads the repo, builds a threat model, analyzes attack surface, detects vulnerabilities, verifies in a sandbox, and suggests patches |
| **Security Scanner** | [harish-garg/security-scanner-plugin](https://github.com/harish-garg/security-scanner-plugin) | Claude | Vulnerability scanning using GitHub data |
| **Parry** | [vaporif/parry](https://github.com/vaporif/parry) | Claude | Prompt-injection scanner, data-leak detection |
| **Gemini Security** | [gemini-cli-extensions/security](https://github.com/gemini-cli-extensions/security) | Gemini | Official Google security extension |

## DevOps / CI-CD

| Name | Repo | Agent | Description |
|---|---|---|---|
| **Claude Code Action** | [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action) | Claude | Official GitHub Action — PR review, security audit |
| **Container Use** | [dagger/container-use](https://github.com/dagger/container-use) | All | Secure container development environments |
| **Run Gemini CLI Action** | [google-github-actions/run-gemini-cli](https://github.com/google-github-actions/run-gemini-cli) | Gemini | Official GitHub Action |
| **Rulesync** | [dyoshikawa/rulesync](https://github.com/dyoshikawa/rulesync) | All | Auto-generate configs for various AI agents |

## Project Management

| Name | Repo | Agent | Description |
|---|---|---|---|
| **Claude Task Master** | [eyaltoledano/claude-task-master](https://github.com/eyaltoledano/claude-task-master) | Claude | AI-powered task management system |
| **CCPM** | [automazeio/ccpm](https://github.com/automazeio/ccpm) | Claude | Parallel agent management with GitHub Issues + worktrees |
| **Backlog.md** | [MrLesk/Backlog.md](https://github.com/MrLesk/Backlog.md) | All | Markdown-based project planning |

## Awesome Lists (Source Lists)

| Name | Repo | Agent | Description |
|---|---|---|---|
| **awesome-claude-code** | [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | Claude | Skills, hooks, commands, and extension list |
| **awesome-claude-code-toolkit** | [rohitg00/awesome-claude-code-toolkit](https://github.com/rohitg00/awesome-claude-code-toolkit) | Claude | 135 agents, 35 skills, 42 commands, 120 extensions |
| **awesome-gemini-cli** | [Piebald-AI/awesome-gemini-cli](https://github.com/Piebald-AI/awesome-gemini-cli) | Gemini | Gemini CLI tools and extensions |
| **awesome-mcp-servers** | [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) | All | 1200+ MCP servers |
| **public-apis** | [public-apis/public-apis](https://github.com/public-apis/public-apis) | All | 1400+ free public API catalog — reference for API selection in integration, prototype, and greenfield projects |

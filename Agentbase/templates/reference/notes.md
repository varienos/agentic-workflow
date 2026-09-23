# Notes

## Lessons Learned

1. Unnecessary MCP tools inflate context. If the agent has bash access and the job can be done via CLI, do not add MCP. Evaluate MCP per project unless there is a major need.
2. Agent discipline is enforced in 3 layers:
   - **Context rules** (write in CLAUDE.md) → solves ~80%, applies immediately
   - **Hooks** (pre-commit, lint-staged) → system enforces, agent cannot bypass; set up when the project starts
   - **Review agent** (second agent checks) → quality guarantee; add when architecture matures
3. Hook scenarios (to set up when the project starts):
   - **pre-commit** → Run lint + formatter; block commit on failure
   - **pre-commit** → Syntax validation by file type (php -l, tsc --noEmit, python -m py_compile)
   - **pre-commit** → Warn if functions lack docblock/docstring
   - **pre-commit** → Block committing sensitive files (.env, credentials)
   - **pre-push** → Run test suite; block push if tests are broken
   - **pre-push** → Run static analysis (PHPStan, mypy, ESLint --max-warnings=0)
   - **post-merge** → Auto-install when dependencies change (composer install, npm install)
   - **commit-msg** → Validate commit message format (conventional commits: feat:, fix:, docs:, etc.)
   - Tools: `husky` + `lint-staged` (JS/TS), `pre-commit` framework (Python), `captainhook` (PHP)
4. Git hook types:

   | Hook | When it runs | Example scenario |
   |---|---|---|
   | `pre-commit` | Immediately before a commit is created | Lint, format, syntax check, block sensitive files |
   | `prepare-commit-msg` | Before the commit message editor opens | Auto-prefix from branch name (`feature/login` → `feat: ...`) |
   | `commit-msg` | After the commit message is written | Validate conventional commit format |
   | `post-commit` | After a successful commit | Send notification, write log |
   | `pre-push` | Before push | Run test suite and static analysis |
   | `post-merge` | After merge completes | Auto-install when dependencies change |
   | `post-checkout` | When switching branches | Update env vars, clear cache |
   | `pre-rebase` | Before rebase starts | Block rebase on protected branches |
   | `post-rewrite` | After commit amend or rebase | Run tests, re-trigger hooks |

5. Do not let the developer pick every skill/plugin — let Opus decide. Loading everything inflates context and hurts agent performance. During Bootstrap, Opus should select only what is needed from extensions-registry.yaml; extensions-registry.md is a human-facing quick reference. Few and correct > many and unused.
6. An agent cannot make architecture decisions. It can write code, tests, and reviews, but it cannot say "this must not exist in this system" or independently notice unexpected nonsense. Architecture decisions, boundaries, and "no"s belong to humans. The agent applies the given architecture — it does not design it. Someone without fundamentals cannot build a correct product with AI, and even if they do, it will not be sustainable.
7. An agent must not stop with "test fail, not my change." Detect pre-existing failures via baseline comparison, record them in the backlog, and continue its own work. Pre-existing failures must be tracked as separate tasks — otherwise they vanish and nobody fixes them.

---

## Skill vs Command vs Agent — Concept Comparison

### Claude Code

| Concept | What? | Trigger | Context | When? |
|---|---|---|---|---|
| **Command** | Slash command (`/commit`) | User manual | Inside main context | Repeating, short, single-step work |
| **Skill** | `.md` instruction file | Automatic or via `@` | Injected into main context | Teaching "how to do it" |
| **Agent** | Independent subprocess | Claude spawns itself | Its own separate context | Long, isolated, parallel work |

### Gemini CLI

| Concept | What? | Trigger | Context | When? |
|---|---|---|---|---|
| **Slash Command** | `.toml` files (`.gemini/commands/`) | User via `/` | Main context | Namespace-capable, parameterized, can run shell |
| **Agent Skill** | `SKILL.md` (`.gemini/skills/`) | Lazy-loading — via `activate_skill` when needed | Injected into main context | YAML frontmatter + Markdown, auto-scanned |
| **Subagent** | `.gemini/agents/*.md` | Gemini triggers | Separate context (experimental) | Not parallel yet; sequential |

Gemini TOML produced by transform is prompt-only; shell exec is not added. If you write manual `.gemini/commands/*.toml`, shell exec should only use allowlist-safe commands that are quoted, do not interpolate raw user input, and do not expose secrets.

### Antigravity 2.0

| Concept | What? | Trigger | Context | When? |
|---|---|---|---|---|
| **Workflow** | Markdown file (`.agents/workflows/*.md`) | User via `/workflow-name` | Main agent trajectory | Repeating agent steps and SOPs |
| **Agent Skill** | `SKILL.md` (`.agents/skills/*/SKILL.md`) | Lazy-loading — when needed | Injected into main context | Project-specific methods and expertise packages |
| **Workspace Rule** | Markdown file (`.agents/rules/*.md`) | Always-on/model/glob/manual activation | Prompt-level persistent rule | Project rules, security, and work discipline |

### Codex CLI

| Concept | What? | Trigger | Context | When? |
|---|---|---|---|---|
| **Slash Command** | Built-in + custom prompts | User via `/` or `$` | Main context | Also reaches skills via `/skills` |
| **Agent Skill** | `SKILL.md` (`.agents/skills/`) | Progressive disclosure — automatic | Injected into main context | Interactively creatable via `$skill-creator` |
| **Multi-agent** | Enabled via `/experimental` | Codex triggers | Separate context (experimental) | Supports CSV-based parallel task distribution |

Codex product capabilities and this repo's transform output are evaluated separately: The agentic-workflow Codex target is a skill/context surface; it does not guarantee native slash commands, does not automatically carry Claude Code hook runtime, and does not claim automatic hook parity.

### Mapping Summary

| Claude Code | Gemini CLI | Antigravity 2.0 | Codex CLI |
|---|---|---|---|
| `CLAUDE.md` | `GEMINI.md` | `GEMINI.md` + `.agents/rules/*.md` | `AGENTS.md` |
| `~/.claude/CLAUDE.md` (global) | `~/.gemini/GEMINI.md` | `~/.gemini/GEMINI.md` + project `.agents/` | `~/.codex/AGENTS.md` |
| Skill: plain `.md`, load via `@` | Skill: `SKILL.md` + YAML frontmatter, lazy-load | Skill: `.agents/skills/*/SKILL.md` | Skill: `SKILL.md` + YAML frontmatter, progressive |
| Agent: native parallel, production-ready | Subagent: experimental, sequential | Dynamic subagents + workflows | Multi-agent: experimental, CSV parallel |

### Important Differences

- **Gemini** — Strongest custom slash command system (`.toml`, namespace); shell exec only for allowlist-safe commands
- **Antigravity** — Current default `.agents/rules` and `.agents/skills`; workflows are invoked as Markdown slash commands
- **Codex** — Interactive skill creation via `$skill-creator`; in this repo target the output is `.agents/skills/*/SKILL.md` + `AGENTS.md` skill/context surface
- **Claude** — Sub-agents run natively in parallel (experimental elsewhere); simplest skill structure (plain `.md`)

---

## Architecture Principles

- **SOLID** — Single responsibility, open/closed, Liskov, interface segregation, dependency inversion
- **DRY** — Do not repeat the same code in more than one place
- **Separation of Concerns** — Controller → flow, Service → business logic, Repository/Model → data access
- **Loose Coupling / High Cohesion** — Reduce dependencies; give each module a single responsibility
- **Clean Code** — Readability, clear naming, small functions, understandable flow
- **Convention over Configuration** — Prefer the framework's standard path
- **Defensive Programming** — Account for bad input, null data, and unexpected states

---

## Coding Standards

| Concept | What it does | Example tools |
|---|---|---|
| **Linter** | Detects bad/risky code patterns | ESLint, Pylint |
| **Formatter** | Auto-formats code style | Prettier, Black |
| **Static Analyzer** | Finds type errors, dead code, security issues | PHPStan, mypy |

### Tools by Language

| Language | Formatter | Linter / Analyzer |
|---|---|---|
| **JavaScript / TypeScript** | Prettier, Biome | ESLint, Biome |
| **PHP** | PHP-CS-Fixer | PHP_CodeSniffer, PHPStan, Psalm |
| **Python** | Black, Ruff | Flake8, Pylint, Ruff, mypy |
| **Go** | `gofmt` _(official)_ | golangci-lint |
| **Java** | Google Java Format | Checkstyle, PMD, SpotBugs |
| **C# / .NET** | `dotnet format` | StyleCop, Roslyn Analyzers |
| **Ruby** | RuboCop | RuboCop |
| **Rust** | `rustfmt` _(official)_ | Clippy _(official)_ |
| **CSS / SCSS** | Prettier | Stylelint |
| **HTML** | Prettier | HTMLHint |
| **SQL** | sqlfmt | sqlfluff |

### Integration Points

- **IDE** → save-on-format
- **Pre-commit hook** → `husky`, `lint-staged`
- **CI pipeline** → automatic check on every PR

---

## Autoloading Standards — PSR-4

- Automatic class loading via namespace → directory mapping
- Integrates with Composer `autoload.psr-4`
- Standard approach for modern PHP projects

---

## Technical Contract

| Title | Description |
|---|---|
| Purpose | Create a shared, clear communication standard between system components |
| Scope | API endpoints, request/response shapes, data models, service methods, event structures |
| Benefit | Reduces misunderstanding, speeds development, eases testing |
| Risk if missing | Integration errors, field mismatches, unclear error handling, harder maintenance |
| Core elements | Field names, data types, required fields, validation rules, error format, versioning |
| Documentation form | Swagger / OpenAPI, Postman Collection, Markdown technical docs, ERD and schema dumps |

---

## Learnings (Best Practices)

Source: [shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice)

- Always use plan mode; give Claude a path it can verify
- Use Git Worktrees for parallel development
- Plan repeating tasks for up to 3 days with `/loop`
- Do code review — new context windows can catch bugs the first agent missed
- Build stage-by-stage plans and put tests in every stage
- Keep CLAUDE.md under 200 lines when possible
- Prefer commands over sub-agents for workflows
- Feature-specific sub-agent + skills > generic QA/backend agent
- For small jobs, vanilla Claude Code works better than complex workflows

> **Note:** Methods → moved to [methods.md](methods.md); extensions → [extensions-registry.md](../extensions-registry.md).

---

## Learnings (Throughput Gains)

The biggest throughput gains do not come from writing better prompts alone. What actually moves the needle: multi-agent orchestration, persistent memory, structured planning, and domain-specific skills.

---

## Resources

- Claude Native Memory — https://code.claude.com/docs/en/memory
- Claude Native Scheduled Tasks — https://code.claude.com/docs/en/scheduled-tasks
- Loot Drop — https://www.loot-drop.io/ _(startup-themed AI agent guide)_
- Can I Run — https://www.canirun.ai/ _(which LLM models can your machine run? VRAM, performance, token-speed estimates — practical for local AI)_
- Cloudflare Browser Rendering API — https://developers.cloudflare.com/browser-rendering/ _(crawl a site with a single API call, Markdown/JSON output — for RAG and AI data collection. Requires Workers Paid plan)_
- Awesome Agent Skills — https://github.com/VoltAgent/awesome-agent-skills _(500+ skills, Claude/Gemini/Codex compatible — check before writing a skill)_

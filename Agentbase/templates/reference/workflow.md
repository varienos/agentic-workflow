# Workflow

## Development Flow

```
Bootstrap → Planner → Hunter → Review (opt.) → Quality → Push
    │           │          │          │               │        │
    │           │          │          │               │        └── pre-push hook:
    │           │          │          │               │            final gate (lint, test, standards)
    │           │          │          │               └── Meets standards?
    │           │          │          │                   (naming, docblock, lint, conventions)
    │           │          │          └── Does the code work correctly?
    │           │          │              (logic, edge case, test)
    │           │          └── Applies the task
    │           └── Creates the task (method + model + review decision)
    └── Project init (interview → workspace → backlog → first tasks)
```

| Step | Who? | Command | What it does | Required? |
|---|---|---|---|---|
| **Bootstrap** | Opus-class | `/bootstrap` | Interview, workspace creation, backlog init, extension selection | Once at project start |
| **Master** | Opus-class | `/task-master` | Scores the backlog and produces a priority order | Optional |
| **Planner** | **Opus-class (high reasoning)** | `/task-plan` | Creates task, deep analysis, model suggestion, scope split, review decision | Every task |
| **Hunter** | Sonnet-class | `/task-hunter` | Applies the task — writes code, writes tests, verifies, commits | Every task |
| **Review** | Sonnet-class (clean) | `/task-review` | 3+1 agents: code-reviewer + silent-failure-hunter + regression-analyzer + conditional devils-advocate | Optional — planner decides |
| **Quality** | Sonnet-class (clean) | — | Standards compliance: CONVENTIONS.md, naming, docblock, lint | Auto after Review; can also run alone |
| **Bug Hunter** | Sonnet-class | `/bug-hunter` | Find root cause, fix, write test, commit | When a bug report arrives |
| **Bug Review** | Sonnet-class (clean) | `/bug-review` | Parallel 3 agents: quality + silent failure + regression | After bug fix |
| **Deep Audit** | Sonnet-class (parallel) | `/deep-audit` | End-to-end module audit — parallel specialist agents, two-axis evaluation; fix if simple, backlog if complex | When a module matures or optional |
| **Pre-push hook** | System | — | Final gate — lint, test suite, static analysis | Always required |

> **Quality trigger rules:**
> - If Review was triggered → Quality triggers automatically
> - Even if Review was not triggered → Quality can run alone (planner decision)
> - In both cases → Pre-push hook enforces standards as the final gate

---

## Task Planning

Before starting every task, decide two things:
1. **Method** — which workflow method fits the task type _(see [methods.md](methods.md))_
2. **Model** — which model fits the task complexity _(see [models.md](models.md))_ — critical for token/cost optimization

| Task type | Suggested method |
|---|---|
| New feature development | RPI (Research → Plan → Implement) |
| Large / multi-file feature | Orchestrator Pattern or Fan-Out/Gather |
| Spec clear, code unclear | Spec-Driven Development |
| Bug fix | AECA (error → fix → test → verify) |
| Autonomous repeating task | Ralph Wiggum Loop |
| Code quality / review | Dual-Pass, Cross-Model Review, or Generator-Critic |
| Complex problem, unclear solution | Ultrathink + Plan-Act-Reflect |
| Long-running task (context runs out) | Context Cycling + Compact Pattern |
| CI/CD pipeline automation | Headless / CI Agent |
| Agent stuck / low-quality output | Model Musical Chairs |
| Full project lifecycle (SDLC) | BMAD Method or SPARC |
| Sprint planning (which tasks suit an agent?) | AI-Augmented Scrum |

---

## Version Control / Git Workflow

- `main` / `master` → near production
- `develop` → development
- `feature/...` → new feature
- `hotfix/...` → urgent fix

---

## Merge Conflict Management

In multi-agent/worktree work, conflicts are inevitable. 3-layer defense:

### Layer 1: Prevention (Planner level)

- Planner must do **file impact analysis** when creating a task
- Tasks that touch the same file must not be assigned to different worktrees at the same time
- Add an `affected_files` field to task metadata — planner fills it; orchestrator checks for collisions

### Layer 2: Detection (Hook/script level)

```bash
# Pre-push hook: trial merge with main
git fetch origin main
git merge-tree $(git merge-base HEAD origin/main) HEAD origin/main

# If conflict → push is blocked, agent is warned
```

- Agent runs a trial merge with main before push
- If a conflict is detected, push is blocked

### Layer 3: Resolution (Agent behavior)

When a conflict is detected, the agent has 3 options:

| Situation | Action |
|---|---|
| **Simple conflict** (same file, different sections) | Agent auto-resolves, runs tests, continues |
| **Complex conflict** (same lines, logic clash) | Agent stops, calls a human, opens a `CONFLICT` backlog task |
| **Own change is unimportant** | Agent reverts its change, updates from main, re-applies the task |

### Agent discipline rule

- At the start of every task: `git pull origin main` — start current
- Merge as soon as the task finishes — do not leave it open long
- Trial merge before push is mandatory

---

## Agent Error Tracking

Errors made by agents should be tracked in `shared/errors.md`. Goal: prevent repeats and learn from mistakes.

### Error Record Format

```markdown
## [ERR-001] Short title

- **Date:** 2026-03-15
- **Agent:** Claude Sonnet-class
- **Task:** Login endpoint refactoring
- **Error:** Wrote a DB query directly in the service layer; skipped the repository pattern
- **Impact:** Architecture violation; separation of concerns broken
- **Root cause:** Repository pattern rule was not defined in CLAUDE.md
- **Fix:** Added repository pattern rule to CONVENTIONS.md
- **Lesson:** If architecture rules are not stated explicitly, the agent defaults to the shortest path
```

### Error Categories

| Category | Description |
|---|---|
| `ARCHITECTURE` | Layer violation, skipped pattern, wrong dependency |
| `QUALITY` | Missing test, forgotten docblock, lint error |
| `LOGIC` | Wrong business-rule application, missed edge case |
| `CONTEXT` | Agent misunderstood the project, changed the wrong file |
| `SECURITY` | Sensitive data leak, missing input validation |
| `CONVENTION` | Naming error, format mismatch, wrong commit message |

### Process

1. When an error is noticed, add it to `shared/errors.md` in the record format
2. Analyze root cause — was the agent wrong, or was context missing?
3. Apply the fix (usually update CLAUDE.md or CONVENTIONS.md)
4. Extract the lesson and prevent repeats

> **Warning:** Do not make this file bureaucratic. Do not record every tiny typo or formatting mistake — record only **structural errors with repeat risk**. The goal is learning, not an archive.

---

## Agent Development Discipline

- **Do not flatter.** If there is an error, say so; if an idea is bad, say so; if code quality is low, say so. Tell the developer what they need to know, not what they want to hear. Flattery is the problem source developers miss longest and notice latest.
- **Architecture decisions belong to humans.** An agent can write code, write tests, and review — but it cannot set architecture boundaries, say "this must not happen," or independently notice and fix unexpected nonsense. The agent applies the given architecture; it does not design it. The planner creates tasks, but architecture changes are not made without developer approval.
- When each task completes, write tests as needed and verify they pass
- Before every file save, run syntax validation appropriate to the file type (lint/parse)
- Add a standard description (docblock/docstring) for every function
- Prioritize readability — clear naming, small functions, clear flow

---

## API Development

- OpenAPI (Swagger) definition is mandatory for every API endpoint — write the spec first, then generate or verify code
- API tests should be automatic — auto-generate tests from the OpenAPI spec (Schemathesis, Dredd, etc.)
- Postman Collection export is mandatory — share an up-to-date collection with every API version
- Order: **OpenAPI spec → Code → Automated test → Postman export**

---

## Test / Quality Assurance

_"Does what we built actually work correctly?"_

### TDD — Test Driven Development

1. Write the test first
2. Write just enough code to pass the test
3. Refactor

This model is especially strong for critical business logic.

### BDD — Behavior Driven Development

Business rules are written in behavior language: Given → When → Then

It bridges the business unit and the technical team.

### Test Pyramid

- Many unit tests
- Fewer integration tests
- Even fewer E2E tests

### Full Loop: Code Change → Test → Commit → CI

**3 defense lines:**

| Line | When | For whom | Behavior |
|---|---|---|---|
| **test-enforcer hook** | Every Edit/Write | Agent | Instructs via systemMessage to write/update tests. Asks to create a test file if missing, or update if present |
| **Verification gate + pre-commit** | At commit | Agent + Human | Agent: syntax → build → run tests, sets TESTS_VERIFIED=1. Human: hook runs tests + baseline comparison |
| **CI pipeline** | Push/PR | Everyone | Parallel jobs; fail → merge blocked. Last defense line |

**Pre-existing failure handling:**

When the agent hits a test failure:
1. `git stash` → run baseline tests → `git stash pop`
2. Is baseline also broken? → **Yes:** pre-existing failure; create a backlog task; continue commit with TESTS_VERIFIED=1
3. Baseline OK but your change breaks it? → **Fix**, re-test

```
Agent found a pre-existing failure
  → Backlog task: "Pre-existing test failure: XyzTest"
  → Next task-hunter run picks this task up
  → When fixed, baseline is clean
```

**Old vs new behavior:**

| Old | New |
|---|---|
| Agent: "Test fail, not my change, cannot commit" → STOPS | Agent: baseline check → pre-existing? → backlog task → CONTINUES |
| Pre-existing failure vanishes; nobody fixes it | Pre-existing failure enters backlog → tracked → fixed |

---

## Deployment / DevOps / Go-Live

_"How do we ship this safely and sustainably?"_

| Concept | What it is for |
|---|---|
| CI | Automatic test/build when code merges |
| CD | Automatic deployment |
| IaC | Manage infrastructure as code |
| Containerization | Environment consistency |
| Rollback | Pull back a bad release |

### Principles

- Small and frequent deploys
- Environment consistency
- Automated test + build
- Observability

### Tools

- **Docker** → packaging the app
- **CI/CD pipelines** → GitHub Actions, GitLab CI, etc.
- **Env management** → `.env`, secrets
- **Blue-Green / Canary Deployment** → lower-risk cutover

---

## Maintenance / Monitoring / Continuous Improvement

_"Is the system healthy in production, and how do we improve it?"_

| Concept | What it is for |
|---|---|
| Monitoring | Is the system up? |
| Logging | Analyzing errors |
| APM | Observing performance |
| SLA / SLO / SLI | Service-level targets and measurement metrics |
| Postmortem | Why did it fail, how do we prevent a repeat? |

You cannot manage what you do not measure.

---

## Quick Mapping — Which Principle Matters at Which Stage?

| Stage | Most critical approach / principle |
|---|---|
| Needs analysis | MVP, YAGNI, clear scope |
| Planning | Agile / Scrum / Kanban, backlog management |
| Design | SOLID, DRY, SoC, correct architecture |
| Development | Clean Code, code review, refactoring |
| Test | TDD, test pyramid, regression |
| Deployment | CI/CD, automation, rollback |
| Maintenance | Monitoring, logging, postmortem |

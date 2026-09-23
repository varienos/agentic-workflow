# Backlog Management — Agentic Workflow Template

This project tracks tasks and technical debt with **Backlog.md**.
Every task is a separate markdown file under `backlog/tasks/`.

> **Location:** In target projects, backlog is created inside `Agentbase/backlog/`.
> Bootstrap runs `backlog init` with Agentbase as CWD.
> This repo's own backlog (for template development) stays at the root.

## Quick Start

### Install
If needed: `npm i -g backlog.md` or `brew install backlog-md`

### Core Commands
| Command | Description |
|---------|-------------|
| `backlog board` | Kanban board (terminal) |
| `backlog browser` | Web UI |
| `backlog task list` | List all tasks |
| `backlog task list --priority high` | Filter by priority |
| `backlog task list -s "In Progress"` | Filter by status |
| `backlog search "authentication" --type task --plain` | Search tasks |
| `backlog task create "Title" -d "Description" --priority high -l backend` | Create task |
| `backlog task edit N --ac "Criterion"` | Add acceptance criterion |
| `backlog task N` | Task detail |

### Priority Mapping
| Legacy (P) | Backlog.md | Description |
|-----------|-----------|----------|
| P0 | high | Revenue loss / data inconsistency, urgent (critical not supported) |
| P1 | high | Security risk or important business logic |
| P2 | medium | UX/tech debt, planned sprint |
| P3 | low | Infrastructure improvement, long-term |

### Label Conventions
`frontend`, `backend`, `api`, `mobile`, `web`, `infra`, `security`, `auth`, `payment`, `tech-debt`

### AI Agent Workflow
1. `backlog task list -s "To Do"` → pick a task
2. `backlog task edit N -s "In Progress" -a @claude` → assign
3. Write plan, implement, test
4. `backlog task edit N -s "Done" --final-summary "Summary"` → complete

### Directory Layout
```
backlog/
  config.yml       — project settings
  tasks/           — active tasks
  completed/       — completed archive
  archive/         — older archives
  decisions/       — architecture decisions
  docs/            — backlog documentation
  drafts/          — draft tasks
  milestones/      — milestones
```

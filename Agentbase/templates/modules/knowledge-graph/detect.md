# Knowledge Graph Category Detection

This category integrates tools that model the codebase as a knowledge graph and answer "where is X / what uses Y / how is Z connected" questions with BFS query instead of grep/find.

## Variants

This category is **optional**. The module is generated only when selected. The checks below confirm CLI and artifact presence when the module is active; absence does not fail bootstrap.

| Variant | Detection File | Priority |
|---------|---------------|---------|
| Graphify | `knowledge-graph/graphify/detect.md` | 1 (optional) |

## Provides

- BFS query for code-relation discovery (~150-540x token savings vs grep)
- PreToolUse hook with smart guidance on `grep`/`Grep`/`Glob`/`rg`/`find` calls (ask, not block)
- Whitelist support: magic constant, error keyword, snake_case db column, config file, test path, vendor/node_modules, single file, git native commands
- `/g` slash command (query/explain/path/report/health modes)
- Parallel update + Python merge script for multi-layer monorepo support

## Affects Core

- code-review: If knowledge graph coverage exists, suggest graphify query before grep
- CLAUDE.md: "Graphify-First Workflow" rule and whitelist table are added when the module is selected
- Bootstrap: Graphify setup runs only when the module is selected; if the CLI is absent, bootstrap continues and does not install it

## Bootstrap Note

Bootstrap does not install packages or trigger external commands by default — it only copies files. When this module is selected, Graphify artifacts and config are generated under Agentbase. If the `graphify` CLI is absent, bootstrap continues and does not install it. Details: `knowledge-graph/graphify/install.md`.

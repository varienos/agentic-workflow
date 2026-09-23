# Monorepo Module Detection

## Checks

- config_key: package.json -> workspaces
- file_exists: lerna.json
- file_exists: nx.json
- file_exists: turbo.json
- file_exists: pnpm-workspace.yaml
- file_pattern: apps/*/package.json | packages/*/package.json

## Minimum Match

1/6

## Activates

- commands/review-module.skeleton.md (slash command)
- hooks/auto-format.skeleton.js (PostToolUse Edit|Write)

## Affects Core

- task-hunter: Multi-directory search strategy is added
- task-review: Cross-layer analysis is added
- test-enforcer: Per-subproject test matching and enforcement is added

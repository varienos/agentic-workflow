# Monorepo Modul Tespiti

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

- task-hunter: Coklu dizin arama stratejisi eklenir
- task-review: Katmanlar arasi (cross-layer) analiz eklenir
- test-enforcer: Alt proje bazinda test eslestirme ve zorlama eklenir

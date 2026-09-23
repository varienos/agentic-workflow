# TypeORM Module Detection

## Checks

- dependency: typeorm
- file_exists: ormconfig.js | ormconfig.ts | ormconfig.json | data-source.ts
- file_exists: src/migrations/ | migrations/

## Minimum Match

2/3

## Activates

- hooks/typeorm-sync-guard.js (PreToolUse Bash)
- rules/typeorm-rules.skeleton.md

## Affects Core

- task-hunter: `npx typeorm migration:show` is added to VERIFICATION_COMMANDS
- workflow-lifecycle: Migration fail protocol is added
- CLAUDE.md: TypeORM rules section is added
- settings.json: 1 hook definition is added

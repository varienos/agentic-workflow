# Prisma Module Detection

## Checks

- file_exists: prisma/schema.prisma | */prisma/schema.prisma
- dependency: @prisma/client | prisma
- env_var: DATABASE_URL

## Minimum Match

2/3

## Activates

- hooks/prisma-db-push-guard.js (PreToolUse Bash)
- hooks/prisma-migration-check.js (PostToolUse Edit|Write)
- hooks/destructive-migration-check.js (PostToolUse Bash)
- rules/prisma-rules.skeleton.md

## Affects Core

- task-hunter: `prisma validate` is added to VERIFICATION_COMMANDS
- workflow-lifecycle: Migration fail protocol is added
- CLAUDE.md: Prisma rules section is added
- settings.json: 3 hook definitions are added

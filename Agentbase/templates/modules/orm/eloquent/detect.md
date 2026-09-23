# Eloquent (Laravel) Module Detection

## Checks

- dependency: laravel/framework
- file_exists: database/migrations/
- file_exists: artisan

## Minimum Match

2/3

## Activates

- hooks/artisan-migrate-guard.js (PreToolUse Bash)
- hooks/eloquent-migration-check.js (PostToolUse Edit|Write)
- rules/eloquent-rules.skeleton.md

## Affects Core

- task-hunter: `php artisan migrate:status` is added to VERIFICATION_COMMANDS
- workflow-lifecycle: Migration fail protocol is added
- CLAUDE.md: Eloquent rules section is added
- settings.json: 2 hook definitions are added

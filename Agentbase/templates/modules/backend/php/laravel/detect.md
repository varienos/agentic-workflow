# Laravel Module Detection Rules

## Checks

- dependency: laravel/framework
- file_exists: artisan
- file_exists: app/Http/Controllers/

## Minimum Match

2/3

## Activates

- hooks/artisan-guard.js (PreToolUse Bash)
- rules/laravel-rules.skeleton.md

## Affects Core

- task-hunter: `php artisan test` is added to VERIFICATION_COMMANDS
- workflow-lifecycle: Artisan command protections are added
- CLAUDE.md: Laravel coding rules section is added
- settings.json: 1 hook definition is added

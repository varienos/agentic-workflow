# Django ORM Module Detection

## Checks

- dependency: django | Django
- file_exists: manage.py
- file_pattern: */migrations/

## Minimum Match

2/3

## Activates

- hooks/manage-py-guard.js (PreToolUse Bash)
- rules/django-orm-rules.skeleton.md

## Affects Core

- task-hunter: `python manage.py showmigrations` is added to VERIFICATION_COMMANDS
- workflow-lifecycle: Migration fail protocol is added
- CLAUDE.md: Django ORM rules section is added
- settings.json: 1 hook definition is added

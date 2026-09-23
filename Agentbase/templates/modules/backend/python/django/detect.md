# Django Module Detection Rules

## Checks

- dependency: django|Django
- file_exists: manage.py
- file_exists: settings.py|settings/

## Minimum Match

2/3

## Activates

- hooks/django-guard.js (PreToolUse Bash)
- rules/django-rules.skeleton.md

## Affects Core

- task-hunter: `python manage.py test` is added to VERIFICATION_COMMANDS
- workflow-lifecycle: Django command protections are added
- CLAUDE.md: Django coding rules section is added
- settings.json: 1 hook definition is added

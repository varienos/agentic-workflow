# Python Backend Family Detection Rules

## Checks

- file_exists: requirements.txt|pyproject.toml|uv.lock
- dependency: django|fastapi
- file_exists: manage.py|app/|src/|main.py|asgi.py|wsgi.py

## Minimum Match

2/3

## Variants

| Framework | Detection File | Priority |
|-----------|----------------|---------|
| Django | `backend/python/django/detect.md` | 1 |
| FastAPI | `backend/python/fastapi/detect.md` | 2 |

## Activates

- rules/python-backend-rules.skeleton.md

## Affects Core

- task-hunter: Verification convention for `pytest` or project test commands is added
- CLAUDE.md: Python backend shared rules section is added

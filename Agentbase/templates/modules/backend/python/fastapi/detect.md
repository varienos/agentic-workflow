# FastAPI Module Detection Rules

## Checks

- dependency: fastapi
- code_pattern: from fastapi import|import fastapi
- dependency: uvicorn

## Minimum Match

2/3

## Activates

- rules/fastapi-rules.skeleton.md

## Affects Core

- task-hunter: `pytest` is added to VERIFICATION_COMMANDS
- CLAUDE.md: FastAPI coding rules section is added

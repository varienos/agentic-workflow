# Security Module Detection

## Checks

- file_pattern: *.controller.ts | *.controller.js | views.py | *Controller.php
- file_pattern: **/routes/** | **/router/** | **/*route*.ts | **/*route*.js
- file_pattern: auth.guard.ts | auth.middleware.js | authenticate.py

## Minimum Match

1/3

## Activates

- commands/idor-scan.skeleton.md (slash command)

## Affects Core

- code-review: IDOR checklist is added
- task-review: Security items are added

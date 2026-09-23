# CodeIgniter 4 Module Detection Rules

## Checks

- dependency: codeigniter4/framework
- file_exists: spark
- file_exists: app/Config/|app/Controllers/|app/Filters/

## Minimum Match

2/3

## Activates

- hooks/spark-guard.js (PreToolUse Bash)
- rules/codeigniter4-rules.skeleton.md

## Affects Core

- task-hunter: `php spark test` or the project test command is added to VERIFICATION_COMMANDS
- workflow-lifecycle: Spark command protections are added
- CLAUDE.md: CodeIgniter 4 coding rules section is added
- settings.json: 1 hook definition is added

# Next.js Module Detection

## Checks

- dependency: next
- file_exists: next.config.js | next.config.mjs | next.config.ts
- file_exists: app/ | pages/

## Minimum Match

2/3

## Activates

- rules/nextjs-rules.skeleton.md

## Affects Core

- code-review: Next.js anti-pattern check is added (client/server mix, img tag, etc.)
- task-hunter: Next.js rendering and routing rules are added to IMPLEMENTATION_RULES
- settings.json: Next.js plugin configuration is added

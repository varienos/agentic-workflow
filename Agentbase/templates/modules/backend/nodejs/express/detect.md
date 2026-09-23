# Express Module Detection Rules

## Checks

- dependency: express
- code_pattern: express()|Router()
- file_exists: server.js|server.ts|app.js|app.ts|src/app.*

## Minimum Match

2/3

## Activates

- rules/express-rules.skeleton.md

## Affects Core

- task-hunter: `npm test` and, if present, `npm run lint` / `npm run typecheck` verifications are expected
- CLAUDE.md: Express middleware, route, and error handling rules are added

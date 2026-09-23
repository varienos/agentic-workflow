# Node.js Backend Family Detection Rules

## Checks

- file_exists: package.json
- dependency: express|fastify|@nestjs/core
- file_exists: src/main.ts|src/app.ts|server.ts|server.js|app.js|api/

## Minimum Match

2/3

## Variants

| Framework | Detection File | Priority |
|-----------|----------------|---------|
| NestJS | `backend/nodejs/nestjs/detect.md` | 1 |
| Fastify | `backend/nodejs/fastify/detect.md` | 2 |
| Express | `backend/nodejs/express/detect.md` | 3 |

## Activates

- rules/nodejs-rules.skeleton.md

## Affects Core

- task-hunter: `npm`/`pnpm`/`yarn` based lint-test-typecheck conventions are added
- CLAUDE.md: Node.js backend shared rules section is added

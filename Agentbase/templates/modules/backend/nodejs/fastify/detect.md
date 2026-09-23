# Fastify Module Detection Rules

## Checks

- dependency: fastify
- code_pattern: Fastify()|fastify()
- code_pattern: app.register()

## Minimum Match

2/3

## Activates

- rules/fastify-rules.skeleton.md

## Affects Core

- task-hunter: Fastify route/schema tests are expected to run
- CLAUDE.md: Fastify plugin and schema-first rules are added

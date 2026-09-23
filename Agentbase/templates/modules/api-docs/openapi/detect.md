# OpenAPI/Swagger Module Detection

## Checks

- file_exists: openapi.yaml | openapi.yml | openapi.json | swagger.yaml | swagger.yml | swagger.json
- dependency: @nestjs/swagger | swagger-ui-express | swagger-jsdoc | drf-spectacular | drf-yasg
- file_pattern: **/*.openapi.* | **/api-docs.*

## Minimum Match

2/3

## Activates

- hooks/openapi-sync-check.skeleton.js (PostToolUse Edit|Write)
- rules/openapi-rules.skeleton.md

## Affects Core

- code-review: Endpoint <-> spec consistency check
- pre-deploy: openapi validate command
- CLAUDE.md: OpenAPI rules
- settings.json: 1 hook definition

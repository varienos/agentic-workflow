# API Docs Category Detection

This category detects API documentation tools and provides spec synchronization checks and validation mechanisms.

## Variants

Bootstrap checks the following variants in order. Multiple matches may be activated:

| Variant | Detection File | Priority |
|---------|---------------|---------|
| OpenAPI/Swagger | `api-docs/openapi/detect.md` | 1 |
| GraphQL | `api-docs/graphql/detect.md` | 2 |

## Provides

- API spec file detection
- Spec update reminder when an endpoint changes
- Spec validation step for pre-deploy
- Code-review check for "endpoint changed but spec not updated"

## Affects Core

- code-review: API spec synchronization check
- pre-deploy: Spec validation
- task-review: API change checklist
- CLAUDE.md: API documentation rules

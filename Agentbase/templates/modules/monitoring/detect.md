# Monitoring Category Detection

This category provides control mechanisms for error tracking and performance monitoring tools.

## Variants

Bootstrap checks the following variants in order. Multiple matches may be activated:

| Variant | Detection File | Priority |
|---------|---------------|---------|
| Sentry | `monitoring/sentry/detect.md` | 1 |
| Datadog | `monitoring/datadog/detect.md` | 2 |

## Provides

- Monitoring SDK setup check
- Error boundary/tracking checks
- Environment-specific DSN/key check
- Source map upload check (during deploy)

## Affects Core

- code-review: Error tracking checklist is added
- pre-deploy: Source map check is added
- CLAUDE.md: Monitoring rules section is added

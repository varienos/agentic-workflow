# CI/CD Category Detection

This category detects CI/CD pipeline tools and provides pipeline validation rules and checks.

## Variants

Bootstrap checks the following variants in order. Multiple matches may be activated:

| Variant | Detection File | Priority |
|---------|---------------|---------|
| GitHub Actions | `ci-cd/github-actions/detect.md` | 1 |
| GitLab CI | `ci-cd/gitlab-ci/detect.md` | 2 |

## Provides

- Pipeline file validation (syntax check)
- Pre-deploy CI status check
- CI-specific rules (secret management, cache strategy, artifact management)

## Affects Core

- workflow-lifecycle: CI pipeline integration
- CLAUDE.md: CI rules
- pre-deploy: Pipeline status check

# Invariant Rules

## Working Boundary

This category provides pre-deploy checks, post-deploy validation, and rollback guidance.

## Variants

Bootstrap checks the following variants in order. Multiple matches may be activated:

| Variant | Detection File | Priority |
|---------|---------------|---------|
| Docker   | `deploy/docker/detect.md`    | 1       |
| Coolify  | `deploy/coolify/detect.md`  | 2       |
| Vercel   | `deploy/vercel/detect.md`   | 3       |

## Provides

- Pre-deploy checklist (build, test, environment synchronization)
- Post-deploy validation (health check, smoke test, version check)
- Rollback guide (platform-based recovery instructions)
- Deploy log (date, commit, status tracking)

## Affects Core

- workflow-lifecycle: Deploy flow is added (pre-deploy → deploy → post-deploy)
- CLAUDE.md: Deploy rules section is added
- settings.json: Deploy hook definitions are added (if any)

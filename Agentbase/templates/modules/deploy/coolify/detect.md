# Invariant Rules

## Checks

- `file_exists: docker-compose.prod.yml | docker-compose.yml`
- `file_exists: Dockerfile`
- `file_exists: entrypoint.sh`

> Note: Coolify detection can overlap with Docker detection. Bootstrap clarifies this in the interview with "What is your deploy platform?". If Coolify is selected, the Coolify module is activated instead of the Docker module (because Coolify already uses Docker).

## Minimum Match

2/3

## Activates

- `commands/pre-deploy.skeleton.md` (Coolify-specific checks)
- `commands/post-deploy.skeleton.md` (validation via Coolify API)
- `agents/devops.skeleton.md` (Coolify + Docker + Traefik specialist)

## Affects Core

- `workflow-lifecycle: Coolify deploy flow, rollback procedure`
- `CLAUDE.md: Deploy rules`

---

# Working Boundary Rules

## Checks

- file_exists: docker-compose.prod.yml | docker-compose.yml
- file_exists: Dockerfile
- file_exists: entrypoint.sh

> Note: Coolify detection can overlap with Docker detection. Bootstrap clarifies this in the interview with "What is your deploy platform?". If Coolify is selected, the Coolify module is activated instead of the Docker module (because Coolify already uses Docker).

## Minimum Match

2/3

## Activates

- `commands/pre-deploy.skeleton.md` (Coolify-specific checks)
- `commands/post-deploy.skeleton.md` (validation via Coolify API)
- `agents/devops.skeleton.md` (Coolify + Docker + Traefik specialist)

## Affects Core

- `workflow-lifecycle: Coolify deploy flow, rollback procedure`
- `CLAUDE.md: Deploy rules`

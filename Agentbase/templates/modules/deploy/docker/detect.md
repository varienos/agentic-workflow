# Docker Module Detection

## Checks

- `file_exists`: Dockerfile or /Dockerfile
- `file_exists`: docker-compose.yml, docker-compose.yaml, or compose.yml
- `file_exists`: .dockerignore

## Minimum Match

2/3

## Activates

- `/commands/pre-deploy.skeleton.md` (slash command)
- `/commands/post-deploy.skeleton.md` (slash command)
- `/agents/devops.skeleton.md` (sub-agent)

## Affects Core

- `workflow-lifecycle`: Deploy flow is added (pre-deploy → deploy → post-deploy)
- `CLAUDE.md`: Deploy rules section is added

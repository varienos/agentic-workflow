# Vercel Module Detection

## Checks

- file_exists: vercel.json
- dependency: vercel
- file_exists: .vercel/

## Minimum Match

2/3

## Activates

- commands/pre-deploy.skeleton.md (slash command)
- agents/frontend.skeleton.md (sub-agent)

## Affects Core

- workflow-lifecycle: Vercel deploy flow is added (pre-deploy → vercel deploy)
- CLAUDE.md: Vercel deploy rules section is added

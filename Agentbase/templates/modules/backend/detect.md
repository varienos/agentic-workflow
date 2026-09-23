# Backend Category Detection

This category contributes backend runtime families, framework-specific guard hooks, and coding rules.

## Variants

| Family | Detection File | Leaf Check Order |
|------|----------------|---------------------|
| Node.js | `backend/nodejs/detect.md` | NestJS → Fastify → Express |
| PHP | `backend/php/detect.md` | Laravel → CodeIgniter 4 |
| Python | `backend/python/detect.md` | Django → FastAPI |

## Provides

- Shared backend/runtime rules at the family level
- Framework-specific dangerous command protections
- Environment variable and configuration management
- Test, lint, typecheck, and build conventions
- Security and architecture best practices

## Affects Core

- task-hunter: Runtime and framework verifications added to VERIFICATION_COMMANDS
- workflow-lifecycle: Backend failure and rollback notes added
- CLAUDE.md: Backend family + framework rules section added
- settings.json: Framework hook definitions added

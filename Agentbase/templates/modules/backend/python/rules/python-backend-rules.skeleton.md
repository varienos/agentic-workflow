# Python Backend Shared Rules

> These rules apply to all Python backend leaves.
> Framework-specific rules apply in addition to this file.

## Environment and Dependency Management

- The virtualenv/packaging strategy (`venv`, Poetry, uv, pip-tools) must follow a single team standard.
- Dependencies must be managed from the dependency manifest, not from application code.
- When adding a new runtime dependency, note version and compatibility impact.

## Configuration and Secret Management

- Do not hardcode secret values in code.
- Settings must be collected in a central settings/config layer.
- Environment-based behavior differences (`local`, `test`, `production`) must be explicit and testable.

## Types and Structure

- Use type hints in new backend code; public functions and service boundaries especially must be typed.
- The route/view layer and domain/business logic must be separated.
- Prefer readable, testable service/piece design over long functions.

## Verification Convention

- Final verification should at least consider test and lint/format steps; add type check if the team uses it.
- When async and sync code are mixed, also review event-loop or blocking I/O risks.

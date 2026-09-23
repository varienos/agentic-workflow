# Node.js Backend Shared Rules

> These rules apply to all Node.js backend leaves.
> Framework-specific rules apply in addition to this file.

## Runtime and Packaging

- Run, test, and quality commands must be defined explicitly under `package.json` `scripts`.
- When you add a new quality gate, expose it as a script: `lint`, `test`, `typecheck`, `build`.
- The entry point must be single and obvious. If there are different bootstrap flows, explain why in a comment or README.

## Environment Variables

- Do not hardcode secret values in code.
- Collect environment variables in a config layer; avoid scattered `process.env` reads throughout the code.
- Critical env values must be fail-fast validated at application startup.

## Request Validation

- Every external value entering a handler must pass through a validation layer.
- Without validation, do not pass `req.body`, `req.query`, or `req.params` values directly into domain logic.
- Validation results should proceed as a typed object.

## Error Handling

- Separate expected application errors from system errors.
- Do not leave unhandled rejections in async handlers; use a central error flow.
- Do not return stack traces or secret-containing details to users on 5xx responses.

## Logging and Observability

- Prefer a consistent logger layer over `console.log` in production code.
- Error logs should include request context, correlation/request id, and a summary of critical inputs.
- Do not write secrets, tokens, or full PII to logs.

## Verification Convention

- The final verification flow should follow this order when possible: `lint` -> `typecheck` -> `test` -> `build`.
- In a monorepo, if shared types or contracts are affected, validate dependent packages as well — not only the touched packages.

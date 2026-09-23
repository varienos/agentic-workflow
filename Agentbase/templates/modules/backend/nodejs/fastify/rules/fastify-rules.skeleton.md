# Fastify Coding Rules

> These rules apply to projects that use Fastify.
> `backend/nodejs` family rules apply together with this file.

## Schema-First API

- Route definitions must be written together with request/response schemas.
- Validation and serialization should go through the Fastify schema layer; keep manual shape checks inside handlers to a minimum.
- If OpenAPI/Swagger generation exists, it must be fed from the same schema source.

## Plugin Architecture

- In large apps, route, auth, db, and external client setup should be separated by plugin.
- Use `decorate`/`decorateRequest` carefully; do not create hidden global dependencies.
- Know encapsulation boundaries before violating them; comment the reason when necessary.

## Handler Discipline

- Handlers must work only with validated input.
- `reply.code(...).send(...)` or returned values must follow a consistent pattern.
- Do not carry arbitrary global state on the Fastify instance.

# OpenAPI Rules

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: project.name, project.description, project.structure
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## Spec File Standards

- OpenAPI 3.0+ usage is **required**. Swagger 2.0 is not accepted in new projects.
- The following fields are **required** in the spec file:
  - `info.title` — API name
  - `info.version` — Semantic version (for example `1.2.0`)
  - `info.description` — Short API description
- The `servers` field must include at least one environment (development, staging, production).

---

## Endpoint Documentation

For every endpoint (each operation under `paths`), the following are **required**:

| Field | Description |
|------|----------|
| `summary` | One-line description of the endpoint |
| `description` | Detailed usage information |
| `requestBody.content.schema` | Required for endpoints with a request body |
| `responses.2xx.content.schema` | Schema definition for the successful response |
| `responses.4xx` | At least one error response (400, 401, 404, etc.) |
| `responses.5xx` | Server error response definition |
| `tags` | At least one tag for grouping |

---

## Synchronization Rules

1. **Update the spec when a route changes.** When an endpoint path, method, or request/response shape changes, the related spec file must be updated in the same commit.
2. **Add new endpoints to the spec.** When a new route is defined, the matching operation must be defined in the spec file.
3. **Remove endpoints from the spec when deleted.** Deleted or disabled endpoints must be removed from the spec or marked with `deprecated: true`.
4. **Reflect schema changes.** Model/DTO changes must be updated under `components/schemas`.

---

## Validation

- Spec validation **must be run** during pre-deploy (for example `npx @redocly/cli lint openapi.yaml`).
- Schema `$ref` references must be valid — broken references are treated as deploy-blocking errors.
- Adding a spec validation step in the CI pipeline is **recommended**.

---

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|----------------|
| Skipping schemas in favor of hardcoded example values (`example: "john"`) | Define types with `schema`; add `example` optionally |
| Missing error response definitions | Define at least `400`, `401`, and `500` responses on every endpoint |
| Not marking deprecated endpoints in the spec | Add `deprecated: true` and mention the alternative endpoint in `description` |
| Defining all schemas inline | Define under `components/schemas` and reference with `$ref` |
| Not updating the spec file version | Bump `info.version` semantically on API changes |
| Keeping separate spec files per environment | Use a single spec + `servers` field to define environments |

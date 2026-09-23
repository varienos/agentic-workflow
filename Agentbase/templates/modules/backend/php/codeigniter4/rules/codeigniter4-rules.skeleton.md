# CodeIgniter 4 Coding Rules

> These rules apply to projects that use CodeIgniter 4.
> `backend/php` family rules apply together with this file.

## Configuration and Environment

- Environment settings must be managed through `.env` and `app/Config/*`.
- Do not hardcode secret values outside the `Config` or env layer.
- Config overrides that change framework behavior must be explicit and traceable.

## Controller, Validation, and Service Separation

- Controllers should remain a thin request/response-focused layer.
- Validation must be defined explicitly via the `Validation` service or at the request level.
- Move business logic to service/library classes instead of growing it inside controllers or models.

## Filter and Authorization

- Auth, rate-limit, CORS, and similar cross-cutting behavior must be defined in the filter layer.
- Do not scatter endpoint protection into `if` blocks inside controllers.

## Model and Response Pattern

- Models should focus on data access and persistence.
- API endpoint response shapes must be consistent; error responses must follow a single contract.
- Entity vs raw array usage must be clear per team standard; do not mix both approaches inside the same feature.

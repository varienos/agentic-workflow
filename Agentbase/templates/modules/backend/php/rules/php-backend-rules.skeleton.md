# PHP Backend Shared Rules

> These rules apply to all PHP backend leaves.
> Framework-specific rules apply in addition to this file.

## Configuration and Secret Management

- Do not hardcode secret values in code; use the framework config/env mechanism.
- Collect config reads in the layer provided by the framework; do not scatter raw `$_ENV` or `getenv()` usage.
- When new env values are added, the example env file must be updated as well.

## Thin Controller Approach

- Controllers are the layer for receiving requests, receiving validation results, and returning responses.
- Move business logic to a service/action layer instead of stacking it in the controller.
- DB queries, external API calls, and transaction management must not be scattered inside controllers.

## Validation and Response

- External input must pass through the framework validation mechanism.
- Success and error response formats must be consistent; if there is an API, define a single response contract.
- Domain errors and unexpected exceptions must be handled separately.

## Verification Convention

- Final checks should at least consider the relevant test command and any framework build/cache command effects.
- Use cache-producing commands in a way that does not break the development flow; specify a clear step when needed.

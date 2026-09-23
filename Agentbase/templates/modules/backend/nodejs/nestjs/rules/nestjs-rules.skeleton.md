# NestJS Coding Standards

> These standards apply to projects that use NestJS.
> `backend/nodejs` family standards apply together with this file.

## Module Boundaries

- Each feature should have its own module boundary with controller, service, and repository/provider structure as needed.
- Prefer explicit export/import relationships instead of depending directly on another feature's internal provider.
- Do not dump everything into `AppModule`; split into domain modules.

## DTO, Pipe, and Validation

- Use DTOs for external input; prefer validation pipes based on `class-validator` and `class-transformer`.
- If a global `ValidationPipe` exists, do not disable critical settings such as whitelist/forbidNonWhitelisted.
- Do not reuse entity/model objects as request DTOs.

## Controller and Service Separation

- Controllers should stay thin for the HTTP/transport layer.
- Business logic must be collected in `@Injectable()` services.
- Use guards, interceptors, and filters for cross-cutting concerns; do not put repeated infrastructure code in controllers.

## Test Convention

- Unit tests should be written at the provider level; e2e tests at the module/HTTP entry level.
- Mocks should override only as much as needed without breaking the real module graph.

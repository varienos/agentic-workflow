# Express Coding Rules

> These rules apply to projects that use Express.
> `backend/nodejs` family rules apply together with this file.

## Structure and Responsibilities

- Route files should be limited to routing and middleware wiring.
- The controller/handler layer normalizes the request; the service layer carries business logic.
- Do not create large functions by embedding data access and external service calls inside handlers.

## Middleware Chain

- Authentication, authorization, rate-limit, and validation middleware must be wired in an explicit order.
- Global error middleware must be defined once at the end of the chain.
- If a middleware already sent a response, do not call `next()`.

## Async Error Flow

- Use a wrapper or utility that routes `async` handlers into the central error middleware.
- Do not swallow promise rejections and create a silent success appearance.

```ts
// Preferred pattern
router.post('/users', validate(createUserSchema), asyncHandler(userController.create));
```

>>>

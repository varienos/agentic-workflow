# GraphQL Rules

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: project.name, project.description, project.structure
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## Schema Standards

### Approach Selection
- At project start, choose either **schema-first** or **code-first** and apply it consistently.
- Schema-first: `.graphql` files are treated as the single source of truth.
- Code-first: Decorator/annotation-based schema generation is used (for example `type-graphql`, `@nestjs/graphql`).

### Naming Convention
| Item | Rule | Example |
|-----|-------|-------|
| Type | PascalCase | `User`, `OrderItem` |
| Field | camelCase | `firstName`, `createdAt` |
| Enum | PascalCase (values UPPER_SNAKE_CASE) | `OrderStatus { PENDING, COMPLETED }` |
| Query | camelCase, do not start with a verb | `users`, `orderById` |
| Mutation | camelCase, start with a verb | `createUser`, `updateOrder` |
| Input | PascalCase + `Input` suffix | `CreateUserInput` |

### Description Requirement
- Every **type**, **query**, **mutation**, and **enum** must have a `description` field.
- The description should briefly state the field's purpose and usage.

---

## Resolver Rules

### N+1 Query Prevention
- Resolvers that fetch related data **must** use **DataLoader**.
- A new DataLoader instance must be created per request (request-scoped).
- A resolver that fetches related data without DataLoader is marked **blocking** in code review.

### Error Handling
- Resolvers must catch errors with a try-catch block.
- Errors returned to the user must include meaningful messages.
- Internal error details (stack traces, SQL errors) must **not** be shown to users in **production**.
- GraphQL errors must include an error code in the `extensions` field:
  ```graphql
  {
    "message": "User not found",
    "extensions": { "code": "USER_NOT_FOUND" }
  }
  ```

### Authorization Check
- Every mutation and sensitive query must perform an **authorization check**.
- Authorization logic must run at the start of the resolver, before business logic.
- Prefer centralized authorization via guard/middleware/directive.

---

## Type Safety

### Input Validation
- Mutation inputs must define a **separate Input type** (`CreateUserInput`, `UpdateOrderInput`).
- Required validation rules must be applied on input fields (min/max length, format, etc.).
- Validation failures must return meaningful error messages.

### Nullable Field Policy
- Fields must be defined as **non-nullable** (`!`) by default.
- Nullable fields should be used only when the data is truly optional.
- List fields must be defined as `[Type!]!` (both the list and its elements are non-nullable).

### Custom Scalar Usage
- Special types such as `DateTime`, `JSON`, and `URL` must define a **custom scalar**.
- Custom scalars must be defined in a central file and referenced from the entire schema.
- Serialization/parsing logic must be documented.

---

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|----------------|
| Direct SQL/ORM query inside a resolver (N+1) | Use DataLoader |
| Making all fields nullable | Default non-nullable; nullable only when needed |
| One large `Query` type | Modularize into logical groups |
| Returning errors as strings | Use GraphQL error format + `extensions.code` |
| Performing authorization inside business logic | Centralized control via guard/middleware/directive |
| Scalar arguments instead of Input types | Define an Input type when there are multiple arguments |
| Missing descriptions in the schema | Add a description to every type, field, and enum |
| Returning lists without pagination | Apply cursor-based or offset-based pagination |

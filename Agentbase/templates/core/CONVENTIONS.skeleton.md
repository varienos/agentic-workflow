# Coding Conventions

This file defines the project's coding rules. All agents, commands, and code-review checks follow these rules.

---

## Naming Rules

<!-- GENERATE: NAMING_RULES
Description: Emits naming rules from the manifest conventions.naming field.
Required manifest fields: conventions.naming, conventions.file_naming, conventions.component_naming
Example output:

### Variable and Function Naming: camelCase

| Item | Format | Example |
|-----|--------|-------|
| Variable | camelCase | `userName`, `isActive`, `totalCount` |
| Function | camelCase | `getUserById`, `calculateTotal` |
| Constant | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| Class | PascalCase | `UserService`, `PaymentController` |
| Interface/Type | PascalCase | `UserProfile`, `ApiResponse` |
| Enum | PascalCase (value: UPPER_SNAKE) | `Status.ACTIVE`, `Role.ADMIN` |

### File Naming: kebab-case

| File Type | Format | Example |
|-----------|--------|-------|
| Module/service | kebab-case | `user-service.js`, `payment-handler.ts` |
| Component | PascalCase | `UserProfile.tsx`, `PaymentForm.vue` |
| Test | source-name.test.ext | `user-service.test.js` |
| Type/interface | kebab-case | `api-types.ts` |
-->

## Commit Rules

<!-- GENERATE: COMMIT_CONVENTION
Description: Commit message format and language.
Required manifest fields: conventions.commit_language, conventions.commit_format, workflows.commit_prefix_map
Example output:

**Format:** Conventional Commits
**Language:** English

| Prefix | Meaning |
|--------|--------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `refactor:` | Restructuring |
| `docs:` | Documentation |
| `test:` | Add/fix tests |
| `chore:` | Maintenance |
| `perf:` | Performance |
| `style:` | Style/format |
| `ci:` | CI/CD |
-->

## Project-Specific Rules

<!-- GENERATE: PROJECT_CONVENTIONS
Description: Phase 4 domain rules and project-specific conventions.
Required manifest fields: rules.domain, conventions.docblock, project.rules
Example output:

- API response format is always `{ status, data, message }`
- User data is not written to logs
- Every public function is documented with JSDoc
-->

# Test Enforcement Rules

These rules are referenced by all commands and agents. The test-enforcer hook produces systemMessages according to these rules.

---

## Source → Test File Mapping

<!-- GENERATE: TEST_FILE_TABLE
Description: Bootstrap emits a source-to-test mapping table from stack info in the manifest.
Required manifest fields: stack.primary, stack.test_framework
Example output:
| Source Pattern | Test File | Framework |
|---|---|---|
| `controllers/{name}.ts` | `__tests__/controllers/{name}.test.ts` | jest |
| `services/{name}.ts` | `__tests__/services/{name}.test.ts` | jest |
| `screens/{name}.tsx` | `__tests__/screens/{name}.test.tsx` | jest |
| `components/{name}.tsx` | `__tests__/components/{name}.test.tsx` | jest |
| `utils/{name}.ts` | `__tests__/utils/{name}.test.ts` | jest |
-->

---

## Test Writing Decision Matrix

| Change Type | Write a test? | Description |
|---|---|---|
| New function/method | YES | Happy path + at least 1 edge case |
| Behavior change | YES | Update the existing test or add a new case |
| Bug fix | YES | Regression test: verify the bug does not return |
| Refactoring (behavior unchanged) | NO | Verifying existing tests still pass is enough |
| Type-only change | NO | Compile check is enough |
| Config/env change | NO | Manual verification is enough |
| Documentation | NO | No test required |
| Import/export reordering | NO | Existing tests are enough |

---

## Minimum Scenario Coverage

Every test file must cover at least these scenarios:

1. **Happy path** — Normal usage scenario
2. **Empty/null input** — Edge case: undefined, null, empty string
3. **Error case** — Expected error: wrong type, invalid value, timeout

For complex business logic, add:
- Boundary values
- Matching/non-matching conditions
- Concurrent/async behavior

---

## 4-Layer Enforcement Architecture

```
Layer 1: test-enforcer.js hook     → Instruct Claude via systemMessage
Layer 2: task-hunter verification   → Test check when closing a task
Layer 3: pre-commit git hook        → npm test fail = commit BLOCKED
Layer 4: CI (GitHub Actions)        → npm test fail = merge BLOCKED
```

Each layer catches what the previous one can miss. Do not rely on a single layer.

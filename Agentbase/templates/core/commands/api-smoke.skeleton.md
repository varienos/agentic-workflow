# API Smoke Test

> Quickly verifies API endpoints. Can run after a post-deploy or independently.
> Usage: `/api-smoke`, `/api-smoke staging`, `/api-smoke https://custom-url.com`

---

## Rule: WORK AUTONOMOUSLY

- Do NOT ask the user questions — run the smoke test and report results.
- Show failed endpoints IN DETAIL.
- RUN every step — do not skip a step.

---

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is filled by Bootstrap from manifest data.
Required manifest fields: project.description, stack.primary, environments
Example output:
## Project Context
- **Project:** E-commerce API
- **Stack:** Node.js + Express
- **Production:** https://api.example.com
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## STEP 1 — Environment Selection

Resolve the argument:

| Argument | Environment |
|---|---|
| Empty | Production (manifest environments[0]) |
| `staging` | Staging environment |
| `https://...` | Custom URL |

---

## STEP 2 — Run Smoke Test

### 2.1 Smoke Test Endpoint List

<!-- GENERATE: SMOKE_TEST_ENDPOINTS
Description: Dynamic endpoint table from the manifest.
Required manifest fields: environments, api_endpoints, project.api_prefix
-->

### 2.2 Run Curl Script

Run the following script with Bash:

```bash
<!-- GENERATE: API_SMOKE_SCRIPT
Description: Curl-based smoke test script from the manifest.
Required manifest fields: environments, api_endpoints, project.api_prefix
-->
```

**NOTE:** For endpoints that require auth, set the `SMOKE_TEST_TOKEN` env variable or pass it as a script parameter.

### 2.3 Node.js Test File (CI Integration)

node:test-based smoke test that can run in CI:

```javascript
<!-- GENERATE: API_SMOKE_NODE_TESTS
Description: node:test-based smoke test file from the manifest.
Required manifest fields: environments, api_endpoints, project.api_prefix
-->
```

Run: `SMOKE_TEST_URL=https://api.example.com SMOKE_TEST_TOKEN=xxx node --test smoke-test.js`

---

## STEP 3 — Result Report

```markdown
## Smoke Test Report

| # | Endpoint | Result | Status |
|---|----------|-------|--------|
| 1 | GET /health | PASS/FAIL | 200/xxx |
| 2 | ... | ... | ... |

### Summary
- **Total:** X endpoints
- **Passed:** Y
- **Failed:** Z
- **Result:** PASS / FAIL

### Failed Endpoint Details
[For each failed endpoint: expected vs actual status, possible cause]
```

---

## Error Cases

| Case | Action |
|---|---|
| No token, auth endpoint present | WARN: "SMOKE_TEST_TOKEN must be set" |
| URL unreachable | FAIL: "Could not establish connection" |
| Timeout | FAIL: "No response within 10s" |

---

## Required Rules

### Invariant rules (apply to every command)

1. **Do not write config into Codebase** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` files are created ONLY inside Agentbase. Creating a `.claude/` directory inside Codebase or writing `../Codebase/CLAUDE.md` is FORBIDDEN.
2. **Git runs only in Codebase** — All git operations (commit, push, branch) run inside `../Codebase/`. There is NO git in Agentbase.
3. **Codebase is readable; config is not written there** — Project files (`src/`, `app/`, etc.) can be read and, if the task requires it, edited. Config files (`.claude/`, `CLAUDE.md`) cannot be written inside Codebase.

<!-- GENERATE: SELF_REFRESH
Description: Command final step - self-refresh check. Bootstrap replaces this marker
with the shared Self-Refresh section. The command reviews its own text against the
project reality: small mismatches via Edit, large changes reported as a backlog task.
-->

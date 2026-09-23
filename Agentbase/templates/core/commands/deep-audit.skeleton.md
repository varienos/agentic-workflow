# Deep Audit — Domain Validation

> A domain module (auth, profile, payment, message etc.) is thoroughly validated across all layers (API + DB + Mobile + Frontend). The findings are categorized into two categories: simple and complex. Simple ones are fixed, while complex ones are logged to the backlog.
> Usage: `/deep-audit <module-name>`, `/deep-audit auth`, `/deep-audit profile`, `/deep-audit payment`

---

## Rule: AUTONOMY CHECK

- Do NOT ask the user questions — determine the module, inspect, and report.
- Directly fix simple issues (typo, missing import, wrong type, missing null-check).
- Log complex issues (architectural changes, new feature, migration) to backlog.
- RUN every step — do not skip a step.

---

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.description, stack.primary, project.structure, project.subprojects, stack.orm, stack.auth_method
Example output:
## Project Context
- **Project:** E-commerce platform
- **Stack:** TypeScript, Prisma, PostgreSQL, Expo
- **Auth:** JWT
- **Architecture:**
  - `apps/api/` — NestJS backend
  - `apps/mobile/` — Expo React Native
  - `apps/web/` — Next.js frontend
  - `packages/shared/` — Shared types
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## BIG MAP: LAYER-BASED RELATIONSHIP DIAGRAM

<!-- GENERATE: SUBPROJECT_LAYERS
Description: Create a layer diagram using the subproject information from the manifest.
Required manifest fields: project.subprojects, project.subprojects[].role, project.subprojects[].stack
Example output:

```
┌──────────────────┐     API JSON      ┌──────────────────────┐
│   Backend API    │ ◄──────────────► │   Mobile App          │
│  (apps/api)      │                   │  (apps/mobile)        │
│  NestJS+Prisma   │                   │  Expo + React Native  │
└──────┬───────────┘                   └────────┬──────────────┘

>>>
│  Prisma ORM                             │  Axios/fetch
       ▼                                        ▼
   [PostgreSQL]                             [User]
       ▲
       │  (if present: old backend, admin panel)
       └──────────────────────────────────────
```

**Critical Interactions:**

| Interaction | Breakage Risk | Example |
|--------------|-------------------|---------|
| API response → Frontend/Mobile parser | Lost response fields can crash the client | controller → screen |
| API validation → Client form | Backend validation changes can hide client errors | schema → form |
| Auth flow → Auth state | Token refresh changes affect session handling | auth service → auth context |
| DB schema → API query | Schema changes can crash queries | ORM model → controller |
-->

### What's the Effect Chain for Each Bug

Agents and leads, FOR EACH BUG:

> "Will this bug fix change the other part of the chain?"

```
API fix implemented
  ├─ Did response shape change? → Client parser checked
  ├─ Did validation rule change? → Client form error handling checked
  ├─ Did HTTP status code change? → Client interceptor checked
  ├─ Did ORM query change? → Relation chain validated
  └─ Did auth flow change? → Auth context/state management checked

Client fix implemented
  ├─ Did API call change? → Is the API endpoint accepted?
  ├─ Did request body change? → Does the API validation pass?
  ├─ Do new endpoints need to be added? → Are they registered in the API?
  └─ Did state change? → Will other screens have stale data?

DB schema changed
  ├─ Was the `.claude/rules/db-migration-discipline.md` checklist applied?
  ├─ Does migration require it? → Was dry-run successful, rollback/down ready, and what's the production DB impact?
  ├─ Are related controller queries updated?
  └─ Is this area being used by any client screens?
```

---

## Step 0: MODULE IDENTIFICATION AND SCOPE DEFINITION

Analyze `$ARGUMENTS` to determine the module scope.
### 0.1. Module Mapping Table

<!-- GENERATE: MODULE_MAPPING
Description: Creates the module-file mapping table in the project structure and domain.
Required manifest fields: project.subprojects, project.modules, project.structure, rules.domain
Bootstrap extracts domain modules from controller/service/screen/component naming conventions in codebase analysis.

Example output:

Compare the user-provided module name with the following fields:

| Module Key | Backend API | Frontend/Mobile |
|-------------|-------------|----------------|
| `auth`, `login`, `register`, `session` | auth.controller, auth.service, auth.guard, auth.schema | LoginPage, RegisterPage, AuthContext, useAuth |
| `profile`, `user` | user.controller, user.service, profile.schema | ProfilePage, ProfileEditPage, UserContext |
| `payment`, `order` | payment.controller, order.service, payment.schema | CheckoutPage, PaymentScreen, OrderHistory |
| `message`, `chat` | message.controller, chat.service, message.schema | ChatPage, MessagesScreen, ChatContext |

**Project-specific modules:** Additional domain modules detected in codebase analysis are added to this section.

If no match is found for the user-provided module name, display a message: "Module name not recognized. Which area would you like to review?"

### 0.2. Layer Analysis

Determine which layers should be reviewed after module mapping:

```
LAYERS:
- [x/—] Backend API (controller, service, route, guard, middleware)
- [x/—] Backend Validator (validation schema, DTO)
- [x/—] Database (ORM schema, migration)
- [x/—] Frontend Web (page, component, hook, store)
- [x/—] Frontend Mobile (screen, component, context, navigation)
- [x/—] Shared (types, utility, DTO)
```

> **NOTE:** Not all layers may be applicable for every module. The API layer may be unnecessary for a theme module. When determining the scope of a module, exclude unnecessary layers.

---

## Step 1: Deep File Search

This step determines the quality of the command. **Summarize file paths and line numbers using indexes.**

### 1.1. Backend API File Search

For each field received from module mapping:

>>>
### 1.2. Frontend/Mobile File Search

```markdown
# Pages/Views
Grep(pattern="{module_term}", path="{frontend_subproject}/src/", output_mode="files_with_matches")

# Components
Grep(pattern="{module_term}", path="{mobile_subproject}/src/components/", output_mode="files_with_matches")

# Context/Store/Hook
Grep(pattern="{module_term}", path="{mobile_subproject}/src/context/", output_mode="files_with_matches")
Grep(pattern="{module_term}", path="{mobile_subproject}/src/hooks/", output_mode="files_with_matches")

# API Client/Service
Grep(pattern="{module_term}", path="{frontend_subproject}/src/services/", output_mode="files_with_matches")
```

### 1.3. Dependency Analysis (Keyword Search Beyond)

Search for files that are not related to the module name but have a direct connection.

**Step 1:** Include known files from the module reference table directly into scope.

**Step 2:** From found files, perform import/dependency trace:
```markdown
For each controller/service file:
1. Check import statements in the file → Identify related services/utilities
2. Scan ORM models used (which models are queried?)
3. In client: check imported components/hooks
```

>>>
**Step 3:** Cross-cutting concern analysis:

```
Check the shared infrastructure used by the module:
- Authentication middleware/guard (for completed endpoints)
- Error handling middleware (error management)
- Response utility (standard response format)
- API client interceptor (client-side)
- Authentication context/state (token, user information)
- Theme/style system (color scheme)
```

### 1.4. Memory Analysis

```
# episodic-memory — previous session history
mcp__plugin_episodic_memory_episodic_memory_search({ query: "{module_term} review bug decision" })
```

### 1.5. File Inventory Generation

List all files in a structured manner:

```
FILE INVENTORY ({module_name}):
─────────────────────────────────
Backend Controller:  [N files]
  - file.ts:line — method description
Backend Service:     [N files]
Backend Route:       [N files]
Backend Validator:   [N files]
Backend Middleware:   [N files]
ORM Schema:          [related models]
Frontend Page:       [N files]
Frontend Component:  [N files]
Mobile Screen:        [N files]
Mobile Component:     [N files]
Mobile Context/Store: [N files]
Client API Service:  [related functions]
─────────────────────────────────
TOTAL: [N] files to review
```

---

## Step 2: SPAWN PARALLEL REVIEW AGENTS

Spawn the following agents **in parallel**.

**NOTE:** Include relevant connection points from the "Big Image" section in each agent's prompt. Agents should isolate their issues — report how other layers are affected by each bug.

>>>
<!-- GENERATE: REVIEW_AGENTS
Description: Customize the prompt templates for 4 agents in the bootstrap stack.
Required manifest fields: stack.primary, stack.orm, stack.api_framework, stack.auth_method, project.subprojects
Agents will fill in framework-specific controls in agent prompts:
- Express/NestJS/FastAPI/Django/Laravel → different controller/service pattern
- Prisma/TypeORM/Eloquent/Django ORM → different query controllers
- React/Vue/Expo/Flutter → different component/state controllers

Example output (Express + Prisma + Expo):

### Agent 1: API Auditor

```
Agent(
  subagent_type="general-purpose",
  name="api-auditor",
  model="sonnet",
  description="{module} API code review",
  prompt="..."
)
```

**Control Areas:**

A. **Dead Code and Unused Regions:**
   - Unassigned methods in controllers with no route binding
   - Exported functions in services with no usage
   - Unused regions in ORM schema
   - Unused regions in validator schema
   - Commented-out code blocks, duplicate methods

B. **Insufficient Scenario Analysis:**
   - Missing validation for CRUD operations
   - Error handling omissions (try-catch absent, error handling, generic catch)
   - Edge cases: null/undefined/empty string/empty array scenarios
   - Transaction boundary omissions
   - Authorization control omissions (auth guard/middleware absent)
   - Rate limiting omissions (brute force open endpoints)

C. **Code Quality:**
   - Framework pattern adherence
   - DRY violations (same logic in multiple places)
   - Magic string/number usage
   - Logging omissions
-->
### Agent 1: API Auditor

```
Agent(
  subagent_type="general-purpose",
  name="api-auditor",
  model="sonnet",
  description="{module} API code review",
  prompt="..."
)
```

**Control Areas:**

A. **Dead Code and Unused Regions:**
   - Unassigned methods in controllers with no route binding
   - Exported functions in services with no usage
   - Unused regions in ORM schema
   - Unused regions in validator schema
   - Commented-out code blocks, duplicate methods

B. **Insufficient Scenario Analysis:**
   - Missing validation for CRUD operations
   - Error handling omissions (try-catch absent, error handling, generic catch)
   - Edge cases: null/undefined/empty string/empty array scenarios
   - Transaction boundary omissions
   - Authorization control omissions (auth guard/middleware absent)
   - Rate limiting omissions (brute force open endpoints)

C. **Code Quality:**
   - Framework pattern adherence
   - DRY violations (same logic in multiple places)
   - Magic string/number usage
   - Logging omissions
D. **Security (IDOR included):**

- Injection risk (raw query without parameterized value)
- IDOR risk (authorization control deficiency — lack of access to other user's data)
- Authentication verification defects
- Input sanitization defects
- PII exposure (unmasked sensitive data in log/response)

**OUTPUT FORMAT:**

```markdown
## API Review: {module}

### UNUSED AREAS
| # | File Line | Area/Method | Status | Action |
|---|-------------|------------|-------|---------|
| 1 | file.ts:45 | exportName | Never called | DELETE or DOCUMENT |

### EXCEPTION SCENARIOS
| # | File Line | Scenario | Effect | Priority |
|---|-------------|---------|------|---------|
| 1 | file.ts:120 | Null control missing | Runtime error | HIGH |

### FINDINGS
| # | File Line | Severity | Issue | Complexity | Recommended Fix |
|---|-------------|--------|-------|-------------|-------------------|
| 1 | file.ts:89 | CRITICAL | IDOR | Single file | Add req.user.id control |

### SECURITY FINDINGS
| # | File Line | Risk | Severity | Description |
|---|-------------|------|--------|----------|
| 1 | file.ts:55 | IDOR | CRITICAL | Authorization control deficiency |
```

---

### Agent 2: API Compliance Inspector

**This agent will only spawn if the module contains both backend and frontend/mobile layers.**

**Control Areas:**

A. **Request/Response Contract Compliance:**
   - API's defined response areas vs client's expected areas
   - camelCase/snake_case conversion consistency
   - Pagination parameter consistency
   - Handling of nullable fields

B. **Endpoint Gaps:**
   - Client-initiated but API-undefined endpoints
   - API-defined but client-unused endpoints
- Inconsistent HTTP method usage (GET vs POST)

C. **Error Handling Consistency:**
   - API error response format vs client error parser consistency
   - Usage of HTTP status code consistency
   - Validation error format consistency

D. **Auth Flow Consistency:**
   - Token sending format consistency
   - Token refresh flow consistency
   - Management of auth state vs API expectations

**OUTPUT FORMAT:** Use the same table format as the API agent. Categories: INCONSISTENCY, EXPLICIT ENDPOINT, ERROR HANDLING.

---

### Agent 3: Frontend/Mobile Navigation Detector

**This agent is spawned only if the module contains only frontend or mobile parts.**

**Control Areas:**

A. **User Interface Consistency:**
   - Validation of page/screen navigation
   - Handling of loading/error/empty state
   - Mechanisms for pull-to-refresh, pagination, and retry
   - Behavior of back button/navigation

B. **State Management:**
   - Incomplete update of context/store in scenarios
   - Risk of stale data (cache invalidation incomplete)
   - Risk of race condition (double-tap, rapid navigation)
   - Memory leak (update of unmounted component state — cleanup)

C. **UI/UX Consistency:**
   - Adherence to theme/style system rules
   - Usage of hardcoded color/size (if any) is forbidden
   - Handling of platform differences (iOS vs Android, responsive)

D. **Performance:**
   - Inconsistent re-rendering (memo/callback incomplete)
   - Optimization of large list rendering (virtualization)
   - Optimization of image/media rendering
   - Avoidance of heavy calculations on render side

**OUTPUT FORMAT:** Same table format as the API agent.

---

### Agent 4: Scenario Validator

>>>
**Control Scenarios:**

1. List all user flows (happy path) for the module
2. Identify edge cases for each flow
3. Verify if edge cases are handled in code
4. Report unhandled scenarios

**Scenario Categories:**

A. **Data Boundary Values:** Null/undefined/empty, very long string, special characters, min/max limits
B. **Synchronization/Ordering:** Concurrent request, stale data, token expiry in order of operations
C. **Authorization/Access:** Unauthorized access, cross-user data access (IDOR), session expire after
D. **Business Rules:** Invalid state transitions, cascade effects, linked data consistency
E. **Infrastructure:** DB connection loss, cache unavailability, file upload limits, push notification failure

**OUTPUT FORMAT:**

```markdown
## Scenario Analysis: {module}

### USER FLOWS (Happy Path)
| # | Flow | Steps | Status |
|---|------|---------|-------|
| 1 | New registration | Form → Save → Login | OK/MISSING |

### UNHANDLED EDGE CASES
| # | Flow | Scenario | File:Line | Effect | Priority |
|---|------|---------|-------------|------|---------|
| 1 | Registration | Null value input | controller.ts:45 | 500 error | HIGH |

### TEST REQUIREMENTS
| # | Scenario | Test Type | Scope |
|---|---------|-----------|--------|
| 1 | Concurrent request | Integration | API |
```

---

## Step 3: COLLECT AND CATEGORIZE RESULTS

All agents complete when, gather results in a single entity.

### 3.1. Two-Dimensional Classification

Classify each result into two independent values:

**Dimension 1 — Effect Severity:**

| Severity | Meaning | Example |

>>>
|--------|-------|-------|
| **CRITICAL** | Runtime crash, data loss, security breach | Type error, IDOR, transaction incompleteness |
| **MAJOR** | Incorrect behavior, missing feature, data inconsistency | Missing response field, validation failure |
| **MINOR** | Style, readability, improvement | DRY violation, magic string, incomplete comment |

**Dimension 2 — Action:**

| Action | Criteria | Decision |
|---------|--------|-------|
| **IMMEDIATE FIX** | Single file + deterministic + no estimation required | Step 4 fix it |
| **BACKLOG TASK** | Multi-file issue, migration necessary, or behavior unclear | Step 5 open task |
| **CLEANUP** | Dead code — meets security cleaning criteria? Fix. Otherwise, backlog | Decide in decision tree |
| **DOCUMENTATION** | Outdated/generational code comment | Directly update |

**NOTE:** Severity and action are independent. A critical issue can be fixed with an immediate fix (null-check). A minor issue may require a backlog task (10 files of DRY violation).

### 3.2. Interlayer Effects Analysis

Analyze cross-layer effects when agent signals arrive:

**For each API signal:**
1. Does this change affect response shape? → Cross-check with API Compliance agent's signals
2. Is the client parsing this response? → Cross-check with Frontend/Mobile agent's signals
3. Is there a corresponding change in ORM schema?

**For each client signal:**
1. Does the client's expected API contract match? → Validate API Compliance agent
2. Is auth state affected?
3. Is user experience consistent offline/network error?

### 3.3. Cross-Validation

- Differentiate between same file/sentence level differences → Prioritize higher-priority ones
- False positive suspicion → Read and validate the relevant file yourself
- **One-sided fix risk**: Fix in API, but client doesn't match → backlog task open

---

## Step 4: IMMEDIATELY FIXABLE CRITICAL ERRORS
### Direct Fix Workflow (Decision Tree)

```
Found
  ├─ Is it a file change?
    │   ├─ Yes → Is the fix net and deterministic? (does estimation require?)
    │   │   ├─ Yes → DIRECT FIX (regardless of level)
    │   │   └─ No → OPEN BACKLOG TASK
    │   └─ No → Are changed files related to each other?
    │       ├─ Yes → OPEN BACKLOG TASK
    │       └─ No (independent fixes) → DIRECT FIX
  └─ Is a database schema change required?
      ├─ Yes → OPEN BACKLOG TASK (always) + `.claude/rules/db-migration-discipline.md` dry-run/rollback criteria to add
      └─ No → Follow the above tree
```

### Refactoring Rules

1. **Read the file before making any changes** — understand the current code
2. **Follow the existing style** — keep the current coding style in the file
3. **Check for side effects** — verify whether the fix breaks another flow (search for consumers)
4. **Assign a severity level to each fix**: CRITICAL, MAJOR, MINOR
5. **ASAP**:
   - ORM migration or database schema change (`.claude/rules/db-migration-discipline.md` without dry-run and rollback control)
   - Route or middleware configuration change
   - File deletion (even if it's dead code — send to backlog)
   - Estimation (if not net — send to backlog)

---

## Step 4.5: VERIFICATION GATE

Verify the fixes after they are made. This step is NOT SKIPPABLE.

<!-- GENERATE: VERIFICATION_COMMANDS
Description: Generate verification commands using the stack information from the bootstrap manifest.
Required manifest fields: project.subprojects, stack.test_framework, stack.typescript, stack.linter
Example output:

### Verification Commands

| Layer | Command |
|--------|-------|
| API TypeScript | `cd apps/api && npx tsc --noEmit` |
| API Test | `cd apps/api && npm test` |
| Mobile TypeScript | `cd apps/mobile && npx tsc --noEmit` |
| Mobile Test | `cd apps/mobile && npm test` |
| Web TypeScript | `cd apps/web && npx tsc --noEmit` |
-->


>>>
### Validation Results Evaluation

| Result | Action |
|--------|---------|
| All controls passed | Report generated |
| Compilation error | Fix it, fix the issue, revalidate |
| Test failed | Check whether the fix broke the test |

---

## Step 4.7: QUALITY CONTROL GATE (Self-Review)

Changes made in Step 4 may contain errors. Modified files are reviewed by `code-review` and (if applicable) `devils-advocate` agents.

### When to Perform

* If **at least 1 file has been modified** in Step 4, perform this step
* If no fixes have been made, skip this step
* After completing Step 4 validation

### Infinite Loop Protection

Self-review changes should not be repeated. Maximum 1 iteration.

---

## Step 4.9: APPLY CHANGES TO COMMIT

### Commit Rules

1. **Only stage files modified in Step 4** (do NOT run git add -A)
2. **Commit message:**

```bash
git commit -m "$(cat <<'EOF'
fix({module}): deep-audit — {N} fixes applied

- {CRITICAL fix summary if applicable}
- {MAJOR fix summary if applicable}
- {MINOR fix summary if applicable}
EOF
)"
```

3. **Push** — push operation is user's responsibility

Commit completed non-sensitive work in the same session without asking. Do not push unless the user asks.

### 5.0 Duplicate Control (MANDATORY)

Before creating a task, check the existing backlog ONCE:

```
backlog task search "{module} {finding keywords}"
```

- If a similar finding is already in a task → do NOT create a new task; add a note to the existing task
- If similar but different scope → create a new task; add notes with existing task reference

### 5.1 Task Creation

```
backlog task create \
  "deep-audit: [{module}] {finding title}" \
  --description "## Review Finding\n\n**Source:** /deep-audit {module}\n**Agent:** {agent that found it}\n**File:** {file:line}\n\n## Issue\n{Detailed description}\n\n## Impact\n{Risk level}\n\n## Recommended Solution\n{How to fix}\n\n## Affected Files\n{List of files that need to change}" \
  --priority "{high|medium|low}" \
  -l "deep-audit,{module},{category}"
```

### 5.2 Security Findings Priority Rule

- IDOR, Injection, XSS → `priority: "high"`, label: `security`
- Race condition, transaction incomplete → `priority: "high"`, label: `bug`
- PII vulnerability → `priority: "high"`, label: `security`
- N+1 query, performance → `priority: "medium"`, label: `performance`
- DRY violation, refactor → `priority: "low"`, label: `refactor`

### 5.3 Related Findings Grouping

If multiple findings have the same root cause → create a single task, list all findings in notes.

---

## Step 5.5: IDOR Testing (INTEGRATED)

This step is performed by Agent 1 with security findings or separately. Mandatory for modules containing user-specific data.

<!-- GENERATE: IDOR_CHECKLIST
Description: Bootstrap stack and auth information to create IDOR control list.
Required manifest fields: stack.api_framework, stack.orm, stack.auth_method, project.subprojects
Bootstrap, framework-specific IDOR patterns:
- Express + Prisma: req.user.id + prisma.where control
- NestJS + TypeORM: @User() decorator + ownership guard
- Django + Django ORM: request.user filtering
- Laravel + Eloquent: auth()->id() filtering

Example output:


>>>
### 5 Point IDOR Control Matrix

For each endpoint, check the following 5 points:

| # | Control Point | What It Checks |
|---|----------------|---------------|
| 1 | Parameter Validation | Is there an endpoint using `req.params.id`? |
| 2 | Ownership Filter | Is there a `user_id/owner_id` filter in ORM queries? |
| 3 | Block Control | Has data exchange between blocked users been disabled? |
| 4 | Target Control | Is the person performing the action authorized (admin, owner, participant)? |
| 5 | Information Leaks | Are sensitive information from other users present in the response? |

### Hazardous Patterns

**Pattern A — Ownership filter is missing:**
```
orm.model.findFirst({ where: { id: req.params.id } })
// user_id/owner_id filter NOT applied → access to other user's data |
```

**Pattern B — Group query with unfiltered listing:**
```
orm.model.findMany({ where: { userId: req.params.userId } })
// req.params.userId != authenticated_user.id not checked |
```

**Pattern C — Block control is missing:**
```
// like in getUserById endpoints
// data exchange between blocked users NOT disabled |
```

### IDOR Report Format

```
| Endpoint | HTTP | Parameter | ORM Query | Ownership | IDOR Risk |
|----------|------|-----------|-------------|-----------|-----------|
| getUser  | GET  | :id       | findFirst   | PRESENT   | LOW      |
| updateX  | PUT  | :id       | update      | MISSING   | CRITICAL  |
```

---

## Step 6: Notify User of IDOR

### Table 1: Fixed Errors (N fix, M file)

```
| #  | Severity | File                    | Fix                                        |

>>>
|----|--------|--------------------------|--------------------------------------------|
| 1  | CRITICAL | controller.ts:45         | IDOR: ownership control added             |
| 2  | MAJOR   | auth.service.ts:120      | Token expiry check added                  |
| 3  | MINOR   | screen.tsx:89            | Error message improved                     |

**Priority**: CRITICAL → MAJOR → MINOR

### Table 1: Added Tasks to Backlog (N task)

```
| Task     | Priority | Description                              |
|----------|---------|-------------------------------------------|
| TASK-XX  | High    | Re-write token refresh mechanism           |
| TASK-XX  | Medium  | ORM schema security audit                  |
```

### Table 2: Inter-Module Effects (if any)

```
| # | Fix/Bug | Source | Affected | Effect | Status |
|---|-----------|--------|-----------|------|-------|
| 1 | Added field to response | API | Mobile | New field parseable | Verified |
```

### Report Summary

```
Verification: TypeScript OK | Test OK | Self-review OK
OK: {commit_hash} — fix({module}): deep-audit — {N} fixes applied
⚠️ Push not done — do it when ready.
```

---

## Step 7: FOLLOW-UP REVIEW REQUIREMENTS (MINIMUM 5 SCENARIOS)

### 7.1. Source Code Analysis

Get recommendations from these sources:

**A. Chain Effect Analysis (Step 3.2):**
- Modules that the reviewed module touches but not reviewed

**B. Cross-Cutting Concern Examples:**
- Same type bug (dead code, IDOR, null-check missing) in other modules?

**C. Independent Module Closure:**
- Modules that were not included in the review process but have relevant files
```
 
---

## .claude/rules/db-migration-discipline.md
**D. Backlog Task Maturity:**
- The modules affected by the tasks encountered during this review

**E. Time-Based Risk:**
- Unreviewed modules with a long lifespan

### 7.2. Need and Benefit Evaluation

Two-dimensional evaluation for each task:

| Score | Need | Benefit |
|------|---------|-------|
| 5 | High — Known issue indicator | Very high — High security risk detection likelihood |
| 4 | High — Cross-cutting risk | High — Multiple screens adjustment |
| 3 | Medium — Indirect connection | Medium — Technical debt reduction |
| 2 | Low — General hygiene | Low — Cosmetic improvement |
| 1 | Optional | Minimal — Only cleanup |

### 7.3. Recommendation Table

```
## Next Review Recommendations

| # | Command | Need | Benefit | Total | Mandatory |
|---|-------|---------|-------|--------|---------|
| 1 | `/deep-audit notification` | 5 | 5 | ★★★★★ | Push pipeline issue detection |
| 2 | `/deep-audit profile` | 4 | 4 | ★★★★ | IDOR pattern found |
| 3 | `/deep-audit message` | 4 | 3 | ★★★½ | Last changes not reviewed |
| 4 | `/deep-audit search` | 3 | 4 | ★★★½ | Rate limiting possible omission |
| 5 | `/deep-audit payment` | 3 | 3 | ★★★ | Payment trail verification necessary |
```

**Sorting:** Total score from high to low.

### 7.4. Recommendation Rules

1. **Minimum 5 needed**
2. **Self-recommendation** — Recommend the module that was previously reviewed again
3. **Mandatory concrete evidence** — Provide concrete evidence in the review sequence detected issue/pattern
4. **Duplicate elimination** — Eliminate duplicates in backlog with a task already reviewed

---

## DEAD CODE DETECTION AND CLEANUP

### Detection Methodology

**1. Unused Function Detection:**
```
For each exported function:

>>> 
```
1. Grep(pattern="functionName", path="{subproject}/src/", output_mode="count")
2. CANDIDATE → Result = 1 (only for definition)
3. CANDIDATE → Active, skip
4. Dynamic call control for CANDIDATE (route string ref, middleware chain)

**2. Orphan Route Detection:**
```
Route all routes from files.
Verify if the target controller function exists for each route.
No target function found → DEAD ROUTE
```

**3. ORM Schema-Controller Compatibility:**
```
Extract model fields from schema.
Monitor used fields in controller queries.
Unused field → UNQUERIED FIELD
```

### Dead Code Cleanup Rules

**SECURE CLEANUP (do directly):** Remove unused local variable, commented-out code, unused import
**CAREFUL CLEANUP (grep + validation after):** Exported function, constant
**BACKLOG (do NOT do directly):** Database columns, file deletion, ORM schema changes

---

## Memory System Integration

### Before Review: Recall
Before agent spawn, ONCE accumulate past information for the module (episodic-memory).

### After Review: Store Learned Information
Permanent findings stored in memory system.

---

## Learning Record

> Completed training after this. For learning record rules, see: `.claude/rules/memory-protocol.md`

---

## Mandatory Rules

### Invariant rules (apply to every command)

1. **Do not write config into Codebase** — Only `Agentbase` directory can be created in `.claude/`, `CLAUDE.md`, `.mcp.json`, and `.claude-ignore` files. Writing `.claude/` directory or `../Codebase/CLAUDE.md` is NOT ALLOWED.
2. **Git runs only in Codebase** — All Git operations (commit, push, branch) must be performed within the `../Codebase/` directory. `Agentbase` does not have Git.

>>>
3. **Codebase is readable; config is not written there** — The project directories (`src/`, `app/`, etc.) are readable and can be organized as needed. Configuration files (`.claude/`, `CLAUDE.md`) are NOT written in the codebase.

1. **Invariant 1: Unchanged** — Do not modify the file without spawning an agent.
2. **Agents Spawn in Parallel** — Independent agents should spawn in a single message.
3. **Two-Dimensional Classification** — Each entity (level + action) is separately defined.
4. **Backlog-Action Entities MUST be Tasks** — Backlog entities are created using the CLI.
5. **Duplicate Control of Backlog Entities IS REQUIRED** — Task review before execution.
6. **Validation Gate IS REQUIRED** — Fix after validation and compilation without testing report submission.
7. **Self-Review Gate** — Review agent is executed if file organization changes in step 4.
8. **False Positive Elimination** — Response utility format is checked, existing guards are controlled.
9. **Fixes are Verified After Validation** — Do NOT push.
10. **Code Modification IS NOT ALLOWED** — Before each modification, read the current file and follow the existing style.
11. **High Security Required for Dead Code Cleaning** — Dynamic call risk entities should not be directly cleaned.
12. **IDOR Inspection IS REQUIRED** — For user-specific data-containing modules.

<!-- GENERATE: SELF_REFRESH
Description: Command final step - self-refresh check. Bootstrap replaces this marker
with the shared Self-Refresh section. The command reviews its own text against the
project reality: small mismatches via Edit, large changes reported as a backlog task.
-->

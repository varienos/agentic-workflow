# IDOR Scan — Security Audit

> Scans all API endpoints for IDOR (Insecure Direct Object Reference) vulnerabilities.
> Usage: `/idor-scan`, `/idor-scan auth`, `/idor-scan <module_name>`

---

## Rule: WORK AUTONOMOUSLY

- Do NOT ask the user questions — scan all endpoints and report.
- Fix simple IDOR issues (missing ownership filter) DIRECTLY.
- RECORD complex issues (requiring architectural change) in the backlog.
- RUN every step — do not skip a step.

---

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.description, stack.primary, project.structure, project.subprojects
Example output:
## Project Context
- **Project:** E-commerce platform (Next.js + NestJS + React Native)
- **Stack:** TypeScript, Prisma, PostgreSQL
- **API Framework:** NestJS
- **Auth:** JWT + Guard pattern
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## Step 1 — Endpoint Inventory

Find and list all API endpoints.

<!-- GENERATE: CONTROLLER_TABLE
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.structure, project.api_endpoints, project.modules
Example output:
### Controller/Handler Files

| Priority | File | Module | Endpoint Count | Auth |
|---|---|---|---|---|
| 🔴 P1 | `apps/api/src/modules/users/users.controller.ts` | users | 8 | JWT Guard |
| 🔴 P1 | `apps/api/src/modules/orders/orders.controller.ts` | orders | 12 | JWT Guard |
| 🔴 P1 | `apps/api/src/modules/payments/payments.controller.ts` | payments | 5 | JWT Guard |
| 🟠 P2 | `apps/api/src/modules/products/products.controller.ts` | products | 10 | Mixed |
| 🟢 P3 | `apps/api/src/modules/categories/categories.controller.ts` | categories | 4 | Public |

**Prioritization:**
- 🔴 P1: Endpoints containing user-specific data (order, payment, profile)
- 🟠 P2: Mixed-access endpoints (public + authenticated)
- 🟢 P3: Fully public endpoints
-->

If the user specified a module, scan only that module. Otherwise scan all controllers starting from P1.

---

## Step 2 — 5-Point IDOR Control Matrix

Apply the following 5 checks for each endpoint:

### Check 1 — Parameter Access
**Question:** Does the endpoint take an ID parameter in the URL or body?
**Look for:** `:id`, `params.id`, `body.userId`, `query.orderId`, etc.
**Risk:** Every endpoint with an ID parameter is a potential IDOR target.

```
EXAMPLE IDOR:
GET /api/orders/:id  →  Can another user's order be viewed?
PUT /api/users/:id   →  Can another user's profile be changed?
```

### Check 2 — Ownership Filter
**Question:** Is there a `userId` or `ownerId` filter in the database query?
**Look for:** `where: { userId: req.user.id }`, `findFirst({ where: { id, userId } })`, etc.
**Risk:** Missing ownership filter means a definite IDOR vulnerability.

```
SAFE:
prisma.order.findFirst({ where: { id: orderId, userId: req.user.id } })

UNSAFE (IDOR):
prisma.order.findFirst({ where: { id: orderId } })
```

### Check 3 — Authorization Block
**Question:** Is there an authorization check for endpoint access?
**Look for:** Guard, middleware, decorator (@Roles, @Auth), permission check
**Risk:** Without authorization, anyone can access it.

### Check 4 — Acting Party Check
**Question:** Is the acting user the owner of the affected resource?
**Look for:** `req.user.id === resource.userId` check
**Risk:** Actions can be performed on another user's resource.

```
EXAMPLE:
// Order cancel — verify order owner
const order = await prisma.order.findUnique({ where: { id } });
if (order.userId !== req.user.id) throw new ForbiddenException();
```

### Check 5 — Response Information Leak
**Question:** Does the response return unnecessary sensitive information?
**Look for:** Password hash, internal IDs, other users' data, system information
**Risk:** Information leaks can enable other attacks.

```
UNSAFE:
return user;  // all fields returned (including password hash)

SAFE:
return { id: user.id, name: user.name, email: user.email };
```

---

## Step 3 — Apply the Scan

Open each controller file and review endpoint by endpoint:

<!-- GENERATE: MODULE_MAPPING
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.structure, project.modules
Example output:
### Module → File Mapping

| Module | Controller | Service | DTO | Test |
|---|---|---|---|---|
| users | `users.controller.ts` | `users.service.ts` | `dto/update-user.dto.ts` | `users.controller.spec.ts` |
| orders | `orders.controller.ts` | `orders.service.ts` | `dto/create-order.dto.ts` | `orders.controller.spec.ts` |
| payments | `payments.controller.ts` | `payments.service.ts` | `dto/payment.dto.ts` | - |
-->

<!-- GENERATE: KNOWN_PATTERNS
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: stack.api_framework, project.conventions, project.auth_pattern
Example output:
### Known Safe Patterns

Safe patterns used in this project:

**Ownership Filter Pattern (NestJS + Prisma):**
```typescript
// In the service layer — userId filter on every query
async findOne(id: string, userId: string) {
  const record = await this.prisma.order.findFirst({
    where: { id, userId },
  });
  if (!record) throw new NotFoundException();
  return record;
}
```

**Guard Pattern:**
```typescript
@UseGuards(JwtAuthGuard)
@Get(':id')
async findOne(@Param('id') id: string, @CurrentUser() user: User) {
  return this.service.findOne(id, user.id);
}
```

**DTO Response Pattern:**
```typescript
// Return only required fields in the response
return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
```
-->

Record the result of all 5 checks for each endpoint.

---

## Step 4 — Risk Assessment

### Finding Classification

| Level | Description | Action |
|---|---|---|
| 🔴 CRITICAL | Ownership filter MISSING + sensitive data | Fix immediately |
| 🟠 HIGH | Ownership filter INCOMPLETE (on some queries) | Fix immediately |
| 🟡 MEDIUM | Information leak, missing guard | Fix or backlog |
| 🟢 LOW | Improvement suggestion | Report |
| ⚪ INFO | Pattern suggestion, best practice | Report |

### Decision Table

| Check 1 | Check 2 | Check 3 | Check 4 | Check 5 | Result |
|---|---|---|---|---|---|
| ID present | Filter MISSING | Guard PRESENT | Check MISSING | Leak MISSING | 🔴 CRITICAL |
| ID present | Filter PRESENT | Guard PRESENT | Check PRESENT | Leak MISSING | ✅ SAFE |
| ID present | Filter PRESENT | Guard PRESENT | Check MISSING | Leak MISSING | 🟡 MEDIUM |
| ID present | Filter MISSING | Guard MISSING | Check MISSING | Leak PRESENT | 🔴 CRITICAL |
| No ID | - | Guard PRESENT | - | Leak MISSING | ✅ SAFE |
| No ID | - | Guard MISSING | - | Leak PRESENT | 🟡 MEDIUM |

---

## Step 5 — Fixes

### Direct Fix Rules

Fix CRITICAL and HIGH findings immediately:

1. **Missing ownership filter:** Add a `userId` filter to the query in the service layer.
2. **Missing guard:** Add `@UseGuards(JwtAuthGuard)` to the controller endpoint.
3. **Information leak:** Create a response DTO and apply `exclude`.
4. **Missing party check:** Add a resource-owner check.

### Backlog Task Rules

The following cases are recorded in the backlog:
- Issues requiring architectural change (shared middleware, global guard)
- Systematic issues affecting multiple controllers
- Changes that need new DTO/response classes (broad scope)

```bash
backlog task create "IDOR: <issue> in <module> module" --description "<detail>" --priority high --labels "security,idor"
```

---

## Step 6 — Verification

If a fix was made:

1. Run type check
2. Run existing tests
3. Validate the fixed endpoint with a test scenario

```bash
cd ../Codebase && npx tsc --noEmit
cd ../Codebase && npm run test -- --passWithNoTests
```

Commit completed non-sensitive work in the same session without asking. Do not push unless the user asks.

---

## Step 7 — Result Report

```
## 🛡️ IDOR Scan Report

### Scope
- **Controllers scanned:** X
- **Endpoints scanned:** Y
- **Modules scanned:** [module list]

### Findings Summary

| Level | Count | Direct Fix | Backlog |
|---|---|---|---|
| 🔴 CRITICAL | X | Y | Z |
| 🟠 HIGH | X | Y | Z |
| 🟡 MEDIUM | X | Y | Z |
| 🟢 LOW | X | - | - |
| **Total** | **X** | **Y** | **Z** |

### Detailed Findings

| # | Endpoint | Module | Check Results | Level | Action |
|---|---|---|---|---|---|
| 1 | `GET /api/orders/:id` | orders | ❌❌✅❌✅ | 🔴 CRITICAL | FIXED |
| 2 | `PUT /api/users/:id` | users | ❌✅✅❌✅ | 🟠 HIGH | FIXED |
| 3 | `GET /api/products/:id` | products | ✅✅✅✅✅ | ✅ SAFE | - |

### 5-Point Check Legend
1️⃣ Parameter Access | 2️⃣ Ownership Filter | 3️⃣ Authorization Block | 4️⃣ Party Check | 5️⃣ Information Leak

### Fixes Applied
| # | File | Change |
|---|---|---|
| 1 | `<path>` | Ownership filter added |

### Backlog Tasks Created
| # | Title | Priority |
|---|---|---|
| 1 | <title> | P1 |

### Overall Assessment
[2-3 sentences about the project's IDOR security posture]
```

---

## Mandatory Rules

### Invariant rules (apply to every command)

1. **Do not write config into Codebase** — `.claude/`, `CLAUDE.md`, `.mcp.json`, `.claude-ignore` files are created ONLY inside Agentbase. Do not create a `.claude/` directory inside Codebase; writing `../Codebase/CLAUDE.md` is FORBIDDEN.
2. **Git runs only in Codebase** — All git operations (commit, push, branch) run inside `../Codebase/`. There is NO git in Agentbase.
3. **Codebase is readable; config is not written there** — Project files (`src/`, `app/`, etc.) can be read and edited when the task requires it. Config files (`.claude/`, `CLAUDE.md`) CANNOT be written inside Codebase.

1. **Work autonomously** — Do not ask questions; scan and report.
2. **Read first, write later** — Do not fix before understanding the endpoint and service.
3. **Follow patterns** — Follow the existing security pattern.
4. **CRITICAL is fixed immediately** — Do not put a critical IDOR vulnerability on the backlog; fix it now.
5. **Fix in the service layer** — Add the ownership filter in the service, not the controller.
6. **Run tests** — After a fix, run type check and tests.
7. **Report is MANDATORY** — Always produce a result report.
8. **Watch for false positives** — Do not hunt IDOR on public endpoints (for example product listing).
9. **Admin endpoints are separate** — Admin panel endpoints follow different rules (role-based, not IDOR).
10. **Codebase path** — Access all project files via `../Codebase/`.

<!-- GENERATE: SELF_REFRESH
Description: Command final step - self-refresh check. Bootstrap replaces this marker
with the shared Self-Refresh section. The command reviews its own text against the
project reality: small mismatches via Edit, large changes reported as a backlog task.
-->


## Invariant rules

- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
- Do not write config into Codebase
- Codebase is readable; config is not written there

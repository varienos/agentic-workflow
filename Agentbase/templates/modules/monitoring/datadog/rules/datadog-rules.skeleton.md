# Datadog Rules

> These rules apply to projects that use Datadog integration.
> All developers and agents MUST follow these rules.

---

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.name, project.description, project.structure
Example output:
## Project Context

- **Project:** MyApp — E-commerce platform
- **Structure:** Monorepo (`apps/web/` + `apps/api/`)
- **Datadog SDK:** dd-trace + @datadog/browser-rum
- **DD_ENV:** development | staging | production
- **DD_SERVICE:** myapp-api, myapp-web
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## APM and Tracing Rules

Distributed tracing with Datadog APM is MANDATORY. Trace propagation must be provided for all inter-service communication.

### Tracer Startup

```typescript
// CORRECT — dd-trace must be the first import (instrument.ts or tracer.ts)
import tracer from 'dd-trace';

tracer.init({
  service: process.env.DD_SERVICE,
  env: process.env.DD_ENV,
  version: process.env.DD_VERSION,
  logInjection: true, // Inject trace ID into logs
  runtimeMetrics: true,
  profiling: true,
});

export default tracer;
```

```typescript
// CORRECT — Creating a custom span
import tracer from './tracer';

async function processOrder(orderId: string) {
  return tracer.trace('order.process', {
    resource: orderId,
    tags: {
      'order.id': orderId,
      'order.type': 'standard',
    },
  }, async (span) => {
    try {
      const order = await getOrder(orderId);
      span.setTag('order.total', order.total);

      await validateInventory(order);
      await chargePayment(order);
      await sendConfirmation(order);

      return order;
    } catch (error) {
      span.setTag('error', true);
      span.setTag('error.message', error.message);
      throw error;
    }
  });
}
```

### Trace Propagation

```typescript
// CORRECT — Trace propagation on inter-service HTTP requests
import tracer from 'dd-trace';

// dd-trace automatically instruments HTTP clients (axios, fetch, http)
// Extra configuration is not required, but verify:
tracer.use('http', { enabled: true });
tracer.use('express', { enabled: true });
```

### APM Rules Table

| Rule | Description |
|---|---|
| `dd-trace` first import | Import at the top so other modules can be instrumented |
| Create custom spans | Measure critical business logic with `tracer.trace` |
| Add span tags | Use meaningful tags for operation details |
| On error set `error: true` | Set error info on the span |
| Trace propagation active | Trace context must be carried on inter-service requests |

---

## RUM (Real User Monitoring) Rules

The Datadog RUM SDK is used on the browser side to measure user experience.

```typescript
// CORRECT — RUM SDK init
import { datadogRum } from '@datadog/browser-rum';

datadogRum.init({
  applicationId: process.env.NEXT_PUBLIC_DD_APPLICATION_ID,
  clientToken: process.env.NEXT_PUBLIC_DD_CLIENT_TOKEN,
  site: 'datadoghq.eu', // Or datadoghq.com
  service: process.env.NEXT_PUBLIC_DD_SERVICE,
  env: process.env.NEXT_PUBLIC_DD_ENV,
  version: process.env.NEXT_PUBLIC_DD_VERSION,

  // Session replay
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20, // Keep low in production
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,

  // PII protection
  defaultPrivacyLevel: 'mask-user-input',
});

// Start session replay
datadogRum.startSessionReplayRecording();
```

```typescript
// CORRECT — Custom action tracking
datadogRum.addAction('checkout_started', {
  cartTotal: cart.total,
  itemCount: cart.items.length,
  currency: 'TRY',
});

// CORRECT — Set user info
datadogRum.setUser({
  id: user.id,
  name: user.name,
  plan: user.subscriptionPlan,
});

// CORRECT — Clear on logout
datadogRum.clearUser();
```

### RUM Rules Table

| Rule | Description |
|---|---|
| `applicationId` and `clientToken` from env | Hardcoded values FORBIDDEN |
| Low `sessionReplaySampleRate` in production | Use `10`-`20` for cost control |
| `defaultPrivacyLevel: 'mask-user-input'` | Mask user inputs (KVKK/GDPR) |
| Custom action tracking | Measure critical user actions |
| Set user context | Tie errors and performance to the user |

---

## Log Management

Structured logging provides Datadog Log Management integration.

```typescript
// CORRECT — Structured logging (JSON format)
import pino from 'pino'; // or winston

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  // With dd-trace logInjection: true, trace ID is injected automatically
});

// CORRECT — Meaningful log messages
logger.info({ orderId: order.id, userId: user.id }, 'Order created');
logger.error({ err, orderId }, 'Payment operation failed');
logger.warn({ userId, attemptCount }, 'Failed login attempt');

// WRONG — Unstructured log
console.log('Order created: ' + orderId); // FORBIDDEN
console.log(`User ${userId} failed login`); // FORBIDDEN
```

```typescript
// CORRECT — Request tracking with correlation ID
import { v4 as uuidv4 } from 'uuid';

function correlationMiddleware(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  // Attach correlation ID to logger
  req.log = logger.child({ correlationId });
  next();
}
```

### Log Level Standards

| Level | Usage | Example |
|---|---|---|
| `fatal` | Application cannot continue | Database connection completely lost |
| `error` | Operation failed; intervention required | Payment operation failed |
| `warn` | Potential issue; attention needed | Approaching rate limit |
| `info` | Normal workflow events | Order created, user signed in |
| `debug` | Detail for development/debug | SQL query, request/response detail |
| `trace` | Most detailed level | Function enter/exit |

### Log Rules Table

| Rule | Description |
|---|---|
| JSON format MANDATORY | Use structured logging; plain text FORBIDDEN |
| Trace ID injection | Log-trace correlation via `logInjection: true` |
| Correlation ID | `x-correlation-id` header for inter-service request tracking |
| Use log levels correctly | `error` != `warn`; set severity correctly |
| `console.log` FORBIDDEN | Use a logger library (pino, winston) |
| PII logging FORBIDDEN | Do not log password, credit card, national ID, etc. |

---

## Environment Settings

Standard environment variables must be used across all Datadog integrations.

### Required Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DD_ENV` | Environment name | `production`, `staging`, `development` |
| `DD_SERVICE` | Service name | `myapp-api`, `myapp-web`, `myapp-worker` |
| `DD_VERSION` | Application version | `1.2.3`, git short hash |
| `DD_API_KEY` | Datadog API key | For agent or CI/CD |
| `DD_TRACE_AGENT_URL` | Trace agent URL | `http://localhost:8126` (default) |

### Unified Service Tagging

```yaml
# CORRECT — unified service tagging in docker-compose.yml
services:
  api:
    environment:
      - DD_ENV=production
      - DD_SERVICE=myapp-api
      - DD_VERSION=${APP_VERSION}
    labels:
      com.datadoghq.tags.env: production
      com.datadoghq.tags.service: myapp-api
      com.datadoghq.tags.version: ${APP_VERSION}
```

### Environment Rules Table

| Rule | Description |
|---|---|
| Set `DD_ENV` in every environment | Metrics, traces, and logs must be filterable by environment |
| Set `DD_SERVICE` on every service | Build service-based dashboards and alerts |
| Update `DD_VERSION` on every deploy | Version-based regression detection |
| Unified service tagging | Same tags must be consistent across metrics, traces, and logs |
| API key SECRET | Never write `DD_API_KEY` into code or logs |

---

## Forbidden Practices (Anti-patterns)

| # | Forbidden | Why | Correct Alternative |
|---|---|---|---|
| 1 | Logging with `console.log` | Loses structured logging; does not flow to Datadog | JSON log with Pino/Winston |
| 2 | Inter-service request without trace | Breaks the distributed tracing chain | Automatic propagation with `dd-trace` |
| 3 | Hardcoded `DD_API_KEY` | Security risk; key is exposed | Use env variable or secret manager |
| 4 | Deploy without setting `DD_ENV` | Metrics and logs cannot be split by environment | `DD_ENV` is MANDATORY in every environment |
| 5 | High `sessionReplaySampleRate` | Cost explosion | Use `10`-`20` in production |
| 6 | Logging PII | KVKK/GDPR violation risk | Filter or mask sensitive data |
| 7 | High-cardinality tags on custom metrics | Metric explosion and cost | Keep tag values limited (< 1000 unique) |
| 8 | Custom span on every function | Performance impact, unnecessary data | Create spans only for critical business logic |

---

## Mandatory Rules

1. **`dd-trace` first import** — Tracer starts before all other modules.
2. **Unified service tagging** — `DD_ENV`, `DD_SERVICE`, `DD_VERSION` are set in every environment.
3. **Structured logging** — JSON format MANDATORY; `console.log` FORBIDDEN.
4. **Trace propagation** — Trace context MUST be carried in inter-service communication.
5. **Log-trace correlation** — Trace ID is added to logs via `logInjection: true`.
6. **Correlation ID** — Use `x-correlation-id` header on inter-service requests.
7. **RUM privacy** — Mask user inputs with `defaultPrivacyLevel: 'mask-user-input'`.
8. **API key security** — Never write `DD_API_KEY` into code, logs, or the client bundle.
9. **Custom spans carefully** — Create spans only for critical business logic; do not add to every function.
10. **Correct log level** — `error` != `warn`; set severity correctly and use consistently.


## Invariant rules

- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
- Do not write config into Codebase
- Codebase is readable; config is not written there

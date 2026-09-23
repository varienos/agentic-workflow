# Sentry Rules

> These rules apply to projects that use Sentry integration.
> All developers and agents MUST follow these rules.

---

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.name, project.description, project.structure
Example output:
## Project Context

- **Project:** MyApp — E-commerce platform
- **Structure:** Monorepo (`apps/web/` + `apps/api/`)
- **Sentry SDK:** @sentry/react + @sentry/node
- **DSN:** Via env variable (`NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`)
- **Environment:** development | staging | production
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## Error Boundary Rules

An error boundary is MANDATORY for every page/screen in React and React Native projects.

```typescript
// CORRECT — Wrap with Sentry Error Boundary
import * as Sentry from '@sentry/react';

function FallbackUI({ error, resetError }) {
  return (
    <div role="alert">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={resetError}>Try Again</button>
    </div>
  );
}

// Use Error Boundary on every page/screen
export default Sentry.withErrorBoundary(MyPageComponent, {
  fallback: FallbackUI,
  showDialog: false, // Do not show a dialog to the user in production
});
```

```typescript
// CORRECT — Screen-level error boundary for React Native
import * as Sentry from '@sentry/react-native';

const WrappedScreen = Sentry.wrap(MyScreen);
```

### Error Boundary Rules Table

| Rule | Description |
|---|---|
| Error boundary on every page/screen | Uncaught errors are reported to Sentry automatically |
| Fallback UI MANDATORY | Show a meaningful error message to the user |
| Nested boundary | Add a separate boundary for critical components (form, payment) |
| `componentDidCatch` FORBIDDEN | Use Sentry.ErrorBoundary or `withErrorBoundary` |

---

## Sentry Configuration

```typescript
// CORRECT — sentry.config.ts
import * as Sentry from '@sentry/react'; // or @sentry/node, @sentry/react-native

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, // DSN always comes from env
  environment: process.env.NODE_ENV,        // Environment must be set correctly
  release: process.env.SENTRY_RELEASE,      // Release version comes from deploy

  // Low sample rate in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // You may disable Sentry in development
  enabled: process.env.NODE_ENV !== 'development',

  // Do NOT send PII
  sendDefaultPii: false,

  // Filter sensitive URLs
  beforeSend(event) {
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  },
});
```

### Configuration Rules Table

| Rule | Description |
|---|---|
| DSN comes from env variable | Hardcoded DSN FORBIDDEN |
| `environment` set correctly | Separate `development`, `staging`, `production` |
| Low `tracesSampleRate` in production | `0.1`-`0.2` in production, `1.0` in development |
| `sendDefaultPii: false` | Default is not to send personal data |
| `enabled` by environment | Optionally disabled in development |

---

## Source Map Management

Source maps must be uploaded to Sentry during deploy.

```bash
# CORRECT — source map upload with sentry-cli
npx @sentry/cli sourcemaps upload \
  --release=$SENTRY_RELEASE \
  --org=$SENTRY_ORG \
  --project=$SENTRY_PROJECT \
  ./dist
```

```javascript
// CORRECT — Automatic upload with Webpack/Vite plugin
// next.config.js (Next.js example)
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  hideSourceMaps: true, // Hide source maps in production
});
```

### Source Map Rules Table

| Rule | Description |
|---|---|
| Upload source maps on every deploy | Error stack traces must be readable |
| `sentry-cli` or framework plugin | Prefer CI/CD integration over manual upload |
| `hideSourceMaps: true` | Do not expose source maps publicly in production builds |
| Match with release | Source maps must be associated with the correct release version |

---

## Breadcrumb and Context

Breadcrumbs should be added on important user actions and user context should be set.

```typescript
// CORRECT — Add breadcrumb on user action
Sentry.addBreadcrumb({
  category: 'user.action',
  message: 'Added product to cart',
  level: 'info',
  data: {
    productId: product.id,
    quantity: 1,
  },
});

// CORRECT — Set user context (after login)
Sentry.setUser({
  id: user.id,
  email: user.email, // Only if needed; watch PII rules
  username: user.username,
});

// CORRECT — Clear user context on logout
Sentry.setUser(null);

// CORRECT — Extra context
Sentry.setContext('order', {
  orderId: order.id,
  total: order.total,
  currency: order.currency,
});
```

### Breadcrumb Rules Table

| Rule | Description |
|---|---|
| Breadcrumb on critical actions | Add on payment, form submit, navigation, etc. |
| Set user context after login | Tie errors to the user |
| `setUser(null)` on logout | Clear user context |
| Follow PII rules | Do not put sensitive data in breadcrumbs |

---

## Release Tracking

A Sentry release must be created on every deploy and commit info must be attached.

```bash
# CORRECT — Create release in CI/CD pipeline
export SENTRY_RELEASE=$(git rev-parse --short HEAD)

# Create release
npx @sentry/cli releases new $SENTRY_RELEASE \
  --org=$SENTRY_ORG \
  --project=$SENTRY_PROJECT

# Attach commit info
npx @sentry/cli releases set-commits $SENTRY_RELEASE \
  --auto --org=$SENTRY_ORG

# Attach deploy info
npx @sentry/cli releases deploys $SENTRY_RELEASE new \
  --env=production --org=$SENTRY_ORG

# Finalize release
npx @sentry/cli releases finalize $SENTRY_RELEASE \
  --org=$SENTRY_ORG
```

### Release Rules Table

| Rule | Description |
|---|---|
| Create release on every deploy | Associate errors with the deploy version |
| Attach commit info | Suspect commit detection with `set-commits --auto` |
| Specify deploy environment | Separate `production`, `staging` |
| Finalize release | Close the release after deploy completes |

---

## Forbidden Practices (Anti-patterns)

| # | Forbidden | Why | Correct Alternative |
|---|---|---|---|
| 1 | Logging errors with `console.error(err)` | Not reported to Sentry; error is lost | Use `Sentry.captureException(err)` |
| 2 | Silently swallowing in `try-catch` | Error is hidden; debugging becomes impossible | Call `Sentry.captureException` inside the catch block |
| 3 | Sending PII | KVKK/GDPR violation risk | Filter with `beforeSend`; `sendDefaultPii: false` |
| 4 | Hardcoded DSN | Wrong DSN used across environments | Use env variable (`SENTRY_DSN`) |
| 5 | High `tracesSampleRate` in production | Unnecessary cost and performance impact | Use `0.1`-`0.2` in production |
| 6 | Deploy without source map upload | Stack traces unreadable; debugging impossible | Add source map upload in CI/CD |
| 7 | `Sentry.captureMessage` for errors | Error context is lost (no stack trace) | Use `Sentry.captureException` |
| 8 | `Sentry.captureException` + `throw` on every error | Same error reported twice | Either catch or rethrow; do not do both |

---

## Mandatory Rules

1. **DSN from env variable** — Hardcoded DSN FORBIDDEN; use environment-based env variables.
2. **Error boundary on every page** — Every page/screen in React/RN projects is wrapped with `Sentry.ErrorBoundary`.
3. **Source maps on every deploy** — Deploy without source map upload is FORBIDDEN.
4. **Release tracking** — A Sentry release is created on every deploy and commit info is attached.
5. **Do not send PII** — `sendDefaultPii: false`; filter sensitive data with `beforeSend`.
6. **Use `captureException`** — Report with `Sentry.captureException` instead of `console.error`.
7. **Add breadcrumbs** — Enrich context with breadcrumbs on critical user actions.
8. **Set `tracesSampleRate`** — `0.1`-`0.2` in production, `1.0` in development.


## Invariant rules

- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
- Do not write config into Codebase
- Codebase is readable; config is not written there

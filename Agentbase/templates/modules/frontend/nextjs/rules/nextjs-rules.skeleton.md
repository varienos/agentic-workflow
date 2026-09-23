# Next.js rules

> These rules apply to Next.js projects.
> All plugins and agents MUST comply with these rules.

---

<!-- GENERATE: CODEBASE_CONTEXT
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.name, project.description, project.structure
Example output:
## Project context

- **Project:** MyApp — E-commerce platform
- **Structure:** Monorepo (Next.js project under `apps/web/`)
- **Next.js version:** 14.x (App Router)
- **Deployment:** Vercel
- **Styling:** Tailwind CSS
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

<!-- GENERATE: ROUTER_TYPE
Explanation: This section is populated by Bootstrap automatically.
Required manifest fields: project.structure, project.framework_config
Example output:
## Router type: App Router

- **Detection:** Presence of `app/` directory, `appDir` enabled in `next.config.js`
- **Layout system:** Nested layouts via `layout.tsx` files in folders
- **Data fetching:** Server Components + async/await
- **API:** Route Handlers (`app/api/`)
-->

---

## Rendering strategy

### Server Components (default)

```typescript
// CORRECT — Server Component (default, no directive needed)
// app/products/page.tsx
export default async function ProductsPage() {
  const products = await getProducts(); // Direct async/await

  return (
    <div>
      <h1>Products</h1>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

// WRONG (FORBIDDEN) — Unnecessary 'use client' on a Server Component
'use client'; // unnecessary when the component has no interactivity
export default function AboutPage() {
  return <div>About us</div>;
}
```

### Client Components

```typescript
// CORRECT — 'use client' only when interactivity is required
'use client';

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}

// WRONG (FORBIDDEN) — Data fetching in a Client Component
'use client';
export default function ProductList() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(setProducts);
  }, []);
  // Do not do on the client work that can be done on the server
}
```

### Rendering rules table

| Rule | Description |
|---|---|
| Server Component by default | Add `'use client'` only when required |
| Fetch data on the server | `fetch` + `useEffect` in Client Components FORBIDDEN (pass props from server) |
| `loading.tsx` on every route | Create a loading state file for streaming |
| `error.tsx` on every route | Create an error boundary file |
| `not-found.tsx` | Create for 404 pages |
| Streaming | Split large page loads with `<Suspense>` |

---

## Routing rules

### App Router structure

```
app/
├── layout.tsx              # Root layout
├── page.tsx                # Home page (/)
├── loading.tsx             # Global loading
├── error.tsx               # Global error
├── not-found.tsx           # 404
├── (auth)/                 # Route group — shared layout
│   ├── layout.tsx
│   ├── login/page.tsx      # /login
│   └── register/page.tsx   # /register
├── (dashboard)/            # Route group
│   ├── layout.tsx
│   ├── page.tsx            # /
│   └── settings/page.tsx   # /settings
├── products/
│   ├── page.tsx            # /products
│   └── [id]/               # Dynamic route
│       ├── page.tsx        # /products/123
│       └── loading.tsx
├── blog/
│   └── [...slug]/          # Catch-all route
│       └── page.tsx        # /blog/2024/post-title
└── api/
    └── webhook/
        └── route.ts        # API Route Handler
```

### Routing best practices

| Rule | Description |
|---|---|
| Prefer App Router | `pages/` is legacy; new routes go under `app/` |
| Route groups | Share layouts with `(auth)`, `(dashboard)` |
| Dynamic route | Parameterized pages with `[id]` |
| Catch-all | Flexible URL structure with `[...slug]` |
| Parallel routes | Parallel content with `@modal`, `@sidebar` |
| Intercepting routes | Modal pattern with `(.)photo/[id]` |

---

## Data fetching rules

### Server Component data fetching

```typescript
// CORRECT — Direct async/await in Server Component
// app/users/page.tsx
async function getUsers() {
  const res = await fetch('https://api.example.com/users', {
    next: { revalidate: 3600 }, // 1 hour cache
  });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export default async function UsersPage() {
  const users = await getUsers();
  return <UserList users={users} />;
}
```

### Server Actions

```typescript
// CORRECT — Form mutation with Server Action
// app/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

export async function createUser(formData: FormData) {
  const validated = createUserSchema.parse({
    name: formData.get('name'),
    email: formData.get('email'),
  });

  await db.user.create({ data: validated });
  revalidatePath('/users');
}
```

### Cache control

| Method | Usage | Example |
|---|---|---|
| `revalidate` | Time-based cache | `fetch(url, { next: { revalidate: 60 } })` |
| `revalidatePath` | Path-based invalidation | `revalidatePath('/products')` |
| `revalidateTag` | Tag-based invalidation | `revalidateTag('products')` |
| `no-store` | No caching | `fetch(url, { cache: 'no-store' })` |
| `unstable_cache` | Function-based cache | Cache DB query results |

---

## Performance rules

### Image optimization

```typescript
import Image from 'next/image';

// CORRECT — Automatic optimization with next/image
<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority // For above-the-fold images
  placeholder="blur"
  blurDataURL="data:image/..."
/>

// CORRECT — Responsive image
<Image
  src="/product.jpg"
  alt="Product image"
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  style={{ objectFit: 'cover' }}
/>

// WRONG (FORBIDDEN) — Raw img tag
<img src="/hero.jpg" alt="Hero" />
```

### Font optimization

```typescript
// CORRECT — Self-hosted with next/font
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}

// WRONG (FORBIDDEN) — Loading fonts from CDN
// <link href="https://fonts.googleapis.com/..." rel="stylesheet" />
```

### Bundle optimization

```typescript
import dynamic from 'next/dynamic';

// CORRECT — Dynamic import for heavy components
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Client-only component
});

// CORRECT — SEO with Metadata
import { Metadata } from 'next';

export async function generateMetadata({ params }): Promise<Metadata> {
  const product = await getProduct(params.id);
  return {
    title: product.name,
    description: product.description,
    openGraph: { images: [product.image] },
  };
}
```

### Performance rules table

| Rule | Description |
|---|---|
| `next/image` REQUIRED | `<img>` tag FORBIDDEN — loses automatic optimization |
| `width` + `height` required | Prevent layout shift (CLS) |
| `priority` above-the-fold | Add to first-visible images to improve LCP |
| `next/font` REQUIRED | CDN font loading FORBIDDEN — prevents layout shift |
| `next/dynamic` for heavy components | Reduce bundle size with code splitting |
| `generateMetadata` | Dynamic metadata instead of hardcoded `<title>` |

---

## API route rules

### Route Handlers

```typescript
// CORRECT — app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = searchParams.get('page') ?? '1';

  const users = await getUsers(Number(page));
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // Input validation
  const validated = createUserSchema.parse(body);
  const user = await createUser(validated);
  return NextResponse.json(user, { status: 201 });
}
```

### Middleware

```typescript
// CORRECT — middleware.ts (project root)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Auth check
  const token = request.cookies.get('token');
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
```

### API rules table

| Rule | Description |
|---|---|
| Route Handlers | `route.ts` files under `app/api/` |
| Edge Runtime | `export const runtime = 'edge'` for lightweight work |
| Input validation | REQUIRED with Zod — do not use raw `body` |
| Error handling | Catch errors with try/catch, return meaningful HTTP status |
| Middleware | `middleware.ts` for auth, redirect, rewrite |
| Rate limiting | Rate limit on API routes REQUIRED |

---

## Security rules

### Server Actions security

```typescript
'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';

// CORRECT — Input validation + authorization check
export async function deleteUser(userId: string) {
  // 1. Authorization check
  const session = await getSession(cookies());
  if (!session?.isAdmin) {
    throw new Error('Unauthorized');
  }

  // 2. Input validation
  const id = z.string().uuid().parse(userId);

  // 3. Operation
  await db.user.delete({ where: { id } });
  revalidatePath('/users');
}
```

### Security rules table

| Rule | Description |
|---|---|
| Server Actions input validation | REQUIRED with Zod |
| CSRF protection | Server Actions provide it |
| Env variable security | Without `NEXT_PUBLIC_` prefix, values do not leak to the client |
| `headers()`, `cookies()` | Server-side only |
| Auth middleware | REQUIRED on protected routes |
| SQL injection | Use ORM or parameterized queries — string concat FORBIDDEN |

### Env variable rules

```typescript
// CORRECT — Server-only env variable
// .env
DATABASE_URL="postgresql://..." // Does NOT leak to the client

// CORRECT — Env used on the client
// .env
NEXT_PUBLIC_API_URL="https://api.example.com" // Accessible on the client

// WRONG (FORBIDDEN) — Hardcoded URL
const API_URL = 'https://api.example.com'; // Use env variable
```

## Forbidden practices

| # | Forbidden | Reason | Correct alternative |
|---|---|---|---|
| 1 | `getServerSideProps` / `getStaticProps` | Legacy Pages Router | Server Component + async/await |
| 2 | Client component `fetch` + `useEffect` | Redundant client-side data loading | Pass prop from server component |
| 3 | Interactive components without `'use client'` | onClick, useState fail | Add `'use client'` directive |
| 4 | `<img>` tag | Loses next/image optimization | Use `next/image` |
| 5 | CDN font loading | Layout shift, performance loss | Use `next/font` |
| 6 | Hardcoded env URLs | Breaks across environments | Use environment variable |
| 7 | Mixing `pages/` and `app/` | Routing validation issues | Choose a single router type |
| 8 | `useState`/`useEffect` in Server Component | Hooks fail on the server | Convert to client component or remove |
| 9 | Non-exported page/layout | Next.js will not recognize the file | Use default export (REQUIRED) |
| 10 | Ad-hoc hardcoded `revalidate` for `fetch` | Cache strategy inconsistency | Use centralized cache config |

---

<!-- GENERATE: PROJECT_CONVENTIONS
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.conventions, project.rules, project.folder_structure
Example output:
## Project conventions

### File naming
- Component: `kebab-case.tsx` (e.g. `product-card.tsx`)
- Page: `page.tsx` (App Router convention)
- Layout: `layout.tsx`
- API: `route.ts`

### Folder structure
```
src/
├── app/           # Next.js App Router pages
├── components/    # Shared components
│   ├── ui/        # Base UI components
│   └── features/  # Feature-specific components
├── lib/           # Utility functions
├── actions/       # Server Actions
├── types/         # TypeScript types
└── styles/        # Global styles
```
### Import order
1. React / Next.js
2. Third-party libraries
3. Project components (`@/components/`)
4. Utility / lib (`@/lib/`)
5. Types (`@/types/`)
6. Styles
-->

---

<!-- GENERATE: STYLING_APPROACH
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.styling, project.css_framework
Example output:
## Styling approach: Tailwind CSS

### Tailwind usage guidelines

| Rule | Description |
|---|---|
| Utility-first | Inline Tailwind classes preferred |
| `cn()` helper | Conditional class combining with `clsx` + `tailwind-merge` |
| Component abstraction | Repeated patterns abstracted into components |
| Strict `@apply` use | Only for very repeated patterns |
| Dark mode | Support via `dark:` prefix |
| Responsive | Mobile-first with `sm:`, `md:`, `lg:` |

```typescript
import { cn } from '@/lib/utils';

// CORRECT — Conditional classes with cn()
<button className={cn(
  'px-4 py-2 rounded-md font-medium',
  variant === 'primary' && 'bg-blue-600 text-white',
  variant === 'secondary' && 'bg-gray-200 text-gray-800',
  disabled && 'opacity-50 cursor-not-allowed',
)}>

// WRONG (FORBIDDEN) — Inline style
<button style={{ padding: '8px 16px', backgroundColor: 'blue' }}>
```
-->

---

## Mandatory rules

1. **Server Component by default** — Add `'use client'` only when interactivity is required.
2. **Fetch data on the server** — Client-side data fetching FORBIDDEN; pass data from the server via props.
3. **`next/image` REQUIRED** — `<img>` tags FORBIDDEN; specify `width` and `height`.
4. **`next/font` REQUIRED** — Loading fonts from CDN FORBIDDEN.
5. **`loading.tsx` + `error.tsx`** — Create these files for every route segment.
6. **Validation in Server Actions** — Always validate input with Zod.
7. **Env variable** — Never hardcode URLs; use `process.env`.
8. **Metadata** — Generate SEO dynamically with `generateMetadata`; never hardcode `<title>`.
9. **`next/dynamic`** — Use dynamic imports for heavy components.
10. **Default export** — Always required for page, layout, error, and loading files.

## Invariant rules

- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
- Do not write config into Codebase
- Codebase is readable; config is not written there

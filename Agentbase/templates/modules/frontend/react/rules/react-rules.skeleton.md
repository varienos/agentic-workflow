# React SPA rules

> These rules apply to standalone React SPA projects (Vite, CRA, custom bundler).
> For Next.js projects, use the `frontend/nextjs/` module.
> All developers and agents MUST follow these rules.

---

<!-- GENERATE: CODEBASE_CONTEXT
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.name, project.description, project.structure
Example output:
## Project context

- **Project:** MyApp — Admin panel SPA
- **Structure:** Monorepo (React project under `apps/web/`)
- **Bundler:** Vite
- **TypeScript:** Enabled
- **State:** Zustand
- **Router:** React Router v6
- **Styling:** Tailwind CSS
- **Test:** Vitest + React Testing Library
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## Component structure

### Functional component

```typescript
// CORRECT — Functional component + interface props
interface ProductCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <article className="product-card">
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <button onClick={() => onAddToCart(product.id)}>
        Add to cart
      </button>
    </article>
  );
}

// WRONG (FORBIDDEN) — Class component
class ProductCard extends React.Component<ProductCardProps> {
  render() {
    // Do not use class components — prefer functional components
  }
}

// WRONG (FORBIDDEN) — Use interface instead of type
type ProductCardProps = { // not extendable — use interface
  product: Product;
};
```

### File structure

```
src/
├── components/
│   ├── ProductCard/
│   │   ├── ProductCard.tsx           # Component
│   │   ├── ProductCard.test.tsx      # Test
│   │   ├── ProductCard.module.css    # Styles (optional)
│   │   └── index.ts                 # Re-export
│   └── ui/                          # Base UI components
│       ├── Button/
│       ├── Input/
│       └── Modal/
├── features/                        # Feature-based organization
│   ├── auth/
│   ├── products/
│   └── cart/
├── hooks/                           # Custom hooks
├── services/                        # API services
├── stores/                          # State management
├── types/                           # TypeScript types
├── utils/                           # Helper functions
├── App.tsx
└── main.tsx
```

### Component rules table

| Rule | Description |
|---|---|
| Functional component | Class components FORBIDDEN (except legacy) |
| `interface` for props | Use `interface`, not `type` — extendability |
| Single export | Exactly ONE default-exported component per file |
| File structure | `Component.tsx` + `Component.test.tsx` + style file |
| Helper components separate | Defining a second component in the same file is FORBIDDEN |

---

## Hook rules

### Hook usage rules

```typescript
// CORRECT — Hooks at the top of the component, outside conditional blocks
function UserProfile({ userId }: { userId: string }) {
  // Hooks at the top
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      setIsLoading(true);
      const data = await userService.getUser(userId);
      if (!cancelled) {
        setUser(data);
        setIsLoading(false);
      }
    };

    fetchUser();

    // REQUIRED — Cleanup function
    return () => {
      cancelled = true;
    };
  }, [userId]); // Dependency array must be complete

  if (isLoading) return <Spinner />;
  if (!user) return <NotFound />;

  return <div>{user.name}</div>;
}

// WRONG (FORBIDDEN) — Conditional hook
function UserProfile({ userId }: { userId: string }) {
  if (!userId) return null; // return BEFORE hooks — FORBIDDEN

  const [user, setUser] = useState(null); // Hook order breaks
}
```

### Custom hook

```typescript
// CORRECT — Custom hook with `use` prefix, in hooks/ directory
// hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer); // Cleanup REQUIRED
  }, [value, delay]);

  return debouncedValue;
}

// WRONG (FORBIDDEN) — Custom hook without use prefix
export function debounceValue<T>(value: T, delay: number): T {
  // Missing `use` prefix — violates React hook rules
}
```

### Hook rules table

| Rule | Description |
|---|---|
| Top-level, unconditional | Hooks at the top of the component, outside conditionals |
| `use` prefix | Custom hooks start with `use`, live in `hooks/` |
| Complete dependency array | ESLint `exhaustive-deps` must be enabled |
| Cleanup REQUIRED | Cleanup for subscriptions, timers, event listeners |
| Measured `useCallback`/`useMemo` | No premature optimization — use when there is a real problem |

---

<!-- GENERATE: STATE_MANAGEMENT
Explanation: This section is detected automatically by Bootstrap.
Required manifest fields: project.dependencies, project.state_management
Example output:
## State management: Zustand

- **Detection:** `zustand` dependency present in `package.json`
- **Store files:** under `src/stores/`
- **Pattern:** Modular store with slice pattern
- **DevTools:** Enabled via `zustand/middleware`
-->

---

## State management rules

### State layers

```typescript
// LOCAL STATE — Simple component state
const [isOpen, setIsOpen] = useState(false);

// LOCAL STATE — Complex component state
const [formState, dispatch] = useReducer(formReducer, initialState);

// GLOBAL STATE — App-wide (Zustand example)
const useAuthStore = create<AuthState>((set) => ({
  user: null,
  login: async (credentials) => {
    const user = await authService.login(credentials);
    set({ user });
  },
  logout: () => set({ user: null }),
}));

// SERVER STATE — API data (TanStack Query example)
const { data: products, isLoading } = useQuery({
  queryKey: ['products', filters],
  queryFn: () => productService.getAll(filters),
});
```

### State rules table

| Layer | Tool | Usage |
|---|---|---|
| Local state (simple) | `useState` | Toggle, form input, UI state |
| Local state (complex) | `useReducer` | Multiple fields, complex transitions |
| Global state | Zustand / Jotai / Redux | Auth, theme, user preferences |
| Server state | TanStack Query / SWR | API data, cache, refetch |
| Form state | React Hook Form / Formik | Form validation, submission |
| URL state | `useSearchParams` | Filters, pagination, sorting |

| Rule | Description |
|---|---|
| Keep it as low as possible | Put state in the nearest component that needs it |
| Lifting state up | If shared, move to common parent and pass via props |
| Prop drilling limit | 3+ levels of props → Context or global state |
| Separate server state | Use TanStack Query or SWR for API data |

---

## Rendering rules

### List rendering

```typescript
// CORRECT — Unique and stable key
{products.map((product) => (
  <ProductCard key={product.id} product={product} />
))}

// WRONG (FORBIDDEN) — Index key (when sorting/filtering)
{products.map((product, index) => (
  <ProductCard key={index} product={product} /> // Breaks when order changes
))}
```

### Conditional rendering

```typescript
// CORRECT — Early return
if (!user) return <LoginPrompt />;
if (isLoading) return <Spinner />;
return <Dashboard user={user} />;

// CORRECT — Ternary (short conditions)
{isLoggedIn ? <UserMenu /> : <LoginButton />}

// CAUTION — && operator (falsy value trap)
{items.length > 0 && <ItemList items={items} />} // CORRECT — boolean result
{items.length && <ItemList items={items} />}      // WRONG — renders 0

// CORRECT — Fragment (instead of unnecessary div wrapper)
<>
  <Header />
  <Main />
  <Footer />
</>
```

### Portal

```typescript
// CORRECT — Portal for modal, tooltip
import { createPortal } from 'react-dom';

function Modal({ children, isOpen }: ModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content">{children}</div>
    </div>,
    document.getElementById('modal-root')!
  );
}
```

---

<!-- GENERATE: ROUTER
Explanation: This section is detected automatically by Bootstrap.
Required manifest fields: project.dependencies, project.router_config
Example output:
## Router: React Router v6

- **Detection:** `react-router-dom` v6 dependency in `package.json`
- **Structure:** Route definitions with `createBrowserRouter`
- **Lazy loading:** Route-based code splitting with `React.lazy()`
- **Auth:** Protected routes via `ProtectedRoute` component
-->

---

## Routing rules

### Route definitions and lazy loading

```typescript
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// CORRECT — Route-based code splitting with lazy loading
const Dashboard = lazy(() => import('./features/dashboard/DashboardPage'));
const Products = lazy(() => import('./features/products/ProductsPage'));
const Settings = lazy(() => import('./features/settings/SettingsPage'));

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: 'products',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <Products />
          </Suspense>
        ),
      },
      {
        path: 'products/:id',
        element: (
          <Suspense fallback={<PageSkeleton />}>
            <ProductDetail />
          </Suspense>
        ),
      },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
```

### Protected route

```typescript
// CORRECT — Auth check at route level
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) return <Spinner />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Usage
{
  path: 'dashboard',
  element: (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  ),
}
```

### Routing rules table

| Rule | Description |
|---|---|
| `React.lazy()` + `Suspense` | Route-based code splitting REQUIRED |
| Protected route pattern | Auth check at route level |
| `useParams` / `useSearchParams` | Use hooks for URL parameters |
| Error boundary | `errorElement` on each route segment |
| `Navigate` component | For programmatic redirects |

---

<!-- GENERATE: STYLING_APPROACH
Explanation: This section is detected automatically by Bootstrap.
Required manifest fields: project.styling, project.css_framework
Example output:
## Styling approach: Tailwind CSS

- **Detection:** `tailwind.config.js` present, `tailwindcss` in `package.json`
- **Utility-first:** Inline classes preferred
- **cn() helper:** Conditional classes with `clsx` + `tailwind-merge`
- **Theme:** Custom theme definitions in `tailwind.config.js`
-->

---

## Styling rules

### General principles

```typescript
// CORRECT — ONE styling approach across the project
// CSS Modules, Tailwind, or styled-components — DO NOT MIX

// CORRECT — Use design token / theme variable
<button className={styles.primaryButton}>Save</button>

// WRONG (FORBIDDEN) — Hardcoded color/size
<button style={{ backgroundColor: '#1e88e5', padding: '8px 16px' }}>
  Save
</button>
```

| Rule | Description |
|---|---|
| ONE approach | CSS Modules / Tailwind / styled-components — do not mix |
| Design token | Hardcoded color/size FORBIDDEN — use theme variables |
| Responsive | Mobile-first media queries |
| Inline style limited | Only for dynamic values (JS computation results) |

---

## Test rules

### React Testing Library

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// CORRECT — Behavior-based test
describe('LoginForm', () => {
  it('should show error for invalid email', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    expect(screen.getByText(/enter a valid email/i)).toBeInTheDocument();
  });

  it('should call onSubmit with valid data', async () => {
    const handleSubmit = vi.fn();
    const user = userEvent.setup();
    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByRole('textbox', { name: /email/i }), 'ali@test.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'ali@test.com',
      password: 'password123',
    });
  });
});

// WRONG (FORBIDDEN) — Implementation detail test
it('should set state', () => {
  const { result } = renderHook(() => useState(false));
  // Direct state access FORBIDDEN — test behavior
});
```

### Test rules table

| Rule | Description |
|---|---|
| RTL (React Testing Library) | Test behavior, not implementation |
| `screen.getByRole`, `getByText` | Prefer accessibility queries |
| `getByTestId` last resort | Only when other queries fail |
| `userEvent` | Prefer `@testing-library/user-event` over `fireEvent` |
| API mock | Prefer MSW; mocking components is FORBIDDEN |
| Snapshot tests limited | Use sparingly where meaningful |

---

## Performance rules

### Memo and optimization

```typescript
// CORRECT — React.memo only when there is a real performance problem
const ExpensiveList = React.memo(function ExpensiveList({ items }: Props) {
  return (
    <ul>
      {items.map((item) => (
        <ListItem key={item.id} item={item} />
      ))}
    </ul>
  );
});

// CORRECT — Virtualization for large lists
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
  });

  return (
    <div ref={parentRef} style={{ overflow: 'auto', height: '400px' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              transform: `translateY(${virtualItem.start}px)`,
              height: `${virtualItem.size}px`,
              width: '100%',
            }}
          >
            <ItemRow item={items[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}

// CORRECT — Dynamic import for heavy libraries
const HeavyEditor = lazy(() => import('./HeavyEditor'));
```

### Performance rules table

| Rule | Description |
|---|---|
| Measured `React.memo()` | Only for frequently re-rendered expensive components |
| Measured `useMemo`/`useCallback` | Premature optimization FORBIDDEN — use for measured issues |
| Virtualization | `react-window` or `react-virtuoso` for large lists |
| Bundle analysis | `source-map-explorer` or `rollup-plugin-visualizer` |
| Lazy import | Load heavy libraries with `React.lazy()` |
| Code splitting | Route-based splitting REQUIRED |

---

<!-- GENERATE: PROJECT_CONVENTIONS
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.conventions, project.rules, project.folder_structure
Example output:
## Project conventions

### File naming
- Component: PascalCase (`ProductCard.tsx`)
- Hook: camelCase + use prefix (`useAuth.ts`)
- Util: camelCase (`formatDate.ts`)
- Test: `*.test.tsx` or `*.spec.tsx`
- Style: `*.module.css` or named after the component

### Import order
1. React
2. Third-party libraries
3. Project components (`@/components/`)
4. Hooks (`@/hooks/`)
5. Services (`@/services/`)
6. Types (`@/types/`)
7. Styles
-->

---

## Forbidden practices

| # | Forbidden | Reason | Correct alternative |
|---|---|---|---|
| 1 | `dangerouslySetInnerHTML` | XSS risk | Only with sanitized content, otherwise do not use |
| 2 | `findDOMNode` | Deprecated | Use `useRef` |
| 3 | String ref (`ref="myRef"`) | Legacy API | Use `useRef` hook |
| 4 | Component inside component | Recreated on every render | Define in a separate file |
| 5 | `any` type | Breaks TypeScript safety | Use a real type |
| 6 | Index key (dynamic list) | Breaks when sort/filter changes | Use unique `id` |
| 7 | Class component | Legacy, hooks unavailable | Functional component |
| 8 | Direct async inside `useEffect` | Race condition | Cleanup + cancelled flag |
| 9 | Unnecessary `// eslint-disable` | Disables lint rules | Fix the problem |
| 10 | Barrel export (large projects) | Breaks tree-shaking | Direct import |

---

## Mandatory rules

1. **Functional component** — Class components FORBIDDEN (except legacy).
2. **`interface` for props** — Use `interface`, not `type`, for extendability.
3. **Hook rules** — Top-level, unconditional. Complete dependency array. Cleanup REQUIRED.
4. **State at the lowest level** — Keep it in the nearest possible component.
5. **Unique key** — Stable, unique key in list rendering. Index key FORBIDDEN.
6. **Lazy loading** — Route-based code splitting with `React.lazy()` + `Suspense`.
7. **Protected route** — Auth check at route level.
8. **Test** — Test behavior with RTL, use `userEvent`, implementation details FORBIDDEN.
9. **One styling approach** — CSS Modules / Tailwind / styled-components — ONE across the project.
10. **`any` FORBIDDEN** — Keep TypeScript type safety; define a proper type instead of `any`.

## Invariant rules

- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
- Do not write config into Codebase
- Codebase is readable; config is not written there

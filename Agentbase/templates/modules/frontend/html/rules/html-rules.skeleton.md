# HTML/CSS/JS (vanilla web) rules

> These rules apply to vanilla web projects that do not use a framework.
> All plugins and agents MUST comply with these rules.

---

<!-- GENERATE: CODEBASE_CONTEXT
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.name, project.description, project.structure
Example output:
## Project structure

- **Project:** MyWebsite — Corporate website
- **Build type:** Static site, organized under `src/`
- **Build tool:** Vite (or other)
- **CSS approach:** BEM + CSS custom properties
- **JS:** ES6+ modules
- **Deployment:** Netlify / GitHub Pages
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## HTML rules

### Semantic structure

```html
<!-- CORRECT — Use semantic tags -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Page description">
  <title>Page title</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <header>
    <nav>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/about">About</a></li>
      </ul>
    </nav>
  </header>

  <main>
    <article>
      <h1>Title</h1>
      <section>
        <h2>Subtitle</h2>
        <p>Content text...</p>
      </section>
    </article>
  </main>

  <footer>
    <p>&copy; 2024 Company Name</p>
  </footer>

  <script src="js/app.js" defer></script>
</body>
</html>

<!-- WRONG (FORBIDDEN) — Div soup -->
<div class="header">
  <div class="nav">
    <div class="nav-item"><a href="/">Home</a></div>
  </div>
</div>
<div class="main">
  <div class="content">
    <div class="title">Title</div>
  </div>
</div>
```

### HTML rules table

| Rule | Description |
| --- | --- |
| Semantic tags | `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>` |
| Prefer semantic over style-only `div` | Choose a semantic tag for content instead of a style-only `div` |
| Required `alt` on `img` | All images must have an `alt` attribute (accessibility) |
| Form attributes | `action` and `method` must be specified |
| Meta tags required | `charset`, `viewport`, `description` |
| Language setting | `<html lang="en">` (or appropriate language code) |
| Heading hierarchy | `h1` → `h2` → `h3` in order, no skipping |

---

<!-- GENERATE: CSS_METHODOLOGY
Explanation: This section is detected automatically by Bootstrap.
Required manifest fields: project.css_files, project.css_methodology
Example output:
## CSS methodology: BEM

- **Detection:** Class names follow `block__element--modifier`
- **Example:** `.card__title--highlighted`
- **Directory structure:** Component-based CSS files
-->

---

## CSS rules

### CSS custom properties and organization

```css
/* CORRECT — CSS custom properties (variables) */
:root {
  /* Colors */
  --color-primary: #1e88e5;
  --color-secondary: #43a047;
  --color-text: #212121;
  --color-text-light: #757575;
  --color-background: #ffffff;
  --color-surface: #f5f5f5;
  --color-error: #d32f2f;

  /* Typography */
  --font-family-base: 'Inter', system-ui, sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Border */
  --border-radius: 0.5rem;
  --border-color: #e0e0e0;
}

/* CORRECT — Variable usage */
.card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  padding: var(--spacing-md);
}

/* WRONG (FORBIDDEN) — Hardcoded values */
.card {
  background-color: #f5f5f5;  /* Use variable */
  border: 1px solid #e0e0e0;  /* Use variable */
  padding: 16px;               /* Use variable */
}
```

### BEM naming

```css
/* CORRECT — BEM convention */
.card { }                      /* Block */
.card__title { }               /* Element */
.card__title--highlighted { }  /* Modifier */
.card__image { }
.card__body { }
.card__footer { }
.card--featured { }            /* Block modifier */

/* WRONG (FORBIDDEN) — Inconsistent naming */
.cardTitle { }           /* camelCase — do not use in CSS */
.card-title-big { }      /* Ambiguous convention */
.card .title { }         /* Descendant selector — specificity problem */
```

### Layout

```css
/* CORRECT — Layout with Flexbox */
.nav-list {
  display: flex;
  gap: var(--spacing-md);
  align-items: center;
}

/* CORRECT — Layout with Grid */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-lg);
}

/* CORRECT — Mobile-first responsive */
.container {
  padding: var(--spacing-sm);
}

@media (min-width: 768px) {
  .container {
    padding: var(--spacing-md);
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-lg);
  }
}

/* WRONG (FORBIDDEN) — Float layout */
.col-left {
  float: left;
  width: 50%;
}
```

### CSS rules table

| Rule | Description |
|---|---|
| CSS custom properties | Hardcoded color/size FORBIDDEN — use variables |
| BEM or consistent convention | Name in `block__element--modifier` format |
| Mobile-first | Prefer `min-width` media queries |
| `!important` FORBIDDEN | Fix specificity problems at the source |
| Flexbox / Grid | REQUIRED for layout — float layout FORBIDDEN |
| File organization | reset, variables, base, components, utilities |

---

## JavaScript rules

### Modern ES6+ syntax

```javascript
// CORRECT — const/let, arrow functions, template literals
const API_URL = 'https://api.example.com';

const fetchUsers = async () => {
  const response = await fetch(`${API_URL}/users`);
  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }
  return response.json();
};

// CORRECT — Destructuring
const { name, email, role } = user;
const [first, ...rest] = items;

// CORRECT — ES Modules
// utils.js
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US').format(date);
};

// app.js
import { formatDate } from './utils.js';

// WRONG (FORBIDDEN) — Do not use var
var userName = 'Ali';  // Use const or let

// WRONG (FORBIDDEN) — String concatenation
const greeting = 'Hello ' + userName + '!';  // Use template literal
```

### DOM manipulation

```javascript
// CORRECT — Use querySelector
const button = document.querySelector('.submit-btn');
const items = document.querySelectorAll('.list-item');

// CORRECT — Event delegation
document.querySelector('.todo-list').addEventListener('click', (e) => {
  const item = e.target.closest('.todo-item');
  if (!item) return;

  if (e.target.matches('.delete-btn')) {
    item.remove();
  } else if (e.target.matches('.toggle-btn')) {
    item.classList.toggle('completed');
  }
});

// WRONG (FORBIDDEN) — Separate listener on every element
items.forEach((item) => {
  item.querySelector('.delete-btn').addEventListener('click', () => {
    item.remove();
  });
  item.querySelector('.toggle-btn').addEventListener('click', () => {
    item.classList.toggle('completed');
  });
});
```

### Async operations

```javascript
// CORRECT — async/await
const loadData = async () => {
  try {
    const [users, products] = await Promise.all([
      fetchUsers(),
      fetchProducts(),
    ]);
    renderUsers(users);
    renderProducts(products);
  } catch (error) {
    showError(error.message);
  }
};

// WRONG (FORBIDDEN) — Callback hell
fetchUsers((users) => {
  fetchProducts((products) => {
    fetchOrders((orders) => {
      // Callback hell — use async/await
    });
  });
});
```

### JavaScript rules table

| Rule | Description |
|---|---|
| Prefer `const` | Use `let` when reassignment is needed; `var` FORBIDDEN |
| Arrow functions | For short functions, unless `this` binding is required |
| Template literals | Use backticks instead of string concatenation |
| Destructuring | Prefer for object and array access |
| ES Modules | Use `import`/`export`; avoid global variables |
| `querySelector` | Prefer over `getElementById` for DOM access |
| Event delegation | Single listener on common parent — per-element listeners FORBIDDEN |
| `async/await` | Prefer over callbacks and `.then()` chains |

---

## Accessibility (a11y) rules

```html
<!-- CORRECT — ARIA and accessibility -->
<button aria-label="Open menu" aria-expanded="false">
  <svg><!-- hamburger icon --></svg>
</button>

<nav aria-label="Main navigation">
  <ul role="menubar">
    <li role="none"><a role="menuitem" href="/">Home</a></li>
  </ul>
</nav>

<!-- CORRECT — Form labels -->
<label for="email">Email</label>
<input type="email" id="email" name="email" required
       aria-describedby="email-help">
<span id="email-help">Enter your work email address</span>

<!-- CORRECT — Skip navigation -->
<a href="#main-content" class="skip-link">Skip to content</a>

<!-- WRONG (FORBIDDEN) — Form without label -->
<input type="email" placeholder="Email"> <!-- label MISSING -->
```

### Accessibility rules table

| Rule | Description |
| --- | --- |
| ARIA attributes | Use `role`, `aria-label`, and `aria-expanded` where appropriate |
| Keyboard navigation | Tab order, focus management, and `tabindex` |
| Color contrast | At least 4.5:1 ratio (WCAG AA) |
| Form labels | Must be connected with `<label for="...">` |
| Skip link | "Skip to content" link for long navigation |
| `alt` attribute | Mandatory on all `<img>` tags |

---

<!-- GENERATE: BUILD_TOOL
Explanation: This section is automatically detected by Bootstrap.
Required manifest fields: project.build_tool, project.scripts
Example output:
## Build tool: Vite

- **Detection:** `vite.config.js` exists
- **Development server:** `npm run dev` → `vite`
- **Build:** `npm run build` → `vite build`
- **Output:** `dist/` directory
- **Plugins:** `vite-plugin-html`
-->

---

## Performance rules

### Resource loading order

```html
<!-- CORRECT — CSS in head, JS with defer -->
<head>
  <!-- Critical CSS inline -->
  <style>
    /* Above-the-fold styles */
    body { margin: 0; font-family: var(--font-family-base); }
  </style>

  <!-- Main CSS file -->
  <link rel="stylesheet" href="css/styles.css">

  <!-- Preconnect — for third-party resources -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
</head>
<body>
  <!-- Content -->

  <!-- JS — at end of body or with defer -->
  <script src="js/app.js" defer></script>
</body>

<!-- WRONG (FORBIDDEN) — Blocking JS in head -->
<head>
  <script src="js/heavy-lib.js"></script> <!-- Blocks rendering -->
</head>
```

### Image optimization

```html
<!-- CORRECT — Lazy loading and modern format -->
<img
  src="images/hero.webp"
  alt="Hero image"
  width="1200"
  height="600"
  loading="lazy"
  decoding="async"
>

<!-- CORRECT — Responsive image -->
<picture>
  <source media="(min-width: 1024px)" srcset="images/hero-lg.webp" type="image/webp">
  <source media="(min-width: 768px)" srcset="images/hero-md.webp" type="image/webp">
  <img src="images/hero-sm.jpg" alt="Hero image" width="400" height="200" loading="lazy">
</picture>
```

### Performance rules table

| Rule | Description |
|---|---|
| CSS in `<head>` | Minimize render-blocking CSS |
| JS with `defer` or at end of body | Prevent render blocking |
| Lazy loading | Use `loading="lazy"` for off-screen images |
| WebP format | Prefer modern image formats |
| `width` + `height` | Mitigate layout shift (CLS) |
| Critical CSS inline | Inline styles for above-the-fold content |
| Preconnect | `<link rel="preconnect">` for third-party domains |

---

<!-- GENERATE: PROJECT_CONVENTIONS
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.conventions, project.rules, project.folder_structure
Example output:
## Project conventions

### File structure
```
src/
├── index.html          # Home page
├── pages/              # Other pages
│   ├── about.html
│   └── contact.html
├── css/
│   ├── reset.css       # CSS reset/normalize
│   ├── variables.css   # CSS custom properties
│   ├── base.css        # Base styles
│   ├── components/     # Component styles
│   │   ├── card.css
│   │   └── button.css
│   └── utilities.css   # Utility classes
├── js/
│   ├── app.js          # Main entry point
│   ├── modules/        # JS modules
│   │   ├── nav.js
│   │   └── form.js
│   └── utils/          # Helper functions
├── images/             # Images
└── fonts/              # Fonts
```

### Naming conventions

- HTML files: `kebab-case.html`
- CSS files: `kebab-case.css`
- JavaScript files: `camelCase.js` or `kebab-case.js`
- CSS classes: BEM (`block__element--modifier`)
- JavaScript variables: camelCase
- JavaScript constants: UPPER_SNAKE_CASE
-->

---

## Forbidden practices

| # | Forbidden | Reason | Alternative |
|---|---|---|---|
| 1 | Inline `style=""` attribute | Belongs in CSS file | Use a CSS class |
| 2 | Inline `onclick=""` handler | Belongs in JavaScript file | Use `addEventListener` |
| 3 | `document.write()` | Blocks rendering, security risk | Use DOM API |
| 4 | jQuery | Modern vanilla JS is enough | Native DOM API, fetch, ES6+ |
| 5 | Table-based layout | Not semantic, not responsive | Use Flexbox or Grid |
| 6 | Using `var` | Scope issues, hoisting | Use `const` or `let` |
| 7 | Hardcoded color/size | Hard to maintain, inconsistent | Use CSS custom properties |
| 8 | Using `!important` | Hides specificity issues | Fix specificity at the source |
| 9 | Float layout | Unpredictable, bug-prone | Use Flexbox or Grid |
| 10 | Global JavaScript variables | Namespace pollution, collisions | Use ES Modules or IIFE |

---

## Mandatory rules

1. **Semantic HTML** — Use `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`; div soup FORBIDDEN.
2. **CSS custom properties** — Hardcoded color/size FORBIDDEN; define and use variables.
3. **BEM or consistent convention** — CSS class naming must be consistent across the project.
4. **Mobile-first** — Implement responsive design with `min-width` media queries.
5. **ES6+ syntax** — `const`/`let` instead of `var`, arrow functions, template literals, destructuring.
6. **Event delegation** — Single listener on the common parent; separate listeners per element FORBIDDEN.
7. **Accessibility** — `alt` attributes, labels, ARIA roles, keyboard navigation.
8. **Performance** — CSS in head, JS with defer, lazy loading, and WebP format.
9. **Inline styles/handlers FORBIDDEN** — Styles in CSS files; event handlers via `addEventListener`.
10. **Global variables FORBIDDEN** — Use ES Modules or the module pattern.

## Invariant rules

- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
- Do not write config into Codebase
- Codebase is readable; config is not written there

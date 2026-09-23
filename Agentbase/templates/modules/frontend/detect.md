# Frontend Category Detection

This category provides build, routing, and rendering rules for frontend meta-frameworks.

## Variants

| Variant | Detection File | Priority | Note |
|---------|---------------|---------|-----|
| Next.js | `frontend/nextjs/detect.md` | 1 | If Next.js is detected, React SPA is not activated |
| React SPA | `frontend/react/detect.md` | 2 | Standalone React SPAs (Vite, CRA, custom bundler) |
| HTML/CSS/JS | `frontend/html/detect.md` | 3-fallback | Activates when no framework is detected |

## Provides

- Framework-specific rendering and routing rules
- Build optimization checks
- Framework patterns added to the code review agent
- Semantic HTML and accessibility rules for vanilla web projects

## Affects Core

- code-review: framework-specific anti-pattern check
- task-hunter: Framework rules added to IMPLEMENTATION_RULES

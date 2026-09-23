# HTML/CSS/JS (Vanilla Web) Module Detection

## Checks

- file_pattern: *.html | src/**/*.html
- file_pattern: *.css | *.scss | *.sass | *.less
- not_dependency: react, vue, svelte, angular, next

## Minimum Match

2/3

## Activates

- rules/html-rules.skeleton.md

## Affects Core

- code-review: Semantic HTML, accessibility, and performance checks are added
- task-hunter: Vanilla web best practice rules are added to IMPLEMENTATION_RULES
- settings.json: HTML/CSS/JS linter configuration is added

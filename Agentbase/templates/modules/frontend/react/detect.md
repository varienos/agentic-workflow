# React SPA Module Detection

## Checks

- dependency: react, react-dom
- not_dependency: next
- file_pattern: src/**/*.tsx | src/**/*.jsx

## Minimum Match

2/3

## Activates

- rules/react-rules.skeleton.md

## Affects Core

- code-review: React hook rules, component pattern, and anti-pattern checks are added
- task-hunter: React SPA rendering and state management rules are added to IMPLEMENTATION_RULES
- settings.json: React/TypeScript plugin configuration is added

# React Native (Plain) Module Detection

## Checks

- dependency: react-native
- file_exists: android/ | ios/
- not_dependency: expo

## Minimum Match

2/3

## Activates

- rules/react-native-rules.skeleton.md

## Affects Core

- code-review: RN pattern and anti-pattern check is added
- task-hunter: React Native rules are added to IMPLEMENTATION_RULES
- settings.json: React Native plugin configuration is added

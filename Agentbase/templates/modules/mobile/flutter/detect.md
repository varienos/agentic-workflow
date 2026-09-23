# Flutter Module Detection

## Checks

- file_exists: pubspec.yaml
- dependency: flutter
- file_pattern: lib/**/*.dart

## Minimum Match

2/3

## Activates

- rules/flutter-rules.skeleton.md

## Affects Core

- code-review: Flutter/Dart anti-pattern check is added (unnecessary rebuild, dynamic type, print usage, etc.)
- task-hunter: Flutter widget and state management rules are added to IMPLEMENTATION_RULES
- settings.json: Flutter/Dart plugin configuration is added

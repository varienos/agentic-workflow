# Mobile Category Detection

This category provides design system rules and platform-specific checks for mobile app development.

## Variants

| Variant | Detection File | Priority | Note |
|---------|---------------|---------|-----|
| Expo | `mobile/expo/detect.md` | 1 | If Expo is detected, plain RN is not activated |
| React Native (plain) | `mobile/react-native/detect.md` | 2 | RN projects that do not use Expo |
| Flutter | `mobile/flutter/detect.md` | 3 | Different technology stack; does not conflict with other modules |

## Provides

- Design system rule file (colors, typography, components)
- Theme/style check added to the code review agent
- Platform-specific rules (iOS/Android differences)

## Affects Core

- code-review: theme/color usage check
- task-hunter: RN patterns added to IMPLEMENTATION_RULES
- settings.json: related plugins are activated

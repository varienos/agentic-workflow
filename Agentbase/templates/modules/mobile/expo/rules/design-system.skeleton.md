# Design system rules

> These rules ensure consistency and design-system alignment in UI development.
> All developers and agents MUST follow these rules.

---

<!-- GENERATE: DESIGN_SYSTEM_NAME
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.design_system, project.theme_config
Example output:
## Design system: AppTheme

- **Theme file:** `apps/mobile/src/theme/index.ts`
- **Hook:** `useTheme()` — access to all color, spacing, typography values
- **Provider:** `<ThemeProvider>` — wrapper inside `App.tsx`
- **Dark mode:** Supported (via `useColorScheme()`)
-->

---

## Color tokens

<!-- GENERATE: COLOR_TOKENS
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.theme_config, project.color_tokens
Example output:
### Color usage table

| Token | Light | Dark | Usage |
|---|---|---|---|
| `colors.primary` | `#007AFF` | `#0A84FF` | Primary actions, buttons, links |
| `colors.secondary` | `#5856D6` | `#5E5CE6` | Secondary actions |
| `colors.background` | `#FFFFFF` | `#000000` | Page background |
| `colors.surface` | `#F2F2F7` | `#1C1C1E` | Card and area background |
| `colors.text` | `#000000` | `#FFFFFF` | Main text |
| `colors.textSecondary` | `#8E8E93` | `#8E8E93` | Secondary text |
| `colors.border` | `#C6C6C8` | `#38383A` | Lines and borders |
| `colors.error` | `#FF3B30` | `#FF453A` | Error messages |
| `colors.success` | `#34C759` | `#30D158` | Success messages |
| `colors.warning` | `#FF9500` | `#FF9F0A` | Warning messages |

### Color access
```typescript
const { colors } = useTheme();

// CORRECT:
<View style={{ backgroundColor: colors.background }}>
<Text style={{ color: colors.text }}>Hello</Text>

// WRONG (FORBIDDEN):
<View style={{ backgroundColor: '#FFFFFF' }}>
<Text style={{ color: 'black' }}>Hello</Text>
```
-->

---

## Component patterns

<!-- GENERATE: COMPONENT_PATTERNS
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.component_library, project.ui_patterns
Example output:
### UI component usage rules

| Need | Correct component | Wrong (FORBIDDEN) | Notes |
|---|---|---|---|
| Button | `<Button>` | `<TouchableOpacity><Text>` | All buttons use the Button component |
| Text | `<Typography>` | `<Text>` | Raw Text FORBIDDEN |
| Input | `<TextInput>` (themed) | RN `<TextInput>` | Use the theme-aware version |
| Card | `<Card>` | `<View style={...}>` | Includes shadow, border, padding |
| List | `<FlashList>` | `<FlatList>` | FlashList for performance |
| Icon | `<Icon name="..." />` | Inline SVG | Through the icon library |
| Modal | `<BottomSheet>` | RN `<Modal>` | For platform consistency |
| Loading | `<Skeleton>` | `<ActivityIndicator>` | Skeleton loading for UX |

### Component examples

```typescript
// CORRECT — Use the Button component
<Button
  variant="primary"
  size="md"
  onPress={handleSubmit}
  loading={isLoading}
>
  Save
</Button>

// WRONG — Do not build your own button
<TouchableOpacity
  style={{ backgroundColor: '#007AFF', padding: 12 }}
  onPress={handleSubmit}
>
  <Text style={{ color: 'white' }}>Save</Text>
</TouchableOpacity>
```
-->

---

## Typography

<!-- GENERATE: TYPOGRAPHY
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.theme_config, project.typography
Example output:
### Font family

| Token | Font | Weight | Usage |
|---|---|---|---|
| `fonts.regular` | Inter-Regular | 400 | Normal text |
| `fonts.medium` | Inter-Medium | 500 | Emphasized text |
| `fonts.semibold` | Inter-SemiBold | 600 | Headings |
| `fonts.bold` | Inter-Bold | 700 | Main headings |

### Font sizes

| Token | Size | Line height | Usage |
|---|---|---|---|
| `fontSize.xs` | 10 | 14 | Label, badge |
| `fontSize.sm` | 12 | 16 | Helper text |
| `fontSize.md` | 14 | 20 | Normal text |
| `fontSize.lg` | 16 | 22 | Emphasized text |
| `fontSize.xl` | 20 | 28 | Subheading |
| `fontSize.2xl` | 24 | 32 | Page title |
| `fontSize.3xl` | 30 | 38 | Main heading |

### Typography usage

```typescript
const { fonts, fontSize } = useTheme();

// CORRECT:
<Typography variant="h1">Title</Typography>
<Typography variant="body">Body text</Typography>

// WRONG (FORBIDDEN):
<Text style={{ fontSize: 24, fontWeight: 'bold' }}>Title</Text>
```
-->

---

## Spacing and layout

### Spacing scale

| Token | Value | Usage |
|---|---|---|
| `spacing.xs` | 4 | Minimum gap, between icon and text |
| `spacing.sm` | 8 | Small gap between list items |
| `spacing.md` | 16 | Standard gap, section padding |
| `spacing.lg` | 24 | Large gap, between sections |
| `spacing.xl` | 32 | Extra gap, page padding |
| `spacing.2xl` | 48 | Maximum gap |

### Layout rules

```typescript
const { spacing } = useTheme();

// CORRECT — Use theme spacing
<View style={{ padding: spacing.md, gap: spacing.sm }}>

// WRONG (FORBIDDEN) — Hardcoded value
<View style={{ padding: 16, gap: 8 }}>
```

### Border radius

| Token | Value | Usage |
|---|---|---|
| `borderRadius.sm` | 4 | Small elements (chip, badge) |
| `borderRadius.md` | 8 | Cards, inputs |
| `borderRadius.lg` | 12 | Large cards, modal |
| `borderRadius.xl` | 16 | Bottom sheet |
| `borderRadius.full` | 9999 | Circle (avatar, FAB) |

---

## Forbidden practices

<!-- GENERATE: FORBIDDEN_PRACTICES
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.rules, project.conventions, project.forbidden_patterns
Example output:
### Strictly FORBIDDEN practices

| # | Forbidden | Reason | Correct alternative |
|---|---|---|---|
| 1 | Hardcoded color (`#FF0000`, `red`) | Breaks in dark mode, inconsistency | Use `colors.error` token |
| 2 | Hardcoded font size (`fontSize: 16`) | Typography inconsistency | Use `fontSize.lg` token |
| 3 | Hardcoded spacing (`padding: 16`) | Layout inconsistency | Use `spacing.md` token |
| 4 | Raw `<Text>` component | Style inconsistency | Use `<Typography>` |
| 5 | Raw `<TextInput>` component | Theme mismatch | Use themed `<TextInput>` |
| 6 | Using `<FlatList>` | Performance issue | Use `<FlashList>` |
| 7 | Inline `style` object inside render | New reference every render | Use `StyleSheet.create` or theme |
| 8 | `Platform.OS === 'ios' ?` for style | Hard to maintain | Use `Platform.select()` |
| 9 | Pixel value (`width: 375`) | Breaks on different screen sizes | Use responsive values |
| 10 | Hiding with `opacity: 0` | Element stays in the tree | Use conditional render |
-->

---

## Mandatory rules

1. **Color → Token** — Never use hardcoded color values. Always use a `colors.*` token.
2. **Font → Theme** — Always take font family, size, and weight from the theme.
3. **Spacing → Token** — Always take padding, margin, and gap from `spacing.*` tokens.
4. **Component library** — Use the project components for basic UI.
5. **Dark mode** — `useTheme()` handles it. Do not add a manual toggle.
6. **StyleSheet.create** — Define styles outside render or use theme tokens.
7. **Responsive** — Prefer flexible layout (flex, percentage) over fixed pixel values.
8. **Platform.select** — Use `Platform.select()` for platform-specific styles instead of ternary.

## Invariant rules

- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
- Do not write config into Codebase
- Codebase is readable; config is not written there

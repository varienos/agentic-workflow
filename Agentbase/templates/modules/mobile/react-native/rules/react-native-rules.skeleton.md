# React Native rules

> These rules apply to plain React Native projects (without Expo).
> All developers and agents MUST follow these rules.

---

<!-- GENERATE: CODEBASE_CONTEXT
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.name, project.description, project.structure
Example output:
## Project context

- **Project:** MyApp — Financial tracking mobile app
- **Structure:** Monorepo (RN project under `apps/mobile/`)
- **RN version:** 0.73.x (New Architecture enabled)
- **State management:** Zustand
- **Navigation:** React Navigation v6
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## Platform-specific code rules

### Platform separation

```typescript
import { Platform } from 'react-native';

// CORRECT — Use Platform.select
const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 4 },
    }),
  },
});

// CORRECT — Platform-specific file extension
// Button.ios.tsx / Button.android.tsx
// RN bundler automatically picks the correct file

// WRONG (FORBIDDEN) — Platform check with ternary
const shadow = Platform.OS === 'ios'
  ? { shadowColor: '#000' }
  : { elevation: 4 };
```

### Platform-specific file structure

| Situation | Approach | Example |
|---|---|---|
| Small difference (1-2 lines) | `Platform.select()` | Shadow style |
| Medium difference (component logic) | `Platform.OS` check | Permission request flow |
| Large difference (different UI) | `.ios.tsx` / `.android.tsx` files | Date picker |

---

## Performance rules

### List performance

```typescript
// CORRECT — Use FlatList (for long lists)
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={5}
/>

// CORRECT — List item must be memoized
const ListItem = React.memo(({ item }: { item: Item }) => (
  <View style={styles.item}>
    <Text>{item.title}</Text>
  </View>
));

// WRONG (FORBIDDEN) — Long list with ScrollView
<ScrollView>
  {items.map((item) => (
    <View key={item.id}><Text>{item.title}</Text></View>
  ))}
</ScrollView>
```

### General performance

| Rule | Description |
|---|---|
| `React.memo` | REQUIRED on list item components |
| `useCallback` | Memoize event handlers (especially FlatList renderItem) |
| `useMemo` | Use for expensive computations |
| Inline style FORBIDDEN | Creates a new object every render — use `StyleSheet.create` |
| Inline function FORBIDDEN (inside lists) | Define `renderItem` outside |
| Image size | Use a source sized for display; shrink large images |
| Console.log | Must be removed in production builds (`babel-plugin-transform-remove-console`) |

---

## Navigation rules (React Navigation)

### Structure

```typescript
// CORRECT — Type-safe navigation
type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// CORRECT — Navigation hook
const navigation = useNavigation<NavigationProp<RootStackParamList>>();
navigation.navigate('Profile', { userId: '123' });

// WRONG (FORBIDDEN) — Untyped navigation
navigation.navigate('Profile'); // missing parameter
```

### Navigation best practices

| Rule | Description |
|---|---|
| Type-safe parameters | `ParamList` type REQUIRED |
| Deep linking | `linking` config must always be defined |
| Tab navigator | More than 5 tabs FORBIDDEN |
| Nested navigator | Maximum 3 nested levels |
| Screen options | `screenOptions` at navigator level, `options` at screen level |
| Header | Prefer a custom header component |

---

## Native module rules

### Native linking

```typescript
// CORRECT — Auto-linking (RN 0.60+)
// 1. npm install react-native-camera
// 2. cd ios && pod install
// Linking is automatic now

// WRONG (FORBIDDEN) — Manual linking
// react-native link react-native-camera
```

### Permission management

```typescript
import { PermissionsAndroid, Platform } from 'react-native';

// CORRECT — Request permission per platform
const requestCameraPermission = async () => {
  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera permission',
        message: 'The app wants to access your camera',
        buttonPositive: 'Allow',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  // iOS: NSCameraUsageDescription must be set in Info.plist
  return true;
};
```

---

## Image management

### Image rules

```typescript
import { Image } from 'react-native';

// CORRECT — Specify size and resizeMode
<Image
  source={{ uri: imageUrl }}
  style={{ width: 200, height: 150 }}
  resizeMode="cover"
  defaultSource={require('./placeholder.png')}
/>

// CORRECT — Use FastImage for large lists
import FastImage from 'react-native-fast-image';

<FastImage
  source={{ uri: imageUrl, priority: FastImage.priority.normal }}
  style={{ width: 200, height: 150 }}
  resizeMode={FastImage.resizeMode.cover}
/>

// WRONG (FORBIDDEN) — Image without size
<Image source={{ uri: imageUrl }} />
```

| Rule | Description |
|---|---|
| `width` + `height` required | Image without size breaks layout |
| `resizeMode` required | Default behavior differs by platform |
| `FastImage` for large lists | Disk cache + memory optimization |
| Local image with `require()` | For bundler optimization |
| Placeholder | Avoid empty space with `defaultSource` |

---

## Styling rules

### StyleSheet usage

```typescript
// CORRECT — Use StyleSheet.create
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

// WRONG (FORBIDDEN) — Inline style
<View style={{ flex: 1, padding: 16 }}>
  <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Title</Text>
</View>

// WRONG (FORBIDDEN) — Style object created inside render
const MyComponent = () => {
  const myStyle = { padding: 16 }; // New reference every render
  return <View style={myStyle} />;
};
```

---

<!-- GENERATE: DESIGN_SYSTEM_NAME
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.design_system, project.theme_config
Example output:
## Design system: AppTheme

- **Theme file:** `src/theme/index.ts`
- **Hook:** `useTheme()` — access to all color, spacing, typography values
- **Provider:** `<ThemeProvider>` — wrapper inside `App.tsx`
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
| `colors.primary` | `#007AFF` | `#0A84FF` | Primary actions, buttons |
| `colors.background` | `#FFFFFF` | `#000000` | Page background |
| `colors.text` | `#000000` | `#FFFFFF` | Main text |
| `colors.error` | `#FF3B30` | `#FF453A` | Error messages |

### Color access

```typescript
const { colors } = useTheme();

// CORRECT:
<View style={{ backgroundColor: colors.background }}>

// WRONG (FORBIDDEN):
<View style={{ backgroundColor: '#FFFFFF' }}>
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
| Button | `<Button>` | `<TouchableOpacity><Text>` | All buttons use Button component |
| Text | `<Typography>` | `<Text>` | Raw Text FORBIDDEN |
| Input | `<TextInput>` (themed) | RN `<TextInput>` | Use the theme-aware version |
| Card | `<Card>` | `<View style={...}>` | Includes shadow, border, padding |
| List | `<FlatList>` | `<ScrollView>` map | FlatList for performance |
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
| `fonts.bold` | Inter-Bold | 700 | Headings |

### Font sizes

| Token | Size | Line height | Usage |
|---|---|---|---|
| `fontSize.sm` | 12 | 16 | Helper text |
| `fontSize.md` | 14 | 20 | Normal text |
| `fontSize.lg` | 16 | 22 | Emphasized text |
| `fontSize.xl` | 20 | 28 | Subheading |
| `fontSize.2xl` | 24 | 32 | Page title |
-->

---

## Test rules

### React Native Testing Library

```typescript
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// CORRECT — Test from the user perspective
it('should show error when form is invalid', async () => {
  const { getByText, getByPlaceholderText } = render(<LoginScreen />);

  fireEvent.changeText(getByPlaceholderText('Email'), '');
  fireEvent.press(getByText('Sign in'));

  await waitFor(() => {
    expect(getByText('Email is required')).toBeTruthy();
  });
});

// WRONG (FORBIDDEN) — Implementation detail test
it('should set state', () => {
  const { UNSAFE_getByType } = render(<LoginScreen />);
  // Direct state access FORBIDDEN
});
```

| Rule | Description |
|---|---|
| `@testing-library/react-native` | REQUIRED as the test library |
| `getByText`, `getByPlaceholderText` | Prefer accessibility queries |
| `UNSAFE_*` queries FORBIDDEN | Creates dependency on implementation details |
| Limited snapshot tests | Suitable for small, isolated components |
| Mock native modules | Like `jest.mock('react-native-camera')` |

---

## Common mistakes

| # | Mistake | Description | Fix |
|---|---|---|---|
| 1 | `<View>` inside `<Text>` | Invalid nesting | Move `<View>` content outside `<Text>` |
| 2 | Forgetting to hide keyboard | Keyboard overlaps inputs | Use `KeyboardAvoidingView` or `react-native-keyboard-aware-scroll-view` |
| 3 | Missing `SafeAreaView` | Content sits under notch/status bar | Use `SafeAreaView` in the root component |
| 4 | Hardcoded size | Breaks on different screens | Use `Dimensions`, `useWindowDimensions`, or flex |
| 5 | Nested `TouchableOpacity` | Touch events conflict | Put a single touchable on the outer container |
| 6 | `console.log` in production | Performance impact | Use `babel-plugin-transform-remove-console` |
| 7 | Incorrect Animated API usage | Blocks the JS thread | Use `useNativeDriver: true` |
| 8 | Uncontrolled StatusBar | Looks different per screen | Control with `<StatusBar>` on every screen |

---

## Forbidden practices

<!-- GENERATE: FORBIDDEN_PRACTICES
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.rules, project.conventions, project.forbidden_patterns
Example output:
### Strictly FORBIDDEN practices

| # | Forbidden | Reason | Correct alternative |
|---|---|---|---|
| 1 | Inline style object | New reference every render, performance cost | Use `StyleSheet.create` |
| 2 | Long list with `ScrollView` | Renders all items, memory issues | Use `FlatList` |
| 3 | Hardcoded color value | Theme inconsistency, dark mode breaks | Use a color token |
| 4 | `react-native link` (manual) | Auto-linking exists (RN 0.60+) | `pod install` is enough |
| 5 | Unnecessary `useNativeDriver: false` | Blocks JS thread, janky animation | Use `useNativeDriver: true` |
| 6 | `Dimensions.get` inside render | Does not update when size changes | Use `useWindowDimensions` hook |
| 7 | Large data in `AsyncStorage` | 6MB limit, slow | Use MMKV or SQLite |
-->

---

## Mandatory rules

1. **StyleSheet.create REQUIRED** — Define styles outside render; inline style objects FORBIDDEN.
2. **FlatList > ScrollView** — FlatList REQUIRED for long lists; ScrollView with map FORBIDDEN.
3. **Platform.select > Ternary** — Use `Platform.select()` for platform-specific styles.
4. **React.memo on list items** — FlatList renderItem components must be memoized.
5. **SafeAreaView** — Use SafeAreaView in the root component.
6. **KeyboardAvoidingView** — Keyboard management REQUIRED on screens with forms.
7. **Type-safe navigation** — navigate without a ParamList type FORBIDDEN.
8. **Image size** — Image without `width`, `height`, and `resizeMode` FORBIDDEN.
9. **Native driver** — Use `useNativeDriver: true` wherever possible in animations.
10. **Test** — Use accessibility queries with `@testing-library/react-native`.

## Invariant rules

- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
- Do not write config into Codebase
- Codebase is readable; config is not written there

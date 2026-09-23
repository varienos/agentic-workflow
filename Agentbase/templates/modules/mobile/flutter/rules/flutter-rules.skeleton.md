# Flutter/Dart rules

> These rules apply to Flutter projects.
> All developers and agents MUST follow these rules.

---

<!-- GENERATE: CODEBASE_CONTEXT
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.name, project.description, project.structure
Example output:
## Project context

- **Project:** MyApp — Health tracking mobile app
- **Structure:** Monorepo (Flutter project under `apps/mobile/`)
- **Flutter version:** 3.x
- **Dart version:** 3.x
- **State management:** Riverpod
- **Navigation:** GoRouter
- **Deploy:** App Store + Google Play
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## Project structure

### Directory organization

```
lib/
├── main.dart                  # Entry point
├── app.dart                   # MaterialApp / CupertinoApp
├── features/                  # Feature-based module organization
│   ├── auth/
│   │   ├── data/              # Repository, data source, model
│   │   ├── domain/            # Entity, use case, repository interface
│   │   └── presentation/     # Screen, widget, controller/cubit
│   ├── home/
│   └── settings/
├── core/                      # Shared infrastructure
│   ├── theme/                 # Theme definitions
│   ├── router/                # Route definitions
│   ├── network/               # HTTP client, interceptor
│   ├── constants/             # Constants
│   └── utils/                 # Helper functions
├── shared/                    # Shared widgets
│   ├── widgets/               # Common UI components
│   └── extensions/            # Dart extension methods
test/
├── unit/                      # Unit tests
├── widget/                    # Widget tests
└── integration/               # Integration tests
```

### Project structure rules

| Rule | Description |
|---|---|
| Feature-based under `lib/` | Each feature in its own directory (auth, home, etc.) |
| `lib/main.dart` entry point | `runApp()` is called here |
| `lib/src/` or `lib/features/` | Module-based organization — avoid a flat structure |
| `core/` shared infrastructure | Theme, router, network, constants live here |
| `shared/widgets/` common widgets | Widgets used by more than one feature |

---

<!-- GENERATE: STATE_MANAGEMENT
Explanation: This section is detected automatically by Bootstrap.
Required manifest fields: project.dependencies, project.state_management
Example output:
## State management: Riverpod

- **Detection:** `flutter_riverpod` dependency present in `pubspec.yaml`
- **Provider types:** `StateNotifierProvider`, `FutureProvider`, `StreamProvider`
- **Overrides:** Override with `ProviderScope` for tests
- **Code generation:** `riverpod_generator` + `build_runner` in use
-->

---

## State management rules

### General principles

```dart
// CORRECT — ONE state management approach across the project
// Provider, Riverpod, Bloc, or GetX — DO NOT MIX

// CORRECT — Prefer StatelessWidget where state is not needed
class ProductCard extends StatelessWidget {
  final Product product;

  const ProductCard({super.key, required this.product});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Text(product.name),
    );
  }
}

// WRONG (FORBIDDEN) — StatefulWidget where state is not needed
class ProductCard extends StatefulWidget { // UNNECESSARY
  // If setState is never called, make it StatelessWidget
}
```

### State rules table

| Rule | Description |
|---|---|
| ONE approach | Use a single state management package across the project |
| Global vs local separation | Global state (auth, theme) vs local state (form, animation) must be clear |
| Limited StatefulWidget | Only where local state is truly required |
| Immutable state | State objects must be immutable (`copyWith` pattern) |
| Dispose state | Streams, controllers, subscriptions must be disposed |

---

## Widget rules

### Widget tree and composition

```dart
// CORRECT — Split the widget tree (3+ nested levels → separate Widget)
class ProfileScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const ProfileAppBar(),
      body: const ProfileBody(),
    );
  }
}

class ProfileBody extends StatelessWidget {
  const ProfileBody({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        ProfileHeader(),
        ProfileStats(),
        ProfileActions(),
      ],
    );
  }
}

// WRONG (FORBIDDEN) — Deeply nested widget tree
class ProfileScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          Container(
            child: Row(
              children: [
                Column(
                  children: [
                    // 5+ levels deep — UNREADABLE
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
```

### Const constructor and performance

```dart
// CORRECT — Use const constructor wherever possible
class AppLogo extends StatelessWidget {
  const AppLogo({super.key}); // const constructor

  @override
  Widget build(BuildContext context) {
    return const FlutterLogo(size: 48); // const widget
  }
}

// CORRECT — const widget references
Widget build(BuildContext context) {
  return Column(
    children: const [
      AppLogo(),              // const — does not rebuild
      SizedBox(height: 16),   // const — does not rebuild
    ],
  );
}

// WRONG (FORBIDDEN) — Not using const where possible
Widget build(BuildContext context) {
  return Column(
    children: [
      AppLogo(),              // Missing const — recreated on every build
      SizedBox(height: 16),   // Missing const
    ],
  );
}
```

### Build method rules

```dart
// CORRECT — Do not compute inside build
class UserScreen extends StatefulWidget {
  @override
  State<UserScreen> createState() => _UserScreenState();
}

class _UserScreenState extends State<UserScreen> {
  late final UserService _userService;

  @override
  void initState() {
    super.initState();
    _userService = UserService(); // Initialize in initState
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context); // Theme access OK
    return Container(color: theme.primaryColor);
  }
}

// WRONG (FORBIDDEN) — Heavy work in build method
Widget build(BuildContext context) {
  final filtered = items.where((i) => i.isActive).toList(); // HEAVY COMPUTATION
  filtered.sort((a, b) => a.name.compareTo(b.name));        // REPEATED EVERY BUILD
  return ListView.builder(...);
}
```

### Widget rules table

| Rule | Description |
|---|---|
| 3+ levels deep → split | Extract deep widget trees into separate Widget classes |
| `const` constructor | Use `const` wherever possible (performance) |
| Keep build clean | Computation and filtering in build FORBIDDEN |
| `initState` / `didChangeDependencies` | Initialization and dependency changes go here |
| Hardcoded values FORBIDDEN | Use Theme or design tokens for color/size |

---

## Navigation rules

### Route definitions

```dart
// CORRECT — Define route names as constants (magic strings FORBIDDEN)
abstract class AppRoutes {
  static const home = '/';
  static const profile = '/profile';
  static const settings = '/settings';
  static const productDetail = '/products/:id';
}

// CORRECT — Type-safe routing with GoRouter
final router = GoRouter(
  routes: [
    GoRoute(
      path: AppRoutes.home,
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: AppRoutes.productDetail,
      builder: (context, state) {
        final id = state.pathParameters['id']!;
        return ProductDetailScreen(productId: id);
      },
    ),
  ],
);

// WRONG (FORBIDDEN) — Navigation with magic strings
Navigator.pushNamed(context, '/profile'); // Use a constant
context.go('/products/123');              // Use AppRoutes.productDetail
```

### Navigation rules table

| Rule | Description |
|---|---|
| GoRouter or Navigator 2.0 | Prefer modern routing approaches |
| Deep linking support | Routes must be deep-link compatible |
| Route names as constants | Define in `AppRoutes` class — magic strings FORBIDDEN |
| Redirect/guard | Auth checks at route level (`redirect` callback) |
| Nested navigation | Tab-based navigation with shell routes |

---

<!-- GENERATE: DESIGN_SYSTEM
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.theme_config, project.design_system
Example output:
## Design system

### Theme structure

- **Theme file:** `lib/core/theme/app_theme.dart`
- **Light theme:** `AppTheme.light()`
- **Dark theme:** `AppTheme.dark()`
- **Access:** `Theme.of(context)` or `context.theme` extension

### Color tokens

| Token | Light | Dark | Usage |
|---|---|---|---|
| `colorScheme.primary` | `#1E88E5` | `#42A5F5` | Primary actions |
| `colorScheme.surface` | `#FFFFFF` | `#121212` | Card background |
| `colorScheme.error` | `#D32F2F` | `#EF5350` | Error messages |

### Spacing

| Token | Value | Usage |
|---|---|---|
| `AppSpacing.xs` | 4 | Minimum gap |
| `AppSpacing.sm` | 8 | Small gap |
| `AppSpacing.md` | 16 | Standard gap |
| `AppSpacing.lg` | 24 | Large gap |
| `AppSpacing.xl` | 32 | Extra-large gap |
-->

---

## Performance rules

### List performance

```dart
// CORRECT — ListView.builder (for large lists)
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) {
    return ProductCard(product: items[index]);
  },
)

// CORRECT — Specify itemExtent for very large lists
ListView.builder(
  itemCount: items.length,
  itemExtent: 80.0, // Fixed height — improves scroll performance
  itemBuilder: (context, index) => ProductTile(product: items[index]),
)

// WRONG (FORBIDDEN) — ListView with children (creates all items at once)
ListView(
  children: items.map((item) => ProductCard(product: item)).toList(),
)
```

### Preventing unnecessary rebuilds

```dart
// CORRECT — Isolate unnecessary repaints with RepaintBoundary
RepaintBoundary(
  child: ComplexAnimatedWidget(),
)

// CORRECT — Partial listening with Selector/Consumer (Provider example)
Consumer<CartModel>(
  builder: (context, cart, child) {
    return Text('${cart.itemCount} items');
  },
)

// CORRECT — Image caching
CachedNetworkImage(
  imageUrl: product.imageUrl,
  placeholder: (context, url) => const CircularProgressIndicator(),
  errorWidget: (context, url, error) => const Icon(Icons.error),
)
```

### Performance rules table

| Rule | Description |
|---|---|
| `ListView.builder` | REQUIRED for large lists — `ListView(children:)` FORBIDDEN |
| `const` widget | Use `const` so widgets do not rebuild |
| `Selector` / `Consumer` | Partial state listening — prevent unnecessary rebuilds |
| `RepaintBoundary` | Isolate animated widgets |
| `cached_network_image` | Disk/memory cache for network images |
| `itemExtent` | Scroll performance for fixed-size list items |

---

## Platform-specific code rules

```dart
import 'dart:io' show Platform;

// CORRECT — Platform check
if (Platform.isIOS) {
  // iOS-specific code
} else if (Platform.isAndroid) {
  // Android-specific code
}

// CORRECT — Separate class for platform channel
class NativeBridge {
  static const _channel = MethodChannel('com.example.app/native');

  static Future<String> getBatteryLevel() async {
    final level = await _channel.invokeMethod<int>('getBatteryLevel');
    return '$level%';
  }
}

// CORRECT — Consistent widget choice
// Material OR Cupertino across the project — do not mix
Widget build(BuildContext context) {
  return Platform.isIOS
      ? CupertinoButton(child: Text('OK'), onPressed: onTap)
      : ElevatedButton(child: Text('OK'), onPressed: onTap);
}
```

| Rule | Description |
|---|---|
| `Platform.isIOS` / `Platform.isAndroid` | For platform checks |
| Platform channel in separate file | Isolate native communication |
| Cupertino vs Material | Consistent choice across the project |
| `kIsWeb` check | For web platform use `import 'package:flutter/foundation.dart'` |

---

<!-- GENERATE: PROJECT_CONVENTIONS
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.conventions, project.rules, project.folder_structure
Example output:
## Project conventions

### File naming
- Dart files: `snake_case.dart` (example: `product_card.dart`)
- Test files: `*_test.dart` (example: `product_card_test.dart`)
- Barrel files: `index.dart` in the feature directory (optional)

### Import order
1. Dart SDK (`dart:async`, `dart:io`)
2. Flutter SDK (`package:flutter/material.dart`)
3. Third-party packages (`package:provider/provider.dart`)
4. Project internals (`package:myapp/features/...`)
5. Relative imports (within the same feature `./`, `../`)

### Class naming
- Widget: PascalCase (`ProductCard`, `LoginScreen`)
- State class: `_WidgetNameState` (`_LoginScreenState`)
- Model: PascalCase (`UserModel`, `Product`)
- Enum: PascalCase, values camelCase (`enum Status { active, inactive }`)
-->

---

## Test rules

### Unit test

```dart
// CORRECT — Unit tests for business logic and utilities
import 'package:test/test.dart';

void main() {
  group('PriceCalculator', () {
    test('should apply discount correctly', () {
      final calculator = PriceCalculator();
      final result = calculator.applyDiscount(100.0, 0.2);
      expect(result, 80.0);
    });

    test('should throw for negative discount', () {
      final calculator = PriceCalculator();
      expect(
        () => calculator.applyDiscount(100.0, -0.1),
        throwsA(isA<ArgumentError>()),
      );
    });
  });
}
```

### Widget test

```dart
// CORRECT — UI checks with widget tests
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Counter increments', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: CounterScreen()));

    expect(find.text('0'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.add));
    await tester.pump();

    expect(find.text('1'), findsOneWidget);
  });
}
```

### Test rules table

| Rule | Description |
|---|---|
| Unit test | For business logic and utility functions |
| Widget test | For UI components and user interaction |
| Integration test | For end-to-end flows |
| `flutter test` | Command to run tests |
| Golden test | Visual regression with `matchesGoldenFile` |
| Mock/Fake | `mockito` or `mocktail` for dependencies |

---

## Forbidden practices

| # | Forbidden | Reason | Correct alternative |
|---|---|---|---|
| 1 | `print()` | Log noise in production | `debugPrint()` or a `logger` package |
| 2 | `dynamic` type | Lost type safety, runtime errors | Always declare an explicit type |
| 3 | Async inside `setState()` | Race condition and memory leak risk | Do async work outside, then call setState with the result |
| 4 | Repeated `MediaQuery.of(context)` in build | Each call walks the widget tree | Assign to a variable: `final size = MediaQuery.sizeOf(context)` |
| 5 | Hardcoded string | No i18n, hard to maintain | Use `intl` or `easy_localization` |
| 6 | `ListView(children:)` for large lists | Creates all items at once, memory issues | Use `ListView.builder` |
| 7 | Non-const static widgets | Unnecessary rebuilds | Add a `const` constructor |
| 8 | Widget tree 5+ levels | Unreadable, hard to maintain | Extract into a separate Widget class |

---

<!-- GENERATE: FORBIDDEN_PRACTICES
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.rules, project.conventions, project.forbidden_patterns
Example output:
### Project-specific forbidden items

| # | Forbidden | Reason | Correct alternative |
|---|---|---|---|
| 1 | Using `GetX` | Project uses Riverpod | Use `ref.watch`, `ref.read` |
| 2 | `Navigator.push` | GoRouter is in use | `context.go()`, `context.push()` |
| 3 | Hardcoded color | Theme system exists | `Theme.of(context).colorScheme` |
| 4 | `http` package | `dio` is in use | Use the `DioClient` class |
-->

---

## Mandatory rules

1. **`const` constructor REQUIRED** — Use `const` wherever possible; critical for performance.
2. **`ListView.builder` REQUIRED** — `ListView(children:)` FORBIDDEN for large lists.
3. **Widget tree depth** — 3+ nested levels → extract into a separate Widget class.
4. **Single state approach** — Provider/Riverpod/Bloc/GetX across the project — DO NOT MIX.
5. **Clean build method** — Computation, filtering, and async work in build FORBIDDEN.
6. **Route names as constants** — Magic-string navigation FORBIDDEN; use `AppRoutes`.
7. **Type safety** — `dynamic` FORBIDDEN; always declare an explicit type.
8. **Use `debugPrint()`** — `print()` FORBIDDEN; prefer a logger package.
9. **Isolate platform-specific code** — Platform channels and native code in separate class/file.
10. **Test** — Unit + Widget + Integration layers, run with `flutter test`.

## Invariant rules

- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
- Do not write config into Codebase
- Codebase is readable; config is not written there

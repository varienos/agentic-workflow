# Invariant Rules for Laravel Development

> These rules are applicable for projects using the Laravel framework.

> The backend/php family of rules can be applied to this file.
>
All developers and agents MUST comply with these rules.

---

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is filled by Bootstrap with manifest data.
Required manifest areas: project.description, stack.primary, project.structure
Example output:
## Project Boundary
- **Project:** E-commerce API (Laravel + MySQL)
- **Stack:** PHP 8.2, Laravel 11, MySQL 8, Redis
- **Architecture:**
  - `app/` — Application code
  - `routes/` — Route definitions
  - `database/` — Migration and seeder files
  - `tests/` — Test files
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase

---

<!-- GENERATE: LARAVEL_VERSION
Description: This section is filled by Bootstrap with manifest data.
Required manifest areas: stack.framework_version, stack.php_version
Example output:
## Version Information
- **Laravel:** 11.x
- **PHP:** 8.2+
- **Minimum compatibility:** PHP 8.1
-->

---

## Environment Variable Management

### .env File

- The `.env` file MUST be excluded from commit.
- The `.env.example` file MUST always contain the necessary variables and be up-to-date.
- When adding a new environment variable, it must also be added to `.env.example`.

### config() vs env()

- In application code, `env()` MUST BE USED. It is only used in `config/` files.
- In application code, `config('services.stripe.key')` style usage MUST BE USED. Never use `env()` directly.
- Reason: If `config:cache` is run after using `env()`, it will return null; always use `config()`.

  ```php
// backend/php
// .env.example
# config/services/stripe.key.php
'key' => env('STRIPE_KEY')
```
```php
// ❌ WRONG — application code uses env()
$key = env('STRIPE_KEY');

// ✅ RIGHT — access through config
// config/services.php: 'stripe' => ['key' => env('STRIPE_KEY')]
$key = config('services.stripe.key');
```
## Rota Conventions

### Resource Controller

- Always use a resource controller for CRUD operations.
- Avoid unnecessary route definitions — `Route::resource()` automatically creates 7 routes.

```php
// ✅ DOGRU — resource controller
Route::resource('posts', PostController::class);

// Only specify certain actions:
Route::resource('posts', PostController::class)->only(['index', 'show']);

// ❌ YANLIS — manual definition
Route::get('/posts', [PostController::class, 'index']);
Route::get('/posts/{id}', [PostController::class, 'show']);
Route::post('/posts', [PostController::class, 'store']);
```


### Route Model Binding

- Use Route Model Binding instead of manually querying URL parameters.
- Implicit binding uses the `id` column by default; override with `getRouteKeyName()` for different columns.


```php
// ❌ YANLIS — manual query
public function show($id) {
    $post = Post::findOrFail($id);
>>>
php
/**
 * @see https://fluentphp.com/2.0/en/user-guide/routing.html#route-model-binding
 */

// ✅ DOGRU — route model binding
public function show(Post $post) {
    return $post;
}
    echo $post->author->name; // Tek sorgu
}
```
### Invariant Rules for Mass Assignment Protection

- Define `$fillable` or `$guarded` in the model.
- Use `$guarded = []` (empty guarded) to leave all fields open — DO NOT LEAVE ANY FIELD CLOSED.
- Add sensitive fields (role, is_admin, balance) to `$fillable`.

  ```yml
  // example configuration
  protected $fillable = [
    'role', 
    'is_admin', 
    'balance'
  ];

  protected $guarded = [];
```

  ```php
  use Illuminate\Http\Request;
  use Illuminate\Support\Facades\Validator;

  public function validate(Request $request)
  {
    $validator = Validator::make($request->all(), [
      // validation rules
    ]);

    if ($validator->fails()) {
      return response()->json(['error' => 'Validation failed'], 422);
    }
```

php
protected $guarded = ['id', 'created_at', 'updated_at'];
* Always use `{{ }}` when displaying user input to prevent automatic XSS protection.
* Use `{!! !!}` (raw output) only for trusted and sanitized HTML content.
* Note that `{!! !!}` should not be used without a reason in the comment.


```blade
{{-- correct — automatic XSS protection --}}
<p>{{ $user->name }}</p>

{{-- ❌ TEHLIKELI — XSS acigi --}}
<p>{!! $user->bio !!}</p>

{{-- ✅ KABUL EDILEBILIR — bilinen guvenli kaynak, yorum ile --}}
{{-- Sanitize edilmis HTML: Purifier middleware'den gecmis --}}
<div>{!! $article->sanitized_body !!}</div>
```

### Invariant Rules for CSRF Protection

#### CSRF Protection in Forms

* Use the `@csrf` directive in all POST/PUT/PATCH/DELETE form types.
* If an API route uses token-based authentication, CSRF can be ignored.

---

## Service Pattern

### Fat Model → Service

- Collect logic in either the controller or model. Move it to service classes instead.
- Controller: request validation + service invocation + response return.
- Service: business logic, invoking other services, composite operations.
- Model: relationships, scopes, accessor/mutator, data-focused operations.

```
### Controllers

#### OrderController
```php
// ✅ DOGRU — ince controller
class OrderController extends Controller {
    public function store(StoreOrderRequest $request, OrderService $service) {
        $order = $service->createOrder($request->validated());
        return new OrderResource($order);
    }
}

// ❌ YANLIS — sisman controller
class OrderController extends Controller {
    public function store(Request $request) {
        $validated = $request->validate([...]);
        $order = Order::create($validated);
        $order->items()->createMany($validated['items']);
        Mail::to($order->user)->send(new OrderConfirmation($order));
        Cache::forget('user_orders_' . $order->user_id);
        return response()->json($order);
    }
}
```



---

## Test Conventions

### Directory Structure


```php
// Feature test ornegi
class PostTest extends TestCase {
    use RefreshDatabase;

    public function test_user_can_create_post(): void {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/api/v1/posts', [
                'title' => 'Test Post',
                'body' => 'Icerik',
            ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.title', 'Test Post');

        $this->assertDatabaseHas('posts', ['title' => 'Test Post']);
    }
}
```
---

<!-- GENERATE: PROJECT_CONVENTIONS
Explanation: This section will be filled with answers from interviews conducted by Bootstrap.
Required manifest areas: conventions.naming, conventions.patterns, conventions.project_specific
Example output:
## Project Specific Rules

- **API Response Format:** Always use `ApiResponse::success($data)` wrapper
- **Authentication:** Using token-based auth with Sanctum
- **Logging:** Use `Log::channel('slack')` for critical errors
- **Cache Strategy:** Redis, 1 hour TTL assumed
- **Queue:** Using Laravel Horizon and Redis queue
-->

---

## Invariant Rules Summary

1. `.env` should never be committed. `.env.example` is kept up-to-date.
2. Use `config()` instead of `env()`.
3. Use Resource Controllers for CRUD operations, specifying individual routes for each resource.
4. Use Route Model Binding with `findOrFail()` replaced by type-hints.
5. Use Eager Loading to avoid N+1 queries.
6. Be mindful of Mass Assignment and use `$fillable` to protect sensitive fields.
7. Use `{!! !!}` only for sanitized content in Blade templates.
8. Move logging to a service layer, focusing on controller logic and model data.
9. Use Factories instead of `Model::create()` in tests.
10. Distinguish between Feature and Unit Tests: HTTP tests go in the `Feature` directory, while isolate tests go in the `Unit` directory.

---

## Working Boundary Rules

1. `.env` files should never be committed. Instead, keep a `.env.example` file for reference.
2. Always use the `config()` method to access environment variables instead of `env()`.
3. Use Resource Controllers for CRUD operations and specify individual routes for each resource.
4. Implement Route Model Binding with type-hints in place of `findOrFail()`.
5. Utilize Eager Loading to prevent N+1 queries.
6. Protect sensitive fields by using the `$fillable` array in mass assignment.
7. Use `{!! !!}` only for sanitized content in Blade templates.
8. Move logging and related logic to a service layer, keeping controller logic focused on data and model interactions.
9. Use Factories instead of `Model::create()` in tests.
10. Distinguish between Feature and Unit Tests: HTTP tests go in the `Feature` directory, while isolate tests go in the `Unit` directory.

---

## Critical Errors

1. **CRITICAL** Failure to commit `.env` files; use `.env.example` instead.
2. **CRITICAL** Misuse of `env()` for environment variable access; use `config()` instead.
3. **MEDIUM** Inconsistent logging; move logic to a service layer.
4. **CRITICAL** N+1 queries; implement Eager Loading.
5. **CRITICAL** Mass assignment vulnerabilities; protect sensitive fields with `$fillable`.
6. **CRITICAL** Unsanitized content in Blade templates; use `{!! !!}` only for sanitized data.

---

## High-Priority Issues

1. **HIGH** Inconsistent testing practices; separate Feature and Unit Tests.
2. **HIGH** Insufficient logging; move related logic to a service layer.
3. **MEDIUM** Inadequate error handling; improve critical error responses.
4. ** HIGH** Inconsistent use of Resource Controllers; specify individual routes for each resource.
5. **HIGH** Failure to utilize Route Model Binding; implement type-hints in place of `findOrFail()`.
6. **CRITICAL** Misuse of Factories in tests; use them instead of `Model::create()`.

---

## Forbidden Practices

1. **FORBIDDEN** Committing non-essential files like `.env` to version control.
2. **FORBIDDEN** Using untrusted sources for environment variables.
3. **FORBIDDEN** Failing to protect sensitive fields with `$fillable`.
4. **FORBIDDEN** Ignoring logging and related logic in service layers.

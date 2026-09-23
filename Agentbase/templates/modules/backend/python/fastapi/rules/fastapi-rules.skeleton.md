# FastAPI Development Invariant Rules

> These rules apply to projects using the FastAPI framework.
> The `backend/python` family of rules are applied with this file.
> All listings and agents MUST comply with these rules.

---

<!-- GENERATE: CODEBASE_CONTEXT
Explanation: This section is populated by Bootstrap with manifest data.
Required manifest areas: project.description, stack.primary, project.structure
Example output:
## Project Boundary
- **Project:** User Management API (FastAPI + PostgreSQL)
- **Stack:** Python 3.12, FastAPI, SQLAlchemy, Alembic, PostgreSQL
- **Architecture:**
  - `app/` — Main application code
  - `app/api/` — Endpoint definitions
  - `app/models/` — SQLAlchemy models
  - `app/schemas/` — Pydantic schemas
  - `app/services/` — Service logic
  - `tests/` — Test files
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase

---

## Pydantic Models

### Request/Response Validation

- All request bodies MUST be defined with Pydantic models.
- The response model MUST be clearly specified (`response_model` parameter).
- Direct dictionary returns — always use Pydantic models.

---

# Working Boundary
> All listings and agents MUST comply with these rules.
```python
# ❌ Invalid — direct dict return
@app.post("/users")
async def create_user(data: dict):
    return {"id": 1, "name": data["name"]}

# ✅ Valid — Pydantic model validation
from pydantic import BaseModel, EmailStr, Field

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    model_config = ConfigDict(from_attributes=True)

@app.post("/users", response_model=UserResponse, status_code=201)
async def create_user(user: UserCreate):
    # ...
    return created_user
```
- **Input models:** `UserCreate`, `UserUpdate` — incoming data
- **Output models:** `UserResponse`, `UserListResponse` — outgoing data
- **DB models:** SQLAlchemy/ODM models — database tables
- Use the same model for both input and output — sensitive fields (password, internal_id) are allowed.

```python
# ✔️ STRONG — separate input/output models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str       # only in input

class UserResponse(BaseModel):
    id: int
    name: str
    email: str           # password NOT — output cannot have this field

    model_config = ConfigDict(from_attributes=True)
```


### Validation Rules

- Define constraints with `Field()`: `min_length`, `max_length`, `gt`, `lt`, `regex`.
- Use `@field_validator` for custom validators.
- Use `@model_validator` for complex cross-field validation.

---

## Dependency Injection

### Basic Usage


>>>
- Shared database (DB session, auth, pagination) dependencies are defined as a dependency.
- `Depends()` is used to inject the endpoint with it.
- In tests, dependencies are overridden — ideal for mocking purposes.


```python
# ✔️ GREEN — dependency injection
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    user = await verify_token(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user

@app.get("/me", response_model=UserResponse)
async def read_current_user(user: User = Depends(get_current_user)):
    return user
```


### Dependency Chaining

- Dependencies can be linked to other dependencies — FastAPI automatically handles this.
- Repeated dependency chains are used with `yield` for source management.


>>>
# Dependency override in a test
from fastapi.testclient import TestClient

def override_get_db():
    return test_db_session

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


## Async vs Sync Endpoint's

### When to Use async

- For I/O-bound operations (database queries, HTTP requests, file reads) use `async def`.
- If using an async database driver (asyncpg, aiosqlite), `async def` is MANDATORY.


```python
# ✔️ GREEN — async I/O operations
@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.id == user_id))
    return result.scalar_one_or_none()
```
- CPU-bound operations (computation, image processing) should use `def`.
- FastAPI synchronous functions are automatically run in a thread pool.
- Synchronous I/O in an asynchronous function — blocks the event loop.

```python
# OK - CPU-bound operation for sync
@app.post("/process-image")
def process_image(file: UploadFile):
    # Using a synchronous library like PIL
    image = Image.open(file.file)
    processed = heavy_processing(image)
    return {"result": "ok"}

# WRONG - Synchronous I/O in an asynchronous function
@app.get("/data")
async def get_data():
    result = requests.get("https://api.example.com")  # Blocks!
    return result.json()

# OK - Asynchronous HTTP request
@app.get("/data")
async def get_data():
    async with httpx.AsyncClient() as client:
        result = await client.get("https://api.example.com")
    return result.json()
```
- Use `HTTPException` in known error situations.
- Choose the appropriate HTTP status code (400, 401, 403, 404, 409, 422).
- Provide user-specific detailed explanation in the `detail` field.

```python
from fastapi import HTTPException

@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```


### Custom Exception Handler

- Define a custom exception handler for general consistent error format.
- Catch unexpected errors and log them — provide details in 500 errors.


```python
from fastapi import Request
from fastapi.responses import JSONResponse

class AppException(Exception):
    def __init__(self, status_code: int, detail: str, error_code: str):
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code

@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
```
# Return a JSON response with the exception details
return JSONResponse(
    status_code=exc.status_code,
    content={
        "error": exc.error_code,
        "detail": exc.detail,
    }
)

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    # Log the unexpected error without revealing details
    logger.error(f"Unexpected error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "internal_error", "detail": "Server error"}
    )
python
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader

# OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# API Key
api_key_header = APIKeyHeader(name="X-API-Key")

@app.get("/protected")
async def protected_route(user: User = Depends(get_current_user)):
    return {"message": f"Hello {user.name}"}
### Rate Limiting

- Use rate limiting in public-facing endpoints.
- Utilize middleware like `slowapi`.

### Input Sanitization

- Pydantic validation should not be the first layer of defense.
- Use an ORM that uses raw SQL to counter SQL injection attacks.
- Validate file paths to prevent path traversal.

---

## Test Conventions

### Test Selection

| Interval | Usage |
|---|---|
| `TestClient` | Synchronous endpoint testing |
| `httpx.AsyncClient` | Asynchronous endpoint testing |
| `pytest` | Test framework |
| `pytest-asyncio` | Async test support |
| `factory_boy` or `polyfactory` | Test data creation |

### Directory Structure


```
tests/
├── conftest.py           # Fixture definitions (app, client, db)
├── test_auth.py          # Authentication tests
├── test_users.py         # User endpoint tests
├── test_services/        # Service unit tests
│   └── test_user_service.py

>>>
└── factories.py          # Test data factories
```


### Test example


```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_create_user(client: AsyncClient):
    response = await client.post("/users", json={
        "name": "Test User",
        "email": "test@example.com",
        "password": "securepass123"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test User"
    assert "password" not in data  # The password must not be in the response

@pytest.mark.asyncio
async def test_get_nonexistent_user(client: AsyncClient):
    response = await client.get("/users/99999")
    assert response.status_code == 404
```
### Invariant Rules

- For each endpoint, write at least one successful and one unsuccessful test.
- Use dependency override to isolate tests — do not use real DB/service (unit tests).
- Use test DB in integration tests — connect to production DB.

---

<!-- GENERATE: PROJECT_CONVENTIONS
Description: This section is filled by Bootstrap with interview answers.
Required manifest areas: conventions.naming, conventions.patterns, conventions.project_specific
Example output:
## Project-Specific Rules

- **ORM:** Using SQLAlchemy 2.0 async
- **Migration:** Managed using Alembic
- **Authentication:** JWT (python-jose + passlib)
- **Cache:** Redis (aioredis)
- **Background tasks:** Celery or FastAPI BackgroundTasks
- **API documentation:** Swagger UI + ReDoc (FastAPI assumed)
- **Logging:** structlog with configured logging
-->

---

## Mandatory Invariant Rules Summary

1. **Use Pydantic models.** Directly convert to dict for request/response.
2. **Separate input/output models.** Do not use the same model for both input and output.
3. **Use dependency injection.** Inject common logic (DB, auth) using Depends().
4. **Choose async/sync correctly.** Use async for I/O-bound operations and sync for CPU-bound operations. Avoid blocking operations in async code.
5. **Use HTTPException.** Choose a correct status code and include an explanation in the detail field.
6. **Limit CORS.** Use `allow_origins=["*"]` to limit, define specific domain later.
7. **Validate using Pydantic.** Use field constraints and custom validators.
8. **Use dependency override for testing.** Test with a mock service instead of the real one in tests.
9. **Use pytest-asyncio for async tests.** Mark tests as asyncio using `@pytest.mark.asyncio`.
10. **Maintain error format consistency.** Use a custom exception handler to maintain a standard error response.

---

### Working Boundary

*   Use Pydantic models
*   Separate input/output models
*   Use dependency injection
*   Choose async/sync correctly
*   Use HTTPException
*   Limit CORS
*   Validate using Pydantic
*   Use dependency override for testing
*   Use pytest-asyncio for async tests
*   Maintain error format consistency

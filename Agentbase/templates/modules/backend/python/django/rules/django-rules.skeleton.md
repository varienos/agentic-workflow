# Invariant Rules
## Overview
These rules are applicable for projects using the Django framework.

> The backend/python family of rules will be applied to this file.
> All lists and agents must comply with these rules.

---

<!-- GENERATE: WORKING_BOUNDARY_CONTEXT
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: project.description, stack.primary, project.structure
Example output:
## Project Boundary
- **Project:** Blog platform (Django + PostgreSQL)
- **Stack:** Python 3.12, Django 5.0, PostgreSQL 16, Celery
- **Environment:**
  - `myproject/` — Django project configuration
  - `apps/` — Django applications
  - `templates/` — Templates
  - `static/` — Static files

Invariant Rules:
- Configure files should be only in Agentbase directory.
- The `.claude/` directory should not be created inside the codebase.
- Git repository should only work inside the codebase.

-->

---

<!-- GENERATE: DJANGO_VERSION_CONTEXT
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: stack.framework_version, stack.python_version
Example output:
## Version Information
- **Django:** 5.0.x
- **Python:** 3.12+
- **Minimum compatibility:** Python 3.10

---

## Settings Management

### Sensitive Data

- `SECRET_KEY`, database password, API keys should not be hardcoded in plaintext.
- Environment variables are read over: `django-environ`, `python-decouple` or `os.environ` should be used.
- The `.env` file should never be committed. It must be in the `.gitignore` list.

---
```python
# FORBIDDEN — hardcode secret
SECRET_KEY = 'django-insecure-xyz123456789'

# HIGH — ortam degiskeninden oku
import environ
env = environ.Env()
SECRET_KEY = env('SECRET_KEY')
```
### Invariant Rules Structure

- Individual `settings.py` files are acceptable for small projects.
- For larger projects, use the `settings/` directory:
```python
# MEDIUM — settings directory structure
# settings/
#     __init__.py
#     ...
```
>>>
### DEBUG Settings

- `DEBUG = True` ONLY in development environment.
- In production, `DEBUG = False` IS MANDATORY.
- `ALLOWED_HOSTS` must be defined in production (never `['*']`).

---

## URL Patterns

### path() vs url()

- As of Django 2.0, use `path()`, use `url()` (re_path) for non-regex patterns only.

```python
# ❌ WRONG — old way url()
from django.conf.urls import url
url(r'^posts/(?P<pk>\d+)/$', views.post_detail)

# ✅ RIGHT — path() with type-safe
from django.urls import path
path('posts/<int:pk>/', views.post_detail, name='post-detail')
```
### Namespace Usage

- Every app must have its own `urls.py` file.
- Define an `app_name` and refer to URLs with the namespace.
- Never hardcode URLs in templates or code.

```python
# apps/blog/urls.py
app_name = 'blog'
urlpatterns = [
    path('', views.PostListView.as_view(), name='post-list'),
    path('<int:pk>/', views.PostDetailView.as_view(), name='post-detail'),
]

# Template usage
# ❌ WRONG — hardcode URL
# <a href="/blog/42/>

# ✅ RIGHT — namespace with reverse
# <a href="{% url 'blog:post-detail' post.pk %}">
```

### API URLs

- Use DRF (Django REST Framework) router for REST APIs.
- Add version prefix: `/api/v1/...`

---

## View Conventions

### Class-Based vs Function-Based
### Class-Based Views (CBV)

- Use CBV for CRUD operations to reduce code duplication.
- Accept FBV for special or complex logic.

- Use generic views: `ListView`, `DetailView`, `CreateView`, `UpdateView`, `DeleteView`.

```python
# MEDIUM — generic CBV
from django.views.generic import ListView, DetailView

class PostListView(ListView):
    model = Post
    template_name = 'blog/post_list.html'
    context_object_name = 'posts'
    paginate_by = 20

class PostDetailView(DetailView):
    model = Post
    template_name = 'blog/post_detail.html'
```


### API Views (DRF)

- Use `APIView` or `ViewSet`.
- Validate and serialize with a serializer.
- Control permission with Permission classes.


```python
# MEDIUM — DRF ViewSet
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticatedOrReadOnly

class PostViewSet(ModelViewSet):

>>> 
```
python
queryset = Post.objects.select_related('author').all()
serializer_class = PostSerializer
permission_classes = [IsAuthenticatedOrReadOnly]
{# ✅ DOGRU — CSRF token #}
<form method="post">
    {% csrf_token %}
    {{ form.as_p }}
    <button type="submit">Send</button>
</form>

---

## Model Best Practices

### Meta Class

- Define `verbose_name` and `verbose_name_plural` for every model.
- Define `ordering` to avoid inconsistent results for unsorted queries.
- Implement the `__str__` method — crucial for admin panel and debug purposes.

```python
class Post(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    body = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Post'
        verbose_name_plural = 'Posts'
        ordering = ['-created_at']

    def __str__(self):
```
### Manager and QuerySet

- Use custom manager or QuerySet for repeated queries.
- Instead of overriding the `objects` manager, add an additional manager.

```python
class PublishedManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(status='published')

class Post(models.Model):
    # ...
    objects = models.Manager()  # Default manager
    published = PublishedManager()  # Custom manager

# Usage
Post.published.all()  # Only published posts
```

### select_related / prefetch_related

- Use `select_related()` for ForeignKey and OneToOne fields (JOIN).
- Use `prefetch_related()` for ManyToMany and reverse ForeignKey fields (separate query, Python-side join).
# Print the author's name of each post

print(post.author.name)  # Each iteration queries the database

# ✔️ Green
posts = Post.objects.select_related('author').all()
### Invariant Rules

- Test method names start with `test_` and clearly indicate what is being tested.
- Use factory patterns (`factory_boy`) instead of creating models directly.
- Each test creates its own data — tests should be independent of each other.
- Use `setUp` / `setUpTestData` to prepare shared test data.

- **API Framework:** Using Django REST Framework
- **Authentication:** JWT (djangorestframework-simplejwt)
- **Asynchronous tasks:** Celery + Redis
- **Cache strategy:** Redis, django-redis
- **File storage:** AWS S3 (django-storages)
- **Admin panel:** Custom admin classes are used
-->

---

## Mandatory Rules Summary

1. **Avoid hardcoding secrets.** Use environment variable or secret manager instead.
2. **`DEBUG = True` isForbidden in production.** Specify `ALLOWED_HOSTS` explicitly.
3. **Use `path()` instead of `url()`.** Do not use the old regex method.
4. **Use namespace.** Hardcode URL definitions, `{% url %}` or `reverse()` should be used.
5. **CSRF token must be included in every form.** `{% csrf_token %}` should not be skipped.
6. **Disable auto-escape for safe content only.** Only use `|safe` for sanitized content.
7. **Implement `__str__` and Meta definitions.** Every model must have verbose_name, ordering, and `__str__`.
8. **Use `select_related` / `prefetch_related`.** Avoid N+1 query problems.
9. **Choose the correct test class.** Select `SimpleTestCase` for tests that do not require a database.
10. **Use Factory Boy.** Use factory boy instead of manually creating models in tests.

---

# Working Boundary

The following rules must be followed to ensure a consistent and maintainable codebase.

# Invariant Rules

- **API Framework:** Using Django REST Framework
- **Authentication:** JWT (djangorestframework-simplejwt)
- **Asynchronous tasks:** Celery + Redis
- **Cache strategy:** Redis, django-redis
- **File storage:** AWS S3 (django-storages)
- **Admin panel:** Custom admin classes are used

---

# Severity Labels

* CRITICAL: Kritik
* HIGH: Yuksek
* MEDIUM: Orta
* FORBIDDEN: Yasak

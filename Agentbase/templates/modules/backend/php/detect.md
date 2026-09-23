# PHP Backend Family Detection Rules

## Checks

- file_exists: composer.json
- dependency: laravel/framework|codeigniter4/framework
- file_exists: app/|public/|routes/|spark|artisan|bootstrap/

## Minimum Match

2/3

## Variants

| Framework | Detection File | Priority |
|-----------|----------------|---------|
| Laravel | `backend/php/laravel/detect.md` | 1 |
| CodeIgniter 4 | `backend/php/codeigniter4/detect.md` | 2 |

## Activates

- rules/php-backend-rules.skeleton.md

## Affects Core

- task-hunter: Verification convention for `composer`, `phpunit`, or framework test commands is added
- CLAUDE.md: PHP backend shared rules section is added

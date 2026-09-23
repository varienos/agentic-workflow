# ORM Category Detection

This category provides protection mechanisms for database ORM/migration tools.

## Variants

Bootstrap checks the following variants in order. The first match is activated:

| Variant | Detection File | Priority |
|---------|---------------|---------|
| Prisma | `orm/prisma/detect.md` | 1 |
| Eloquent (Laravel) | `orm/eloquent/detect.md` | 2 |
| Django ORM | `orm/django-orm/detect.md` | 3 |
| TypeORM | `orm/typeorm/detect.md` | 4 |

## Provides

- Destructive migration detection (DROP TABLE/COLUMN)
- Dangerous command blocking
- Migration file consistency check
- Migration risk table

## Affects Core

- task-hunter: Migration check is added to VERIFICATION_COMMANDS
- workflow-lifecycle: Migration fail protocol is added
- CLAUDE.md: ORM rules section is added
- settings.json: ORM hook definitions are added

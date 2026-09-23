# Prisma Rules

> These rules apply to projects that use Prisma ORM.
> All developers and agents MUST follow these rules.

---

## Prohibitions

### 🚫 `prisma db push` is FORBIDDEN

The `prisma db push` command is FORBIDDEN under ALL CONDITIONS.

**Why:** It changes the database schema without creating a migration file. This:
- Breaks migration history
- Causes teammates to lose synchronization
- Leads to irreversible problems in production deploys

**Correct alternative:** `npx prisma migrate dev --name <change_description>`

---

## Schema Change Flow

```
edit schema.prisma
        ↓
npx prisma validate
        ↓ (success)
npx prisma migrate dev --name <description>
        ↓
inspect migration.sql
        ↓ (if destructive change exists)
Plan data backup + confirm with user
        ↓
npx prisma generate
        ↓
Update application code
        ↓
Run tests
        ↓
Commit (schema.prisma + migration file TOGETHER)
```

---

## Migration Risk Table

| Operation | Risk | Things to Watch |
|---|---|---|
| ADD COLUMN (nullable) | 🟢 Low | Safe; does not affect existing data |
| ADD COLUMN (required + default) | 🟢 Low | Default value is applied to all rows |
| ADD COLUMN (required, no default) | 🔴 Critical | Existing rows fail; DO NOT DO THIS |
| CREATE TABLE | 🟢 Low | Safe; creates a new table |
| DROP TABLE | 🔴 Critical | DATA LOSS — DO NOT without backup |
| DROP COLUMN | 🟠 High | Column data is lost |
| ALTER COLUMN (type change) | 🟡 Medium | Data truncation/conversion errors possible |
| RENAME COLUMN | 🟡 Medium | Application code must be updated |
| ADD INDEX | 🟢 Low | Safe; performance improvement |
| DROP INDEX | 🟡 Medium | Performance may be affected |
| ADD RELATION | 🟢 Low | Foreign key constraint is added |
| REMOVE RELATION | 🟠 High | Referential integrity is lost |

---

## Mandatory Rules

1. **Schema + Migration are committed TOGETHER.** A `schema.prisma` change cannot be committed without a migration file.
2. **Every migration is named meaningfully.** Like `--name add_user_email_column`, NOT like `--name migration1`.
3. **Migration SQL is inspected.** Read and verify the auto-generated SQL file before committing.
4. **Data backup is REQUIRED for destructive migrations.** Create a backup plan before migrations that contain DROP TABLE/COLUMN.
5. **Do not forget `prisma generate`.** Recreate the client after migration.
6. **Keep seed data up to date.** If a new model was added, update `prisma/seed.ts`.
7. **Make enum changes carefully.** Removing a value from an enum breaks existing database records.

---

<!-- GENERATE: PRISMA_PATH
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: project.structure, project.subprojects
Example output:
## Prisma File Locations

| File | Path |
|---|---|
| Schema | `../Codebase/apps/api/prisma/schema.prisma` |
| Migrations | `../Codebase/apps/api/prisma/migrations/` |
| Seed | `../Codebase/apps/api/prisma/seed.ts` |
| Client import | `import { PrismaClient } from '@prisma/client'` |
| Service | `../Codebase/apps/api/src/prisma/prisma.service.ts` |
-->

<!-- GENERATE: MIGRATION_COMMANDS
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: project.structure, project.scripts, project.subprojects
Example output:
## Migration Commands

Full commands to use for this project:

| Operation | Command |
|---|---|
| Schema validation | `cd ../Codebase/apps/api && npx prisma validate` |
| Create migration | `cd ../Codebase/apps/api && npx prisma migrate dev --name <description>` |
| Migration status | `cd ../Codebase/apps/api && npx prisma migrate status` |
| Generate client | `cd ../Codebase/apps/api && npx prisma generate` |
| Reset DB (DEV) | `cd ../Codebase/apps/api && npx prisma migrate reset` |
| Run seed | `cd ../Codebase/apps/api && npx prisma db seed` |
| Open Studio | `cd ../Codebase/apps/api && npx prisma studio` |

> **WARNING:** `migrate reset` is used ONLY in the development environment. NEVER in production.
-->

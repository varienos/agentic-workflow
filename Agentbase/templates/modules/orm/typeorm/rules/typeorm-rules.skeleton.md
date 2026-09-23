# TypeORM Migration Rules

> These rules apply to projects that use TypeORM.
> All developers and agents MUST follow these rules.

---

## Prohibitions

### `synchronize: true` is FORBIDDEN (Production)

The `synchronize: true` setting in the TypeORM config file is FORBIDDEN in production.

**Why:** On every application start it automatically reflects entity changes to the DB. This:
- Changes the schema without migration history
- Can cause data loss (column drop, type change)
- Breaks synchronization with other environments

**Correct setting:**
```typescript
// data-source.ts
synchronize: false, // ALWAYS false
migrationsRun: true, // Automatic migration run (optional)
```

### `typeorm schema:sync` is FORBIDDEN

Updates the DB schema to match entities without a migration file.

**Why:** Same danger as `prisma db push` — does not create migration history.

**Correct alternative:** `npx typeorm migration:generate -- -n <MigrationName>`

### `typeorm schema:drop` is FORBIDDEN

Deletes all tables in the database.

**Why:** Irreversible data loss.

---

## Forbidden Commands Table

| Command | Why | Alternative |
|-------|-------|------------|
| `typeorm schema:sync` | Updates DB without migration | `typeorm migration:generate` |
| `typeorm schema:drop` | Deletes all tables | Do not use |
| `synchronize: true` | Automatic schema sync | `synchronize: false` + migration |

---

## Migration Creation Flow

```
Edit entity file
        |
npx typeorm migration:generate -- -n <MigrationName>
        |
Inspect generated migration file (up + down methods)
        |
npx typeorm migration:run
        |
If destructive change exists:
        | (if destructive change exists)
Plan data backup + confirm with user
        |
Update application code
        |
Run tests
        |
Commit (entity + migration file TOGETHER)
```

**NEVER** change an entity file and leave it without creating a migration.

---

## Migration Risk Table

| Change | Risk | Action |
|-----------|------|---------|
| New entity (table) | Low | Normal flow |
| New nullable column | Low | Normal flow |
| New NOT NULL column (with default) | Medium | Check existing data |
| `dropColumn` (inside migration) | Critical | Notify the user |
| `dropTable` (inside migration) | Critical | NEVER do automatically |
| `renameColumn` | High | Data loss risk; all references must be updated |
| `renameTable` | High | All references must be updated |
| Column type change | Medium | Data truncation risk |
| `dropIndex` | Medium | Performance may be affected |
| `dropForeignKey` | Medium | Referential integrity is lost |
| `addUniqueConstraint` | Medium | Verify uniqueness of existing data |

---

## Data Source Configuration

```typescript
// data-source.ts — correct configuration
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres', // or mysql, sqlite, etc.
  // ... connection settings

  synchronize: false,     // FORBIDDEN: setting true
  migrationsRun: false,   // may be true in CI/CD pipeline
  logging: true,          // Show SQL logs in development

  entities: ['src/entity/**/*.ts'],
  migrations: ['src/migrations/**/*.ts'],
  subscribers: ['src/subscriber/**/*.ts'],
});
```

---

## Migration File Structure

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailToUsers1234567890 implements MigrationInterface {
  name = 'AddEmailToUsers1234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "email" varchar(255)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email"`);
  }
}
```

**Rules:**
- `up()` and `down()` methods are ALWAYS implemented.
- `down()` must fully reverse the `up()` operation.
- Migration names must be descriptive (class name + timestamp).

---

## Mandatory Rules

1. **`synchronize: false` is REQUIRED.** Never use `synchronize: true` in production config.
2. **Entity + Migration are committed TOGETHER.** An entity change cannot be committed without a migration file.
3. **Every migration implements a `down()` method.** Required for rollback scenarios.
4. **Migration SQL is inspected.** Do not blindly commit `migration:generate` output.
5. **Data backup is REQUIRED for destructive migrations.** Create a backup plan before migrations that contain `dropColumn` or `dropTable`.
6. **Migration files are not edited by hand** (except when required). Re-run `migration:generate`.
7. **`schema:sync` is NEVER used.** Use migrations even in development.

---

<!-- GENERATE: MIGRATION_COMMANDS
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: subprojects[].path, project.package_manager
Example output:
## Migration Commands

Full commands to use for this project:

| Operation | Command |
|---|---|
| Create migration | `cd ../Codebase && npx typeorm migration:generate -- -n <MigrationName>` |
| Run migration | `cd ../Codebase && npx typeorm migration:run` |
| Revert migration | `cd ../Codebase && npx typeorm migration:revert` |
| Show migrations | `cd ../Codebase && npx typeorm migration:show` |
| Create empty migration | `cd ../Codebase && npx typeorm migration:create -- -n <MigrationName>` |

> **WARNING:** `schema:sync` and `schema:drop` are NEVER used. `synchronize: true` is FORBIDDEN.
-->

<!-- GENERATE: TYPEORM_PATHS
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: project.structure, project.subprojects
Example output:
## TypeORM File Locations

| File | Path |
|---|---|
| Data Source | `../Codebase/src/data-source.ts` |
| Entities | `../Codebase/src/entity/` |
| Migrations | `../Codebase/src/migrations/` |
| Subscribers | `../Codebase/src/subscriber/` |
-->

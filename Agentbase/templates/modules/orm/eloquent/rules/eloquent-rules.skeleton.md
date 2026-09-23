# Eloquent Migration Rules

> These rules apply to projects that use Laravel Eloquent ORM.
> All developers and agents MUST follow these rules.

---

## Prohibitions

### `artisan migrate:fresh` is FORBIDDEN

Deletes all tables and runs migrations from scratch.

**Why:** Irreversibly deletes all data in the production database.

**Correct alternative:** `php artisan migrate`

### `artisan migrate:reset` is FORBIDDEN

Rolls back all migrations.

**Why:** All tables are deleted; data loss occurs.

**Correct alternative:** `php artisan migrate:rollback` (rolls back a single batch)

### `artisan db:wipe` is FORBIDDEN

Deletes all tables, views, and types.

**Why:** Irreversibly destroys everything in the database.

---

## Forbidden Commands Table

| Command | Why | Alternative |
|-------|-------|------------|
| `artisan migrate:fresh` | Deletes all tables and recreates from scratch | `artisan migrate` |
| `artisan migrate:reset` | Rolls back all migrations | `artisan migrate:rollback` |
| `artisan db:wipe` | Deletes all DB objects | Do not use |

---

## Migration Creation Flow

```
Plan schema change
        |
php artisan make:migration {descriptive_name}
        |
Edit migration file (up + down methods)
        |
php artisan migrate
        |
Inspect migration file (if destructive change exists)
        | (if destructive change exists)
Plan data backup + confirm with user
        |
Update application code (Model, Controller, etc.)
        |
Run tests
        |
Commit (migration file + model changes TOGETHER)
```

**NEVER** change a model file and leave it without creating a migration.

---

## Migration Risk Table

| Change | Risk | Action |
|-----------|------|---------|
| New table (`Schema::create`) | Low | Normal flow |
| New nullable column (`$table->string()->nullable()`) | Low | Normal flow |
| New NOT NULL column (with default) | Medium | Check existing data |
| `$table->dropColumn()` | Critical | Notify the user |
| `Schema::drop()` / `Schema::dropIfExists()` | Critical | NEVER do automatically |
| `$table->renameColumn()` | High | Data loss risk; update model and controller |
| `Schema::rename()` (table name) | High | All references must be updated |
| `$table->dropForeign()` | Medium | Referential integrity is lost |
| `$table->dropIndex()` | Medium | Performance may be affected |
| `$table->dropPrimary()` | High | Fundamentally affects table structure |
| Column type change (`$table->string()->change()`) | Medium | Data truncation risk |

---

## Mandatory Rules

1. **Migration names must be descriptive.** Like `create_users_table`, `add_email_to_orders_table`. NOT like `migration_1`.
2. **Every migration implements a `down()` method.** Always implement `down()` for rollback scenarios.
3. **Inspect the migration file before committing.** Even auto-generated migrations must be read and verified.
4. **Data backup is REQUIRED for destructive migrations.** Create a backup plan before migrations that contain `dropColumn` or `dropTable`.
5. **Model changes are committed TOGETHER with the migration.** `$fillable`, `$casts`, and relations must stay compatible with the migration.
6. **Keep seeder data up to date.** If a new table was added, update `DatabaseSeeder`.
7. **Foreign key constraints are created in the correct order.** The referenced table must be created first.

---

## Migration Naming Rules

| Operation | Example Name |
|-------|-----------|
| Create table | `create_users_table` |
| Add column | `add_email_to_users_table` |
| Drop column | `drop_phone_from_users_table` |
| Add index | `add_index_to_users_email` |
| Table relation | `create_order_items_table` |
| Change column | `change_status_type_in_orders_table` |

---

<!-- GENERATE: MIGRATION_COMMANDS
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: subprojects[].path
Example output:
## Migration Commands

Full commands to use for this project:

| Operation | Command |
|---|---|
| Create migration | `cd ../Codebase && php artisan make:migration {description}` |
| Run migration | `cd ../Codebase && php artisan migrate` |
| Migration status | `cd ../Codebase && php artisan migrate:status` |
| Roll back one batch | `cd ../Codebase && php artisan migrate:rollback` |
| Run seed | `cd ../Codebase && php artisan db:seed` |
| Create model | `cd ../Codebase && php artisan make:model {Model} -m` |

> **WARNING:** `migrate:fresh` and `migrate:reset` are used ONLY on temporary test databases. NEVER in production.
-->

<!-- GENERATE: LARAVEL_PATHS
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: project.structure, project.subprojects
Example output:
## Laravel File Locations

| File | Path |
|---|---|
| Migrations | `../Codebase/database/migrations/` |
| Models | `../Codebase/app/Models/` |
| Seeders | `../Codebase/database/seeders/` |
| Factories | `../Codebase/database/factories/` |
| Config | `../Codebase/config/database.php` |
-->

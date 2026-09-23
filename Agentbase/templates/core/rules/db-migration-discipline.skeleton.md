# DB Migration Discipline

This rule applies in every project to reduce data-loss risk on database schema changes. The file is generated even when no ORM module is active; without an ORM, use the raw SQL discipline.

<!-- GENERATE: DETECTED_ORM
Description: Detected ORM/database info and fallback behavior.
-->

## Mandatory Four Steps

1. **Create a migration file.** A schema/model change is not complete without a migration file.
2. **Prepare reversible up + down.** Write a forward and a reverse path for every change. If the ORM has no down mechanism, keep a matching `down.sql` file.
3. **Run dry-run / preview.** Inspect the generated SQL or migration plan before applying to production or a shared environment.
4. **Scan for destructive flags.** If a destructive pattern exists, notify the user before applying and record a data backup and rollback plan.

## Destructive Pattern List

- `DROP TABLE`
- `DROP COLUMN`
- Prisma `RemoveField`
- Prisma `DeleteModel`
- `ALTER COLUMN` type change
- `RENAME COLUMN`
- Moving a `NULL` field to `NOT NULL` without cleaning existing data
- Deleting or renaming an enum value
- Removing a foreign key relation
- Dropping an index/constraint when a production query path is affected

## Migration Commands

<!-- GENERATE: MIGRATION_COMMANDS
Description: Migration commands for the ORM or raw SQL fallback.
-->

## Dry-run / Preview

<!-- GENERATE: DRY_RUN_COMMAND
Description: Dry-run/preview command for the ORM or raw SQL fallback.
-->

## Rollback / Down

<!-- GENERATE: ROLLBACK_COMMAND
Description: Rollback/down command for the ORM or raw SQL fallback.
-->

## Application Rules

- A schema, model, entity, or raw SQL change lands in the same commit as its migration file.
- In Knex, Sequelize, Supabase, or raw SQL projects, `up` and `down` files are written together.
- If a destructive flag is detected, do not apply the migration alone; write backup, dry-run, and rollback evidence into the task notes.
- If the rollback command is unclear, the task is not complete. State the ambiguity clearly to the user and in the Backlog final summary.

## Manifest Input Fields

- `manifest.detected.orm.value`
- `manifest.detected.orm.confidence`
- `project.detected.database`
- `project.structure`
- `project.scripts`

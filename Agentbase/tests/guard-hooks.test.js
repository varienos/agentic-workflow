'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  createTempProject,
  makeCommandInput,
  makeHookInput,
  materializeHook,
  runHook,
  writeCodebaseFile,
} = require('./helpers/hook-runner.js');

describe('eloquent and framework guard hooks', () => {
  it('artisan-migrate-guard blocks migrate:fresh', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/orm/eloquent/hooks/artisan-migrate-guard.js');

    const result = runHook(hookPath, makeCommandInput('php artisan migrate:fresh'));

    assert.equal(JSON.parse(result.stdout).decision, 'block');
  });

  it('artisan-migrate-guard ignores safe migrate commands', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/orm/eloquent/hooks/artisan-migrate-guard.js');

    const result = runHook(hookPath, makeCommandInput('php artisan migrate'));

    assert.equal(result.stdout, '');
  });

  it('eloquent-migration-check reports destructive migration edits', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/orm/eloquent/hooks/eloquent-migration-check.js');
    const filePath = writeCodebaseFile(
      projectRoot,
      'database/migrations/2026_03_22_123456_drop_users_table.php',
      "<?php\nSchema::dropIfExists('users');\n"
    );

    const result = runHook(hookPath, makeHookInput(filePath));
    const systemMessage = JSON.parse(result.stdout).systemMessage;

    assert.match(systemMessage, /DESTRUCTIVE MIGRATION/);
    assert.match(systemMessage, /Schema::dropIfExists/);
  });

  it('eloquent-migration-check still reminds on safe migrations', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/orm/eloquent/hooks/eloquent-migration-check.js');
    const filePath = writeCodebaseFile(
      projectRoot,
      'database/migrations/2026_03_22_123456_create_users_table.php',
      "<?php\nSchema::create('users', function ($table) {});\n"
    );

    const result = runHook(hookPath, makeHookInput(filePath));
    const systemMessage = JSON.parse(result.stdout).systemMessage;

    assert.doesNotMatch(systemMessage, /DESTRUCTIVE MIGRATION/);
    assert.match(systemMessage, /php artisan migrate/);
  });

  it('manage-py-guard blocks flush', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/orm/django-orm/hooks/manage-py-guard.js');

    const result = runHook(hookPath, makeCommandInput('python manage.py flush'));

    assert.equal(JSON.parse(result.stdout).decision, 'block');
  });

  it('manage-py-guard ignores safe commands', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/orm/django-orm/hooks/manage-py-guard.js');

    const result = runHook(hookPath, makeCommandInput('python manage.py check'));

    assert.equal(result.stdout, '');
  });

  it('typeorm-sync-guard blocks schema:sync', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/orm/typeorm/hooks/typeorm-sync-guard.js');

    const result = runHook(hookPath, makeCommandInput('npx typeorm schema:sync'));

    assert.equal(JSON.parse(result.stdout).decision, 'block');
  });

  it('typeorm-sync-guard ignores migration:run', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/orm/typeorm/hooks/typeorm-sync-guard.js');

    const result = runHook(hookPath, makeCommandInput('npx typeorm migration:run'));

    assert.equal(result.stdout, '');
  });

  it('artisan-guard warns for tinker', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/backend/php/laravel/hooks/artisan-guard.js');

    const result = runHook(hookPath, makeCommandInput('php artisan tinker'));

    assert.match(JSON.parse(result.stdout).systemMessage, /artisan tinker/);
  });

  it('artisan-guard ignores unrelated artisan commands', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/backend/php/laravel/hooks/artisan-guard.js');

    const result = runHook(hookPath, makeCommandInput('php artisan test'));

    assert.equal(result.stdout, '');
  });

  it('spark-guard blocks migrate:refresh', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/backend/php/codeigniter4/hooks/spark-guard.js');

    const result = runHook(hookPath, makeCommandInput('php spark migrate:refresh'));

    assert.equal(JSON.parse(result.stdout).decision, 'block');
  });

  it('spark-guard ignores plain migrate', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/backend/php/codeigniter4/hooks/spark-guard.js');

    const result = runHook(hookPath, makeCommandInput('php spark migrate'));

    assert.equal(result.stdout, '');
  });

  it('django-guard blocks flush', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/backend/python/django/hooks/django-guard.js');

    const result = runHook(hookPath, makeCommandInput('python manage.py flush'));

    assert.equal(JSON.parse(result.stdout).decision, 'block');
  });

  it('django-guard ignores safe manage.py commands', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/backend/python/django/hooks/django-guard.js');

    const result = runHook(hookPath, makeCommandInput('python manage.py test'));

    assert.equal(result.stdout, '');
  });
});

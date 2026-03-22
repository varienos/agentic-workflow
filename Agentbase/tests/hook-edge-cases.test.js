'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  createTempProject,
  makeHookInput,
  materializeHook,
  runHook,
} = require('./helpers/hook-runner.js');

const HOOKS = [
  'core/hooks/code-review-check.skeleton.js',
  'core/hooks/test-enforcer.skeleton.js',
  'modules/api-docs/openapi/hooks/openapi-sync-check.skeleton.js',
  'modules/monorepo/hooks/auto-format.skeleton.js',
  'modules/orm/prisma/hooks/prisma-db-push-guard.js',
  'modules/orm/prisma/hooks/prisma-migration-check.js',
  'modules/orm/prisma/hooks/destructive-migration-check.js',
  'modules/orm/eloquent/hooks/artisan-migrate-guard.js',
  'modules/orm/eloquent/hooks/eloquent-migration-check.js',
  'modules/orm/django-orm/hooks/manage-py-guard.js',
  'modules/orm/typeorm/hooks/typeorm-sync-guard.js',
  'modules/backend/php/laravel/hooks/artisan-guard.js',
  'modules/backend/php/codeigniter4/hooks/spark-guard.js',
  'modules/backend/python/django/hooks/django-guard.js',
];

describe('hook edge cases', () => {
  it('does not crash on empty stdin, malformed JSON, or missing tool input fields', t => {
    const projectRoot = createTempProject(t);

    for (const hookTemplate of HOOKS) {
      const hookPath = materializeHook(projectRoot, hookTemplate, {
        arrayReplacements: hookTemplate.includes('openapi-sync-check')
          ? [
              { name: 'ROUTE_PATTERNS', elements: ['/controllers\\//'] },
              { name: 'SPEC_PATHS', elements: ["'docs/openapi.yaml'"] },
            ]
          : undefined,
      });

      const emptyResult = runHook(hookPath, '');
      const malformedResult = runHook(hookPath, '{not json');
      const emptyObjectResult = runHook(hookPath, '{}');
      const emptyToolInputResult = runHook(hookPath, '{"tool_input":{}}');

      assert.equal(emptyResult.status, 0, hookTemplate);
      assert.equal(malformedResult.status, 0, hookTemplate);
      assert.equal(emptyObjectResult.status, 0, hookTemplate);
      assert.equal(emptyToolInputResult.status, 0, hookTemplate);
      assert.equal(emptyResult.signal, null, hookTemplate);
      assert.equal(malformedResult.signal, null, hookTemplate);
      assert.equal(emptyObjectResult.signal, null, hookTemplate);
      assert.equal(emptyToolInputResult.signal, null, hookTemplate);
    }
  });

  it('does not crash on very long unicode file paths', t => {
    const projectRoot = createTempProject(t);
    const longPath = `/tmp/${'a'.repeat(1100)}-dosya-istanbul-unicode-çğüşöı.js`;

    for (const hookTemplate of HOOKS.filter(item => !item.includes('guard.js') || item.includes('artisan-guard'))) {
      const hookPath = materializeHook(projectRoot, hookTemplate, {
        arrayReplacements: hookTemplate.includes('openapi-sync-check')
          ? [
              { name: 'ROUTE_PATTERNS', elements: ['/controllers\\//'] },
              { name: 'SPEC_PATHS', elements: ["'docs/openapi.yaml'"] },
            ]
          : undefined,
      });

      const result = runHook(hookPath, makeHookInput(longPath));
      assert.equal(result.status, 0, hookTemplate);
    }
  });
});

'use strict';

const fs = require('fs');
const path = require('path');
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
const { loadModuleExports } = require('./helpers/module-loader.js');

describe('prisma-db-push-guard hook', () => {
  it('blocks prisma db push commands', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/orm/prisma/hooks/prisma-db-push-guard.js');

    const result = runHook(hookPath, makeCommandInput('npx prisma db push'));

    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout), {
      decision: 'block',
      reason: "prisma db push YASAK. Migration dosyasi olmadan DB'yi degistirir. Dogru komut: npx prisma migrate dev --name {aciklama}",
    });
  });

  it('stays silent for migration-based prisma commands', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/orm/prisma/hooks/prisma-db-push-guard.js');

    const result = runHook(hookPath, makeCommandInput('npx prisma migrate dev --name init'));

    assert.equal(result.stdout, '');
  });
});

describe('prisma-migration-check hook', () => {
  it('warns when edited content references prisma db push', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/orm/prisma/hooks/prisma-migration-check.js');
    const filePath = writeCodebaseFile(
      projectRoot,
      'apps/api/src/schema-notes.ts',
      'Run prisma db push later\n'
    );

    const result = runHook(hookPath, makeHookInput(filePath));

    assert.match(JSON.parse(result.stdout).systemMessage, /prisma db push/);
  });

  it('reports schema validation success and pending migration status', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/orm/prisma/hooks/prisma-migration-check.js');
    const binDir = path.join(projectRoot, 'bin');
    const schemaPath = writeCodebaseFile(
      projectRoot,
      'apps/api/prisma/schema.prisma',
      'datasource db { provider = "postgresql" url = "postgres://localhost/test" }\n'
    );

    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(
      path.join(binDir, 'npx'),
      [
        '#!/bin/sh',
        'if [ "$1" = "prisma" ] && [ "$2" = "validate" ]; then',
        '  exit 0',
        'fi',
        'if [ "$1" = "prisma" ] && [ "$2" = "migrate" ] && [ "$3" = "status" ]; then',
        '  printf "database schema is not in sync\\n"',
        '  exit 0',
        'fi',
        'exit 1',
        '',
      ].join('\n'),
      'utf8'
    );
    fs.chmodSync(path.join(binDir, 'npx'), 0o755);

    const result = runHook(hookPath, makeHookInput(schemaPath), {
      env: {
        PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
      },
    });
    const systemMessage = JSON.parse(result.stdout).systemMessage;

    assert.match(systemMessage, /Prisma schema validasyonu basarili/);
    assert.match(systemMessage, /migration olusturulmamis/);
  });
});

describe('destructive-migration-check hook', () => {
  it('reports destructive SQL in the latest prisma migration', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/orm/prisma/hooks/destructive-migration-check.js');

    writeCodebaseFile(
      projectRoot,
      'apps/api/prisma/migrations/20260322120000_drop_users/migration.sql',
      'DROP TABLE "users";\nALTER COLUMN "email" TYPE TEXT;\n'
    );

    const result = runHook(hookPath, makeCommandInput('npx prisma migrate dev --name drop-users'));
    const systemMessage = JSON.parse(result.stdout).systemMessage;

    assert.match(systemMessage, /YIKICI MIGRATION/);
    assert.match(systemMessage, /DROP TABLE/);
    assert.match(systemMessage, /ALTER COLUMN/);
  });

  it('returns no message when the latest migration is safe', t => {
    const projectRoot = createTempProject(t);
    const hookPath = materializeHook(projectRoot, 'modules/orm/prisma/hooks/destructive-migration-check.js');

    writeCodebaseFile(
      projectRoot,
      'apps/api/prisma/migrations/20260322120000_add_index/migration.sql',
      'CREATE INDEX "users_email_idx" ON "users"("email");\n'
    );

    const result = runHook(hookPath, makeCommandInput('npx prisma migrate dev --name add-index'));

    assert.equal(result.stdout, '');
  });

  it('counts repeated destructive statements in scan results', () => {
    const hookPath = path.join(
      __dirname,
      '..',
      'templates',
      'modules',
      'orm',
      'prisma',
      'hooks',
      'destructive-migration-check.js'
    );
    const { scanForDestructiveChanges } = loadModuleExports(hookPath, {
      exports: ['scanForDestructiveChanges'],
    });

    const findings = scanForDestructiveChanges('DROP TABLE users;\nDROP TABLE posts;\n');
    const dropTable = findings.find(item => item.label === 'DROP TABLE');

    assert.equal(dropTable.count, 2);
  });

  it('art arda eslesen satirlarin hepsi ornek listesinde gorunuyor', () => {
    const hookPath = path.join(
      __dirname,
      '..',
      'templates',
      'modules',
      'orm',
      'prisma',
      'hooks',
      'destructive-migration-check.js'
    );
    const { scanForDestructiveChanges } = loadModuleExports(hookPath, {
      exports: ['scanForDestructiveChanges'],
    });

    const sql = [
      'DROP TABLE "users";',
      'DROP TABLE "posts";',
      'DROP TABLE "comments";',
      'DROP TABLE "likes";',
    ].join('\n');

    const findings = scanForDestructiveChanges(sql);
    const dropTable = findings.find(item => item.label === 'DROP TABLE');

    assert.equal(dropTable.count, 4, 'count 4 olmali');
    assert.equal(dropTable.lines.length, 4, 'tum eslesen satirlar listelenmeli');
    assert.ok(dropTable.lines.some(l => l.line.includes('users')), 'users satiri olmali');
    assert.ok(dropTable.lines.some(l => l.line.includes('posts')), 'posts satiri olmali');
    assert.ok(dropTable.lines.some(l => l.line.includes('comments')), 'comments satiri olmali');
    assert.ok(dropTable.lines.some(l => l.line.includes('likes')), 'likes satiri olmali');
  });
});

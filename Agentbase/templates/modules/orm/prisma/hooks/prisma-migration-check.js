#!/usr/bin/env node

/**
 * prisma-migration-check.js
 * PostToolUse (Edit|Write) hook
 *
 * When the schema.prisma file is edited:
 * 1. `npx prisma validate` runs
 * 2. Checks migration status
 * 3. Warns if the file contains the text `prisma db push` (second-layer defense)
 */

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const { readStdin, resolveCodebaseRoot } = require(path.join(__dirname, 'shared-hook-utils.js'));

const CODEBASE_ROOT = resolveCodebaseRoot(__dirname, '../Codebase');

/**
 * Searches for prisma/schema.prisma inside Codebase.
 * Searches both in the root directory and in subdirectories.
 */
function findPrismaDir() {
  // Direct root
  const rootPrisma = path.join(CODEBASE_ROOT, 'prisma');
  if (fs.existsSync(path.join(rootPrisma, 'schema.prisma'))) {
    return rootPrisma;
  }

  // Search subdirectories (apps/*, packages/*, src/*)
  const searchDirs = ['apps', 'packages', 'src', '.'];
  for (const dir of searchDirs) {
    const base = path.join(CODEBASE_ROOT, dir);
    if (!fs.existsSync(base) || !fs.statSync(base).isDirectory()) continue;

    const entries = fs.readdirSync(base, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const candidate = path.join(base, entry.name, 'prisma', 'schema.prisma');
      if (fs.existsSync(candidate)) {
        return path.join(base, entry.name, 'prisma');
      }
    }
  }

  return null;
}

function runPrismaValidate(prismaDir) {
  try {
    const schemaPath = path.join(prismaDir, 'schema.prisma');
    execFileSync('npx', ['prisma', 'validate', '--schema', schemaPath], {
      cwd: CODEBASE_ROOT,
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { valid: true, error: null };
  } catch (e) {
    return { valid: false, error: e.stderr?.toString() || e.message };
  }
}

function checkMigrationStatus(prismaDir) {
  try {
    const schemaPath = path.join(prismaDir, 'schema.prisma');
    const result = execFileSync('npx', ['prisma', 'migrate', 'status', '--schema', schemaPath], {
      cwd: CODEBASE_ROOT,
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const output = result.toString();
    const hasPending = /following migration.*have not yet been applied/i.test(output)
      || /database schema is not in sync/i.test(output);
    return { synced: !hasPending, output };
  } catch (e) {
    // migrate status may error in some cases (no DB connection, etc.)
    return { synced: null, output: e.stderr?.toString() || e.message };
  }
}

function checkFileForDbPush(filePath) {
  try {
    if (!fs.existsSync(filePath)) return false;
    const content = fs.readFileSync(filePath, 'utf8');
    return /prisma\s+db\s+push/i.test(content);
  } catch {
    return false;
  }
}

async function main() {
  try {
    const input = await readStdin();
    const parsed = JSON.parse(input);

    const filePath = parsed?.tool_input?.file_path || parsed?.tool_input?.path || '';

    // Check whether schema.prisma was edited
    const isSchemaEdit = filePath.endsWith('schema.prisma');

    // Does the file contain prisma db push text? (second-layer defense)
    const hasDbPushText = checkFileForDbPush(filePath);

    const messages = [];

    if (hasDbPushText) {
      messages.push(
        '⛔ WARNING: The `prisma db push` command was detected in this file. ' +
        '`prisma db push` is FORBIDDEN. Use `npx prisma migrate dev --name <description>` instead.'
      );
    }

    if (isSchemaEdit) {
      const prismaDir = findPrismaDir();
      if (!prismaDir) {
        messages.push('⚠️ Prisma directory not found. Check the location of the schema.prisma file.');
      } else {
        // 1. Validate
        const validation = runPrismaValidate(prismaDir);
        if (!validation.valid) {
          messages.push(
            '❌ PRISMA VALIDATE ERROR:\n' +
            'There is an error in the schema file. It must be fixed before continuing.\n\n' +
            '```\n' + (validation.error || 'Unknown error') + '\n```'
          );
        } else {
          messages.push('✅ Prisma schema validation succeeded.');
        }

        // 2. Migration status
        const migration = checkMigrationStatus(prismaDir);
        if (migration.synced === false) {
          messages.push(
            '⚠️ MIGRATION WARNING:\n' +
            'A schema change was made but no migration was created.\n' +
            'Do not forget to run the following command:\n\n' +
            '```\nnpx prisma migrate dev --name <change_description>\n```'
          );
        } else if (migration.synced === true) {
          messages.push('✅ Migration status is in sync.');
        }
        // if synced === null there is no DB connection; skip silently
      }
    }

    if (messages.length > 0) {
      const result = {
        systemMessage: '🔍 **Prisma Migration Check**\n\n' + messages.join('\n\n')
      };
      process.stdout.write(JSON.stringify(result));
    }
  } catch (e) {
    // Hook errors are swallowed silently
  }
}

if (require.main === module) main();

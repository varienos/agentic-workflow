#!/usr/bin/env node

/**
 * prisma-migration-check.js
 * PostToolUse (Edit|Write) hook
 *
 * schema.prisma dosyasi duzenlendiginde:
 * 1. `npx prisma validate` calistirir
 * 2. Migration durumunu kontrol eder
 * 3. Dosya icinde `prisma db push` metni varsa uyari verir (ikinci katman savunma)
 */

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const CODEBASE_ROOT = path.resolve(__dirname, '../../../Codebase');

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

/**
 * Codebase icinde prisma/schema.prisma dosyasini arar.
 * Hem kok dizinde hem alt dizinlerde arar.
 */
function findPrismaDir() {
  // Direkt kok
  const rootPrisma = path.join(CODEBASE_ROOT, 'prisma');
  if (fs.existsSync(path.join(rootPrisma, 'schema.prisma'))) {
    return rootPrisma;
  }

  // Alt dizinlerde ara (apps/*, packages/*, src/*)
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
    // migrate status bazi durumlarda hata donebilir (DB baglantisi yok vs.)
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

    // schema.prisma duzenlenip duzenlenmedigini kontrol et
    const isSchemaEdit = filePath.endsWith('schema.prisma');

    // Dosya icinde prisma db push metni var mi? (ikinci katman savunma)
    const hasDbPushText = checkFileForDbPush(filePath);

    const messages = [];

    if (hasDbPushText) {
      messages.push(
        '⛔ UYARI: Bu dosyada `prisma db push` komutu tespit edildi. ' +
        '`prisma db push` YASAKTIR. Bunun yerine `npx prisma migrate dev --name <aciklama>` kullanilmalidir.'
      );
    }

    if (isSchemaEdit) {
      const prismaDir = findPrismaDir();
      if (!prismaDir) {
        messages.push('⚠️ Prisma dizini bulunamadi. schema.prisma dosyasinin konumunu kontrol edin.');
      } else {
        // 1. Validate
        const validation = runPrismaValidate(prismaDir);
        if (!validation.valid) {
          messages.push(
            '❌ PRISMA VALIDATE HATASI:\n' +
            'Schema dosyasinda hata var. Devam etmeden once duzeltilmeli.\n\n' +
            '```\n' + (validation.error || 'Bilinmeyen hata') + '\n```'
          );
        } else {
          messages.push('✅ Prisma schema validasyonu basarili.');
        }

        // 2. Migration durumu
        const migration = checkMigrationStatus(prismaDir);
        if (migration.synced === false) {
          messages.push(
            '⚠️ MIGRATION UYARISI:\n' +
            'Schema degisikligi yapildi ancak migration olusturulmamis.\n' +
            'Asagidaki komutu calistirmayi unutmayin:\n\n' +
            '```\nnpx prisma migrate dev --name <degisiklik_aciklamasi>\n```'
          );
        } else if (migration.synced === true) {
          messages.push('✅ Migration durumu senkron.');
        }
        // synced === null ise DB baglantisi yok, sessizce gec
      }
    }

    if (messages.length > 0) {
      const result = {
        systemMessage: '🔍 **Prisma Migration Kontrolu**\n\n' + messages.join('\n\n')
      };
      process.stdout.write(JSON.stringify(result));
    }
  } catch (e) {
    // Hook hatalari sessizce yutulur
  }
}

main();

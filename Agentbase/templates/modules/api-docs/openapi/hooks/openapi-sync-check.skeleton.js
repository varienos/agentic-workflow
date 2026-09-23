#!/usr/bin/env node

/**
 * openapi-sync-check.skeleton.js
 * PostToolUse (Edit|Write) hook
 *
 * After a route/controller file is edited, checks whether the OpenAPI spec file
 * is up to date. If the route file changed
 * and the spec file is older, writes a reminder message to stderr.
 *
 * GENERATE sections are filled by Bootstrap.
 */

const path = require('path');
const fs = require('fs');
const { resolveCodebaseRoot } = require(path.join(__dirname, 'shared-hook-utils.js'));

// Target root: env (AGENTIC_CODEBASE_DIR) > manifest fallback. Resolved with realpath for symlinks.
const CODEBASE_ROOT = resolveCodebaseRoot(__dirname, '../Codebase');

// ─── GENERATE SECTION START ───

/* GENERATE: ROUTE_PATTERNS
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: project.structure, stack.primary, stack.framework
Example output: */
const ROUTE_PATTERNS = [
  // /controllers\//,
  // /routes\//,
  // /\.controller\.(ts|js)$/,
  // /\.routes?\.(ts|js)$/,
  // /views\.py$/,
  // /urls\.py$/,
];
/* END GENERATE */

/* GENERATE: SPEC_PATHS
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: project.structure, project.api_docs
Example output: */
const SPEC_PATHS = [
  // 'openapi.yaml',
  // 'docs/openapi.yaml',
  // 'swagger.json',
];
/* END GENERATE */

// ─── GENERATE SECTION END ───

/**
 * Checks whether the file is a route/controller file.
 */
function isRouteFile(filePath) {
  const relativePath = path.relative(CODEBASE_ROOT, filePath);

  for (const pattern of ROUTE_PATTERNS) {
    if (pattern.test(relativePath)) {
      return true;
    }
  }

  return false;
}

/**
 * Returns the mtime of the spec file.
 * Returns null if the file is not found.
 */
function getSpecMtime(specRelPath) {
  const fullPath = path.join(CODEBASE_ROOT, specRelPath);

  if (fs.existsSync(fullPath)) {
    return fs.statSync(fullPath).mtime;
  }

  return null;
}

/**
 * Returns the mtime of the route file.
 */
function getFileMtime(filePath) {
  if (fs.existsSync(filePath)) {
    return fs.statSync(filePath).mtime;
  }

  return null;
}

/**
 * Checks whether the spec file is older than the route file.
 * Warns if any spec file is older than the route.
 */
function checkSpecStaleness(routeFilePath) {
  const routeMtime = getFileMtime(routeFilePath);
  if (!routeMtime) return;

  const staleSpecs = [];

  for (const specRelPath of SPEC_PATHS) {
    const specMtime = getSpecMtime(specRelPath);

    if (specMtime === null) {
      // Spec file not found — this may also be a problem
      staleSpecs.push(`${specRelPath} (file not found)`);
    } else if (specMtime < routeMtime) {
      // Spec file is older than the route file
      staleSpecs.push(specRelPath);
    }
  }

  if (staleSpecs.length > 0) {
    const relativePath = path.relative(CODEBASE_ROOT, routeFilePath);
    process.stderr.write(
      `\n⚠️  OpenAPI Spec Reminder: "${relativePath}" file was changed.\n` +
      `   The following spec files may be out of date:\n` +
      staleSpecs.map(s => `   - ${s}`).join('\n') + '\n' +
      `   Please update the API spec file according to the endpoint changes.\n\n`
    );
  }
}

/**
 * stdin'den veri okur.
 */
async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
  });
}

async function main() {
  try {
    const input = await readStdin();

    // Write original input to stdout (non-blocking, do not block the pipeline)
    process.stdout.write(input);

    const parsed = JSON.parse(input);
    const filePath = parsed?.tool_input?.file_path || parsed?.tool_input?.path || '';

    // Is the file inside the codebase?
    if (!filePath.startsWith(CODEBASE_ROOT)) return;

    // Is it a route/controller file?
    if (!isRouteFile(filePath)) return;

    // Check whether spec files are up to date
    checkSpecStaleness(filePath);
  } catch {
    // Hook errors are swallowed silently — must not block the workflow
  }
}

if (require.main === module) main();

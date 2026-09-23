# Dead Code Hunter — Unused Code Detection and Cleanup

> Detects unused code, exports, functions, and files based on security levels, cleans up after verification.

> Usage: `/deadcode [directory]`

---

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: project.description, stack.primary, project.structure, project.subprojects
Example output:
## Project Context
- **Project:** E-commerce platform (Next.js + NestJS + React Native)
- **Stack:** TypeScript, Prisma, PostgreSQL, Expo
- **Structure:**
  - `apps/web/` — Next.js frontend
  - `apps/api/` — NestJS backend
  - `apps/mobile/` — Expo React Native
  - `packages/shared/` — Shared types and utilities
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

<!-- GENERATE: DEADCODE_TOOLS
Description: This section is populated by Bootstrap with manifest data.
Required manifest fields: stack.primary, stack.languages, project.subprojects
Example output:
## Dead Code Analysis Tools

Tools to be used based on the stack:

| Stack | Tool | Command | Description |
|---|---|---|---|
| JavaScript/TypeScript | knip | `npx knip --reporter compact` | Detects unused exports, files, and dependencies |
| JavaScript/TypeScript | ts-prune | `npx ts-prune` | Cleans up unused TypeScript exports |
| JavaScript/TypeScript | unimported | `npx unimported` | Detects unused imported files |

>>>
### Step 1 — Scope Definition

#### 1.1 — Argument Handling

| Input | Behavior |
| --- | --- |
| Empty | Search entire project at `../Codebase/` directory |
| Directory Path | Search specified directory: `../Codebase/<directory>/` |
| Subproject Name | Monorepo subproject: `../Codebase/apps/<name>/` or `../Codebase/packages/<name>/` |

#### 1.2 — Monorepo Analysis

If the project is a monorepo (with multiple subprojects):

1. Perform separate analysis for each subproject
2. Treat published code in `packages/` directory as a trusted source and analyze it as a standalone entity, checking if it's imported from other subprojects
3. Perform cross-reference analysis between subprojects

#### 1.3 — Safe File List (Inaccessible)

The following files are never marked as dead code:

- Entry points: `main.ts`, `index.ts`, `app.ts`, `server.ts`, `main.py`, `__main__.py`, `main.go`, `main.rs`
- Configuration files: `*.config.ts`, `*.config.js`, `*.config.py`, `.env*`, `Makefile`, `Dockerfile`
- Package definitions: `package.json`, `setup.py`, `pyproject.toml`, `Cargo.toml`, `go.mod`
- Framework conventions: `page.tsx`, `layout.tsx`, `middleware.ts`, `+page.svelte`, `views.py`
- Migration files: `migrations/`, `prisma/migrations/`
- CI/CD files: `.github/`, `.gitlab-ci.yml`, `Jenkinsfile`
- Type definitions: `*.d.ts`, `*.types.ts` (non-exportable)
> **Rule:** If a file is not listed in the secure directory, set it to LOW security level. Delete.

---

## Step 2 — Analysis

### 2.1 — Vehicle-Based Analysis

Run the vehicle on the stack in the `DEADCODE_TOOLS` volume:

```bash
cd ../Codebase && <vehicle_command>
```

Parse the output and record:
- **File path**
- **Line number** (if applicable)
- **Symbol name** (function, class, variable, export)
- **Type of symbol** (unused export, unused function, unused file, unused dependency)

### 2.2 — Grep-Based Manual Analysis (Fallback)

If the vehicle is not present or additional verification is required:

#### Export Analysis
```bash
# Find all exports in the directory
cd ../Codebase && grep -rn "export " <directory> --include="*.ts" --include="*.tsx" --include="*.js"
```

Verify reference control for each export:
```bash
# Is this symbol used elsewhere?
cd ../Codebase && grep -rn "<symbol_name>" --include="*.ts" --include="*.tsx" --include="*.js" | grep -v "<source_file>"
```

#### File Analysis
```bash
# Is this file imported from another location?

>>>
# Step 3 — Security Assessment

Assess each issue based on the following criteria:

### HIGH — No Reference Found

All of the following are valid:
- No reference found in the project's root directory (excluding naming conventions)
- Not exporting from (`index.ts` barrel export control)
- Not listed in the secure file list
- Framework convention is not used (lifecycle hook, decorator handler etc.)

### MEDIUM — Only Test Reference

All of the following are valid:
- Only test files have a reference (`*.test.*`, `*.spec.*`, `__tests__/`)
- Only storybook/documented files have a reference
- Only string match in comments (not actual import)

### LOW — Dynamic/Unspecific Usage

All of the following are valid:
- Dynamic import usage is possible: `import()`, `require()`, `importlib`
- Used with reflection/decorator
- String-based lookup: `getattr()`, `Reflect.get()`, IoC container
- Other packages may be using it (library/package)
- Plugin system or lazy loading mechanism exists
- Symbol name is very generic (e.g. `handle`, `process`, `init`)
## Dead Code Analysis Results

### Summary
| Status | Number | Automatic Cleanup |
|---|---|---|
| HIGH | <n> | Yes (with approval) |
| MEDIUM | <n> | No (manual inspection) |
| LOW | <n> | No (notification) |

### High-Severity Issues
| # | File | Line | Symbol | Type | Last Changed |
|---|---|---|---|---|---|
| 1 | `src/utils/old-helper.ts` | 15 | `formatLegacy()` | function | 6 months ago |
| 2 | `src/models/deprecated.ts` | — | (all files) | file | 1 year ago |

### Medium-Severity Issues
| # | File | Line | Symbol | Reference | Reason for MEDIUM |
|---|---|---|---|---|---|
| 1 | `src/auth/token.ts` | 42 | `validateOld()` | test.ts | Only in tests |

### Low-Severity Issues
| # | File | Line | Symbol | Reason LOW |
|---|---|---|---|---|
| 1 | `src/plugins/base.ts` | 10 | `register()` | Dynamic configuration not possible |

---

## Step 4 — Cleanup

### 4.1 — Automatic Cleanup (Only for HIGH)

High-severity issues require automatic cleanup:

```
## Cleanup Plan

### Files to be Removed (not used in all files)
- `src/utils/old-helper.ts`

>>>
Here is the translation:

- `src/models/deprecated.ts`

### Files to be Removed (Files will remain, Symbols will be removed)
- `src/services/user.ts` → `formatLegacyUser()` (lines 45-62)
- `src/utils/string.ts` → `slugifyV1()` (lines 12-18)

### Files to be Purged (References to removed symbols)
- `src/services/index.ts` → Remove the line exporting `formatLegacyUser`

Total: <n> files will be removed, <m> files will have exports removed

```
Do you want to apply the cleanup plan?
- [E] Apply all
- [K] Select some (number)
- [H] No, just report sufficient
```

### 4.2 — User Confirmation

> **RULE:** Cleanup MUST NOT run automatically. NO confirmation from user is required for any file to be removed or organized.

---

## Step 5 — Verification

### 5.1 — Build Control

>>>
Here is the translated text:

<<<

```bash
cd ../Codebase && <build_command>
```

Build Failed:
1. Analyze the error — what caused the deletion/ cleanup issue?
2. Restore problematic changes: `git checkout -- <file>`
3. Downgrade the bug to LOW from HIGH
4. Continue with remaining changes

### 5.2 — Test Control

```bash
cd ../Codebase && <test_command>
```

Test Failed:
1. Check if deleted code is related to failed test
2. If test is still failing after deleting code: restore problematic changes
3. If test is failing for another reason: do not restore changes

### 5.3 — Lint Control

```bash
cd ../Codebase && <lint_command>
```

Remove unused import warnings.

---

## Step 6 — Commit

### 6.1 — File Preparation

```bash
cd ../Codebase && git add <changed_and_deleted_files>
```
**Rule:** `git add .` is forbidden. Only clean files should be added.

### 6.2 — Task Assignment

```bash
backlog task list --plain
```

Dead code cleanup tasks are related to the assignment of a task.

### 6.3 — Commit Message

<!-- GENERATE: COMMIT_CONVENTION
Description: This section will be filled by Bootstrap with manifest data.
Required manifest fields: conventions.commit_language, conventions.commit_format
Example output:
### Commit Format (Dead Code Cleanup)

```
refactor: <cleanup_description>
```

If related tasks exist:
```
refactor: <cleanup_description> (#<task_id>)
```

**Language:** English
**Example:** `refactor: Unused exports and files were cleaned up (#42)`
-->

---

## Step 7 — Task

### 7.1 — Updating Current Task

If a related task exists, use:
```bash
backlog task edit <id> -s "Done" --append-notes "[DEAD CODE] <description>"
```

>>>
### 7.2 — Creating a New Task

If no related task exists, record the done work:
```bash
backlog task create \
  "refactor: dead code cleanup — <scope>" \
  --description "<detail>" \
  --priority "low" \
  --labels "refactor,cleanup" \
  -s "Done"
```

### 7.3 — Medium Bug Tracking Task

Create a task for reviewing medium-level bugs:
```bash
backlog task create \
  "review: dead code candidates — manual review required" \
  --description "Medium-level issues:\n<bug_list>" \
  --priority "low" \
  --labels "review,cleanup,tech-debt"
```

---

## Step 8 — User Report

```
## Dead Code Cleanup Report

### Scope Range
- **Directory:** <scoped_directory>
- **Subprojects:** <subproject_list>
- **Used Tools/Manual:** <tool_name_or_manual>

### Results
| Severity | Found | Cleaned | Remaining |
|---|---|---|---|

>>>
### Cleaning
| File | Operation | Detail |
|---|---|---|
| `<path>` | Deleted | All files were not in use |
| `<path>` | Exported | Removed `<symbol>` |

### Validation
- [x] Build successful
- [x] Tests passed
- [x] Lint clean

### Commit
`<hash>` — `<message>`

### Tracking
- MEDIUM issues for investigation: #<task_id>
- LOW issues notification only, no action required
```

---

## Mandatory Rules

### Invariant rules (apply to every command)

1. **Do not write config into Codebase** — Only `.claude/`, `CLAUDE.md`, `.mcp.json`, and `.claude-ignore` files are allowed inside Agentbase. Creating a `.claude/` directory outside the Codebase or writing to `../Codebase/CLAUDE.md` is NOT ALLOWED.
2. **Git runs only in Codebase** — All Git operations (commit, push, branch) must be performed inside the Codebase. Git is NOT ALLOWED on Agentbase.
3. **Codebase is readable; config is not written there** — Project files (`src/`, `app/`, etc.) are readable and can be refactored if necessary. Config files (`*.claude/`, `CLAUDE.md`) are NOT ALLOWED inside the Codebase.

1. **Protect sensitive files** — Entry point, config, migration, CI/CD files MUST NOT be deleted.
2. **Non-atomic cleanup is forbidden** — HIGH issues cannot be deleted without user confirmation.
3. **Revert on failure** — If build fails after cleaning, revert changes and decrease security level.
4. **Cross-project reference control** — Check cross-project references, remove if only used in a single subproject.
5. **Barrel export chains** — Follow re-exported symbols from `index.ts`, check the chain until the end.
6. **Dynamic usage prohibition** — Prohibit use of `import()`, reflection, and IoC container for code that can be used dynamically with LOW severity.
7. **Framework conventions enforcement** — Enforce lifecycle hook, decorator handler, and convention-based files (page.tsx, middleware.ts) as DEAD CODE.
8. **Only committed files should be committed** — `git add .` is forbidden.

9. **Medium-level task** — Create a backlog item for test-only references.

10. **Use Backlog CLI** — Perform tasks only using the CLI.

11. **Codebase path** — All file access points are from `../Codebase/`.

12. **Security** — Credential, secret, `.env` values should never be logged to the log.

<!-- GENERATE: SELF_REFRESH
Description: Last command step - self-refresh check. Bootstrap this marker.
Self-Refresh section changes it. The command is reviewed by the project's current state:
Small inconsistency Edit or big change backlog task is reported.
-->

# Workflow Update — Incremental Drift Update

> Compares the current workflow configuration with the current state of Codebase.
> Updates only the changed pieces — does NOT do a full re-bootstrap.
> Usage: `/workflow-update`

---

## STEP 1 — Read the Current Manifest

```
Read Docbase/agentic/project-manifest.yaml.
Note meta.last_analyzed and meta.codebase_hash.
If the manifest is missing: warn "Manifest not found. Run /bootstrap first."
```

## STEP 2 — Rescan Codebase

Scan the Codebase directory and collect:
- Current dependencies (package.json, composer.json, pyproject.toml, etc.)
- Active framework/ORM/deploy tools
- Subproject directories and test commands
- Root config file hash

**This step does NOT write — read and analyze only.**

## STEP 3 — Drift Report

Report differences between the current manifest and the new analysis:

```
## Workflow Drift Report

### Newly Detected (+)
- +deploy/docker (Dockerfile added)
- +mobile/react-native (react-native dependency added)

### Removed (-)
- -orm/prisma (prisma dependency removed)

### Changed (~)
- ~api subproject: test command jest → vitest

### Unchanged
- orm/eloquent, backend/nodejs/express (same)

Do you want to apply? (yes / no / selective)
```

## STEP 4 — User Approval

User response:
- **yes**: Apply all changes
- **no**: Do nothing; close the report
- **selective**: Approve/reject each change one by one

## STEP 5 — Incremental Update

For approved changes:

1. **Back up the manifest**: copy as `project-manifest.yaml.backup`
2. **Update the manifest**: add modules to `modules.active`, remove dropped ones, reflect subproject changes
3. **Generate only changed module files**: `node generate.js` with `--modules <changed-modules>`
4. **Do NOT touch unchanged files**
5. **PRESERVE `.claude/custom/`** — do not delete user customizations

## STEP 6 — Update Meta

Update the manifest meta section:
```yaml
meta:
  last_analyzed: <now>
  codebase_hash: <new-hash>
  update_history:
    - date: <today>
      action: update
      changes: ["+deploy/docker", "-orm/prisma", "~api.test_command"]
```

## STEP 7 — Summary

```markdown
## Workflow Update Complete

| Change | Type | Status |
|---|---|---|
| deploy/docker | +Added | Applied |
| orm/prisma | -Removed | Applied |
| api test command | ~Changed | Applied |

Manifest: Docbase/agentic/project-manifest.yaml (backup: .backup)
Generated files: 4 new, 2 updated, 0 deleted
```

---

## Required Rules

1. **Do NOT full re-bootstrap** — Update only the changed pieces.
2. **Manifest backup REQUIRED** — Do not update without a .backup file.
3. **PRESERVE `.claude/custom/`** — Never delete or overwrite user customizations.
4. **Do NOT touch unchanged files** — If the drift report is empty, change no files.
5. **User approval REQUIRED** — Show the drift report; do not change without approval.
6. **Do not write config into Codebase** — `.claude/`, `CLAUDE.md`, `.mcp.json` are not created inside Codebase.
7. **Git runs only in Codebase** — There is no `.git` in Agentbase.
8. **Codebase is readable; config is not written there** — Read for analysis; write workflow files to Agentbase.

<!-- GENERATE: CODEBASE_CONTEXT
Description: Project-specific context — stack info, manifest path, special rules
Required manifest fields: project.name, stack.primary, modules.active
Example output:

This project is customized for {project.name}.
Stack: {stack.primary}
Manifest: Docbase/agentic/project-manifest.yaml
Active modules: {modules.active list}
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

<!-- GENERATE: SELF_REFRESH
Description: Command final step - self-refresh check. Bootstrap replaces this marker
with the shared Self-Refresh section. The command reviews its own text against the
project reality: small mismatches via Edit, large changes reported as a backlog task.
-->

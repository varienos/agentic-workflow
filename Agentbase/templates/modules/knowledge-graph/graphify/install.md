# Graphify Module — Installation Reference

This file is **not generated** — it is a reference for developers and for bootstrap when the Graphify module is selected. The module is generated only when selected.

Graphify is **optional**. If the CLI is absent, bootstrap continues and does not install it.

---

## 1. graphify CLI Presence Check

```bash
which graphify || echo "graphify CLI is not installed"
```

### Optional install (manual — bootstrap does not install)

If you want Graphify locally, install the CLI yourself. Bootstrap does not run these commands and does not fail when the CLI is missing:

| Method | Note |
|--------|------|
| A user-managed Python tool install of the `graphifyy` package | Isolated from the project |
| The package is not installed by bootstrap | Missing CLI is not a failure |

Presence check is always done with `which graphify` (there is no `--version` flag). Empty output means the CLI is missing. If missing, bootstrap continues and does not install it.

> **Skill install is optional — not required.** The `graphify install` / `graphify claude install` / `graphify hook install` commands write `CLAUDE.md` + `.claude/settings.json` PreToolUse hooks into cwd; that **violates the config boundary** (do not write config into Codebase) and is **not run by bootstrap**. Required scope when selected is only CLI (if present) + `graphify-out/` artifact + the repo's Agentbase config. `graphify update`/`query`/`path`/`explain` work without the skill.

---

## 2. `.gitignore` Patch

The `graphify-out/` directory holds the graph artifact (~3-4 MB/layer). It must not be committed to the repo.

When the module is selected, the following line is added to the target project's root `.gitignore` if missing:

```gitignore
# Graphify knowledge graph artifact — each developer produces it on their own machine
graphify-out/
```

Bootstrap applies this idempotently: if the line already exists, it is not added again.

---

## 3. First `graphify update` (optional, best-effort)

When the module is selected and the CLI is present, an initial `graphify update` may be attempted as **best-effort**: on failure or slowness, a visible warning is written to stderr and bootstrap is not blocked. If the CLI is absent, bootstrap continues and does not install it.

**Single-layer project:**

```bash
cd <Codebase> && graphify update .
```

**Monorepo (when the monorepo module is also active):**

```bash
cd <Codebase> && \
  graphify update <subproject1>/ && \
  graphify update <subproject2>/ && \
  graphify update <subproject3>/ && \
  python3 ../Agentbase/scripts/graphify-merge-layers.py
```

Subproject paths come from the manifest `project.subprojects` list. The Python merge script must be copied under `Agentbase/scripts/graphify-merge-layers.py` and is invoked from the Codebase root as `../Agentbase/scripts/graphify-merge-layers.py`.

Verification:

```bash
jq '.nodes | length' graphify-out/graph.json
```

---

## 4. Optional: Pre-Push Hook Setup

The pre-push hook updates the graph automatically before every `git push`. Ask the user:

> "Install the pre-push hook? The graph will update automatically before every push."

On approval → the target hook file is written **idempotently**. Check the `core.hooksPath` setting:

```bash
HOOKS_DIR="$(git -C <Codebase> config --get core.hooksPath || echo .git/hooks)"
TARGET="${HOOKS_DIR}/pre-push"
```

Marked block (new hook or appendable to an existing hook):

```sh
#!/bin/sh
# Graphify auto-update — pre-push trigger (module: knowledge-graph/graphify)
# Bypass: git push --no-verify
# No silent fail — error message is written to stderr; push is not blocked.

# For single-layer projects:
if ! graphify update . ; then
  echo "WARN: graphify update . failed; run 'graphify update .' manually (push continues)" >&2
fi

# For multi-layer monorepos (instead of the above):
# if ! ( graphify update backend/ && graphify update frontend/ && python3 ../Agentbase/scripts/graphify-merge-layers.py ); then
#   echo "WARN: graphify multi-layer update failed; manual update required (push continues)" >&2
# fi

exit 0
```

**Important:**
- Do NOT use `2>/dev/null` — graphify errors are written visibly to stderr; push is still not blocked (`exit 0`)
- Bootstrap setup is idempotent: if the marker line (`# Graphify auto-update`) exists, re-add is skipped
- If an existing pre-push hook exists, offer the user `append | backup-and-replace | skip`
- `core.hooksPath` is supported — if a custom hooks directory exists, write there
- Make the script executable with `chmod +x`
- The hook lives under `.git/hooks/` → it does not come with clones; each developer installs it on their own machine

---

## 5. CLAUDE.md Integration

When selected, Bootstrap generates `templates/modules/knowledge-graph/graphify/rules/graphify-rules.skeleton.md` into `Agentbase/.claude/rules/graphify-rules.md`. This rule is referenced in the Agentbase runtime context; no `CLAUDE.md` or `.claude/` config file is written into Codebase.

```markdown
@.claude/rules/graphify-rules.md
```

If root context is needed, use the existing Agentbase root `CLAUDE.md` import chain; do not write a separate context file into the target project Codebase root.

---

## 6. Settings.json Hook Registration

When selected, Bootstrap adds this entry to the `Agentbase/.claude/settings.json` PreToolUse block:

```json
{
  "matcher": "Bash|Grep|Glob",
  "hooks": [
    {
      "type": "command",
      "command": "node .claude/hooks/graphify-first-guard-v2.js",
      "timeout": 4
    }
  ]
}
```

If a record for the same `matcher` already exists, it is appended to the `hooks` array.

---

## Order Summary (when Graphify module is selected)

1. Check for graphify CLI (`which graphify`) → if absent, continue; do not install
2. Add `graphify-out/` to `.gitignore` (idempotent)
3. Copy the hook file under `Agentbase/.claude/hooks/graphify-first-guard-v2.js`
4. Add the `Agentbase/.claude/settings.json` PreToolUse entry
5. Generate the `/g` command (`Agentbase/.claude/commands/g.md`)
6. Produce `graphify-rules.md` and reference it from CLAUDE.md
7. If monorepo is active, copy `Agentbase/scripts/graphify-merge-layers.py` (user will adapt the LAYERS list)
8. Optionally attempt first `graphify update` (best-effort; warn and continue on failure; skip if CLI absent)
9. Optional pre-push hook setup → ask → write (user git workflow preference; does not block the automatic flow)

**Bootstrap note:** The module is generated only when selected. If the CLI is absent, bootstrap continues and does not install it.

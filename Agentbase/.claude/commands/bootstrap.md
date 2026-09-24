# Bootstrap — Agentic Workflow Setup Wizard

This command analyzes your project, runs a short interview with you, and creates the full agentic workflow configuration. Every step is visible on the console. When finished, the `.claude/` directory, root files, manifest, and backlog are ready.

**RULE: Follow these instructions literally, STEP BY STEP, in order. Skip no step, merge no steps. Show the user the outputs from every step.**

## Invariant rules

These rules are the foundation of Bootstrap and of every file it produces:

### 1. Git runs only in Codebase
- There is NO `.git/` inside Agentbase. Agentbase is a configuration directory only.
- All git operations (commit, push, branch, worktree) run inside `../Codebase/`.
- Git commands in commands: `cd ../Codebase && git ...`
- Worktree isolation: `cd ../Codebase && git worktree add ...`
- This split keeps Codebase's safe worktree isolation independent of agent and backlog files.
- Two-repo delivery model (optional): The project root (the parent ABOVE Agentbase/Codebase/Docbase) may be the developer's OWN git repo — it versions Agentbase + Docbase and ignores `Codebase` via `.gitignore` (see STEP 6.6). Codebase is its own independent repo and is delivered SEPARATELY to the customer (the customer clones only Codebase). Even in that case `.git` is written at the project root; it is **NOT written inside Agentbase** — the "no `.git/` in Agentbase" rule above still holds.
- Agent boundary: Agent/workflow git operations (commit/push/branch/worktree) ALWAYS target `../Codebase/`; the agent never touches the parent (developer) repository. The parent-root repo is the developer's manual tool, not the agents'.

### 2. Bootstrap NEVER writes to Codebase (single exception: AI Import)
- Bootstrap READS Codebase → CONFIGURES Agentbase.
- No file in Codebase is changed, added, or deleted.
- All generated files go **into Agentbase/** — distribution:
  - **Agentbase ROOT** (i.e. directly under `Agentbase/`) — **produced DIRECTLY by Bootstrap (6+1 root documents + 1 mcp config)**: `PROJECT.md`, `STACK.md`, `DEVELOPER.md`, `ARCHITECTURE.md`, `WORKFLOWS.md`, `CLAUDE.md` (root context), `onboarding.md` (new developer guide), `.claude-ignore`, `.mcp.json` (required — from `templates/core/mcp.skeleton.json`). **Produced by tools Bootstrap invokes**: `backlog/` (Backlog.md CLI), `../Docbase/memory/` (basic-memory vault). **Shipped with the repo (static root documents — Bootstrap does not fill these; they are included via the `@<file>` chain in root `CLAUDE.md`)**: `ORCHESTRATION.md` (shared agent behavior philosophy — for all models), `LESSONS.md` (self-improvement lessons), `BACKLOG.md` (Backlog CLI quick reference). **Shipped with the repo (code and template infrastructure)**: `bin/`, `templates/`, `tests/`, `generate.js`, `transform.js`, `package.json`.
  - **Under Agentbase/.claude/**: `commands/`, `agents/`, `hooks/`, `rules/`, `reports/`, `tracking/`, `custom/`, `settings.json`, `CLAUDE.md` (internal runtime config for the agent — a SEPARATE file from root `CLAUDE.md`, aimed at the agent, not the end user).
  - **Manifest:** `../Docbase/agentic/project-manifest.yaml` (**outside** Agentbase, under Docbase).
  - **Optional transform.js outputs** (when `manifest.targets` has a target other than `claude`): `GEMINI.md` (gemini/antigravity target → Agentbase root), `.agents/workflows/*`, `.agents/skills/*/SKILL.md`, `.agents/rules/*` (antigravity target), `AGENTS.md` + `.codex/skills/*/SKILL.md` (codex target → Agentbase root + `.codex/`), `.kimi/skills/`, `.kimi/agents/` (kimi target), `.opencode/AGENTS.md` + `.opencode/skills/` + `.opencode/agents/` (opencode target). These files convert root `CLAUDE.md` content into the target CLI format — the injection chain is preserved automatically.
  - **FORBIDDEN:** Do NOT WRITE or COPY root documents (PROJECT.md, STACK.md, DEVELOPER.md, ARCHITECTURE.md, WORKFLOWS.md, ORCHESTRATION.md, LESSONS.md, BACKLOG.md, root CLAUDE.md, onboarding.md) under `.claude/`. `.claude/` is agent runtime config, not documentation. These files stay at the real Agentbase root so **all models (Claude, Gemini, Antigravity, Codex, Kimi, OpenCode) can read the same context**.
- The manifest goes under `../Docbase/agentic/` (outside Codebase).
- The project's existing .gitignore, package.json, and CI config files are preserved.

**EXCEPTION — AI Import (Step 1.2.5):** With the user's double confirmation (exact text
"MOVE AND DELETE APPROVED"), prior Claude Code and Backlog
assets inside Codebase (`.claude/`, `.claude/memory/`, `.claude/agent-memory/`, `CLAUDE.md`,
`.mcp.json`, `backlog/*`) are moved into Agentbase and deleted from source Codebase.
Outside this single exception, writing/deleting in Codebase is NEVER done.

---

## STEP 0 — Host runtime and completion guarantee

Bootstrap is a multi-step, multi-teammate process that is dangerous to leave half-finished. Past failures:

- Files written to the wrong location (e.g. `.claude/PROJECT.md`).
- Open issues at the end (missing teammate outputs, incomplete manifest, unwritten root documents).
- Attempts to finish in a single-turn response.

**Approach:** This wizard runs on **any host agent**. Claude is one host, not the product. The completion condition is the STEP 8 verification gate (`BOOTSTRAP_COMPLETE`). On a Claude host you may optionally wrap the run with `/goal` so an evaluator keeps driving until the gate passes; other hosts do not run Claude hooks or `/goal` automatically — they must apply the self-discipline rules in 0.3 and finish at STEP 8.

### 0.1 Startup notice

At the start of the process, notify the user — the first console output is:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Bootstrap setup wizard
   Runs on any host agent. Completion is
   the STEP 8 verification gate
   (BOOTSTRAP_COMPLETE).

   On Claude hosts, /goal is optional and
   can help prevent half-finished runs.
   Other hosts do not run /goal or Claude
   hooks automatically — follow every STEP
   through STEP 8.

   Continue with Enter >
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

2. **Do not skip this notice** — show it even when a host-specific permission bypass is active so the user can make a conscious decision.

### 0.2 Completion condition (reference for STEP 8)

The STEP 8 gate is machine-checkable as follows (hosts that optionally use `/goal` may treat this as the evaluator stop condition):

```
BOOTSTRAP_COMPLETE = (
  manifest_yazildi
  AND root_dokumanlar_dogru_konumda
  AND root_claude_import_zinciri_tam
  AND claude_runtime_dosyalari_var
  AND claude_ignore_rootta
  AND claude_fill_marker_kalmadi
  AND backlog_init_edildi
  AND root_dokumanlar_dolu
  AND codebase_sizintisi_yok
)
```

Each component of this condition is verified in STEP 8 with bash test commands. On FAIL, the host agent (or an optional Claude `/goal` evaluator) starts a new turn to complete the missing component.

### 0.3 Self-discipline rules (single-turn / non-`/goal` hosts)

If the user starts without `/goal` (or the host does not support it), apply these disciplines:

1. **Skip no step** — do not assume "this is already correct"; perform every file write.
2. **End no step early** — `_partial`, `TODO:`, `<!-- CLAUDE_FILL: ... -->` markers **must not remain** (the CLAUDE_FILL fill step must not be skipped).
3. **Path verification** — after every file write, print the path to the console: `✏️  written: <abs-path>`. This log is scanned in STEP 8.
4. **STEP 8 at the end is mandatory** — do not skip it.

---

## STEP 1 — PRECONDITION CHECKS

Run the checks below IN ORDER. If any one fails, STOP; do not continue.

### 1.0 Permission mode suggestion

Bootstrap will create many files, directories, and backlog operations. Asking for permission on every operation slows the process. Show the user this suggestion:

```
💡 Bootstrap will perform many file operations.
   If your host agent supports a permission-bypass
   or auto-approve mode, enabling it can speed up
   the run. This is an optional host-specific
   speedup — not a product requirement.

   Continue with Enter >
```

> This is a SUGGESTION — not a requirement. The wizard works without bypass if the user continues.

### 1.0.5 Bootstrap start sentinel

So the Codebase leak check works correctly, create the sentinel file before Bootstrap file writes begin:

```bash
: > /tmp/bootstrap-start
echo "✅ Bootstrap sentinel ready: /tmp/bootstrap-start"
```

This file is used by STEP 8 Gate H. If the sentinel is missing, Gate H fails; that way files wrongly written into Codebase cannot slip through silently.

### 1.1 Backlog CLI check

Run with bash: `which backlog`

- **If not found** → Show the user this message and STOP COMPLETELY; do not continue to any step:

```
❌ Backlog.md CLI is not installed. This workflow does not work without Backlog.md.

Install options:
  npm i -g backlog.md
  or
  brew install backlog-md

After installing, run the /bootstrap command again.
```

- **If found** → print `✅ Backlog CLI found` and continue.

### 1.1.5 basic-memory MCP check (Shared Agent Memory Layer)

This workflow uses the `basic-memory` MCP as **required**. Vault: `../Docbase/memory/` — all agents (Claude, Codex, Gemini, Antigravity, Kimi, OpenCode) connect to the same Markdown knowledge graph. Single source for shared memory across sessions/CLIs.

**1.1.5.a — `uv` (Python package manager) check**

Run with bash: `command -v uv >/dev/null 2>&1 && uv --version || echo "__UV_MISSING__"`

- **`__UV_MISSING__`** → Show the user this message and STOP COMPLETELY:

```
❌ uv (Python package manager) is not installed. basic-memory MCP does not work without it.

Install (macOS / Linux):
  curl -LsSf https://astral.sh/uv/install.sh | sh

Install (Windows PowerShell):
  powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

Or Homebrew:
  brew install uv

After installing, run the /bootstrap command again.
```

- **If present** → print `✅ uv found (<version>)`.

**1.1.5.a.2 — Python 3.12+ check**

basic-memory requires Python 3.12+. `uv` manages Python automatically; a separate system Python is not needed.

Because `uv python find` can hit the registry, a deterministic local check is used so network/SSL errors are not misread as "not installed" (same pattern as 1.1.5.b):

```bash
# 1) Installed locally? (no network needed; registry errors do not affect this)
if uv python list --only-installed 2>/dev/null | grep -Eq '^cpython-3\.(1[2-9]|[2-9][0-9])'; then
  echo "__PY_312_OK__"
else
  # 2) Not local — install may be tried. Network errors are caught separately.
  echo "__PY_312_MISSING__"
fi
```

- **`__PY_312_OK__`** → print `✅ Python 3.12+ found (uv-managed)` and continue.

- **`__PY_312_MISSING__`** → Try install (stderr is not swallowed):
  ```bash
  if uv python install 3.12 2>/tmp/uv-py-stderr; then
    echo "✅ Python 3.12 installed (uv-managed)"
  else
    cat /tmp/uv-py-stderr
    echo "__PY_312_INSTALL_FAILED__"
  fi
  ```
  - If successful → continue.
  - `__PY_312_INSTALL_FAILED__` → The stderr shown above may be a network/proxy/SSL error. Show the user the error message and STOP COMPLETELY. NEVER interpret this as "Python is missing, download it elsewhere" — the root cause may be the network.

**1.1.5.b — basic-memory install check**

Instead of swallowing `uvx --version` stderr, a deterministic **installed package** check is used. This avoids misreading network/registry/SSL errors as "not installed" (silent-failure protection).

```bash
# 1) Installed? (deterministic, no network needed)
if uv tool list 2>/dev/null | grep -q "^basic-memory "; then
  # 2) Installed — runtime test (catch real runtime errors)
  if BM_VER=$(uvx basic-memory --version 2>/tmp/bm-stderr); then
    echo "__BM_OK__:$BM_VER"
  else
    echo "__BM_RUNTIME_ERROR__"
    cat /tmp/bm-stderr  # Show error detail to the user
  fi
else
  echo "__BM_MISSING__"
fi
```

- **`__BM_OK__:<version>`** → print `✅ basic-memory found (<version>)` and continue.

- **`__BM_MISSING__`** → Try automatic install: `uv tool install basic-memory`
  - If install succeeds → print `✅ basic-memory installed` and continue.
  - If install fails → show stderr to the user and STOP COMPLETELY:

```
❌ basic-memory install failed.

Try manual install:
  uv tool install basic-memory

Error details above. After fixing, run the /bootstrap command again.
```

- **`__BM_RUNTIME_ERROR__`** → basic-memory is installed **but cannot run** (common causes: network/proxy/SSL, broken install, permission issue). Show stderr details to the user and STOP COMPLETELY. NEVER interpret this as "not installed" — reinstalling alone will not fix this error.

```
❌ basic-memory is installed but cannot run.

Check the stderr output above. Common causes:
  - Network/proxy/SSL error (corporate network, VPN)
  - Broken install (fix: uv tool uninstall basic-memory && uv tool install basic-memory)
  - Permission issue (files under the uv tool directory)

After fixing the problem, run the /bootstrap command again.
```

**Note:** Creating the vault directory (`../Docbase/memory/`) and project register is done in STEP 5 by Teammate 5 root-generator — this step only verifies that the dependency exists.

### 1.1.6 graphify CLI check (Knowledge-Graph — optional)

This workflow can use the `knowledge-graph/graphify` module for code-relationship discovery (`where is X`, `what uses Y`) with BFS queries instead of grep/find (~150-540x token savings). The graphify CLI is **optional**. Absence must **not** stop the wizard.

> **🔗 init stitch:** If `npm run init` already ran, it may have installed the graphify CLI (`ensureGraphify`). This step only confirms with `command -v graphify` — if present, take no further install action.

`uv` and Python 3.12+ were already verified in STEP 1.1.5.a / 1.1.5.a.2 (graphify wants Python 3.10+; that condition is met). Do not re-check.

Run with bash: `command -v graphify >/dev/null 2>&1 && echo "__GRAPHIFY_OK__" || echo "__GRAPHIFY_MISSING__"`

- **`__GRAPHIFY_OK__`** → print `✅ graphify found` and continue (init may have installed it).

- **`__GRAPHIFY_MISSING__`** → print that graphify is optional and continue. Do **not** install it. Do **not** stop the wizard:

```
ℹ️ graphify CLI is not installed. It is optional —
   the wizard continues without it. Knowledge-graph
   features that need the CLI will be limited until
   you install it later if you want them.
```

**Note:** Skill install (`graphify install` / `graphify claude install`) is **NOT required and must NOT be run** — those commands write `CLAUDE.md` + `.claude/settings.json` PreToolUse hooks into the cwd and can violate Invariant rule 2 (Codebase write ban). The CLI + `graphify update`/`query` work without the skill; graphify config is generated only on the Agentbase side.

### 1.2 Codebase check

Check the `../Codebase/` directory (path relative to Agentbase).

Run with bash: `if [ ! -d ../Codebase ]; then echo "__CODEBASE_MISSING__"; else find ../Codebase -mindepth 1 -maxdepth 1 ! -name '.gitkeep' ! -name '.DS_Store' -print 2>/dev/null | head -5; fi`

- **If output is `__CODEBASE_MISSING__`** → Show the user this message and STOP COMPLETELY:

```
❌ Codebase/ directory not found.
Put your project in this directory or create a symbolic link:

  ln -s /path/to/your/project ../Codebase

Then run the /bootstrap command again.
```

- **Directory exists but is empty** (`.gitkeep` and `.DS_Store` count as placeholders) → Switch to Greenfield mode. Ask the user with `AskUserQuestion` (do not use a plain text prompt):

```yaml
AskUserQuestion call:
  question: "📦 Codebase/ directory is empty. Are you starting a brand-new project from scratch?"
  header: "Greenfield"
  multiSelect: false
  options:
    - label: "Yes, greenfield"
      description: "Stack and project details will be asked in the interview"
    - label: "No, I will stop"
      description: "I will put the project into Codebase/ first"
```

  - **"Yes, greenfield"** → Record `GREENFIELD_MODE = true`. Print `✅ Greenfield mode active` and continue.
  - **"No, I will stop"** → STOP COMPLETELY (existing behavior).

- **If real files exist** → `GREENFIELD_MODE = false`. Print `✅ Codebase found`, list the top-level files/folders found, and continue.

### 1.2.5 Codebase AI asset import

If `GREENFIELD_MODE = false`, Codebase may contain prior Claude Code or Backlog
assets (`.claude/`, `CLAUDE.md`, `.mcp.json`, `backlog/tasks/`, etc.).
Detect these assets and offer the user an import option.

**Step 1.2.5.a — Detect (dry-run):**

```
node bin/import-codebase-ai.js --codebase ../Codebase --agentbase . --dry-run
```

Show the script stdout to the user as-is. Based on the marker on the last line:

- **`NO_IMPORT_NEEDED`** → No AI assets in Codebase. Go to Step 1.3.
- **`IMPORT_CANCELLED`** → Target conflict (listed in the report). Manual
  review needed; notify the user and go to Step 1.3.
- **`IMPORT_DONE`** (with dry-run marker) → Detection complete; go to
  Step 1.2.5.b.
- **`IMPORT_ERROR`** → Show the stderr message and STOP COMPLETELY.

**Step 1.2.5.b — Double confirmation over chat:**

Inside Claude Code / Gemini CLI, `node --interactive` does not provide a TTY. Therefore
double confirmation is taken with the user over chat inside this flow, not by the script.

Summarize the dry-run output for the user and show this message:

```
The assets above will be moved from Codebase to Agentbase and deleted from
Codebase. Do you want to continue? (yes/no)
```

- If the user answers `no` / empty → print "Import cancelled, existing
  Codebase preserved" and go to Step 1.3.
- If the user answers `yes` → request the second confirmation:

```
⚠️  INVARIANT RULE 2 EXEMPTION
This operation will delete files in Codebase (recovery is via git history).
To confirm, type the exact text:

  MOVE AND DELETE APPROVED
```

- If the user's reply is not exactly `MOVE AND DELETE APPROVED` → cancel,
  go to Step 1.3.
- If the exact text matches → go to Step 1.2.5.c.

**Step 1.2.5.c — Real execution (`--yes`):**

```
node bin/import-codebase-ai.js --codebase ../Codebase --agentbase . --yes
```

The `--yes` flag tells the script that double confirmation was already taken over chat. The script
skips interactive prompts and runs detect → copy → delete → report.
Output marker:

- **`IMPORT_DONE`** → The report path is
  `Agentbase/.claude/custom/_imported/[ts]/import-report.md`.
  Notify the user and go to Step 1.3.
- **`IMPORT_ERROR`** → Show the stderr message and STOP COMPLETELY.

**IMPORTANT — INVARIANT RULE 2 EXEMPTION:** This is the only
bootstrap step that may delete inside Codebase. Deletion runs only when the double confirmation in
Step 1.2.5.b is fully satisfied. The `--yes` flag exists to pass that confirmation to the script;
it is NEVER given without confirmation.

### 1.3 Prior Bootstrap check

Check whether `../Docbase/agentic/project-manifest.yaml` exists.

- **If the file exists**:

  **🔗 SLIM PATH (init stitch) — check this first:** Read the manifest. If `manifest.init.produced_by == "init-cli"` and `manifest.init.narrative_pending == true`, this is the **FIRST** bootstrap after init (not a re-run). `bin/init.js` has already completed detect + interview + manifest + generate.js deterministically. Do the following and **SKIP** the rest of this 1.3 section (the re-run menu):
  - Validate the manifest with `templates/manifest.schema.js` `validateManifest`. If invalid, leave the SLIM PATH and fall through to the normal re-run flow below.
  - If valid, print to the console: `🔗 init stitch detected — skipping detect/interview/manifest; only CLAUDE_FILL narrative will be filled.` Then **STEP 2 (codebase analysis), STEP 3 (interview), and STEP 4 (manifest creation) are SKIPPED ENTIRELY** — init produced them. Go directly to STEP 5: generate.js deterministic output already exists (regeneration is idempotent); teammates fill **only CLAUDE_FILL narrative blocks and root documents**. STEP 8 GATE still runs unchanged.

  Otherwise (no init signature) this is a **prior bootstrap** run; apply the re-run flow below:

  1. Read the existing manifest.
  2. Check the `manifest.version` field. Expected major version is `1`.
  3. Decide compatibility:
     - same major → `COMPATIBLE` (`merge` and `incremental` may be used)
     - different major or field missing → `INCOMPATIBLE` (only `overwrite` or cancel)
  4. Check whether Bootstrap-managed files have local changes. Managed scope:
     - `.claude/commands/`
     - `.claude/agents/`
     - `.claude/hooks/`
     - `.claude/rules/`
     - generate.js outputs: `.claude/settings.json`, `.claude/CLAUDE.md`, `.claude-ignore`, `git-hooks/`
     - Bootstrap-direct files (Claude writes directly; generate.js does not produce them): `PROJECT.md`, `STACK.md`, `DEVELOPER.md`, `ARCHITECTURE.md`, `WORKFLOWS.md`
     - NOTE: Root `CLAUDE.md` is NOT produced by generate.js — `.claude/CLAUDE.md` is. `.mcp.json` is produced as required from `templates/core/mcp.skeleton.json` (the basic-memory MCP entry).
     - **OUT OF MANAGEMENT (static root documents):** `ORCHESTRATION.md`, `LESSONS.md`, `BACKLOG.md` are **NOT** Bootstrap-managed. They ship static with the repo; the user edits them (especially `LESSONS.md` fills with lessons over time). In no mode (`overwrite`/`merge`/`incremental`) are these files checksum-compared, copied under `_rescued/`, or overwritten. Only their presence is verified by STEP 8 GATE B/G.
  5. For each managed file, compare the checksum in the manifest with the current file:
     - match → Bootstrap-managed and clean
     - mismatch → mark as user customization
     - if the file is under `.claude/custom/` → always treat as user-owned and do not touch
  6. Show the user this menu:

```
⚠️  Bootstrap has been run before.
Manifest version: [current or missing] (expected major: 1) → [COMPATIBLE/INCOMPATIBLE]
Template version: [manifest.template_version or unknown]
Local customization: [none | file list]

Choose re-run mode:
  1) overwrite   — Regenerate Bootstrap-managed files from scratch; `.claude/custom/`, `reports/`, `tracking/` are kept
  2) merge       — Merge manifest diffs; add new modules; deactivate modules no longer detected; update only affected files
  3) incremental — Update only files whose input or template changed
  4) cancel

Choice: [1/2/3/4]
```

  7. If `INCOMPATIBLE`, do not offer `merge` and `incremental`; the user may only choose `overwrite` or `cancel`.
  8. If `overwrite` is chosen:
     - before writing, copy every managed file with a checksum mismatch under `.claude/custom/_rescued/[timestamp]/`
     - then regenerate Bootstrap-managed files from scratch
  9. If `merge` is chosen:
     - keep interview answers from the previous manifest
     - add extra modules/fields from the new codebase analysis
     - move leaves no longer detected under `modules.skipped`
     - do not overwrite a checksum-mismatched file in place; write the new content under `.claude/custom/_rescued/[timestamp]/candidate/` and report to the user
  10. If `incremental` is chosen:
      - regenerate only files whose template checksum or related manifest input changed
      - do not overwrite a checksum-mismatched file in place; write the new content under `.claude/custom/_rescued/[timestamp]/candidate/` and report to the user
  11. If `cancel` is chosen → STOP.

- **If the file does not exist** → Continue silently.

### 1.4 Interview phase template validation

Bootstrap **requires** that the `templates/interview/phase-{N}-*.md` files exist. The following 4 files are expected:

- `Agentbase/templates/interview/phase-1-project.md`
- `Agentbase/templates/interview/phase-2-technical.md`
- `Agentbase/templates/interview/phase-3-developer.md`
- `Agentbase/templates/interview/phase-4-rules.md`

For each file call `fs.statSync(path)` and verify `stat.isFile()` is true. If it throws or the path is not a file (e.g. a directory), treat it as missing. `fs.existsSync` alone is not enough — type checking is required so a clear error is raised immediately instead of delaying until STEP 3 reads. If a missing or invalid file is detected, Bootstrap **STOPS immediately** and writes this error to stderr:

```
❌ ERROR: templates/interview/phase-{N}-*.md missing. Verify the template installation

Missing files:
  - {full path 1}
  - {full path 2}
```

This required source check exists because after TASK-210/T6a, STEP 3 references the phase templates; the previous "if missing, use defaults" fallback was removed by TASK-214/T6b. This breaking change is recorded in the CHANGELOG under TASK-215/T6c.

When all checks succeed:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Bootstrap starting...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## STEP 2 — CODEBASE ANALYSIS (Automatic)

> **🔗 SLIM PATH (init stitch) active** (detected in STEP 1.3) → skip this entire step — `bin/init.js` already ran codebase analysis deterministically and filled `manifest.detected.*`.

> **If GREENFIELD_MODE = true** skip this entire step. Show the message below and go directly to STEP 3:
>
> ```
> 🌱 Greenfield mode — automatic codebase analysis skipped.
>    All project details will be asked in the interview.
> ```

Scan `../Codebase/` and automatically detect everything possible about the project. Keep each sub-step result in a variable — they will be used in the interview and the manifest.

When you finish each sub-step, show the results on the console.

### Placeholder resolution protocol

In the Bootstrap flow, `AskUserQuestion` calls in STEP 3 use a **canonical placeholder format** for "Detected value" hints. This protocol standardizes hint placement.

**Canonical format:**
```
[Detected: {detected.<field>}]
```

Example: `[Detected: {detected.test_framework}]`. When the Bootstrap parser sees this expression it substitutes `manifest.detected.<field>.value`. Result: `[Detected: vitest]`.

**Substitute rules:**

| State | Behavior |
|---|---|
| `manifest.detected.<field>` present, `value` filled, confidence ≥ medium | `{detected.<field>}` → `value` is substituted. Show in the question text. |
| `manifest.detected.<field>` present, confidence == "low" | `value` is substituted + "[low confidence]" is appended: `[Detected: free [low confidence]]`. |
| `manifest.detected.<field>` missing or `value` null/empty | **The entire `[Detected: {detected.<field>}]` expression is removed** (brackets and contents included; do not leave empty `[]`). |
| GREENFIELD_MODE = true | `manifest.detected` starts empty → all placeholder expressions are removed automatically (natural result of the rule above). |

**bootstrap.md scope only:** This protocol applies to `AskUserQuestion` `question:` fields in bootstrap.md. Placeholders in `templates/interview/phase-{N}-*.md` files are **out of scope for this task** (T4/TASK-213 scope boundary; a separate task may be opened later).

**Non-detected placeholders:** If a `[Detected: ...]` expression has no `{detected.<field>}` reference (e.g. `[Detected: estimated from route files]`), it is a non-canonical special hint. The parser does not touch it; the text is shown as-is. This applies to fields not in the `manifest.detected` list such as Phase 1 S2 (production URL), Phase 1 S4 (subproject roles), Phase 1 S5 (API prefix).

**Multi-field hints:** If a question wants to show more than one detected field, **use a separate bracket per field** (required by the canonical format — multiple `{detected.X}` references inside a single bracket are forbidden because fallback behavior becomes ambiguous). Example: `[Detected linter: {detected.linter}] [Detected formatter: {detected.formatter}]`. Each bracket follows the substitute/remove rule independently; one may be removed while the other remains.

---

### 2.1 Project type detection

Search for the following files under `../Codebase/`:

| File | Project type | Detail check |
|-------|-----------|----------------|
| `package.json` | Node.js | Inside `dependencies`/`devDependencies`: express→Express API, fastify→Fastify API, next→Next.js, `expo`→Expo, `react-native`→React Native, react→React SPA, vue→Vue, svelte→Svelte |
| `workspaces` field inside `package.json` | Monorepo | npm/yarn workspaces |
| `lerna.json` | Monorepo | Lerna |
| `turbo.json` or `nx.json` | Monorepo | Turbo/Nx |
| `composer.json` | PHP | Inside `require`: laravel→Laravel, codeigniter→CodeIgniter |
| `go.mod` | Go | — |
| `Cargo.toml` | Rust | — |
| `requirements.txt` or `pyproject.toml` | Python | django→Django, fastapi→FastAPI, flask→Flask |
| `pom.xml` | Java | — |
| `build.gradle` or `build.gradle.kts` | Kotlin/Java | — |

Extra monorepo check: If more than one subdirectory at the root has its own `package.json` or `composer.json` → mark as monorepo.

If monorepo, analyze each subproject separately — name, path, type, and stack for each.

Show the result:

```
📦 Project type: [detected type]
   Subprojects: [list if any]
```

### 2.2 Directory map

With bash, build a directory tree under `../Codebase/` up to 3 levels deep.

Detect specifically:
- Source directories: `src/`, `app/`, `lib/`, `source/`, `pkg/`
- Test directories: `test/`, `tests/`, `__tests__/`, `spec/`, `cypress/`
- Config directories: `config/`, `.config/`
- Docs directories: `docs/`, `documentation/`

Show the result:

```
📁 Directory structure:
   [tree output]

   Source directories: [found]
   Test directories: [found]
```

### 2.3 Tech stack detection

Detect each of the following components by file presence:

**Package manager:**
| File | Manager |
|-------|----------|
| `pnpm-lock.yaml` | pnpm |
| `yarn.lock` | yarn |
| `bun.lockb` or `bun.lock` | bun |
| `package-lock.json` | npm |
| `composer.lock` | composer |
| `Pipfile.lock` or `poetry.lock` | pip/poetry |
| `Cargo.lock` | cargo |
| `go.sum` | go modules |

**TypeScript:** If `tsconfig.json` exists → TypeScript active.

**Test framework:**
- `jest.config.*` or `jest` in package.json → Jest
- `vitest.config.*` or `vitest` in package.json → Vitest
- `mocha` dependency → Mocha
- `pytest.ini` or `conftest.py` → pytest
- `phpunit.xml` → PHPUnit

**Linter/Formatter:**
- `eslint.config.*` or `.eslintrc*` → ESLint
- `.prettierrc*` or `prettier.config.*` → Prettier
- `biome.json` → Biome
- `ruff.toml` or `[tool.ruff]` in `pyproject.toml` → Ruff

**ORM/Database:**
- `prisma/schema.prisma` → Prisma
- `typeorm` dependency → TypeORM
- `sequelize` dependency → Sequelize
- `drizzle.config.*` → Drizzle
- `eloquent` (inside Laravel) → Eloquent

**Database:** in package.json or config files: mysql, pg/postgres, sqlite3, mongodb/mongoose

**CI/CD:**
- `.github/workflows/` directory → GitHub Actions
- `.gitlab-ci.yml` → GitLab CI
- `Jenkinsfile` → Jenkins
- `.circleci/` → CircleCI

**Container:**
- `Dockerfile` → Docker
- `docker-compose.yml` or `docker-compose.yaml` or `compose.yml` → Docker Compose

Show the result as a table:

```
🔧 Tech Stack:
   Runtime:        [detected]
   Package manager:[detected]
   TypeScript:     [yes/no]
   Test:           [detected]
   Linter:         [detected]
   Formatter:      [detected]
   ORM:            [detected]
   Database:       [detected]
   CI/CD:          [detected]
   Container:      [detected]
```

### 2.4 Module detection

Modules are organized by category. Detection is recursive:

1. **Category level:** `templates/modules/*/detect.md` — is the category active? (orm, deploy, backend, mobile, frontend, knowledge-graph)
2. **Intermediate node / family level:** `templates/modules/*/*/detect.md` — family or runtime selection if needed (e.g. `backend/nodejs`)
3. **Leaf level:** `templates/modules/**/*/detect.md` — final technology selection (e.g. `backend/nodejs/express`)

> **Optional module — knowledge-graph:** `knowledge-graph/graphify` is **not** activated unless the manifest lists it. Detection does not force it on. `bin/lib/assemble.js` leaves it inactive when it was not selected. CLI presence is probed in STEP 1.1.6; absence does not stop the wizard and bootstrap does not install graphify.

#### detect.md structural format

All detect.md files use the structural format below. The format is readable by Claude and suitable for future programmatic processing.

**Leaf / Standalone / Family detect.md:**

```markdown
# [Module Name]

## Checks
- file_exists: prisma/schema.prisma
- dependency: @prisma/client | prisma
- env_var: DATABASE_URL

## Minimum Match
2/3

## Activates
- hooks/prisma-db-push-guard.js (PreToolUse Bash)
- rules/prisma-rules.md

## Affects Core
- task-hunter: prisma validate added to VERIFICATION_COMMANDS
- settings.json: 3 hook definitions added
```

**Category detect.md (with sub-variants):**

```markdown
# [Category Name]

## Variants
| Name | Path | Priority |
|------|------|----------|
| Prisma | orm/prisma/detect.md | 1 |
| Eloquent | orm/eloquent/detect.md | 2 |

## Provides
- List of features common to all variants

## Affects Core
- ...
```

**Supported check types:**

| Type | Syntax | Description |
|-----|--------|----------|
| `file_exists` | `file_exists: path/to/file` | Whether a file or directory exists. Alternative paths with `\|`, wildcards with `*/` |
| `dependency` | `dependency: pkg-name` | Whether a package dependency exists (package.json, composer.json, requirements.txt, pyproject.toml, pubspec.yaml). Alternative packages with `\|` |
| `env_var` | `env_var: VAR_NAME` | Whether defined in .env or a config file |
| `file_pattern` | `file_pattern: **/*.controller.ts` | File match via glob pattern |
| `code_pattern` | `code_pattern: express() \| Router()` | Regex/text match inside code |
| `config_key` | `config_key: package.json -> workspaces` | Whether a specific key exists in a config file |
| `not_dependency` | `not_dependency: next` | Package must NOT be in dependencies (negative check) |

**Minimum Match format:** `X/Y` — at least X of Y checks must pass. Standalone modules use `1/N` (any 1 is enough).

**Detection flow:**

```
for each directory under templates/modules/:
  read detect.md and process the Checks section

  IF the directory is a standalone module (= has its own commands/hooks/rules folders, e.g. monorepo, security):
    evaluate Checks conditions -> ACTIVE or INACTIVE

  ELSE (= category or intermediate node):
    if a Checks section exists, evaluate conditions (otherwise continue with the Variants table)

    IF detection fails:
      this node and all leaves under it are INACTIVE

    IF detection passes and there is no child node:
      current node is accepted as the active leaf

    IF detection passes and there are child nodes:
      check child nodes in Variants table priority order
      descend into the first matching child
      if a deeper leaf matches, record it as the active path
      record non-matching sibling nodes as SKIPPED
```

**Categories and leaf paths:**

**orm category:**
- Category condition: Detection of any ORM/migration tool
- Sub-variants:
  - `prisma` — `prisma/schema.prisma` EXISTS AND `@prisma/client` in dependencies
  - `eloquent` — `composer.json` EXISTS AND `laravel/framework` in dependencies
  - `django-orm` — `manage.py` EXISTS AND `django` in dependencies
  - `typeorm` — `typeorm` in dependencies AND a config file exists

**deploy category:**
- Category condition: Detection of deploy-related file/config
- Leaves:
  - `docker` — `Dockerfile` EXISTS
  - `coolify` — `Dockerfile` + Coolify config or labels exist
  - `vercel` — `vercel.json` EXISTS OR `next` in dependencies

**backend category:**
- Category condition: Backend framework detection
- Families and leaves:
  - `nodejs`
    - `nestjs` — `@nestjs/core` in dependencies
    - `fastify` — `fastify` in dependencies
    - `express` — `express` in dependencies
  - `php`
    - `laravel` — `laravel/framework` in `composer.json`
    - `codeigniter4` — `codeigniter4/framework` in `composer.json`
  - `python`
    - `django` — `manage.py` EXISTS AND `django` in dependencies
    - `fastapi` — `fastapi` in dependencies

**mobile category:**
- Category condition: Mobile framework detection
- Leaves:
  - `expo` — expo config in `app.json` or `app.config.js` AND `expo` dependency
  - `react-native` — `react-native` in dependencies AND NO expo config
  - `flutter` — `pubspec.yaml` EXISTS AND `flutter` dependency detected

**frontend category:**
- Category condition: Frontend meta-framework detection
- Leaves:
  - `nextjs` — `next` in dependencies AND `next.config.*` file exists
  - `react` — `react` and `react-dom` in dependencies AND NO `next`
  - `html` — `.html` files exist AND no framework detected

**ci-cd category:**
- Category condition: CI/CD pipeline file/config detection
- Leaves:
  - `github-actions` — `.github/workflows/` directory AND workflow YAML files exist
  - `gitlab-ci` — `.gitlab-ci.yml` EXISTS

**monitoring category:**
- Category condition: Error tracking / performance monitoring SDK detection
- Leaves:
  - `sentry` — `@sentry/*` in dependencies AND `SENTRY_DSN` env var defined
  - `datadog` — `dd-trace` or `@datadog/*` in dependencies

**api-docs category:**
- Category condition: API documentation tools detection
- Leaves:
  - `openapi` — `openapi.yaml` / `swagger.yaml` file EXISTS OR swagger dependency present
  - `graphql` — `schema.graphql` EXISTS OR `graphql` in dependencies

**Standalone modules (not categories):**

**monorepo module:**
- Condition: `workspaces` field OR `lerna.json` OR `turbo.json` OR `nx.json` EXISTS
- Status: ACTIVE or INACTIVE

**security module:**
- Condition: API controller or route files exist (e.g. `controllers/`, `routes/` directories)
- Status: ACTIVE or INACTIVE

**Monorepo subproject-based detection (project.type == "monorepo"):**

When a monorepo is detected, module detection runs in TWO stages:

1. **Subproject-based detection:** Run module detection SEPARATELY for each `project.subprojects[]`.
   - Detection context focuses on the subproject root directory (`path`)
   - Example: `express` + `prisma` under `apps/api/`, `django` + `django-orm` under `apps/admin/`
   - Write each subproject result to `subproject.modules`

2. **Global aggregation:** Write the UNION of all subproject modules to `modules.active`.
   - Multiple subprojects may use the same category with different leaves
   - Example: `active.orm: ["prisma", "django-orm"]`, `active.backend: ["nodejs/express", "python/django"]`
   - This way teammates produce ALL required module files

3. **Deploy and standalone modules:** These are NOT subproject-based; they are detected project-wide (deploy config and monorepo/security conditions apply to the whole project).

Example output (Express+Prisma API + Django Admin monorepo):

```
🧩 Modules (Subproject-based):

   apps/api (API):
     orm:      prisma ✅
     backend:  nodejs/express ✅
     mobile:   INACTIVE ⬜
     frontend: INACTIVE ⬜

   apps/admin (Admin):
     orm:      django-orm ✅
     backend:  python/django ✅
     mobile:   INACTIVE ⬜
     frontend: INACTIVE ⬜

   apps/mobile (Mobile):
     orm:      INACTIVE ⬜
     backend:  INACTIVE ⬜
     mobile:   expo ✅
     frontend: INACTIVE ⬜

   Global (aggregation):
     orm:      [prisma, django-orm] ✅
     deploy:   docker ✅
     backend:  [nodejs/express, python/django] ✅
     mobile:   expo ✅
     frontend: INACTIVE ⬜

   Standalone:
     monorepo: ACTIVE ✅
     security: ACTIVE ✅

   Skipped variants: orm: [eloquent, typeorm], backend: [nodejs/fastify, php/laravel], ...
```

**Single project (project.type == "single"):**

No change from existing behavior. Show the result:

```
🧩 Modules:

   Categories:
   orm:        [matched variant ✅ / INACTIVE ⬜]
   deploy:     [matched variant ✅ / INACTIVE ⬜]
   backend:    [active path such as nodejs/express ✅ / INACTIVE ⬜]
   mobile:     [matched variant ✅ / INACTIVE ⬜]
   frontend:   [matched variant ✅ / INACTIVE ⬜]

   Standalone:
   monorepo:   INACTIVE ⬜
   security:   [ACTIVE ✅ / INACTIVE ⬜]

   Skipped variants: [inactive variants listed by category]
```

> **Detected field generation (2.4.1–2.4.5):**
> The 5 subsections below auto-fill `manifest.detected.*` fields. Each detection is written as `{ value, confidence: high|medium|low, source: "<file:detail>" }`. The remaining 3 fields (`formatter`, `linter`, `deploy_platform`) are filled indirectly from the Auto-Detection table in `templates/interview/phase-2-technical.md`.

#### 2.4.1 — test_framework

**Source:** `package.json#devDependencies` or `dependencies`, `Pipfile`, `pyproject.toml`, `composer.json#require-dev`.

**Mapping:**
- `jest` → `value: "jest"`, `confidence: "high"`, `source: "package.json:devDependencies"`
- `vitest` → `value: "vitest"`, `confidence: "high"`, same source
- `mocha` → `value: "mocha"`, `confidence: "high"`, same source
- `pytest` → `value: "pytest"`, `confidence: "high"`, `source: "Pipfile or pyproject.toml"`
- `phpunit/phpunit` → `value: "phpunit"`, `confidence: "high"`, `source: "composer.json:require-dev"`
- No test package → `value: null`, `confidence: "low"`, `source: "no test framework detected"`

#### 2.4.2 — commit_convention

**Source:** `git log --oneline -50` (if empty, `git log --all --oneline -50`).

**Heuristic:**
- Compute the match rate of 50 commits against regex `^(feat|fix|refactor|docs|test|chore|style|perf|ci|build|revert)(\([^)]+\))?!?:`. This pattern catches scoped (`feat(api):`), breaking-change (`feat!:`, `feat(api)!:`), and standard Conventional Commits variants.
- Empty repo (0 commits): `value: "unknown"`, `confidence: "low"`, `source: "git log empty"`
- Match rate `< 30%`: `value: "free"`, `confidence: "low"`, `source: "git log heuristic %X"`
- `30% ≤ rate ≤ 60%`: `value: "conventional"`, `confidence: "medium"`, `source: "git log heuristic %X"`
- Rate `> 60%`: `value: "conventional"`, `confidence: "high"`, `source: "git log heuristic %X"`

**Safety:** The `git log` command is run with `execFileSync('git', ['log', '--oneline', '-50'])` against shell injection.

#### 2.4.3 — migration

**Source (priority order):** (1) `manifest.detected.orm.value` (raw detection before approval), (2) fallback `manifest.stack.orm` (after user approval — re-run scenario), (3) filesystem (`migrations/`, `prisma/migrations/`, `db/migrate/`, `alembic/versions/`).

**Mapping:**
- `detected.orm.value` is not null (Prisma/TypeORM/Sequelize/Drizzle/Eloquent/Django ORM detected) → `value: "orm"`, `confidence: "high"`, `source: "detected.orm.value:{orm_value}"`
- `detected.orm` missing but `manifest.stack.orm` filled (re-run) → `value: "orm"`, `confidence: "high"`, `source: "stack.orm:{orm_value}"`
- No ORM at all but `migrations/` or similar folder exists → `value: "manual-sql"`, `confidence: "medium"`, `source: "migrations/ folder detected"`
- None of the above → `value: "none"`, `confidence: "low"`, `source: "no migration system"`

#### 2.4.4 — auth_method

**Source:** `package.json#dependencies` (Node.js), `Pipfile`/`pyproject.toml` (Python), `composer.json` (PHP).

**Priority order (first match wins):**
- `passport`, `passport-*` → `value: "oauth2"`, `confidence: "medium"`, `source: "package.json: passport"`
- `jsonwebtoken`, `jose`, `bcrypt`, `argon2` → `value: "jwt"`, `confidence: "medium"`, `source: "package.json: {package}"`
- `express-session`, `cookie-session`, `iron-session` → `value: "session"`, `confidence: "medium"`, `source: "package.json: {package}"`
- None → `value: "none"`, `confidence: "low"`, `source: "no auth library detected"`

**Note:** Confidence is `medium` because package presence does not prove the auth method; usage patterns should be confirmed (user approval expected).

#### 2.4.5 — design_system

**Source:** `package.json#dependencies`.

**Priority order (first match wins):**
- `@mui/*` (`@mui/material`, `@mui/x-*`) → `value: "mui"`, `confidence: "high"`, `source: "package.json: @mui/material"`
- `@radix-ui/*` AND `tailwindcss` both present → `value: "shadcn"`, `confidence: "high"`, `source: "package.json: @radix-ui + tailwindcss"`
- `tailwindcss` present but no `@radix-ui/*` → `value: "tailwind"`, `confidence: "medium"`, `source: "package.json: tailwindcss only"`
- `antd` → `value: "antd"`, `confidence: "high"`, `source: "package.json: antd"`
- `react-native-paper` → `value: "rn-paper"`, `confidence: "high"`, `source: "package.json: react-native-paper"`
- None → `value: "none"`, `confidence: "low"`, `source: "no design system detected"`

### 2.5 Script detection

**package.json scripts:** Read the `scripts` section in package.json at the root and in each subproject. Especially: `dev`, `build`, `test`, `lint`, `start`, `format`, `typecheck`, `migrate`

**Makefile:** If a `Makefile` exists at the root, list its targets.

Show the result:

```
📜 Detected scripts:
   [project name]:
     dev:   [command]
     build: [command]
     test:  [command]
     lint:  [command]
```

### 2.6 API endpoint discovery

If a backend API was detected, scan route/controller files and build an endpoint map.

**Priority order:**
1. If an OpenAPI spec exists (`openapi.yaml`, `openapi.json`, `swagger.json`, `swagger.yaml`) → read from the spec, SKIP codebase scan
2. If no spec → scan with framework-specific patterns:

| Framework | Pattern to search | File location |
|---|---|---|
| Express | `app.get/post/put/delete(`, `router.get/post/put/delete(` | `routes/`, `src/routes/`, `app.js`, `server.js` |
| NestJS | `@Get(`, `@Post(`, `@Put(`, `@Delete(` decorators | `*.controller.ts` |
| Laravel | `Route::get/post/put/delete(` | `routes/api.php`, `routes/web.php` |
| CodeIgniter 4 | `$routes->get/post/put/delete(` | `app/Config/Routes.php` |
| FastAPI | `@app.get/post/put/delete(` | `*.py` |

For each found endpoint:
```yaml
api_endpoints:
  - method: GET
    path: /api/v1/users
    auth: required   # if Authorization middleware/guard present
    response: 200
```

**Auth detection:** If the route definition contains the words `auth`, `authenticate`, `guard`, or `middleware`, set `auth: required`.

Show the result:
```
🔍 API endpoint discovery:
   Source: [OpenAPI spec / Express routes / NestJS controllers / ...]
   Found: [X] endpoints
   Auth required: [Y] endpoints
```

If no endpoints are found, skip — the smoke test fallback (health + status) is used.

### 2.7 Analysis summary and single approval

Show a two-part summary: first the general analysis summary, then the `manifest.detected.*` table, then take bulk approval with **a single AskUserQuestion**. Design rule: information that can be confidently extracted from code analysis (test framework, ORM, migration system, etc.) is not asked one-by-one in the STEP 3 interview; it is shown in the bulk table and passed with a single approval. Only subjective questions not visible in code (project description, developer profile, domain rules, security level) are asked one-by-one.

**Section 0 — Early-exit check (done first):**

If `GREENFIELD_MODE = true`, **NO** STEP 2.7 output is produced (including Section 1). A single-line message is written: "Greenfield mode — analysis summary skipped; all interview questions will be asked." Then go directly to STEP 3; all skip conditions in STEP 3 are cancelled.

If `GREENFIELD_MODE = false`, the flow continues from Section 1.

**Section 1 — General summary (shown when not GREENFIELD):**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Codebase analysis result
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project type:   [type]
Runtime:        [runtime]
Subprojects:    [count]
Active modules: [list]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Section 1.5 — Detected field validation:**

Before Section 2, run the following validations for **every field** in `manifest.detected`:

1. `value` is present, not `null`, and not an empty string.
2. `source` is present and of string type.
3. `confidence` is **exactly** one of this enum: `high`, `medium`, `low`. Any other value (e.g. `unknown`, `medium-high`, number, empty) is rejected.

**Behavior:**
- Fields that fail validation are **not shown** in the table and are **not copied** into final manifest fields on "Yes" approval.
- For those fields, the related question is asked to the user in STEP 3 (skip condition cancelled — the question is always shown).
- If one or more fields are invalid, write a one-line warning to stderr: `[WARN] manifest.detected.<field> invalid (confidence|value|source) — interview fallback`.
- If no field passes validation, treat `manifest.detected` as empty → skip Section 2 and Section 3; STEP 3 runs with all questions.

**Section 2 — Detected fields table (when manifest.detected is not empty):**

If at least one field in `manifest.detected` is filled, show the table below:

```
🔍 Detected fields:
┌─────────────────────┬────────────────────────────────────┬────────┬────────────────────────────────┐
│ Field               │ Value                              │ Conf.  │ Source                         │
├─────────────────────┼────────────────────────────────────┼────────┼────────────────────────────────┤
│ test_framework      │ {detected.test_framework.value}    │ {…}    │ {detected.test_framework.source}│
│ formatter           │ {detected.formatter.value}         │ {…}    │ {detected.formatter.source}     │
│ linter              │ {detected.linter.value}            │ {…}    │ {detected.linter.source}        │
│ orm                 │ {detected.orm.value}               │ {…}    │ {detected.orm.source}           │
│ migration           │ {detected.migration.value}         │ {…}    │ {detected.migration.source}     │
│ auth_method         │ {detected.auth_method.value}       │ {…}    │ {detected.auth_method.source}   │
│ design_system       │ {detected.design_system.value}     │ {…}    │ {detected.design_system.source} │
│ deploy_platform     │ {detected.deploy_platform.value}   │ {…}    │ {detected.deploy_platform.source}│
│ commit_convention   │ {detected.commit_convention.value} │ {…}    │ {detected.commit_convention.source}│
└─────────────────────┴────────────────────────────────────┴────────┴────────────────────────────────┘
```

**Low-confidence display:** For fields with `confidence: low`, append a label in the "Value" column. Example: `conventional [low confidence]`. When the user sees this mark they validate the value more carefully.

**Empty field behavior:** If `manifest.detected.<field>` is missing or `value` is `null`/empty, that row is not shown in the table at all (the field is fully omitted; do not write "—").

**Section 3 — Single approval question (when Section 2 was shown):**

Call the `AskUserQuestion` tool with these parameters:

```yaml
question: "Are the detections above correct?"
header: "Detection approval"
multiSelect: false
options:
  - label: "Yes, all correct"
    description: "All detections shown in the table are written into the manifest as-is; questions for these fields are skipped in STEP 3; only subjective questions are asked."
  - label: "I will correct"
    description: "I want to choose which fields are wrong (multiSelect flow — implemented under TASK-211/T1b)."
```

**"Yes, all correct" answer:** `manifest.detected.<field>.value` values are copied to the related final fields:
- `detected.test_framework.value` → `stack.test_framework` (and `workflows.test_strategy` is derived: `tests-exist` if a framework exists, otherwise `none`)
- `detected.formatter.value` → `stack.formatter`
- `detected.linter.value` → `stack.linter`
- `detected.orm.value` → `stack.orm`
- `detected.migration.value` → `stack.migration_strategy` (and `workflows.migration_strategy`)
- `detected.auth_method.value` → `stack.auth_method`
- `detected.design_system.value` → `rules.design_system`
- `detected.deploy_platform.value` → `environments[*].deploy_platform`
- `detected.commit_convention.value` → `workflows.commit_convention`
- `rules.db_migration_required` → written as `true` by default. If the user explicitly says during STEP 3 or domain rules that they do not want DB migration discipline, set to `false`; otherwise it stays true.

In STEP 3, questions for these fields are skipped; only subjective questions (project description, developer profile, domain rules, extra notes) are asked.

**"I will correct" answer:** The **Section 4 — Correction flow** below is triggered.

**Section 4 — Correction flow (multiSelect):**
This section runs ONLY if the user chose "I will fix" in Section 3.

**Step 4.1 — Valid field list:** `valid = [detected keys that passed Section 1.5]`. This list is the fields shown in the table (i.e. a 1–8 element subset).

**Step 4.2 — Question form (dynamic):**

Choose the question based on `valid.length`:

| `valid.length` | Method | Detail |
|---|---|---|
| 0 | End of flow | Section 4 is skipped silently (Sections 2/3 should already have been skipped). |
| 1 | Single question, 2 options | `AskUserQuestion` single question, `multiSelect: false`. Options: "Wrong, ask the question" / "Correct, write to manifest". **Mapping:** "Wrong" → `wrong = [valid[0]]`; "Correct" → `wrong = []`. |
| 2-4 | Single question, multiSelect | `AskUserQuestion` single question, `multiSelect: true`, options are `valid` field names. |
| 5-8 | Two questions, multiSelect | `AskUserQuestion` single call with 2 questions (set 1: first 4 fields, set 2: remaining 4 fields), both `multiSelect: true`. |

**5–8 field example (questions parameter):**

```yaml
questions:
  - question: "Select the incorrect fields (Set 1):"
    header: "Fix 1"
    multiSelect: true
    options:
      - label: "test_framework"
        description: "Current: {detected.test_framework.value}"
      - label: "formatter"
        description: "Current: {detected.formatter.value}"
      - label: "linter"
        description: "Current: {detected.linter.value}"
      - label: "orm"
        description: "Current: {detected.orm.value}"
  - question: "Select the incorrect fields (Set 2):"
    header: "Fix 2"
    multiSelect: true
    options:
      - label: "auth_method"
        description: "Current: {detected.auth_method.value}"
      - label: "design_system"
        description: "Current: {detected.design_system.value}"
      - label: "deploy_platform"
        description: "Current: {detected.deploy_platform.value}"
      - label: "commit_convention"
        description: "Current: {detected.commit_convention.value}"
```

**Set split:** First 4 from the `valid` list → Set 1, next 4 → Set 2. If fewer remain, Set 2 is not created. Ordering is deterministic (manifest.detected key order).

**Step 4.3 — Result handling:**

`raw = [all labels selected by the user]` (union of both sets).

**Normalize:** `wrong = unique(raw ∩ valid)` — i.e. from `raw`, take **only field names that are in the `valid` set and unique**. If a label outside `valid` (Other/free text/unexpected value) or a duplicate arrives:
- Warn on stderr: `[WARN] Correction flow: invalid selection skipped: {label}`
- That label is **not added** to the `wrong` list (silently ignored; the question is not re-asked).

`correct = valid - wrong`.

- For fields in `correct`, `detected.<field>.value` is **copied** to the related final manifest field (copy list from Section 3). In STEP 3, questions for these fields are **skipped**.
- For fields in `wrong`, there is **no copy**. In STEP 3, questions for those fields are **always asked** (skip condition cancelled).
- If `wrong` is empty ("Correct, write to manifest" selected or nothing checked): same behavior as the "Yes" flow in Section 3 (all `valid` fields are copied, related questions skipped).

**Step 4.4 — Info message (before continuing):**

Write a short summary to stdout:
```
✅ Confirmed fields: [correct list comma-separated]
❓ Will re-ask: [wrong list comma-separated]
```

If `wrong` is empty, the "Will re-ask" line is not shown.

---

**GREENFIELD mode (check before Section 1.5):**

If `GREENFIELD_MODE = true` (detected in STEP 1, empty Codebase indicator) `manifest.detected` is already empty from the start → **Sections 1.5, 2, 3, 4 are skipped entirely**. Write this message under Section 1: "Greenfield mode — all interview questions will be asked." Then proceed directly to STEP 3; all skip conditions in STEP 3 are cancelled (every question is asked).

**Detected empty + not GREENFIELD:** This occurs if T3 (TASK-212) is not yet complete, or all fields drop out of Section 1.5 validation. In this case Sections 2/3/4 are also skipped, and STEP 3 runs with all questions (same fallback as greenfield).

---

## STEP 3 — PHASED INTERVIEW

> **🔗 SLIM PATH (init stitch) active** (STEP 1.3) skip this entire step — `bin/init.js` already ran the interview deterministically in the terminal and wrote answers into the manifest. Proceed directly to STEP 5.

**RULES:**
1. **Question grouping:**
   - **Detectable questions** (test_framework, commit_convention, migration, auth, design_system, etc.) are confirmed in the bulk table in STEP 2.7 — they are not asked one-by-one in STEP 3.
   - **Subjective multiple-choice questions** (experience, language, autonomy, team, security, CLI targets, etc.) that are related are asked **together in a single call** via `AskUserQuestion`'s 4-question batch support. Phase 3 S1–S4 → single call (4 elements); Phase 4 S2+S4+S5 → single call (3 elements).
   - **Free-text questions** stay separate and are not batched. Each is asked with its own `>` prompt. List: Phase 1 S1 (project description), Phase 4 S1 (forbidden commands), Phase 4 S3 (domain rules), Phase 4 S6 (extra notes).
2. First show information detected in the previous step — continue once the user confirms or corrects.
3. Skip questions that were detected and do not need confirmation (after STEP 2.7 approval, if `manifest.detected.<field>.confidence == "high"` then skip; see phase-2-technical.md/phase-4-rules.md skip conditions).
4. Use multiple-choice (a/b/c/d) format wherever possible.
5. Take the user's answer, save it, move to the next step (in a batch, all answers are taken at once).
6. Show the phase title at the start of each phase.
7. **Ask all multiple-choice questions with the `AskUserQuestion` tool — do not use a plain text `>` prompt.** Immediately under each question's Markdown block there is an "AskUserQuestion call" template; use that template as the tool parameters. Constraints:
   - Each question must have 2–4 options. If there are 5+ options, show the most popular 4 — "Other" is added automatically (do not add manually).
   - `multiSelect: true` → when multiple selections are needed (e.g. stack, target CLI tools).
   - `header` max 12 character short label (shown as a chip).
   - If the user selects "Other", write the free text they provide into the manifest as-is.
   - **Questions that need free text** (project description, domain rules, extra notes, etc.) do not use AskUserQuestion — keep asking with a `>` prompt.
   - Move "Detected: ..." hints into the `description` field in shortened form; if needed, also add them in parentheses in the question text.

`templates/interview/phase-{N}-*.md` files are **required**:
- In STEP 1.4, file existence + type validation is performed (fs.statSync + isFile); if missing or invalid, Bootstrap **stops immediately** and lists the gaps.
- In STEP 3 these files are read and question blocks are processed from them.
- There is **no** inline default question definition inside Bootstrap.md — and no fallback mechanism. The sole source is the phase files.

### Phase 1 — Project Fundamentals
*This phase collects data for `PROJECT.md` and `ARCHITECTURE.md`.*

Question blocks **source**: `templates/interview/phase-1-project.md`. Bootstrap reads that file and processes Q1–Q5 (project description, environments, deploy, subproject roles, API prefix) in order. Question details (text, options, skip conditions, manifest mapping) live in the phase template file.

> **If GREENFIELD_MODE = true** the extra Q0 (stack selection) question in `phase-1-project.md` is asked and all questions are processed with no skip conditions.

### Phase 2 — Technical Preferences
*This phase collects data for `STACK.md` and `WORKFLOWS.md`.*

Question blocks **source**: `templates/interview/phase-2-technical.md`. Bootstrap processes Q1–Q7 (test strategy, branch model, commit convention, migration, format hook, auth, naming). For fields that passed STEP 2.7 bulk approval, `confidence:high → skip` is applied (test_framework, commit_convention, migration, auth_method). Details are in the phase template skip conditions section.

### Phase 3 — Developer Profile
*This phase collects data for `DEVELOPER.md`.*

Question blocks **source**: `templates/interview/phase-3-developer.md`. All 4 questions are subjective; they are asked as 4 elements in a single `AskUserQuestion` batch call (Level + Language + Autonomy + Team). Header-based mapping; details in the phase template "Batch Delivery" section.

### Phase 4 — Domain Rules
*This phase collects data for `rules/` files.*

Question blocks **source**: `templates/interview/phase-4-rules.md`. Order:
- Q1 (forbidden commands) → free-text `>` prompt
- **[Q2 + Q4 + Q5] single batch call (3 elements):** design system + security + CLI targets. Header-based mapping. No skip for design_system (TASK-209/T5).
- Q3 (domain rules) → free-text `>` prompt
- Q6 (extra notes) → free-text `>` prompt


When the interview completes:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Interview complete!
   Creating the manifest now...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> **Interaction count (after T2):** For a brownfield project (all `manifest.detected.*` confidence:high) STEP 3 interaction count: ~7–8 (down from previous ~20). Phase 1: 1 batch + 1 free-text + optional S0 stack; Phase 2: mostly skip (fields covered by STEP 2.7 approval); Phase 3: 1 batch (4 questions in one call); Phase 4: 1 batch (3 questions in one call) + 3 free-text. On greenfield or low-detection projects the count naturally rises (because skip coverage drops).

---

## STEP 4 — MANIFEST CREATION

> **🔗 SLIM PATH (init stitch) active** (STEP 1.3) skip this step — the manifest was created deterministically by `bin/init.js` and validated with `templates/manifest.schema.js`. Use the existing manifest as-is.

Combine all collected data to create the `../Docbase/agentic/project-manifest.yaml` file.

Important: First ensure the `../Docbase/agentic/` directory exists; create it if not.

### Manifest Structure

Fill the YAML template below. Write `null` for empty fields; remove unknown fields entirely.

**YAML Safety Rules:**
- Free-text fields (description, reason, rule, domain rules) MUST be written in quotes: `"value"`
- Double quotes are REQUIRED for values containing YAML special characters (`: # - | > [ ] { }`)
- Use a YAML literal block scalar (`|`) for multi-line values
- Prefer an env var reference instead of writing production URLs directly: `"$PROD_URL or taken from .env"`
- When writing user answers into the manifest, preserve content AS-IS but format it YAML-safe

```yaml
manifest:
  version: "1.0.0"
  template_version: "1.1.0"  # 1.0.0 → 1.1.0: interview phase files required (TASK-214). Backward compatible — old manifests are auto-bumped in 'overwrite' mode.
  generated_at: "[date-time]"
  generation_mode: "[fresh|overwrite|merge|incremental]"
  managed_files:
    - path: ".claude/commands/task-hunter.md"
      checksum: "sha256:[file-digest]"

project:
  name: "[project name]"
  description: "[from S1 answer]"
  type: "[single|monorepo]"
  language: "[primary language]"
  team_size: "[solo|small-team|large-team]"
  security_level: "[standard|high|critical]"
  api_prefix: "[/api|/api/v1|/v1|null]"
  subprojects:
    - name: "[subproject name]"
      path: "[relative path]"
      role: "[api|mobile|web|admin|worker|shared|legacy]"
      stack: "[short stack description]"
      test_command: "[test command]"
      build_command: "[build command]"
      dev_command: "[dev command]"
      modules:                                            # subproject-based module detection (monorepo)
        orm: "[matching leaf path or null]"
        backend: "[matching leaf path or null]"
        frontend: "[matching leaf path or null]"
        mobile: "[matching leaf path or null]"

detected:                                                 # STEP 2.4 output — raw detections awaiting user approval (implemented by T3/TASK-212)
  # Each field: { value, confidence: high|medium|low, source: "<file:detail>" }
  # Reflected in the STEP 2.7 table; on "Yes, all correct" approval, value fields are copied into stack/workflows/rules/environments fields.
  # In greenfield mode or before T3 completes this block stays fully empty → STEP 2.7 Sections 2/3 are skipped.
  test_framework:    { value: "[jest|vitest|mocha|pytest|phpunit|null]", confidence: "[high|medium|low]", source: "[example: package.json:devDependencies]" }
  formatter:         { value: "[prettier|biome|ruff|null]",              confidence: "[high|medium|low]", source: "[package or config file]" }
  linter:            { value: "[eslint|biome|ruff|null]",                confidence: "[high|medium|low]", source: "[package or config file]" }
  orm:               { value: "[prisma|typeorm|sequelize|drizzle|eloquent|django-orm|null]", confidence: "[high|medium|low]", source: "[package]" }
  migration:         { value: "[orm|manual-sql|none]",                   confidence: "[high|medium|low]", source: "[detected.orm or migrations/ directory]" }
  auth_method:       { value: "[jwt|oauth2|session|api-key|none]",       confidence: "[high|medium|low]", source: "[package: passport/jsonwebtoken/express-session]" }
  design_system:     { value: "[mui|shadcn|tailwind|antd|rn-paper|none]", confidence: "[high|medium|low]", source: "[package combination]" }
  deploy_platform:   { value: "[github-actions|gitlab-ci|vercel|docker|none]", confidence: "[high|medium|low]", source: "[CI file or config]" }
  commit_convention: { value: "[conventional|free|unknown]",             confidence: "[high|medium|low]", source: "[git log heuristic %X — 50 commit sample]" }

stack:
  runtime: "[node|python|go|rust|php|java]"
  runtime_version: "[version — if detectable]"
  package_manager: "[npm|yarn|pnpm|bun|composer|pip|cargo]"
  typescript: [true|false]
  test_framework: "[jest|vitest|mocha|pytest|phpunit|null]"
  formatter: "[prettier|biome|ruff|null]"
  linter: "[eslint|biome|ruff|null]"
  orm: "[prisma|typeorm|sequelize|drizzle|eloquent|null]"
  database: "[mysql|postgres|sqlite|mongodb|null]"
  auth_method: "[jwt|oauth2|session|api-key|none]"

environments:
  - name: "local"
    api_url: "[local url]"
  - name: "staging"
    api_url: "[staging url — if any]"
  - name: "production"
    api_url: "[production url — if any]"
    deploy_platform: "[platform]"
    deploy_trigger: "[trigger]"

developer:
  experience: "[junior|mid|senior|new-to-stack]"
  autonomy: "[ask-every-step|plan-then-auto|full-auto]"
  communication_language: "[tr|en|other]"        # communication language (Phase 3 Q2 result); manifest.project.language is a separate field for CODE language (TypeScript/Python/...).

targets: ["claude"]                                       # claude is the canonical source; others are transform targets. example: [claude, gemini, antigravity, codex, kimi]

workflows:
  branch_model: "[direct-push|feature-pr|gitflow|trunk]"
  commit_convention: "[conventional|free|custom]"
  commit_prefix_map:
    feat: "New feature"
    fix: "Bug fix"
    refactor: "Refactor"
    docs: "Documentation"
    test: "Test"
    chore: "Maintenance"
    style: "Style/format"
    perf: "Performance"
    ci: "CI/CD"
  test_strategy: "[tdd|tests-exist|minimal|none]"
  auto_format_hook: [true|false]
  migration_strategy: "[orm|manual-sql|none|null]"
  ci_pipeline: "[github-actions|gitlab-ci|jenkins|null]"  # auto-detect: .github/workflows/, .gitlab-ci.yml

conventions:
  naming: "[camelCase|snake_case|PascalCase|custom]"       # variable/function naming
  file_naming: "[kebab-case|snake_case|PascalCase|custom]" # file naming
  component_naming: "[PascalCase|null]"                     # React/Vue component naming (if any)
  commit_language: "[tr|en]"                                # commit message language
  commit_format: "[conventional|free|custom]"               # commit message format
  docblock: "[required|optional|none]"                      # docblock/jsdoc requirement

modules:
  # Single project: Each category selects a single leaf.
  # Monorepo: UNION of all subproject.modules values. For example if api/ uses prisma + admin/ uses django-orm
  # then active.orm: [prisma, django-orm]. This way all required module files are produced.
  active:
    orm: "[leaf or leaf list]"                 # single: "prisma", monorepo: ["prisma", "django-orm"]
    deploy: "[leaf or leaf list]"              # example: "docker"
    backend: "[leaf or leaf list]"             # single: "nodejs/express", monorepo: ["nodejs/express", "python/django"]
    mobile: "[leaf or leaf list]"              # example: "expo"
    frontend: "[leaf or leaf list]"            # example: "nextjs"
    ci-cd: "[leaf or leaf list or null]"      # example: "github-actions"
    monitoring: "[leaf or leaf list or null]"  # example: "sentry"
    api-docs: "[leaf or leaf list or null]"   # example: "openapi"
  standalone: ["[active standalone modules]"]          # example: [monorepo, security]
  skipped:
    orm: ["[unmatched leaves]"]                  # example: [eloquent, typeorm]
    deploy: ["[unmatched leaves]"]               # example: [vercel]
    backend: ["[unmatched leaf paths]"]          # example: [nodejs/fastify, php/laravel]
    mobile: ["[unmatched leaves]"]               # example: [react-native]
    frontend: ["[unmatched leaves]"]             # example: [react]
    ci-cd: ["[unmatched leaves]"]                # example: [gitlab-ci]
    monitoring: ["[unmatched leaves]"]            # example: [datadog]
    api-docs: ["[unmatched leaves]"]             # example: [graphql]

rules:
  db_migration_required: true                         # Default true; false only if the user explicitly says no
  forbidden:
    - command: "[forbidden command]"
      reason: "[reason]"
      hook_type: "pre-commit"
  domain:
    - name: "[rule name]"
      rule: "[rule description]"
  design_system: "[mui|shadcn|tailwind|antd|rn-paper|<custom>|none]"   # Default 'none' (not used); null is DEPRECATED but backward compatible — if null is seen it is treated as equivalent to 'none'.
```

Compatibility rule:

- If `manifest.version` major matches the expected major, `merge` and `incremental` are supported.
- If `manifest.version` is missing or the major differs, the manifest is considered incompatible; only `overwrite` or cancel are offered.
- Within the same major, if fields are missing, fill defaults, bump the manifest to the new version, and continue.

#### Example: Monorepo Multi-Stack Scenario

Manifest example for a monorepo containing an Express+Prisma API and a Django Admin:

```yaml
project:
  name: "acme-platform"
  type: "monorepo"
  language: "TypeScript + Python"
  subprojects:
    - name: "api"
      path: "apps/api"
      role: "api"
      stack: "Node.js + Express + Prisma + PostgreSQL"
      test_command: "cd apps/api && npm test"
      build_command: "cd apps/api && npx tsc --noEmit"
      dev_command: "cd apps/api && npm run dev"
      modules:
        orm: "prisma"
        backend: "nodejs/express"
        frontend: null
        mobile: null
    - name: "admin"
      path: "apps/admin"
      role: "admin"
      stack: "Python + Django + Django ORM + PostgreSQL"
      test_command: "cd apps/admin && python manage.py test"
      build_command: "cd apps/admin && python manage.py check"
      dev_command: "cd apps/admin && python manage.py runserver"
      modules:
        orm: "django-orm"
        backend: "python/django"
        frontend: null
        mobile: null
    - name: "mobile"
      path: "apps/mobile"
      role: "mobile"
      stack: "TypeScript + Expo + React Native"
      test_command: "cd apps/mobile && npx jest"
      build_command: "cd apps/mobile && npx tsc --noEmit"
      dev_command: "cd apps/mobile && npx expo start"
      modules:
        orm: null
        backend: null
        frontend: null
        mobile: "expo"

modules:
  active:
    orm: ["prisma", "django-orm"]
    deploy: "docker"
    backend: ["nodejs/express", "python/django"]
    mobile: "expo"
    frontend: null
  standalone: ["monorepo", "security"]
```

In this configuration:
- Teammate 2 produces both Prisma and Django ORM rule files, both Express and Django backend rule files, and Expo rule files
- The VERIFICATION_COMMANDS block contains test/build/lint commands for 3 separate subprojects
- IMPLEMENTATION_RULES carries rules specific to each subproject's stack

### Manifest Approval

Show the created manifest to the user as YAML and ask for approval:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Project Manifest
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[show YAML content]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Is this manifest correct?
  a) Yes, continue
  b) I want to make a correction (what?)
>
```

- If `b` is selected → take the user's correction, update the manifest, show again.
- If `a` is selected → write the manifest as `../Docbase/agentic/project-manifest.yaml` and continue.

```
✅ Manifest written: ../Docbase/agentic/project-manifest.yaml
```

---

## STEP 5 — FILE CREATION (TEAMMATE MODE)

**IMPORTANT:** This step runs in parallel via the TEAMMATE mechanism. The Lead (you) spawns teammates; each produces an independent file group. This approach provides both speed and consistency — each teammate's context stays clean and focused.

### 5.0 Directory Structure Creation

First ensure the target directories exist:

```bash
mkdir -p .claude/{commands,agents,hooks,rules,reports/deploys,tracking/errors} .claude/custom/{commands,agents,hooks,rules,_rescued} git-hooks
```

`templates/core/rules/db-migration-discipline.skeleton.md` is ALWAYS processed and copied as `.claude/rules/db-migration-discipline.md`. This rule is universal; it is produced even if the ORM module is not active.

### 5.1 Teammate Spawn Plan

Prepare the manifest data and the active module list. Then spawn the following 5 teammates in PARALLEL. Give each teammate the FULL manifest data + the related skeleton file paths.

**CRITICAL:** Teammates do NOT write to Codebase. They write only to Agentbase/.claude/ and the Agentbase/ root directory.

```
Lead (you)
  │
  ├──► Teammate 1: core-generator (Agent tool)
  │    Task: Process core command, agent and rule skeletons,
  │           produce specialist agents based on stack and subproject
  │    Input: manifest + templates/core/commands/*.skeleton.md
  │                     + templates/core/agents/*.skeleton.md
  │                     + templates/core/rules/*.md (fixed) and *.skeleton.md
  │    Output: .claude/commands/ (16 core command files)
  │           .claude/agents/ (8 core + specialist agents)
  │           .claude/rules/ (core rule files; db-migration-discipline.md always included)
  │    SPECIALIST AGENT PRODUCTION (see 5.1.2):
  │
  ├──► Teammate 2: module-generator (Agent tool)
  │    Task: Process skeletons of active modules
  │    Input: manifest.modules.active list
  │           + files under templates/modules/{category}/{variant}/ for each active module
  │    Output: Module commands/ → .claude/commands/
  │           Module agents/ → .claude/agents/
  │           Module rules/ → .claude/rules/
  │    NOTE: Process only ACTIVE module files. SKIP passive modules.
  │         In a monorepo, produce files for ALL leaves from modules.active lists
  │         (e.g. if active.orm: ["prisma", "django-orm"] process both modules' rule files).
  │         When filling GENERATE blocks, read which subproject uses which module
  │         from manifest.project.subprojects[].modules.
  │
  ├──► Teammate 3: hook-generator (Agent tool)
  │    Task: Process core + module hooks, convert user forbids into hooks,
  │           produce git hooks (pre-commit, pre-push)
  │    Input: manifest (including forbids)
  │           + templates/core/hooks/*.skeleton.js
  │           + templates/core/git-hooks/*.skeleton (pre-commit, pre-push)
  │           + files in active modules' hooks/ directories
  │    Output: .claude/hooks/ (core + module hooks)
  │           git-hooks/ (pre-commit, pre-push — for Codebase git operations)
  │    REPORT: List the produced hook file paths (.claude/hooks/*.js) to the Lead —
  │           the Lead uses this list when assembling settings.json (see 5.2.2).
  │    NOTE: For every "block" type forbid in manifest.rules.forbidden
  │         add a jq blocking rule to the PreToolUse(Bash) hook.
  │         For every "warn" type forbid add a warning to the PostToolUse(Edit|Write) hook.
  │    JS MARKER FORMAT: Hook skeleton files (.js) use a different marker
  │         format than MD. JS comment syntax instead of HTML comments:
  │           /* GENERATE: BLOCK_NAME ... */  →  marker start
  │           /* END GENERATE */              →  marker end
  │         Wrapper lines (// ─── GENERATE SECTION START/END ───)
  │         are informational and must be preserved.
  │
  ├──► Teammate 4: config-generator (Agent tool)
  │    Task: Produce .claude/ config files with generate.js
  │    Input: manifest + templates/core/ (CLAUDE.md.skeleton, settings.skeleton.json, claude-ignore.skeleton)
  │    Output: .claude/CLAUDE.md
  │           .claude/settings.json
  │           .claude-ignore
  │    NOTE: Fill GENERATE blocks in CLAUDE.md.skeleton from the manifest.
  │         The Backlog CLI guide stays FIXED; project info goes into GENERATE blocks.
  │         .mcp.json is REQUIRED to be produced from `templates/core/mcp.skeleton.json` — it contains the basic-memory MCP entry.
  │         basic-memory vault init procedure (idempotent + fail-loud):
  │           1) VAULT_DIR="$(cd .. && pwd -P)/Docbase/memory"  # canonical, space-safe
  │           2) PROJ_NAME=manifest.project.name (else directory name). Reserved chars are sanitized.
  │           3) mkdir -p "$VAULT_DIR" || { echo "❌ vault mkdir failed"; exit 1; }
  │           4) Conflict detection: parse existing projects with `uvx basic-memory project list --json`.
  │              - If `$PROJ_NAME` is not in the list: call `uvx basic-memory project add "$PROJ_NAME" "$VAULT_DIR"`.
  │                If exit code is not 0, show stderr + STOP (no silent overwrite risk).
  │              - If it IS in the list and points to the same path: idempotent — skip.
  │              - If it IS in the list but points to a different path: try a new name with `${PROJ_NAME}-$(date +%s)` suffix.
  │           5) If `--json` output is unavailable (older version) fallback: check `project list` output with the `^$PROJ_NAME ` regex.
  │           All path arguments are ALWAYS quoted ("$VAULT_DIR", "$PROJ_NAME") — prevents silent branching on space/symlink paths.
  │
  └──► Teammate 5: root-generator (Agent tool)
       Task: Produce root documentation files
       Input: manifest + codebase analysis results (from Step 2)
       Target directory: **Agentbase ROOT** (i.e. `./` — NOT under `.claude/`; NEVER write to Codebase — Invariant rule 2)
       Output: ./PROJECT.md
              ./STACK.md
              ./DEVELOPER.md
              ./ARCHITECTURE.md
              ./WORKFLOWS.md
       NOTE: These files are produced from scratch (skeleton is NOT used).
            Filled with information from the manifest + codebase analysis.
            **CRITICAL PATH RULE:** Output paths start from Agentbase root. Do NOT write `.claude/PROJECT.md` — that is the wrong location. Correct: `Agentbase/PROJECT.md` (i.e. just `PROJECT.md` when cwd is Agentbase).
            Target: Agentbase ROOT — do NOT write to Codebase root, do NOT write under `.claude/`.

### 5.1.2 Specialist Agent Production

In addition to core skeleton agents, core-generator (Teammate 1) produces **specialist agents** based on stack and subproject. These agents are domain-specific specialists that task-hunter can spawn as teammates.

#### Which Specialist Agents Are Produced?

| Condition | Agent to Produce | Source Skeleton |
|-------|------------------|-----------------|
| `stack.runtime` is backend (node, php, python, go, rust, java) | `backend-expert.md` | `templates/core/agents/backend-expert.skeleton.md` |
| `modules.active.mobile` present | `mobile-expert.md` | `templates/core/agents/mobile-expert.skeleton.md` |
| `modules.active.frontend` present | `frontend-expert.md` | `templates/core/agents/frontend-expert.skeleton.md` |

#### Monorepo: Subproject-Based Agent Production

When a monorepo is detected (`project.type == "monorepo"`), core-generator produces additional agents for each subproject by **cloning and specializing** the related specialist skeleton:

1. Scan the `manifest.project.subprojects[]` list for each subproject
2. Select the source skeleton based on the subproject's `role` field:
   - `role: api | worker | backend` → `backend-expert.skeleton.md`
   - `role: mobile` → `mobile-expert.skeleton.md`
   - `role: web | admin | frontend` → `frontend-expert.skeleton.md`
3. Process the skeleton and write the output file as `{subproject.name}-expert.md`
4. Fill GENERATE blocks subproject-specifically:
   - `CODEBASE_CONTEXT` → only that subproject's directory structure and stack
   - Framework rules → only that subproject's framework
5. Update the agent frontmatter:
   - `name: {subproject.name}-expert` (e.g. `api-expert`, `mobile-expert`, `admin-expert`)
   - `tools`, `model`, `color` are inherited from the source skeleton

**Example:** If `project.subprojects` contains api (Express), mobile (Expo), admin (Django):
- `api-expert.md` ← backend-expert.skeleton + Express rules
- `mobile-expert.md` ← mobile-expert.skeleton + Expo rules
- `admin-expert.md` ← backend-expert.skeleton + Django rules

**NOTE:** For a single project, subproject-based agent production is SKIPPED. Only stack-based generic agents are produced.

**NOTE:** Subproject-based agent names MUST NOT collide with existing core agent names (code-review, regression-analyzer, service-documentation).

### 5.1.1 Hybrid Mode: Script-First Approach

Skeleton processing runs in two stages — first the deterministic script, then the active host:

**Step A — Deterministic Processing (generate.js):**

```bash
cd Agentbase && node generate.js ../Docbase/agentic/project-manifest.yaml --verbose
```

The script does the following:
1. Reads Manifest.yaml
2. Scans skeleton files based on active modules
3. Fills **simple GENERATE blocks** deterministically (command tables, path lists, extension arrays, etc.)
4. Marks **complex GENERATE blocks** with a `<!-- CLAUDE_FILL: BLOCK_NAME -->` marker
5. Writes output files after removing the `.skeleton` extension
6. Emits a report: how many blocks were filled, how many were left for the active host

**Step A.2 — Multi-CLI Transform (transform.js):**

If the `targets` field in the manifest contains values other than `claude`:

```bash
cd Agentbase && node transform.js ../Docbase/agentic/project-manifest.yaml --verbose
```

If only `claude` is present or the `targets` field is missing, SKIP this step.

Show the transform report output to the user. This step converts `.claude/` output into other CLI formats (`.gemini/`, `.agents/`, `.codex/`, `.kimi/`, `.opencode/`).

**Codex decision:** A second Codex bootstrap is NOT run. `codex` in `manifest.targets` is only a transform target; the canonical source remains the `claude` output. If Codex is selected, transform produces `.codex/skills/*/SKILL.md` and `AGENTS.md`. After transform completes, optionally suggest the `/codex-verify` step to the user:

```
/codex-verify
```

This pass audits the manifest and the produced Codex target surface; it does not restart bootstrap, the manifest, or the backlog. If only `targets: [claude]` is set, both transform and Codex verify/adapt are skipped.

**Simple blocks filled by the script:**
`COMMIT_CONVENTION`, `VERIFICATION_COMMANDS`, `TEST_COMMANDS`, `COMPILE_COMMANDS`, `BUILD_COMMANDS`, `DETECTED_ORM`, `MIGRATION_COMMANDS`, `DRY_RUN_COMMAND`, `ROLLBACK_COMMAND`, `FILE_EXTENSIONS`, `CODE_EXTENSIONS`, `MEMORY_PATH`, `PRISMA_PATH`, `LARAVEL_PATHS`, `DJANGO_PATHS`, `TYPEORM_PATHS`, `SECURITY_PATTERNS`, `LAYER_TESTS`, `SUBPROJECT_CONFIGS`, `STACK_SPECIFIC_IGNORES`, `DEPLOY_LOG_PATH`, `HEALTH_CHECK_URL`, `SMOKE_TEST_ENDPOINTS`, `API_SMOKE_SCRIPT`, `API_SMOKE_NODE_TESTS`, `TASK_ROUTING_CONFIG`, `GIT_PRECOMMIT_COMPILE`, `GIT_PRECOMMIT_TEST`, `GIT_PRECOMMIT_LINT`, `GIT_PRECOMMIT_FORMAT`, `GIT_PREPUSH_LOCALHOST`, `GIT_PREPUSH_MIGRATION`, `GIT_PREPUSH_ENV`, `GIT_PREPUSH_DESTRUCTIVE`

**Complex blocks left for the active host (marked with CLAUDE_FILL):**
`CODEBASE_CONTEXT`, `PROJECT_CHECKLIST`, `IMPLEMENTATION_RULES`, `PROJECT_SPECIFIC_RULES`, `REVIEW_CHECKLIST`, `FILE_DISCOVERY_HINTS`, `FILE_DETECTION_PATTERNS`, `AC_TEMPLATES`, `DEPLOY_TOPOLOGY`, `DEPLOY_STEPS`, `ENVIRONMENT_DIFFERENCES`, `HOOK_BEHAVIORS`, `CRITICAL_RULES`, `PROJECT_CONVENTIONS`, `STYLING_APPROACH`, `ROUTER_TYPE`, `STATE_MANAGEMENT` and other context-heavy blocks.

**Step B — Active Host Completion (Teammate Mode):**

After the script completes, teammates are spawned. But now the teammates' work is REDUCED:
- Files are already created and simple blocks are filled
- Teammates only find `<!-- CLAUDE_FILL: ... -->` markers and fill them using the manifest + codebase analysis
- The active host fills CLAUDE_FILL markers
- This approach reduces teammate timeout risk and increases consistency

**IMPORTANT:** If the script errors (e.g. manifest parse error), do NOT stop — report the error to the user and fall back to classic teammate-only mode.

**Advantages:**
- **Idempotent:** Same manifest → same simple block output
- **Fast:** No host tokens spent on simple blocks
- **Testable:** Validated with `node --test generate.test.js`
- **Debuggable:** Stack trace available on error

### 5.2 Teammate Spawn Implementation

Use the Agent tool for each teammate. `run_in_background: false` — all teammates are started in parallel in a single message and their results are awaited.

Prompt format to send to each teammate:

```
You are a Bootstrap teammate. Your task: [task description]

You can read files and write Agentbase files. You cannot use parent-only session tools.

## Manifest
[manifest.yaml content — FULL]

## Skeleton Files
[related skeleton file paths]

## Rules
1. Files may already have been created by generate.js. Priority: find and fill `<!-- CLAUDE_FILL: BLOCK_NAME -->` markers.
2. Also fill GENERATE blocks that are not CLAUDE_FILL with manifest data (format below)
3. Remove the .skeleton extension (skip if generate.js already removed it)
4. Copy static files as-is
5. Write to the target directory: under Agentbase/.claude/ (e.g. .claude/commands/, .claude/hooks/, .claude/rules/)
6. NEVER write to Codebase — all output stays inside Agentbase/ (Invariant rule 2)
7. Report each file as it is written
8. For monorepo (project.type == "monorepo") fill GENERATE blocks with subproject scope:
   - VERIFICATION_COMMANDS, TEST_COMMANDS, COMPILE_COMMANDS → produce a SEPARATE line for each subproject
   - IMPLEMENTATION_RULES, REVIEW_CHECKLIST → add rules based on each subproject's modules stack
   - CODEBASE_CONTEXT → list all subprojects and each one's stack
   - At the end of CODEBASE_CONTEXT add this summary with the SAME wording:
     Invariant rules:
     - Config files live only inside Agentbase
     - A .claude/ directory is not created inside Codebase
     - Git runs only in Codebase
   - Source: `manifest.project.subprojects[].modules` fields (each subproject carries its own module set)

## Skeleton Marker Formats (By File Type)

Two different marker formats are used in skeleton files. Process the correct format based on file extension:

**Markdown / Config files (.md, .skeleton, .json):**
```
<!-- GENERATE: BLOCK_NAME -->
...content...
<!-- END GENERATE -->
```

**JavaScript files (.js):**
```javascript
/* GENERATE: BLOCK_NAME
 * ...description/examples...
 */
...content...
/* END GENERATE */
```

In JS files, wrapper lines `// ─── GENERATE SECTION START ───` at the start of a section and `// ─── GENERATE SECTION END ───` at the end are present. These lines are informational and are not changed during processing.

## Target Path Map
- templates/core/commands/*.md → .claude/commands/
- templates/core/agents/*.md → .claude/agents/
- templates/core/hooks/* → .claude/hooks/
- templates/core/git-hooks/* → git-hooks/
- templates/core/rules/*.md → .claude/rules/
- templates/modules/{cat}/{var}/commands/*.md → .claude/commands/
- templates/modules/{cat}/{var}/agents/*.md → .claude/agents/
- templates/modules/{cat}/{var}/hooks/* → .claude/hooks/
- templates/modules/{cat}/{var}/rules/*.md → .claude/rules/
```

### 5.2.1 GENERATE Block Map

When processing skeleton files, teammates must know which GENERATE blocks live in which file. The Lead includes this table in the related teammate's prompt:

| Skeleton File | GENERATE Blocks |
|-----------------|-------------------|
| api-smoke.skeleton.md | CODEBASE_CONTEXT, SMOKE_TEST_ENDPOINTS, API_SMOKE_SCRIPT, API_SMOKE_NODE_TESTS |
| task-hunter.skeleton.md | CODEBASE_CONTEXT, FILE_DISCOVERY_HINTS, IMPLEMENTATION_RULES, VERIFICATION_COMMANDS, COMMIT_CONVENTION, PROJECT_SPECIFIC_RULES, TASK_ROUTING_CONFIG |
| task-master.skeleton.md | CODEBASE_CONTEXT |
| task-conductor.skeleton.md | CODEBASE_CONTEXT, VERIFICATION_COMMANDS, COMMIT_CONVENTION |
| task-review.skeleton.md | CODEBASE_CONTEXT, REVIEW_CHECKLIST, COMMIT_CONVENTION |
| task-plan.skeleton.md | CODEBASE_CONTEXT, FILE_DETECTION_PATTERNS, AC_TEMPLATES |
| bug-hunter.skeleton.md | CODEBASE_CONTEXT, VERIFICATION_COMMANDS, COMMIT_CONVENTION |
| bug-review.skeleton.md | CODEBASE_CONTEXT, REVIEW_CHECKLIST, COMMIT_CONVENTION |
| auto-review.skeleton.md | CODEBASE_CONTEXT |
| codex-verify.skeleton.md | SELF_REFRESH |
| deep-audit.skeleton.md | CODEBASE_CONTEXT, MODULE_MAPPING, SUBPROJECT_LAYERS, REVIEW_AGENTS, VERIFICATION_COMMANDS, IDOR_CHECKLIST |
| deadcode.skeleton.md | CODEBASE_CONTEXT, DEADCODE_TOOLS, COMMIT_CONVENTION |
| rollback.skeleton.md | CODEBASE_CONTEXT, COMMIT_CONVENTION |
| memorize.skeleton.md | MEMORY_PATH |
| code-review.skeleton.md (agent) | CODEBASE_CONTEXT, PROJECT_CHECKLIST |
| silent-failure-hunter.skeleton.md (agent) | CODEBASE_CONTEXT |
| regression-analyzer.skeleton.md (agent) | CODEBASE_CONTEXT, PROJECT_PATHS |
| service-documentation.skeleton.md (agent) | CODEBASE_CONTEXT |
| devils-advocate.skeleton.md (agent) | CODEBASE_CONTEXT |
| workflow-lifecycle.skeleton.md (rule) | COMMIT_CONVENTION, DEPLOY_TOPOLOGY, DEPLOY_STEPS, ROLLBACK_PLATFORM_STEPS, ENVIRONMENT_DIFFERENCES, TEAM_REVIEW_POLICY, HOOK_BEHAVIORS, CRITICAL_RULES |
| db-migration-discipline.skeleton.md (rule) | DETECTED_ORM, MIGRATION_COMMANDS, DRY_RUN_COMMAND, ROLLBACK_COMMAND |
| code-review-check.skeleton.js (hook — JS format) | SECURITY_PATTERNS, FILE_EXTENSIONS |
| doc-drift-check.skeleton.js (hook — JS format) | DOC_TARGET_PATHS, CODE_PATH_PATTERNS, CODE_EXTENSIONS |
| test-enforcer.skeleton.js (hook — JS format) | TEST_FILE_MAPPING, CODE_EXTENSIONS |
| auto-test-runner.skeleton.js (hook — JS format) | LAYER_TESTS, CODE_EXTENSIONS |
| team-trigger.skeleton.js (hook — JS format) | LAYER_TESTS |
| backend-expert.skeleton.md (agent) | CODEBASE_CONTEXT, BACKEND_FRAMEWORK_RULES |
| mobile-expert.skeleton.md (agent) | CODEBASE_CONTEXT, MOBILE_PLATFORM_RULES |
| frontend-expert.skeleton.md (agent) | CODEBASE_CONTEXT, FRONTEND_FRAMEWORK_RULES |
| docker-pre-deploy.skeleton.md | CODEBASE_CONTEXT, COMPILE_COMMANDS, TEST_COMMANDS, ENV_CHECKS, DEPLOY_CONFIG |
| docker-post-deploy.skeleton.md | CODEBASE_CONTEXT, HEALTH_CHECK_URL, SMOKE_TEST_ENDPOINTS, DEPLOY_PLATFORM, DEPLOY_LOG_PATH |
| coolify-pre-deploy.skeleton.md | CODEBASE_CONTEXT, COMPILE_COMMANDS, TEST_COMMANDS, ENV_CHECKS, DEPLOY_CONFIG |
| coolify-post-deploy.skeleton.md | CODEBASE_CONTEXT, HEALTH_CHECK_URL, SMOKE_TEST_ENDPOINTS, DEPLOY_LOG_PATH |
| vercel-pre-deploy.skeleton.md | CODEBASE_CONTEXT, BUILD_COMMANDS, TEST_COMMANDS, VERCEL_CONFIG |
| review-module.skeleton.md | CODEBASE_CONTEXT, MODULE_MAPPING, SUBPROJECT_LAYERS, REVIEW_AGENTS, VERIFICATION_COMMANDS |
| idor-scan.skeleton.md | CODEBASE_CONTEXT, CONTROLLER_TABLE, MODULE_MAPPING, KNOWN_PATTERNS |
| docker-devops.skeleton.md (agent) | SERVER_INFO, DEPLOY_PLATFORM_CONFIG, DOCKER_ARCHITECTURE, COMMON_OPERATIONS |
| coolify-devops.skeleton.md (agent) | SERVER_INFO, COOLIFY_CONFIG, DOCKER_ARCHITECTURE, COMMON_OPERATIONS |
| vercel-frontend.skeleton.md (agent) | VERCEL_CONFIG, BUILD_INFO |
| pre-commit.skeleton (git-hook) | GIT_PRECOMMIT_COMPILE, GIT_PRECOMMIT_TEST, GIT_PRECOMMIT_LINT, GIT_PRECOMMIT_FORMAT |
| pre-push.skeleton (git-hook) | GIT_PREPUSH_LOCALHOST, GIT_PREPUSH_MIGRATION, GIT_PREPUSH_ENV, GIT_PREPUSH_DESTRUCTIVE |
| CLAUDE.md.skeleton (config) | PROFESSIONAL_STANCE, PROJECT_DEFINITION, TECH_STACK, ENVIRONMENTS, COMMANDS, ARCHITECTURE, CONVENTIONS, AVAILABLE_COMMANDS |
| settings.skeleton.json (Lead — see 5.2.2) | PRETOOLUSE_EDITWRITE_HOOKS, PRETOOLUSE_BASH_HOOKS, POSTTOOLUSE_EDITWRITE_HOOKS, POSTTOOLUSE_BASH_HOOKS, ENABLED_PLUGINS |
| claude-ignore.skeleton (config) | STACK_SPECIFIC_IGNORES |

**CODEBASE_CONTEXT** exists in every skeleton and is filled from the manifest's project + stack + subprojects sections.
At the end of every filled CODEBASE_CONTEXT block this invariant-rule summary MUST appear:

```markdown
Invariant rules:
- Config files live only inside Agentbase
- A .claude/ directory is not created inside Codebase
- Git runs only in Codebase
```

### 5.2.2 Lead: settings.json Assembly

After all teammates complete, the Lead produces the `settings.json` file with the following steps. This file is written by no teammate — ownership belongs entirely to the Lead.

1. **Read the skeleton:** Read `templates/core/settings.skeleton.json`
2. **Fill hook GENERATE blocks:** Using manifest data and the hook file list reported by Teammate 3, process these blocks:
   - `__GENERATE__PRETOOLUSE_EDITWRITE_HOOKS__` — manifest.rules.forbidden + active module Edit/Write hooks
   - `__GENERATE__PRETOOLUSE_BASH_HOOKS__` — active module Bash hooks
   - `__GENERATE__POSTTOOLUSE_EDITWRITE_HOOKS__` — active module post-edit hooks
   - `__GENERATE__POSTTOOLUSE_BASH_HOOKS__` — active module post-bash hooks
3. **Fill the plugin GENERATE block:** Based on the Manifest.modules.active list:
   - `__GENERATE__ENABLED_PLUGINS__` — plugin definitions of active modules (merged at root level)
4. **Clean meta-keys:** Remove `__doc__` and `__GENERATE__*` wrapper keys from the output JSON
5. **Write the file:** Save as `.claude/settings.json`
6. **Cross-check:** Verify that every file path referenced in a hook `command` field in the produced settings.json (e.g. `node .claude/hooks/code-review-check.js`) was actually produced by Teammate 3. If a file is missing, WARN.

**GENERATE Block Fill Rules:**
- Sub-keys inside each `__GENERATE__*` block are conditional (e.g. `prisma_active` is added only if the prisma module is active)
- Values of matching sub-objects are added as new elements to the parent `hooks` array
- The `__GENERATE__ENABLED_PLUGINS__` block is merged at root level (added directly as key-value to the output JSON)

### 5.2.3 Teammate Recovery Mechanism

Failures can occur while teammates run in parallel. The Lead applies the following recovery strategy:

#### Timeout Limits

A **5 minute (300,000 ms)** timeout limit applies to each teammate. The Agent tool's `timeout` parameter is set to this value.

| Teammate | Timeout | Rationale |
|----------|---------|---------|
| 1 (core-generator) | 300s | 12 files — skeleton processing + GENERATE fill |
| 2 (module-generator) | 300s | Variable file count — depends on module count |
| 3 (hook-generator) | 300s | JS files + forbid-rule processing |
| 4 (config-generator) | 300s | CLAUDE.md skeleton can be large |
| 5 (root-generator) | 300s | From-scratch content production — LLM-heavy |

**NOTE:** On monorepo projects with many subprojects the Lead may raise the timeout to **450s**.

#### Failure Detection

A teammate is considered **failed** in any of these cases:

1. **Timeout:** No response within the allotted time
2. **Error:** Agent tool returned an error message (crash, context overflow, etc.)
3. **Empty output:** Teammate completed without producing any files
4. **Incomplete output:** Fewer files than expected were produced (detected in the sanity check — see 5.3)

#### Retry Strategy

```
Teammate failed
  │
  ├─ First failure?
  │   ├─ YES → Retry (1 time)
  │   │         • Re-spawn with the same prompt
  │   │         • run_in_background: false
  │   │         • Other teammates' outputs are PRESERVED
  │   │         • Timeout stays the same on retry
  │   │
  │   └─ NO (2nd failure) → Notify the user
  │         • Report the failed teammate's task
  │         • Show the list of files that could not be produced
  │         • Offer the user:
  │           (a) Manual intervention — user creates the files themselves
  │           (b) Skip — continue without the missing files
  │           (c) Cancel Bootstrap
  │
  └─ Successful teammates' outputs are preserved in EVERY case
```

**CRITICAL:** During retry, files produced by other teammates are NEVER deleted or re-produced. Only the failed teammate is re-run.

#### Retry Application Format

On retry, this prefix is added to the prompt sent to the teammate:

```
[RETRY] This task failed previously. Reason: [timeout/error/empty output]
Previous error detail: [error message if any]
Please complete the task from scratch. Produce all files.
```

#### Partial Success Management

A teammate may produce SOME files and fail on OTHERS (e.g. timeout after writing 6 of 8 files). In that case:

1. **Produced files are preserved** — the Lead does not delete them
2. **Missing files are detected** — expected output list is compared with actual files
3. **Retry is only for missing files** — this addition is made to the retry prompt:

```
[PARTIAL RETRY] In the previous run these files were produced successfully and are PRESERVED:
- [list of produced files]

Produce only these MISSING files:
- [list of missing files]

Do NOT overwrite files already produced.
```

#### User Notification Format

Message shown to the user after the 2nd failure:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Teammate Failure Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Failed Teammate: [number] ([name])
Failure Reason: [timeout / error / empty output]
Retry Result: Failed (2/2 attempts exhausted)

Files Not Produced:
  ✗ [file path 1]
  ✗ [file path 2]
  ...

Successfully Produced Files (preserved):
  ✓ [file path 1]
  ✓ [file path 2]
  ...

Other Teammates: ✅ Completed (outputs preserved)

Options:
  (a) Manual intervention — create the missing files yourself
  (b) Skip gaps and continue — bootstrap completes partially
  (c) Cancel Bootstrap
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**If option (b) is selected:** The Lead marks missing files as "MISSING" in the Sanity Check report and continues bootstrap. References to missing hook files are NOT added during settings.json assembly.

### 5.3 Lead Sanity Check

After all teammates complete, the Lead (you) performs these checks:

1. **File count check:** Compare expected file count with the actual file count under .claude/
2. **Colliding file check:** If a file with the same name came from more than one teammate, WARN
3. **settings.json consistency (Lead production — see 5.2.2):**
   a. Verify that every `.claude/hooks/*.js` file in a `command` field in settings.json physically exists
   b. Check that every .js file under .claude/hooks/ is referenced in at least one hook in settings.json (orphan hook warning)
   c. Verify that `__doc__` or `__GENERATE__` keys did not leak into the output file
   d. Perform JSON syntax validation (is it valid JSON?)
4. **CLAUDE.md command list:** Compare the command table in the CLAUDE.md produced by config-generator with the actual files under .claude/commands/

If there is an inconsistency, notify the user and correct it.

### 5.4 File Creation Report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 File Creation Report (Teammate Mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Teammate 1 (core-generator):     [STATUS] [X] files produced
Teammate 2 (module-generator):   [STATUS] [X] files produced
Teammate 3 (hook-generator):     [STATUS] [X] hook files + [Y] git-hooks produced
Lead (settings.json assembly):    [STATUS] settings.json produced
Teammate 4 (config-generator):   [STATUS] [X] files produced
Teammate 5 (root-generator):     [STATUS] [X] files produced

Lead Sanity Check:               [STATUS]
Total files:                    [X]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STATUS displays:
  ✅  — Successful (on first attempt)
  🔄✅ — Successful after retry (on 2nd attempt)
  ⚠️  — Partially successful ([Y]/[X] files produced, [Z] missing)
  ❌  — Failed (2 attempts exhausted, user decision: [a/b/c])

If there was a retry or partial success, extra detail:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Teammate [N]: [failure reason]
    1st attempt: [timeout/error/incomplete output] → retry started
    2nd attempt: [successful/failed]
    Produced:  [file list]
    Missing:     [file list] (or "none")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5.5 Teammate Reference Templates

The templates below define the formats teammates use when producing files. The Lead includes these templates in the related teammate's prompt.

#### Root Documentation Files (for Teammate 5)

Using manifest data, create the following files at Agentbase root (`./`). For each file, first look for a same-named skeleton file under `templates/core/`; if found use it, otherwise create with the templates below.

**PROJECT.md:**
```markdown
# [project name]

## Project Definition
[manifest.project.description]

## Project Type
[manifest.project.type] ([manifest.project.language])

## Subprojects
[For each subproject: name, path, role, stack]

## Environments
[For each environment: name, URL]

## Important Rules
[from manifest.rules.domain]
[from manifest.rules.forbidden]

## Quick Start
[dev command for each subproject]
```

**STACK.md:**
```markdown
# Tech Stack

## Runtime
[manifest.stack.runtime] [manifest.stack.runtime_version]

## Package Manager
[manifest.stack.package_manager]

## Language & Type System
[TypeScript status, other languages]

## Test
Framework: [manifest.stack.test_framework]
Strategy: [manifest.workflows.test_strategy]

## Lint & Format
Linter: [manifest.stack.linter]
Formatter: [manifest.stack.formatter]

## Database & ORM
ORM: [manifest.stack.orm]
DB: [manifest.stack.database]

## CI/CD & Deploy
[Detected CI/CD tools]
[Deploy info]
```

**DEVELOPER.md:**
```markdown
# Developer Profile

## Experience Level
[manifest.developer.experience]

## Communication
Language: [manifest.project.language]

## Autonomy
[manifest.developer.autonomy]
[Behavior description based on autonomy level]

## Behavior Guide
[How the active host should behave based on experience level]
```

**ARCHITECTURE.md:**
```markdown
# Architecture

## Directory Structure
[Detected directory map from Step 2.2]
## Subproject Structure
[For each subproject: role, responsibility area, main directories]

## Data Flow
<!-- This section will be detailed during project development -->

## Dependency Rules
<!-- This section will be detailed during project development -->

> This file was created as a skeleton during the first bootstrap.
> To flesh it out: complete the "Detail ARCHITECTURE.md" task in the backlog.
```

**WORKFLOWS.md:**
```markdown
# Workflows

## Git Workflow
Branch Model: [manifest.workflows.branch_model]
Commit Convention: [manifest.workflows.commit_convention]

### Commit Prefixes
[table from manifest.workflows.commit_prefix_map]

## Test Workflow
Strategy: [manifest.workflows.test_strategy]
[Test command for each subproject]

## Deploy Workflow
[Environment and deploy information]

## Code Review
[Review process according to the branch model]

## Migration Workflow
[according to manifest.workflows.migration_strategy]
```

#### CLAUDE.md Files (for Teammate 4)

Create two separate CLAUDE.md files:

**Root CLAUDE.md (`./CLAUDE.md`):**
```markdown
# [project name] — Claude Code Configuration

This project uses the agentic workflow. All configuration lives in the Agentbase directory.

## Working Directory
- **Agentbase/** — Agent configuration, commands, rules (YOU ARE HERE)
- **../Codebase/** — Project source code (YOU ACCESS HERE)
- **../Docbase/** — Project documentation

## Core Rules
- Language: [manifest.project.language]
- Commit: [manifest.workflows.commit_convention]
- Autonomy: [manifest.developer.autonomy]
- [important rules from manifest.rules.domain]

## Forbidden Operations
[from manifest.rules.forbidden — for each: command and reason]

## Active Modules
[manifest.modules.active list]

## Available Commands
[list all commands under .claude/commands/]

@PROJECT.md
@STACK.md
@DEVELOPER.md
@ARCHITECTURE.md
@WORKFLOWS.md
@ORCHESTRATION.md
@LESSONS.md
@onboarding.md
```

> **NOTE — Injection chain:** Root `CLAUDE.md` includes **ALL** root documents in context via the `@<file>` lines above (Claude Code official import syntax — no spaces, single token). This means:
> - When Claude Code reads root `CLAUDE.md`, PROJECT, STACK, DEVELOPER, ARCHITECTURE, WORKFLOWS, ORCHESTRATION, LESSONS, and onboarding are all loaded automatically.
> - ORCHESTRATION.md carries the shared behavioral philosophy for all agents; LESSONS.md carries rules derived from past mistakes — these two files ship statically in the repo; Bootstrap does not fill them.
> - When `transform.js` runs, root `CLAUDE.md` content is copied to GEMINI.md, AGENTS.md, .agents/..., .kimi/..., .opencode/... targets — the injection chain is preserved for ALL models.
> - Adding the import lines only in root `CLAUDE.md` is enough; you do not need to write them into each target file separately (transform.js adapts automatically).
>
> **If the full list of import lines changes** (a new root document is added), updating this list and also updating the file list inside `STEP 8 GATE B` in parallel is **mandatory**.

**Inner CLAUDE.md (`.claude/CLAUDE.md`):**
```markdown
# Agent Internal Configuration

This directory contains Claude Code agent configuration.

## Directory Structure
- `commands/` — Slash commands (/bootstrap, /task-hunter, etc.)
- `agents/` — Sub-agent definitions
- `hooks/` — Pre/post commit and other hooks
- `rules/` — Rule files
- `reports/` — Agent reports
- `tracking/` — Error and operation tracking

## Manifest
Project manifest: ../Docbase/agentic/project-manifest.yaml
All configuration is derived from this manifest.
```

#### settings.json (Lead assembly — Step 5.2.2)

After all teammates finish, the Lead produces `.claude/settings.json` from `templates/core/settings.skeleton.json`. Hook GENERATE blocks are filled from the manifest + Teammate 3 outputs; the plugin GENERATE block is filled from manifest.modules.active.

```
Input:  templates/core/settings.skeleton.json
Output:  .claude/settings.json

Assembly process:
1. Read the skeleton (all __doc__ and __GENERATE__* meta-keys are not carried over)
2. Evaluate the conditional sub-objects in each __GENERATE__* block against the manifest
3. Add objects whose conditions are met to the parent array/object
4. Merge the ENABLED_PLUGINS block at the root level
5. Cross-check against the hook file list reported by Teammate 3
6. Write clean JSON to .claude/settings.json
```

#### .claude-ignore (for Teammate 4)

Create or update the `Agentbase/.claude-ignore` file:
```
node_modules/
.env
.env.*
*.log
dist/
build/
.next/
coverage/
.DS_Store
*.sqlite
*.db
```

#### Module Interaction Matrix (reference for all teammates)

When multiple modules are active, merge contributions across files:

**Verification Commands (VERIFICATION_COMMANDS for task-hunter etc.):**
- Core: `tsc --noEmit` (if TypeScript) + `[test_command]`
- If orm/* is active add: ORM validate command (e.g. `npx prisma validate` for prisma)
- If monorepo is active: separate verification block per subproject

**Code Review Checklist (PROJECT_CHECKLIST for code-review):**
- Core: General code quality checks
- If security is active add: IDOR, SQL injection, auth bypass checks
- If mobile/* is active add: Theme fitness, platform-specific checks
- If backend/* is active add: Framework-specific checks
- If frontend/* is active add: Framework-specific checks

**Workflow Lifecycle:**
- Core: Branch → commit → push → merge
- If deploy/* is active add: Deploy steps (Docker build for docker, build check for vercel)
- If orm/* is active add: Migration steps

**Hooks:**
- Core hooks
- If orm/* is active: ORM-specific hooks (for prisma: `prisma validate` + `prisma format` on pre-commit)
- If monorepo is active: cross-package format check on pre-commit
- If backend/* is active: Framework-specific hooks

**NOTE:** The old monolithic "File Creation Report" was removed. Teammate mode produces its own report (Step 5.4).

Created from template:
  [list of files read from template and created]

Skipped (template not found):
  [skipped files if any]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## STEP 6 — BACKLOG START

### 6.1 Backlog Initialization

Check with Bash: `ls backlog/config.yml 2>/dev/null`

- **If it exists** → Skip, keep the existing backlog.
- **If it does not exist** → Run the non-interactive init command:

```bash
backlog init "[manifest.project.name]" --defaults
```

This command creates the `backlog/` directory in the current Agentbase CWD with tasks/, completed/, archive/, milestones/ subdirectories and config.yml. If the Backlog CLI is not installed or init fails, do NOT STOP — notify the user:

```
Backlog CLI not found or init failed.
Install: npm i -g backlog.md
Then run bootstrap again.
```

### 6.2 Initial Tasks

Create the following tasks (via backlog CLI):

**GREENFIELD_MODE = false (existing project):**

```bash
backlog task create "Inspect the Codebase and detail ARCHITECTURE.md" \
  -d "Detail the skeleton ARCHITECTURE.md created by Bootstrap by deeply inspecting the codebase. Add layer structure, data flow, dependency rules, and important patterns." \
  --priority high \
  -l bootstrap

backlog task create "Create the first feature/bug task" \
  -d "After inspecting the Codebase, create a backlog task for the highest-priority feature or bug. Add acceptance criteria and an implementation plan." \
  --priority medium \
  -l bootstrap
```

**GREENFIELD_MODE = true (new project):**

```bash
backlog task create "Create the project scaffold" \
  -d "Create the project scaffold in the Codebase/ directory. Stack: [manifest.stack.primary]. Required commands are listed in the Bootstrap report." \
  --priority high \
  -l bootstrap -l greenfield

backlog task create "Write ARCHITECTURE.md according to the project plan" \
  -d "Define the target architecture, layers, and data flow for the greenfield project. There is no code yet — this is a target document." \
  --priority high \
  -l bootstrap -l greenfield

backlog task create "Plan and implement the first feature" \
  -d "After the project scaffold exists, plan the first feature. You can start with /task-plan." \
  --priority medium \
  -l bootstrap -l greenfield
```

```
✅ Backlog ready — [2|3] initial task(s) created.
```

---

## STEP 6.5 — KNOWLEDGE-GRAPH MODULE FIRST SETUP (Optional)

This step **always runs when reachable** — `knowledge-graph/graphify` is an **optional** module. Graph artifacts improve query efficiency when present; if the CLI is missing, say it is optional and continue. Do not fail or stop bootstrap because graphify is absent. generate.js may still emit hook/`/g`/rules files when the module is selected; this step focuses on optional graph production.

### Bootstrap Exception — Explanation

Bootstrap normally does not trigger external commands — it only copies/generates files. **The knowledge-graph module is a deliberate exception when available:** it runs `graphify update` to create the first graph for the target project. The rationale: the module's value (150-540x token savings via BFS query) does not appear without the first graph artifact (`graphify-out/graph.json`). CLI presence is optional here; if missing, continue without installing.

### Step 6.5.1 — graphify CLI Check

Confirm whether the CLI is available:

```bash
command -v graphify >/dev/null 2>&1 && echo "__GRAPHIFY_OK__" || echo "__GRAPHIFY_MISSING__"
```

- **`__GRAPHIFY_OK__`** → Proceed to Step 6.5.2.
- **`__GRAPHIFY_MISSING__`** → graphify is **optional**. Report that the CLI is not installed and continue bootstrap without stopping. The module skeleton (`.claude/commands/g.md`, `.claude/hooks/graphify-first-guard-v2.js`, `.claude/rules/graphify-rules.md`) may already have been generated; only the CLI is missing. Do **not** attempt to install it during bootstrap.

### Step 6.5.2 — `.gitignore` Patch (Idempotent)

In `<Codebase>/.gitignore`, in order:

1. Create the file if it does not exist.
2. If a `graphify-out/` line already exists, skip.
3. Otherwise append to the end of the file:
   ```
   # Graphify knowledge graph artifact — each developer produces it on their own machine
   graphify-out/
   ```

### Step 6.5.3 — First `graphify update` (Automatic, Best-Effort)

When the CLI is present, the first graph is produced **automatically** (the user is not asked). Best-effort: on failure, emit a visible warning but **do not block** bootstrap (the graph can be produced later via `/g` or manually with `graphify update .`). If the CLI is missing, skip this substep and continue.

Run `graphify update` (scans the codebase, produces `graphify-out/graph.json`, ~5-10 seconds):

- **Single-layer:** `cd <Codebase> && graphify update .`
- **Monorepo (monorepo module also active):** `cd <Codebase> && graphify update "<sub1>" && graphify update "<sub2>" && ... && python3 ../Agentbase/scripts/graphify-merge-layers.py`
  - Subproject paths are taken from the manifest `project.subprojects` list
  - Paths are Codebase-root-relative (NO `'../Codebase/'` prefix) and shell-quoted
  - `../Agentbase/scripts/graphify-merge-layers.py` should already have been copied by generate.js into the Agentbase root `scripts/` directory
  - **LAYERS warning:** After the Python script is produced, remind the user to verify the LAYERS list inside `../Agentbase/scripts/graphify-merge-layers.py` against their monorepo layout (generate.js does the first fill from the manifest; the user does the final adaptation)

If the command fails, report the error; do not stop bootstrap — the user can adapt manually.

### Step 6.5.4 — Optional Pre-Push Hook Setup (Idempotent + Existing Hook Protected)

Ask the user:

```
Install a pre-push hook? The graph is updated automatically before each `git push`. (Bypass: git push --no-verify)
```

If **Yes** is chosen, for target file `<Codebase>/.git/hooks/pre-push`:

1. Check the `core.hooksPath` configuration — if it is not empty, `.git/hooks/` is not in use; report this to the user and change the target path accordingly:
   ```bash
   HOOKS_DIR="$(git -C <Codebase> config --get core.hooksPath || echo .git/hooks)"
   ```
2. If the target file `${HOOKS_DIR}/pre-push` already exists:
   - Check whether the content contains the `# Graphify auto-update` marker.
     - **If it does:** Idempotent — skip, report "Graphify pre-push hook already installed".
     - **If it does not:** Offer the user: `[append | backup-and-replace | skip]`.
       - `append`: Append the marker block to the end of the existing hook (keep existing commands).
       - `backup-and-replace`: Back up the existing hook as `pre-push.bak-<timestamp>`, then write the new hook.
       - `skip`: Do nothing.
3. If the target file does not exist: Write the new hook from scratch (shebang + marker block).

Marker block format (added on append or new write):

```sh
# Graphify auto-update — pre-push trigger (module: knowledge-graph/graphify)
# Bypass: git push --no-verify
# No silent fail — error message is written to stderr; push is NOT blocked.

# Single-layer:
if ! graphify update . ; then
  echo "WARN: graphify update . failed; run 'graphify update .' manually (push continues)" >&2
fi

# Multi-layer monorepo (use instead of the above):
# if ! ( graphify update "<sub1>" && graphify update "<sub2>" && python3 ../Agentbase/scripts/graphify-merge-layers.py ); then
#   echo "WARN: graphify multi-layer update failed; manual update required (push continues)" >&2
# fi

exit 0
```

Finally `chmod +x ${HOOKS_DIR}/pre-push`.

This optional hook must not install graphify and must not block push.

If **No** is chosen, skip — give the user manual install guidance with a reference to `templates/modules/knowledge-graph/graphify/install.md`.

**Design decisions:**
- `2>/dev/null` is FORBIDDEN — graphify errors are **not discarded**; a visible warning is written to stderr
- Use `if ! cmd ; then ... ; fi` instead of `|| true` — error reporting is explicit; push is still not blocked
- `core.hooksPath` is supported — write to the project's custom hooks directory if present
- Idempotent: the marker line (`# Graphify auto-update`) prevents duplicate install on re-run
- Overwriting an existing hook: append/backup-and-replace/skip is left to the user

### Step 6.5.5 — Completion Notice

```
🧠 Knowledge-Graph Module
   ✅ Hook installed: .claude/hooks/graphify-first-guard-v2.js (PreToolUse Bash|Grep|Glob)
   ✅ Slash command: /g (query/explain/path/report/health)
   ✅ Rule file: .claude/rules/graphify-rules.md (referenced from CLAUDE.md)
   ✅ .gitignore patch: graphify-out/
   ✅ First graphify update: <node_count> nodes, <edge_count> edges   (best-effort — WARN on failure, bootstrap continues)
   [optional] ✅ Pre-push hook enabled
   [optional] graphify CLI missing — skipped; install later if desired

   First query: /g query "<whatever is on your mind>"
   Check health: /g health
```

---

## STEP 6.6 — TARGET PROJECT REPO SEPARATION: Project-Root `.gitignore` + Two-Repo Delivery Model

This step prepares the target project for the **Two-repo delivery model** (Option 1 — two separate repos):

- **Parent root (project root)** = the developer's OPTIONAL git repo → `Agentbase/` + `Docbase/` are versioned.
- **Codebase** = its own independent git repo → delivered to the customer SEPARATELY and clean.

The two repos do not know each other (NOT a submodule). The developer clones the parent-root repo (Agentbase + Docbase) and clones/attaches `Codebase` **separately** — because `Codebase` is gitignored, it does not come with the parent-root clone. The customer clones only `Codebase`.

> **Invariant rule 1 alignment:** `.git` is written at the project root, **not inside Agentbase**. Agents never touches the parent (developer) repository; Git runs only in Codebase (`../Codebase/`).

### Step 6.6.1 — Write Project-Root `.gitignore` (Idempotent)

Source template: `Agentbase/templates/core/root-gitignore.skeleton`. Target: **project root** (`Agentbase/../.gitignore`, same level as `Codebase/` and `Docbase/`). Writing is done **directly by the Bootstrap orchestrator** — `generate.js` does not process this skeleton (its outputs stay inside `Agentbase/` so it cannot write to the parent directory; therefore this skeleton is exempt from the `scanSkeletonFiles` scan).

Idempotent + **self-healing** rule — uses the **exact same** validity condition as Gate J.

**Validity condition (same as GATE J):** `../.gitignore` contains all three of → the `AGENTIC-WORKFLOW-ROOT-GITIGNORE` sentinel, the `^/Codebase/?$` line, AND the `^/Codebase-wt-\*/$` line (root-anchored, with leading `/`).

1. If `../.gitignore` does not exist → write the `root-gitignore.skeleton` contents as-is to `../.gitignore`.
2. If it exists and **already satisfies** the validity condition → SKIP (installed).
3. If it exists but **does not satisfy** the condition (sentinel missing OR required line(s) missing — partial/stale file) → **NORMALIZE/REPLACE** the managed block: **DELETE** the previous managed block (between START `AGENTIC-WORKFLOW-ROOT-GITIGNORE` … END `END-AGENTIC-WORKFLOW-ROOT-GITIGNORE`) AND any stale/unanchored managed lines left outside the block (`Codebase`, `Codebase/`, `Codebase-wt-*/`, and the oldest-version generic `*-wt-*/`), then append a fresh skeleton block at the end. Non-managed user lines are preserved.

> **Important — NOT APPEND-ONLY (stale upgrade rule):** If an older `.gitignore` has unanchored `Codebase`/`Codebase/`/`Codebase-wt-*/` (or the oldest-version generic `*-wt-*/`) lines, merely appending the new ones leaves those old lines in place and they **continue** to ignore nested paths such as `Agentbase/.../Codebase/...` or `Agentbase/.../foo-wt-bar/...`. Therefore repair must **delete** old managed lines (normalize/replace).

> **Important (deadlock prevention):** "Sentinel present" alone is NOT enough. Skipping based only on the sentinel causes Gate J to FAIL every turn on a partial/stale `.gitignore` that has the sentinel but is missing required ignore lines, locking the `/goal` loop. Therefore the repair condition is **identical** to the Gate J condition and repairs when incomplete.

**Deterministic method (recommended):** Use the pure `repairRootGitignore(existing, skeleton)` function in `generate.js` — it is idempotent, cleans the old/stale block, preserves user lines, and brings missing/partial/stale/valid states to the correct result in one pass:

```bash
node -e 'const {repairRootGitignore}=require("./generate.js");const fs=require("fs");const f="../.gitignore";const sk=fs.readFileSync("templates/core/root-gitignore.skeleton","utf8");const cur=fs.existsSync(f)?fs.readFileSync(f,"utf8"):"";fs.writeFileSync(f,repairRootGitignore(cur,sk));'
```

Patterns are **root-anchored** (leading `/`): only `Codebase` at the project root (symlink or real directory), Codebase worktree directories (`/Codebase-wt-*/`), and OS noise are not tracked in the parent-root repo. Unanchored `Codebase` matches at every level in git (e.g. `Agentbase/docs/Codebase/...`) — that is not desired.

### Step 6.6.2 — Optional `git init` Guide for the Developer

`git init` is **NOT FORCED** — only suggested. Print the following to the console:

```
📦 Two-repo delivery model (optional)
   Project-root .gitignore is ready → Codebase/ is ignored.

   If you want to version your own workflow environment (Agentbase + Docbase),
   start your own repo at the PROJECT ROOT (one level above Agentbase):

     cd ..            # go to project root (parent of Agentbase)
     git init
     git add .        # Codebase is automatically excluded (.gitignore)
     git commit -m "chore: workflow environment (Agentbase + Docbase)"

   Codebase is ALREADY its own repo — deliver that separately to the customer:
     customer →  git clone <Codebase-remote>   (clean, no workflow traces)

   Note: The parent-root repo is YOUR tool. Agents never touches the parent (developer) repository;
   Git runs only in Codebase (Invariant rule 1).
```

If the user declines, skip this step — because `../.gitignore` is already written, the model is ready at any time.

---

## STEP 7 — COMPLETION REPORT

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 Bootstrap Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Project: [project name]
📁 Type:   [single/monorepo]
🔧 Stack: [primary technologies]

🧩 Active Modules:
   Categories:
     [for each active category: category → variant]
   Standalone:
     [one line per active standalone module]

📄 Files Created: [total count]
   Root:    [count] files
   .claude: [count] files

📋 Backlog — Initial Tasks:
   TASK-1 [HIGH] Inspect the Codebase and detail ARCHITECTURE.md
     → Run: /task-hunter 1
   TASK-2 [MEDIUM] Create the first feature/bug task
     → Run: /task-plan <request>

🚀 Available Commands:
   [for each command under .claude/commands/]
   /bootstrap  — Runs setup for the first time or re-runs in a controlled way
   [other commands]

🤖 Codex Target:
   [show this block if manifest.targets includes codex]
   Transform output: Agentbase/.codex/skills/*/SKILL.md and Agentbase/AGENTS.md
   Next step: /codex-verify
   Note: A second Codex bootstrap is NOT run; the existing manifest is the canonical source.
   If only `targets: [claude]` is set, both transform and Codex verify/adapt are skipped
   [SKIP this block if manifest.targets is only claude]

🎯 Target Codebase:
   Path:      [absolute path of manifest.project.structure — abs(Agentbase/../{manifest.project.structure})]
   Source:   Docbase/agentic/project-manifest.yaml → project.structure
   Hooks: shared-hook-utils.js → resolveCodebaseRoot(__dirname, "[manifest.project.structure]")

   To change the target (three methods, in priority order):
     1. Runtime override (single session/terminal):
          export AGENTIC_CODEBASE_DIR="/absolute/path/Codebase-wt-feat-auth"
          claude
     2. Worktree symlink rotation (persistent, manifest stays fixed):
          rm Codebase && ln -s /new/path Codebase
     3. Manifest update (persistent, regenerate required):
          Edit project.structure in Docbase/agentic/project-manifest.yaml,
          then run /workflow-update.

   Resolution order: env AGENTIC_CODEBASE_DIR > manifest.project.structure fallback.

🔒 Git Hook Setup:
   To enable commit/push checks in Codebase:

   cd [manifest.project.structure] && git config core.hooksPath "$(realpath ../Agentbase/git-hooks/)"

   This command enables pre-commit (test, lint, security) and pre-push (migration,
   env sync, localhost leak) checks.
   Bypass: TESTS_VERIFIED=1 git commit -m "..."

📖 Next Steps:
   [If GREENFIELD_MODE, show the block below:]
   🌱 Greenfield — Project Scaffold Setup:
      Run the appropriate command for your stack inside Codebase/:

      Node.js:       cd ../Codebase && npm init -y
      Express:       cd ../Codebase && npm init -y && npm install express
      Fastify:       cd ../Codebase && npm init -y && npm install fastify
      Next.js:       cd ../Codebase && npx create-next-app@latest .
      Expo:          cd ../Codebase && npx create-expo-app@latest .
      Python:        cd ../Codebase && python -m venv venv
      Django:        cd ../Codebase && django-admin startproject myproject .
      FastAPI:       cd ../Codebase && python -m venv venv && pip install fastapi uvicorn
      Flask:         cd ../Codebase && python -m venv venv && pip install flask
      Laravel:       cd ../Codebase && composer create-project laravel/laravel .
      CodeIgniter:   cd ../Codebase && composer create-project codeigniter4/appstarter .
      Go:            cd ../Codebase && go mod init [module-name]
      Rust:          cd ../Codebase && cargo init .
      Java/Kotlin:   Download a project from https://start.spring.io or: gradle init

      After the scaffold exists: /task-hunter 1

   [Show in every case:]
   1. /task-hunter 1 → [Greenfield: create scaffold | Normal: detail ARCHITECTURE.md]
   2. /task-plan "desired feature or bug" → creates a new backlog task
   3. /task-master → prioritizes all open tasks
   4. /task-hunter <id> → implements the task autonomously

📡 Live Session Monitor:
   You can follow sessions live in a separate terminal window:

   cd Agentbase && node bin/session-monitor.js

   The dashboard shows active sessions for Claude Code as one host
   (other hosts do not run Claude hooks automatically):
   - Which task is being worked on
   - Tool usage statistics (read/write/bash)
   - Teammate spawn status
   - Error counts
   - Backlog and git activity

   Shortcuts: q=quit, 1-9=detail, r=refresh, c=hide closed, h=help

[EXTENSION SUGGESTION SECTION — see below]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 7.1 Create Onboarding Guide (Agentbase ROOT)

Immediately after the completion report, create `./onboarding.md` at the Agentbase root. This file explains the first steps to a developer new to the target project.

> **INVARIANT RULE 2 — LOCATION:** `onboarding.md` is written to the Agentbase ROOT, not under `.claude/`. Reason:
> - All models (Claude, Gemini, Antigravity, Codex, Kimi, OpenCode) read the root context.
> - Thanks to the `@onboarding.md` line in root `CLAUDE.md`, it is automatically injected into every model's context.
> - Under `.claude/` only **agent runtime** files live (commands, agents, hooks, rules, settings.json, agent-facing CLAUDE.md) — not end-user documentation.

Fill the following template with manifest data and write it as `./onboarding.md`:

```markdown
# Onboarding — [manifest.project.name]

## Target Codebase

- **Path:** `[manifest.project.structure]` (relative from Agentbase)
- **Absolute:** `[abs(Agentbase/../{manifest.project.structure})]`
- **Single contract:** `Agentbase/.claude/hooks/shared-hook-utils.js` → `resolveCodebaseRoot()` is called by all hooks.

### Changing the Target

| Method | Command | Scope |
| --- | --- | --- |
| Runtime override | `export AGENTIC_CODEBASE_DIR=/new/path && claude` | Single terminal/session |
| Worktree symlink | `rm Codebase && ln -s /new/path Codebase` | Persistent, manifest fixed |
| Manifest update | `Docbase/agentic/project-manifest.yaml` → `project.structure` + `/workflow-update` | Persistent, regenerate required |

**Resolution order:** `env AGENTIC_CODEBASE_DIR` > `manifest.project.structure` fallback. Hooks follow this chain on every runtime call.

## First Steps

1. **Enable git hooks:**
   ```bash
   cd [manifest.project.structure] && git config core.hooksPath "$(realpath ../Agentbase/git-hooks/)"
   ```

2. **Check the backlog:**
   ```bash
   backlog board
   ```

3. **Open the session monitor (separate terminal):**
   ```bash
   cd Agentbase && node bin/session-monitor.js
   ```

## First Task

```bash
/task-hunter 1
```

## Daily Workflow

```
/task-plan "feature or bug description"   → Create a backlog task
/task-hunter <id>                          → Implement the task autonomously
/task-review <id>                          → Review the changes
/task-master                               → Prioritize all tasks
/deep-audit <area>                         → Domain-based deep audit
```

## Codex Target

[show if manifest.targets includes codex:]

```bash
/codex-verify
```

This step is optional. A second Codex bootstrap is NOT run; it only inspects the `.codex/skills/` and `AGENTS.md` target surface.
If only `targets: [claude]` is set, both transform and Codex verify/adapt are skipped

[SKIP this section if manifest.targets is only claude.]

## Project Info

- **Stack:** [manifest.stack.runtime] [if manifest.stack.orm: + manifest.stack.orm]
- **Active Modules:** [manifest.modules.active list]
- **Autonomy:** [manifest.developer.autonomy]
- **Security Level:** [manifest.project.security_level]
```

---

### 7.2 Extension Suggestion System

After the completion report, scan the extension pool and suggest extensions that fit the project.

#### Matching Logic

1. Read the `templates/extensions-registry.yaml` file
2. For each extension, check the `triggers` list:
   - `module: X` → is `X` in `manifest.modules.active` or `manifest.modules.standalone`?
   - `stack: [X, Y]` → is any of them in `manifest.stack.runtime`, `manifest.stack.detected`, or `manifest.modules.active.backend/frontend/mobile`?
   - `condition: "field == value"` → does the field in the manifest equal the given value?
   - `condition: "field >= number"` → is the field in the manifest greater than or equal to the given number?
3. If any trigger matches → add the extension to the suggestion list
4. If the `conflicts` field is populated → add a warning ("Agentbase already includes [feature]")

#### Conflict Check

If there is a conflict with Agentbase features listed in the extension's `conflicts` field, add a warning next to the suggestion:

```
⚠️  This extension may conflict with Agentbase's [feature] feature.
    [conflict description]
```

#### Report Output

If there are matching extensions, append to the end of the report:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧩 Suggested Extensions (fit for your project)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [Category]:
    [Extension Name] — [description]
      Install: [install command]
      [if any: ⚠️  Conflict note]

  [Another Category]:
    ...

  Note: These suggestions are OPTIONAL. None are required for Bootstrap.
  To expand the extension pool: templates/extensions-registry.yaml
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If there are no matching extensions, SKIP this section — do not show an unnecessary empty section.

---

## STEP 8 — COMPLETION VERIFICATION GATE (Verification Gate)

This step applies the **machine-checkable completion condition** defined in STEP 0. In `/goal` mode the evaluator looks at this step's results to put Claude into a new turn or end with `BOOTSTRAP_COMPLETE`.

**NEVER skip this step** — it must run at the end of every Bootstrap run (new, overwrite, merge, incremental).

### 8.1 Verification Bash Block

With `cwd = Agentbase`, run all of the following checks IN ORDER. Print each line's result to the console. Even a single failure counts as FAIL.

```bash
# === GATE A: Was the manifest written? (manifest_yazildi) ===
test -f ../Docbase/agentic/project-manifest.yaml && echo "✅ A1: manifest_yazildi" || echo "❌ A1: manifest_yazildi MISSING"

# === GATE B: Root documents in the CORRECT location (Agentbase ROOT, NOT .claude/) (root_dokumanlar_dogru_konumda) ===
# 10 root documents: 7 Bootstrap-managed (6 filled + onboarding) + 3 static (ORCHESTRATION.md, LESSONS.md, BACKLOG.md)
for f in PROJECT.md STACK.md DEVELOPER.md ARCHITECTURE.md WORKFLOWS.md CLAUDE.md onboarding.md ORCHESTRATION.md LESSONS.md BACKLOG.md; do
  test -f "./$f" && echo "✅ B-root: $f at Agentbase root (root_dokumanlar_dogru_konumda)" || echo "❌ B-root: $f MISSING (Agentbase root)"
  test -f "./.claude/$f" && echo "❌ B-claude: $f WRONG LOCATION (must not be under .claude/)" || echo "✅ B-claude: .claude/$f absent (correct)"
done

# === GATE B2: Does root CLAUDE.md import ALL root documents via @? (root_claude_import_zinciri_tam) ===
# Injection chain check — if root CLAUDE.md has missing imports, other models (Gemini, Antigravity, Codex, Kimi, OpenCode) cannot get context
# ORCHESTRATION.md and LESSONS.md are static root documents; they MUST be included in the @ chain
# Claude Code official syntax: @<file> (no spaces, single token). The "@ import X" form is seen as plain text — FAIL.
if [ -f ./CLAUDE.md ]; then
  for doc in PROJECT.md STACK.md DEVELOPER.md ARCHITECTURE.md WORKFLOWS.md ORCHESTRATION.md LESSONS.md onboarding.md; do
    # Look for @<doc> at line start or after whitespace; do not match spaced wrong forms like "@ import"
    if grep -Eq "(^|[[:space:]])@${doc//./\\.}([[:space:]]|$)" ./CLAUDE.md 2>/dev/null; then
      echo "✅ B2-import: root CLAUDE.md → @$doc (root_claude_import_zinciri_tam)"
    else
      echo "❌ B2-import: root CLAUDE.md → @$doc MISSING (injection chain broken)"
    fi
  done
fi

# === GATE C: .claude runtime files present (claude_runtime_dosyalari_var) ===
test -f ./.claude/settings.json && echo "✅ C1: settings.json present (claude_runtime_dosyalari_var)" || echo "❌ C1: settings.json MISSING"
test -d ./.claude/commands && echo "✅ C2: commands/ present" || echo "❌ C2: commands/ MISSING"
test -d ./.claude/agents && echo "✅ C3: agents/ present" || echo "❌ C3: agents/ MISSING"
test -d ./.claude/rules && echo "✅ C4: rules/ present" || echo "❌ C4: rules/ MISSING"

# === GATE D: .claude-ignore at root (claude_ignore_rootta) ===
test -f ./.claude-ignore && echo "✅ D1: .claude-ignore at root (claude_ignore_rootta)" || echo "❌ D1: .claude-ignore MISSING"

# === GATE E: CLAUDE_FILL markers completed (no half-done work) (claude_fill_marker_kalmadi) ===
# All root documents + .claude runtime + onboarding.md are scanned
remaining=$(grep -rln "CLAUDE_FILL:" ./.claude ./PROJECT.md ./STACK.md ./DEVELOPER.md ./ARCHITECTURE.md ./WORKFLOWS.md ./CLAUDE.md ./onboarding.md 2>/dev/null | head -20)
if [ -z "$remaining" ]; then echo "✅ E1: claude_fill_marker_kalmadi"; else echo "❌ E1: CLAUDE_FILL marker remains → $remaining"; fi

# === GATE F: Backlog initialized (backlog_init_edildi) ===
test -f ./backlog/config.yml && echo "✅ F1: backlog/config.yml present (backlog_init_edildi)" || echo "❌ F1: backlog not initialized"

# === GATE G: No root document is empty (root_dokumanlar_dolu) ===
# Static documents (ORCHESTRATION.md, LESSONS.md, BACKLOG.md) come from the repo; they must still not be empty
for f in PROJECT.md STACK.md DEVELOPER.md ARCHITECTURE.md WORKFLOWS.md CLAUDE.md ORCHESTRATION.md LESSONS.md BACKLOG.md; do
  if [ -f "./$f" ]; then
    size=$(wc -c < "./$f")
    if [ "$size" -gt 100 ]; then echo "✅ G: $f filled ($size bytes) (root_dokumanlar_dolu)"; else echo "❌ G: $f too small ($size bytes) — content missing"; fi
  fi
done

# === GATE H: No LEAK into Codebase (Invariant rule 2) (codebase_sizintisi_yok) ===
# Outside AI Import, there must be no bootstrap-produced files in Codebase
if [ -f /tmp/bootstrap-start ]; then
  echo "✅ H0: /tmp/bootstrap-start sentinel"
  leak=$(find ../Codebase -maxdepth 2 \( -name 'PROJECT.md' -o -name 'STACK.md' -o -name 'DEVELOPER.md' -o -name 'ARCHITECTURE.md' -o -name 'WORKFLOWS.md' -o -name 'CLAUDE.md' -o -name 'onboarding.md' -o -name 'ORCHESTRATION.md' -o -name 'LESSONS.md' -o -name 'BACKLOG.md' -o -name 'project-manifest.yaml' \) -newer /tmp/bootstrap-start 2>/dev/null | head -5)
  if [ -z "$leak" ]; then echo "✅ H1: codebase_sizintisi_yok"; else echo "❌ H1: Codebase LEAK: $leak"; fi
else
  echo "❌ H0: /tmp/bootstrap-start sentinel MISSING — Codebase leak check is not reliable"
fi

# === GATE I: basic-memory shared agent memory layer ready (TASK-236) ===
# Because Bootstrap requires basic-memory, it must also be verified in the verification gate —
# prevents silent failure (if Teammate 5 vault init instructions are swallowed, do not write BOOTSTRAP_COMPLETE).
test -f ./.mcp.json && echo "✅ I1: .mcp.json present" || echo "❌ I1: .mcp.json MISSING"
if [ -f ./.mcp.json ]; then
  grep -q '"basic-memory"' ./.mcp.json && echo "✅ I2: .mcp.json basic-memory entry present" || echo "❌ I2: .mcp.json basic-memory entry MISSING"
  grep -q '"mcp-server"' ./.mcp.json && echo "❌ I3: .mcp.json still registers codex mcp-server" || echo "✅ I3: no codex mcp-server entry"
fi
test -d ../Docbase/memory && echo "✅ I4: Docbase/memory vault directory present" || echo "❌ I4: Docbase/memory vault directory MISSING"
# basic-memory install persistence (is the package verified in STEP 1.1.5 still installed?)
if uv tool list 2>/dev/null | grep -q "^basic-memory "; then
  echo "✅ I5: basic-memory installed as uv tool"
else
  echo "❌ I5: basic-memory install was lost (it was present in STEP 1.1.5)"
fi

# === GATE J: Project-root .gitignore (Two-repo delivery model — STEP 6.6) ===
# The parent-root developer repo must ignore Codebase so clean customer delivery is possible.
# The file is always written (even if git init is opt-in); if missing, STEP 6.6.1 was swallowed.
# grep -q "Codebase" is INSUFFICIENT — it also matches in comments (false pass). Check sentinel + EXACT ignore lines.
if [ -f ../.gitignore ] \
   && grep -q "AGENTIC-WORKFLOW-ROOT-GITIGNORE" ../.gitignore \
   && grep -Eq "^/Codebase/?$" ../.gitignore \
   && grep -Eq "^/Codebase-wt-\*/$" ../.gitignore; then
  echo "✅ J1: project-root .gitignore present; sentinel + root-anchored Codebase + worktree ignore lines exist"
else
  echo "❌ J1: project-root ../.gitignore missing or sentinel/Codebase/worktree ignore line absent (STEP 6.6.1 may have been swallowed)"
fi
```

### 8.2 Result Decision Logic

Count the `❌` marks in all lines above:

- **0 × ❌** → SUCCESS. Print the following marker to stdout:
  ```
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ BOOTSTRAP_COMPLETE
     All gates PASS. When the /goal evaluator sees this marker it ends the session.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ```

- **1+ × ❌** → FAIL. Print the following marker to stdout and **CONTINUE COMPLETING THE MISSING STEPS**:
  ```
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ❌ BOOTSTRAP_INCOMPLETE
     FAIL count: <N>
     Missing:
       - <list each ❌ line>
     Next turn: complete these gaps, run STEP 8 again.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ```

### 8.3 Behavior in `/goal` Mode

If run as `/goal /bootstrap until "BOOTSTRAP_COMPLETE"`:

- STEP 8 runs at the end of every turn. The evaluator looks for the `BOOTSTRAP_COMPLETE` marker.
- If the marker is absent, Claude starts a new turn and closes the gaps in the `❌` list.
- When the marker is found, `/goal` ends.

### 8.4 Behavior in Single-Turn Mode (Fail-Loud)

If run without `/goal` and STEP 8 FAILs:

```
⚠️  Bootstrap finished incomplete. Because this was single-turn mode, no automatic retry was performed.

   To complete fully, re-run with:
     /goal /bootstrap until "BOOTSTRAP_COMPLETE"

   That mode engages the evaluator and runs until the gaps are closed.
```

### 8.5 Idempotency Guarantee

STEP 8 is read-only; it writes no files. It only uses `test`, `find`, `grep`, and `wc`. Multiple runs produce no side effects.

---

## ERROR HANDLING

Apply these rules across all steps:

1. **If a Bash command fails:** Show the error to the user, try an alternative if possible, otherwise skip that step and continue (except critical steps).

2. **If a template file is not found:** Warn, skip that file, continue with an empty template. Do NOT STOP Bootstrap.

3. **If a directory cannot be created:** Show the error and STOP — a filesystem access problem is critical.

4. **If a Backlog command fails:** Warn but complete bootstrap. Backlog tasks can be created manually later.

5. **If the user gives an invalid answer in the interview:** Show the options again and ask again.

6. **If a Teammate fails (Step 5):** Retry once with the same prompt. On a 2nd failure, notify the user and offer options (manual intervention / skip / cancel). Outputs of successful teammates are ALWAYS preserved. On partial success, produced files are not deleted; only gaps are retried. See Step 5.2.3 for details.

---

## RE-RUN BEHAVIOR

When `/bootstrap` is run again (manifest already exists):

1. In Step 1.3 check manifest compatibility and present the user with an `overwrite` / `merge` / `incremental` / `cancel` menu.
2. If `manifest.version` is on the same major version, `merge` and `incremental` are allowed; otherwise only `overwrite` or `cancel`.
3. `.claude/custom/` belongs to the user; Bootstrap does not write to this directory and preserves files there.
4. If a checksum differs on managed files, do not silently overwrite the file:
   - In `overwrite` mode take a rescue copy first, then regenerate
   - In `merge` / `incremental` mode write the candidate output to the rescue area and report to the user
5. In `merge` mode keep manifest answers, add new modules, move leaves no longer detected under `modules.skipped`.
6. In `incremental` mode regenerate only files whose template or related manifest entry changed.
7. Do NOT ADD new bootstrap init tasks to the backlog (the existing backlog is preserved).

# Graphify rules

> These rules apply only when the optional graphify module is selected.
> Bootstrap does not install graphify and does not fail when the CLI is absent.

---

<!-- GENERATE: CODEBASE_CONTEXT
Filled from the manifest.
Required fields: project.name, project.description, project.structure
Example output:
## Project context

- **Project:** MyApp
- **Layout:** Monorepo
- **Graphify CLI:** optional. If it is absent, continue without it.
- **Graph location:** `graphify-out/graph.json`
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## Graphify-first workflow

When the module is active, answer "where is X / what uses Y / how is Z connected" with graphify before grep.

| Question | Command |
| --- | --- |
| Code-relation discovery | `graphify query "<question>"` |
| One node | `graphify explain "<Node>"` |
| Path between two nodes | `graphify path "<A>" "<B>"` |
| Overview | `cat graphify-out/GRAPH_REPORT.md` |

**Shortcut:** `/g` (`.claude/commands/g.md`), generated only when this module is selected.

The hook `.claude/hooks/graphify-first-guard-v2.js` may suggest a graphify query. It does not block the turn.

### Grep is allowed for

- A literal constant, error string, or config key
- Files graphify does not index: `tests/`, `vendor/`, `node_modules/`, `.env*`, `.log`, `.sql`
- Confirming a line that graphify already named
- `git grep` or `rg --fixed-strings`

### Subagents

Do not tell a subagent to call a tool that exists only in the parent session. If you mention graphify, also say the subagent should use its own shell.

### Update

```bash
<!-- GENERATE: GRAPHIFY_UPDATE_COMMAND
Filled from the manifest. Monorepo: one `graphify update <path>` per subproject, then `python3 ../Agentbase/scripts/graphify-merge-layers.py`. Otherwise one `graphify update <codebasePath>`.
Required fields: project structure, project.subprojects, modules.active
Example (monorepo):
graphify update backend && \
graphify update web && \
python3 ../Agentbase/scripts/graphify-merge-layers.py
Example (single layer):
graphify update .
-->
```

`graphify-out/` is gitignored. If the graph is missing and the CLI is installed, run the update command. If the CLI is missing, skip the graph. Do not install it from bootstrap.

This file is generated to `.claude/rules/graphify-rules.md` only when the module is selected.

---
name: g
description: "Optional graphify shortcut. Usage: /g query <question>, /g explain <Node>, /g path <A> <B>, /g report, /g health"
---

# /g — Graphify shortcut

Runs a short graphify query. Generated only when the optional graphify module is selected. If the CLI is absent, say so and continue. Do not install it.

---

<!-- GENERATE: CODEBASE_CONTEXT
Filled from the manifest.
Required fields: project.name, project.description, project.structure
Example output:
## Project context

- **Project:** MyApp
- **Graph location:** `graphify-out/graph.json`
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

---

## Arguments

The first word of `$ARGUMENTS` is the mode. The rest is the argument.

| Mode | Command | Meaning |
| --- | --- | --- |
| `query <question>` | `graphify query "<question>"` | Code-relation query |
| `explain <Node>` | `graphify explain "<Node>"` | Node summary |
| `path <A> <B>` | `graphify path "<A>" "<B>"` | Shortest path |
| `report` | `head -100 graphify-out/GRAPH_REPORT.md` | Overview |
| `health` | health block below | Age and node count |
| empty or unknown | show this table | — |

Pass the argument as one quoted string.

## health

```bash
if [ ! -f graphify-out/graph.json ]; then
  echo "Graph is missing. graphify is optional; bootstrap does not install it."
<!-- GENERATE: GRAPHIFY_UPDATE_COMMAND_ECHO
Filled from the manifest. Printed with echo. Not executed.
Monorepo: one echo line per subproject, then the merge script.
Otherwise one `echo "   graphify update <codebasePath>"`.
Required fields: project structure, project.subprojects, modules.active
Example (single layer):
  echo "   graphify update ."
-->
else
  AGE_HOURS=$(python3 -c "import os,time; print(int((time.time()-os.path.getmtime('graphify-out/graph.json'))/3600))")
  NODES=$(python3 -c "import json; print(len(json.load(open('graphify-out/graph.json'))['nodes']))")
  EDGES=$(python3 -c "import json; print(len(json.load(open('graphify-out/graph.json'))['links']))")
  STATUS="OK"
  [ "$AGE_HOURS" -gt 24 ] && STATUS="STALE (>24h)"
  echo "Graph status: $STATUS"
  echo "   Age hours: ${AGE_HOURS}"
  echo "   Nodes: $NODES"
  echo "   Edges: $EDGES"
fi
```

If the graph is older than 24 hours, say so and still run the requested query.

Show graphify's own output. Do not summarize it away.

## Errors

- No graph: show the update command. Do not install the CLI.
- No `graphify` CLI: say it is optional and absent. Do not run an installer.
- Empty arguments: show the table.

## References

- `.claude/rules/graphify-rules.md`
- `../Agentbase/scripts/graphify-merge-layers.py` when the monorepo module is also active

## Required rules

1. **Do not write config into Codebase** — `.claude/`, `CLAUDE.md`, `.mcp.json`, and `.claude-ignore` are created only inside Agentbase.
2. **Git runs only in Codebase** — product git operations stay in `../Codebase/`.
3. **Codebase is readable; config is not written there**.

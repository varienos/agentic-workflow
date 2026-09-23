# Graphify Module Detection

## Checks

- file_exists: ~/.claude/skills/graphify/.graphify_version
- file_pattern: graphify-out/graph.json | graphify-out/manifest.json

## Minimum Match

0/2 (optional — detection result does not force module activation)

> Graphify is **optional**. The module is generated only when selected. The evidence above (Claude Code skill or existing graphify-out artifact) reports current install health. If the CLI is absent, bootstrap continues and does not install it.

## Activates

- hooks/graphify-first-guard-v2.js (fixed hook)
- commands/g.skeleton.md (slash command)
- rules/graphify-rules.skeleton.md (CLAUDE.md rule)
- scripts/graphify-merge-layers.skeleton.py (copied only when the monorepo module is also active)

## Affects Core

- code-review: For code-relation discovery questions, add graphify query guidance before grep
- CLAUDE.md: "Graphify-First Workflow" rule, whitelist table, `/g` reference (when selected)
- Bootstrap: Graphify setup runs only when selected; if the CLI is absent, bootstrap continues and does not install it. Optional first update (best-effort), `.gitignore` patch, optional pre-push

## Notes

- Hook is **fixed** — identical to the proven code on `.claude/hooks/graphify-first-guard-v2.js`; contains no GENERATE blocks.
- `/g` and rules are **skeletons** — the `graphify update` command varies by monorepo variant (multi-layer vs single-layer).
- `scripts/graphify-merge-layers.skeleton.py` is generated ONLY when the monorepo module is also active; otherwise it is unnecessary in the single-layer flow.

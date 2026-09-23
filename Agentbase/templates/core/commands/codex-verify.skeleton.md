# Codex Verify — Codex Target Verify/Adapt Pass

> After transform, audits the Codex target surface; does not run a second bootstrap.
> Usage: `/codex-verify`

---

## Purpose

This command checks whether the Codex target is usable after `/bootstrap` and `transform.js`.

**This is not a bootstrap.** Manifest, backlog, or Claude canonical outputs are not regenerated. The command only reads the existing manifest and Codex target outputs; if needed it prepares a report or a small adaptation suggestion for the Codex target surface only.

## Inputs

- Manifest: `../Docbase/agentic/project-manifest.yaml`
- Claude canonical source: `.claude/`
- Codex target outputs: `.agents/skills/*/SKILL.md`, `AGENTS.md`
- Supporting docs: README, onboarding, or bootstrap completion report

## Step 1 — Manifest and Target Check

1. Read `../Docbase/agentic/project-manifest.yaml`.
2. Check the `manifest.targets` field.
3. If the `codex` target is missing, report and stop:

```markdown
Codex verify/adapt skipped: `codex` is not in manifest.targets.
If only the Claude Code target was selected, transform and Codex verify/adapt do not run.
```

4. If the `codex` target exists, continue.

## Step 2 — Output Existence Check

Check these files and directories:

- `.agents/skills/`
- `.agents/skills/*/SKILL.md`
- `AGENTS.md`

If missing, do not suggest re-bootstrap. Suggest only the transform command:

```bash
node transform.js ../Docbase/agentic/project-manifest.yaml --targets codex --verbose
```

## Step 3 — Codex Skill Quality Check

For each `SKILL.md`, audit:

- YAML frontmatter exists.
- `name` and `description` fields are filled.
- Command invoke examples are adapted to `$command` format for the Codex target.
- `.claude/commands/` or `.claude/agents/` references have been converted to the target skill path.
- Claude-only runtime claims such as `.claude/hooks/`, `.claude/tracking/`, and `settings.json` are not described as running automatically on the Codex target.

## Step 4 — AGENTS.md Check

For `AGENTS.md`, audit:

- Project context and rules are readable.
- `.claude/rules/` content is inlined or represented in context.
- No hook parity claim: Codex outputs must not be described as automatically carrying the Claude Code hook runtime.
- Agentbase/Codebase boundaries are preserved.

## Step 5 — Adaptation Decision

Keep the decision narrow:

- **Report is enough:** If gaps are not behavioral, write only a report.
- **Small target-surface fix:** Fix only Codex-specific path/invoke text inside `.agents/skills/` or `AGENTS.md`.
- **Large problem:** If a transform or template change is needed, create a backlog task; do not re-run the existing bootstrap.

## Step 6 — Report

Give the report in this format:

```markdown
## Codex Verify/Adapt Report

- Manifest target: [codex present/absent]
- Skill count: [count]
- AGENTS.md: [present/absent]
- Findings: [list]
- Applied adaptation: [none or file list]
- Next step: [use in Codex / re-run transform / backlog task]
```

## Required Rules

### Invariant rules (apply to every command)

1. **Do not write config into Codebase** — `.claude/`, `.agents/`, `.codex/`, `CLAUDE.md`, `AGENTS.md`, `.mcp.json`, `.claude-ignore` files are created ONLY inside Agentbase. Creating a `.claude/`, `.agents/`, or `.codex/` directory inside Codebase, or writing `../Codebase/CLAUDE.md` or `../Codebase/AGENTS.md`, is FORBIDDEN.
2. **Git runs only in Codebase** — All git operations (commit, push, branch) run inside `../Codebase/`. There is NO git in Agentbase.
3. **Codebase is readable; config is not written there** — Project files (`src/`, `app/`, etc.) can be read. Config files (`.claude/`, `.agents/`, `.codex/`, `CLAUDE.md`, `AGENTS.md`) cannot be written inside Codebase.

1. **No second bootstrap** — Do not run a separate bootstrap for Codex; do not restart the manifest/backlog.
2. **Canonical source is Claude outputs** — The Codex target is produced from `.claude/` source outputs via transform.
3. **No hook parity claim** — Do not report the Claude Code hook runtime as automatically carried to Codex.
4. **Narrow adaptation** — If a fix is needed, touch only the Codex target surface.

<!-- GENERATE: SELF_REFRESH
Description: Command final step - self-refresh check. Bootstrap replaces this marker
with the shared Self-Refresh section. The command reviews its own text against the
project reality: small mismatches via Edit, large changes reported as a backlog task.
-->

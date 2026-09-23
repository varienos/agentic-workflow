# Portable workflow disciplines

These rules apply to every host that runs this workflow. Claude is one host, not the product. Hooks registered in `settings.json` run in the Claude Code runtime only. Other hosts do not run those hooks automatically. They still follow the same task, review, and commit steps.

## Core loop

1. Task: read the backlog item, implement only that scope, and run the verification named in its acceptance checks.
2. Review: review the diff for correctness, silent failures, and regressions before closing the task.
3. Commit: commit completed non-sensitive work in the same session without asking. Do not push unless the user asks.

## Five disciplines

1. Commit completed non-sensitive work in the same session without asking. Do not push unless the user asks.
2. When a workflow chain breaks (hook rejection, path or working-directory error, backlog CLI failure, or an MCP/tool error that blocks the chain), record a backlog item.
3. Do not state a root cause, a numeric threshold, or that a fix works without a falsifiable measurement. Label anything unmeasured.
4. Each acceptance check names an evidence class and an owner. Human-only acceptance is not an agent Done gate.
5. Do not tell a subagent to call a tool that exists only in the parent session.

Detail lives in the sibling rules: `session-commit-protocol.md`, `workflow-friction-protocol.md`, `no-unmeasured-claims.md`, `evidence-gated-acceptance.md`, and `subagent-tool-surface.md`.

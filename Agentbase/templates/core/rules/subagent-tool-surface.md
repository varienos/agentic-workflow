# Subagent tool surface

Do not tell a subagent to call a tool that exists only in the parent session.

A spawned subagent does not receive the parent session's MCP servers, plugin tools, `ToolSearch`, or `ctx_*` tools. Telling it to call those tools wastes the turn.

## Use in the subagent

The file, search, and shell tools that the subagent's own host provides.

## Spawn prefix

Put this at the start of every subagent prompt:

```
SUBAGENT TOOL SURFACE: do not call parent-only tools (MCP tools that exist only in the parent session, ToolSearch, or ctx_*). Use the file, search, and shell tools available in the subagent session.
```

The same prompt still carries the task, review, and commit steps from `portable-disciplines.md`.

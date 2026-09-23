# Workflow friction protocol

When a workflow chain breaks (hook rejection, path or working-directory error, backlog CLI failure, or an MCP/tool error that blocks the chain), record a backlog item.

## Record these

- A hook rejects work or a hook error cannot be recovered.
- `backlog` CLI create or edit fails.
- A path or working-directory anchor is wrong.
- A rule or command no longer matches the project.
- Generate or transform output has drifted from the command text.
- An MCP server or tool is unavailable and that blocks the chain.
- A documented file path does not exist.

## Do not record these as friction

- A product bug. Use the bug-fix flow.
- A failing test that the active task is already fixing.
- A one-off preference the user stated on purpose.

## How

1. Search existing tasks. If one matches, append a note. Do not open a duplicate.
2. If the break is three lines or fewer and inside the current task, fix it inline and note it.
3. Otherwise create a backlog task with the `workflow-friction` label. Include symptom, impact, reproduction, and a suggested fix.
4. Edit backlog only through the `backlog` CLI.

List opened friction task ids in the final report. If there was no friction, omit that section.

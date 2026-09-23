# Evidence-gated acceptance

Each acceptance check names an evidence class and an owner. Human-only acceptance is not an agent Done gate.

An acceptance check without a class is invalid.

## Classes

| Class | What it is | Owner |
| --- | --- | --- |
| `agent-deterministic` | test, build, typecheck, search, or file read | agent |
| `agent-runtime` | the agent runs the project's own command and records the output | agent |
| `human-authority` | production approval, legal sign-off, or a person's visual acceptance | human |

Write each check as: `<observable result> — evidence: <command or artifact> [<class>] owner: <agent or human>`.

## Human-only checks

Put `human-authority` checks in a separate `## Human acceptance` section. They are not an agent Done gate. Report them as `NEEDS_HUMAN`. Do not mark the task Done because a person has not yet looked.

## When evidence cannot be produced

Do not invent a result and do not write `n/a` as if it were evidence. Record:

`[EVIDENCE_UNAVAILABLE] class=<class> reason=<command and the concrete error> ts=<ISO8601>`

Leave the task out of Done and list it as `NEEDS_HUMAN`. "It would take a while" is not a reason. When the evidence later becomes available, add it. Do not delete the unavailable line.

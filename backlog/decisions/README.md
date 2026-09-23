# Architecture Decision Records

This directory holds ADR records for decisions that affect project architecture.

## File Name

Open a new ADR file in this format:

```text
YYYYMMDD-kebab-case-karar-basligi.md
```

Example:

```text
20260512-agentbase-codebase-separation.md
```

Copy `0000-adr-template.md` for a draft or example.

## When Is It Required?

The following changes require an ADR or a reference to an existing ADR:

- Layer boundary, module ownership, or public API contract is changing
- Data flow, persistence model, migration strategy, or integration contract is changing
- Runtime, deploy model, framework, package manager, or primary technology choice is changing
- A cross-cutting policy such as security, auth, authorization, logging, error handling, or observability is changing
- A new workflow or automation that affects multiple subprojects is being added

Do not open a new ADR for small refactors, typos, test additions, local bug fixes, or narrow changes that only apply an existing decision; a task note with an "ADR not required" rationale is enough.

## Minimum fields

Every ADR must include at least these fields:

- Status
- Date
- Context
- Decision
- Alternatives Considered
- Consequences
- Rollback / Revisit Trigger
- Related Tasks / Links

## Workflow Contract

On tasks that include architectural change, before implementation starts:

1. Write a new ADR file or reference an existing ADR file.
2. Add an ADR check to the task acceptance criteria.
3. Include the ADR file path or an "ADR not required" rationale in the commit and final summary.

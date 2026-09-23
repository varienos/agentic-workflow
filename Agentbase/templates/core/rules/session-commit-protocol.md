# Session commit protocol

Commit completed non-sensitive work in the same session without asking. Do not push unless the user asks.

## Rule

When you created, edited, or deleted a file, commit that work before the session ends. Do not ask "should I commit?". A commit is not a push.

## What is in scope

Code, tests, config, rules, commands, backlog notes, plans, and review reports. "Not code", "generated", or "small" is not an exemption.

In the generated layout, application changes are committed in the git repository that tracks them. Product files are committed in `Codebase`. Do not stage secrets. Do not `git add -f` an ignored file. Do not use `git add .` or `git add -A`.

## Exceptions

Only three:

- The user explicitly said not to commit.
- The file is actually gitignored.
- The file contains a secret.

A read-only session that changed no files does not need a commit. If tests are failing or the work is unfinished, keep fixing it. If a real blocker remains, report `BLOCKED / UNCOMMITTED` with the path and the reason. That is not Done. Do not skip hooks or secret checks to force a commit.

## Close

1. Review staged, unstaged, and untracked files.
2. Commit only the files that belong to the completed work.
3. Report the commit hash. If anything in scope is still uncommitted, name the path and the safe reason.

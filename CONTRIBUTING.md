# Contributing Guide

Thank you for considering a contribution to Agentic Workflow!

## How Can I Contribute?

### Bug Reports

1. First check [existing issues](https://github.com/varienos/agentic-workflow/issues)
2. If the same problem is not reported, open a new issue
3. Include the steps needed to reproduce the problem
4. State the expected and actual behavior

### Feature Proposals

1. Open the proposal [as an issue](https://github.com/varienos/agentic-workflow/issues/new)
2. Explain what problem the proposal solves
3. If possible, outline a solution approach

### Code Contributions

1. Fork the repo
2. Create a new branch: `git checkout -b feat/feature-name`
3. Make your changes
4. Run tests: `cd Agentbase && npm test`
5. Commit: `git commit -m "feat: description"`
6. Push: `git push origin feat/feature-name`
7. Open a Pull Request

### Commit Rules

Use the Conventional Commits format:

| Prefix | Use |
|--------|----------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation |
| `test:` | Add/fix tests |
| `refactor:` | Restructuring |

### Adding a New Module

To add a new stack/framework module:

1. Create a directory under `Agentbase/templates/modules/` in the appropriate category
2. Define detection conditions in `detect.md`
3. Add hook, rule, or command skeletons
4. Use existing modules as patterns
5. Write tests

### How detect.md Works

Every module contains a `detect.md` file that decides whether the module applies to the project.

**Checklist (`Checks`):** A list of items that verify file presence or dependency presence.

```markdown
## Checks

- file_exists: vercel.json
- dependency: vercel
- file_exists: .vercel/
```

**Minimum Match:** States how many checks must match. A value of `2/3` means the module activates when at least two of three checks succeed. This lets users activate the module without creating every check file.

```markdown
## Minimum Match

2/3
```

**Conflict resolution:** When multiple modules match the same files (for example Docker and Coolify may both look at `docker-compose.yml`), Bootstrap clarifies with the interview question "What is your deploy platform?". When Coolify is selected it is activated INSTEAD OF Docker; conflict disappears because Coolify uses Docker output as an upper layer.

**Category detect.md:** The `detect.md` at the root of the module directory lists all variants in that category and which to check first. Variant order can matter (for example NestJS → Fastify → Express: more specific to more general).

**Activates:** The list of files `generate.js` will produce when the module activates: commands (slash commands), agents (sub-agents), rules (rule files).

```markdown
## Activates

- commands/pre-deploy.skeleton.md (slash command)
- agents/frontend.skeleton.md (sub-agent)
```

### File Naming Rules

**`.skeleton` suffix:** Template files use `.skeleton.md`, `.skeleton.js`, or `.skeleton.json`. When `generate.js` processes these files it fills GENERATE blocks and removes the `.skeleton` extension (`task-hunter.skeleton.md` → `task-hunter.md`). Static files (such as hooks with no GENERATE block) are stored without the `.skeleton` suffix and copied as-is.

**Directory layout:**
- `templates/core/` — Skeletons produced for every project (commands, hooks, rules, agents, git-hooks)
- `templates/modules/{category}/{variant}/` — Module-specific files (produced only for active modules)
- `templates/reference/` — Design reference documents (v1 notes, workflows, methods). These files are NOT processed by generate.js — they are internal references the bootstrap command reads as context.
- `templates/interview/` — Bootstrap interview templates. Not processed by generate.js.

### Important Directory Notes

- **`Codebase/`** — Represents the real project code being worked on. In the repository this directory is a placeholder; the user links their own project with a symlink (`ln -s /path/to/project Codebase`). In greenfield mode it must not contain real project files; `.gitkeep` and `.DS_Store` are accepted as placeholders.
- **`Docbase/agentic/project-manifest.yaml`** — Manifest file produced by Bootstrap. It does NOT exist in the repo up front — it is created on the first `/bootstrap` run. `generate.js` and `transform.js` use this file as input.

### Bootstrap Interview Templates

There are four interview template files under `Agentbase/templates/interview/`. These files are not processed by `generate.js`; they are internal references the Bootstrap command reads as context the first time it is applied to a project.

| File | Purpose | Files Produced |
|------|---------|----------------|
| `phase-1-project.md` | Project fundamentals — what the project is, environments, deploy method | `PROJECT.md`, `ARCHITECTURE.md`, `README.md` |
| `phase-2-technical.md` | Technical preferences — test strategy, branch model, commit convention, ORM, auth | `STACK.md`, `WORKFLOWS.md`, hook configuration |
| `phase-3-developer.md` | Developer profile — experience level, working language, autonomy expectations | `DEVELOPER.md`, agent behavior calibration |
| `phase-4-rules.md` | Domain rules — forbidden commands, design system, security level | `rules/` directory, protection hooks |

**How it works:** When `/bootstrap` runs, Bootstrap follows these interview templates in order. Each phase automatically scans the codebase before asking the user (auto-detection) and pre-fills known information. User answers are saved to `Docbase/agentic/project-manifest.yaml`, and `generate.js` produces project-specific files from that manifest.

**To contribute:** If you want to add a new question or auto-detection rule, edit the relevant phase file. Keep the existing question structure (`Questions`, `Skip condition`, `Maps to`, `Downstream`).

```bash
cd Agentbase
npm test          # All tests
```

A test file is REQUIRED for every newly added JS file.

### Test File Placement

| Test File | What It Tests |
|---|---|
| `generate.test.js` | generate.js functions, SIMPLE_GENERATORS, CLI argument parse |
| `transform.test.js` | transform.js conversion functions (extractDescription, TOML/YAML formats) |
| `tests/changelog.test.js` | CHANGELOG generator helpers (formatDate, groupByType) |
| `tests/codebase-guard.test.js` | codebase-guard hook — Codebase config path blocking rules |
| `tests/core-hooks.test.js` | Core hooks (code-review, test-enforcer, team-trigger, auto-test-runner, auto-format, openapi-sync) |
| `tests/generate-regressions.test.js` | generate.js regression and CLI integration tests |
| `tests/git-hooks.test.js` | Git pre-commit/pre-push hooks (E2E: with temp git repo) |
| `tests/guard-hooks.test.js` | Framework guard hooks (artisan, spark, django, manage-py) |
| `tests/hook-edge-cases.test.js` | Edge-case resilience across all hooks (empty stdin, broken JSON, long path) |
| `tests/kutsal-rules-regressions.test.js` | Sacred-rule regressions — config-write and git-boundary checks in skeletons |
| `tests/prisma-hooks.test.js` | Prisma-specific hooks (db-push-guard, migration-check, destructive-migration) |
| `tests/release.test.js` | Release script helpers (detectBump: major/minor/patch decision logic) |
| `tests/session-observability.test.js` | Session-tracker and session-monitor tests |
| `tests/interview-structure.test.js` | Interview phase file structure (Questions, Maps to, Phase Completion) |
| `tests/markdown-links.test.js` | Repo-wide markdown link validity and placeholder detection |
| `tests/session-monitor-runtime.test.js` | Session monitor TUI runtime (handleKey, cleanup, watcher, render) |
| `tests/transform-cli.test.js` | Transform.js CLI integration (E2E: manifest + dry-run + report) |
| `tests/workflow-update.test.js` | Workflow update manifest meta and diff engine integration |
| `tests/docs-consistency.test.js` | README TR/EN synchronization and documentation consistency |
| `tests/shared-hook-utils.test.js` | Guard hook factory (createGuardHook, runGuard) unit tests |

### Hook Test Helpers

Two helpers under `tests/helpers/`:

- **`hook-runner.js`** — `createTempProject`, `materializeHook`, `runHook`, `writeCodebaseFile`, `makeHookInput`. Materializes hooks in a temp directory and runs them with `spawnSync`.
- **`module-loader.js`** — `loadModuleExports`. Extracts pure functions from skeleton JS files via `vm.runInNewContext` for testing. Fills GENERATE blocks with `replacements` and specifies the function list with `exports`.

### Extension References

`Agentbase/templates/extensions-registry.yaml` is the structured source for the Bootstrap extension recommendation system. `Agentbase/templates/extensions-registry.md` is the human-readable reference catalog and is NOT processed by generate.js. If you are adding a source only as a documentation reference, update the Markdown table; if you want it to work as a Bootstrap recommendation, update the YAML format as well.

## Contact

Questions: hello@varien.software

## License

By contributing, you agree that your contribution will be published under the MIT license.

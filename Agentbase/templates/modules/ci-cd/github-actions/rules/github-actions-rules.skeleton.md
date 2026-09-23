# GitHub Actions Rules

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: project.name, project.description, project.structure
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

## Core Rules

### Workflow File Standards
- Every workflow file must include a `name:` field
- Workflow triggers must be stated explicitly (`on:` block)
- `runs-on:` must be defined on every job

### Secret Management

| Rule | Description |
|-------|----------|
| Hardcoded secrets are FORBIDDEN | All secrets must be managed via GitHub Secrets |
| Environment secrets | Production secrets must be protected with environment protection |
| GITHUB_TOKEN scope | Grant the minimum required permissions (`permissions:` block) |

### Cache Strategy
- Node.js projects: cache `node_modules/` or `.npm/` with `actions/cache`
- Python projects: use `pip` cache
- Docker build: layer cache (`docker/build-push-action` with `cache-from/cache-to`)

### Artifact Management
- Build artifacts must be stored with `actions/upload-artifact`
- Test reports (coverage, junit) must be uploaded as artifacts
- Artifact retention should be set to project needs (default 90 days)

### Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|----------------|
| Unnecessary use of `continue-on-error: true` | Use only for optional steps |
| Checking out the entire repo (`fetch-depth: 0`) | Prefer shallow clone (`fetch-depth: 1`) when not needed |
| Using the `latest` tag on actions | Pin a specific version (`@v4`, `@sha`) |
| One monolithic workflow | Split workflows by purpose (test, build, deploy) |

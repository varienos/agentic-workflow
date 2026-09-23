# GitLab CI Rules

<!-- GENERATE: CODEBASE_CONTEXT
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: project.name, project.description, project.structure
Invariant rules:
- Config files live only inside Agentbase
- A `.claude/` directory is not created inside Codebase
- Git runs only in Codebase
-->

## Core Rules

### Pipeline Stage Standards
- Every pipeline must define a standard stage order: `stages: [build, test, deploy]`
- Every job must include a `stage:` field
- Stage names must use lowercase and hyphens (example: `integration-test`)
- Avoid unnecessary stage definitions — unused stages slow the pipeline

### Variable Management

| Rule | Description |
|-------|----------|
| Hardcoded secrets are FORBIDDEN | All secrets must be managed via CI/CD Variables |
| Protected variables | Production secrets must be marked `protected` |
| Masked variables | Sensitive values must be marked `masked` |
| `$CI_*` variables | Use GitLab built-in variables (`$CI_COMMIT_SHA`, `$CI_PIPELINE_ID`, etc.) |
| Group-level variables | Shared secrets should be defined at the group level |

### Cache Strategy
- Use `$CI_COMMIT_REF_SLUG` or a lock-file hash as the cache key
- Node.js projects: cache `node_modules/` or `.npm/`
- Python projects: cache `.pip/` or `venv/`
- Cache policy: `policy: pull` on read-only jobs, `policy: push` on writers
- Define a fallback key (`cache:key:files` or `cache:key:prefix`)

### Artifact Management
- Build artifacts must be defined with `artifacts:paths`
- Test reports must be uploaded with `artifacts:reports` (junit, coverage, sast, etc.)
- Artifact lifetime must be limited with `expire_in` (example: `expire_in: 7 days`)
- Do not store unnecessarily large files as artifacts
- Explicitly state which jobs receive artifacts with `dependencies` or `needs`

### Runner Selection

| Rule | Description |
|-------|----------|
| Use `tags` | Specify an appropriate runner tag for every job |
| Shared runner | Prefer shared runners for general-purpose work |
| Specific runner | Use a specific runner for special needs (GPU, private network) |
| Docker executor | Pin the image version (`image: node:20-alpine`, not `latest`) |

### Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|----------------|
| Unnecessary use of `allow_failure: true` | Use only for truly optional steps |
| Unnecessary `dependencies` | Connect only to required jobs with `needs` |
| Caching the entire repo | Cache only dependency directories |
| Poor use of `when: manual` | Avoid manual gates except for production deploy |
| Using `image: latest` | Pin a specific version (`image: node:20.11-alpine`) |
| One monolithic `.gitlab-ci.yml` | Use `include` with split configuration files |
| Using `only/except` | Prefer the modern `rules:` syntax |

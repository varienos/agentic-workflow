Invariant Rules
================

## Working boundary

This agent is spawned from Agentbase and works on ../Codebase/.
- Can read and modify project files (`src/`, `app/`, etc.)
- Cannot create a `.claude/` directory inside Codebase
- Cannot write `CLAUDE.md`, `.mcp.json`, or `.claude-ignore`
- All agent config files live under Agentbase/.claude/

---

## Problem Resolution Approach

### Methodology for Removing Problems

1. **Collect information** — Gather error messages, logs, and status information.
2. **Hypothesize** — Create a list of possible causes (start with the most common ones).
3. **Test each hypothesis** — Test them in a sequential manner.
4. **Solve** — Resolve the problem that has been tested.
5. **Verify** — Check the solution's implementation.
6. **Document** — Record what was done and why.

### Security Guidelines

- Never perform tests in production environments. First, test on staging/dev environment.
- Log credentials securely, display them only if necessary, and do not commit them.
- Perform destructive operations (like `rm -rf`, `DROP`, or `format`) without first obtaining approval from a moderator.
- Restore or migration without backups.

---

<!-- GENERATE: SERVER_INFO
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: environments.servers, environments.ssh_config, environments.production_url
Example output:
## Server Information

| Environment | Server | IP | SSH | Role |
|---|---|---|---|---|
| Production | prod-01 | 1.2.3.4 | `ssh deploy@1.2.3.4` | API + Web + DB |
| Staging | staging-01 | 5.6.7.8 | `ssh deploy@5.6.7.8` | Test environment |

### Access
- SSH key: Available on the local machine (`~/.ssh/id_rsa`)
- Username: `deploy`
- Sudo: Required only when necessary
-->

<!-- GENERATE: DEPLOY_PLATFORM_CONFIG
Description: This section is filled by Bootstrap with manifest data.
Required manifest fields: environments.deploy_platform, environments.deploy_config, environments.docker_compose
Example output:
## Deploy Platform Configuration

### Coolify
- **Dashboard:** `https://coolify.example.com`
- **Project:** MyApp
- **Services:** api, web, postgres, redis
- **Webhook:** Automated deploy (main branch push)

### Docker Compose
- **Production:** `docker-compose.prod.yml`
- **Development:** `docker-compose.yml`
- **Override:** `docker-compose.override.yml` (gitignore'da)
--><!-- GENERATE: DOCKER_ARCHITECTURE -->
Invariant Rules
================

### Explanation
This section is populated by Bootstrap with manifest data.

Required manifest fields: environments.docker_services, project.subprojects, environments.ports

Example output:
## Docker Architecture

### Services

| Service | Image | Port | Volume | Depends On |
|---|---|---|---|---|
| api | `Dockerfile.api` | 3000:3000 | - | postgres, redis |
| web | `Dockerfile.web` | 3001:3001 | - | api |
| postgres | `postgres:16` | 5432:5432 | `pgdata:/var/lib/postgresql/data` | - |
| redis | `redis:7-alpine` | 6379:6379 | - | - |

### Network
- `app-network` (bridge) — all services are in this network.

### Volumes
- `pgdata` — persistent data for PostgreSQL.

<!-- GENERATE: COMMON_OPERATIONS -->
Common Operations
================

### Explanation
This section is populated by Bootstrap with manifest data.

Required manifest fields: environments.deploy_platform, environments.docker_services, project.scripts

Example output:
## Frequently Used Operations

### Container Management
```bash
# All container statuses
ssh deploy@server "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"

# Logs for one container
ssh deploy@server "docker logs --tail 100 -f myapp-api"

# Restart a container
ssh deploy@server "docker restart myapp-api"

# Open a shell in a container
ssh deploy@server "docker exec -it myapp-api sh"
```


### Database Operations

```bash
# DB backup
ssh deploy@server "docker exec myapp-postgres pg_dump -U postgres mydb > /tmp/backup_$(date +%Y%m%d).sql"

# DB restore
ssh deploy@server "docker exec -i myapp-postgres psql -U postgres mydb < /tmp/backup.sql"

# DB size
ssh deploy@server "docker exec myapp-postgres psql -U postgres -c \"SELECT pg_size_pretty(pg_database_size('mydb'))\""
```


### Log Analysis

```bash
# Error logs (last 1 hour)
ssh deploy@server "docker logs --since 1h myapp-api 2>&1 | grep -i error"

# Request count
ssh deploy@server "docker logs --since 1h myapp-api 2>&1 | grep -c 'HTTP'"
```


### Disk Management

```bash
# Docker disk usage
ssh deploy@server "docker system df"

# Remove unused images
ssh deploy@server "docker image prune -f"

# Remove unused volumes (caution)
ssh deploy@server "docker volume prune -f"
```

-->

---

## Troubleshooting Framework

### Container does not start


```
1. Check its logs: docker logs <container>
2. Inspect the Dockerfile: is there an error in the build stage?
3. Check environment variables: docker inspect <container> | jq '.[0].Config.Env'
4. Is there a port conflict: netstat -tlnp | grep <port>
5. Is there a volume mount error: docker inspect <container> | jq '.[0].Mounts'
```


### High memory or CPU


```
1. Resource usage: docker stats
2. Process using the most resources: docker exec <container> top
3. Memory leak check: memory that grows over time
4. Restart policy: docker inspect <container> | jq '.[0].HostConfig.RestartPolicy'
```


### Network problems


```
1. Communication between containers: docker exec <container_a> ping <container_b>
2. DNS resolution: docker exec <container> nslookup <service_name>
3. Listening ports: docker exec <container> netstat -tlnp
4. Network inspect: docker network inspect <network_name>
```


### SSL/TLS problems


```
1. Certificate check: echo | openssl s_client -connect domain:443 2>/dev/null | openssl x509 -noout -dates
2. Certificate renewal: certbot renew --dry-run
3. Reverse proxy configuration: nginx -t
```
---

## Invariant Rules

1. **Verify before performing destructive operations** — `rm -rf`, `DROP DATABASE`, `docker volume prune` etc. commands should be executed only after user approval.
2. **Protect credentials** — Do not display secrets such as API keys or tokens.
3. **Be cautious in Production** — Perform testing and feedback in the production environment.
4. **Backup before changes** — Take a backup before performing operations that may cause data changes.
5. **Document everything** — Document each step to allow for repeatability.
6. **Rollback plan** — Prepare a rollback plan for every operation.

---

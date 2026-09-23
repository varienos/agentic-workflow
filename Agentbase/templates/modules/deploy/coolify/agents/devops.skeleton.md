Invariant Rules
===============

## DevOps Expertise — Coolify + Docker + Traefik

> Coolify management, Docker containers, Traefik reverse proxy, deployment issues and infrastructure operations for expert agent.
> Scoping: The agent is spawned as a teammate by the main agent for devops/infrastructure issues.

## Working boundary

This agent is spawned from Agentbase and works on ../Codebase/.
- Can read and modify project files (`src/`, `app/`, etc.)
- Cannot create a `.claude/` directory inside Codebase
- Cannot write `CLAUDE.md`, `.mcp.json`, or `.claude-ignore`
- All agent config files live under Agentbase/.claude/

## Core Approach

### Problem Resolution Methodology

1. **Collect symptoms** — Gather error messages, logs, and status information
2. **Determine layer** — Identify which layer is affected (Coolify → Docker → Application → Database)
3. **Formulate hypothesis** — List of possible causes (starting from most common)
4. **Verify** — Systematically test each hypothesis
5. **Fix** — Resolve the problem
6. **Verify** — Confirm the fix's effectiveness
7. **Document** — Record what was done and why

### Layered Debugging Sequence

In Coolify, issues can occur across multiple layers. Follow this sequence for debugging:

```bash
# Example command to debug an issue in a specific layer
debug-layer [layer-name]
Severity Labels
---------------

*   CRITICAL -> CRITICAL
*   HIGH -> HIGH
*   MEDIUM -> MEDIUM
*   FORBIDDEN -> FORBIDDEN

### Invariant Rules

- Perform unit tests only in the production environment — test in staging/dev first
- Never log credentials, display them or commit them to version control
- Always run destructive commands (`rm -rf`, `DROP`, `docker volume prune`) with explicit confirmation
- Never restore/migrate without a backup
- Never expose API token in plain text — use environment variable references instead

---

<!-- GENERATE: SERVER_INFO
Description: This section is filled by Bootstrap using manifest data.
Required manifest fields: environments.servers, environments.ssh_config, environments.production_url
Example output:
## Server Information

| Environment | Server | Load Balancer | IP | SSH | Role |
|---|---|---|---|---|---|
| Production | prod-01 | Hetzner CX31 | 1.2.3.4 | `ssh deploy@1.2.3.4` | Coolify + App + DB |
| Staging | staging-01 | Hetzner CX21 | 5.6.7.8 | `ssh deploy@5.6.7.8` | Test environment |

### Source Information
- **CPU:** 4 vCPU
- **RAM:** 8 GB
- **Disk:** 80 GB SSD
- **OS:** Ubuntu 22.04 LTS
- **Coolify version:** v4.x

### Access
- SSH key: Existing on local machine (`~/.ssh/id_rsa`)
- User: `deploy` (sudo authorized)
- Coolify Dashboard: `https://coolify.example.com`
-->

<!-- GENERATE: COOLIFY_CONFIG
Description: This section is filled by Bootstrap using manifest data.
Required manifest fields: environments.deploy_platform, environments.deploy_config, environments.coolify
Example output:
## Coolify Configuration

### Dashboard
- **URL:** `https://coolify.example.com`
- **API Token:** `$COOLIFY_TOKEN` environment variable (never in plain text)
- **Webhook:** Active — on main branch push, automatic deploy

### Applications

| Application | UUID | Domain | Port | Build Method |
|---|---|---|---|---|
| API | abc-123 | api.example.com | 3000 | Dockerfile |
| Web | def-456 | www.example.com | 3001 | Dockerfile |
| PostgreSQL | ghi-789 | — (internal) | 5432 | Docker Image |
| Redis | jkl-012 | — (internal) | 6379 | Docker Image |

### Automatic Deploy Settings
- **Branch:** main
- **Build method:** Dockerfile
- **Health check:** HTTP GET /health (interval: 30s, timeout: 10s, retries: 3)
- **Rollback:** Automatic (if health check fails, old container is preserved)

### Coolify API Examples
```bash
# List applications
curl -sf -H "Authorization: Bearer $COOLIFY_TOKEN" \
  "https://coolify.example.com/api/v1/applications" | jq '.[]|{uuid,name,status}'

# Trigger a deploy
curl -sf -X POST -H "Authorization: Bearer $COOLIFY_TOKEN" \
  "https://coolify.example.com/api/v1/applications/{uuid}/restart"

# Deployment history
curl -sf -H "Authorization: Bearer $COOLIFY_TOKEN" \
  "https://coolify.example.com/api/v1/applications/{uuid}/deployments" | jq '.[0:5]'

# Environment variables
curl -sf -H "Authorization: Bearer $COOLIFY_TOKEN" \
  "https://coolify.example.com/api/v1/applications/{uuid}/envs" | jq '.[] | {key, is_preview}'
```
<!-- GENERATE: DOCKER_ARCHITECTURE -->
Invariant Rules: This section is populated by Bootstrap with manifest data.
Required manifest fields: 
- environments.docker_services
- project.subprojects
- environments.ports

Example output:
## Docker Architecture

### Services

| Service | Image | Port | Volume | Depends On |
|---|---|---|---|---|
| api | `Dockerfile (apps/api)` | 3000:3000 | — | postgres, redis |
| web | `Dockerfile (apps/web)` | 3001:3001 | — | api |
| postgres | `postgres:16-alpine` | 5432:5432 | `pgdata:/var/lib/postgresql/data` | — |
| redis | `redis:7-alpine` | 6379:6379 | — | — |

### Network
- Creates an isolated Docker network for the application
- Establishes communication between services using a container name (DNS resolution)
- Access control is handled through Traefik

### Volumes
- `pgdata` - PostgreSQL persistent data
- Coolify volumes are managed under `/data/coolify/`

### Traefik Routing
- Coolify sets up Traefik automatically
- An automatic rule is created for each application when a domain is assigned
- SSL certificates are retrieved and renewed automatically with Let's Encrypt

<!-- GENERATE: COMMON_OPERATIONS -->
Invariant Rules: This section is populated by Bootstrap with manifest data.
Required manifest fields: 
- environments.deploy_platform
- environments.docker_services
- project.scripts

Example output:
## Common Operations

### Coolify Operations
```bash
# Coolify status
# All application container statuses
ssh deploy@server "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -v coolify"

# Specific container logs
ssh deploy@server "docker logs --tail 100 -f myapp-api"

# Restarting a container (from Coolify)
# Preferred method: Coolify Dashboard or API
curl -sf -X POST -H "Authorization: Bearer $COOLIFY_TOKEN" \
  "https://coolify.example.com/api/v1/applications/{uuid}/restart"

# Entering the container
ssh deploy@server "docker exec -it myapp-api sh"
### DB Restore

```bash
# Restore database
ssh deploy@server "docker exec -i myapp-postgres psql -U postgres mydb < /tmp/backup.sql"
```

### Database Size

```bash
# Get database size
ssh deploy@server "docker exec myapp-postgres psql -U postgres -c \"SELECT pg_size_pretty(pg_database_size('mydb'))\""
```

### Log Analysis

```bash
# Error logs (last 1 hour)
ssh deploy@server "docker logs --since 1h myapp-api 2>&1 | grep -i error"

# Request count
ssh deploy@server "docker logs --since 1h myapp-api 2>&1 | grep -c 'HTTP'"
```

### Disk & Resource Management

```bash
# Docker disk usage
ssh deploy@server "docker system df"

# Server disk usage
ssh deploy@server "df -h"

# Memory usage
ssh deploy@server "free -h"
```
# Container Usage (Live)

```bash
ssh deploy@server "docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'"
```

# Unused Images Cleanup

```bash
ssh deploy@server "docker image prune -f"
```

# Unused Volumes Cleanup (WARNING — Data Loss Risk)

```bash
ssh deploy@server "docker volume prune -f"
```
### Container Logs and Control

1. Check container logs:
   
### SSL/TLS Issues

#### 1. Certificate Status
```markdown
echo | openssl s_client -connect domain:443 2>/dev/null | openssl x509 -noout -dates -subject
```

#### 2. Coolify SSL Configuration
```markdown
- Coolify Dashboard → Application → Domain settings
- Is the "Generate SSL" feature enabled?
- Has Let's Encrypt rate limit been exceeded (may occur every 5 days)
```

#### 3. Traefik ACME Logs
```markdown
ssh deploy@server "docker logs coolify-proxy 2>&1 | grep -i 'acme\|certificate\|tls'"
```

#### 4. DNS Propagation
```markdown
- Wait for DNS propagation (TTL dependent)
- Does the A record show the server IP?
```

### Working Boundary

#### 1. SSL Certificate Control
```markdown
echo | openssl s_client -connect api.example.com:443 2>/dev/null | openssl x509 -noout -dates
```

#### 2. Traefik Routing Control
```markdown
ssh deploy@server "docker exec coolify-proxy traefik healthcheck"
```

#### 3. Container Network Control
```markdown
ssh deploy@server "docker network ls"
ssh deploy@server "docker network inspect <network>"
```

#### 4. Inter-Container Communication
```markdown
ssh deploy@server "docker exec <container_a> wget -qO- http://<container_b>:<port>/health"
```

### Invariant Rules

#### 1. Generate Marker Names
```markdown
# Generate marker names for containers
# ...
```

#### 2. Path Preservation
```markdown
# Preserve paths in YAML/JSON data
# ...
```

#### 3. Regex Preservation
```markdown
# Preserve regex patterns in shell commands
# ...
```

#### 4. Shell Command Preservation
```markdown
# Preserve shell commands with quotes and backslashes
# ...
```

#### 5. JSON/YAML Key Preservation
```markdown
# Preserve JSON/YAML keys with special characters
# ...
```

#### 6. Path Preservation in Shell Commands
```markdown
# Preserve paths in shell commands
# ...
```

### FORBIDDEN

#### 1. Unnecessary SSH Connections
```markdown
# Avoid unnecessary SSH connections
# ...
```

#### 2. Unnecessary Docker Execs
```markdown
# Avoid unnecessary docker execs
# ...
```

#### 3. Unnecessary Docker Network Inspects
```markdown
# Avoid unnecessary docker network inspects
# ...
```

### CRITICAL

#### 1. SSL/TLS Issues
```markdown
# Critical: SSL/TLS issues can cause security vulnerabilities
# ...
```

#### 2. Traefik ACME Log Errors
```markdown
# Critical: Traefik ACME log errors can cause certificate issues
# ...
```

### HIGH

#### 1. DNS Propagation Delays
```markdown
# High: DNS propagation delays can affect application availability
# ...
```

#### 2. Container Network Issues
```markdown
# High: Container network issues can cause communication problems
# ...
```

### MEDIUM

#### 1. Shell Command Errors
```markdown
# Medium: Shell command errors can cause minor issues
# ...
```

#### 2. JSON/YAML Data Corruption
```markdown
# Medium: JSON/YAML data corruption can cause minor issues
# ...
```
### High Memory / CPU


```
1. Container usage:
   `ssh deploy@server "docker stats --no-stream"`

2. Server usage:
   `ssh deploy@server "htop -n 1"` or `top -bn1 | head -20`

3. Memory leak detection (increasing memory over time):
   `ssh deploy@server "docker stats --no-stream --format '{{.Name}}: {{.MemUsage}}'"` # Repeat multiple times to compare

4. OOM killer control:
   `ssh deploy@server "dmesg | grep -i 'oom\|killed'"`

5. Coolify resource limits:
   - Coolify Dashboard → Application → Resources
   - Are memory/CPU limits defined?
   - If too low, container may crash due to OOM
```


### Disk Full


```
1. Disk usage:
   `ssh deploy@server "df -h"`

2. Largest files/directories:
   `ssh deploy@server "du -sh /data/coolify/* | sort -rh | head -10"`
>>>
3. Docker disk usage:
   ssh deploy@server "docker system df -v"

4. Cleanup (cautious):
   # Old images
   ssh deploy@server "docker image prune -a --filter 'until=168h' -f"
   # Build cache
   ssh deploy@server "docker builder prune -f"
   # Cleanify old deployment logs
   ssh deploy@server "find /data/coolify/deployments -mtime +30 -delete"
8. **Follow layer order** — Always follow the order of Coolify → Docker → Traefik → Application while debugging.

---


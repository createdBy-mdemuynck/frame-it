# Frame It - Docker/Podman Deployment Guide

## 🐋 Podman vs Docker

This application works with **both Podman and Docker**. Choose what works for you:

| Feature       | Podman                   | Docker                     |
| ------------- | ------------------------ | -------------------------- |
| Daemon        | ❌ Daemonless            | ✅ Requires daemon         |
| Root access   | ❌ Rootless by default   | ⚠️ Typically requires root |
| Compatibility | ✅ Docker-compatible API | ✅ Native                  |
| Desktop app   | Podman Desktop           | Docker Desktop             |
| Command       | `podman-compose`         | `docker-compose`           |

**All commands in this guide work with both.** Just replace:

- `docker-compose` → `podman-compose`
- `docker` → `podman`

💡 **Using Podman?** You can alias: `alias docker=podman` and `alias docker-compose=podman-compose`

### Quick Command Reference

| Task                 | Podman                                        | Docker                                        |
| -------------------- | --------------------------------------------- | --------------------------------------------- |
| Start production     | `podman-compose up -d`                        | `docker-compose up -d`                        |
| Start development    | `podman-compose -f docker-compose.dev.yml up` | `docker-compose -f docker-compose.dev.yml up` |
| View logs            | `podman-compose logs -f`                      | `docker-compose logs -f`                      |
| Stop containers      | `podman-compose down`                         | `docker-compose down`                         |
| Build images         | `podman-compose build`                        | `docker-compose build`                        |
| List containers      | `podman ps`                                   | `docker ps`                                   |
| Container stats      | `podman stats`                                | `docker stats`                                |
| Execute in container | `podman exec -it`                             | `docker exec -it`                             |

---

## 🐳 Container Architecture

This application runs in two Docker containers:

### **Backoffice Container** (Server/API)

- **Port**: 3001
- **Purpose**: Express.js API, file upload handling, admin pages
- **Image**: Node.js 20 Alpine
- **Health Check**: `/health` endpoint

### **Frontoffice Container** (Web/UI)

- **Port**: 3000
- **Purpose**: Next.js user interface for photo uploads
- **Image**: Node.js 20 Alpine
- **Health Check**: Root endpoint

---

## 🚀 Quick Start

### Production Deployment

Build and start both containers:

```bash
docker-compose up -d
```

Check status:

```bash
docker-compose ps
```

View logs:

```bash
docker-compose logs -f
```

Stop containers:

```bash
docker-compose down
```

### Development with Hot Reload

Start development environment:

```bash
docker-compose -f docker-compose.dev.yml up
```

This mounts your source code into the containers, enabling hot reload on code changes.

---

## 📋 Available Commands

### Build Commands

```bash
# Build all containers
docker-compose build

# Build specific container
docker-compose build backoffice
docker-compose build frontoffice

# Force rebuild (no cache)
docker-compose build --no-cache
```

### Run Commands

```bash
# Start in detached mode (background)
docker-compose up -d

# Start with logs visible
docker-compose up

# Start only backoffice
docker-compose up -d backoffice

# Development mode with hot reload
docker-compose -f docker-compose.dev.yml up
```

### Management Commands

```bash
# Stop containers (keeps data)
docker-compose stop

# Stop and remove containers (data in volumes persists)
docker-compose down

# Stop and remove containers + volumes (deletes uploaded photos)
docker-compose down -v

# Restart a service
docker-compose restart backoffice

# View logs
docker-compose logs -f backoffice    # Backoffice logs
docker-compose logs -f frontoffice   # Frontoffice logs
docker-compose logs -f              # All logs
```

### Debugging Commands

```bash
# Check container status
docker-compose ps

# Execute command in running container
docker-compose exec backoffice sh
docker-compose exec frontoffice sh

# Check health status
docker inspect frameit-backoffice | grep -A 5 Health
docker inspect frameit-frontoffice | grep -A 5 Health

# View resource usage
docker stats frameit-backoffice frameit-frontoffice
```

---

## 🌐 Access Points

After running `docker-compose up -d`:

| Service         | URL                              | Purpose                    |
| --------------- | -------------------------------- | -------------------------- |
| **Frontoffice** | http://localhost:3000            | User photo upload          |
| **Backoffice**  | http://localhost:3001            | Admin login and management |
| **API**         | http://localhost:3001/api/\*     | REST endpoints             |
| **Uploads**     | http://localhost:3001/uploads/\* | Uploaded photos            |

---

## 📁 Data Persistence

### Volumes

The uploads directory is persisted using Docker volumes:

```yaml
volumes:
  - ./server/uploads:/app/uploads
```

**Uploaded photos are stored on your host machine** at `./server/uploads/` and mapped into the container. This means:

- ✅ Photos survive container restarts
- ✅ Photos persist when recreating containers
- ✅ You can backup by copying `./server/uploads/`

### Backup Uploaded Photos

```bash
# Create backup
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz server/uploads/

# Restore backup
tar -xzf uploads-backup-YYYYMMDD.tar.gz
```

---

## 🔧 Configuration

### Environment Variables

**Backoffice** (`docker-compose.yml`):

```yaml
environment:
  - PORT=3001
  - NODE_ENV=production
  - SESSION_SECRET=your-secret-here
```

**Frontoffice** (`docker-compose.yml`):

```yaml
environment:
  - NODE_ENV=production
  - NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Custom Configuration

Create a `.env` file in the project root:

```env
# Backoffice
BACKOFFICE_PORT=3001
SESSION_SECRET=your-production-secret

# Frontoffice
FRONTOFFICE_PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Then update `docker-compose.yml` to use these variables.

---

## 🏥 Health Checks

Both containers have built-in health checks:

**Backoffice**: Checks `/health` endpoint every 30 seconds  
**Frontoffice**: Checks root endpoint every 30 seconds

View health status:

```bash
docker-compose ps
```

Healthy containers show `Up (healthy)`.

---

## 🐛 Troubleshooting

### Containers won't start

**Check logs:**

```bash
docker-compose logs backoffice
docker-compose logs frontoffice
```

**Common issues:**

- Port already in use → Stop conflicting services
- Build failed → Run `docker-compose build --no-cache`
- Permission denied → Check file permissions on `./server/uploads/`

### Cannot access on localhost

**Docker Desktop on Windows/Mac:**
Containers should be accessible on `localhost`.

**Linux:**
May need to use container IP:

```bash
docker inspect frameit-backoffice | grep IPAddress
```

### Uploads not persisting

**Check volume mount:**

```bash
docker inspect frameit-backoffice | grep -A 10 Mounts
```

Ensure `./server/uploads` exists on host and has write permissions.

### Hot reload not working (dev mode)

**Windows users:**
Add to `docker-compose.dev.yml` frontoffice environment:

```yaml
- WATCHPACK_POLLING=true
```

Already configured ✅

### Out of disk space

**Clean up Docker:**

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove all stopped containers
docker container prune

# Clean everything (⚠️ removes all unused Docker resources)
docker system prune -a --volumes
```

---

## 🔄 Update Workflow

### Update Application Code

1. **Pull latest code:**

   ```bash
   git pull
   ```

2. **Rebuild containers:**

   ```bash
   docker-compose build
   ```

3. **Recreate containers:**
   ```bash
   docker-compose up -d
   ```

### Update Dependencies

```bash
# Rebuild with no cache
docker-compose build --no-cache

# Restart
docker-compose up -d
```

---

## 🧪 Testing Container Setup

### 1. Health Check

```bash
curl http://localhost:3001/health
# Should return: {"status":"ok"}
```

### 2. Upload Test

1. Visit http://localhost:3000
2. Fill in name and email
3. Upload a photo
4. Check if file appears in `./server/uploads/`

### 3. Admin Test

1. Visit http://localhost:3001
2. Login with any email
3. View gallery and leaderboard

---

## � Podman-Specific Notes

### SELinux Permissions (Linux)

If you encounter permission errors on systems with SELinux (Fedora, RHEL, CentOS):

**Add `:z` flag to volume mounts:**

```yaml
# In docker-compose.yml
volumes:
  - ./server/uploads:/app/uploads:z
```

The `:z` flag relabels the volume for container access.

### Podman as Non-Root

Podman runs rootless by default, which is more secure but can cause permission issues:

**If uploads fail with permission errors:**

```bash
# Check directory permissions
ls -la server/uploads/

# Fix ownership (use your user, not root)
chown -R $USER:$USER server/uploads/
chmod -R 755 server/uploads/
```

### Podman Desktop

[Podman Desktop](https://podman-desktop.io/) provides a Docker Desktop-like GUI:

- Visual container management
- Compatible with `docker-compose.yml` files
- Cross-platform (Windows, Mac, Linux)
- No daemon required

### Command Aliases

For 100% Docker command compatibility:

**Linux/Mac (.bashrc or .zshrc):**

```bash
alias docker='podman'
alias docker-compose='podman-compose'
```

**Windows PowerShell ($PROFILE):**

```powershell
Function docker { podman $args }
Function docker-compose { podman-compose $args }
```

Then use regular Docker commands!

### Podman Machine (Mac/Windows)

On Mac/Windows, Podman uses a VM:

```bash
# Initialize Podman machine (first time only)
podman machine init

# Start Podman machine
podman machine start

# Check status
podman machine list
```

---

## �📊 Production Best Practices

### Security

1. **Change session secret:**

   ```yaml
   - SESSION_SECRET=use-a-strong-random-secret-here
   ```

2. **Use environment files:**
   Don't commit secrets to git. Use `.env` files (already in `.gitignore`).

3. **Run as non-root:**
   Add to Dockerfiles:
   ```dockerfile
   USER node
   ```

### Performance

1. **Use Docker BuildKit:**

   ```bash
   DOCKER_BUILDKIT=1 docker-compose build
   ```

2. **Resource limits:**
   Add to `docker-compose.yml`:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: "1"
         memory: 512M
   ```

### Monitoring

1. **View logs with timestamps:**

   ```bash
   docker-compose logs -f --timestamps
   ```

2. **Export logs to file:**
   ```bash
   docker-compose logs > app-logs-$(date +%Y%m%d).log
   ```

---

## 🎯 Common Scenarios

### Scenario 1: Fresh Start

```bash
docker-compose down -v  # Remove everything
docker-compose build    # Rebuild
docker-compose up -d    # Start
```

### Scenario 2: Code Changes (Production)

```bash
docker-compose build backoffice  # Rebuild changed service
docker-compose up -d backoffice  # Restart service
```

### Scenario 3: Development

```bash
docker-compose -f docker-compose.dev.yml up  # Auto-reload on changes
```

### Scenario 4: View All Activity

```bash
docker-compose logs -f --tail=100  # Last 100 lines, follow
```

---

## 📞 Support

For issues:

1. Check logs: `docker-compose logs`
2. Check health: `docker-compose ps`
3. Review [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
4. Check Docker docs: https://docs.docker.com/compose/

---

**Ready to deploy!** 🚀

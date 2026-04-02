# 🚀 Docker/Podman Quick Start - Frame It

## Prerequisites

**Choose one:**

### Option A: Podman (Rootless, Daemonless)
- Windows: [Podman Desktop](https://podman-desktop.io/) or Podman CLI
- Mac: `brew install podman podman-compose`
- Linux: `sudo apt install podman podman-compose` (or your package manager)

**Verify Podman:**
```bash
podman --version
podman-compose --version
```

### Option B: Docker
- Windows: Docker Desktop for Windows
- Mac: Docker Desktop for Mac
- Linux: Docker Engine + Docker Compose

**Verify Docker:**
```bash
docker --version
docker-compose --version
```

💡 **Note:** All commands below work with both. Just replace `docker-compose` with `podman-compose` if using Podman.

---

## 🎯 Quick Start (Production)

### 1. Build and Start

From the project root:

**Podman:**
```bash
podman-compose up -d
```

**Docker:**
```bash
docker-compose up -d
```

This command:
- ✅ Builds both containers (backoffice + frontoffice)
- ✅ Creates a network between them
- ✅ Starts containers in background
- ✅ Maps ports 3000 and 3001

### 2. Verify Running

**Podman:**
```bash
podman-compose ps
# or
podman ps
```

**Docker:**
```bash
docker-compose ps
```

Should see:
```
NAME                      STATUS          PORTS
frameit-backoffice        Up (healthy)    0.0.0.0:3001->3001/tcp
frameit-frontoffice       Up (healthy)    0.0.0.0:3000->3000/tcp
```

### 3. Access the App

| What | URL |
|------|-----|
| **Upload photos** | http://localhost:3000 |
| **Admin panel** | http://localhost:3001 |

### 4. View Logs

**Podman:**
```bash
podman-compose logs -f              # All logs
podman-compose logs -f backoffice   # Just backoffice
podman-compose logs -f frontoffice  # Just frontoffice
```

**Docker:**
```bash
docker-compose logs -f              # All logs
docker-compose logs -f backoffice   # Just backoffice
docker-compose logs -f frontoffice  # Just frontoffice
```

### 5. Stop

**Podman:**
```bash
podman-compose stop  # Stop (keeps data)
podman-compose down  # Stop and remove containers (data persists)
```

**Docker:**
```bash
docker-compose stop  # Stop (keeps data)
docker-compose down  # Stop and remove containers (data persists)
```

---

## 🔧 Development Mode (Hot Reload)

### 1. Start Development Environment

**Podman:**
```bash
podman-compose -f docker-compose.dev.yml up
```

**Docker:**
```bash
docker-compose -f docker-compose.dev.yml up
```

**Do NOT use `-d` (detached mode)** — you want to see logs in real-time.

### 2. Make Changes

Edit files in:
- `./server/` → Backoffice auto-reloads (nodemon)
- `./web/` → Frontoffice auto-reloads (Next.js dev)

Changes apply instantly!

### 3. Stop Development

Press `Ctrl+C` in the terminal, then:
```bash
docker-compose -f docker-compose.dev.yml down
```

---

## 🧪 Testing

### Test Upload Flow

1. Visit http://localhost:3000
2. Enter name and email
3. Upload a photo
4. Check `./server/uploads/` folder — photo should be there!

### Test Admin Flow

1. Visit http://localhost:3001
2. Login with any email (no password, dev mode)
3. View gallery — see uploaded photos
4. Click stars to vote
5. View leaderboard — see rankings

---

## 🔄 Common Tasks

### Rebuild After Code Changes (Production)

**Podman:**
```bash
podman-compose build
podman-compose up -d
```

**Docker:**
```bash
docker-compose build
docker-compose up -d
```

### View Container Resource Usage

**Podman:**
```bash
podman stats frameit-backoffice frameit-frontoffice
```

**Docker:**
```bash
docker stats frameit-backoffice frameit-frontoffice
```

### Clean Restart

**Podman:**
```bash
podman-compose down
podman-compose build --no-cache
podman-compose up -d
```

**Docker:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Delete Everything (including uploads!)

**Podman:**
```bash
podman-compose down -v
```

**Docker:**
```bash
docker-compose down -v
```

⚠️ **Warning:** This deletes uploaded photos!

---

## 🐛 Troubleshooting

### "Port already in use"

**Problem:** Another service is using port 3000 or 3001.

**Solution:**
```bash
# Windows PowerShell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000,3001).OwningProcess

# Linux/Mac
lsof -i :3000
lsof -i :3001

# Stop conflicting services or change ports in docker-compose.yml
```

### "Container unhealthy"

**Problem:** Health check failing.

**Solution:**

**Podman:**
```bash
podman-compose logs backoffice
```

**Docker:**
```bash
docker-compose logs backoffice
```

**Common fixes:**
1. Wait longer (health checks take 10-15 seconds on first start)
2. Rebuild: `podman-compose build --no-cache` or `docker-compose build --no-cache`
3. Check .env files exist

### "Cannot access localhost:3000"

**Podman Desktop / Docker Desktop (Windows/Mac):**
Should work on `localhost` by default.

**Podman CLI or Docker Toolbox:**
May need container IP:

**Podman:**
```bash
podman inspect frameit-frontoffice | grep IPAddress
```

**Docker:**
```bash
docker inspect frameit-frontoffice | grep IPAddress
```

### "Hot reload not working (Windows)"

**Solution:** Already fixed! `WATCHPACK_POLLING=true` is set in `docker-compose.dev.yml`.

If still not working:
1. Make sure you're using `docker-compose.dev.yml`
2. Restart containers
3. Try editing a file and saving — changes should appear in ~2-5 seconds

---

## 📊 Production Checklist

Before deploying to production:

- [ ] Change `SESSION_SECRET` in `docker-compose.yml`
- [ ] Set strong secrets (not defaults)
- [ ] Configure proper CORS origins (not `*`)
- [ ] Set `NODE_ENV=production`
- [ ] Configure HTTPS/SSL
- [ ] Set up backup for `./server/uploads/`
- [ ] Configure monitoring and logs
- [ ] Test upload limits (currently 5MB)

---

## 🐋 Podman-Specific Tips

### Command Aliases (Optional)

Make Podman commands identical to Docker:

**Linux/Mac (.bashrc or .zshrc):**
```bash
alias docker=podman
alias docker-compose=podman-compose
```

**Windows (PowerShell profile):**
```powershell
Set-Alias -Name docker -Value podman
Set-Alias -Name docker-compose -Value podman-compose
```

Then use regular `docker-compose` commands!

### Rootless Containers

Podman runs rootless by default - no sudo needed:
```bash
podman-compose up -d  # No sudo required!
```

### Podman Desktop

If you prefer a GUI, install [Podman Desktop](https://podman-desktop.io/):
- Visual container management
- Compatible with Docker Compose files
- Works on Windows, Mac, and Linux

### SELinux Issues (Linux)

If you get permission errors on Linux with SELinux:
```bash
# Add :z flag to volumes in docker-compose.yml
volumes:
  - ./server/uploads:/app/uploads:z
```

---

## Next Steps

- [ ] Read [DOCKER.md](DOCKER.md) for advanced configuration
- [ ] Review [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system
- [ ] Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) if issues arise

---

**That's it! You're running Frame It with Podman/Docker.** 🎉

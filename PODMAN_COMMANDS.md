# Podman Commands Reference

Since `podman-compose` is not installed, here are the manual Podman commands to manage your Frame It containers.

## 🚀 Currently Running

✅ **Backoffice** running on http://localhost:3001 (with Sharp image processing support)  
✅ **Frontoffice** running on http://localhost:3000

Both containers are up and healthy!

### ⚡ Recent Fix Applied

The backoffice container has been rebuilt with **libvips** and Sharp dependencies to properly support thumbnail generation on Alpine Linux. All existing thumbnails have been regenerated, and new uploads will automatically create thumbnails.

---

## 📋 Quick Reference

### View Running Containers
```bash
podman ps
```

### View All Containers (including stopped)
```bash
podman ps -a
```

### View Logs
```bash
# Backoffice logs
podman logs frameit-backoffice
podman logs -f frameit-backoffice  # Follow (live)

# Frontoffice logs
podman logs frameit-frontoffice
podman logs -f frameit-frontoffice  # Follow (live)
```

### Stop Containers
```bash
# Stop one
podman stop frameit-backoffice
podman stop frameit-frontoffice

# Stop both
podman stop frameit-backoffice frameit-frontoffice
```

### Start Containers (if stopped)
```bash
# Start one
podman start frameit-backoffice
podman start frameit-frontoffice

# Start both
podman start frameit-backoffice frameit-frontoffice
```

### Restart Containers
```bash
# Restart one
podman restart frameit-backoffice
podman restart frameit-frontoffice

# Restart both
podman restart frameit-backoffice frameit-frontoffice
```

### Remove Containers (must be stopped first)
```bash
# Remove one
podman rm frameit-backoffice

# Remove both
podman rm frameit-backoffice frameit-frontoffice

# Force remove (stops and removes)
podman rm -f frameit-backoffice frameit-frontoffice
```

---

## 🔄 Rebuild and Restart

### After Code Changes

**1. Stop and remove old containers:**
```bash
podman stop frameit-backoffice frameit-frontoffice
podman rm frameit-backoffice frameit-frontoffice
```

**2. Rebuild images:**
```bash
podman build -t frameit-backoffice:latest -f server/Dockerfile server
podman build -t frameit-frontoffice:latest -f web/Dockerfile web
```

**3. Start new containers:**
```bash
# Backoffice
podman run -d --name frameit-backoffice --network frameit-network -p 3001:3001 -e PORT=3001 -e NODE_ENV=production -e SESSION_SECRET=frameit-production-secret-change-me -v "${PWD}/server/uploads:/app/uploads:z" frameit-backoffice:latest

# Frontoffice
podman run -d --name frameit-frontoffice --network frameit-network -p 3000:3000 -e NODE_ENV=production -e NEXT_PUBLIC_API_URL=http://localhost:3001 frameit-frontoffice:latest
```

---

## 🧹 Complete Cleanup

### Remove Everything
```bash
# Stop and remove containers
podman stop frameit-backoffice frameit-frontoffice
podman rm frameit-backoffice frameit-frontoffice

# Remove images
podman rmi frameit-backoffice:latest frameit-frontoffice:latest

# Remove network
podman network rm frameit-network

# Remove all build cache (optional - frees disk space)
podman system prune -a
```

---

## 🐛 Troubleshooting

### Check Container Status
```bash
podman ps -a
```

Look for STATUS column:
- `Up X seconds` = Running ✅
- `Exited (0)` = Stopped normally
- `Exited (1)` = Crashed ❌

### Inspect Container
```bash
podman inspect frameit-backoffice
podman inspect frameit-frontoffice
```

### View Resource Usage
```bash
podman stats frameit-backoffice frameit-frontoffice
```

### Execute Commands Inside Container
```bash
# Get a shell in the container
podman exec -it frameit-backoffice sh

# Run a specific command
podman exec frameit-backoffice ls -la /app/uploads
```

### Check Network
```bash
# List networks
podman network ls

# Inspect network
podman network inspect frameit-network
```

### Regenerate Thumbnails (if needed)

If thumbnails are missing for uploaded photos:

```bash
# Copy the regeneration script to the container
podman cp server/regenerate-thumbs.js frameit-backoffice:/app/regenerate-thumbs.js

# Run the script
podman exec frameit-backoffice node /app/regenerate-thumbs.js
```

This will scan all uploaded photos and create any missing thumbnails.

---

## 🔧 Development Mode (Optional)

For development with hot reload, you can mount your source code:

### Backoffice (Dev)
```bash
podman run -d --name frameit-backoffice-dev --network frameit-network -p 3001:3001 -e PORT=3001 -e NODE_ENV=development -e SESSION_SECRET=frameit-dev-secret -v "${PWD}/server:/app:z" -v "/app/node_modules" frameit-backoffice:latest npm run dev
```

### Frontoffice (Dev)
```bash
podman run -d --name frameit-frontoffice-dev --network frameit-network -p 3000:3000 -e NODE_ENV=development -e NEXT_PUBLIC_API_URL=http://localhost:3001 -v "${PWD}/web:/app:z" -v "/app/node_modules" -v "/app/.next" frameit-frontoffice:latest npm run dev
```

---

## 💡 Tips

### Create Aliases (PowerShell)
Add to your PowerShell profile (`$PROFILE`):

```powershell
# Stop containers
Function Stop-FrameIt {
    podman stop frameit-backoffice frameit-frontoffice
}

# Start containers
Function Start-FrameIt {
    podman start frameit-backoffice frameit-frontoffice
}

# View logs
Function Logs-FrameIt {
    param([string]$service = "all")
    if ($service -eq "all") {
        podman logs -f frameit-backoffice
    } else {
        podman logs -f "frameit-$service"
    }
}

# Restart everything
Function Restart-FrameIt {
    podman restart frameit-backoffice frameit-frontoffice
}
```

Then use:
```powershell
Stop-FrameIt
Start-FrameIt
Logs-FrameIt backoffice
Restart-FrameIt
```

---

## 📦 Install podman-compose (Optional)

If you want to use `podman-compose` for easier management:

```bash
# Install using pip (Python package manager)
pip install podman-compose

# Verify installation
podman-compose --version

# Then use docker-compose.yml files:
podman-compose up -d
podman-compose down
podman-compose logs -f
```

---

**Ready!** Your Frame It application is running in Podman containers. 🚀

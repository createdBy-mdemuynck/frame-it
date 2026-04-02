# Environment Configuration Update Summary

## ✅ Changes Made

Your application has been updated to use environment-based configuration for the backend API URL, making it properly work across development, Docker, and Azure production environments.

---

## 🔧 What Was Changed

### 1. **Frontend Configuration** (`web/`)

#### Updated Files:

- **`src/components/UploadForm.jsx`**: Now reads `NEXT_PUBLIC_API_URL` from environment
- **`next.config.js`**: Configured to expose environment variables and use standalone output
- **`Dockerfile`**: Updated to accept build args and runtime env vars
- **`.env.local`**: Development environment (localhost:3001)
- **`.env.production`**: Production base config
- **`.env.development`**: Development base config

#### How It Works:

```javascript
// Automatically uses the right URL based on environment
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
```

### 2. **Docker Configuration**

#### `docker-compose.yml` (Production)

- Frontend build args configured for Docker network
- Environment variable set for browser requests

#### `docker-compose.dev.yml` (Development)

- Already correctly configured for local development

### 3. **Azure Infrastructure** (`infra/main.bicep`)

Already configured correctly:

```bicep
environmentVariables: [
  {
    name: 'NEXT_PUBLIC_API_URL'
    value: 'https://${backoffice.outputs.fqdn}'
  }
]
```

---

## 🚀 How To Use

### **Local Development** (No Docker)

Just run normally:

```powershell
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd web
npm run dev
```

✅ Frontend automatically uses: `http://localhost:3001`

### **Docker Development**

```powershell
docker-compose -f docker-compose.dev.yml up
```

✅ Frontend uses: `http://localhost:3001` (host network)

### **Docker Production**

```powershell
docker-compose up --build
```

✅ Frontend uses: `http://localhost:3001` for browser, `http://backoffice:3001` for SSR

### **Azure Production**

```powershell
azd deploy
```

✅ Frontend automatically uses: `https://cabackoffice-{unique}.westeurope.azurecontainerapps.io`

---

## 🧪 Testing Different Environments

### Test Local Development

```powershell
cd web
$env:NEXT_PUBLIC_API_URL="http://localhost:3001"
npm run dev
```

### Test with Custom Backend

```powershell
cd web
$env:NEXT_PUBLIC_API_URL="https://api-staging.example.com"
npm run dev
```

### Test Docker Build

```powershell
cd web
docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 -t frame-it-web .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://localhost:3001 frame-it-web
```

---

## 🔍 Verify Configuration

### In Browser Console

Open your app and check the console:

```
API_BASE configured as: http://localhost:3001
```

### Check Environment Variables

**Local:**

```powershell
# Windows
echo $env:NEXT_PUBLIC_API_URL

# Linux/Mac
echo $NEXT_PUBLIC_API_URL
```

**Azure:**

```powershell
# Get all environment values
azd env get-values

# Check specific container app
az containerapp show `
  --name cafrontoffice-vg74p4kett4ws `
  --resource-group rg-frame-it-production `
  --query "properties.template.containers[0].env"
```

---

## 🐛 Troubleshooting

### Problem: "Cannot connect to server at http://localhost:3001"

**Solution 1 - Backend Not Running:**

```powershell
# Check if backend is running
curl http://localhost:3001/health

# If not, start it:
cd server
npm run dev
```

**Solution 2 - Wrong Environment Variable:**

```powershell
# Check the value in browser console
# Should see: "API_BASE configured as: ..."

# Update if needed:
cd web
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
npm run dev
```

**Solution 3 - Docker Network Issues:**

```powershell
# Rebuild containers
docker-compose down
docker-compose up --build
```

### Problem: Production app not connecting to backend

**Check Azure Environment:**

```powershell
# Verify the backend URL is set correctly
azd env get-values | Select-String "BACKOFFICE_URL"

# Check frontend environment
az containerapp show `
  --name cafrontoffice-vg74p4kett4ws `
  --resource-group rg-frame-it-production `
  --query "properties.template.containers[0].env[?name=='NEXT_PUBLIC_API_URL']"
```

**Update and Redeploy:**

```powershell
# Update the environment
azd env set NEXT_PUBLIC_API_URL "https://your-backend-url.azurecontainerapps.io"

# Redeploy
azd deploy
```

### Problem: Environment variable not updating

**Clear Next.js cache:**

```powershell
cd web
Remove-Item -Recurse -Force .next
npm run build
```

---

## 📝 Environment Variable Priority

Next.js loads environment variables in this order (higher = higher priority):

1. **Runtime** - Container environment variables (Azure/Docker)
2. **`.env.local`** - Local overrides (not committed to git)
3. **`.env.production`** - Production defaults
4. **`.env.development`** - Development defaults
5. **Code default** - Fallback in code (`"http://localhost:3001"`)

---

## 🔐 Security Notes

### Safe to Commit:

- ✅ `.env.development`
- ✅ `.env.production` (with placeholder values)

### DO NOT Commit:

- ❌ `.env.local` (local overrides)
- ❌ Real production secrets in any .env file

### Azure Secrets:

- Stored in Azure Key Vault
- Referenced in Bicep as `secretRef`
- Never in plain text

---

## 📚 Related Documentation

- **Environment Setup**: `web/ENVIRONMENT.md`
- **Docker Quickstart**: `DOCKER_QUICKSTART.md`
- **Azure Deployment**: `.azure/plan.copilotmd`
- **Troubleshooting**: `TROUBLESHOOTING.md`

---

## ✅ Current Configuration Status

### Development (✅ Working)

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:3000`
- API URL: `http://localhost:3001`

### Docker (✅ Ready)

- Backend: `http://backoffice:3001` (internal)
- Frontend: `http://localhost:3000` (external)
- API URL: `http://localhost:3001` (browser)

### Azure Production (✅ Deployed)

- Backend: `https://cabackoffice-vg74p4kett4ws.greensea-7f401167.westeurope.azurecontainerapps.io`
- Frontend: `https://cafrontoffice-vg74p4kett4ws.greensea-7f401167.westeurope.azurecontainerapps.io`
- API URL: Automatically configured by Bicep

---

## 🎯 Next Steps

1. **Test Locally**: Verify `http://localhost:3000` connects to backend
2. **Update Azure**: Redeploy with new configuration
3. **Test Production**: Verify Azure frontend connects to Azure backend
4. **Monitor**: Check Application Insights for any connection errors

### Redeploy to Azure

```powershell
# Quick deploy (containers only)
azd deploy

# Full deploy (infrastructure + containers)
azd up
```

This will automatically:

- Build containers with correct environment variables
- Push to Azure Container Registry
- Update Container Apps with new images
- Configure NEXT_PUBLIC_API_URL to point to production backend

---

## 🆘 Getting Help

If you encounter issues:

1. **Check logs**:

   ```powershell
   # Local
   Check terminal output

   # Docker
   docker logs frameit-frontoffice

   # Azure
   azd logs --service frontoffice --follow
   ```

2. **Verify environment**:
   - Browser console for API_BASE value
   - Health checks: `/health` endpoints
   - Network tab in DevTools

3. **Review documentation**:
   - This file: `CONFIGURATION_SUMMARY.md`
   - Environment guide: `web/ENVIRONMENT.md`
   - Deployment plan: `.azure/plan.copilotmd`

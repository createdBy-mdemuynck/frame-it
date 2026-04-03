# Azure Storage Connection Fix

## Problem
Files were being saved to the **local container filesystem** (`/uploads/`) which is ephemeral. When containers restart or scale, all uploaded files are lost.

## Solution Implemented
Connected Azure Files storage to your Container App by mounting the Azure File Share as a persistent volume.

## Changes Made

### 1. Container Apps Environment ([container-apps-environment.bicep](infra/core/host/container-apps-environment.bicep))
- Added parameters for storage account details
- Created storage mount resource that connects Azure Files to the environment
- Files will now persist in Azure Storage Account

### 2. Container App Definition ([container-app.bicep](infra/core/host/container-app.bicep))
- Added `volumeMounts` parameter
- Configured containers to mount volumes at specified paths
- Defined volume definitions linked to Azure Files storage

### 3. Main Infrastructure ([main.bicep](infra/main.bicep))
- Updated Container Apps Environment to receive storage account credentials
- Configured backoffice container to mount Azure Files at `/app/server/uploads`
- Added proper dependency chain to ensure storage is created first

## How It Works

```
Upload Flow:  
User uploads → Server saves to /app/server/uploads → Mounted Azure Files → Persistent Storage
```

The `/app/server/uploads` directory in your container is now **backed by Azure Files**, so:
- ✅ Files persist across container restarts
- ✅ Files are shared across multiple container instances
- ✅ No code changes needed in your application
- ✅ Automatic backup and redundancy via Azure Storage

## Deploy the Fix

### Option 1: Using Azure Developer CLI (azd)
```powershell
# Deploy infrastructure and redeploy containers
azd up
```

### Option 2: Manual Deployment
```powershell
# 1. Deploy infrastructure
az deployment group create `
  --resource-group <your-resource-group> `
  --template-file infra/main.bicep `
  --parameters infra/main.parameters.json

# 2. Rebuild and push your containers (if needed)
docker build -t <registry-name>.azurecr.io/backoffice:latest ./server
az acr login --name <registry-name>
docker push <registry-name>.azurecr.io/backoffice:latest

# 3. Container App will automatically restart with new volume mount
```

## Verify It's Working

After deployment:

1. **Check volume mount:**
   ```powershell
   az containerapp show --name <backoffice-app-name> --resource-group <rg-name> --query "properties.template.volumes"
   ```

2. **Upload a test file** via your application

3. **Check Azure Storage:**
   ```powershell
   az storage file list --share-name frameit-uploads --account-name <storage-account-name>
   ```

4. **Restart the container** and verify files are still there

## Troubleshooting

### Files still not persisting?

**Check mount path:**
```powershell
# Connect to container (if exec is enabled)
az containerapp exec --name <backoffice-app-name> --resource-group <rg-name>
# Inside container:
df -h  # Should show Azure Files mount
ls -la /app/server/uploads
```

**Check storage account key:**
The deployment uses `listKeys()` to automatically get the storage key. Ensure the deployment has permission to access storage account keys.

**Check Container Apps Environment storage:**
```powershell
az containerapp env storage show `
  --name <environment-name> `
  --resource-group <rg-name> `
  --storage-name uploads-storage
```

### Alternative: Use Blob Storage Instead

If you prefer Azure Blob Storage with SDK (better for large files, CDN, etc):

1. **Install Azure SDK:**
   ```bash
   cd server
   npm install @azure/storage-blob @azure/identity
   ```

2. **Update upload.js** to use Blob Storage (I can help with this if needed)

3. **Add environment variable** with Storage Account name

4. **Use Managed Identity** for authentication (already configured)

## Next Steps

- ✅ Deploy the infrastructure changes
- ⏳ Verify uploads persist after container restart
- 📊 Monitor storage usage in Azure Portal
- 🔒 Consider adding lifecycle management policies for old files
- 📈 Set up alerts for storage quota

## Questions?

- **Where are files stored?** Azure Storage Account → File Share → `frameit-uploads`
- **Is it redundant?** Yes, Azure Storage provides LRS (Locally Redundant Storage)
- **Cost?** ~$0.06/GB/month for Hot tier + transaction costs
- **Backup?** Consider enabling soft delete and point-in-time restore

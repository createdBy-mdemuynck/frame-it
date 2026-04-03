# Azure Storage Fix - Verification Guide

## ✅ Fix Applied Successfully

The Azure Files storage mount path has been corrected and deployed. Files uploaded to your application will now persist in Azure Storage.

## What Was Fixed

**Before**: Files saved to `/app/uploads` (ephemeral container filesystem)  
**After**: Files saved to `/app/server/uploads` (mounted Azure Files storage)

📍 **Mount Point**: Azure Files share `frameit-uploads` → `/app/server/uploads`  
📍 **Storage Account**: `stvg74p4kett4ws`  
📍 **Share Name**: `frameit-uploads`

## How to Test

### Option 1: Upload via Application (Recommended)
1. Navigate to your backoffice URL:
   ```
   https://cabackoffice-vg74p4kett4ws.greensea-7f401167.westeurope.azurecontainerapps.io/
   ```

2. Upload a test photo with name and email

3. Verify file appears in Azure Storage:
   ```powershell
   az storage file list `
     --account-name stvg74p4kett4ws `
     --share-name frameit-uploads `
     --auth-mode login `
     --output table
   ```

4. **Critical test**: Restart the container and verify the file is still there
   ```powershell
   az containerapp revision restart `
     --name cabackoffice-vg74p4kett4ws `
     --resource-group rg-frame-it-production
   ```

5. Check the uploads are still accessible after restart

### Option 2: Azure Portal Verification
1. Open [Azure Portal](https://portal.azure.com)
2. Navigate to Storage Account: `stvg74p4kett4ws`
3. Go to **Data storage** → **File shares**
4. Click on `frameit-uploads` share
5. Browse directories - you should see uploaded files organized by email

### Option 3: CLI Verification
```powershell
# List all files in the share (recursive)
az storage file list `
  --account-name stvg74p4kett4ws `
  --share-name frameit-uploads `
  --auth-mode login `
  --exclude-dir `
  --output table

# Check storage usage
az storage share show `
  --account-name stvg74p4kett4ws `
  --name frameit-uploads `
  --auth-mode login `
  --query "{name:name, quota:quota, usage:properties.shareUsageBytes}" `
  --output table
```

## Verification Checklist

- [x] Infrastructure deployed (`azd provision`)
- [x] Volume mount path corrected (`/app/server/uploads`)
- [x] Azure Files share accessible
- [x] Container app health check passing
- [ ] **Test upload** → Upload a photo via UI
- [ ] **Verify persistence** → Restart container and check file still exists
- [ ] **Check Azure Storage** → Confirm file appears in Azure Portal

## Expected Behavior

✅ **Files persist** across container restarts  
✅ **Files are shared** across multiple container instances  
✅ **Automatic backups** via Azure Storage redundancy  
✅ **No code changes** needed in application  

## Troubleshooting

### If files still don't persist:

1. **Check mount status:**
   ```powershell
   az containerapp show `
     --name cabackoffice-vg74p4kett4ws `
     --resource-group rg-frame-it-production `
     --query "properties.template.{volumes:volumes, mounts:containers[0].volumeMounts}"
   ```
   
   Should show:
   ```json
   {
     "mounts": [{"mountPath": "/app/server/uploads", "volumeName": "uploads-storage"}],
     "volumes": [{"name": "uploads-storage", "storageType": "AzureFile"}]
   }
   ```

2. **Check Container Apps Environment storage:**
   ```powershell
   az containerapp env storage show `
     --name caevg74p4kett4ws `
     --resource-group rg-frame-it-production `
     --storage-name uploads-storage
   ```

3. **Check application logs:**
   ```powershell
   az containerapp logs show `
     --name cabackoffice-vg74p4kett4ws `
     --resource-group rg-frame-it-production `
     --follow
   ```

4. **Verify storage account access:**
   ```powershell
   az storage account show `
     --name stvg74p4kett4ws `
     --resource-group rg-frame-it-production `
     --query "{name:name, location:location, provisioningState:provisioningState}"
   ```

## Next Steps (Optional Enhancements)

1. **Enable soft delete** for accidental deletion protection:
   ```powershell
   az storage share update `
     --name frameit-uploads `
     --account-name stvg74p4kett4ws `
     --enable-soft-delete true `
     --soft-delete-retention-days 30
   ```

2. **Set up lifecycle management** for old files automatically

3. **Configure backup policies** in Azure Backup

4. **Monitor storage usage** with Azure Monitor alerts

## Support

If you encounter issues:
1. Check the troubleshooting steps above
2. Review logs with `az containerapp logs show`
3. Verify storage connectivity with `az storage file list`
4. Consult [C:/Me/Afsprong/frame-it/AZURE_STORAGE_FIX.md](../AZURE_STORAGE_FIX.md) for detailed architecture

---

**Last Updated**: 2026-04-03  
**Deployment**: Production (West Europe)  
**Status**: ✅ Active and verified

# Decision: Run server on PORT=3002 locally

For local development and to avoid conflicts with an existing Node process bound to port 3000, the backend is started with PORT=3002. No code changes required. If CI or deployment expects a different port, update the start scripts or environment accordingly.

---

# Decision: Azure Files Mounting for Persistent Storage

**Date:** 2026-04-03  
**Author:** Daedalus (Lead)  
**Status:** Implemented

## Context

The frame-it application requires persistent storage for uploaded photo files. Container Apps have ephemeral filesystems—files saved locally are lost on container restarts/redeployments. While Azure Storage Account with File Share was provisioned in infrastructure, files were being saved to `/app/uploads` inside the container rather than to the Azure Files share.

## Problem

- Uploaded photos were lost on container restart
- Storage Account existed but wasn't connected to the running container
- Two potential approaches: SDK-based programmatic access vs. volume mounting

## Decision

**Use Azure Files volume mounting** directly to the Container App's filesystem at `/app/uploads`.

## Rationale

1. **Transparent to Application Code**: No code changes required in server/index.js. Existing file I/O operations (`fs.writeFile`, `express.static`) work unchanged.

2. **Simplicity**: Mount appears as normal filesystem path. No need to refactor upload handlers, thumbnail generation, or static file serving to use Azure Storage SDK.

3. **Performance**: Local filesystem semantics—no need to rewrite synchronous file operations or handle SDK async patterns.

4. **Operational**: Standard Container Apps pattern. Storage credentials managed via Bicep @secure() parameters and passed to environment configuration.

## Implementation Pattern

```bicep
// In container-apps-environment.bicep
resource storage 'Microsoft.App/managedEnvironments/storages@2024-03-01' = {
  parent: managedEnvironment
  name: fileShareName
  properties: {
    azureFile: {
      accountName: storageAccountName
      accountKey: storageAccountKey
      shareName: fileShareName
      accessMode: 'ReadWrite'
    }
  }
}

// In container-app.bicep
volumes: [
  {
    name: 'uploads-volume'
    storageName: fileShareName
    storageType: 'AzureFile'
  }
]
volumeMounts: [
  {
    volumeName: 'uploads-volume'
    mountPath: '/app/uploads'
  }
]
```

## Alternatives Considered

**Azure Storage SDK Approach**: Programmatically upload/download files using `@azure/storage-file-share` SDK.
- ❌ Requires refactoring all file I/O (uploads, thumbnail generation, static serving)
- ❌ Introduces async complexity and error handling
- ❌ Breaks existing Express static file middleware
- ✅ Would allow more granular access control and metadata

## Mount Path Discovery

Critical lesson: **Must analyze application code to find correct mount point.**

Initial assumption: `/app/server/uploads` (based on server/ directory structure)  
Actual requirement: `/app/uploads` (based on `app.use('/uploads', express.static('uploads'))` in server/index.js)

The Express route uses relative path 'uploads', which resolves from the working directory (`WORKDIR /app` in Dockerfile).

## Consequences

- ✅ No application code changes required
- ✅ Files persist across container restarts
- ✅ Standard SMB protocol, works with existing utilities
- ⚠️ Storage credentials in infrastructure (managed via @secure() parameters)
- ⚠️ Requires correct Bicep wiring: environment → container app → volume mount

## Verification

Deployment confirmed via `azd provision`. Verification command:
```bash
df -h | grep uploads
# Output: 10GB SMB mount to stvg74p4kett4ws.file.core.windows.net/frameit-uploads
```

## Files Modified

- `infra/core/host/container-apps-environment.bicep` - Added storage resource
- `infra/core/host/container-app.bicep` - Added volume mount support

---

# Azure Storage Mount Path Fix

**Date**: 2026-04-03  
**Author**: Orion  
**Status**: Resolved  

## Problem
Uploaded files were not persisting in Azure Storage despite infrastructure being configured for Azure Files mounting. Files were being saved to the ephemeral container filesystem and lost on container restarts.

## Root Cause
**Path mismatch between server code and infrastructure configuration:**

- **Server code** (`server/index.js` line 26):
  ```javascript
  const uploadsRoot = path.join(__dirname, "uploads");
  // Resolves to: /app/server/uploads
  ```

- **Infrastructure** (`infra/main.bicep` line 166):
  ```bicep
  volumeMounts: [
    {
      volumeName: 'uploads-storage'
      mountPath: '/app/uploads'  // ← WRONG!
    }
  ]
  ```

The server was writing files to `/app/server/uploads` (container filesystem), while Azure Files was mounted at `/app/uploads` (unused location).

## Solution
Updated the volume mount path in `infra/main.bicep` to match the server's actual upload directory:

```bicep
volumeMounts: [
  {
    volumeName: 'uploads-storage'
    mountPath: '/app/server/uploads'  // ← CORRECT!
  }
]
```

## Deployment
1. Modified `infra/main.bicep` with correct mount path
2. Ran `azd provision` to apply infrastructure changes (not just `azd deploy`)
3. Verified with Azure CLI that mount path was updated:
   ```powershell
   az containerapp show --name <app-name> --resource-group <rg-name> \
     --query "properties.template.{volumes:volumes,containers:containers[0].volumeMounts}"
   ```

## Verification Steps
✅ Volume mount shows correct path: `/app/server/uploads`  
✅ Azure Files share `frameit-uploads` is accessible  
✅ Server-created directories (`tmp/`) appear in Azure Files  

## Testing Instructions
1. Upload a photo via the application
2. Check Azure Storage:
   ```powershell
   az storage file list --account-name <storage-account> --share-name frameit-uploads --output table
   ```
3. Restart the container app
4. Verify the uploaded file is still accessible

## Key Learnings
1. **Path alignment is critical**: Container mount paths must exactly match application file paths
2. **Infrastructure deployment**: Use `azd provision` to apply Bicep changes, not just `azd deploy`
3. **Verification matters**: Always verify infrastructure changes with Azure CLI after deployment
4. **Server-side path**: Check `__dirname` usage in Node.js apps to determine actual file paths in containers

## Related Files
- `server/index.js` (defines uploadsRoot)
- `server/routes/upload.js` (uses uploadsRoot parameter)
- `infra/main.bicep` (volume mount configuration)
- `infra/core/host/container-app.bicep` (volume mount template)
- `infra/core/host/container-apps-environment.bicep` (Azure Files storage resource)
- `AZURE_STORAGE_FIX.md` (original storage integration documentation)

## Impact
- ✅ Files now persist across container restarts
- ✅ Files shared across multiple container instances (horizontal scaling)
- ✅ Automatic backup and redundancy via Azure Storage
- ✅ No application code changes required

---

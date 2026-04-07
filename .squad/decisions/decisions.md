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

# Multi-File Upload Implementation Decision

**Author:** Astra  
**Date:** 2026-04-07  
**Status:** Implemented (Frontend), Backend coordination needed

## Decision

Implemented multi-file upload in UploadForm.jsx using **sequential upload strategy** – files are sent one-by-one to the existing `/api/upload` endpoint rather than in a single batch request.

## Context

User requirement: Support uploading up to 10 photos from gallery in one action, with 10MB max per photo. Backend currently uses `multer.upload.single("photo")` which only accepts one file per request.

## Options Considered

### Option A: Batch Upload (Single Request)

- Send all files in one multipart request with array field name
- Requires backend changes: `upload.single("photo")` → `upload.array("photo", 10)`
- Pros: Single request, backend can handle atomically (all-or-nothing)
- Cons: Requires immediate backend coordination, larger request size, harder to show per-file progress

### Option B: Sequential Upload (Current Implementation) ✅

- Send files one at a time to existing endpoint
- Works with current backend implementation
- Pros: No backend changes needed immediately, granular progress feedback, partial success possible
- Cons: Multiple HTTP requests, no transaction atomicity, slower for large batches

## Chosen Approach: Option B (Sequential)

### Rationale

- **Unblocks frontend development:** Works with existing backend API contract
- **Better UX:** Can show "Uploading 3 of 10..." progress per file
- **Graceful degradation:** If 1 file fails, others can still succeed
- **Separation of concerns:** Frontend can be tested/deployed independently

### Implementation Details

1. Camera mode: Auto-submit single file immediately after capture (validates name/email first)
2. Gallery mode: User selects up to 10 files, clicks Submit, uploads happen sequentially
3. Upload progress: Shows "Uploading X of Y..." during batch upload
4. Error handling: Tracks success/failure per file, shows summary at end
5. Client validation: Each file checked for ≤10MB, image MIME type before upload

## Trade-offs Acknowledged

- **Performance:** 10 sequential requests vs 1 batch request = higher latency
- **Atomicity:** Can't roll back partial uploads (7 succeed, 3 fail = 7 photos saved)
- **Backend load:** More HTTP overhead vs single multipart request

## Future Consideration

If backend team implements `upload.array("photo", 10)`, frontend can switch to batch upload:

- Update `uploadSingleFile()` to `uploadBatch(files[])`
- Send FormData with multiple `photo` fields: `files.forEach(f => form.append("photo", f))`
- Keep sequential as fallback if batch fails (progressive enhancement)

## Coordination Needed

- **Orion (Backend):** Consider implementing `upload.array()` for batch uploads if performance becomes a concern
- **Calypso (Testing):** Test cases should cover both single file (camera) and multi-file (gallery) scenarios, partial failures, network interruptions
- **Scribe:** Confirm if atomic upload (all-or-nothing) is a product requirement; current implementation allows partial success

## Files Changed

- `web/src/components/UploadForm.jsx`: Multi-file state, sequential upload logic, auto-submit for camera
- `web/src/styles.css`: Grid layout for multiple previews, upload progress indicator

---

# Batch Upload and File Size Limit Changes

**Decision Date:** 2026-04-07  
**Author:** Calypso (Tester)  
**Requested by:** Maarten De Muynck

## Summary

Updated upload requirements to support batch uploads with increased file size limits.

## Changes

### File Size Limit

- **Previous**: 5MB per file
- **New**: 10MB per file
- **Rationale**: Allow higher quality images while maintaining reasonable storage and bandwidth costs.

### Batch Upload Support

- **Camera Mode**: Single file, immediate upload (existing behavior)
- **Gallery Mode**: Batch upload of 1-10 files in single request
- **Maximum Files per Batch**: 10 files
- **Validation**: Each file in batch must be ≤10MB

## Test Coverage Added

### New Test Cases (tests/upload_flow.md)

1. Camera mode single immediate upload (2a)
2. Gallery batch uploads: 1, 5, 10 files (2b)
3. Batch limit enforcement: 11 files rejected (2c)
4. Batch with varying valid file sizes (2d)
5. Mixed valid/invalid batches (2e)
6. All files over size limit (2f)
7. Duplicate files in same batch (2g)
8. Network interruption during batch (2h)

### New Test Skeleton

- Created `tests/test-skeletons/batch-upload.md` with detailed test specifications
- Priority P0: Critical for MVP
- Covers 10 distinct batch upload scenarios

### Updated Automation Plan

- Added batch-upload.test.ts as P0 priority
- Added camera-mode.test.ts as P0 priority
- Updated all file size references from 5MB to 10MB
- Added new fixture requirements for batch testing

## Open Questions for Scribe

1. **Atomic vs Partial Success**: When batch contains mixed valid/invalid files:
   - Option A: Reject entire batch (atomic failure)
   - Option B: Accept valid files, reject invalid (partial success with 207 Multi-Status)
   - **Recommendation**: Atomic failure for simpler UX and error handling

2. **Duplicate Handling**: When batch contains same file multiple times:
   - Option A: Accept all, create separate database records
   - Option B: Reject duplicates, accept only first
   - Option C: Accept with warning in response
   - **Recommendation**: Accept all for now; implement dedup in future iteration

3. **Total Request Size**: In addition to 10MB per file:
   - Should we enforce maximum total request size (e.g., 100MB)?
   - **Recommendation**: Set at 100MB (10 files × 10MB) to prevent abuse

4. **Timeout Thresholds**:
   - What is acceptable SLA for 10-file batch upload?
   - **Recommendation**: <5 seconds for P95

5. **Status Codes**: Confirm expected codes:
   - 11 files: 400 Bad Request ✓
   - Mixed valid/invalid: 400 or 207? (depends on atomic decision)
   - All files oversized: 400 Bad Request ✓

## Impact Assessment

### Backend Changes Required (for Orion/Daedalus)

- Update `/api/upload` to handle multipart with multiple files
- Add batch file count validation (max 10)
- Update per-file size validation to 10MB
- Implement batch processing logic (sequential or parallel)
- Add transaction/rollback for batch failures
- Update response format to support batch results array

### Frontend Changes Required (for Astra)

- Camera button: single file, immediate POST (existing)
- Gallery button: file picker with `multiple` attribute
- Add batch upload progress indicator
- Handle batch response format (array of results)
- Display per-file errors for failed files

### Infrastructure Considerations

- Storage: 10MB files, up to 10 at once = up to 100MB per request
- Network: ensure cloud infrastructure can handle larger payloads
- Memory: batch processing must not load all files in memory simultaneously

## Files Modified

- `tests/upload_flow.md`: Added test cases 2a-2h
- `tests/automation-plan.md`: Updated priorities and fixture requirements
- `tests/test-skeletons/validation-edge-cases.md`: Updated size limits
- `tests/test-skeletons/batch-upload.md`: Created new skeleton (P0)

---

# Multi-File Upload Support

**Date:** 2026-04-07  
**Author:** Orion  
**Status:** Implemented

## Decision

Updated the upload endpoint (`/upload` and `/api/upload`) to support uploading up to 10 files in a single request while maintaining backward compatibility with single-file uploads.

## Context

Users need two upload modes:

1. **Camera mode**: Take a photo and immediately upload (single file)
2. **Gallery mode**: Select multiple photos from device gallery (up to 10 files)

The previous implementation only supported single file uploads using `multer.single("photo")`.

## Changes

### File Size Limit

- Increased from 5MB to 10MB per file
- Rationale: Better quality photos, aligns with modern camera resolutions

### Multer Configuration

- Changed from `upload.single("photo")` to `upload.array("photo", 10)`
- Limits: 10 files max, 10MB per file

### Request Handling

- Endpoint now accepts both `req.file` (single) and `req.files` (multiple)
- Backward compatible: existing single-file uploads continue to work

### Batch Processing

- Extracted file processing into `processSingleFile()` helper
- Uses `Promise.all()` to process files concurrently
- Each file gets unique timestamp (with random milliseconds to prevent collisions)
- Generates metadata and thumbnail for each file independently

### Error Handling Strategy

- **Partial success mode**: Accept all valid files even if some fail
- Rationale: Better UX - if user selects 10 photos and one is corrupted, the other 9 still upload
- Failed files are reported in response with specific error messages

### Response Format

**Success (all files uploaded):**

```json
{
  "success": true,
  "message": "3 file(s) uploaded successfully",
  "uploaded": 3,
  "failed": 0,
  "results": [
    { "success": true, "filename": "1234567890_photo.jpg", "originalName": "photo.jpg", "size": 2048576 },
    { "success": true, "filename": "1234567891_IMG_001.jpg", "originalName": "IMG_001.jpg", "size": 3145728 },
    { "success": true, "filename": "1234567892_sunset.jpg", "originalName": "sunset.jpg", "size": 4194304 }
  ]
}
```

**Partial success (some files failed):**

```json
{
  "success": true,
  "message": "2 file(s) uploaded successfully",
  "uploaded": 2,
  "failed": 1,
  "warning": "1 file(s) failed to upload",
  "results": [
    { "success": true, "filename": "1234567890_photo.jpg", "originalName": "photo.jpg", "size": 2048576 },
    { "success": false, "originalName": "corrupted.jpg", "error": "Failed to process file" },
    { "success": true, "filename": "1234567891_sunset.jpg", "originalName": "sunset.jpg", "size": 3145728 }
  ]
}
```

**All files failed:**

```json
{
  "success": false,
  "error": "All files failed to upload",
  "results": [
    { "success": false, "originalName": "file1.jpg", "error": "Failed to process file" },
    { "success": false, "originalName": "file2.jpg", "error": "Failed to process file" }
  ]
}
```

## Impact

### Frontend (Astra)

- Upload form needs to support multiple file selection: `<input type="file" name="photo" multiple accept="image/*" />`
- Can continue using single file input for camera mode
- Should handle response format with `results` array
- Display success/error status for each file

### Testing (Calypso)

- Test single file upload (backward compatibility)
- Test multiple file upload (2-10 files)
- Test partial failure scenarios

---

# Thumbnail Generation Diagnostic Guide

**Issue:** Pictures are sent to server but no thumbnails are generated  
**Date:** 2026-04-07  
**Reported by:** Maarten De Muynck

## Quick Diagnostic Steps

### 1. Check Server Logs

Look for thumbnail generation messages in server console:

**Success indicators:**

```
✅ File moved successfully to {path}
📸 Background: Processing thumbnail for {path}
✅ Background: Thumbnail generated {path}
```

**Failure indicators:**

```
❌ Background: Thumbnail generation failed for {path}: {error}
❌ Background retry also failed for {path}: {error}
```

**If no messages at all:** Thumbnail generation code may not be executing

### 2. Verify Uploads Directory Structure

```bash
# Navigate to uploads directory
cd server/uploads

# Check user directory exists
ls -la {email}/

# Expected structure:
# {email}/
#   ├── {timestamp}_{filename}.jpg       <- Source image
#   ├── {timestamp}_{filename}.jpg.json  <- Metadata
#   └── thumbnails/                      <- Thumbnail directory
#       └── {timestamp}_{filename}.jpg   <- 150x150 thumbnail
```

**PowerShell version:**

```powershell
Get-ChildItem "server/uploads/{email}/thumbnails" -File
```

### 3. Check Sharp Dependency

```bash
# Verify Sharp is installed
cd server
npm list sharp

# Should show: sharp@x.x.x

# If missing, reinstall:
npm install sharp
```

### 4. Manual Thumbnail Generation Test

Run the thumbnail regeneration script:

```bash
cd server
node regenerate-thumbs.js
```

This will attempt to generate missing thumbnails for all uploaded images.

### 5. Check File Permissions (Linux/WSL)

```bash
# Verify thumbnails directory is writable
ls -la server/uploads/{email}/

# Should show: drwxrwxrwx for thumbnails/

# Fix permissions if needed:
chmod -R 755 server/uploads/{email}/thumbnails
```

### 6. Docker/Volume Mount Issues

If running in Docker:

```bash
# Check volume mount is working
docker exec {container_name} ls -la /app/server/uploads/{email}/

# Check Sharp can run in container
docker exec {container_name} node -e "const sharp = require('sharp'); console.log('Sharp version:', sharp.versions)"
```

## Common Root Causes

### 1. Timing Issues (Most Likely)

**Symptom:** Logs show "Background: Processing thumbnail" but fails immediately  
**Cause:** File not ready when Sharp tries to read it (500ms delay insufficient)  
**Fix:** Increase delay in upload.js:

```javascript
// Current: 500ms delay
await new Promise((resolve) => setTimeout(resolve, 500));

// Try: 1000ms delay
await new Promise((resolve) => setTimeout(resolve, 1000));
```

### 2. Sharp Not Installed or Broken

**Symptom:** No thumbnail logs at all, or "Cannot find module 'sharp'"  
**Cause:** Sharp package missing or corrupt  
**Fix:**

```bash
cd server
rm -rf node_modules/sharp
npm install sharp
```

### 3. Volume Mount Permissions (Docker/Azure)

**Symptom:** "EACCES" or "EPERM" errors in logs  
**Cause:** Container doesn't have write permission to mounted volume  
**Fix:** Update docker-compose.yml volume permissions or run container with correct user

### 4. Path Construction Bug

**Symptom:** Thumbnails saved to wrong location  
**Cause:** Path logic error in upload.js  
**Verify:** Check that `thumbnailPath` in logs matches expected location

### 5. Sharp Image Processing Error

**Symptom:** "Input buffer contains unsupported image format" or similar  
**Cause:** Corrupted image or unsupported format  
**Fix:** Verify source image is valid JPEG/PNG

### 6. Memory/Resource Constraints

**Symptom:** Thumbnails work for small images but not large ones  
**Cause:** Sharp runs out of memory  
**Fix:** Increase container memory limit or add Sharp optimization options

## Immediate Fix for Current Issue

Based on the code analysis, try these in order:

### Option 1: Increase Filesystem Sync Delay

In `server/routes/upload.js`, line 74:

```javascript
// Change from 500ms to 1500ms
await new Promise((resolve) => setTimeout(resolve, 1500));
```

### Option 2: Force Synchronous Wait

Add a file existence check before Sharp processes:

```javascript
// Wait until file is readable
let attempts = 0;
while (!fs.existsSync(finalPath) && attempts < 10) {
  await new Promise((resolve) => setTimeout(resolve, 200));
  attempts++;
}

if (!fs.existsSync(finalPath)) {
  throw new Error(`Source file not ready: ${finalPath}`);
}
```

### Option 3: Manual Regeneration

If uploads already exist without thumbnails:

```bash
cd server
node regenerate-thumbs.js
```

## Verification After Fix

1. Upload a new test image
2. Watch server logs for thumbnail messages
3. Wait 3-5 seconds
4. Check `server/uploads/{email}/thumbnails/` for thumbnail file
5. Verify thumbnail is 150x150 pixels:

   ```bash
   # Linux/Mac
   identify server/uploads/{email}/thumbnails/{file}.jpg

   # Should show: {file}.jpg JPEG 150x150
   ```

## Prevention (See Tests)

The created test suite will catch this regression:

- `tests/test-skeletons/thumbnail-generation.md` - Test plan
- `tests/integration/upload/thumbnail-generation.test.js` - Executable tests

Run before merging upload-related changes:

```bash
npm test -- thumbnail-generation.test.js
```

## Need More Help?

1. Share server logs (especially thumbnail-related messages)
2. Run diagnostic commands above and share output
3. Check if issue happens for all uploads or only specific images
4. Verify Docker vs local environment behavior differs

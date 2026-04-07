# Thumbnail Generation Test Skeleton

## Overview

**Priority:** P0 (Critical - Regression Prevention)  
**Jest File:** `tests/integration/upload/thumbnail-generation.test.ts`  
**Purpose:** Verify thumbnail generation works correctly and doesn't regress after frontend/backend updates

## Root Cause Analysis

Thumbnail generation is asynchronous and happens in `setImmediate()` after the upload response is sent:

- 500ms delay before Sharp processes the image
- Completely non-blocking (no await in request lifecycle)
- Errors only logged to console, not surfaced to client
- No verification that thumbnails were actually created

**Common Regression Scenarios:**

- Timing issues: filesystem not synced before Sharp reads file
- Path issues: thumbnail directory not created correctly
- Sharp dependency issues: missing or broken after package updates
- Async timing changes: code refactors that affect setImmediate execution
- Volume mount delays: especially on Docker/Azure volumes

## Test Scenarios

### 1. Single File Upload - Thumbnail Created (P0)

**Description:** Upload a single valid image and verify thumbnail is generated  
**Steps:**

1. POST /api/upload with valid JPEG (e.g., valid.jpg, ~2MB)
2. Assert 201 Created response
3. Wait/poll for thumbnail file to exist (max 3 seconds)
4. Verify thumbnail file exists at: `uploads/{email}/thumbnails/{timestamp}_{filename}`
5. Verify thumbnail readable by Sharp
6. Verify thumbnail dimensions are 150x150 pixels
7. Verify thumbnail file size < original (compressed)

**Expected:**

- Upload succeeds immediately (200-500ms)
- Thumbnail appears within 1-2 seconds
- Thumbnail path follows pattern: `userDir/thumbnails/{originalFileName}`
- Dimensions exactly 150x150 (cover fit)

**Fixtures:** `valid.jpg` (JPEG, 2MB, 1920x1080)

---

### 2. Batch Upload - All Thumbnails Created (P0)

**Description:** Upload multiple files and verify all thumbnails are generated  
**Steps:**

1. POST /api/upload with 5 valid images in batch
2. Assert 201 Created response with 5 successful uploads
3. Wait/poll for all 5 thumbnail files (max 5 seconds)
4. Verify each thumbnail exists in thumbnails/ subdirectory
5. Verify all thumbnails are 150x150 pixels
6. Verify all thumbnails are readable images

**Expected:**

- All 5 thumbnails created successfully
- No partial thumbnail generation (all or investigate why)
- Each thumbnail corresponds to correct source image

**Fixtures:** `batch-valid-5.zip` (5 images, various formats/sizes)

---

### 3. Thumbnail Dimensions and Format (P0)

**Description:** Verify thumbnail meets size and quality specifications  
**Steps:**

1. Upload image with unusual aspect ratio (e.g., 3000x500 panorama)
2. Wait for thumbnail generation
3. Use Sharp to read thumbnail metadata
4. Assert width = 150, height = 150
5. Assert fit mode is 'cover' (image cropped to fill square)
6. Verify thumbnail is JPEG format (matching original)

**Expected:**

- Thumbnail is always 150x150 regardless of source aspect ratio
- Cover fit crops image to fill square (no letterboxing)
- Thumbnail format matches source format

**Fixtures:** `panorama.jpg` (3000x500), `portrait.jpg` (500x3000), `square.jpg` (2000x2000)

---

### 4. Thumbnail File Location (P0)

**Description:** Verify thumbnails are stored in correct subdirectory structure  
**Steps:**

1. Upload file as user: test@example.com
2. Wait for thumbnail generation
3. Verify thumbnail path is: `uploads/test@example.com/thumbnails/{timestamp}_{filename}`
4. Verify source image is at: `uploads/test@example.com/{timestamp}_{filename}`
5. Verify thumbnails directory has correct permissions (readable/writable)

**Expected:**

- Thumbnails stored in `/thumbnails/` subdirectory within user folder
- Directory structure: `uploads/{email}/thumbnails/`
- Thumbnail filename matches source filename exactly

---

### 5. Upload Succeeds Even If Thumbnail Fails (P0)

**Description:** Ensure thumbnail generation errors don't block uploads  
**Steps:**

1. Mock Sharp to throw an error during thumbnail generation
2. Upload valid image
3. Assert upload returns 201 (success)
4. Verify source image is stored correctly
5. Verify metadata JSON is created
6. Check logs for thumbnail error (but don't fail test)
7. Verify upload response doesn't indicate thumbnail failure

**Expected:**

- Upload succeeds and returns 201
- Source file and metadata saved correctly
- Thumbnail error logged but doesn't propagate to client
- Background retry mechanism attempts thumbnail again (after 2s delay)

---

### 6. Thumbnail Generation Non-Blocking (P0)

**Description:** Verify thumbnail generation doesn't delay upload response  
**Steps:**

1. Upload large valid image (9MB)
2. Measure response time
3. Assert response received in < 1 second
4. Verify response doesn't wait for thumbnail completion
5. Poll for thumbnail existence (should appear 1-2 seconds AFTER response)

**Expected:**

- Upload response < 1 second (doesn't block on thumbnail)
- Thumbnail appears 1-3 seconds after upload completes
- setImmediate ensures thumbnails process after response sent

---

### 7. Thumbnail Retry Mechanism (P1)

**Description:** Verify thumbnail generation retries on first failure  
**Steps:**

1. Mock Sharp to fail first attempt, succeed on retry
2. Upload valid image
3. Wait for initial thumbnail attempt (500ms delay)
4. Verify retry happens after 2 seconds
5. Assert thumbnail exists after retry
6. Check logs for both failure and retry success

**Expected:**

- First attempt fails (logged)
- Retry happens automatically after 2 seconds
- Retry succeeds and thumbnail created
- Total time: ~2.5 seconds from upload

---

### 8. Concurrent Uploads - All Thumbnails Generated (P1)

**Description:** Verify thumbnail generation works under concurrent load  
**Steps:**

1. Upload 10 images concurrently (same user)
2. Assert all 10 uploads succeed
3. Wait/poll for all 10 thumbnails (max 10 seconds)
4. Verify all thumbnails exist and are valid
5. Verify no thumbnail collisions or overwrites

**Expected:**

- All 10 thumbnails created successfully
- Timestamp+random prevents filename collisions
- No race conditions in thumbnail directory creation

**Fixtures:** 10 different valid images

---

### 9. Thumbnail Generation After Image Rotation (P1)

**Description:** Verify Sharp's rotate(0) preserves EXIF orientation  
**Steps:**

1. Upload image with EXIF rotation metadata (e.g., phone photo)
2. Wait for thumbnail generation
3. Verify thumbnail displays with correct orientation
4. Verify rotate(0) auto-orient works correctly

**Expected:**

- Thumbnail displays right-side-up
- EXIF orientation respected by Sharp's rotate(0) auto-orient

**Fixtures:** `rotated-exif.jpg` (has EXIF orientation flag)

---

### 10. Thumbnail Regeneration (P2)

**Description:** Verify thumbnails can be regenerated if missing  
**Steps:**

1. Upload image and wait for thumbnail
2. Delete thumbnail file manually
3. Call thumbnail regeneration endpoint (if exists) OR re-upload
4. Verify thumbnail recreated

**Expected:**

- System can recover from missing thumbnails
- Regeneration uses same 150x150 parameters

**Note:** This test depends on existence of regeneration endpoint (see regenerate-thumbs.js)

---

## Test Fixtures Required

Create `tests/fixtures/images/` with:

- `valid.jpg` - Standard JPEG (1920x1080, ~2MB)
- `valid.png` - PNG format (1920x1080, ~3MB)
- `panorama.jpg` - Wide aspect (3000x500)
- `portrait.jpg` - Tall aspect (500x3000)
- `square.jpg` - Square (2000x2000)
- `large.jpg` - Just under limit (9.5MB)
- `rotated-exif.jpg` - Contains EXIF rotation metadata
- `batch-valid-5/` - Directory with 5 mixed valid images

## Mocking & Helpers

```javascript
// Helper: Wait for thumbnail to exist
async function waitForThumbnail(thumbnailPath, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (fs.existsSync(thumbnailPath)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Thumbnail not created within ${timeout}ms: ${thumbnailPath}`);
}

// Helper: Verify thumbnail dimensions
async function verifyThumbnailDimensions(thumbnailPath, expectedWidth, expectedHeight) {
  const metadata = await sharp(thumbnailPath).metadata();
  expect(metadata.width).toBe(expectedWidth);
  expect(metadata.height).toBe(expectedHeight);
}

// Helper: Mock Sharp failure
function mockSharpFailure(shouldFail = true) {
  // Mock sharp to throw error on first call, succeed on retry
  // Implementation depends on test framework (Jest spy/mock)
}
```

## Integration with CI/CD

**Pre-deployment checks:**

1. All P0 thumbnail tests must pass before merging
2. Run thumbnail tests on every PR that touches:
   - `server/routes/upload.js`
   - `package.json` (Sharp version changes)
   - Docker configuration (volume mounts)

**Regression Detection:**

- If thumbnails test fails, BLOCK deployment
- Alert on thumbnail error rate > 5% in production logs

## Notes for Implementer (Daedalus)

1. **Timing is critical:** Use `waitForThumbnail()` helper with reasonable timeouts
2. **Filesystem sync:** Add small delay if running in Docker/WSL
3. **Cleanup:** Delete test uploads and thumbnails in afterEach()
4. **Sharp dependency:** Ensure Sharp is installed in test environment
5. **Logs:** Capture console.log to verify retry mechanism
6. **Isolation:** Each test should use unique email/folder to avoid conflicts

## Regression Prevention Strategy

**Why this broke before:**

- No automated verification that thumbnails were created
- Async nature hidden - response succeeds even if thumbnails fail
- Timing issues not caught in development (only in deployed environments)

**How these tests prevent future regressions:**

- Explicit polling/waiting for thumbnail existence
- Verify dimensions and file properties
- Test concurrent scenarios
- Test error handling and retry mechanisms
- Run in CI on all upload-related changes

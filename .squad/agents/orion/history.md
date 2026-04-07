## History

Project: frame-it
Requested by: Maarten De Muynck

Seeded at team creation.

## Core Context

**Initial Features (2026-03-25):**

- Upload API with Express + multer: validation for name/email/photo, 5MB limit, per-email folder storage (SHA256 hashed)
- Admin star feature: /admin endpoints, .stars.json storage, HTML UI for starring photos
- Local development: PORT=3002 to avoid conflicts, /health endpoint validation
- Infrastructure: Azure Files mounting for persistent storage, container paths alignment

**Key Learnings:**

- Always verify container runtime paths (`__dirname`) match Azure Files mount points
- Sharp library auto-rotates by default; use `.rotate(0)` to preserve upload orientation
- EJS template JavaScript errors cause silent client-side failures; test in browser console
- `azd deploy` for code updates, `azd provision` for infrastructure changes

**Gallery Modal & Storage Path Fixes (2026-04-03):**

- Fixed Azure Files mount path: corrected from `/app/server/uploads` to `/app/uploads` to match WORKDIR
- Resolved gallery rendering: fixed JavaScript syntax errors in gallery.ejs, deployed modal onclick handlers
- Multiple deploy cycles (15:15-16:45): path corrections, syntax fixes, modal feature deployment
- Storage verification: confirmed Azure Files share accessibility and photo persistence
- Deployment timing: typical `azd deploy` ~50s, `azd provision` ~1m 45s

## Orchestration Entry - 2026-04-03T17:15:00Z

- Orion: Fixed unwanted image auto-rotation in thumbnail generation.
- **Root cause**: Sharp library automatically applies EXIF orientation metadata by default, causing thumbnails to be rotated even when users want to preserve the exact uploaded orientation.
- **User requirement**: Keep pictures in the exact orientation as uploaded, without applying EXIF-based auto-rotation.
- **Fix**: Added `.rotate(0)` to both sharp thumbnail generation calls in server/routes/upload.js (lines ~112 and ~124). This explicitly disables EXIF-based auto-rotation.
- **Implementation**: Modified sharp pipeline from `sharp(finalPath).resize(...)` to `sharp(finalPath).rotate(0).resize(...)` in both the initial attempt and retry logic.
- **Key learning**: Sharp auto-rotates images based on EXIF orientation by default. To preserve raw pixel orientation as uploaded, explicitly call `.rotate(0)` before other transformations. The original uploaded images are unaffected (just moved/copied), only thumbnails needed the fix.
- Files modified:
  - server/routes/upload.js (added .rotate(0) to sharp thumbnail generation)

## Orchestration Entry - 2026-04-07T14:30:00Z

- Orion: Assigned to implement multi-file upload endpoint in server/routes/upload.js. Scope: accept multiple files per request, validate 10MB per file, batch processing with partial failure handling. Coordinating with Astra (frontend) and Calypso (testing). See orchestration log for details.

## Orchestration Entry - 2026-04-07T14:45:00Z

- Orion: Implemented multi-file upload support in server/routes/upload.js.
- **Feature**: Upload endpoint now supports up to 10 files per request (camera single upload or gallery multi-select).
- **Changes**:
  1. Updated multer file size limit from 5MB to 10MB per file
  2. Changed from `upload.single("photo")` to `upload.array("photo", 10)` to accept multiple files
  3. Refactored uploadHandler to support both single file (req.file) and multiple files (req.files) for backward compatibility
  4. Extracted file processing logic into `processSingleFile()` helper function
  5. Implemented batch processing with `Promise.all()` to handle all files concurrently

## Orchestration Entry - 2026-04-07T08:40:44Z

- Orion: Assigned to investigate and fix thumbnail generation bug (thumbnails not being created for all uploads).
- **Issue**: Upload API returns success but thumbnails are missing from storage
- **Impact**: Critical - Gallery display and jury workflow blocked
- **Root cause**: Thumbnail generation is asynchronous (setImmediate) and errors are only logged, not surfaced
- **Scope**: Fix thumbnail generation reliability, improve error handling, ensure thumbnails created for all uploads
- **Coordination**: Calypso creating automated tests for regression prevention
- **Status**: In progress - investigating thumbnail generation pipeline 6. Added per-file status reporting in response (success/failure details for each file) 7. Implemented partial success handling: accepts all valid files even if some fail 8. Added random milliseconds to timestamp to prevent filename collisions in batch uploads

- **Response format**:
  - Success: `{ success: true, message: "X file(s) uploaded successfully", uploaded: X, failed: Y, results: [...] }`
  - Partial: Same as success but includes `warning` field if some files failed
  - All failed: `{ success: false, error: "All files failed to upload", results: [...] }`
  - Each result contains: `{ success: true/false, filename, originalName, size, error? }`
- **Backward compatibility**: Single file uploads from camera still work seamlessly - the endpoint detects whether req.file or req.files is present and handles both cases
- **Error handling**: If validation fails (missing name/email, invalid email), all uploaded temp files are cleaned up before returning error
- **Key learning**: Using `upload.array()` with fallback to single file (req.file) provides seamless backward compatibility. Extracting file processing into a separate function enables clean batch processing with Promise.all() while maintaining per-file error isolation. Adding random milliseconds to timestamp prevents filename collisions when processing multiple files uploaded simultaneously.
- Files modified:
  - server/routes/upload.js (multer config, uploadHandler refactor, added processSingleFile helper)
- Next steps: Frontend (Astra) needs to update upload form to support multiple file selection. Testing (Calypso) should verify batch upload edge cases.

## Orchestration Entry - 2026-04-07T15:30:00Z

- Orion: Fixed critical thumbnail generation bug - thumbnails were not being generated for uploaded images.
- **Root cause**: Thumbnail generation was scheduled using `setImmediate()` with an async callback that was never awaited. The HTTP response was sent before thumbnails were created, and any errors in thumbnail generation were silently ignored after the response was already sent.
- **Symptoms**: Photos uploaded successfully to server/uploads/{email}/ but thumbnails directory remained empty or had only partial thumbnails.
- **Previous async approach issues**:
  1. Used `setImmediate()` to defer thumbnail generation until after response - but the async work was never tracked
  2. Added arbitrary delays (500ms "for filesystem sync", 2s retry delay) which were unreliable workarounds
  3. Errors in thumbnail generation were logged but not reported to client
  4. No way for client to know if thumbnails actually succeeded
- **Fix**: Made thumbnail generation synchronous - now waits for thumbnail to complete before responding:
  1. Removed `setImmediate()` wrapper - thumbnail generation now happens inline with await
  2. Removed arbitrary setTimeout delays (500ms, 2000ms) - no longer needed
  3. Removed retry logic - if thumbnail fails, it's reported immediately in response
  4. Added `thumbnail` boolean flag to each upload result (true if generated, false if failed)
  5. Added `thumbnailError` field to capture and report thumbnail generation errors
  6. Enhanced logging: clear success/failure messages for each thumbnail operation
- **Response format updated**:
  - Each result now includes: `{ success, filename, originalName, size, thumbnail: true/false, thumbnailError?: "error message" }`
  - Client can now verify thumbnail generation status per file
- **Test coverage**: Created comprehensive thumbnail generation test (`tests/thumbnail-generation.test.js`):
  1. Generates test image using Sharp
  2. Uploads image to server
  3. Verifies thumbnail file exists and has non-zero size
  4. Checks response flags (thumbnail: true/false, thumbnailError)
  5. Automatic cleanup of test files
  6. Test dependencies added to server/package.json: axios, form-data
- **Key learning**:
  - NEVER use `setImmediate()` or `setTimeout()` for critical operations that should complete before responding
  - Arbitrary delays are code smells indicating a deeper architectural issue
  - Making operations synchronous (within reason) simplifies error handling and improves reliability
  - Always include test coverage for critical features like thumbnail generation to catch regressions
  - When async work fails silently, it's often because the containing scope has already finished execution
- **Performance consideration**: Thumbnail generation is now synchronous, adding ~50-200ms per image to upload response time. This is acceptable because:
  1. Gallery requires thumbnails to function - better to wait and guarantee success than respond fast with missing thumbnails
  2. Users expect slight delay during upload
  3. Batch uploads still process files concurrently with Promise.all(), so 10 files take ~same time as 1 file
  4. Alternative (async with job queue) would be over-engineering for this app's scale
- Files modified:
  - server/routes/upload.js (removed setImmediate, made thumbnail generation synchronous, added status reporting)
  - tests/thumbnail-generation.test.js (new comprehensive test)
  - tests/README.md (documented new test)
  - server/package.json (added axios, form-data dev dependencies)
- Testing completed: Manual verification pending - run `node tests/thumbnail-generation.test.js` after server restart

## Orchestration Entry - 2026-04-07T16:00:00Z

- Orion: Implemented admin login email persistence using localStorage.
- **Feature**: Admin login page now remembers the last successfully used email address across browser sessions.
- **User experience improvement**: Email field auto-fills with last used email, but remains editable for admin convenience.
- **Implementation**:
  1. On page load: Check localStorage for 'adminEmail' key and populate email input field if present
  2. On successful login: Save email to localStorage before redirecting to gallery
  3. Client-side only: No server-side changes needed (session auth via req.session.adminEmail remains unchanged)
- **Key learning**:
  - localStorage provides simple client-side persistence for UX improvements without backend changes
  - Auto-fill on page load improves admin workflow for repeat logins
  - Implementation is browser-specific (localStorage is per-origin), so admins using multiple browsers/devices won't share the saved email (acceptable trade-off)
- Files modified:
  - server/views/login.ejs (added localStorage get/set logic in script section)

## Orchestration Entry - 2026-04-07T08:54:26Z

- Orion: Assigned to update login.ejs to save/load email via localStorage.
- **Session**: login-persistence
- **Scope**: Implement email field persistence using localStorage API
- **Requirements**:
  1. Auto-fill email field on page load if previously saved
  2. Save email to localStorage on successful login submission
  3. Maintain security: NEVER store passwords
  4. XSS protection: Escape values before rendering
- **Coordination**: Calypso creating test coverage for localStorage save, auto-fill, override, edge cases
- **Status**: Assigned

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
  6. Added per-file status reporting in response (success/failure details for each file)
  7. Implemented partial success handling: accepts all valid files even if some fail
  8. Added random milliseconds to timestamp to prevent filename collisions in batch uploads
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

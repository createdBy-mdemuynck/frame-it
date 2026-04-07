## History

Project: frame-it
Requested by: Maarten De Muynck

Seeded at team creation.

- 2026-03-25: Implemented a prototype mobile-first upload UI (web/src/components/UploadForm.jsx), added styles (web/src/styles.css) and a minimal page (web/src/pages/index.jsx). Client-side validation for required fields and 5MB max photo size, preview, and POST to /api/upload. Tested locally via static review; backend endpoint should validate/upload on server side.

## Learnings (2026-03-25)
- Astra delivered a mobile-first upload UI prototype and documented client-side limits (5MB). Integration with backend upload endpoint and accessibility/UX polish are next steps.

- Standard frontend build script is now `npm run build` at the root, which runs the Next.js build in `web/`.
- Default error handling is provided via `web/pages/_error.js` for graceful error display.
- Next.js warns about using `getInitialProps` in `_error.js` for static export, but this is the recommended default for dynamic error handling.

## Orchestration Entry - 2026-03-25T21:00:00Z
- Astra: working on admin star feature (frontend integration). See orchestration log for details.

## Learnings (2026-04-03)
- Implemented lightbox/modal functionality for gallery.ejs to display original images on click
- Modal features: click image to open, ESC key to close, click outside to close, X button to close
- Used vanilla JavaScript for consistency with existing gallery implementation
- Added cursor pointer and hover scale effect on thumbnails for better UX
- Modal styling includes fade-in animation and is fully responsive (90% viewport on desktop, 95% on mobile)
- Prevents body scrolling when modal is open for better mobile experience
- Original image paths from photo.photoPath are used in the modal

## Orchestration Entry - 2026-04-03T14:45:00Z
- Astra: Completed click-to-view modal for gallery images. Users can now click thumbnails to view full-size originals in a responsive lightbox overlay. See orchestration log for details.

## Learnings (2026-04-03 - Modal Fix)
- Fixed gallery modal not opening: the img tag was missing the onclick handler
- The modal infrastructure (openModal/closeModal functions, CSS, HTML structure) was already implemented correctly
- Issue was in renderGallery() - img tag needs onclick="openModal('${photo.photoPath}')" to trigger the modal
- Always ensure event handlers are properly attached to interactive elements during dynamic rendering
- Mobile-first consideration: onclick works for both desktop clicks and mobile taps

## Orchestration Entry - 2026-04-03T15:03:27Z
- Astra: Fixed missing onclick handler on gallery thumbnails. Added onclick="openModal('${photo.photoPath}')" to thumbnail images in renderGallery(). Gallery thumbnails now open full-size lightbox on click/tap. See orchestration log for details.

## Orchestration Entry - 2026-04-07T14:30:00Z
- Astra: Assigned to implement multi-file upload UI in UploadForm.jsx. Scope: support up to 10 files, 10MB per file validation, camera vs gallery modes, file previews. Coordinating with Orion (backend) and Calypso (testing). See orchestration log for details.

## Learnings (2026-04-07 - Multi-file Upload)
- Updated UploadForm.jsx to support multiple file uploads (up to 10 files from gallery, single from camera)
- Increased max file size from 5MB to 10MB per photo (MAX_FILE_SIZE = 10 * 1024 * 1024)
- Implemented dual upload modes:
  - Camera mode: Single photo capture with **automatic upload** after capture (user must fill name/email first)
  - Gallery mode: Multiple selection (up to 10 photos) with manual submit, uses `multiple` attribute on file input
- Client-side validation per file: size ≤10MB, type must be image/*, reject invalid files with descriptive errors
- Sequential upload strategy: Files uploaded one-by-one to existing backend endpoint (which uses `upload.single("photo")`)
- UX improvements: Grid preview layout for multiple photos, upload progress indicator, per-file error reporting, success summary
- Updated CSS (web/src/styles.css): Added `.preview-container` grid layout, `.upload-progress` indicator, `.preview-name` for file names
- State management: Converted from single file/preview to arrays (files[], previews[]) to handle multiple selections
- Auto-submit in camera mode validates name/email before triggering upload, preventing incomplete submissions
- Key file paths: web/src/components/UploadForm.jsx, web/src/styles.css
- Backend coordination needed: Current backend only handles single files; if batch upload in single request is desired, backend needs `upload.array('photo', 10)` instead of `upload.single('photo')`


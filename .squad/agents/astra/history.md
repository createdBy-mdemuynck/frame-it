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


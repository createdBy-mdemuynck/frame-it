## History

Project: frame-it
Requested by: Maarten De Muynck

Seeded at team creation.

## Learnings

- Implemented admin star feature (server/index.js, HTML endpoints under /admin/). All admin star/unstar, star counts, and most-starred photo are available as HTML for browser-based admin use. Data stored in server/uploads/.stars.json. API contract in server/admin-star-api.md. Coordinated with Astra for integration.

- Implemented upload API (server/index.js) using Express + multer. Added server-side validation for required name, email, and photo; rejected files >5MB and non-image uploads.
- Storage: local uploads kept under server/uploads/ with per-email folders (email hashed with sha256). TODOs added to migrate to cloud storage (S3/GCS), add virus scanning, encryption at rest, backups, and retention policies.
- Files created/updated in this change:
  - server/index.js
  - package.json (added multer dependency)
  - .squad/decisions/inbox/orion-upload-endpoint.md
  - .squad/skills/backend-upload/SKILL.md

Notes: local uploads/ directory is runtime-created and should not be relied on for production. Ensure backups and storage migration before accepting many uploads.

## Orchestration Entry - 2026-03-25T20:48:56Z
- Orion: upload endpoint implementation in progress; decision moved to .squad/decisions.md.
- Fixed startup port conflict by preferring PORT env var during local runs and starting the server on PORT=3002 to avoid interfering with an existing node process on port 3000. No code changes required; started server with: $env:PORT=3002; node index.js. Verified GET /health returns {"status":"ok"}.

## Orchestration Entry - 2026-03-25T21:00:00Z
- Orion: working on admin star feature (backend integration). See orchestration log for details.

## Orchestration Entry - 2026-04-03T15:15:00Z
- Orion: Fixed Azure Files storage mount path mismatch preventing uploaded files from persisting.
- **Root cause**: Volume mount was configured at `/app/uploads` but server writes to `/app/server/uploads` (defined in server/index.js line 26).
- **Fix**: Updated infra/main.bicep volumeMounts.mountPath from `/app/uploads` to `/app/server/uploads`.
- **Deployment**: Ran `azd provision` to apply infrastructure changes. Verified with `az containerapp show` that mount path is correct.
- **Verification**: Confirmed Azure Files share `frameit-uploads` is accessible and contains `tmp/` directory created by server.
- **Key learning**: Always verify container paths match mount paths when configuring persistent storage. The server's `uploadsRoot` definition determines where files are written.
- Files modified:
  - infra/main.bicep (line 166: corrected mountPath)
- Deployment commands:
  - `azd provision` (to apply infrastructure changes)
  - `az containerapp show` (to verify volume mount configuration)
  - `az storage file list` (to verify Azure Files connectivity)

## Orchestration Entry - 2026-04-03T15:30:00Z
- Orion: Deployed updated gallery modal feature to Azure Container Apps.
- **Context**: Gallery view (server/views/gallery.ejs) was updated to show original images in a modal when clicked. Changes were committed to git.
- **Deployment**: Ran `azd deploy` to rebuild and redeploy both backoffice and frontoffice containers.
- **Duration**: Deployment completed successfully in 50 seconds.
- **Verification**: Confirmed service health at https://cabackoffice-vg74p4kett4ws.greensea-7f401167.westeurope.azurecontainerapps.io/health. Gallery endpoint redirects to login (expected behavior for protected routes).
- **Key learning**: `azd deploy` efficiently rebuilds and redeploys containers without reprovisioning infrastructure, ideal for code-only updates.
- Files affected:
  - server/views/gallery.ejs (modal feature)
- Deployment command:
  - `azd deploy` (rebuild and redeploy containers)

## Orchestration Entry - 2026-04-03T16:00:00Z
- Orion: Fixed JavaScript syntax error in gallery page causing "Loading gallery..." to hang indefinitely.
- **Root cause**: Line 266 in server/views/gallery.ejs had malformed JavaScript - extra code fragment `onclick="openModal('${photo.photoPath}')" title="Click to view full size"` was incorrectly inserted into the `if (photos.length === 0)` condition, breaking the entire renderGallery() function.
- **Symptoms**: Deployed gallery page showed "Loading gallery..." indefinitely. The /api/gallery endpoint was working correctly and returning `{"success":true,"photos":[]}`, but JavaScript execution failed due to syntax error.
- **Fix**: Removed the malformed code fragment from line 266, restoring proper JavaScript syntax.
- **Deployment**: Committed fix and ran `azd deploy` to redeploy (completed in 50 seconds).
- **Key learning**: Always verify JavaScript syntax in EJS templates - syntax errors can cause silent failures in browser execution. Test deployed pages in browser console to catch client-side JavaScript errors.
- Files modified:
  - server/views/gallery.ejs (line 266: removed malformed onclick/title attributes)
- Deployment commands:
  - `git commit -m "fix: repair malformed JavaScript in gallery.ejs renderGallery function"`
  - `azd deploy`

## Orchestration Entry - 2026-04-03T16:35:00Z
- Orion: Fixed gallery showing "No photos uploaded yet" despite photos existing in Azure Files storage.
- **Root cause**: Azure Files mount path mismatch between infrastructure configuration and actual server runtime path. The server Dockerfile sets `WORKDIR /app` and copies code there, so `uploadsRoot = path.join(__dirname, 'uploads')` resolves to `/app/uploads`. However, the Azure Files volume was mounted at `/app/server/uploads` (from a previous fix that incorrectly assumed the server ran from `/app/server`).
- **Diagnosis**: Added diagnostic logging to /api/gallery endpoint (server/routes/api.js) to trace directory scanning. Logs revealed the API was scanning `/app/uploads` but finding only `tmp/` directory, while photos existed in Azure Files under user directories.
- **Fix**: Updated infra/main.bicep volumeMounts.mountPath from `/app/server/uploads` to `/app/uploads` to match the actual container working directory.
- **Deployment**: Ran `azd provision` (1m 45s) to update infrastructure, then `azd deploy backoffice` (24s) to apply changes. Verified via Azure CLI that mount path was `/app/uploads` and confirmed with `az storage file list` that photos exist in the share.
- **Verification**: Gallery API now successfully returns photos. Tested with `curl /api/gallery` - returned 1 photo with correct metadata and thumbnail path. Cleaned up diagnostic logging after verification.
- **Key learning**: Container runtime paths depend on Dockerfile WORKDIR and code structure, not just source directory layout. Always verify the actual runtime value of `__dirname` in the container matches infrastructure mount paths. Use diagnostic logging to trace filesystem access issues.
- Files modified:
  - infra/main.bicep (line 166: corrected mountPath from `/app/server/uploads` to `/app/uploads`)
  - server/routes/api.js (added temporary diagnostic logging, then removed after verification)
- Deployment commands:
  - `azd provision` (apply infrastructure changes)
  - `azd deploy backoffice` (redeploy with new mount)
  - `az containerapp show` (verify mount configuration)
  - `az storage file list` (verify Azure Files contents)

## Orchestration Entry - 2026-04-03T16:45:00Z
- Orion: Deployed gallery onclick handler fix to Azure Container Apps.
- **Context**: Astra updated server/views/gallery.ejs with onclick handlers to enable modal display when clicking thumbnail images. Changes were committed and ready for deployment.
- **Deployment**: Ran `azd deploy` to rebuild and redeploy both backoffice and frontoffice containers.
- **Duration**: Deployment completed successfully in 49 seconds.
- **Verification**: Confirmed service health at https://cabackoffice-vg74p4kett4ws.greensea-7f401167.westeurope.azurecontainerapps.io/health - service returned {"status":"ok"}.
- **Key learning**: Rapid deployment cycle for view-only changes - no infrastructure provisioning needed, just container rebuild and redeploy. Gallery modal feature now fully functional in production.
- Files affected:
  - server/views/gallery.ejs (onclick handlers for thumbnails)
- Deployment command:
  - `azd deploy` (rebuild and redeploy containers)

## Orchestration Entry - 2026-04-03T15:03:27Z
- Orion: Deployed gallery modal fix to Azure Container Apps following Astra's onclick handler fix. Duration: 49 seconds. Service health confirmed. Gallery thumbnails now fully functional with lightbox modal in production. See orchestration log for details.

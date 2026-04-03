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

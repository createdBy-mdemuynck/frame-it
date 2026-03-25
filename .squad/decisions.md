# Squad Decisions

## Active Decisions

### Choose Next.js for frontend + Express backend
Decision: For the initial scaffold we choose Next.js for the frontend and Express for the backend. This allows server-side rendering where needed, easy deployment options, and a familiar Node.js stack for the team.

Consequences:
- Use Next.js app in /web
- Use Express app in /server
- Root package.json coordinates dev scripts using concurrently and nodemon

Date: 2026-03-25
Author: Daedalus

---

### Astra upload UI prototype
Decision: Prototype a mobile-first upload UI for photo submissions. Client-side validations: required name, email, photo; basic email regex; max photo size 5MB. UI uses input type=file with accept="image/*" and capture="environment" to encourage camera use on mobile. Submissions POST to /api/upload as multipart/form-data; backend must validate and store files securely.

Rationale: 5MB chosen as reasonable balance for mobile uploads and server storage/costs. Can be adjusted later.

Next steps:
- Backend: implement /api/upload with server-side validation and storage, reject files >5MB.
- Add integration tests and UX polish (progress, retry, accessibility improvements).

Date: 2026-03-25

---

### Calypso Tests - Decision Note
Decision: Create tests/ directory containing a detailed upload_flow.md test plan (markdown). Do not add executable tests now.

Rationale: We need a clear, reproducible plan covering happy paths, limits, and jury workflow before authoring automated tests. Daedalus will add package.json scripts and configure Jest to run tests later; Calypso focuses on test cases and edge cases.

Actions:
- Calypso: authored tests/upload_flow.md and added tests/.gitkeep.
- Daedalus: will wire Jest and add npm scripts to package.json.
- Scribe: consult for any product decisions (e.g., exact size limits, dedup rules) before automation.

Date: 2026-03-25

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction

---
Calypso test plan inbox note

Summary:
I produced a prioritized automation plan mapping upload and jury scenarios to Jest integration test files. I propose automating P0 scenarios first: happy-path, size-limits, unsupported-type, auth, and jury end-to-end.

Requests / Decisions:
- Confirm size limit: current decision notes 5MB. Scribe please confirm if this is final before automating size-limit tests.
- Confirm dedup rules (what constitutes duplicate content and expected behavior) before implementing duplicate-upload tests.
- Confirm desired status codes for corrupted images (422 vs 400) and for storage failures (503 vs 500) to assert exact responses.

Files created:
- tests/automation-plan.md
- tests/test-skeletons/ (README + per-scenario skeletons)

Author: Calypso
Date: 2026-03-25


---
# Orion: upload endpoint note

Temporary decision: implement a minimal local storage implementation for uploads to accelerate frontend integration and testing. Files are stored under server/uploads/<sha256(email)>/ and served statically at /uploads/. This is intended as a short-term measure.

Rationale:
- Accelerates development and manual testing without requiring cloud credentials.
- Matches tests and frontend expectations (multipart/form-data to /api/upload or /upload on Express server).

TODO / Next steps:
- Migrate storage to cloud object storage (S3, GCS, or Azure Blob) with server-side encryption and access policies.
- Add virus/malware scanning (e.g., ClamAV or cloud provider scanning) before accepting files into production buckets.
- Implement retention, backup, and lifecycle policies.
- Consider per-email quotas and authenticated upload endpoints.

Author: Orion
Date: 2026-03-25


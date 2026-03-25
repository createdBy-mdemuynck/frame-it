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

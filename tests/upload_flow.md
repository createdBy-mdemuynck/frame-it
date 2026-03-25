Upload Flow Test Plan

Overview
- Purpose: Define test cases for image upload flows, limits, and the jury workflow. These are test plans (markdown); Jest wiring will be added by Daedalus.
- Scope: Client uploads, server validation, storage interactions, jury assignment and verdict flows.

Test cases

1) Happy path - single valid image
- Steps: Upload a valid image (JPEG, PNG) within size limits.
- Expected: 201 Created, response includes image ID and locations; image stored; jury job created and assigned.

2) Multiple concurrent uploads
- Steps: Upload 5 images concurrently from same user.
- Expected: All succeed within SLA; separate jury jobs for each.

3) File size limit
- Steps: Upload files at, below, and above the configured max size (e.g., 5MB).
- Expected: Files <= limit accepted; > limit rejected with 413 Payload Too Large and useful error message.

4) Unsupported file type / wrong content-type
- Steps: Upload a .txt or .exe disguised as image; incorrect Content-Type header.
- Expected: 400 Bad Request and rejection; no storage write.

5) Malformed / corrupted image
- Steps: Upload a file with image extension but corrupted bytes.
- Expected: Validation fails; return 422 Unprocessable Entity or 400 with explicit message.

6) Rate limiting
- Steps: Send many upload requests quickly (e.g., 50 in a minute) to hit rate limiter.
- Expected: After threshold, responses return 429 Too Many Requests; headers indicate retry-after.

7) Authentication/authorization
- Steps: Upload with valid token, expired token, and without token.
- Expected: Valid token accepted; expired/absent tokens return 401/403 as configured.

8) Storage failure simulation
- Steps: Simulate storage outage (mock or toggle flag) during upload.
- Expected: API returns 503 Service Unavailable or 500 depending on retry policy; no partial metadata persisted (atomicity check).

9) Partial failure / transactional consistency
- Steps: Force success in storage but failure in DB write (or vice versa).
- Expected: System should rollback or perform compensating action; no orphaned files or jobs.

10) Jury workflow end-to-end
- Steps: After upload, allow jury to fetch pending jobs, submit verdicts (accept/reject), observe state transitions and notifications.
- Expected: Jobs are visible to jury, verdicts update image status, notifications or callbacks are fired.

11) Jury edge cases: duplicate verdicts / concurrent votes
- Steps: Two jurors submit conflicting verdicts concurrently.
- Expected: System de-duplicates or aggregates votes deterministically; final state follows business rules.

12) Large payload streaming
- Steps: Upload a very large image via streaming endpoints (if supported).
- Expected: Server streams and accepts or rejects per limits without memory blowup.

Test data and automation notes
- Use fixture images: valid.jpg, valid.png, corrupted.jpg, large.jpg (over limit).
- Mock storage providers (local FS, S3) to simulate failures and latency.
- Mock auth tokens for valid/expired scenarios.
- Tests should validate HTTP status, response body, DB state, storage contents, and side-effects (jobs/events).

Edge cases to validate
- Truncated uploads, slow connections, interrupted TCP during upload.
- Simultaneous deletes while upload in-progress.
- Filenames with special/Unicode characters.
- Duplicate uploads (same content hash) - dedup behavior.

Acceptance criteria
- All test cases documented with expected outcomes.
- Automation should be able to run these end-to-end with mocks; integration tests for real storage kept separate.

Jest placeholder
- package.json scripts will be added by Daedalus. Keep this directory for test plans and future test files.
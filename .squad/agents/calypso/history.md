## History

Project: frame-it
Requested by: Maarten De Muynck

Seeded at team creation.

## Learnings - Calypso

- Created tests/upload_flow.md containing test cases for upload flows, limits, jury workflow, and edge cases (malformed images, rate limits, storage errors).
- Added tests/.gitkeep to ensure tests directory exists in the repository.
- Added decision note at .squad/decisions/inbox/calypso-tests.md detailing the approach and coordination with Daedalus and Scribe.
- Created tests/automation-plan.md and tests/test-skeletons/ (README and scenario skeletons) to map scenarios to Jest integration files and indicate priorities.
- Created .squad/decisions/inbox/calypso-testplan.md to request confirmations from Scribe on size limits, dedup rules, and status-code expectations before automation.
- Tests are a plan (markdown) and will be wired into Jest later by Daedalus; kept as non-executable artifacts for now.

## Learnings (2026-03-25)

- Calypso produced a comprehensive test plan; next is converting these plans into automated Jest tests once the scaffold wiring is complete.

## Orchestration Entry - 2026-03-25T20:48:56Z

- Calypso: test plan completed; merged decision into .squad/decisions.md and artifacts produced (tests/automation-plan.md, tests/test-skeletons).

## Learnings (2026-04-07)

- Updated upload requirements: file size limit increased from 5MB to 10MB per file
- Added batch upload support: camera mode (single immediate) vs gallery mode (1-10 files per batch)
- Created comprehensive batch upload test cases in tests/upload_flow.md (cases 2a-2h)
- Created new test skeleton: tests/test-skeletons/batch-upload.md (P0 priority, 10 scenarios)
- Updated automation-plan.md with batch-upload.test.ts and camera-mode.test.ts as P0
- Updated all fixture requirements: large.jpg now 11MB, added batch fixture sets
- Key test scenarios added:
  - Batch count validation (1-10 allowed, 11+ rejected)
  - Per-file size validation in batch context (10MB per file)
  - Mixed valid/invalid file handling (atomic vs partial success - TBD by Scribe)
  - Duplicate files in same batch (dedup rules - TBD by Scribe)
  - Network interruption during batch upload
  - Empty batch validation
- Created decision document: .squad/decisions/inbox/calypso-batch-upload.md
- Open questions for Scribe: atomic vs partial success, duplicate handling, total request size, timeout SLAs
- Test plan now covers both upload modes distinctly: camera (immediate single file) and gallery (batch 1-10 files)

## Orchestration Entry - 2026-04-07T14:30:00Z

- Calypso: Assigned to create test coverage for multi-file upload feature. Scope: test 1-10 file uploads, 10MB per file validation, edge cases (empty, invalid types, boundaries), batch processing success/failure scenarios. Requires Astra and Orion implementations to be complete. See orchestration log for details.

## Learnings (2026-04-07 - Thumbnail Generation Regression)

- **REGRESSION IDENTIFIED:** Thumbnails not generated after upload despite upload succeeding
- Root cause: Thumbnail generation is fully asynchronous (setImmediate) and errors only logged, not surfaced
- Created comprehensive test coverage: `tests/test-skeletons/thumbnail-generation.md` (10 test scenarios, P0 priority)
- Updated `tests/automation-plan.md` to include thumbnail-generation.test.ts as P0 (critical regression prevention)
- Created decision document: `.squad/decisions/inbox/calypso-thumbnail-tests.md`

## Orchestration Entry - 2026-04-07T08:40:44Z

- Calypso: Assigned to create automated tests for thumbnail generation to prevent regression.
- **Regression**: Thumbnails not generated after upload despite upload succeeding
- **Impact**: Critical - Gallery display and jury workflow blocked without thumbnails
- **Test coverage**: Created 10 test scenarios in `tests/test-skeletons/thumbnail-generation.md` (P0 priority)
- **Updated**: `tests/automation-plan.md` with `thumbnail-generation.test.ts` as P0
- **Coordination**: Awaiting Orion's thumbnail fix implementation before running automated tests
- **Status**: Test plan complete, ready for test execution once Orion completes fix

**Technical Analysis:**

- Thumbnails generated in `setImmediate()` callback AFTER response sent (non-blocking)
- 500ms delay before Sharp processes image (filesystem sync time on mounted volumes)
- Retry mechanism: 2-second delay if first attempt fails
- Dimensions: 150x150 pixels, 'cover' fit (cropped to square)
- Location: `uploads/{email}/thumbnails/{filename}`

**Test Coverage Created:**

1. Single file upload → thumbnail exists, 150x150, correct location
2. Batch upload → all thumbnails created
3. Thumbnail dimensions verification (various aspect ratios)
4. Upload succeeds even if thumbnail fails (error isolation)
5. Non-blocking behavior (response doesn't wait for thumbnail)
6. Retry mechanism verification
7. Concurrent upload thumbnail handling
8. EXIF rotation handling
9. Thumbnail regeneration (if endpoint exists)
10. Error handling and logging

**Key Testing Patterns:**

- Use polling/waiting for thumbnail existence (appears 1-3s after upload)
- Mock Sharp failures to test retry and error isolation
- Test concurrent scenarios to verify no collisions
- Add fixtures: panorama, portrait, square, EXIF-rotated images
- CI/CD: Block deployment if thumbnail tests fail

**Regression Prevention:**

- Thumbnail tests must pass on all upload-related PRs
- Run tests when changes touch: upload.js, package.json, Docker config
- Alert on thumbnail error rate > 5% in production logs

## Learnings (2026-04-07 - Admin Login localStorage Persistence)

- **NEW FEATURE:** Admin login will remember last used email via localStorage
- Created comprehensive test coverage: `tests/test-skeletons/admin-workflow.md` (10 test scenarios, P1 priority)
- Updated `tests/automation-plan.md` to include login-persistence.test.ts as P1
- Created decision document: `.squad/decisions/inbox/calypso-admin-login-persistence.md`

**Test Coverage Created:**

1. localStorage save after successful login (P1)
2. Auto-fill email on page reload (P1) - password field always empty
3. User can override auto-filled email (P1)
4. Empty email not saved (P2)
5. Invalid email format not saved (P2)
6. localStorage unavailable/privacy mode - graceful degradation (P2)
7. Multiple admin users on same device (P2)
8. localStorage cleared by user - respect user action (P3)
9. XSS protection - escape localStorage values (P1)
10. Session vs localStorage boundary - email persists, auth doesn't (P2)

**Key Security Requirements:**

- NEVER store passwords in localStorage
- Escape/sanitize all localStorage values before rendering in input fields
- Wrap localStorage access in try-catch for quota/privacy errors
- Validate email format before saving
- Consider adding "Remember me" checkbox for explicit user consent

**Implementation Details:**

- Storage key: 'adminEmail' or 'lastAdminLogin' (coordinate with Astra)
- Test across browsers: Chrome, Firefox, Safari, Edge
- Test on mobile: iOS Safari, Chrome Mobile
- Accessibility: Ensure auto-fill works with screen readers and keyboard navigation

**Coordination Required:**

- **Astra**: Frontend implementation (login page, localStorage integration)
- **Scribe**: Security/privacy policy decisions, GDPR considerations, user consent model
- **Daedalus**: Jest test implementation when ready to automate

**Open Questions for Scribe:**

1. Explicit user consent checkbox vs implied consent?
2. Email expiration after X days of inactivity?
3. GDPR/privacy considerations for storing email in localStorage?
4. Analytics tracking for localStorage availability/usage?

**Rationale:**

- UX improvement: Reduce friction for returning admin/jury users
- Common pattern: Standard in many admin systems
- Privacy compliant: Email is non-sensitive, client-controlled, user can clear
- Security compliant: Passwords never stored, only email address

## Orchestration Entry - 2026-04-07T08:54:26Z

- Calypso: Assigned to add test cases for login persistence (localStorage save, auto-fill, override, edge cases).
- **Session**: login-persistence
- **Scope**: Create comprehensive test coverage for email localStorage persistence
- **Requirements**:
  1. Test localStorage save after successful login
  2. Test auto-fill on page reload
  3. Test user override of auto-filled email
  4. Test edge cases: empty email, invalid format, localStorage unavailable, privacy mode
  5. Test XSS protection and escaping
  6. Test security boundary: email persists, password never stored
- **Priority**: P1 for core happy path, P2 for edge cases
- **Coordination**: Awaiting Orion's implementation in login.ejs
- **Status**: Assigned

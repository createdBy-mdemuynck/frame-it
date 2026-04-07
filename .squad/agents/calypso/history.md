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

Automation testing plan for image upload flows

Overview:
This plan prioritizes scenarios for Jest integration tests (server-side), maps them to filenames, and marks automation priority.

Priority keys:

- P0: Automate first (critical)
- P1: High
- P2: Medium
- P3: Low / Optional

Scenarios (mapped to Jest files):

1. Happy path - single valid image (P0)

- File: tests/integration/upload/happy-path.test.ts
- Description: Upload valid JPEG/PNG <=10MB. Assert 201, response body contains imageId, DB record created, storage contains file, jury job created.

1a) Camera mode - single immediate upload (P0)

- File: tests/integration/upload/camera-mode.test.ts
- Description: Simulate camera capture and immediate single file upload. Assert 201, immediate processing.

1b) Thumbnail generation - comprehensive (P0)

- File: tests/integration/upload/thumbnail-generation.test.ts
- Description: Verify thumbnails are generated correctly after upload. Tests single/batch uploads, dimensions (150x150), file location (thumbnails/ subdirectory), non-blocking behavior, retry mechanism, error handling. Prevents regression where uploads succeed but thumbnails fail silently. See test-skeletons/thumbnail-generation.md for 10 detailed test scenarios.
- Rationale: REGRESSION PREVENTION - thumbnails have broken after updates before. These tests ensure thumbnail generation is verified on every upload-related change.

2. Batch upload - gallery mode (P0)

- File: tests/integration/upload/batch-upload.test.ts
- Description: Upload batches of 1, 5, 10 files from gallery/file picker. Assert 201, all files processed. Test limit enforcement (11 files rejected). Test mixed valid/invalid sizes. Test all files oversized. Test duplicate files in batch. Test empty batch. See batch-upload.md skeleton for full details.

2a) Multiple concurrent uploads (P1)

- File: tests/integration/upload/concurrent-uploads.test.ts
- Description: Upload 5 images concurrently; assert all succeed and jobs created separately.

3. File size limit (P0)

- File: tests/integration/upload/size-limits.test.ts
- Description: Upload at, below, above limit (10MB per file); expect 201 for <= limit, 413 for > limit.

4. Unsupported file type / wrong content-type (P0)

- File: tests/integration/upload/unsupported-type.test.ts
- Description: .txt/.exe disguised as image; expect 400 and no storage write.

5. Malformed / corrupted image (P1)

- File: tests/integration/upload/corrupted-image.test.ts
- Description: Corrupted bytes; expect 422 or 400 and no storage write.

6. Rate limiting (P1)

- File: tests/integration/upload/rate-limit.test.ts
- Description: Burst of requests to exceed limiter; expect 429 and Retry-After header.

7. Authentication/authorization (P0)

- File: tests/integration/upload/auth.test.ts
- Description: Valid token, expired token, no token. Expect 201 vs 401/403.

8. Storage failure simulation (P1)

- File: tests/integration/upload/storage-failure.test.ts
- Description: Mock storage outage; expect 503/500 and no partial metadata persisted.

9. Partial failure / transactional consistency (P1)

- File: tests/integration/upload/consistency-transaction.test.ts
- Description: Simulate DB write failure or storage write failure; ensure rollback or compensating actions.

10. Jury workflow end-to-end (P0)

- File: tests/integration/jury/end-to-end.test.ts
- Description: After upload, fetch pending jobs, submit verdicts, assert state transitions and notifications.

11. Jury edge cases: duplicate verdicts / concurrent votes (P2)

- File: tests/integration/jury/concurrent-verdicts.test.ts
- Description: Concurrent conflicting votes; assert deterministic aggregation.

12. Admin login localStorage persistence (P1)

- File: tests/integration/admin/login-persistence.test.ts
- Description: Verify admin login remembers last used email via localStorage. Tests auto-fill on reload, override capability, empty/invalid email handling, localStorage unavailable (privacy mode), XSS protection, session vs localStorage boundary. See test-skeletons/admin-workflow.md for 10 detailed test scenarios.
- Rationale: UX improvement - reduce friction for returning admin/jury users. Security critical: ensure passwords never stored, localStorage values properly escaped.

13. Large payload streaming (P3)

- File: tests/integration/upload/streaming.test.ts
- Description: If supported, stream large images and assert memory usage behavior and acceptance/rejection.

Cross-cutting fixtures & mocks:

- Fixtures:
  - Single files: valid.jpg, valid.png, corrupted.jpg, large.jpg (11MB - over limit), medium.jpg (9MB - under limit)
  - Batch sets: batch-valid-5.zip (5 files <10MB), batch-valid-10.zip (10 files), batch-11-files.zip (exceeds limit), batch-mixed.zip (3 valid + 2 oversized), batch-duplicates.zip
  - Thumbnail testing: panorama.jpg (3000x500), portrait.jpg (500x3000), square.jpg (2000x2000), rotated-exif.jpg (EXIF orientation)
- Mocks: storage adapters (local, s3), auth token provider, rate limiter hook, DB transactions, event bus/jury queue, Sharp thumbnail generation (for failure testing)
  camera-mode, batch-upload, thumbnail-generation, size-limits, unsupported-type, auth, jury end-to-end

2. P1 files: concurrent-uploads, corrupted-image, rate-limit, storage-failure, consistency-transaction, admin login-persistence
3. P2 files: concurrent-verdicts, dedup/duplicate-upload rules
4. P3 files: streaming, very-large payloads

Notes for implementers:

- Use integration tests that can run with mocks for storage and DB; reserve separate E2E suite for real storage.
- Coordinate with Scribe to confirm batch behavior decisions:
  - Atomic failure vs partial success for mixed valid/invalid batches
  - Dedup rules for duplicate files within same batch
  - Max total request size (in addition to per-file 10MB limit)
  - Timeout thresholds for batch processing
- Updated file size limit: 10MB per file (changed from 5MB on 2026-04-07)
- Use integration tests that can run with mocks for storage and DB; reserve separate E2E suite for real storage.
- Coordinate with Scribe to confirm size limit (5MB) and dedup rules before automating dedup tests.

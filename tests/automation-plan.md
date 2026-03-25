Automation testing plan for image upload flows

Overview:
This plan prioritizes scenarios for Jest integration tests (server-side), maps them to filenames, and marks automation priority.

Priority keys:
- P0: Automate first (critical)
- P1: High
- P2: Medium
- P3: Low / Optional

Scenarios (mapped to Jest files):

1) Happy path - single valid image (P0)
- File: tests/integration/upload/happy-path.test.ts
- Description: Upload valid JPEG/PNG <=5MB. Assert 201, response body contains imageId, DB record created, storage contains file, jury job created.

2) Multiple concurrent uploads (P1)
- File: tests/integration/upload/concurrent-uploads.test.ts
- Description: Upload 5 images concurrently; assert all succeed and jobs created separately.

3) File size limit (P0)
- File: tests/integration/upload/size-limits.test.ts
- Description: Upload at, below, above limit; expect 201 for <= limit, 413 for > limit.

4) Unsupported file type / wrong content-type (P0)
- File: tests/integration/upload/unsupported-type.test.ts
- Description: .txt/.exe disguised as image; expect 400 and no storage write.

5) Malformed / corrupted image (P1)
- File: tests/integration/upload/corrupted-image.test.ts
- Description: Corrupted bytes; expect 422 or 400 and no storage write.

6) Rate limiting (P1)
- File: tests/integration/upload/rate-limit.test.ts
- Description: Burst of requests to exceed limiter; expect 429 and Retry-After header.

7) Authentication/authorization (P0)
- File: tests/integration/upload/auth.test.ts
- Description: Valid token, expired token, no token. Expect 201 vs 401/403.

8) Storage failure simulation (P1)
- File: tests/integration/upload/storage-failure.test.ts
- Description: Mock storage outage; expect 503/500 and no partial metadata persisted.

9) Partial failure / transactional consistency (P1)
- File: tests/integration/upload/consistency-transaction.test.ts
- Description: Simulate DB write failure or storage write failure; ensure rollback or compensating actions.

10) Jury workflow end-to-end (P0)
- File: tests/integration/jury/end-to-end.test.ts
- Description: After upload, fetch pending jobs, submit verdicts, assert state transitions and notifications.

11) Jury edge cases: duplicate verdicts / concurrent votes (P2)
- File: tests/integration/jury/concurrent-verdicts.test.ts
- Description: Concurrent conflicting votes; assert deterministic aggregation.

12) Large payload streaming (P3)
- File: tests/integration/upload/streaming.test.ts
- Description: If supported, stream large images and assert memory usage behavior and acceptance/rejection.

Cross-cutting fixtures & mocks:
- Fixtures: fixtures/valid.jpg, valid.png, corrupted.jpg, large.jpg (>5MB)
- Mocks: storage adapters (local, s3), auth token provider, rate limiter hook, DB transactions, event bus/jury queue

Automation order recommendation:
1) P0 files: happy-path, size-limits, unsupported-type, auth, jury end-to-end
2) P1 files: concurrent-uploads, corrupted-image, rate-limit, storage-failure, consistency-transaction
3) P2 files: concurrent-verdicts, dedup/duplicate-upload rules
4) P3 files: streaming, very-large payloads

Notes for implementers:
- Use integration tests that can run with mocks for storage and DB; reserve separate E2E suite for real storage.
- Coordinate with Scribe to confirm size limit (5MB) and dedup rules before automating dedup tests.

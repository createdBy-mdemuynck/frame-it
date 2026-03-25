Files:
- tests/integration/upload/concurrent-uploads.test.ts (P1)
- tests/integration/upload/rate-limit.test.ts (P1)
- tests/integration/upload/storage-failure.test.ts (P1)
- tests/integration/upload/consistency-transaction.test.ts (P1)

Skeleton: concurrent-uploads.test.ts
- Steps: launch 5 parallel uploads; wait for all; assert all 201 and 5 jury jobs created.

Skeleton: rate-limit.test.ts
- Steps: send rapid requests to exceed rate limiter; assert 429 responses and Retry-After header present.

Skeleton: storage-failure.test.ts
- Steps: mock storage to fail (throw or return error) during upload; assert API returns 503/500 and DB transaction not committed; storage contains no orphan file.

Skeleton: consistency-transaction.test.ts
- Steps: simulate DB write failure after storage success, and vice versa; assert compensating deletes or rollbacks occur, no orphaned metadata or files remain.

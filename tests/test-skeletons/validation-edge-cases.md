File(s):
- tests/integration/upload/size-limits.test.ts (P0)
- tests/integration/upload/unsupported-type.test.ts (P0)
- tests/integration/upload/corrupted-image.test.ts (P1)
- tests/integration/upload/auth.test.ts (P0)

Common fixtures/mocks:
- fixtures/large.jpg (>limit)
- fixtures/corrupted.jpg
- fixtures/invalid.txt
- Mocks: storage, auth issuer

Skeleton: size-limits.test.ts
- Steps: upload below, at, above size limit; assert 201, 201, 413 respectively; check error message for > limit.

Skeleton: unsupported-type.test.ts
- Steps: upload .txt with image extension or wrong Content-Type; expect 400 and no storage write.

Skeleton: corrupted-image.test.ts
- Steps: upload corrupted.jpg; expect 422 or 400 and no storage write.

Skeleton: auth.test.ts
- Steps: upload with valid token (201), expired token (401), no token (401/403 per config).

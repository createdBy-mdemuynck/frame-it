File: tests/integration/upload/happy-path.test.ts
Priority: P0

Purpose:
- Verify single valid image upload succeeds and triggers downstream processing.

Setup/Fixtures:
- Fixture: fixtures/valid.jpg (small JPEG)
- Mock storage adapter (capture writes)
- Mock DB (or test DB transaction)
- Mock jury/event queue
- Auth: valid bearer token

Test Steps (human):
1. POST /api/upload multipart/form-data with valid.jpg
2. Assert HTTP 201
3. Parse response: check for imageId and URLs
4. Assert storage write called with expected path
5. Assert DB record exists with status 'pending'
6. Assert jury job created in queue referencing imageId

Assertions:
- Status 201
- Response body shape
- Storage call count and path
- DB row present
- Queue job enqueued

Notes:
- Clean up created fixtures and mock state between tests.
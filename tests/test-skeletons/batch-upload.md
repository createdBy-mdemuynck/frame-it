File: tests/integration/upload/batch-upload.test.ts
Priority: P0

Purpose:

- Verify batch upload functionality for gallery/file picker mode.
- Test file count limits (1-10 allowed, 11+ rejected).
- Validate per-file size limits in batch context (10MB per file).
- Test mixed valid/invalid scenarios.

Setup/Fixtures:

- Fixtures:
  - batch-1-file/ (single valid JPEG)
  - batch-5-files/ (5 valid images, varying sizes 1-9MB)
  - batch-10-files/ (10 valid images, all <10MB)
  - batch-11-files/ (11 valid images to test limit exceeded)
  - batch-mixed-sizes/ (3 files <10MB, 2 files >10MB)
  - batch-all-oversized/ (5 files, all >10MB)
  - batch-duplicates/ (same file repeated 3 times)
- Mock storage adapter
- Mock DB
- Mock jury/event queue
- Auth: valid bearer token

Test Cases:

1. Batch upload - 1 file (gallery mode)
   - POST /api/upload with 1 file in multipart batch
   - Assert 201 Created
   - Verify response contains array with 1 image object
   - Verify storage write, DB record, jury job

2. Batch upload - 5 files (typical gallery selection)
   - POST /api/upload with 5 files
   - Assert 201 Created
   - Verify response array contains 5 image objects
   - Verify 5 storage writes, 5 DB records, 5 jury jobs
   - Verify all files processed within SLA

3. Batch upload - 10 files (maximum allowed)
   - POST /api/upload with 10 files
   - Assert 201 Created
   - Verify response array contains 10 image objects
   - Verify all 10 files stored and processed

4. Batch upload - 11 files (exceeds limit)
   - POST /api/upload with 11 files
   - Assert 400 Bad Request
   - Verify error message: "Maximum 10 files allowed per batch"
   - Verify NO files stored (atomic rejection)
   - Verify NO DB records created
   - Verify NO jury jobs created

5. Batch upload - all files valid sizes
   - POST /api/upload with files: 1MB, 5MB, 9MB, 10MB (exactly at limit)
   - Assert 201 Created
   - Verify all files accepted
   - Verify file at exactly 10MB accepted

6. Batch upload - mixed valid/invalid sizes
   - POST /api/upload with 3 files <10MB and 2 files >10MB
   - Assert 400 Bad Request (reject entire batch)
   - OR Assert 207 Multi-Status (partial success, if supported)
   - Verify error details specify which files failed and why
   - Document decision: atomic failure vs partial success model

7. Batch upload - all files over size limit
   - POST /api/upload with 5 files, all >10MB
   - Assert 400 Bad Request
   - Verify clear error: "All files exceed maximum size of 10MB"
   - Verify NO files stored

8. Batch upload - duplicate files
   - POST /api/upload with same file 3 times
   - Verify behavior per dedup rules (TBD by Scribe):
     - Option A: Accept all, create separate records
     - Option B: Reject duplicates, accept only first
     - Option C: Accept with warning in response
   - Document expected behavior

9. Batch upload - empty batch
   - POST /api/upload with 0 files
   - Assert 400 Bad Request
   - Verify error: "No files provided"

10. Batch upload - network interruption
    - Simulate connection drop during batch upload
    - Verify request fails gracefully
    - Verify NO partial data persisted
    - Verify retry mechanism handles gracefully

Assertions:

- Status codes: 201, 400, 207 (if partial success supported)
- Response structure for batch (array of results)
- Storage call counts match expected file counts
- DB rows match successful uploads
- Queue jobs match successful uploads
- Error messages clear and actionable
- Atomic behavior vs partial success (document decision)

Camera Mode vs Gallery Mode:

- Camera mode: Single file, immediate POST (covered in happy-path.md)
- Gallery mode: Batch of 1-10 files, single POST (this file)
- Both modes enforce 10MB per-file limit
- Gallery mode adds batch-level validation (file count)

Notes:

- Batch processing should complete within reasonable SLA (e.g., <5s for 10 files)
- Consider transaction boundaries for batch atomicity
- Document rollback strategy if some files fail mid-batch
- Clean up all created fixtures and mock state between tests
- Performance: test batch upload with concurrent batches from different users

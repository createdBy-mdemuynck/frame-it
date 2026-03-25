# Orion: upload endpoint note

Temporary decision: implement a minimal local storage implementation for uploads to accelerate frontend integration and testing. Files are stored under server/uploads/<sha256(email)>/ and served statically at /uploads/. This is intended as a short-term measure.

Rationale:
- Accelerates development and manual testing without requiring cloud credentials.
- Matches tests and frontend expectations (multipart/form-data to /api/upload or /upload on Express server).

TODO / Next steps:
- Migrate storage to cloud object storage (S3, GCS, or Azure Blob) with server-side encryption and access policies.
- Add virus/malware scanning (e.g., ClamAV or cloud provider scanning) before accepting files into production buckets.
- Implement retention, backup, and lifecycle policies.
- Consider per-email quotas and authenticated upload endpoints.

Author: Orion
Date: 2026-03-25

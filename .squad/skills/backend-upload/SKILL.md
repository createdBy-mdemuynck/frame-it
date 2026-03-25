# Backend Upload Skill

This SKILL documents a reusable pattern for handling user image uploads in the backend.

Key points:
- Use multer (or similar) to parse multipart/form-data.
- Enforce server-side validation: required fields (name, email), file presence, file size limit (5MB), and file type (image/*).
- Store files in a secure location. For local dev use a per-email folder; for production use object storage with encryption and backups.
- Sanitize filenames and avoid using raw user input for directories. Use a hash of the email (sha256) for per-user folders.
- Return structured JSON: { success: boolean, file?: { filename, url, size, mimetype }, error?: string }

TODO: Expand with code snippets and tests.

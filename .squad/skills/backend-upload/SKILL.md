# Backend Upload Skill

This SKILL documents reusable patterns for handling user image uploads in the backend, including single and multi-file uploads.

## Key Patterns

### Multer Configuration

- Use `multer` to parse multipart/form-data
- Configure file size limits (currently 10MB per file)
- Implement `fileFilter` to validate file types (image/\* only)
- Use temporary directory for initial uploads, then move to final location

### Validation

Server-side validation is mandatory:

- **Required fields**: name, email, photo(s)
- **Email validation**: Basic regex pattern `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- **File size limit**: 10MB per file (configurable)
- **File type**: Only image/\* MIME types

### Multi-File Support

- Use `upload.array("photo", maxCount)` to accept multiple files
- Support both single file (`req.file`) and multiple files (`req.files`) for backward compatibility
- Process files concurrently with `Promise.all()`
- Extract file processing into dedicated helper function for reusability

### File Storage

- **Email-based folders**: Sanitize email to create safe directory names (`email.toLowerCase().replace(/[^a-zA-Z0-9@.]/g, "_")`)
- **Unique filenames**: Use timestamp + random milliseconds + sanitized original name to prevent collisions
- **Metadata**: Save JSON metadata alongside each file (name, email, uploadedAt, filename)
- **Thumbnails**: Generate synchronously before responding to guarantee availability (see Thumbnail Generation section)

### Error Handling Strategies

**Validation errors**: Clean up all uploaded temp files before returning error

**Partial success mode** (recommended for multi-file uploads):

```javascript
// Accept all valid files even if some fail
const results = await Promise.all(files.map(processFile));
const successful = results.filter((r) => r.success);
const failed = results.filter((r) => !r.success);

if (successful.length === 0) {
  return res.status(500).json({ success: false, error: "All files failed", results });
}

return res.json({
  success: true,
  uploaded: successful.length,
  failed: failed.length,
  warning: failed.length > 0 ? `${failed.length} file(s) failed` : undefined,
  results,
});
```

### Response Format

**Single file success:**

```json
{
  "success": true,
  "message": "1 file(s) uploaded successfully",
  "uploaded": 1,
  "failed": 0,
  "results": [
    {
      "success": true,
      "filename": "1234567890_photo.jpg",
      "originalName": "photo.jpg",
      "size": 2048576,
      "thumbnail": true,
      "thumbnailError": null
    }
  ]
}
```

**Multi-file partial success:**

```json
{
  "success": true,
  "message": "2 file(s) uploaded successfully",
  "uploaded": 2,
  "failed": 1,
  "warning": "1 file(s) failed to upload",
  "results": [
    { "success": true, "filename": "...", "originalName": "...", "size": ..., "thumbnail": true },
    { "success": false, "originalName": "...", "error": "..." },
    { "success": true, "filename": "...", "originalName": "...", "size": ..., "thumbnail": true }
  ]
}
```

### Thumbnail Generation

**Pattern**: Synchronous generation for reliability

Thumbnails must be generated **synchronously** (awaited before response is sent) to ensure they exist when the client needs them. This prevents silent failures and broken gallery displays.

```javascript
// Generate thumbnail synchronously
const thumbnailsDir = path.join(userDir, "thumbnails");
fs.mkdirSync(thumbnailsDir, { recursive: true });
const thumbnailPath = path.join(thumbnailsDir, finalName);

let thumbnailGenerated = false;
let thumbnailError = null;

try {
  await sharp(finalPath)
    .rotate(0) // Preserve orientation as uploaded
    .resize(150, 150, { fit: "cover" })
    .toFile(thumbnailPath);

  thumbnailGenerated = true;
  console.log(`✅ Thumbnail generated: ${thumbnailPath}`);
} catch (thumbError) {
  thumbnailError = thumbError.message;
  console.error(`❌ Thumbnail FAILED:`, thumbError);
}

return {
  success: true,
  filename: finalName,
  thumbnail: thumbnailGenerated,
  thumbnailError: thumbnailError,
};
```

**Why Synchronous?**

- Guarantees thumbnail exists before confirming upload success
- Errors immediately visible in response
- Simple to test and debug
- Adds only ~50-200ms per image (acceptable)
  **Thumbnail generation verification** (use `tests/thumbnail-generation.test.js`)

## Related Files

- `server/routes/upload.js` - Upload endpoint implementation
- `tests/thumbnail-generation.test.js` - Thumbnail generation test
- `.squad/decisions/inbox/orion-multi-file-upload.md` - Multi-file upload decision
- `.squad/decisions/inbox/orion-sync-thumbnail-generation.md` - Synchronous thumbnail generation decision
- Gallery breaks when thumbnails are missing
- Complex retry/polling logic needed

**Test Coverage**: See `tests/thumbnail-generation.test.js`

### Deprecated: Async Thumbnail Generation

❌ **Do NOT use this pattern**:

```javascript
// WRONG - async callback is never awaited
setImmediate(async () => {
  await sharp(finalPath).resize(...).toFile(thumbnailPath);
});
```

### File Organization

```
uploads/
  user@example.com/
    1234567890_photo.jpg
    1234567890_photo.jpg.json (metadata)
    thumbnails/
      1234567890_photo.jpg
  tmp/ (temporary upload directory)
```

## Implementation Example

See `server/routes/upload.js` for full implementation:

- Multi-file support with backward compatibility
- Batch processing with partial success handling
- Metadata and thumbnail generation
- Comprehensive error handling

## Production Considerations

- Migrate from local filesystem to object storage (Azure Blob Storage, S3, GCS)
- Add virus scanning before accepting files
- Implement encryption at rest
- Set up automated backups
- Define retention policies
- Monitor storage quota and costs
- Consider CDN for serving uploaded images

## Testing Checklist

- [ ] Single file upload (camera mode)
- [ ] Multiple file upload (2-10 files)
- [ ] File size validation (reject >10MB)
- [ ] File type validation (reject non-images)
- [ ] Missing required fields (name, email, photo)
- [ ] Invalid email format
- [ ] Partial failure scenarios (some files valid, some invalid)
- [ ] Filename collision handling
- [ ] Concurrent uploads from multiple users
- [ ] Thumbnail generation verification

## Related Files

- `server/routes/upload.js` - Upload endpoint implementation
- `.squad/decisions/inbox/orion-multi-file-upload.md` - Multi-file upload decision document

# Tests

Integration and unit tests for Frame It application.

## Available Tests

### Thumbnail Generation Test

**File**: `thumbnail-generation.test.js`  
**Purpose**: Verifies that thumbnails are generated correctly for uploaded images.

This test addresses a recurring issue where thumbnail generation fails after frontend updates. It ensures that:

- Images upload successfully
- Thumbnails are created in the correct directory
- Thumbnails are generated with the correct dimensions (150x150)
- The upload response includes thumbnail generation status

**Prerequisites**:

1. Install test dependencies: `cd server && npm install`
2. Start the server: `cd server && npm start`
3. Run the test: `node tests/thumbnail-generation.test.js`

**Expected Output**:

```
🧪 Starting Thumbnail Generation Test...

Step 1: Generating test image...
✅ Test image generated: /path/to/test-image.jpg

Step 2: Uploading test image...
✅ Upload response: {...}

Step 3: Verifying thumbnail generation...
✅ Thumbnail verified: {timestamp}_test-upload.jpg (XXXX bytes)

✅ All tests passed! Thumbnails are being generated correctly.
```

## Running Tests

```bash
# Install dependencies (first time only)
cd server
npm install

# Start server in one terminal
cd server
npm start

# Run tests in another terminal
node tests/thumbnail-generation.test.js
```

## Adding New Tests

When adding new tests:

1. Create a new `.test.js` file in the `tests/` directory
2. Document the test purpose and prerequisites in this README
3. Follow the existing test structure (setup, execute, verify, cleanup)
4. Export test functions for potential CI/CD integration

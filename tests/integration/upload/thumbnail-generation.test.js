/**
 * Thumbnail Generation Integration Tests
 *
 * PURPOSE: Prevent regression where uploads succeed but thumbnails fail silently
 * PRIORITY: P0 (Critical)
 *
 * RUN: npm test -- thumbnail-generation.test.ts
 *
 * See: tests/test-skeletons/thumbnail-generation.md for detailed test plan
 */

const request = require("supertest");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// TODO: Import your app/server instance
// const app = require('../../server');

describe("Thumbnail Generation", () => {
  const UPLOADS_ROOT = path.join(__dirname, "../../server/uploads");
  const FIXTURES_DIR = path.join(__dirname, "../fixtures/images");

  // Test user
  const testUser = {
    name: "Test User",
    email: "test-thumbnails@example.com",
  };

  const userDir = path.join(UPLOADS_ROOT, testUser.email.toLowerCase());
  const thumbnailsDir = path.join(userDir, "thumbnails");

  /**
   * Helper: Wait for thumbnail file to exist
   * Thumbnails are generated asynchronously 1-3s after upload
   */
  async function waitForThumbnail(thumbnailPath, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (fs.existsSync(thumbnailPath)) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Thumbnail not created within ${timeout}ms: ${thumbnailPath}`);
  }

  /**
   * Helper: Verify thumbnail dimensions using Sharp
   */
  async function verifyThumbnailDimensions(thumbnailPath, expectedWidth = 150, expectedHeight = 150) {
    const metadata = await sharp(thumbnailPath).metadata();
    expect(metadata.width).toBe(expectedWidth);
    expect(metadata.height).toBe(expectedHeight);
    return metadata;
  }

  /**
   * Helper: Extract filename from upload response
   */
  function extractFilename(uploadResponse) {
    // Adjust based on your actual API response structure
    return uploadResponse.body.filename || uploadResponse.body.results[0].filename;
  }

  // Cleanup after each test
  afterEach(() => {
    if (fs.existsSync(userDir)) {
      fs.rmSync(userDir, { recursive: true, force: true });
    }
  });

  describe("Single File Upload", () => {
    test("P0: should generate thumbnail for single valid JPEG upload", async () => {
      // ARRANGE
      const uploadFile = path.join(FIXTURES_DIR, "valid.jpg");

      // ACT
      const response = await request(app)
        .post("/api/upload")
        .field("name", testUser.name)
        .field("email", testUser.email)
        .attach("photo", uploadFile);

      // ASSERT - Upload succeeded
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      const filename = extractFilename(response);
      const sourcePath = path.join(userDir, filename);
      const thumbnailPath = path.join(thumbnailsDir, filename);

      // ASSERT - Source file exists
      expect(fs.existsSync(sourcePath)).toBe(true);

      // ASSERT - Thumbnail created (wait for async generation)
      await waitForThumbnail(thumbnailPath, 3000);
      expect(fs.existsSync(thumbnailPath)).toBe(true);

      // ASSERT - Thumbnail dimensions are 150x150
      await verifyThumbnailDimensions(thumbnailPath, 150, 150);

      // ASSERT - Thumbnail is smaller than source
      const sourceSize = fs.statSync(sourcePath).size;
      const thumbnailSize = fs.statSync(thumbnailPath).size;
      expect(thumbnailSize).toBeLessThan(sourceSize);

      console.log(`✅ Thumbnail generated: ${thumbnailPath} (${thumbnailSize} bytes)`);
    }, 10000); // 10s timeout for upload + thumbnail generation

    test("P0: should generate thumbnail for PNG upload", async () => {
      // ARRANGE
      const uploadFile = path.join(FIXTURES_DIR, "valid.png");

      // ACT
      const response = await request(app)
        .post("/api/upload")
        .field("name", testUser.name)
        .field("email", testUser.email)
        .attach("photo", uploadFile);

      // ASSERT
      expect(response.status).toBe(201);
      const filename = extractFilename(response);
      const thumbnailPath = path.join(thumbnailsDir, filename);

      await waitForThumbnail(thumbnailPath, 3000);
      await verifyThumbnailDimensions(thumbnailPath);
    }, 10000);
  });

  describe("Batch Upload", () => {
    test("P0: should generate thumbnails for all files in batch upload", async () => {
      // ARRANGE
      const files = ["valid.jpg", "valid.png", "square.jpg"];

      // ACT - Upload batch
      const request_builder = request(app).post("/api/upload").field("name", testUser.name).field("email", testUser.email);

      files.forEach((file) => {
        request_builder.attach("photos", path.join(FIXTURES_DIR, file));
      });

      const response = await request_builder;

      // ASSERT - All uploads succeeded
      expect(response.status).toBe(201);
      expect(response.body.uploaded).toBe(files.length);

      // ASSERT - All thumbnails created
      const filenames = response.body.results.map((r) => r.filename);

      for (const filename of filenames) {
        const thumbnailPath = path.join(thumbnailsDir, filename);
        await waitForThumbnail(thumbnailPath, 5000);
        expect(fs.existsSync(thumbnailPath)).toBe(true);
        await verifyThumbnailDimensions(thumbnailPath);
        console.log(`✅ Batch thumbnail ${filename} created`);
      }
    }, 15000); // Longer timeout for batch
  });

  describe("Thumbnail Dimensions and Aspect Ratios", () => {
    test("P0: should crop panorama image to 150x150 square", async () => {
      // ARRANGE - Wide panorama (3000x500)
      const uploadFile = path.join(FIXTURES_DIR, "panorama.jpg");

      // ACT
      const response = await request(app)
        .post("/api/upload")
        .field("name", testUser.name)
        .field("email", testUser.email)
        .attach("photo", uploadFile);

      // ASSERT
      expect(response.status).toBe(201);
      const filename = extractFilename(response);
      const thumbnailPath = path.join(thumbnailsDir, filename);

      await waitForThumbnail(thumbnailPath);
      const metadata = await verifyThumbnailDimensions(thumbnailPath, 150, 150);

      // Verify it's using 'cover' fit (crops to fill square)
      console.log(`✅ Panorama cropped to square: ${metadata.width}x${metadata.height}`);
    }, 10000);

    test("P1: should crop portrait image to 150x150 square", async () => {
      const uploadFile = path.join(FIXTURES_DIR, "portrait.jpg");

      const response = await request(app)
        .post("/api/upload")
        .field("name", testUser.name)
        .field("email", testUser.email)
        .attach("photo", uploadFile);

      expect(response.status).toBe(201);
      const thumbnailPath = path.join(thumbnailsDir, extractFilename(response));

      await waitForThumbnail(thumbnailPath);
      await verifyThumbnailDimensions(thumbnailPath, 150, 150);
    }, 10000);

    test("P1: should handle EXIF rotation correctly", async () => {
      const uploadFile = path.join(FIXTURES_DIR, "rotated-exif.jpg");

      const response = await request(app)
        .post("/api/upload")
        .field("name", testUser.name)
        .field("email", testUser.email)
        .attach("photo", uploadFile);

      expect(response.status).toBe(201);
      const thumbnailPath = path.join(thumbnailsDir, extractFilename(response));

      await waitForThumbnail(thumbnailPath);
      const metadata = await verifyThumbnailDimensions(thumbnailPath);

      // Sharp's rotate(0) should auto-orient based on EXIF
      console.log(`✅ EXIF rotation handled: ${metadata.orientation || "no orientation tag"}`);
    }, 10000);
  });

  describe("Error Handling", () => {
    test("P0: upload should succeed even if thumbnail generation fails", async () => {
      // TODO: Mock Sharp to throw error
      // This test requires mocking/spying on the sharp module
      // For now, this is a placeholder showing the intent

      // ARRANGE - Mock sharp to fail
      // jest.spyOn(sharp.prototype, 'toFile').mockRejectedValueOnce(new Error('Sharp failure'));

      // ACT
      const response = await request(app)
        .post("/api/upload")
        .field("name", testUser.name)
        .field("email", testUser.email)
        .attach("photo", path.join(FIXTURES_DIR, "valid.jpg"));

      // ASSERT - Upload still succeeds
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      // Source file should exist even if thumbnail fails
      const filename = extractFilename(response);
      const sourcePath = path.join(userDir, filename);
      expect(fs.existsSync(sourcePath)).toBe(true);

      console.log("⚠️  Note: Thumbnail failure test requires Sharp mocking");
    }, 10000);
  });

  describe("Non-Blocking Behavior", () => {
    test("P0: upload response should not wait for thumbnail generation", async () => {
      // ARRANGE
      const uploadFile = path.join(FIXTURES_DIR, "large.jpg"); // 9MB file

      // ACT - Measure response time
      const startTime = Date.now();
      const response = await request(app)
        .post("/api/upload")
        .field("name", testUser.name)
        .field("email", testUser.email)
        .attach("photo", uploadFile);
      const responseTime = Date.now() - startTime;

      // ASSERT - Response received quickly (< 2 seconds)
      expect(response.status).toBe(201);
      expect(responseTime).toBeLessThan(2000);
      console.log(`✅ Upload response time: ${responseTime}ms (non-blocking)`);

      // ASSERT - Thumbnail appears AFTER response (1-3 seconds later)
      const filename = extractFilename(response);
      const thumbnailPath = path.join(thumbnailsDir, filename);

      // Thumbnail should NOT exist immediately
      expect(fs.existsSync(thumbnailPath)).toBe(false);

      // But should exist after waiting
      await waitForThumbnail(thumbnailPath, 5000);
      expect(fs.existsSync(thumbnailPath)).toBe(true);

      console.log(`✅ Thumbnail generated asynchronously after response`);
    }, 15000);
  });

  describe("Concurrent Uploads", () => {
    test("P1: should generate thumbnails for concurrent uploads", async () => {
      // ARRANGE - Prepare 5 concurrent uploads
      const promises = [];
      const files = ["valid.jpg", "valid.png", "square.jpg", "panorama.jpg", "portrait.jpg"];

      // ACT - Upload all files concurrently
      for (const file of files) {
        const promise = request(app)
          .post("/api/upload")
          .field("name", testUser.name)
          .field("email", testUser.email)
          .attach("photo", path.join(FIXTURES_DIR, file));
        promises.push(promise);
      }

      const responses = await Promise.all(promises);

      // ASSERT - All uploads succeeded
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });

      // ASSERT - All thumbnails created
      const filenames = responses.map((r) => extractFilename(r));

      for (const filename of filenames) {
        const thumbnailPath = path.join(thumbnailsDir, filename);
        await waitForThumbnail(thumbnailPath, 5000);
        expect(fs.existsSync(thumbnailPath)).toBe(true);
      }

      console.log(`✅ All ${filenames.length} concurrent thumbnails created`);
    }, 20000);
  });

  describe("File Location Verification", () => {
    test("P0: thumbnails should be in correct subdirectory structure", async () => {
      // ACT
      const response = await request(app)
        .post("/api/upload")
        .field("name", testUser.name)
        .field("email", testUser.email)
        .attach("photo", path.join(FIXTURES_DIR, "valid.jpg"));

      // ASSERT
      expect(response.status).toBe(201);
      const filename = extractFilename(response);

      // Verify paths
      const expectedSourcePath = path.join(UPLOADS_ROOT, testUser.email.toLowerCase(), filename);
      const expectedThumbnailPath = path.join(UPLOADS_ROOT, testUser.email.toLowerCase(), "thumbnails", filename);

      expect(fs.existsSync(expectedSourcePath)).toBe(true);

      await waitForThumbnail(expectedThumbnailPath);
      expect(fs.existsSync(expectedThumbnailPath)).toBe(true);

      console.log(`✅ Source: ${expectedSourcePath}`);
      console.log(`✅ Thumbnail: ${expectedThumbnailPath}`);
    }, 10000);
  });
});

/**
 * NOTES FOR IMPLEMENTER:
 *
 * 1. Replace `const app = require('../../server')` with your actual server import
 * 2. Adjust `extractFilename()` to match your API response structure
 * 3. Create fixtures in tests/fixtures/images/:
 *    - valid.jpg, valid.png, square.jpg (2000x2000)
 *    - panorama.jpg (3000x500), portrait.jpg (500x3000)
 *    - large.jpg (9MB), rotated-exif.jpg (with EXIF rotation)
 * 4. For Sharp mocking tests, use jest.spyOn or similar
 * 5. Consider adding retry mechanism tests (requires log capturing)
 * 6. Run these tests on all upload.js changes before merging
 *
 * RUN TESTS:
 *   npm test -- thumbnail-generation.test.ts
 *   npm test -- thumbnail-generation.test.ts --verbose
 */

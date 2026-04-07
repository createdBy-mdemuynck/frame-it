/**
 * Thumbnail Generation Test
 *
 * This test verifies that thumbnails are generated correctly for uploaded images.
 * It addresses the recurring issue where thumbnails fail to generate after frontend updates.
 *
 * Usage:
 *   node tests/thumbnail-generation.test.js
 *
 * Prerequisites:
 *   - Server must be running (npm start from server directory)
 *   - A test image file must exist (we'll use a simple generated image)
 */

const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const axios = require("axios");
const sharp = require("sharp");

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3002";
const TEST_EMAIL = "test.thumbnail@frameit.test";
const TEST_NAME = "Thumbnail Tester";
const UPLOADS_DIR = path.join(__dirname, "..", "server", "uploads");

/**
 * Generate a simple test image using Sharp
 */
async function generateTestImage() {
  const testImagePath = path.join(__dirname, "test-image.jpg");

  // Create a simple 800x600 red rectangle as test image
  await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .jpeg()
    .toFile(testImagePath);

  console.log("✅ Test image generated:", testImagePath);
  return testImagePath;
}

/**
 * Upload test image to server
 */
async function uploadTestImage(imagePath) {
  const form = new FormData();
  form.append("name", TEST_NAME);
  form.append("email", TEST_EMAIL);
  form.append("photo", fs.createReadStream(imagePath), {
    filename: "test-upload.jpg",
    contentType: "image/jpeg",
  });

  try {
    const response = await axios.post(`${SERVER_URL}/upload`, form, {
      headers: form.getHeaders(),
      timeout: 10000, // 10 second timeout
    });

    console.log("✅ Upload response:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error("❌ Upload failed:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
    throw error;
  }
}

/**
 * Verify thumbnail was generated
 */
function verifyThumbnail(uploadResponse) {
  const sanitizedEmail = TEST_EMAIL.toLowerCase().replace(/[^a-zA-Z0-9@.]/g, "_");
  const userDir = path.join(UPLOADS_DIR, sanitizedEmail);
  const thumbnailsDir = path.join(userDir, "thumbnails");

  // Check if at least one file was uploaded successfully
  const successful = uploadResponse.results?.filter((r) => r.success) || [];
  if (successful.length === 0) {
    throw new Error("No files uploaded successfully");
  }

  // Verify each successful upload has a thumbnail
  const errors = [];
  const warnings = [];

  for (const result of successful) {
    const filename = result.filename;
    const thumbnailPath = path.join(thumbnailsDir, filename);

    // Check if thumbnail exists
    if (!fs.existsSync(thumbnailPath)) {
      errors.push(`Thumbnail missing for ${filename}`);
      continue;
    }

    // Check thumbnail file size
    const stats = fs.statSync(thumbnailPath);
    if (stats.size === 0) {
      errors.push(`Thumbnail is empty (0 bytes) for ${filename}`);
      continue;
    }

    // Check if thumbnail generation flag is set in response
    if (result.thumbnail === false) {
      warnings.push(`Thumbnail flag is false for ${filename} but file exists`);
    }

    if (result.thumbnailError) {
      warnings.push(`Thumbnail error reported: ${result.thumbnailError} for ${filename}`);
    }

    console.log(`✅ Thumbnail verified: ${filename} (${stats.size} bytes)`);
  }

  if (errors.length > 0) {
    throw new Error("Thumbnail verification failed:\n" + errors.join("\n"));
  }

  if (warnings.length > 0) {
    console.warn("⚠️ Warnings:\n" + warnings.join("\n"));
  }

  return true;
}

/**
 * Cleanup test files
 */
function cleanup() {
  const testImagePath = path.join(__dirname, "test-image.jpg");
  const sanitizedEmail = TEST_EMAIL.toLowerCase().replace(/[^a-zA-Z0-9@.]/g, "_");
  const userDir = path.join(UPLOADS_DIR, sanitizedEmail);

  // Remove test image
  if (fs.existsSync(testImagePath)) {
    fs.unlinkSync(testImagePath);
    console.log("🗑️ Cleaned up test image");
  }

  // Remove test user directory (optional - comment out to inspect uploads)
  if (fs.existsSync(userDir)) {
    fs.rmSync(userDir, { recursive: true, force: true });
    console.log("🗑️ Cleaned up test uploads");
  }
}

/**
 * Run the test
 */
async function runTest() {
  console.log("🧪 Starting Thumbnail Generation Test...\n");

  let testImagePath;

  try {
    // Step 1: Generate test image
    console.log("Step 1: Generating test image...");
    testImagePath = await generateTestImage();

    // Step 2: Upload test image
    console.log("\nStep 2: Uploading test image...");
    const uploadResponse = await uploadTestImage(testImagePath);

    // Step 3: Verify thumbnail was generated
    console.log("\nStep 3: Verifying thumbnail generation...");
    verifyThumbnail(uploadResponse);

    console.log("\n✅ All tests passed! Thumbnails are being generated correctly.\n");

    // Cleanup
    cleanup();

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);

    // Still cleanup even on failure
    try {
      cleanup();
    } catch (cleanupError) {
      console.error("Warning: Cleanup failed:", cleanupError.message);
    }

    process.exit(1);
  }
}

// Run test if executed directly
if (require.main === module) {
  runTest();
}

module.exports = { runTest, generateTestImage, uploadTestImage, verifyThumbnail };

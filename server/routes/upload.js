const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");

const router = express.Router();

module.exports = (uploadsRoot) => {
  // Temporary local storage (uploads/tmp)
  const tmpDir = path.join(uploadsRoot, "tmp");
  fs.mkdirSync(tmpDir, { recursive: true });

  const upload = multer({
    dest: tmpDir,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
    fileFilter: (req, file, cb) => {
      if (!file.mimetype || !file.mimetype.startsWith("image/")) {
        return cb(new Error("INVALID_FILE_TYPE"));
      }
      cb(null, true);
    },
  });

  /**
   * Process a single file upload
   * @param {Object} file - Multer file object
   * @param {string} name - User name
   * @param {string} email - User email
   * @param {string} userDir - Destination directory
   * @returns {Object} Result object with success status and details
   */
  const processSingleFile = async (file, name, email, userDir) => {
    const safeName = (file.originalname || "upload").replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const timestamp = Date.now() + Math.floor(Math.random() * 1000); // Add random to avoid collisions in batch
    const finalName = `${timestamp}_${safeName}`;
    const finalPath = path.join(userDir, finalName);

    try {
      // Move file to per-email folder
      try {
        fs.renameSync(file.path, finalPath);
        console.log(`✅ File moved successfully to ${finalPath}`);
      } catch (renameError) {
        console.error(`❌ Rename failed:`, renameError);
        // Try copy + delete as fallback (works across mount points)
        fs.copyFileSync(file.path, finalPath);
        fs.unlinkSync(file.path);
        console.log(`✅ File copied (fallback) to ${finalPath}`);
      }

      // Save metadata
      const metadataPath = path.join(userDir, `${timestamp}_${safeName}.json`);
      const metadata = {
        name,
        email,
        uploadedAt: new Date().toISOString(),
        filename: finalName,
      };
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      // Generate thumbnail SYNCHRONOUSLY - wait for it before responding
      const thumbnailsDir = path.join(userDir, "thumbnails");
      fs.mkdirSync(thumbnailsDir, { recursive: true });
      const thumbnailPath = path.join(thumbnailsDir, finalName);

      let thumbnailGenerated = false;
      let thumbnailError = null;

      try {
        console.log(`📸 Generating thumbnail for ${finalPath}`);
        await sharp(finalPath)
          .rotate(0) // Preserve orientation as uploaded
          .resize(150, 150, { fit: "cover" })
          .toFile(thumbnailPath);

        thumbnailGenerated = true;
        console.log(`✅ Thumbnail generated: ${thumbnailPath}`);
      } catch (thumbError) {
        thumbnailError = thumbError.message;
        console.error(`❌ Thumbnail generation FAILED for ${finalPath}:`, thumbError.message);
      }

      return {
        success: true,
        filename: finalName,
        originalName: file.originalname,
        size: file.size,
        thumbnail: thumbnailGenerated,
        thumbnailError: thumbnailError,
      };
    } catch (error) {
      // Clean up temp file if it still exists
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      console.error(`❌ Error processing file ${file.originalname}:`, error);
      return {
        success: false,
        originalName: file.originalname,
        error: error.message || "Failed to process file",
      };
    }
  };

  const uploadHandler = async (req, res) => {
    try {
      const { name, email } = req.body || {};

      // Validate presence of fields
      if (!name || !email) {
        // Clean up any uploaded files
        const files = req.files || (req.file ? [req.file] : []);
        files.forEach((file) => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
        return res.status(400).json({
          success: false,
          error: "Missing required fields: name and email",
        });
      }

      // Support both single file (req.file) and multiple files (req.files)
      const files = req.files || (req.file ? [req.file] : []);

      if (files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Missing required file: photo",
        });
      }

      // Basic email validation
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!emailValid) {
        // Clean up uploaded files
        files.forEach((file) => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
        return res.status(400).json({
          success: false,
          error: "Invalid email address",
        });
      }

      // Prepare user directory
      const sanitizedEmail = email.toLowerCase().replace(/[^a-zA-Z0-9@.]/g, "_");
      const userDir = path.join(uploadsRoot, sanitizedEmail);
      fs.mkdirSync(userDir, { recursive: true });

      console.log(`📁 Processing ${files.length} file(s) for ${email}`);

      // Process all files
      const results = await Promise.all(files.map((file) => processSingleFile(file, name, email, userDir)));

      // Separate successful and failed uploads
      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      // Determine overall response
      if (successful.length === 0) {
        // All files failed
        return res.status(500).json({
          success: false,
          error: "All files failed to upload",
          results,
        });
      }

      // At least some files succeeded
      const response = {
        success: true,
        message: `${successful.length} file(s) uploaded successfully`,
        uploaded: successful.length,
        failed: failed.length,
        results,
      };

      // Return partial success status if some files failed
      if (failed.length > 0) {
        response.warning = `${failed.length} file(s) failed to upload`;
      }

      res.json(response);
    } catch (error) {
      console.error("Error handling upload:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  };

  // Upload endpoints - support both single and multiple files (up to 10)
  router.post("/upload", upload.array("photo", 10), uploadHandler);
  router.post("/api/upload", upload.array("photo", 10), uploadHandler);

  // List all email folders OR thumbnails for a specific email
  router.get("/uploads/:email?", (req, res) => {
    const { email } = req.params;

    if (!email) {
      // List all email folders in the uploads directory
      try {
        const folders = fs
          .readdirSync(uploadsRoot, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory() && dirent.name !== "tmp")
          .map((dirent) => dirent.name);

        res.render("email-folders", { folders });
      } catch (error) {
        console.error("Error listing email folders:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
      }
    } else {
      // Sanitize email to match folder naming convention
      const sanitizedEmail = email.toLowerCase().replace(/[^a-zA-Z0-9@.]/g, "_");
      const userDir = path.join(uploadsRoot, sanitizedEmail);
      const thumbnailsDir = path.join(userDir, "thumbnails");

      try {
        if (!fs.existsSync(userDir)) {
          return res.status(404).json({ success: false, error: "User folder not found" });
        }

        if (!fs.existsSync(thumbnailsDir)) {
          return res.status(404).json({ success: false, error: "No thumbnails found for this user" });
        }

        // List all thumbnails in the user's thumbnails folder
        const thumbnails = fs.readdirSync(thumbnailsDir);

        res.render("thumbnails", { email: sanitizedEmail, thumbnails });
      } catch (error) {
        console.error("Error fetching thumbnails:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
      }
    }
  });

  return router;
};

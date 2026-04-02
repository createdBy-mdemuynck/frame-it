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
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      if (!file.mimetype || !file.mimetype.startsWith("image/")) {
        return cb(new Error("INVALID_FILE_TYPE"));
      }
      cb(null, true);
    },
  });

  const uploadHandler = async (req, res) => {
    try {
      const { name, email } = req.body || {};
      
      // Validate presence of fields
      if (!name || !email) {
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ 
          success: false, 
          error: "Missing required fields: name and email" 
        });
      }
      
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          error: "Missing required file: photo" 
        });
      }

      // Basic email validation
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!emailValid) {
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ 
          success: false, 
          error: "Invalid email address" 
        });
      }

      // Move file to per-email folder
      const sanitizedEmail = email.toLowerCase().replace(/[^a-zA-Z0-9@.]/g, "_");
      const userDir = path.join(uploadsRoot, sanitizedEmail);
      fs.mkdirSync(userDir, { recursive: true });

      const safeName = (req.file.originalname || "upload").replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const timestamp = Date.now();
      const finalName = `${timestamp}_${safeName}`;
      const finalPath = path.join(userDir, finalName);

      console.log(`📁 Upload paths:
        - Temp file: ${req.file.path}
        - Temp exists: ${fs.existsSync(req.file.path)}
        - Final path: ${finalPath}
        - User dir: ${userDir}`);

      // Rename the file
      try {
        fs.renameSync(req.file.path, finalPath);
        console.log(`✅ File moved successfully to ${finalPath}`);
      } catch (renameError) {
        console.error(`❌ Rename failed:`, renameError);
        // Try copy + delete as fallback (works across mount points)
        fs.copyFileSync(req.file.path, finalPath);
        fs.unlinkSync(req.file.path);
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

      // Respond immediately to the user
      res.json({ 
        success: true, 
        message: "File uploaded successfully", 
        file: finalName 
      });

      // Generate thumbnail asynchronously in background
      const thumbnailsDir = path.join(userDir, "thumbnails");
      fs.mkdirSync(thumbnailsDir, { recursive: true });
      const thumbnailPath = path.join(thumbnailsDir, finalName);

      // Use setImmediate to ensure this runs after response is sent
      setImmediate(async () => {
        try {
          // Give filesystem extra time to sync after volume mount
          await new Promise((resolve) => setTimeout(resolve, 500));

          console.log(`📸 Background: Processing thumbnail for ${finalPath}`);

          await sharp(finalPath)
            .resize(150, 150, { fit: "cover" })
            .toFile(thumbnailPath);

          console.log(`✅ Background: Thumbnail generated ${thumbnailPath}`);
        } catch (thumbError) {
          console.error(`❌ Background: Thumbnail generation failed for ${finalPath}:`, thumbError.message);
          
          // Try again after a longer delay
          setTimeout(async () => {
            try {
              await sharp(finalPath)
                .resize(150, 150, { fit: "cover" })
                .toFile(thumbnailPath);
              console.log(`✅ Background retry: Thumbnail generated ${thumbnailPath}`);
            } catch (retryError) {
              console.error(`❌ Background retry also failed for ${finalPath}:`, retryError.message);
            }
          }, 2000);
        }
      });
    } catch (error) {
      console.error("Error handling upload:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  };

  // Upload endpoints
  router.post("/upload", upload.single("photo"), uploadHandler);
  router.post("/api/upload", upload.single("photo"), uploadHandler);

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

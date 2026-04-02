const express = require("express");
const fs = require("fs");
const path = require("path");
const { readFileSync, existsSync } = require("fs");
const { requireSuperAdmin } = require("../middleware/auth");

const router = express.Router();

function loadStars(uploadsRoot) {
  const starsFile = path.join(uploadsRoot, ".stars.json");
  if (!existsSync(starsFile)) return {};
  try {
    return JSON.parse(readFileSync(starsFile, "utf8"));
  } catch {
    return {};
  }
}

function saveStars(uploadsRoot, stars) {
  const starsFile = path.join(uploadsRoot, ".stars.json");
  fs.writeFileSync(starsFile, JSON.stringify(stars, null, 2));
}

module.exports = (uploadsRoot) => {
  // Admin Login API
  router.post("/admin/login", (req, res) => {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: "Valid email is required" });
    }
    req.session.adminEmail = email;
    res.json({ success: true, email });
  });

  router.get("/admin/session", (req, res) => {
    if (req.session.adminEmail) {
      return res.json({ loggedIn: true, email: req.session.adminEmail });
    }
    res.json({ loggedIn: false });
  });

  router.post("/admin/logout", (req, res) => {
    req.session.destroy();
    res.json({ success: true });
  });

  // Gallery API - Get all photos with metadata
  router.get("/gallery", (req, res) => {
    try {
      const photos = [];
      const stars = loadStars(uploadsRoot);
      const folders = fs
        .readdirSync(uploadsRoot, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory() && dirent.name !== "tmp");

      folders.forEach((folder) => {
        const userDir = path.join(uploadsRoot, folder.name);
        const files = fs
          .readdirSync(userDir, { withFileTypes: true })
          .filter((file) => file.isFile() && !file.name.endsWith(".json") && !file.name.startsWith("."));

        files.forEach((file) => {
          const photoPath = `/uploads/${folder.name}/${file.name}`;
          const thumbnailPath = `/uploads/${folder.name}/thumbnails/${file.name}`;
          const metadataPath = path.join(userDir, `${file.name}.json`);

          let metadata = {};
          if (fs.existsSync(metadataPath)) {
            try {
              metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
            } catch (err) {
              console.error(`Error reading metadata for ${file.name}:`, err);
            }
          }

          const starData = stars[photoPath] || { count: 0, starredBy: [] };
          const starred = req.session.adminEmail ? starData.starredBy.includes(req.session.adminEmail) : false;

          photos.push({
            photoPath,
            thumbnailPath,
            metadata,
            email: folder.name,
            starCount: starData.count,
            starred,
          });
        });
      });

      res.json({ success: true, photos });
    } catch (error) {
      console.error("Error fetching gallery:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  // Star/Unstar API (JSON responses for SPA)
  router.post("/admin/star", (req, res) => {
    if (!req.session.adminEmail) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { photoPath } = req.body;
    if (!photoPath) {
      return res.status(400).json({ success: false, error: "Missing photoPath" });
    }

    const userId = req.session.adminEmail;
    const stars = loadStars(uploadsRoot);

    if (!stars[photoPath]) {
      stars[photoPath] = { count: 0, starredBy: [] };
    }

    if (!stars[photoPath].starredBy.includes(userId)) {
      stars[photoPath].starredBy.push(userId);
      stars[photoPath].count++;
      saveStars(uploadsRoot, stars);
    }

    res.json({ success: true, count: stars[photoPath].count, starred: true });
  });

  router.post("/admin/unstar", (req, res) => {
    if (!req.session.adminEmail) {
      return res.status(401).json({ success: false, error: "Not authenticated" });
    }

    const { photoPath } = req.body;
    if (!photoPath) {
      return res.status(400).json({ success: false, error: "Missing photoPath" });
    }

    const userId = req.session.adminEmail;
    const stars = loadStars(uploadsRoot);

    if (stars[photoPath] && stars[photoPath].starredBy.includes(userId)) {
      stars[photoPath].starredBy = stars[photoPath].starredBy.filter((id) => id !== userId);
      stars[photoPath].count = Math.max(0, stars[photoPath].count - 1);
      saveStars(uploadsRoot, stars);
    }

    const count = stars[photoPath] ? stars[photoPath].count : 0;
    res.json({ success: true, count, starred: false });
  });

  // Leaderboard API - Get photos sorted by star count
  router.get("/leaderboard", (req, res) => {
    try {
      const stars = loadStars(uploadsRoot);
      const photos = [];

      const folders = fs
        .readdirSync(uploadsRoot, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory() && dirent.name !== "tmp");

      folders.forEach((folder) => {
        const userDir = path.join(uploadsRoot, folder.name);
        const files = fs
          .readdirSync(userDir, { withFileTypes: true })
          .filter((file) => file.isFile() && !file.name.endsWith(".json") && !file.name.startsWith("."));

        files.forEach((file) => {
          const photoPath = `/uploads/${folder.name}/${file.name}`;
          const starCount = stars[photoPath] ? stars[photoPath].count : 0;

          // Only include photos with at least one star
          if (starCount > 0) {
            const metadataPath = path.join(userDir, `${file.name}.json`);
            let metadata = {};
            if (fs.existsSync(metadataPath)) {
              try {
                metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
              } catch (err) {
                console.error(`Error reading metadata for ${file.name}:`, err);
              }
            }

            photos.push({
              photoPath,
              starCount,
              metadata,
              email: folder.name,
            });
          }
        });
      });

      // Sort by star count (descending)
      photos.sort((a, b) => b.starCount - a.starCount);

      res.json({ success: true, photos });
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  // Delete a single photo (super admin only)
  router.delete("/admin/photo", requireSuperAdmin, (req, res) => {
    try {
      const { photoPath } = req.body;
      
      if (!photoPath) {
        return res.status(400).json({ success: false, error: "Missing photoPath" });
      }

      // Parse the photo path to get file system path
      // photoPath format: /uploads/email/filename.ext
      const pathParts = photoPath.split('/').filter(p => p);
      if (pathParts.length < 3 || pathParts[0] !== 'uploads') {
        return res.status(400).json({ success: false, error: "Invalid photoPath format" });
      }

      const email = pathParts[1];
      const filename = pathParts.slice(2).join('/');
      
      const userDir = path.join(uploadsRoot, email);
      const photoFilePath = path.join(userDir, filename);
      const thumbnailPath = path.join(userDir, 'thumbnails', filename);
      const metadataPath = path.join(userDir, `${filename}.json`);

      let deletedFiles = [];

      // Delete main photo
      if (fs.existsSync(photoFilePath)) {
        fs.unlinkSync(photoFilePath);
        deletedFiles.push('photo');
      }

      // Delete thumbnail
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
        deletedFiles.push('thumbnail');
      }

      // Delete metadata
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
        deletedFiles.push('metadata');
      }

      // Remove from stars
      const stars = loadStars(uploadsRoot);
      if (stars[photoPath]) {
        delete stars[photoPath];
        saveStars(uploadsRoot, stars);
        deletedFiles.push('star data');
      }

      console.log(`✅ Deleted photo: ${photoPath} (${deletedFiles.join(', ')})`);

      res.json({ 
        success: true, 
        message: `Photo deleted successfully`,
        deletedFiles 
      });
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ success: false, error: "Failed to delete photo" });
    }
  });

  // Delete all data (super admin only)
  router.delete("/admin/all-data", requireSuperAdmin, (req, res) => {
    try {
      let deletedCount = 0;
      let deletedFolders = 0;

      // Get all user folders
      const folders = fs
        .readdirSync(uploadsRoot, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory() && dirent.name !== "tmp");

      // Delete each user folder
      folders.forEach((folder) => {
        const userDir = path.join(uploadsRoot, folder.name);
        
        // Count files before deleting
        const files = fs.readdirSync(userDir, { withFileTypes: true });
        deletedCount += files.length;
        
        // Delete the entire folder
        fs.rmSync(userDir, { recursive: true, force: true });
        deletedFolders++;
        
        console.log(`✅ Deleted folder: ${folder.name}`);
      });

      // Delete stars file
      const starsFile = path.join(uploadsRoot, ".stars.json");
      if (fs.existsSync(starsFile)) {
        fs.unlinkSync(starsFile);
        console.log(`✅ Deleted stars data`);
      }

      console.log(`🗑️  All data deleted: ${deletedFolders} folders, ~${deletedCount} files`);

      res.json({ 
        success: true, 
        message: `All data deleted successfully`,
        deletedFolders,
        deletedFiles: deletedCount
      });
    } catch (error) {
      console.error("Error deleting all data:", error);
      res.status(500).json({ success: false, error: "Failed to delete all data" });
    }
  });

  return router;
};

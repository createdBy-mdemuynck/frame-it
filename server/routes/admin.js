const express = require("express");
const { readFileSync, writeFileSync, existsSync, readdirSync } = require("fs");
const path = require("path");

const router = express.Router();

// Star data is stored in server/uploads/.stars.json
function getStarsFilePath(uploadsRoot) {
  return path.join(uploadsRoot, ".stars.json");
}

function loadStars(uploadsRoot) {
  const starsFile = getStarsFilePath(uploadsRoot);
  if (!existsSync(starsFile)) return {};
  try {
    return JSON.parse(readFileSync(starsFile, "utf8"));
  } catch {
    return {};
  }
}

function saveStars(uploadsRoot, stars) {
  const starsFile = getStarsFilePath(uploadsRoot);
  writeFileSync(starsFile, JSON.stringify(stars, null, 2));
}

// Middleware to check authentication
function requireAuth(req, res, next) {
  if (!req.session.adminEmail) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
  next();
}

module.exports = (uploadsRoot) => {
  // POST /admin/star (form: photoPath, userId) — star a photo
  router.post("/star", express.urlencoded({ extended: true }), (req, res) => {
    const { photoPath, userId } = req.body || {};
    if (!photoPath || !userId) {
      return res.send(`<p>Error: Missing photoPath or userId</p>`);
    }

    const stars = loadStars(uploadsRoot);
    if (!stars[photoPath]) {
      stars[photoPath] = { count: 0, starredBy: [] };
    }

    if (!stars[photoPath].starredBy.includes(userId)) {
      stars[photoPath].starredBy.push(userId);
      stars[photoPath].count++;
      saveStars(uploadsRoot, stars);
    }

    res.send(`<p>Photo starred! Current stars: ${stars[photoPath].count}</p><a href="/admin/star-panel">Back</a>`);
  });

  // POST /admin/unstar (form: photoPath, userId) — unstar a photo
  router.post("/unstar", express.urlencoded({ extended: true }), (req, res) => {
    const { photoPath, userId } = req.body || {};
    if (!photoPath || !userId) {
      return res.send(`<p>Error: Missing photoPath or userId</p>`);
    }

    const stars = loadStars(uploadsRoot);
    if (stars[photoPath] && stars[photoPath].starredBy.includes(userId)) {
      stars[photoPath].starredBy = stars[photoPath].starredBy.filter((id) => id !== userId);
      stars[photoPath].count = Math.max(0, stars[photoPath].count - 1);
      saveStars(uploadsRoot, stars);
    }

    res.send(
      `<p>Photo unstarred! Current stars: ${stars[photoPath] ? stars[photoPath].count : 0}</p><a href="/admin/star-panel">Back</a>`,
    );
  });

  // GET /admin/star-count?photoPath=... — get star count for a photo (HTML)
  router.get("/star-count", (req, res) => {
    const { photoPath } = req.query;
    if (!photoPath) {
      return res.send(`<p>Error: Missing photoPath</p>`);
    }

    const stars = loadStars(uploadsRoot);
    res.send(`<p>Stars for ${photoPath}: ${stars[photoPath] ? stars[photoPath].count : 0}</p><a href="/admin/star-panel">Back</a>`);
  });

  // GET /admin/most-starred — get the most-starred photo (HTML)
  router.get("/most-starred", (req, res) => {
    const stars = loadStars(uploadsRoot);
    let max = 0,
      most = null;

    for (const [photoPath, data] of Object.entries(stars)) {
      if (data.count > max) {
        max = data.count;
        most = { photoPath, count: data.count };
      }
    }

    if (!most) {
      return res.send(`<p>No stars yet.</p><a href="/admin/star-panel">Back</a>`);
    }

    res.send(
      `<p>Most-starred photo: ${most.photoPath} (${most.count} stars)</p><img src="${most.photoPath}" style="max-width:300px;"><br><a href="/admin/star-panel">Back</a>`,
    );
  });

  // GET /admin/star-counts — get all star counts (HTML table)
  router.get("/star-counts", (req, res) => {
    const stars = loadStars(uploadsRoot);
    const rows = Object.entries(stars)
      .map(([photoPath, data]) => `<tr><td>${photoPath}</td><td>${data.count}</td></tr>`)
      .join("");

    res.send(`<table border="1"><tr><th>Photo</th><th>Stars</th></tr>${rows}</table><a href="/admin/star-panel">Back</a>`);
  });

  // GET /admin/star-panel — admin UI for starring/un-starring
  router.get("/star-panel", (req, res) => {
    const fs = require("fs");

    // List all photos (flatten all user folders)
    let photos = [];
    readdirSync(uploadsRoot, { withFileTypes: true }).forEach((dirent) => {
      if (dirent.isDirectory() && dirent.name !== "tmp") {
        const userDir = path.join(uploadsRoot, dirent.name);
        readdirSync(userDir, { withFileTypes: true }).forEach((file) => {
          if (file.isFile() && !file.name.endsWith(".json")) {
            const photoPath = `/uploads/${dirent.name}/${file.name}`;
            photos.push(photoPath);
          }
        });
      }
    });

    const stars = loadStars(uploadsRoot);
    const photosWithStars = photos.map((photoPath) => ({
      photoPath,
      starCount: stars[photoPath]?.count || 0,
    }));

    res.render("star-panel", { photos: photosWithStars });
  });

  return router;
};

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const app = express();
const PORT = process.env.PORT || 3000;
const sharp = require("sharp"); // Added for thumbnail generation

app.use(express.json());

// Ensure uploads root exists and serve statically at /uploads
const uploadsRoot = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsRoot, { recursive: true });
app.use("/uploads", express.static(uploadsRoot));

// Temporary local storage (uploads/tmp). Multer enforces 5MB limit and image-only file types.
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

app.get("/health", (req, res) => res.json({ status: "ok" }));

const uploadHandler = (req, res) => {
  try {
    const { name, email } = req.body || {};
    // Validate presence of fields
    if (!name || !email) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: "Missing required fields: name and email" });
    }
    if (!req.file) return res.status(400).json({ success: false, error: "Missing required file: photo" });

    // Basic email validation
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValid) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: "Invalid email address" });
    }

    // Move file to per-email folder
    const sanitizedEmail = email.toLowerCase().replace(/[^a-zA-Z0-9@.]/g, "_");
    const userDir = path.join(uploadsRoot, sanitizedEmail);
    fs.mkdirSync(userDir, { recursive: true });

    const safeName = (req.file.originalname || "upload").replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const timestamp = Date.now();
    const finalName = `${timestamp}_${safeName}`;
    const finalPath = path.join(userDir, finalName);

    fs.renameSync(req.file.path, finalPath);

    // Generate thumbnail
    const thumbnailsDir = path.join(userDir, "thumbnails");
    fs.mkdirSync(thumbnailsDir, { recursive: true });
    const thumbnailPath = path.join(thumbnailsDir, finalName);

    sharp(finalPath)
      .resize(150, 150) // Resize to 150x150 pixels
      .toFile(thumbnailPath)
      .then(() => {
        console.log(`Thumbnail generated: ${thumbnailPath}`);
      })
      .catch((err) => {
        console.error("Error generating thumbnail:", err);
      });

    return res.json({ success: true, message: "File uploaded and thumbnail generated", file: finalName });
  } catch (error) {
    console.error("Error handling upload:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

app.post("/upload", upload.single("photo"), uploadHandler);
app.post("/api/upload", upload.single("photo"), uploadHandler);

// Updated route to display thumbnails as images
app.get("/uploads/:email?", (req, res) => {
  const { email } = req.params;

  if (!email) {
    // List all email folders in the uploads directory
    try {
      const folders = fs
        .readdirSync(uploadsRoot, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory() && dirent.name !== "tmp")
        .map((dirent) => dirent.name);

      // Generate HTML response with links
      const html = `
        <html>
          <head><title>Available Email Folders</title></head>
          <body>
            <h1>Available Email Folders</h1>
            <ul>
              ${folders.map((folder) => `<li><a href="/uploads/${folder}">${folder}</a></li>`).join("")}
            </ul>
          </body>
        </html>
      `;

      return res.send(html);
    } catch (error) {
      console.error("Error listing email folders:", error);
      return res.status(500).json({ success: false, error: "Internal server error" });
    }
  }

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

    // Generate HTML response with thumbnails
    const html = `
      <html>
        <head><title>Thumbnails for ${sanitizedEmail}</title></head>
        <body>
          <h1>Thumbnails for ${sanitizedEmail}</h1>
          <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            ${thumbnails
              .map(
                (file) => `
              <div>
                <a href="/uploads/${sanitizedEmail}/${file}" target="_blank">
                  <img src="/uploads/${sanitizedEmail}/thumbnails/${file}" alt="${file}" style="width: 150px; height: 150px; object-fit: cover;" />
                </a>
              </div>
            `,
              )
              .join("")}
          </div>
        </body>
      </html>
    `;

    return res.send(html);
  } catch (error) {
    console.error("Error fetching thumbnails:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));

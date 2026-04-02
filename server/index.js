const express = require("express");
const { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } = require("fs");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const app = express();
const PORT = process.env.PORT || 3001; // Changed default from 3000 to 3001
const sharp = require("sharp"); // Added for thumbnail generation
const cors = require("cors");
const session = require("express-session");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware for admin authentication
app.use(
  session({
    secret: process.env.SESSION_SECRET || "frame-it-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  }),
);

// Update CORS policy to be protocol-independent
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      try {
        const u = new URL(origin);
        // Allow origins containing localhost or frame-it
        if (u.hostname.includes("localhost") || u.hostname.includes("frame-it")) return callback(null, true);
      } catch (err) {
        // fall through to reject
      }
      return callback(new Error(`${origin} Not allowed by CORS`));
    },
    credentials: true, // Allow cookies/sessions
  }),
);

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

const uploadHandler = async (req, res) => {
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
    res.json({ success: true, message: "File uploaded successfully", file: finalName });

    // Generate thumbnail asynchronously in background (don't await, don't block response)
    const thumbnailsDir = path.join(userDir, "thumbnails");
    fs.mkdirSync(thumbnailsDir, { recursive: true });
    const thumbnailPath = path.join(thumbnailsDir, finalName);

    // Use setImmediate to ensure this runs after response is sent
    setImmediate(async () => {
      try {
        // Give filesystem extra time to sync after volume mount
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log(`📸 Background: Processing thumbnail for ${finalPath}`);
        
        await sharp(finalPath)
          .resize(150, 150, { fit: 'cover' })
          .toFile(thumbnailPath);
        
        console.log(`✅ Background: Thumbnail generated ${thumbnailPath}`);
      } catch (thumbError) {
        console.error(`❌ Background: Thumbnail generation failed for ${finalPath}:`, thumbError.message);
        // Try again after a longer delay
        setTimeout(async () => {
          try {
            await sharp(finalPath)
              .resize(150, 150, { fit: 'cover' })
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

// --- Admin Star Feature API (HTML responses) ---
// Star data is stored in server/uploads/.stars.json as a map: { photoPath: { count, starredBy: [userId] } }
const starsFile = path.join(uploadsRoot, ".stars.json");
function loadStars() {
  if (!existsSync(starsFile)) return {};
  try {
    return JSON.parse(readFileSync(starsFile, "utf8"));
  } catch {
    return {};
  }
}
function saveStars(stars) {
  writeFileSync(starsFile, JSON.stringify(stars, null, 2));
}

// POST /admin/star (form: photoPath, userId) — star a photo
app.post("/admin/star", express.urlencoded({ extended: true }), (req, res) => {
  const { photoPath, userId } = req.body || {};
  if (!photoPath || !userId) return res.send(`<p>Error: Missing photoPath or userId</p>`);
  const stars = loadStars();
  if (!stars[photoPath]) stars[photoPath] = { count: 0, starredBy: [] };
  if (!stars[photoPath].starredBy.includes(userId)) {
    stars[photoPath].starredBy.push(userId);
    stars[photoPath].count++;
    saveStars(stars);
  }
  res.send(`<p>Photo starred! Current stars: ${stars[photoPath].count}</p><a href=\"/admin/star-panel\">Back</a>`);
});

// POST /admin/unstar (form: photoPath, userId) — unstar a photo
app.post("/admin/unstar", express.urlencoded({ extended: true }), (req, res) => {
  const { photoPath, userId } = req.body || {};
  if (!photoPath || !userId) return res.send(`<p>Error: Missing photoPath or userId</p>`);
  const stars = loadStars();
  if (stars[photoPath] && stars[photoPath].starredBy.includes(userId)) {
    stars[photoPath].starredBy = stars[photoPath].starredBy.filter((id) => id !== userId);
    stars[photoPath].count = Math.max(0, stars[photoPath].count - 1);
    saveStars(stars);
  }
  res.send(
    `<p>Photo unstarred! Current stars: ${stars[photoPath] ? stars[photoPath].count : 0}</p><a href=\"/admin/star-panel\">Back</a>`,
  );
});

// GET /admin/star-count?photoPath=... — get star count for a photo (HTML)
app.get("/admin/star-count", (req, res) => {
  const { photoPath } = req.query;
  if (!photoPath) return res.send(`<p>Error: Missing photoPath</p>`);
  const stars = loadStars();
  res.send(`<p>Stars for ${photoPath}: ${stars[photoPath] ? stars[photoPath].count : 0}</p><a href=\"/admin/star-panel\">Back</a>`);
});

// GET /admin/most-starred — get the most-starred photo (HTML)
app.get("/admin/most-starred", (req, res) => {
  const stars = loadStars();
  let max = 0,
    most = null;
  for (const [photoPath, data] of Object.entries(stars)) {
    if (data.count > max) {
      max = data.count;
      most = { photoPath, count: data.count };
    }
  }
  if (!most) return res.send(`<p>No stars yet.</p><a href=\"/admin/star-panel\">Back</a>`);
  res.send(
    `<p>Most-starred photo: ${most.photoPath} (${most.count} stars)</p><img src=\"${most.photoPath}\" style=\"max-width:300px;\"><br><a href=\"/admin/star-panel\">Back</a>`,
  );
});

// GET /admin/star-counts — get all star counts (HTML table)
app.get("/admin/star-counts", (req, res) => {
  const stars = loadStars();
  const rows = Object.entries(stars)
    .map(([photoPath, data]) => `<tr><td>${photoPath}</td><td>${data.count}</td></tr>`)
    .join("");
  res.send(`<table border=\"1\"><tr><th>Photo</th><th>Stars</th></tr>${rows}</table><a href=\"/admin/star-panel\">Back</a>`);
});

// GET /admin/star-panel — admin UI for starring/un-starring
app.get("/admin/star-panel", (req, res) => {
  // List all photos (flatten all user folders)
  let photos = [];
  readdirSync(uploadsRoot, { withFileTypes: true }).forEach((dirent) => {
    if (dirent.isDirectory() && dirent.name !== "tmp") {
      const userDir = path.join(uploadsRoot, dirent.name);
      readdirSync(userDir, { withFileTypes: true }).forEach((file) => {
        if (file.isFile() && !file.name.endsWith(".json")) {
          photos.push(`/uploads/${dirent.name}/${file.name}`);
        }
      });
    }
  });
  const stars = loadStars();
  const rows = photos
    .map(
      (photoPath) =>
        `<tr><td><img src=\"${photoPath}\" style=\"max-width:100px;\"></td><td>${stars[photoPath]?.count || 0}</td><td><form method=\"POST\" action=\"/admin/star\"><input type=\"hidden\" name=\"photoPath\" value=\"${photoPath}\"><input type=\"text\" name=\"userId\" placeholder=\"User ID\"><button type=\"submit\">Star</button></form></td><td><form method=\"POST\" action=\"/admin/unstar\"><input type=\"hidden\" name=\"photoPath\" value=\"${photoPath}\"><input type=\"text\" name=\"userId\" placeholder=\"User ID\"><button type=\"submit\">Unstar</button></form></td></tr>`,
    )
    .join("");
  res.send(
    `<h1>Admin Star Panel</h1><table border=\"1\"><tr><th>Photo</th><th>Stars</th><th>Star</th><th>Unstar</th></tr>${rows}</table><br><a href=\"/admin/most-starred\">Most Starred</a> | <a href=\"/admin/star-counts\">All Star Counts</a>`,
  );
});
// --- End Admin Star Feature API (HTML responses) ---

// Admin Login API
app.post("/api/admin/login", (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: "Valid email is required" });
  }
  req.session.adminEmail = email;
  res.json({ success: true, email });
});

app.get("/api/admin/session", (req, res) => {
  if (req.session.adminEmail) {
    return res.json({ loggedIn: true, email: req.session.adminEmail });
  }
  res.json({ loggedIn: false });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Gallery API - Get all photos with metadata
app.get("/api/gallery", (req, res) => {
  try {
    const photos = [];
    const stars = loadStars();
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
app.post("/api/admin/star", (req, res) => {
  if (!req.session.adminEmail) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  const { photoPath } = req.body;
  if (!photoPath) {
    return res.status(400).json({ success: false, error: "Missing photoPath" });
  }

  const userId = req.session.adminEmail;
  const stars = loadStars();

  if (!stars[photoPath]) {
    stars[photoPath] = { count: 0, starredBy: [] };
  }

  if (!stars[photoPath].starredBy.includes(userId)) {
    stars[photoPath].starredBy.push(userId);
    stars[photoPath].count++;
    saveStars(stars);
  }

  res.json({ success: true, count: stars[photoPath].count, starred: true });
});

app.post("/api/admin/unstar", (req, res) => {
  if (!req.session.adminEmail) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }

  const { photoPath } = req.body;
  if (!photoPath) {
    return res.status(400).json({ success: false, error: "Missing photoPath" });
  }

  const userId = req.session.adminEmail;
  const stars = loadStars();

  if (stars[photoPath] && stars[photoPath].starredBy.includes(userId)) {
    stars[photoPath].starredBy = stars[photoPath].starredBy.filter((id) => id !== userId);
    stars[photoPath].count = Math.max(0, stars[photoPath].count - 1);
    saveStars(stars);
  }

  const count = stars[photoPath] ? stars[photoPath].count : 0;
  res.json({ success: true, count, starred: false });
});

// Leaderboard API - Get photos sorted by star count
app.get("/api/leaderboard", (req, res) => {
  try {
    const stars = loadStars();
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

// ============================================
// HTML Admin Pages
// ============================================

// Admin Login Page (HTML) - Now at root
app.get("/", (req, res) => {
  if (req.session.adminEmail) {
    return res.redirect("/gallery");
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Login - Frame It</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background-color: #f5f5f5;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 400px;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 24px;
          text-align: center;
          color: #333;
        }
        .form-group {
          margin-bottom: 16px;
        }
        label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 500;
          color: #555;
        }
        input[type="email"] {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        button {
          width: 100%;
          padding: 12px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
        }
        button:hover {
          background-color: #0056b3;
        }
        .error {
          padding: 12px;
          background-color: #fee;
          border: 1px solid #fcc;
          border-radius: 4px;
          color: #c00;
          margin-bottom: 16px;
          display: none;
        }
        .error.show {
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Admin Login</h1>
        <div id="error" class="error"></div>
        <form id="loginForm">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input type="email" id="email" name="email" required placeholder="admin@example.com">
          </div>
          <button type="submit">Login</button>
        </form>
      </div>

      <script>
        // Check localStorage for existing admin email and auto-login
        window.addEventListener('DOMContentLoaded', () => {
          const savedEmail = localStorage.getItem('adminEmail');
          if (savedEmail) {
            // Auto-login with saved email
            autoLogin(savedEmail);
          } else {
            // Pre-fill if available but don't auto-login
            const emailInput = document.getElementById('email');
            if (savedEmail) {
              emailInput.value = savedEmail;
            }
          }
        });

        async function autoLogin(email) {
          try {
            const res = await fetch('/api/admin/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
            
            const data = await res.json();
            
            if (data.success) {
              window.location.href = '/gallery';
            }
            // If auto-login fails, just stay on login page
          } catch (err) {
            // Silent fail - user can login manually
            console.error('Auto-login failed:', err);
          }
        }

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = document.getElementById('email').value;
          const errorDiv = document.getElementById('error');
          
          try {
            const res = await fetch('/api/admin/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            });
            
            const data = await res.json();
            
            if (data.success) {
              // Save email to localStorage for auto-login next time
              localStorage.setItem('adminEmail', email);
              window.location.href = '/gallery';
            } else {
              errorDiv.textContent = data.error || 'Login failed';
              errorDiv.classList.add('show');
            }
          } catch (err) {
            errorDiv.textContent = 'Network error: ' + err.message;
            errorDiv.classList.add('show');
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Legacy redirect for old /admin URL
app.get("/admin", (req, res) => {
  res.redirect("/");
});

// Legacy redirects for old admin routes
app.get("/admin/gallery", (req, res) => {
  res.redirect("/gallery");
});

app.get("/admin/leaderboard", (req, res) => {
  res.redirect("/leaderboard");
});

// Admin Gallery Page (HTML)
app.get("/gallery", (req, res) => {
  if (!req.session.adminEmail) {
    return res.redirect("/");
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Gallery - Frame It Admin</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background-color: #f5f5f5;
          min-height: 100vh;
          padding: 20px;
        }
        .header {
          background: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        h1 {
          font-size: 24px;
          color: #333;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .email {
          font-size: 14px;
          color: #666;
        }
        .nav-link {
          color: #007bff;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
        }
        .nav-link:hover {
          text-decoration: underline;
        }
        .logout-btn {
          padding: 8px 16px;
          background-color: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .logout-btn:hover {
          background-color: #c82333;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
        }
        .card {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .card img {
          width: 100%;
          height: 200px;
          object-fit: cover;
        }
        .card-footer {
          padding: 12px;
        }
        .star-btn {
          width: 100%;
          padding: 8px;
          background-color: #f8f9fa;
          border: 1px solid #ddd;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .star-btn:hover {
          background-color: #e9ecef;
        }
        .star-btn.starred {
          background-color: #ffc107;
          border-color: #ffc107;
          color: #000;
        }
        .loading {
          text-align: center;
          padding: 40px;
          font-size: 18px;
          color: #666;
        }
        .error {
          padding: 12px;
          background-color: #fee;
          border: 1px solid #fcc;
          border-radius: 4px;
          color: #c00;
          margin-bottom: 16px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Gallery</h1>
        <div class="header-right">
          <span class="email">${req.session.adminEmail}</span>
          <a href="/leaderboard" class="nav-link">Leaderboard</a>
          <button class="logout-btn" onclick="logout()">Logout</button>
        </div>
      </div>

      <div id="error" class="error" style="display:none;"></div>
      <div id="gallery" class="loading">Loading gallery...</div>

      <script>
        let photos = [];

        async function loadGallery() {
          try {
            const res = await fetch('/api/gallery');
            const data = await res.json();
            
            if (data.success) {
              photos = data.photos;
              renderGallery();
            } else {
              showError(data.error || 'Failed to load gallery');
            }
          } catch (err) {
            showError('Network error: ' + err.message);
          }
        }

        function renderGallery() {
          const gallery = document.getElementById('gallery');
          
          if (photos.length === 0) {
            gallery.innerHTML = '<p class="loading">No photos uploaded yet.</p>';
            return;
          }
          
          gallery.className = 'grid';
          gallery.innerHTML = photos.map((photo, index) => \`
            <div class="card">
              <img src="\${photo.thumbnailPath}" alt="Photo">
              <div class="card-footer">
                <button 
                  class="star-btn \${photo.starred ? 'starred' : ''}" 
                  onclick="toggleStar(\${index}, '\${photo.photoPath}', \${photo.starred})"
                  id="star-\${index}"
                >
                  ⭐ \${photo.starCount}
                </button>
              </div>
            </div>
          \`).join('');
        }

        async function toggleStar(index, photoPath, isStarred) {
          const endpoint = isStarred ? '/api/admin/unstar' : '/api/admin/star';
          
          try {
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ photoPath })
            });
            
            const data = await res.json();
            
            if (data.success) {
              photos[index].starCount = data.count;
              photos[index].starred = data.starred;
              renderGallery();
            } else {
              alert(data.error || 'Failed to update star');
            }
          } catch (err) {
            alert('Network error: ' + err.message);
          }
        }

        async function logout() {
          try {
            await fetch('/api/admin/logout', { method: 'POST' });
            localStorage.removeItem('adminEmail');
            window.location.href = '/';
          } catch (err) {
            console.error('Logout failed:', err);
          }
        }

        function showError(message) {
          const errorDiv = document.getElementById('error');
          errorDiv.textContent = message;
          errorDiv.style.display = 'block';
        }

        loadGallery();
      </script>
    </body>
    </html>
  `);
});

// Admin Leaderboard Page (HTML)
app.get("/leaderboard", (req, res) => {
  if (!req.session.adminEmail) {
    return res.redirect("/");
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Leaderboard - Frame It Admin</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background-color: #f5f5f5;
          min-height: 100vh;
          padding: 20px;
        }
        .header {
          background: white;
          padding: 16px 24px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        h1 {
          font-size: 24px;
          color: #333;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .email {
          font-size: 14px;
          color: #666;
        }
        .nav-link {
          color: #007bff;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
        }
        .nav-link:hover {
          text-decoration: underline;
        }
        .logout-btn {
          padding: 8px 16px;
          background-color: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        .logout-btn:hover {
          background-color: #c82333;
        }
        .list {
          max-width: 800px;
          margin: 0 auto;
        }
        .card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          cursor: pointer;
          transition: transform 0.2s;
          overflow: hidden;
        }
        .card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        .rank {
          font-size: 24px;
          font-weight: bold;
          color: #007bff;
          padding: 20px;
          min-width: 80px;
          text-align: center;
        }
        .rank.gold { color: #ffd700; }
        .rank.silver { color: #c0c0c0; }
        .rank.bronze { color: #cd7f32; }
        .card img {
          width: 150px;
          height: 150px;
          object-fit: cover;
        }
        .card-content {
          flex: 1;
          padding: 16px;
        }
        .stars {
          font-size: 20px;
          font-weight: 600;
          color: #ffc107;
          margin-bottom: 8px;
        }
        .metadata {
          margin-top: 12px;
          padding: 12px;
          background-color: #f8f9fa;
          border-radius: 4px;
          font-size: 14px;
        }
        .metadata h3 {
          font-size: 16px;
          margin-bottom: 8px;
        }
        .metadata p {
          margin: 4px 0;
        }
        .loading {
          text-align: center;
          padding: 40px;
          font-size: 18px;
          color: #666;
        }
        .error {
          padding: 12px;
          background-color: #fee;
          border: 1px solid #fcc;
          border-radius: 4px;
          color: #c00;
          margin-bottom: 16px;
        }
        .modal {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.8);
          z-index: 1000;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal.show {
          display: flex;
        }
        .modal-content {
          background: white;
          border-radius: 8px;
          padding: 20px;
          max-width: 90%;
          max-height: 90%;
          overflow: auto;
          position: relative;
        }
        .close-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 40px;
          height: 40px;
          border: none;
          background-color: #dc3545;
          color: white;
          font-size: 24px;
          border-radius: 50%;
          cursor: pointer;
          z-index: 1;
        }
        .modal-image {
          max-width: 100%;
          max-height: 60vh;
          object-fit: contain;
          display: block;
          margin: 0 auto;
        }
        .modal-metadata {
          margin-top: 20px;
          padding: 16px;
          background-color: #f8f9fa;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Leaderboard</h1>
        <div class="header-right">
          <span class="email">${req.session.adminEmail}</span>
          <a href="/gallery" class="nav-link">Gallery</a>
          <button class="logout-btn" onclick="logout()">Logout</button>
        </div>
      </div>

      <div id="error" class="error" style="display:none;"></div>
      <div id="leaderboard" class="loading">Loading leaderboard...</div>

      <div id="modal" class="modal" onclick="closeModal()">
        <div class="modal-content" onclick="event.stopPropagation()">
          <button class="close-btn" onclick="closeModal()">×</button>
          <img id="modal-image" class="modal-image" src="" alt="Full size">
          <div id="modal-metadata" class="modal-metadata"></div>
        </div>
      </div>

      <script>
        let photos = [];
        let expandedIndex = null;

        async function loadLeaderboard() {
          try {
            const res = await fetch('/api/leaderboard');
            const data = await res.json();
            
            if (data.success) {
              photos = data.photos;
              renderLeaderboard();
            } else {
              showError(data.error || 'Failed to load leaderboard');
            }
          } catch (err) {
            showError('Network error: ' + err.message);
          }
        }

        function getRankClass(index) {
          if (index === 0) return 'gold';
          if (index === 1) return 'silver';
          if (index === 2) return 'bronze';
          return '';
        }

        function toggleMetadata(index) {
          expandedIndex = expandedIndex === index ? null : index;
          renderLeaderboard();
        }

        function showModal(photo) {
          document.getElementById('modal-image').src = photo.photoPath;
          
          let metadataHtml = '<h2>Photo Details</h2>';
          if (photo.metadata) {
            if (photo.metadata.name) metadataHtml += \`<p><strong>Name:</strong> \${photo.metadata.name}</p>\`;
            if (photo.metadata.email) metadataHtml += \`<p><strong>Email:</strong> \${photo.metadata.email}</p>\`;
            if (photo.metadata.uploadedAt) {
              metadataHtml += \`<p><strong>Uploaded:</strong> \${new Date(photo.metadata.uploadedAt).toLocaleString()}</p>\`;
            }
          }
          metadataHtml += \`<p><strong>Stars:</strong> ⭐ \${photo.starCount}</p>\`;
          
          document.getElementById('modal-metadata').innerHTML = metadataHtml;
          document.getElementById('modal').classList.add('show');
        }

        function closeModal() {
          document.getElementById('modal').classList.remove('show');
        }

        function renderLeaderboard() {
          const leaderboard = document.getElementById('leaderboard');
          
          if (photos.length === 0) {
            leaderboard.innerHTML = '<p class="loading">No starred photos yet.</p>';
            return;
          }
          
          leaderboard.className = 'list';
          leaderboard.innerHTML = photos.map((photo, index) => {
            let metadataHtml = '';
            if (expandedIndex === index && photo.metadata) {
              metadataHtml = \`
                <div class="metadata">
                  <h3>Photo Details</h3>
                  \${photo.metadata.name ? \`<p><strong>Name:</strong> \${photo.metadata.name}</p>\` : ''}
                  \${photo.metadata.email ? \`<p><strong>Email:</strong> \${photo.metadata.email}</p>\` : ''}
                  \${photo.metadata.uploadedAt ? \`<p><strong>Uploaded:</strong> \${new Date(photo.metadata.uploadedAt).toLocaleString()}</p>\` : ''}
                </div>
              \`;
            }
            
            return \`
              <div class="card" onclick="toggleMetadata(\${index})">
                <div class="rank \${getRankClass(index)}">#\${index + 1}</div>
                <img src="\${photo.photoPath}" alt="Photo" onclick="event.stopPropagation(); showModal(\${JSON.stringify(photo).replace(/"/g, '&quot;')})">
                <div class="card-content">
                  <div class="stars">⭐ \${photo.starCount} \${photo.starCount === 1 ? 'star' : 'stars'}</div>
                  \${metadataHtml}
                </div>
              </div>
            \`;
          }).join('');
        }

        async function logout() {
          try {
            await fetch('/api/admin/logout', { method: 'POST' });
            localStorage.removeItem('adminEmail');
            window.location.href = '/';
          } catch (err) {
            console.error('Logout failed:', err);
          }
        }

        function showError(message) {
          const errorDiv = document.getElementById('error');
          errorDiv.textContent = message;
          errorDiv.style.display = 'block';
        }

        loadLeaderboard();
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => console.log(`Server listening in container on ${PORT}, use port mapping to access from host`));

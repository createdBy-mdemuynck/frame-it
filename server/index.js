const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Ensure uploads root exists and serve statically at /uploads
const uploadsRoot = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsRoot, { recursive: true });
app.use('/uploads', express.static(uploadsRoot));

// Temporary local storage (uploads/tmp). Multer enforces 5MB limit and image-only file types.
const tmpDir = path.join(uploadsRoot, 'tmp');
fs.mkdirSync(tmpDir, { recursive: true });

const upload = multer({
  dest: tmpDir,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      return cb(new Error('INVALID_FILE_TYPE'));
    }
    cb(null, true);
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/upload', upload.single('photo'), (req, res) => {
  try {
    const { name, email } = req.body || {};
    // Validate presence of fields
    if (!name || !email) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: 'Missing required fields: name and email' });
    }
    if (!req.file) return res.status(400).json({ success: false, error: 'Missing required file: photo' });

    // Basic email validation
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValid) {
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    // Move file to per-email folder (use hashed folder name to avoid unsafe characters)
    const emailHash = crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
    const userDir = path.join(uploadsRoot, emailHash);
    fs.mkdirSync(userDir, { recursive: true });

    const safeName = (req.file.originalname || 'upload').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const timestamp = Date.now();
    const finalName = `${timestamp}_${safeName}`;
    const finalPath = path.join(userDir, finalName);

    fs.renameSync(req.file.path, finalPath);

    // TODO: Replace local storage with cloud storage (S3/GCS/Azure). Add virus scanning, encryption at rest, and backups.

    return res.json({
      success: true,
      file: {
        filename: finalName,
        url: `/uploads/${emailHash}/${finalName}`,
        size: req.file.size,
        mimetype: req.file.mimetype
      },
      meta: { name, email }
    });
  } catch (err) {
    // Clean up tmp file on error
    try { if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (e) {}
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, error: 'File too large. Max size is 5MB' });
    }
    if (err && err.message === 'INVALID_FILE_TYPE') {
      return res.status(400).json({ success: false, error: 'Invalid file type. Only images allowed' });
    }
    console.error('Upload error', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));


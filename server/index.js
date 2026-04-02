const express = require("express");
const path = require("path");
const fs = require("fs");

// Import middleware
const corsMiddleware = require("./middleware/cors");
const sessionMiddleware = require("./middleware/session");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { requireAuthPage, isSuperAdmin } = require("./middleware/auth");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Configure view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Configure middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.use(corsMiddleware);

// Setup uploads directory
const uploadsRoot = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsRoot, { recursive: true });
app.use("/uploads", express.static(uploadsRoot));

// Import and configure routes
const uploadRoutes = require("./routes/upload")(uploadsRoot);
const apiRoutes = require("./routes/api")(uploadsRoot);
const adminRoutes = require("./routes/admin")(uploadsRoot);

// Health check endpoint
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Root route - Admin login page
app.get("/", (req, res) => {
  if (req.session.adminEmail) {
    return res.redirect("/gallery");
  }
  res.render("login");
});

// Mount route modules
app.use("/", uploadRoutes);
app.use("/api", apiRoutes);
app.use("/admin", adminRoutes);

// Gallery page route (requires authentication)
app.get("/gallery", requireAuthPage, (req, res) => {
  res.render("gallery", { 
    adminEmail: req.session.adminEmail,
    isSuperAdmin: isSuperAdmin(req)
  });
});

// Leaderboard page route (requires authentication)
app.get("/leaderboard", requireAuthPage, (req, res) => {
  res.render("leaderboard", { 
    adminEmail: req.session.adminEmail,
    isSuperAdmin: isSuperAdmin(req)
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Frame It Server running on port ${PORT}`);
  console.log(`   - Upload endpoint: http://localhost:${PORT}/upload`);
  console.log(`   - Admin panel: http://localhost:${PORT}/`);
  console.log(`   - Gallery: http://localhost:${PORT}/gallery`);
  console.log(`   - Health check: http://localhost:${PORT}/health`);
});

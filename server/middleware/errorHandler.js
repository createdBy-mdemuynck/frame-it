/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  console.error("Error:", err);

  // Multer errors
  if (err.message === "INVALID_FILE_TYPE") {
    return res.status(400).json({
      success: false,
      error: "Invalid file type. Only images are allowed.",
    });
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      error: "File size exceeds 5MB limit.",
    });
  }

  // CORS errors
  if (err.message && err.message.includes("Not allowed by CORS")) {
    return res.status(403).json({
      success: false,
      error: "CORS policy violation",
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
}

/**
 * 404 handler for undefined routes
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};

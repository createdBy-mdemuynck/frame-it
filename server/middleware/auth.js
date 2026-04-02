/**
 * Middleware to check if user is authenticated as admin
 */
function requireAuth(req, res, next) {
  if (!req.session.adminEmail) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
    });
  }
  next();
}

/**
 * Middleware to check if user is authenticated for page routes
 * Redirects to login page if not authenticated
 */
function requireAuthPage(req, res, next) {
  if (!req.session.adminEmail) {
    return res.redirect("/");
  }
  next();
}

/**
 * Middleware to check if user is the super admin (admin@afsprong.be)
 * Only this user can delete photos and data
 */
function requireSuperAdmin(req, res, next) {
  if (!req.session.adminEmail) {
    return res.status(401).json({
      success: false,
      error: "Authentication required",
    });
  }

  if (req.session.adminEmail !== "admin@afsprong.be") {
    return res.status(403).json({
      success: false,
      error: "Access denied. Only admin@afsprong.be can perform this action.",
    });
  }

  next();
}

/**
 * Helper function to check if current user is super admin
 */
function isSuperAdmin(req) {
  return req.session.adminEmail === "admin@afsprong.be";
}

module.exports = {
  requireAuth,
  requireAuthPage,
  requireSuperAdmin,
  isSuperAdmin,
};

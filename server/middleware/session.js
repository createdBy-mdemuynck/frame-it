const session = require("express-session");

/**
 * Configure session middleware
 */
const isProduction = process.env.NODE_ENV === "production";

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "frame-it-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    // For local/dev: allow non-HTTPS and more relaxed SameSite for mobile compatibility
    secure: isProduction, // true in production (HTTPS required)
    httpOnly: true,
    sameSite: "lax", // "lax" is compatible with most mobile browsers for same-origin
    // If you need cross-site cookies (e.g. different domain for API), use "none" and secure: true
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  proxy: isProduction, // trust first proxy in production (Azure Container Apps)
});

module.exports = sessionMiddleware;

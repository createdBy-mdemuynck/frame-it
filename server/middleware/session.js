const session = require("express-session");

/**
 * Configure session middleware
 */
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "frame-it-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
});

module.exports = sessionMiddleware;

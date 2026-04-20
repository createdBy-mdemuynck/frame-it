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
    secure: isProduction, // true in production (HTTPS required)
    httpOnly: true,
    sameSite: "lax", // "lax" works for same-origin requests (login is on backoffice)
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
  proxy: isProduction, // trust first proxy in production (Azure Container Apps)
});

module.exports = sessionMiddleware;

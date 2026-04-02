const cors = require("cors");

/**
 * Configure CORS to allow Frame It domains and localhost
 */
const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    try {
      const u = new URL(origin);
      // Allow origins containing localhost, frame-it, or azurecontainerapps.io
      if (
        u.hostname.includes("localhost") ||
        u.hostname.includes("frame-it") ||
        u.hostname.includes("azurecontainerapps.io")
      ) {
        return callback(null, true);
      }
    } catch (err) {
      // Invalid URL, fall through to reject
    }
    
    return callback(new Error(`${origin} Not allowed by CORS`));
  },
  credentials: true, // Allow cookies/sessions
});

module.exports = corsMiddleware;

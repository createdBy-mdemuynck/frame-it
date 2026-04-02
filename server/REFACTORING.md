# Server Refactoring Documentation

## Overview

The Frame It server has been refactored from a monolithic 1200+ line `index.js` file into a clean, modular architecture using the Express framework with EJS templating engine.

## New Directory Structure

```
server/
├── index.js                    # Main application entry point (clean and organized)
├── index.old.js               # Backup of original monolithic file
├── package.json               # Updated with EJS dependency
├── views/                     # EJS template files for HTML pages
│   ├── login.ejs             # Admin login page
│   ├── gallery.ejs           # Photo gallery page
│   ├── leaderboard.ejs       # Star leaderboard page
│   ├── star-panel.ejs        # Admin star management panel
│   ├── email-folders.ejs     # List of email folders
│   └── thumbnails.ejs        # Thumbnail view for specific email
├── routes/                    # Route handlers organized by feature
│   ├── upload.js             # Upload and file management routes
│   ├── api.js                # JSON API endpoints (gallery, leaderboard, auth)
│   └── admin.js              # Admin panel routes (star management)
├── middleware/                # Reusable middleware functions
│   ├── auth.js               # Authentication middleware
│   ├── cors.js               # CORS configuration
│   ├── session.js            # Session configuration
│   └── errorHandler.js       # Error handling middleware
├── public/                    # Static files (currently empty)
└── uploads/                   # User uploads (organized by email)
```

## Key Improvements

### 1. **Separation of Concerns**
- **Routes**: Business logic separated into feature-specific route files
- **Views**: HTML templates extracted into EJS files (no more inline HTML strings)
- **Middleware**: Reusable middleware organized by purpose
- **Main app**: Clean, readable entry point (~70 lines vs 1200+ lines)

### 2. **Template Engine (EJS)**
- All HTML pages now use EJS templates
- Server-side rendering with dynamic data
- Cleaner, more maintainable HTML code
- Easy to update UI without touching JavaScript

### 3. **Modular Routes**
- **upload.js**: Handles photo uploads and file serving
- **api.js**: JSON API endpoints for gallery, leaderboard, and authentication
- **admin.js**: Admin-specific functionality (star panel, star counts)

### 4. **Middleware Organization**
- **auth.js**: Authentication checks (both API and page routes)
- **cors.js**: Cross-origin configuration for Frame It domains
- **session.js**: Session management configuration
- **errorHandler.js**: Centralized error handling and 404 responses

## Route Organization

### Public Routes (No Authentication Required)
```
GET  /                          # Admin login page (login.ejs)
POST /api/admin/login           # Login endpoint
GET  /health                    # Health check endpoint
POST /upload                    # Photo upload endpoint
POST /api/upload                # Alternative upload endpoint
```

### Protected Routes (Authentication Required)
```
GET  /gallery                   # Gallery page (gallery.ejs)
GET  /leaderboard               # Leaderboard page (leaderboard.ejs)
GET  /api/gallery               # Gallery data (JSON)
GET  /api/leaderboard           # Leaderboard data (JSON)
POST /api/admin/star            # Star a photo (JSON)
POST /api/admin/unstar          # Unstar a photo (JSON)
GET  /api/admin/session         # Check session status
POST /api/admin/logout          # Logout endpoint
GET  /admin/star-panel          # Star management panel (star-panel.ejs)
POST /admin/star                # Star a photo (form)
POST /admin/unstar              # Unstar a photo (form)
GET  /admin/star-count          # Get star count (HTML)
GET  /admin/most-starred        # Get most starred photo (HTML)
GET  /admin/star-counts         # View all star counts (HTML)
```

### File Access Routes
```
GET  /uploads                   # List all email folders (email-folders.ejs)
GET  /uploads/:email            # View thumbnails for email (thumbnails.ejs)
GET  /uploads/:email/:file      # Static file serving
```

## How to Use

### 1. Install Dependencies
```bash
cd server
npm install
```

This will install the new `ejs` dependency along with existing packages.

### 2. Start the Server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

### 3. Access the Application
- Admin Login: http://localhost:3001/
- Gallery: http://localhost:3001/gallery (after login)
- Leaderboard: http://localhost:3001/leaderboard (after login)
- Health Check: http://localhost:3001/health

## Adding New Features

### Adding a New View
1. Create an EJS file in `views/` folder
2. Use `res.render('filename', { data })` in your route

Example:
```javascript
app.get('/new-page', (req, res) => {
  res.render('new-page', { 
    title: 'My Page',
    data: someData 
  });
});
```

### Adding New Routes
1. Create a new file in `routes/` folder
2. Export a function that takes required dependencies
3. Mount it in `index.js`

Example (`routes/newfeature.js`):
```javascript
const express = require('express');
const router = express.Router();

module.exports = (uploadsRoot) => {
  router.get('/feature', (req, res) => {
    // Your logic here
  });
  
  return router;
};
```

In `index.js`:
```javascript
const newFeatureRoutes = require('./routes/newfeature')(uploadsRoot);
app.use('/api', newFeatureRoutes);
```

### Adding New Middleware
1. Create a new file in `middleware/` folder
2. Export middleware function(s)
3. Apply in `index.js`

Example (`middleware/logger.js`):
```javascript
function loggerMiddleware(req, res, next) {
  console.log(`${req.method} ${req.url}`);
  next();
}

module.exports = loggerMiddleware;
```

In `index.js`:
```javascript
const logger = require('./middleware/logger');
app.use(logger);
```

## Environment Variables

- `PORT`: Server port (default: 3001)
- `SESSION_SECRET`: Secret key for session encryption (default: "frame-it-secret-key-change-in-production")

## Migration Notes

### What Changed
- Main `index.js` reduced from 1200+ lines to ~70 lines
- All HTML moved from inline strings to EJS templates
- Routes organized into feature-specific modules
- Middleware extracted into reusable modules

### What Stayed the Same
- All endpoints work exactly as before
- Same upload functionality
- Same authentication flow
- Same star/voting system
- Same file structure in uploads/

### Backward Compatibility
- The original `index.js` is backed up as `index.old.js`
- All API endpoints maintain the same paths
- All functionality preserved

## Benefits of New Structure

1. **Maintainability**: Easy to find and update code
2. **Scalability**: Simple to add new features
3. **Readability**: Clear separation of concerns
4. **Testing**: Easier to unit test individual modules
5. **Debugging**: Faster to locate and fix issues
6. **Collaboration**: Multiple developers can work on different features
7. **Best Practices**: Follows industry-standard Express.js patterns

## Next Steps (Optional Improvements)

- Add input validation library (e.g., express-validator)
- Implement logging with Winston or Morgan
- Add API documentation with Swagger
- Implement more granular error handling
- Add unit tests with Jest
- Implement rate limiting for uploads
- Add database support (currently file-based)

---

**Note**: The original monolithic `index.js` has been preserved as `index.old.js` for reference. You can safely delete it once you've verified the new structure works correctly.

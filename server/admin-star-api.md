# Admin Star Feature API Documentation

## Overview
This API enables admin users to star/unstar photos, view real-time star counts, and fetch the most-starred photo. All endpoints return HTML for direct browser use.

### Endpoints

- **GET /admin/star-panel**: Admin UI to view all photos, current star counts, and forms to star/unstar by user ID.
- **POST /admin/star**: Form endpoint to star a photo. Fields: `photoPath`, `userId`.
- **POST /admin/unstar**: Form endpoint to unstar a photo. Fields: `photoPath`, `userId`.
- **GET /admin/star-count?photoPath=...**: View star count for a specific photo.
- **GET /admin/star-counts**: Table of all photos and their star counts.
- **GET /admin/most-starred**: Shows the most-starred photo and its count.

### Data Storage
- Star data is stored in `server/uploads/.stars.json` as `{ photoPath: { count, starredBy: [userId] } }`.

### Integration Notes
- All endpoints return HTML for admin browser use.
- For real-time updates, poll `/admin/star-counts`.
- Coordinate with Astra for UI integration and userId conventions.

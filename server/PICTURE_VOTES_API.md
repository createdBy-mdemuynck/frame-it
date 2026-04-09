# Picture Votes API Endpoint

## Overview

A new API endpoint has been added to allow the super admin (`admin@afsprong.be`) to retrieve a mapping of which users have voted (starred) each picture.

## Endpoint

- **URL:** `GET /api/admin/picture-votes`
- **Auth:** Only accessible to the super admin (`admin@afsprong.be`).
- **Response:**
  - `200 OK` with JSON body:
    ```json
    {
      "success": true,
      "votes": {
        "/uploads/user1@example.com/photo1.jpg": ["user2@example.com", "user3@example.com"],
        "/uploads/user2@example.com/photo2.jpg": ["user1@example.com"]
      }
    }
    ```
  - `401` or `403` if not authenticated as super admin.

## Data Model

- Votes are tracked in `.stars.json` in the uploads directory.
- Each photo entry contains a `starredBy` array listing the emails of users who voted for that photo.

## Example Usage

To fetch all votes:

```
GET /api/admin/picture-votes
Authorization: (must be logged in as admin@afsprong.be)
```

## Security

- Only the super admin can access this endpoint. All other users will receive a 403 Forbidden error.

---

**File:** `server/routes/api.js`
**Added:** `GET /api/admin/picture-votes` (super admin only)

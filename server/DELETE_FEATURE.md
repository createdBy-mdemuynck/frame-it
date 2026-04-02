# Delete Feature Documentation

## Overview

Added comprehensive delete functionality to the Frame It server with strict access control and confirmation requirements.

## Access Control

**Super Admin Only**: `admin@afsprong.be`

Only this email address can:
- Delete individual photos
- Delete all data

Other admin users can view and star photos but cannot delete anything.

## Features Added

### 1. Delete Individual Photos

**Location**: Gallery and Leaderboard pages

**Visibility**: Delete button (🗑️ Delete) appears only for `admin@afsprong.be`

**What it deletes**:
- Original photo file
- Thumbnail image
- Metadata JSON file
- Star data for that photo

**Confirmation**: Single confirmation dialog before deletion

**API Endpoint**: `DELETE /api/admin/photo`

**Request Body**:
```json
{
  "photoPath": "/uploads/email@example.com/filename.jpg"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Photo deleted successfully",
  "deletedFiles": ["photo", "thumbnail", "metadata", "star data"]
}
```

---

### 2. Delete All Data

**Location**: Top of Gallery and Leaderboard pages

**Visibility**: Red "🗑️ Delete All Data" button appears only for `admin@afsprong.be`

**What it deletes**:
- All user folders in `/uploads`
- All photos and thumbnails
- All metadata files
- All star data (`.stars.json`)

**Confirmation Process** (2-step):
1. **Prompt**: User must type "DELETE ALL" exactly
2. **Final Confirmation**: Additional dialog confirming the action

**API Endpoint**: `DELETE /api/admin/all-data`

**Response**:
```json
{
  "success": true,
  "message": "All data deleted successfully",
  "deletedFolders": 5,
  "deletedFiles": 23
}
```

---

## Security Features

### 1. Authentication Check
All delete endpoints require the user to be logged in:
```javascript
if (!req.session.adminEmail) {
  return res.status(401).json({ 
    success: false, 
    error: "Authentication required" 
  });
}
```

### 2. Super Admin Check
Only `admin@afsprong.be` can access delete endpoints:
```javascript
if (req.session.adminEmail !== "admin@afsprong.be") {
  return res.status(403).json({ 
    success: false, 
    error: "Access denied. Only admin@afsprong.be can perform this action." 
  });
}
```

### 3. Confirmation Dialogs

**Single Photo Delete**:
- Simple confirmation: "Are you sure you want to delete this photo? This action cannot be undone."

**Delete All Data**:
- Step 1: Type "DELETE ALL" exactly in a prompt
- Step 2: Final yes/no confirmation
- If either fails, operation is cancelled

---

## Implementation Details

### New Middleware

**File**: `server/middleware/auth.js`

**Functions**:
- `requireSuperAdmin(req, res, next)` - Middleware to restrict access to super admin
- `isSuperAdmin(req)` - Helper function to check if current user is super admin

### Updated Routes

**File**: `server/routes/api.js`

**New Endpoints**:
- `DELETE /api/admin/photo` - Delete single photo
- `DELETE /api/admin/all-data` - Delete all data

### Updated Views

**Files Modified**:
- `server/views/gallery.ejs` - Added delete buttons and JavaScript handlers
- `server/views/leaderboard.ejs` - Added delete buttons and JavaScript handlers

**Changes**:
- Delete All Data button in header (conditional visibility)
- Delete button for each photo (conditional visibility)
- JavaScript functions: `deletePhoto()`, `deleteAllData()`
- Super admin flag passed from server: `isSuperAdmin`

### Updated Main App

**File**: `server/index.js`

**Changes**:
- Import `isSuperAdmin` helper from auth middleware
- Pass `isSuperAdmin` flag to gallery and leaderboard views

---

## Usage

### As Super Admin (admin@afsprong.be)

1. **Login** with `admin@afsprong.be`
2. **Gallery/Leaderboard** pages show delete buttons
3. **Delete individual photo**:
   - Click "🗑️ Delete" button on any photo
   - Confirm in dialog
   - Photo is removed immediately
4. **Delete all data**:
   - Click "🗑️ Delete All Data" button in header
   - Type "DELETE ALL" in the prompt
   - Confirm in final dialog
   - All data is removed

### As Regular Admin (any other email)

- Delete buttons are **not visible**
- Attempting direct API calls returns `403 Forbidden`
- Can still view, upload, and star photos

---

## Error Handling

### Client-Side
- Network errors show alert dialogs
- Failed deletions display error messages
- Cancelling confirmation prevents deletion

### Server-Side
- Returns 401 if not authenticated
- Returns 403 if not super admin
- Returns 400 for invalid requests
- Returns 500 for server errors
- Logs all delete operations to console

### Console Logging

**Single Delete**:
```
✅ Deleted photo: /uploads/user@example.com/photo.jpg (photo, thumbnail, metadata, star data)
```

**Delete All**:
```
✅ Deleted folder: user1@example.com
✅ Deleted folder: user2@example.com
✅ Deleted stars data
🗑️  All data deleted: 2 folders, ~15 files
```

---

## Testing

### Test Super Admin Access
1. Login as `admin@afsprong.be`
2. Verify delete buttons are visible
3. Test deleting a photo
4. Test delete all data (careful!)

### Test Regular Admin Access
1. Login with any other email
2. Verify delete buttons are NOT visible
3. Try direct API calls (should get 403)

### Test Confirmation Flow
1. Click delete button
2. Cancel first confirmation → operation aborted
3. For "Delete All": type wrong text → operation aborted
4. Cancel final confirmation → operation aborted

---

## Files Changed

### Created
- `server/DELETE_FEATURE.md` (this file)

### Modified
1. `server/middleware/auth.js` - Added super admin checks
2. `server/routes/api.js` - Added delete endpoints
3. `server/views/gallery.ejs` - Added delete UI and handlers
4. `server/views/leaderboard.ejs` - Added delete UI and handlers
5. `server/index.js` - Pass super admin flag to views

---

## Security Considerations

✅ **Access Control**: Only one specific email can delete
✅ **Authentication Required**: Must be logged in
✅ **Multiple Confirmations**: Prevents accidental deletion
✅ **Server-Side Validation**: All checks happen on server
✅ **No Client Bypass**: Even if client is modified, server blocks unauthorized access

⚠️ **Important**: The super admin email (`admin@afsprong.be`) is hard-coded. To change it, update:
- `server/middleware/auth.js` - `requireSuperAdmin()` function
- `server/middleware/auth.js` - `isSuperAdmin()` function

---

## Future Enhancements (Optional)

- [ ] Soft delete with trash/recycle bin
- [ ] Restore deleted photos within 30 days
- [ ] Audit log of all deletions
- [ ] Email notification on delete operations
- [ ] Bulk delete (select multiple photos)
- [ ] Configurable super admin email (environment variable)

---

**Implemented**: April 2, 2026
**Status**: ✅ Production Ready

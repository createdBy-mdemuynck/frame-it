# API Contract: Admin Star Feature

## Overview
This contract defines the API endpoints, request/response formats, and error codes for the admin star feature. It enables admins to star/un-star photos, retrieve star counts, and fetch the most-starred photo. All endpoints require admin authentication as per existing security protocols.

## Endpoints

### 1. Star a Photo
- **POST** `/api/admin/photos/:photoId/star`
- **Auth:** Admin only (JWT or session, as per existing backend)
- **Request Body:** _empty_
- **Response:**
  ```json
  {
    "photoId": "string",
    "starCount": number
  }
  ```
- **Errors:**
  - 401 Unauthorized (not admin)
  - 404 Not Found (photo does not exist)
  - 409 Conflict (already starred)

### 2. Un-star a Photo
- **POST** `/api/admin/photos/:photoId/unstar`
- **Auth:** Admin only
- **Request Body:** _empty_
- **Response:**
  ```json
  {
    "photoId": "string",
    "starCount": number
  }
  ```
- **Errors:**
  - 401 Unauthorized
  - 404 Not Found
  - 409 Conflict (not starred)

### 3. Get Star Count for a Photo
- **GET** `/api/admin/photos/:photoId/star-count`
- **Auth:** Admin only
- **Response:**
  ```json
  {
    "photoId": "string",
    "starCount": number
  }
  ```
- **Errors:**
  - 401 Unauthorized
  - 404 Not Found

### 4. Get Most-Starred Photo
- **GET** `/api/admin/photos/most-starred`
- **Auth:** Admin only
- **Response:**
  ```json
  {
    "photoId": "string",
    "starCount": number,
    "photoUrl": "string"
  }
  ```
- **Errors:**
  - 401 Unauthorized
  - 404 Not Found (no photos starred)

## Notes
- All responses are JSON.
- Error responses follow `{ "error": "message" }` pattern.
- Endpoint paths and response shapes are designed for easy frontend integration (displaying star counts, toggling star state, showing most-starred photo).
- Extendable for future features (e.g., list all starred photos, audit logs).

---

_Astra, 2026-03-26_
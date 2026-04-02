# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Start the Backend Server

```bash
cd server
npm install        # First time only
npm run dev
```

✅ Server running at: **http://localhost:3001**

### Step 2: Start the Frontend Web App

```bash
cd web
npm install        # First time only
npm run dev
```

✅ Web app running at: **http://localhost:3000**

### Step 3: Test the Application

#### Upload a Photo (User)

1. Open: **http://localhost:3000**
2. Fill in name and email
3. Choose "Use Camera" or "Choose from Gallery"
4. Select a photo
5. Click Submit
6. ✅ Success! Your info is saved for next time

#### Vote on Photos (Admin - Backoffice Only)

1. Open: **http://localhost:3001** (note: port 3001, not 3000)
2. Enter any email to login (auto-saved for next time)
3. Click "Gallery" link to vote on photos
4. Click ⭐ stars to vote
5. Click "Leaderboard" to see rankings

**Note**:

- Admin pages are served by the backoffice server (port 3001), not the Next.js web app (port 3000)
- Your email is saved in localStorage - next visit auto-logs you in!

## 🔧 Fixed Issues

### ✅ CORS & Connection Issues

- Changed API URL from `https://` to `http://`
- Added `credentials: true` to CORS config
- Created `.env.local` for web configuration
- Created `.env` for server configuration

### ✅ Next.js Configuration

- Removed static export mode
- Enabled dynamic features and environment variables

### ✅ Session Management

- Sessions now work across frontoffice and backoffice
- Admin login persists between pages

## 🧪 Test Checklist

- [ ] Upload a photo from web app
- [ ] See photo in server at http://localhost:3001/admin
- [ ] Login to admin panel
- [ ] Vote for a photo in gallery
- [ ] Check leaderboard shows voted photos
- [ ] Refresh page - still logged in
- [ ] Upload another photo - name/email pre-filled

## ⚠️ Common Issues

**"Address already in use"**
→ Port 3000 or 3001 is busy. Close other apps or change ports.

**"Module not found"**
→ Run `npm install` in both `/server` and `/web` directories.

**"CORS error"**
→ Make sure both servers are running. Check console for exact error.

**Upload fails silently**
→ Check server console. File might be too large (>5MB) or wrong format.

## 📝 Default Configuration

| Setting          | Value     |
| ---------------- | --------- |
| Server Port      | 3001      |
| Web Port         | 3000      |
| Max File Size    | 5MB       |
| Thumbnail Size   | 150x150px |
| Session Duration | 24 hours  |

---

**Ready to go!** 🎉

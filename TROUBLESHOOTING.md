🔧 **Quick Fix for Upload Error**

## The Problem
The upload form was trying to send to the Next.js web app (port 3000) instead of the backend server (port 3001).

## The Solution
✅ Fixed the API URL to force `http://localhost:3001`  
✅ Added server health check on page load  
✅ Added debug logging to console  

## What You Need to Do Now

### 1️⃣ **Restart the Web Server**
The web dev server needs to restart to pick up the code changes.

**Stop the current web server** (Ctrl+C in the terminal running `npm run dev` in the web folder)

**Then restart it:**
```bash
cd web
npm run dev
```

### 2️⃣ **Make Sure Server is Running**
Ensure the backend server is running:
```bash
cd server
npm run dev
```
Should show: `Server listening in container on 3001...`

### 3️⃣ **Test the Upload**
1. Open http://localhost:3000
2. You should NOT see any red error about server connection
3. If you see "⚠️ Cannot connect to server" - the backend isn't running
4. Fill in the form and try uploading
5. Check browser console (F12) for debug logs showing the upload URL

## Debug Info

**What the browser console will show:**
```
Uploading to: http://localhost:3001/api/upload
Upload success: {success: true, message: "File uploaded...", file: "..."}
```

**If you see errors:**
- `Failed to fetch` = Server not running
- `CORS error` = Server running but CORS misconfigured (shouldn't happen now)
- `404` = Wrong URL (should be fixed now)

## Quick Test Commands

**Check if server is accessible:**
```bash
# In PowerShell or browser
curl http://localhost:3001/health
```
Should return: `{"status":"ok"}`

**Check if web app can reach server:**
Open browser console on http://localhost:3000 and run:
```javascript
fetch('http://localhost:3001/health').then(r => r.json()).then(console.log)
```
Should log: `{status: "ok"}`

---

**After restart, the upload should work!** 🎉

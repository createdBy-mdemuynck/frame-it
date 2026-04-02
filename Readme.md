# Frame It - Photo Voting Application

A full-stack photo voting application with frontoffice (user upload) and backoffice (admin voting/leaderboard).

## 🚀 Quick Start

### Option 1: Docker/Podman (Recommended)

**With docker-compose or podman-compose:**
```bash
# Podman (if podman-compose is installed):
podman-compose up -d

# Docker:
docker-compose up -d
```

**With Podman (manual - podman-compose not required):**
```bash
# Build images
podman build -t frameit-backoffice:latest -f server/Dockerfile server
podman build -t frameit-frontoffice:latest -f web/Dockerfile web

# Create network
podman network create frameit-network

# Run containers
podman run -d --name frameit-backoffice --network frameit-network -p 3001:3001 -e PORT=3001 -e NODE_ENV=production -e SESSION_SECRET=your-secret -v "${PWD}/server/uploads:/app/uploads:z" frameit-backoffice:latest

podman run -d --name frameit-frontoffice --network frameit-network -p 3000:3000 -e NODE_ENV=production -e NEXT_PUBLIC_API_URL=http://localhost:3001 frameit-frontoffice:latest
```

**Development (with hot reload):**
```bash
# Podman:
podman-compose -f docker-compose.dev.yml up

# Docker:
docker-compose -f docker-compose.dev.yml up
```

📖 **Podman without podman-compose?** See [PODMAN_COMMANDS.md](PODMAN_COMMANDS.md) for full manual command reference  
📖 **Docker/Podman Compose?** See [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md) for full guide (works with both!)

### Option 2: Manual Setup

Continue to [Installation & Setup](#installation--setup) below.

---

## Features

### Frontoffice (User-facing)

- 📸 Mobile-friendly photo upload
- 📷 Camera or gallery selection
- 💾 Automatic name/email persistence (localStorage)
- ✅ 5MB file size limit with validation
- 🖼️ Thumbnail generation (150x150px)

### Backoffice (Admin)

- 🔐 Email-based admin login with sessions
- 🖼️ Photo gallery with star voting
- 🏆 Leaderboard sorted by votes
- 📊 Photo metadata viewing (name, email, upload date)
- ⭐ Vote/unvote functionality per admin

## Tech Stack

- **Frontoffice**: Next.js 14, React 18
- **Backoffice**: Express.js with HTML/JavaScript pages
- **Image Processing**: Sharp (thumbnail generation)
- **File Upload**: Multer (5MB limit, image validation)
- **Session Management**: express-session

## Installation & Setup

### Prerequisites

- **With Containers:** Podman or Docker installed
- **Without Containers:** Node.js 18+ installed

### Option A: Container Setup (Recommended)

**1. Production Deployment:**
```bash
# Podman:
podman-compose up -d

# Docker:
docker-compose up -d
```

**2. Development with Hot Reload:**
```bash
# Podman:
podman-compose -f docker-compose.dev.yml up

# Docker:
docker-compose -f docker-compose.dev.yml up
```

Access:
- Frontoffice: http://localhost:3000
- Backoffice: http://localhost:3001

📖 **Full Docker guide:** [DOCKER_QUICKSTART.md](DOCKER_QUICKSTART.md)

---

### Option B: Manual Setup

**1. Install Server Dependencies**

```bash
cd server
npm install
```

**2. Install Web Dependencies**

```bash
cd ../web
npm install
```

**3. Create Environment Files**

**server/.env:**
```env
PORT=3001
SESSION_SECRET=frame-it-secret-key-change-in-production
```

**web/.env.local:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**4. Start the Server (Backoffice)**

```bash
cd server
npm run dev
```

Server runs on: **http://localhost:3001**

**5. Start the Web App (Frontoffice)**

In a new terminal:
```bash
cd web
npm run dev
```

Web app runs on: **http://localhost:3000**

## Usage

### For Users (Frontoffice)

1. Visit **http://localhost:3000**
2. Enter your name and email (saved automatically for future uploads)
3. Choose "Use Camera" or "Choose from Gallery"
4. Select/take a photo
5. Submit!

Your name and email are remembered in your browser for future uploads.

### For Admins (Backoffice)

**All admin functionality is in the backoffice server (not the Next.js web app)**

1. Visit **http://localhost:3001** (admin login is at the root)
2. Login with any email address (session-based authentication)
   - Your email is saved in localStorage for automatic login next time
3. Navigate to:
   - **Gallery**: http://localhost:3001/gallery
   - **Leaderboard**: http://localhost:3001/leaderboard

#### Gallery Features

- View all uploaded photos as thumbnails
- Click ⭐ button to vote for a photo
- Star count updates in real-time
- Each admin can vote once per photo

#### Leaderboard Features

- Photos sorted by star count (highest first)
- Top 3 get special medals (🥇🥈🥉)
- Click photo thumbnail to expand metadata
- Click image to view full-size with all details

## Configuration

### Environment Variables

**Server** (`server/.env`):

```env
PORT=3001
SESSION_SECRET=your-secret-key-change-in-production
```

**Web** (`web/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## File Structure

```
frame-it/
├── server/              # Express backend
│   ├── index.js        # Main server file
│   ├── uploads/        # Photo storage (auto-created)
│   │   ├── .stars.json # Vote tracking
│   │   └── [email]/    # Per-user folders
│   │       ├── [photo] # Uploaded photos
│   │       ├── [photo].json # Metadata files
│   │       └── thumbnails/ # Generated thumbnails
│   ├── package.json
│   └── .env
├── web/                # Next.js frontend
│   ├── pages/          # Next.js pages
│   ├── src/
│   │   ├── components/
│   │   │   └── UploadForm.jsx
│   │   └── pages/
│   │       └── index.jsx  # User upload page
│   ├── package.json
│   └── .env.local
├── tests/              # Test documentation
└── README.md
```

## API Endpoints

### Public Endpoints

- `POST /api/upload` - Upload photo with name, email, and file
  - Max file size: 5MB
  - Accepted: image/\* types only
  - Returns: success status and filename

### Admin Endpoints (require session)

- `POST /api/admin/login` - Login with email
- `GET /api/admin/session` - Check if logged in
- `POST /api/admin/logout` - End session
- `GET /api/gallery` - Get all photos with metadata and star counts
- `POST /api/admin/star` - Star a photo
- `POST /api/admin/unstar` - Remove star from photo
- `GET /api/leaderboard` - Get photos sorted by stars (starred only)

### Admin HTML Pages

- `GET /admin` - Login page
- `GET /admin/gallery` - Photo gallery with voting interface
- `GET /admin/leaderboard` - Ranked photos display

## Data Storage

### Photo Metadata

Each uploaded photo creates:

1. **Image file**: `uploads/[email]/[timestamp]_[filename]`
2. **Metadata JSON**: `uploads/[email]/[timestamp]_[filename].json`
   ```json
   {
     "name": "John Doe",
     "email": "john@example.com",
     "uploadedAt": "2026-04-02T10:30:00.000Z",
     "filename": "1234567890_photo.jpg"
   }
   ```
3. **Thumbnail**: `uploads/[email]/thumbnails/[timestamp]_[filename]`

### Vote Tracking

Votes stored in `uploads/.stars.json`:

```json
{
  "/uploads/user@example.com/photo.jpg": {
    "count": 5,
    "starredBy": ["admin1@example.com", "admin2@example.com"]
  }
}
```

## Troubleshooting

### "CORS Error" or "Network Error"

✅ **Solution**:

- Ensure both servers are running (web on 3000, server on 3001)
- API URL must use `http://` not `https://`
- Check `.env.local` has correct API URL

### "Cannot connect to server"

✅ **Solution**:

- Start server: `cd server && npm run dev`
- Verify port 3001 is available
- Check server console for startup errors

### Photos not uploading

✅ **Solution**:

- File must be under 5MB
- File must be an image format (jpg, png, gif, webp, etc.)
- Check browser console for validation errors
- Verify `uploads/` directory is writable

### Session/Login issues

✅ **Solution**:

- Clear browser cookies for localhost
- Check server console for session middleware errors
- Restart server to reset all sessions
- Verify express-session is installed

### Web dev server fails to start

✅ **Solution**:

- Remove `output: "export"` from `next.config.js` ✓ (already fixed)
- Install dependencies: `cd web && npm install`
- Check for port 3000 conflicts

## Development

### Server (with auto-reload)

```bash
cd server
npm run dev  # Uses nodemon
```

### Web (with hot reload)

```bash
cd web
npm run dev  # Next.js dev server
```

## Production Build

### Web

```bash
cd web
npm run build
npm start
```

### Server

```bash
cd server
npm start  # Regular node (not nodemon)
```

## Security Notes

⚠️ **Current Implementation** (Development/MVP):

- Session secret should be changed in production
- No rate limiting on uploads
- Email validation is basic
- No admin user management
- Files stored locally (not cloud storage)

🔒 **Before Production**:

- [ ] Change SESSION_SECRET to a secure random value
- [ ] Add proper admin user authentication
- [ ] Implement upload rate limiting
- [ ] Add file scanning for malware
- [ ] Use cloud storage (S3, etc.)
- [ ] Add database for metadata
- [ ] Enable HTTPS
- [ ] Add CSRF protection

## License

MIT

---

**Requested by**: Maarten De Muynck  
**MVP Features**: ✅ Complete

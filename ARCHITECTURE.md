# Application Architecture

## Two Separate Applications

### 1️⃣ Frontoffice (Web - Next.js)

**Port**: 3000  
**Purpose**: User-facing photo upload  
**URL**: http://localhost:3000

**Pages**:

- `/` - Upload form (camera/gallery selection, name/email with localStorage)

**No admin functionality** - purely for end users to upload photos.

---

### 2️⃣ Backoffice (Server - Express)

**Port**: 3001  
**Purpose**: API + Admin UI  
**URL**: http://localhost:3001

**API Endpoints**:

- `POST /api/upload` - Receive photos from frontoffice
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/session` - Check login status
- `POST /api/admin/logout` - End admin session
- `GET /api/gallery` - Get all photos with metadata
- `POST /api/admin/star` - Vote for photo
- `POST /api/admin/unstar` - Remove vote
- `GET /api/leaderboard` - Get ranked photos

**Admin HTML Pages**:

- `/` - Login page (auto-login with localStorage)
- `/gallery` - Photo gallery with voting ⭐
- `/leaderboard` - Ranked photos 🏆
- `/admin/*` - Legacy redirects

**Static Files**:

- `/uploads` - Serve uploaded photos

---

## Data Flow

```
User (Browser)
    ↓
http://localhost:3000 (Frontoffice - Upload Form)
    ↓
POST /api/upload
    ↓
http://localhost:3001 (Backoffice - Save Photo + Metadata)
    ↓
Store in /uploads/[email]/


Admin (Browser)
    ↓
http://localhost:3001 (Backoffice - Auto-login or Login)
    ↓
/gallery (Vote on photos)
    ↓
/leaderboard (View rankings)
```

---

## File Storage Structure

```
server/uploads/
├── .stars.json                    # Vote tracking
├── user1@example.com/
│   ├── 1234567890_photo1.jpg     # Original photo
│   ├── 1234567890_photo1.jpg.json # Metadata
│   └── thumbnails/
│       └── 1234567890_photo1.jpg  # 150x150 thumbnail
└── user2@example.com/
    ├── 1234567891_photo2.jpg
    ├── 1234567891_photo2.jpg.json
    └── thumbnails/
        └── 1234567891_photo2.jpg
```

---

## Why Two Separate Apps?

✅ **Separation of Concerns**

- Frontoffice = User experience (upload)
- Backoffice = Admin management (voting, leaderboard)

✅ **Security**

- User app has no admin access
- Admin functionality isolated on different port

✅ **Scalability**

- Can deploy frontoffice separately (CDN, static hosting)
- Can scale backoffice independently
- Can add authentication/rate limiting per app

✅ **Development**

- Different teams can work independently
- Easier testing and deployment

---

## Quick Reference

| What           | Where                 | Port | URL          |
| -------------- | --------------------- | ---- | ------------ |
| Upload photos  | Frontoffice (Next.js) | 3000 | /            |
| Admin login    | Backoffice (Express)  | 3001 | /            |
| Gallery voting | Backoffice (Express)  | 3001 | /gallery     |
| Leaderboard    | Backoffice (Express)  | 3001 | /leaderboard |
| API endpoints  | Backoffice (Express)  | 3001 | /api/\*      |
| Photo storage  | Backoffice filesystem | -    | /uploads/\*  |

**Remember**: Admins use port **3001**, users use port **3000**.

Frame It — MVP

This repository is an MVP for uploading images with simple metadata collection.

MVP features:
- Web frontend (Next.js) that collects user name, email and a single photo
- Backend (Express) with an upload endpoint to receive images and metadata
- Local client-side caching of name/email is planned
- Limit: a user can upload up to 10 pictures (enforced client-side initially)

Developer notes:
- Run `npm install` in the root to install dev tooling, then `npm run dev` to start both server and web during development.
- Implement multipart uploads on the server (e.g., multer) before accepting files in production.

Structure:
- /server — Express backend
- /web — Next.js frontend
- /tests — placeholder for tests

Requested by: Maarten De Muynck

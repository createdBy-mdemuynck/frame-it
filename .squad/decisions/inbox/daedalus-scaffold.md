Title: Choose Next.js for frontend + Express backend

Decision: For the initial scaffold we choose Next.js for the frontend and Express for the backend. This allows server-side rendering where needed, easy deployment options, and a familiar Node.js stack for the team.

Consequences:
- Use Next.js app in /web
- Use Express app in /server
- Root package.json coordinates dev scripts using concurrently and nodemon

Date: 2026-03-25
Author: Daedalus

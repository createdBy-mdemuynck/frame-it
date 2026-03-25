Skill: project-scaffold

Pattern: Repository bootstrap for Node + Next.js + Express projects.

When to use: When creating a new fullstack app that needs a minimal frontend and backend scaffold with coordinated npm scripts.

What it does:
- Creates top-level package.json with dev scripts to run both frontend and backend concurrently
- Adds minimal Next.js frontend in /web and Express backend in /server
- Adds .gitignore and basic tests/ placeholder

Notes: Keep this pattern lightweight — install dependencies after scaffold is created.

## History

Project: frame-it
Requested by: Maarten De Muynck

Seeded at team creation.

## Learnings
- Scaffolded repository using Next.js (web/) and Express (server/).
- Added coordinated dev scripts in root package.json using concurrently and nodemon.
- Created decision record in .squad/decisions/inbox/daedalus-scaffold.md and a project-scaffold SKILL.

## Learnings (2026-03-25)
- Daedalus confirmed the initial scaffold and artifacts: /web, /server, and root package.json. Decisions were recorded and merged into .squad/decisions.md for team visibility.

## Learnings (2026-04-03)
- **Azure Files Persistent Storage Fix**: Resolved ephemeral file storage issue where uploaded files were lost on container restarts. The Azure Storage Account with File Share was provisioned but not mounted to the Container App.
- **Infrastructure Pattern**: Implemented storage mounting by:
  1. Adding storage configuration to `container-apps-environment.bicep` (storageAccountName, @secure() key, fileShareName)
  2. Supporting volumeMounts in `container-app.bicep`
  3. Passing credentials and mount config via `main.bicep`
  4. Used `resourceId()` with `listKeys()` to avoid BCP181 errors
- **Mount Path Determination**: Analyzed application code (server/index.js) and Dockerfile to identify correct mount point. Initial assumption of `/app/server/uploads` was wrong—correct path is `/app/uploads` based on Express static route configuration.
- **Verification**: Deployed via `azd provision` and confirmed 10GB Azure Files SMB mount at `/app/uploads` using `df -h`.
- **Architectural Choice**: Selected Azure Files mounting over SDK-based approach for Container Apps persistent storage (see decision record).

## Cross-Reference (2026-04-03)
- **Mount Path Validation**: Orion encountered and fixed a regression where the Azure Files mount path had been changed to `/app/server/uploads`. Fix confirmed the original analysis that `/app/uploads` is correct based on Dockerfile WORKDIR. This validates the architectural pattern documented above. See orchestration log `20260403T145522Z-orion.md` for details.


# Environment Configuration Guide

This project uses environment variables to configure the backend API URL across different environments.

## Environment Variables

### Frontend (web/)

- **NEXT_PUBLIC_API_URL**: The URL of the backend API server
  - Development: `http://localhost:3001`
  - Production: Set automatically by Azure Container Apps
  - Docker: Can be overridden with `--env` flag

### Backend (server/)

- **PORT**: The port the server listens on (default: 3001)
- **NODE_ENV**: Environment mode (development/production)
- **SESSION_SECRET**: Secret for session management

## Usage

### Local Development

The `.env.local` file is used automatically:

```bash
cd web
npm run dev  # Uses http://localhost:3001
```

### Docker Development

Build with environment variable:

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 -t frame-it-web ./web
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://localhost:3001 frame-it-web
```

### Azure Production

The environment variable is set in the Bicep infrastructure:

- Automatically configured during `azd up`
- Points to internal Container Apps URL
- No manual configuration needed

### Custom Environments

Create a new `.env.{environment}` file:

```bash
# .env.staging
NEXT_PUBLIC_API_URL=https://api-staging.yourdomain.com
```

Then build for that environment:

```bash
NODE_ENV=staging npm run build
```

## Verifying Configuration

Check the current API URL in your browser console:

1. Open the application
2. Open browser DevTools (F12)
3. Check the console for: "API_BASE configured as: ..."

## Troubleshooting

### "Cannot connect to server" error

- Verify backend is running: `curl http://localhost:3001/health`
- Check NEXT_PUBLIC_API_URL value in browser console
- Ensure the URL is accessible from the frontend container

### Wrong API URL in production

- Check Azure environment: `azd env get-values`
- Verify Container App env vars: `az containerapp show ...`
- Redeploy: `azd deploy`

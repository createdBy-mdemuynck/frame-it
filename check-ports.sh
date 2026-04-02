#!/bin/bash

echo "🔍 Checking server ports..."
echo ""

# Check if something is running on port 3000
echo "Port 3000 (should be Next.js web app):"
curl -s http://localhost:3000 > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running"

# Check if something is running on port 3001
echo ""
echo "Port 3001 (should be Express backend):"
curl -s http://localhost:3001/health > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running"

echo ""
echo "🧪 Testing backend health endpoint..."
curl -s http://localhost:3001/health 2>&1

echo ""
echo ""
echo "📋 To fix port conflicts:"
echo "1. Kill any process on port 3001: npx kill-port 3001"
echo "2. Start backend: cd server && npm run dev"
echo "3. Start frontend: cd web && npm run dev"

# Base image
FROM node:20-alpine

# Install dependencies for Sharp (image processing)
RUN apk add --no-cache \
    vips-dev \
    fftw-dev \
    build-base \
    python3 \
    pkgconfig

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies and rebuild Sharp for Alpine
RUN npm ci --only=production && \
    npm rebuild sharp

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p uploads/tmp

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "index.js"]

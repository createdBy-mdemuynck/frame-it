# Use the official Node.js image as the base image
FROM node:current-alpine3.23 as builder

# Set the working directory in the container
WORKDIR /usr/src/app

# Set production environment
ENV NODE_ENV=production

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies (npm ci is faster and more reliable than npm install)
RUN npm ci --ignore-scripts

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Use a lightweight web server for serving static files
FROM nginx:alpine

# Make Nginx listen on port 8080 (Cloud Run expects servers to bind to $PORT, commonly 8080)
RUN rm /etc/nginx/conf.d/default.conf
RUN printf '%s\n' \
	'server {' \
	'    listen 8080;' \
	'    server_name _;' \
	'    root /usr/share/nginx/html;' \
	'    location / {' \
	'        try_files $uri $uri/ =404;' \
	'    }' \
	'}' > /etc/nginx/conf.d/default.conf

# Copy the exported static site to Nginx html directory
COPY --from=builder /usr/src/app/out /usr/share/nginx/html

# Expose the port the app runs on
EXPOSE 8080

# Start the Nginx server
CMD ["nginx", "-g", "daemon off;"]
# Use the official Node.js image as the base image
FROM node:current-alpine3.23 as builder

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./


# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Fix permissions for node_modules/.bin (helps on Windows hosts)
RUN chmod -R 755 node_modules/.bin


# Build and export the Next.js static site
RUN npm run build

# Use a lightweight web server for serving static files
FROM nginx:alpine


# Copy the exported static site to Nginx html directory
COPY --from=builder /usr/src/app/out /usr/share/nginx/html

# Expose the port the app runs on
EXPOSE 80

# Start the Nginx server
CMD ["nginx", "-g", "daemon off;"]
# Use Node.js LTS as the base image

FROM node:lts

# Set the working directory

WORKDIR /usr/src/app

# Copy package.json and package-lock.json

COPY package.json package-lock.json ./

# Install dependencies

RUN npm install

# Copy the rest of the application code

COPY . .

# Expose the port the app runs on (Cloud Run uses 8080)

ENV PORT=8080
EXPOSE 8080

# Start the application

CMD ["node", "index.js"]

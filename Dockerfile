# Use the official Node.js 18 image as the base image
# Using debian-slim instead of alpine for better sharp/libvips support
FROM node:18-slim

# Install dependencies for sharp (including AVIF support)
RUN apt-get update && apt-get install -y \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Command to run the application
CMD ["npm", "start"]
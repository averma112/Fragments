##############################
# Stage 1: Dependencies Build
##############################
FROM node:18-slim AS dependencies

# Install build dependencies for sharp
RUN apt-get update && apt-get install -y \
    build-essential \
    libvips-dev \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for building)
RUN npm ci --include=dev

##############################
# Stage 2: Production Build
##############################
FROM node:18-slim AS production

# Install only runtime dependencies for sharp
RUN apt-get update && apt-get install -y \
    libvips \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY src ./src

# Copy healthcheck script
COPY src/healthcheck.js ./

# Create non-root user for security
RUN groupadd -r fragments && useradd -r -g fragments fragments \
    && chown -R fragments:fragments /app

USER fragments

# Expose port
EXPOSE 8080

# Set production environment
ENV NODE_ENV=production \
    PORT=8080

# Health check using the healthcheck script
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node healthcheck.js || exit 1

# Start the application
CMD ["node", "src/index.js"]
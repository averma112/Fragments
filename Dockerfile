# Stage 1: Build
FROM node:24.7.0-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm install     # Installs all dependencies (including devDeps)
COPY ./src ./src
COPY ./tests/.htpasswd ./tests/.htpasswd

# Stage 2: Production
FROM node:24.7.0-slim

WORKDIR /app

# Only copy required production files from the build stage
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules  
COPY --from=build /app/src ./src
COPY --from=build /app/tests/.htpasswd ./tests/.htpasswd

ENV NODE_ENV=production
ENV PORT=8080

# Use a non-root user for security
RUN useradd -m appuser
USER appuser

CMD ["npm", "start"]
EXPOSE 8080

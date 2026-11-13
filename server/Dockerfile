# ====================================================================
# MAAREE 360 - Production Backend Dockerfile
# Multi-stage, minimal attack surface, non-root user, health checked
# ====================================================================

# Stage 1: Build & TypeScript compilation
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install build dependencies if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency manifests
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma Client for Linux
RUN npx prisma generate

# Copy source code and build config
COPY tsconfig.json ./
COPY src ./src/

# Compile TypeScript to dist/
RUN npm run build

# Stage 2: Production runtime image
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

# Install runtime dependencies: OpenSSL (required by Prisma engine) and curl (for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root application user and group
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -s /bin/bash -m nodejs

# Copy package manifests and install production-only dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev && \
    npx prisma generate && \
    npm cache clean --force

# Copy compiled JavaScript from builder stage
COPY --from=builder /app/dist ./dist

# Copy entrypoint script and ensure executable permissions
COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# Create media directories for uploads and local product catalogue
RUN mkdir -p /app/uploads /app/products && \
    chown -R nodejs:nodejs /app

# Switch to unprivileged non-root user
USER nodejs

# Expose backend API port
EXPOSE 5001

# Container Healthcheck verifying /api/v1/health responds
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5001/api/v1/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]

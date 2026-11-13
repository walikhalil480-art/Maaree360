# ====================================================================
# MAAREE 360 - Production Frontend Dockerfile
# Multi-stage: Node.js Vite build -> Minimal Nginx Alpine runtime
# ====================================================================

# Stage 1: Build the React SPA
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY package.json package-lock.json ./

# Install dependencies deterministically
RUN npm ci

# Copy client source files
COPY index.html vite.config.ts tsconfig*.json ./
COPY public ./public/
COPY src ./src/

# Compile production bundle
RUN npm run build

# Stage 2: Serve via Nginx
FROM nginx:1.27-alpine AS runner

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy custom reverse proxy & SPA nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production bundle from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

# Healthcheck testing the /healthz endpoint
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:80/healthz || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]

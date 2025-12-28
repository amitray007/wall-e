# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build arguments for Vite (embedded at build time)
ARG VITE_UMAMI_URL
ARG VITE_UMAMI_ID
ARG VITE_ENABLE_ANALYTICS

# Make build args available as env vars during build
ENV VITE_UMAMI_URL=$VITE_UMAMI_URL
ENV VITE_UMAMI_ID=$VITE_UMAMI_ID
ENV VITE_ENABLE_ANALYTICS=$VITE_ENABLE_ANALYTICS

# Build the application
RUN npm run build

# Production stage with Caddy
FROM caddy:alpine AS production

# Copy built assets from builder stage
COPY --from=builder /app/dist /srv

# Copy Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# Expose port 80
EXPOSE 80

# Caddy runs automatically

# ==================== Multi-stage Dockerfile for Next.js 16 (React 19.2) ====================
# Optimized for production deployment with Docker networking support

# ==================== Stage 1: Dependencies ====================
FROM node:20-alpine AS deps

# Install system dependencies
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package manifests
COPY package.json package-lock.json* ./

# Install dependencies (use ci for faster, reproducible builds)
RUN npm ci --legacy-peer-deps

# ==================== Stage 2: Builder ====================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all application source code
COPY . .

# CRITICAL: Set build-time environment variables
# NEXT_PUBLIC_* vars MUST be set at build time to be embedded in client bundle
# NOTE: For production, use API domain. For local dev, override with build arg.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Default to production API URL, can be overridden with --build-arg
ARG NEXT_PUBLIC_API_URL=https://api.canhnq.online/api
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build Next.js application
# This creates .next/standalone for production
RUN npm run build

# ==================== Stage 3: Production Runner ====================
FROM node:20-alpine AS runner

WORKDIR /app

# Install system utilities
RUN apk add --no-cache \
    tzdata \
    wget \
    && cp /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime \
    && echo "Asia/Ho_Chi_Minh" > /etc/timezone \
    && apk del tzdata

# Set runtime environment variables
ENV TZ=Asia/Ho_Chi_Minh
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Create non-root user for security
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Copy production build artifacts from builder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose application port
EXPOSE 3000

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start Next.js standalone server
CMD ["node", "server.js"]

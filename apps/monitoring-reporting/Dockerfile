# ─── Stage 1: Install & Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY apps/monitoring-reporting/package.json ./apps/monitoring-reporting/
RUN npm ci

# Copy prisma schema & config, then generate the client
COPY apps/monitoring-reporting/prisma/ ./apps/monitoring-reporting/prisma/
COPY apps/monitoring-reporting/prisma.config.ts ./apps/monitoring-reporting/
RUN npx prisma generate --config=apps/monitoring-reporting/prisma.config.ts

# Copy source needed for the build
COPY nx.json tsconfig.base.json ./
COPY apps/monitoring-reporting/ ./apps/monitoring-reporting/

# Build with Nx + esbuild
RUN npx nx run @vistone-server/monitoring-reporting:build:production

# ─── Stage 2: Production Image ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3007

# Copy the bundled output
COPY --from=builder /app/apps/monitoring-reporting/dist ./dist

# Copy Prisma engine binaries (required at runtime)
COPY --from=builder /app/node_modules/.prisma/monitoring-client ./node_modules/.prisma/monitoring-client
COPY --from=builder /app/apps/monitoring-reporting/prisma/ ./prisma/

# Install only production dependencies for the dist bundle
COPY --from=builder /app/apps/monitoring-reporting/dist/package.json ./
RUN npm install --omit=dev --ignore-scripts 2>/dev/null || true

EXPOSE 3007

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3007/ || exit 1

CMD ["node", "dist/main.js"]

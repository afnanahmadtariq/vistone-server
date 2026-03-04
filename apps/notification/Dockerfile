# ─── Stage 1: Install & Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY apps/notification/package.json ./apps/notification/
RUN npm ci

# Copy prisma schema & config, then generate the client
COPY apps/notification/prisma/ ./apps/notification/prisma/
COPY apps/notification/prisma.config.ts ./apps/notification/
RUN npx prisma generate --config=apps/notification/prisma.config.ts

# Copy source needed for the build
COPY nx.json tsconfig.base.json ./
COPY apps/notification/ ./apps/notification/

# Build with Nx + esbuild
RUN npx nx run @vistone-server/notification:build:production

# ─── Stage 2: Production Image ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3008

# Copy the bundled output
COPY --from=builder /app/apps/notification/dist ./dist

# Copy Prisma engine binaries (required at runtime)
COPY --from=builder /app/node_modules/.prisma/notification-client ./node_modules/.prisma/notification-client
COPY --from=builder /app/apps/notification/prisma/ ./prisma/

# Install only production dependencies for the dist bundle
COPY --from=builder /app/apps/notification/dist/package.json ./
RUN npm install --omit=dev --ignore-scripts 2>/dev/null || true

EXPOSE 3008

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3008/ || exit 1

CMD ["node", "dist/main.js"]

# ─── Stage 1: Install & Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY apps/client-management/package.json ./apps/client-management/
RUN npm ci

# Copy prisma schema & config, then generate the client
COPY apps/client-management/prisma/ ./apps/client-management/prisma/
COPY apps/client-management/prisma.config.ts ./apps/client-management/
RUN npx prisma generate --config=apps/client-management/prisma.config.ts

# Copy source needed for the build
COPY nx.json tsconfig.base.json ./
COPY apps/client-management/ ./apps/client-management/

# Build with Nx + esbuild
RUN npx nx run @vistone-server/client-management:build:production

# ─── Stage 2: Production Image ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3004

# Copy the bundled output
COPY --from=builder /app/apps/client-management/dist ./dist

# Copy Prisma engine binaries (required at runtime)
COPY --from=builder /app/node_modules/.prisma/client-mgmt-client ./node_modules/.prisma/client-mgmt-client
COPY --from=builder /app/apps/client-management/prisma/ ./prisma/

# Install only production dependencies for the dist bundle
COPY --from=builder /app/apps/client-management/dist/package.json ./
RUN npm install --omit=dev --ignore-scripts 2>/dev/null || true

EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3004/health || exit 1

CMD ["node", "dist/main.js"]

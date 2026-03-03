# ─── Stage 1: Install & Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY apps/knowledge-hub/package.json ./apps/knowledge-hub/
RUN npm ci

# Copy prisma schema & config, then generate the client
COPY apps/knowledge-hub/prisma/ ./apps/knowledge-hub/prisma/
COPY apps/knowledge-hub/prisma.config.ts ./apps/knowledge-hub/
RUN npx prisma generate --config=apps/knowledge-hub/prisma.config.ts

# Copy source needed for the build
COPY nx.json tsconfig.base.json ./
COPY apps/knowledge-hub/ ./apps/knowledge-hub/

# Build with Nx + esbuild
RUN npx nx run @vistone-server/knowledge-hub:build:production

# ─── Stage 2: Production Image ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3005

# Copy the bundled output
COPY --from=builder /app/apps/knowledge-hub/dist ./dist

# Copy Prisma engine binaries (required at runtime)
COPY --from=builder /app/node_modules/.prisma/knowledge-client ./node_modules/.prisma/knowledge-client
COPY --from=builder /app/apps/knowledge-hub/prisma/ ./prisma/

# Install only production dependencies for the dist bundle
COPY --from=builder /app/apps/knowledge-hub/dist/package.json ./
RUN npm install --omit=dev --ignore-scripts 2>/dev/null || true

EXPOSE 3005

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3005/health || exit 1

CMD ["node", "dist/main.js"]

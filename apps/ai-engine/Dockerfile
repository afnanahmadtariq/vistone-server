# ─── Stage 1: Install & Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY apps/ai-engine/package.json ./apps/ai-engine/
RUN npm ci

# Copy prisma schema & config, then generate the client
COPY apps/ai-engine/prisma/ ./apps/ai-engine/prisma/
COPY apps/ai-engine/prisma.config.ts ./apps/ai-engine/
RUN npx prisma generate --config=apps/ai-engine/prisma.config.ts

# Copy source needed for the build
COPY nx.json tsconfig.base.json ./
COPY apps/ai-engine/ ./apps/ai-engine/

# Build with Nx + esbuild
RUN npx nx run @vistone-server/ai-engine:build:production

# ─── Stage 2: Production Image ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3009

# Copy the bundled output
COPY --from=builder /app/apps/ai-engine/dist ./dist

# Copy Prisma engine binaries (required at runtime)
COPY --from=builder /app/node_modules/.prisma/ai-engine-client ./node_modules/.prisma/ai-engine-client
COPY --from=builder /app/apps/ai-engine/prisma/ ./prisma/

# Install only production dependencies for the dist bundle
COPY --from=builder /app/apps/ai-engine/dist/package.json ./
RUN npm install --omit=dev --ignore-scripts 2>/dev/null || true

EXPOSE 3009

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3009/ || exit 1

CMD ["node", "dist/main.js"]

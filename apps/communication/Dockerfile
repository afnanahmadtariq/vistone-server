# ─── Stage 1: Install & Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY apps/communication/package.json ./apps/communication/
RUN npm ci

# Copy prisma schema & config, then generate the client
COPY apps/communication/prisma/ ./apps/communication/prisma/
COPY apps/communication/prisma.config.ts ./apps/communication/
RUN npx prisma generate --config=apps/communication/prisma.config.ts

# Copy source needed for the build
COPY nx.json tsconfig.base.json ./
COPY apps/communication/ ./apps/communication/

# Build with Nx + esbuild
RUN npx nx run @vistone-server/communication:build:production

# ─── Stage 2: Production Image ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3006

# Copy the bundled output
COPY --from=builder /app/apps/communication/dist ./dist

# Copy Prisma engine binaries (required at runtime)
COPY --from=builder /app/node_modules/.prisma/communication-client ./node_modules/.prisma/communication-client
COPY --from=builder /app/apps/communication/prisma/ ./prisma/

# Install only production dependencies for the dist bundle
COPY --from=builder /app/apps/communication/dist/package.json ./
RUN npm install --omit=dev --ignore-scripts 2>/dev/null || true

EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3006/health || exit 1

CMD ["node", "dist/main.js"]

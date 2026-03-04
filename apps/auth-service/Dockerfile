# ─── Stage 1: Install & Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY apps/auth-service/package.json ./apps/auth-service/
RUN npm ci

# Copy prisma schema & config, then generate the client
COPY apps/auth-service/prisma/ ./apps/auth-service/prisma/
COPY apps/auth-service/prisma.config.ts ./apps/auth-service/
RUN npx prisma generate --config=apps/auth-service/prisma.config.ts

# Copy source needed for the build
COPY nx.json tsconfig.base.json ./
COPY apps/auth-service/ ./apps/auth-service/

# Build with Nx + esbuild
RUN npx nx run @vistone-server/auth-service:build:production

# ─── Stage 2: Production Image ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

# Copy the bundled output
COPY --from=builder /app/apps/auth-service/dist ./dist

# Copy Prisma engine binaries (required at runtime)
COPY --from=builder /app/node_modules/.prisma/auth-client ./node_modules/.prisma/auth-client
COPY --from=builder /app/apps/auth-service/prisma/ ./prisma/

# Install only production dependencies for the dist bundle
COPY --from=builder /app/apps/auth-service/dist/package.json ./
RUN npm install --omit=dev --ignore-scripts 2>/dev/null || true

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/main.js"]

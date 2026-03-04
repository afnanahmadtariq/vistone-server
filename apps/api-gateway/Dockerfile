# ─── Stage 1: Install & Build ────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
COPY apps/api-gateway/package.json ./apps/api-gateway/
RUN npm ci --ignore-scripts

# Copy source needed for the build
COPY nx.json tsconfig.base.json ./
COPY apps/api-gateway/ ./apps/api-gateway/

# Build with Nx + esbuild
RUN npx nx run @vistone-server/api-gateway:build:production

# ─── Stage 2: Production Image ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4000

# Copy the bundled output
COPY --from=builder /app/apps/api-gateway/dist ./dist

# Install only production dependencies for the dist bundle
COPY --from=builder /app/apps/api-gateway/dist/package.json ./
RUN npm install --omit=dev --ignore-scripts 2>/dev/null || true

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "dist/main.js"]

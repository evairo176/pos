# ---------- Builder ----------
FROM node:20-slim AS builder
WORKDIR /app

# Copy monorepo manifests for workspace install
COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/auth-service/package.json ./services/auth-service/

# Install all workspace deps (devDeps needed for build)
RUN npm install --workspaces --include-workspace-root

# Copy source
COPY prisma ./prisma
COPY packages/shared ./packages/shared
COPY services/auth-service ./services/auth-service

# Build shared first, then service (prisma generate + tsc)
RUN npm run build -w @pos/shared
RUN npm run build -w auth-service

# ---------- Runner ----------
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/services/auth-service ./services/auth-service

WORKDIR /app/services/auth-service
EXPOSE 3001
CMD ["node", "dist/server.js"]

# ---------- Builder ----------
FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/tenant-service/package.json ./services/tenant-service/

RUN npm install --workspaces --include-workspace-root

COPY prisma ./prisma
COPY packages/shared ./packages/shared
COPY services/tenant-service ./services/tenant-service

RUN npm run build -w @pos/shared
RUN npm run build -w tenant-service

# ---------- Runner ----------
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/services/tenant-service ./services/tenant-service

WORKDIR /app/services/tenant-service
EXPOSE 3002
# Run migrations (prisma db push) then start. Using db push for Phase 1 simplicity.
CMD ["sh", "-c", "npx prisma db push --schema=../../prisma/schema.prisma --accept-data-loss && node dist/server.js"]

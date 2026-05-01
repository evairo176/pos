# ---------- Builder ----------
FROM node:20 AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY services/pos-service/package.json ./services/pos-service/

RUN npm install --workspaces --include-workspace-root

COPY prisma ./prisma
COPY packages/shared ./packages/shared
COPY services/pos-service ./services/pos-service

RUN npm run build -w @pos/shared
RUN npm run build -w pos-service

# ---------- Runner ----------
FROM node:20 AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install OpenSSL for Prisma compatibility
RUN apt-get update -y && apt-get install -y openssl libssl-dev

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/services/pos-service ./services/pos-service

WORKDIR /app/services/pos-service
EXPOSE 3004
CMD ["node", "dist/server.js"]

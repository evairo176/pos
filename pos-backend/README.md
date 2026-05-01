# POS Multitenant — Backend (Phase 1: Foundation)

Monorepo microservice backend untuk POS Multitenant. Phase 1 mencakup:

- **Auth Service** (3001): register, login, refresh, logout, me, forgot/reset password, switch-tenant
- **Tenant Service** (3002): CRUD tenants, outlets, invite user, schema provisioning
- **Shared package** (`@pos/shared`): middleware JWT, tenant, RBAC, validate, rate-limit, error
- **PostgreSQL multi-schema**: `public` (shared) + `tenant_<id>` (per tenant, dibuat dinamis via SQL)
- **Redis**: refresh token store, reset/invite tokens, rate-limit store
- **Nginx**: API Gateway reverse proxy
- **Docker Compose**: orkestrasi dev

## Struktur

```
pos-backend/
├── docker-compose.yml
├── nginx/nginx.conf
├── prisma/
│   ├── schema.prisma          # Shared Prisma schema (public)
│   ├── tenant-schema.sql      # DDL template untuk setiap tenant_<id>
│   └── seed.sql               # Optional seed plans
├── packages/shared/           # @pos/shared
│   └── src/
│       ├── middleware/        # auth, tenant, rbac, validate, rateLimit, error
│       ├── utils/             # logger, response, errors, jwt, redis
│       └── types/
└── services/
    ├── auth-service/          # Express 3001
    └── tenant-service/        # Express 3002
```

## Prasyarat

- Node.js >= 20
- Docker + Docker Compose
- (opsional) Postgres & Redis lokal jika tidak pakai Docker

## Setup

```bash
cd pos-backend
cp .env.example .env
# Edit JWT_SECRET menjadi string panjang random
```

## Menjalankan (Docker)

```bash
# Build + start semua service
npm run docker:up

# Cek log
npm run docker:logs

# Stop
npm run docker:down
```

Setelah up, endpoint tersedia:

- Gateway (Nginx): `http://localhost:8080`
- Auth Service direct: `http://localhost:3001`
- Tenant Service direct: `http://localhost:3002`
- Health gateway: `GET http://localhost:8080/health`

## Menjalankan (Lokal, tanpa Docker)

```bash
npm install
# Start Postgres + Redis lokal (atau `docker compose up -d postgres redis`)

# Generate prisma client + push schema
npm run prisma:generate
(cd services/tenant-service && npm run prisma:push)

# Jalankan service (2 terminal)
npm run dev:tenant
npm run dev:auth
```

## Verifikasi Phase 1

### 1. Register tenant baru

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "John Doe",
    "email": "john@example.com",
    "password": "secret123",
    "business_name": "Toko ABC",
    "business_slug": "toko-abc"
  }'
```

Response: `{ success: true, data: { user, tenant, accessToken, refreshToken } }`.

Cek di Postgres:

```sql
\dn                                  -- ada schema `tenant_<hex>` baru
SELECT * FROM public.tenants;
SELECT * FROM public.tenant_users;
SELECT * FROM tenant_<hex>.outlets;  -- Main Outlet sudah terseed
```

### 2. Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"secret123"}'
```

### 3. Get current user (authenticated)

```bash
TOKEN="<access_token>"
curl http://localhost:8080/api/auth/me -H "Authorization: Bearer $TOKEN"
```

### 4. List outlets (tenant-scoped)

```bash
curl http://localhost:8080/api/outlets -H "Authorization: Bearer $TOKEN"
```

### 5. Create outlet (owner/manager only)

```bash
curl -X POST http://localhost:8080/api/outlets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Branch 2","address":"Jl. Merdeka 123"}'
```

### 6. Refresh token

```bash
curl -X POST http://localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"<refresh_token>"}'
```

### 7. Invite user ke tenant

```bash
TENANT_ID="<tenant_uuid>"
curl -X POST http://localhost:8080/api/tenants/$TENANT_ID/invite \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@example.com","role":"manager"}'
```

## Multitenancy — How it Works

- **Identifikasi tenant**: dari `active_tenant` di JWT, atau header `X-Tenant-Id`.
- **Provisioning**: `auth-service.register` memanggil internal endpoint `POST /internal/tenants/provision` di `tenant-service`, yang:
  1. Insert row di `public.tenants` (schema_name='pending')
  2. `CREATE SCHEMA tenant_<hex>`
  3. Execute `prisma/tenant-schema.sql` di schema tersebut (outlets, products, transactions, dll.)
  4. Seed default payment methods + Main Outlet
  5. Update `tenants.schema_name`, create `tenant_users` membership (owner), create `subscriptions` (trial 14d)
- **Query tenant-scoped**: service-service gunakan `withTenantSchema(schema, tx => ...)` yang `SET LOCAL search_path` di dalam transaksi.
- **Rollback aman**: jika provisioning gagal, schema di-DROP dan row tenant dihapus.

## Swagger / OpenAPI

Setiap service menyediakan dokumentasi interaktif Swagger UI:

- **Auth Service**: `http://localhost:8080/api/auth/docs`
- **Tenant Service**: `http://localhost:8080/api/tenants/docs`
- **Product Service**: `http://localhost:8080/api/products/docs`

Gunakan tombol **Authorize** di Swagger UI untuk memasukkan `Bearer <access_token>` saat mencoba endpoint yang memerlukan autentikasi.

## API Summary (Phase 1 & 2)

### Auth Service

| Method | Path                         | Auth | Notes                  |
| ------ | ---------------------------- | ---- | ---------------------- |
| POST   | `/api/auth/register`         | -    | Register owner + tenant |
| POST   | `/api/auth/login`            | -    |                        |
| POST   | `/api/auth/refresh`          | -    | Body: `refresh_token`  |
| POST   | `/api/auth/logout`           | -    | Body: `refresh_token`  |
| POST   | `/api/auth/forgot-password`  | -    |                        |
| POST   | `/api/auth/reset-password`   | -    |                        |
| GET    | `/api/auth/me`               | ✅   |                        |
| POST   | `/api/auth/switch-tenant`    | ✅   | Body: `tenant_id`      |

### Tenant Service

| Method | Path                             | Auth | Role              |
| ------ | -------------------------------- | ---- | ----------------- |
| GET    | `/api/tenants`                   | ✅   | super_admin       |
| GET    | `/api/tenants/:id`               | ✅   | member/super      |
| PUT    | `/api/tenants/:id`               | ✅   | owner/super       |
| POST   | `/api/tenants/:id/invite`        | ✅   | owner/manager     |
| GET    | `/api/outlets`                   | ✅   | any member        |
| GET    | `/api/outlets/:id`               | ✅   | any member        |
| POST   | `/api/outlets`                   | ✅   | owner/manager     |
| PUT    | `/api/outlets/:id`               | ✅   | owner/manager     |
| DELETE | `/api/outlets/:id`               | ✅   | owner             |
| POST   | `/internal/tenants/provision`    | -    | internal key      |

### Product Service

| Method | Path                         | Auth | Notes                  |
| ------ | ---------------------------- | ---- | ---------------------- |
| GET    | `/api/products`              | ✓    | List (paginated)        |
| GET    | `/api/products/:id`          | ✓    | Get by ID               |
| POST   | `/api/products`              | ✓    | Create                 |
| PUT    | `/api/products/:id`          | ✓    | Update                 |
| DELETE | `/api/products/:id`          | ✓    | Delete                 |
| GET    | `/api/categories`            | ✓    | List (paginated)        |
| GET    | `/api/categories/:id`        | ✓    | Get by ID               |
| POST   | `/api/categories`            | ✓    | Create                 |
| PUT    | `/api/categories/:id`        | ✓    | Update                 |
| DELETE | `/api/categories/:id`        | ✓    | Delete                 |
| GET    | `/api/stock/:outletId`       | ✓    | Get stock by outlet     |
| POST   | `/api/stock/adjust`          | ✓    | Adjust stock            |
| POST   | `/api/stock/transfer`        | ✓    | Transfer stock          |

## Catatan Teknikal

- **Prisma multi-schema**: hanya `public` dikelola Prisma. Schema tenant dibuat via raw SQL supaya dinamis. Prisma 5 `multiSchema` preview dipakai.
- **Refresh token rotation**: tiap refresh, jti lama dihapus di Redis, jti baru di-store. Mencegah replay.
- **Rate limiting**: Redis-backed, per endpoint. Auth: 20 req/min, Login: 10 req/min.
- **Password reset**: token sementara disimpan di Redis (1 jam TTL). Notification service akan kirim email di Phase selanjutnya; untuk sekarang token di-log.

## Pending / Next Phases

- POS service (transactions, cart, payment, receipt)
- Report service (analytics, export)
- Notification service (email, push)
- Migration strategy untuk mengubah `tenant-schema.sql` dan propagate ke semua `tenant_*` schemas (belum diimplementasi)
- Production-grade migrations (Prisma migrate deploy + tenant DDL versioning)
- Email integration untuk invite & password reset

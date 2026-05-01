# PRD - POS (Point of Sale) Multitenant

## 1. Overview

### 1.1 Product Name
**POS Multitenant System**

### 1.2 Deskripsi
Sistem Point of Sale berbasis web yang mendukung arsitektur multitenant, memungkinkan banyak bisnis (tenant) menggunakan satu platform POS yang sama dengan data terisolasi. Setiap tenant memiliki konfigurasi, produk, karyawan, dan transaksi masing-masing.

### 1.3 Goals
- Menyediakan platform POS yang scalable untuk banyak tenant
- Isolasi data antar tenant (keamanan & privasi)
- Real-time inventory tracking
- Manajemen transaksi penjualan yang cepat dan efisien
- Dashboard analytics per tenant
- Mendukung multi-outlet per tenant

### 1.4 Target User
- **Super Admin**: Mengelola seluruh tenant & platform
- **Tenant Admin (Owner)**: Pemilik bisnis yang mendaftar
- **Manager**: Mengelola outlet, produk, karyawan dalam satu tenant
- **Cashier**: Melakukan transaksi penjualan

---

## 2. Tech Stack

### 2.1 Frontend
| Teknologi | Fungsi |
|-----------|--------|
| React + Vite | UI Framework & Build Tool |
| TanStack Router | Client-side routing |
| shadcn/ui | UI Component Library |
| TanStack Query | Server state management & data fetching |
| Zustand | Client state management |

### 2.2 Backend
| Teknologi | Fungsi |
|-----------|--------|
| Express.js (TypeScript) | API Framework |
| JWT (jsonwebtoken) | Authentication & Authorization |
| Redis | Caching, session management, rate limiting |
| PostgreSQL | Primary database |
| Prisma | ORM |

### 2.3 Environment
| Teknologi | Fungsi |
|-----------|--------|
| Docker | Containerization |
| Docker Compose | Orchestration (dev) |
| Microservice Architecture | Service separation |
| Nginx | API Gateway / Reverse Proxy |
| RabbitMQ / Bull (Redis) | Message Queue (async tasks) |

---

## 3. Arsitektur Microservice

```
                        ┌──────────────┐
                        │   Nginx      │
                        │  (Gateway)   │
                        └──────┬───────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                      │
   ┌─────▼──────┐     ┌───────▼───────┐    ┌────────▼────────┐
   │  Auth       │     │  Tenant       │    │  POS            │
   │  Service    │     │  Service      │    │  Service        │
   │             │     │               │    │                 │
   │ - Login     │     │ - CRUD Tenant │    │ - Transactions  │
   │ - Register  │     │ - Subscription│    │ - Cart          │
   │ - JWT       │     │ - Outlets     │    │ - Payments      │
   │ - Refresh   │     │               │    │ - Receipts      │
   └─────┬───────┘     └───────┬───────┘    └────────┬────────┘
         │                     │                      │
         │              ┌──────▼───────┐              │
         │              │  Product     │              │
         │              │  Service     │              │
         │              │              │              │
         │              │ - CRUD Items │              │
         │              │ - Categories │              │
         │              │ - Stock      │              │
         │              └──────┬───────┘              │
         │                     │                      │
   ┌─────▼─────────────────────▼──────────────────────▼───┐
   │                    PostgreSQL                         │
   │                    (per-schema multitenant)           │
   └──────────────────────────┬───────────────────────────┘
                              │
                        ┌─────▼──────┐
                        │   Redis    │
                        │  (Cache)   │
                        └────────────┘
```

### 3.1 Services

| Service | Port | Deskripsi |
|---------|------|-----------|
| **auth-service** | 3001 | Registrasi, login, JWT, refresh token, RBAC |
| **tenant-service** | 3002 | Manajemen tenant, subscription, outlet |
| **product-service** | 3003 | CRUD produk, kategori, stock management |
| **pos-service** | 3004 | Transaksi, cart, payment, receipt |
| **report-service** | 3005 | Analytics, laporan penjualan, export |
| **notification-service** | 3006 | Email, push notification (low stock, etc) |

---

## 4. Multitenant Strategy

**Pendekatan: Schema-based Multitenancy (PostgreSQL)**

- Setiap tenant mendapat schema terpisah di satu database
- Shared tables (tenants, subscriptions, users_global) di schema `public`
- Tenant-specific tables (products, transactions, dll) di schema `tenant_{id}`
- Middleware mengidentifikasi tenant dari JWT payload atau subdomain

```
Database: pos_multitenant
├── public (shared)
│   ├── tenants
│   ├── subscriptions
│   ├── plans
│   └── users_global
├── tenant_1
│   ├── users
│   ├── outlets
│   ├── categories
│   ├── products
│   ├── transactions
│   └── ...
├── tenant_2
│   ├── users
│   ├── outlets
│   ├── ...
```

---

## 5. Fitur & Modul

### 5.1 Super Admin Panel
- [ ] Dashboard overview semua tenant
- [ ] CRUD tenant
- [ ] Manajemen subscription & billing
- [ ] Manajemen plan (Free, Pro, Enterprise)
- [ ] System monitoring & logs

### 5.2 Auth & User Management
- [ ] Register tenant (owner)
- [ ] Login / Logout
- [ ] JWT Access Token + Refresh Token
- [ ] Role-Based Access Control (RBAC)
- [ ] Invite karyawan (via email)
- [ ] Reset password
- [ ] Profile management

### 5.3 Tenant Management
- [ ] Tenant profile & settings
- [ ] Multi-outlet support
- [ ] Outlet CRUD (nama, alamat, jam operasional)
- [ ] Tax settings per outlet
- [ ] Receipt template customization

### 5.4 Product Management
- [ ] Kategori produk (nested categories)
- [ ] CRUD produk (nama, SKU, harga, gambar, barcode)
- [ ] Variant produk (size, color, dll)
- [ ] Stock management per outlet
- [ ] Stock transfer antar outlet
- [ ] Low stock alert
- [ ] Bulk import/export (CSV)

### 5.5 POS / Kasir
- [ ] Antarmuka kasir (optimized for speed)
- [ ] Pencarian produk (nama, SKU, barcode)
- [ ] Barcode scanner support
- [ ] Cart management (add, remove, qty, discount)
- [ ] Multiple payment methods (Cash, Card, QRIS, Split)
- [ ] Diskon per item & per transaksi
- [ ] Hold & recall transaction
- [ ] Print receipt (thermal printer)
- [ ] Refund & void transaction
- [ ] Open/close shift (cash drawer)

### 5.6 Customer Management
- [ ] CRUD customer
- [ ] Customer loyalty points
- [ ] Riwayat transaksi per customer
- [ ] Member pricing

### 5.7 Report & Analytics
- [ ] Dashboard penjualan (harian, mingguan, bulanan)
- [ ] Laporan per produk, per kategori
- [ ] Laporan per kasir
- [ ] Laporan per outlet
- [ ] Laporan profit margin
- [ ] Export PDF / Excel
- [ ] Grafik & chart realtime

### 5.8 Settings
- [ ] Payment method configuration
- [ ] Tax configuration
- [ ] Receipt template
- [ ] Notification preferences

---

## 6. Database Schema

### 6.1 Public Schema (Shared)

```sql
-- ============================================
-- PUBLIC SCHEMA (Shared across all tenants)
-- ============================================

CREATE TABLE public.plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(50) NOT NULL,          -- Free, Pro, Enterprise
    max_outlets     INT NOT NULL DEFAULT 1,
    max_products    INT NOT NULL DEFAULT 100,
    max_users       INT NOT NULL DEFAULT 5,
    price_monthly   DECIMAL(12,2) NOT NULL DEFAULT 0,
    price_yearly    DECIMAL(12,2) NOT NULL DEFAULT 0,
    features        JSONB DEFAULT '{}',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,   -- subdomain identifier
    schema_name     VARCHAR(100) UNIQUE NOT NULL,   -- tenant_xxx
    plan_id         UUID REFERENCES public.plans(id),
    owner_email     VARCHAR(255) NOT NULL,
    logo_url        TEXT,
    status          VARCHAR(20) DEFAULT 'active',   -- active, suspended, cancelled
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_id         UUID REFERENCES public.plans(id),
    status          VARCHAR(20) DEFAULT 'active',   -- active, trial, expired, cancelled
    trial_ends_at   TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.users_global (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    phone           VARCHAR(20),
    avatar_url      TEXT,
    is_super_admin  BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.tenant_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES public.users_global(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL,           -- owner, manager, cashier
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);
```

### 6.2 Tenant Schema (Per Tenant)

```sql
-- ============================================
-- TENANT SCHEMA (Isolated per tenant: tenant_{id})
-- ============================================

-- Outlets
CREATE TABLE outlets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    address         TEXT,
    phone           VARCHAR(20),
    email           VARCHAR(255),
    timezone        VARCHAR(50) DEFAULT 'Asia/Jakarta',
    tax_rate        DECIMAL(5,2) DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    description     TEXT,
    image_url       TEXT,
    sort_order      INT DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(200) NOT NULL,
    sku             VARCHAR(50) UNIQUE,
    barcode         VARCHAR(100),
    description     TEXT,
    image_url       TEXT,
    price           DECIMAL(12,2) NOT NULL,
    cost_price      DECIMAL(12,2) DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    has_variants    BOOLEAN DEFAULT FALSE,
    track_stock     BOOLEAN DEFAULT TRUE,
    min_stock       INT DEFAULT 0,
    tags            TEXT[],
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Product Variants
CREATE TABLE product_variants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID REFERENCES products(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,          -- e.g., "Large", "Red"
    sku             VARCHAR(50) UNIQUE,
    barcode         VARCHAR(100),
    price           DECIMAL(12,2) NOT NULL,
    cost_price      DECIMAL(12,2) DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Stock per Outlet
CREATE TABLE stock (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id      UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    outlet_id       UUID REFERENCES outlets(id) ON DELETE CASCADE,
    quantity        INT NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, variant_id, outlet_id)
);

-- Stock Movements (audit trail)
CREATE TABLE stock_movements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id      UUID REFERENCES product_variants(id),
    outlet_id       UUID REFERENCES outlets(id) ON DELETE CASCADE,
    type            VARCHAR(20) NOT NULL,           -- in, out, transfer, adjustment
    quantity        INT NOT NULL,
    reference_type  VARCHAR(50),                    -- transaction, transfer, manual
    reference_id    UUID,
    notes           TEXT,
    created_by      UUID NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Customers
CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(255),
    phone           VARCHAR(20),
    address         TEXT,
    loyalty_points  INT DEFAULT 0,
    notes           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Methods
CREATE TABLE payment_methods (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(50) NOT NULL,           -- Cash, Card, QRIS, Transfer
    type            VARCHAR(20) NOT NULL,           -- cash, card, digital, transfer
    is_active       BOOLEAN DEFAULT TRUE,
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Shifts
CREATE TABLE shifts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id       UUID REFERENCES outlets(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL,
    opened_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at       TIMESTAMPTZ,
    opening_cash    DECIMAL(12,2) NOT NULL DEFAULT 0,
    closing_cash    DECIMAL(12,2),
    expected_cash   DECIMAL(12,2),
    notes           TEXT,
    status          VARCHAR(20) DEFAULT 'open'      -- open, closed
);

-- Transactions
CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_no  VARCHAR(50) UNIQUE NOT NULL,    -- TRX-20250501-0001
    outlet_id       UUID REFERENCES outlets(id) ON DELETE RESTRICT,
    shift_id        UUID REFERENCES shifts(id),
    customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
    cashier_id      UUID NOT NULL,
    subtotal        DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    discount_type   VARCHAR(10),                    -- percentage, fixed
    discount_value  DECIMAL(12,2) DEFAULT 0,
    tax_amount      DECIMAL(12,2) DEFAULT 0,
    total           DECIMAL(12,2) NOT NULL,
    status          VARCHAR(20) DEFAULT 'completed', -- completed, voided, refunded, held
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction Items
CREATE TABLE transaction_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID REFERENCES transactions(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES products(id) ON DELETE RESTRICT,
    variant_id      UUID REFERENCES product_variants(id),
    product_name    VARCHAR(200) NOT NULL,          -- snapshot
    variant_name    VARCHAR(100),                   -- snapshot
    quantity        INT NOT NULL,
    unit_price      DECIMAL(12,2) NOT NULL,         -- snapshot
    discount_amount DECIMAL(12,2) DEFAULT 0,
    subtotal        DECIMAL(12,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction Payments
CREATE TABLE transaction_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID REFERENCES transactions(id) ON DELETE CASCADE,
    payment_method_id UUID REFERENCES payment_methods(id),
    amount          DECIMAL(12,2) NOT NULL,
    reference_no    VARCHAR(100),                   -- card approval code, etc
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Refunds
CREATE TABLE refunds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id  UUID REFERENCES transactions(id) ON DELETE RESTRICT,
    refund_no       VARCHAR(50) UNIQUE NOT NULL,
    amount          DECIMAL(12,2) NOT NULL,
    reason          TEXT,
    refunded_by     UUID NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Refund Items
CREATE TABLE refund_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_id       UUID REFERENCES refunds(id) ON DELETE CASCADE,
    transaction_item_id UUID REFERENCES transaction_items(id),
    quantity        INT NOT NULL,
    amount          DECIMAL(12,2) NOT NULL
);
```

### 6.3 Entity Relationship Diagram (Text)

```
public.plans ──1:N──> public.tenants
public.tenants ──1:N──> public.subscriptions
public.tenants ──1:N──> public.tenant_users
public.users_global ──1:N──> public.tenant_users

[Per Tenant Schema]
outlets ──1:N──> stock
outlets ──1:N──> shifts
outlets ──1:N──> transactions

categories ──1:N──> categories (self-ref, parent)
categories ──1:N──> products

products ──1:N──> product_variants
products ──1:N──> stock
products ──1:N──> transaction_items
products ──1:N──> stock_movements

product_variants ──1:N──> stock
product_variants ──1:N──> transaction_items

customers ──1:N──> transactions

shifts ──1:N──> transactions

transactions ──1:N──> transaction_items
transactions ──1:N──> transaction_payments
transactions ──1:N──> refunds

refunds ──1:N──> refund_items
transaction_items ──1:N──> refund_items

payment_methods ──1:N──> transaction_payments
```

---

## 7. Flowchart

### 7.1 Flow Registrasi Tenant

```
┌───────────┐     ┌──────────────┐     ┌──────────────────┐
│  Owner    │     │ Auth Service │     │ Tenant Service   │
│  (User)   │     │              │     │                  │
└─────┬─────┘     └──────┬───────┘     └────────┬─────────┘
      │                  │                      │
      │  1. Register     │                      │
      │  (name, email,   │                      │
      │   password,      │                      │
      │   business_name) │                      │
      ├─────────────────>│                      │
      │                  │                      │
      │                  │  2. Create user      │
      │                  │  in users_global     │
      │                  ├─────────┐            │
      │                  │         │            │
      │                  │<────────┘            │
      │                  │                      │
      │                  │  3. Create tenant    │
      │                  ├─────────────────────>│
      │                  │                      │
      │                  │                      │  4. Create schema
      │                  │                      │  tenant_{id}
      │                  │                      ├─────────┐
      │                  │                      │         │
      │                  │                      │<────────┘
      │                  │                      │
      │                  │                      │  5. Run migrations
      │                  │                      │  on new schema
      │                  │                      ├─────────┐
      │                  │                      │         │
      │                  │                      │<────────┘
      │                  │                      │
      │                  │                      │  6. Seed default data
      │                  │                      │  (payment methods,
      │                  │                      │   default outlet)
      │                  │                      ├─────────┐
      │                  │                      │         │
      │                  │                      │<────────┘
      │                  │                      │
      │                  │  7. Tenant created   │
      │                  │<─────────────────────┤
      │                  │                      │
      │  8. JWT Token    │                      │
      │  + Tenant Info   │                      │
      │<─────────────────┤                      │
      │                  │                      │
```

### 7.2 Flow Login & Authentication

```
┌───────────┐     ┌──────────────┐     ┌─────────┐
│  User     │     │ Auth Service │     │  Redis  │
└─────┬─────┘     └──────┬───────┘     └────┬────┘
      │                  │                  │
      │  1. Login        │                  │
      │  (email, pass)   │                  │
      ├─────────────────>│                  │
      │                  │                  │
      │                  │  2. Validate     │
      │                  │  credentials     │
      │                  ├─────────┐        │
      │                  │         │        │
      │                  │<────────┘        │
      │                  │                  │
      │                  │  3. Get tenant   │
      │                  │  memberships     │
      │                  ├─────────┐        │
      │                  │         │        │
      │                  │<────────┘        │
      │                  │                  │
      │                  │  4. Generate     │
      │                  │  Access Token    │
      │                  │  (15min) +       │
      │                  │  Refresh Token   │
      │                  │  (7days)         │
      │                  ├─────────┐        │
      │                  │         │        │
      │                  │<────────┘        │
      │                  │                  │
      │                  │  5. Store        │
      │                  │  refresh token   │
      │                  ├─────────────────>│
      │                  │                  │
      │  6. Return       │                  │
      │  tokens +        │                  │
      │  user data       │                  │
      │<─────────────────┤                  │
```

### 7.3 Flow Transaksi POS (Checkout)

```
┌───────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Cashier  │   │ POS Service  │   │Product Svc   │   │   Redis      │
└─────┬─────┘   └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
      │                │                   │                  │
      │  1. Scan/Add   │                   │                  │
      │  product to    │                   │                  │
      │  cart          │                   │                  │
      ├───────────────>│                   │                  │
      │                │                   │                  │
      │                │  2. Get product   │                  │
      │                │  details + price  │                  │
      │                ├──────────────────>│                  │
      │                │                   │                  │
      │                │  3. Check stock   │                  │
      │                │<──────────────────┤                  │
      │                │                   │                  │
      │                │  4. Save cart     │                  │
      │                │  to Redis         │                  │
      │                ├─────────────────────────────────────>│
      │                │                   │                  │
      │  5. Cart       │                   │                  │
      │  updated       │                   │                  │
      │<───────────────┤                   │                  │
      │                │                   │                  │
      │  6. Apply      │                   │                  │
      │  discount      │                   │                  │
      ├───────────────>│                   │                  │
      │                │                   │                  │
      │  7. Select     │                   │                  │
      │  payment       │                   │                  │
      │  method(s)     │                   │                  │
      ├───────────────>│                   │                  │
      │                │                   │                  │
      │                │  8. Validate      │                  │
      │                │  payment amount   │                  │
      │                ├─────────┐         │                  │
      │                │         │         │                  │
      │                │<────────┘         │                  │
      │                │                   │                  │
      │                │  9. Create        │                  │
      │                │  transaction      │                  │
      │                │  record           │                  │
      │                ├─────────┐         │                  │
      │                │         │         │                  │
      │                │<────────┘         │                  │
      │                │                   │                  │
      │                │  10. Deduct stock │                  │
      │                ├──────────────────>│                  │
      │                │                   │                  │
      │                │  11. Clear cart   │                  │
      │                ├─────────────────────────────────────>│
      │                │                   │                  │
      │  12. Receipt   │                   │                  │
      │  + Change      │                  │                  │
      │<───────────────┤                   │                  │
```

### 7.4 Flow Refund

```
┌───────────┐   ┌──────────────┐   ┌──────────────┐
│  Manager  │   │ POS Service  │   │Product Svc   │
└─────┬─────┘   └──────┬───────┘   └──────┬───────┘
      │                │                   │
      │  1. Search     │                   │
      │  transaction   │                   │
      ├───────────────>│                   │
      │                │                   │
      │  2. Transaction│                   │
      │  details       │                   │
      │<───────────────┤                   │
      │                │                   │
      │  3. Select     │                   │
      │  items to      │                   │
      │  refund +      │                   │
      │  reason        │                   │
      ├───────────────>│                   │
      │                │                   │
      │                │  4. Validate      │
      │                │  refund           │
      │                ├─────────┐         │
      │                │         │         │
      │                │<────────┘         │
      │                │                   │
      │                │  5. Create refund │
      │                │  record           │
      │                ├─────────┐         │
      │                │         │         │
      │                │<────────┘         │
      │                │                   │
      │                │  6. Update        │
      │                │  transaction      │
      │                │  status           │
      │                ├─────────┐         │
      │                │         │         │
      │                │<────────┘         │
      │                │                   │
      │                │  7. Restore stock │
      │                ├──────────────────>│
      │                │                   │
      │  8. Refund     │                   │
      │  confirmation  │                   │
      │<───────────────┤                   │
```

### 7.5 Flow Shift Management

```
┌───────────┐     ┌──────────────┐
│  Cashier  │     │ POS Service  │
└─────┬─────┘     └──────┬───────┘
      │                  │
      │  1. Open Shift   │
      │  (opening_cash)  │
      ├─────────────────>│
      │                  │
      │                  │  2. Create shift record
      │                  ├─────────┐
      │                  │         │
      │                  │<────────┘
      │                  │
      │  3. Shift opened │
      │<─────────────────┤
      │                  │
      │  ... transactions throughout the day ...
      │                  │
      │  4. Close Shift  │
      │  (closing_cash)  │
      ├─────────────────>│
      │                  │
      │                  │  5. Calculate expected cash
      │                  │  (opening + cash sales - cash refunds)
      │                  ├─────────┐
      │                  │         │
      │                  │<────────┘
      │                  │
      │  6. Shift summary│
      │  (total sales,   │
      │   cash diff,     │
      │   transaction    │
      │   count)         │
      │<─────────────────┤
```

---

## 8. Struktur Folder

### 8.1 Frontend

```
pos-frontend/
├── public/
│   ├── favicon.ico
│   └── assets/
│       └── images/
├── src/
│   ├── main.tsx                        # Entry point
│   ├── App.tsx                         # Root component
│   ├── routeTree.gen.ts                # TanStack Router generated
│   │
│   ├── components/                     # Reusable components
│   │   ├── ui/                         # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── select.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx           # Main layout (sidebar + content)
│   │   │   ├── AuthLayout.tsx          # Auth pages layout
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Breadcrumb.tsx
│   │   ├── pos/
│   │   │   ├── Cart.tsx
│   │   │   ├── CartItem.tsx
│   │   │   ├── ProductGrid.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── PaymentDialog.tsx
│   │   │   ├── ReceiptPreview.tsx
│   │   │   ├── BarcodeScanner.tsx
│   │   │   └── ShiftDialog.tsx
│   │   ├── products/
│   │   │   ├── ProductForm.tsx
│   │   │   ├── ProductTable.tsx
│   │   │   ├── CategoryTree.tsx
│   │   │   ├── StockBadge.tsx
│   │   │   └── VariantForm.tsx
│   │   ├── reports/
│   │   │   ├── SalesChart.tsx
│   │   │   ├── ReportFilters.tsx
│   │   │   └── ExportButton.tsx
│   │   └── shared/
│   │       ├── DataTable.tsx
│   │       ├── SearchInput.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── EmptyState.tsx
│   │       ├── Pagination.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── routes/                         # TanStack Router file-based routes
│   │   ├── __root.tsx                  # Root route
│   │   ├── _auth/                      # Auth layout group
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── forgot-password.tsx
│   │   ├── _app/                       # App layout group (authenticated)
│   │   │   ├── dashboard.tsx
│   │   │   ├── pos.tsx                 # POS / Kasir screen
│   │   │   ├── products/
│   │   │   │   ├── index.tsx           # Product list
│   │   │   │   ├── $productId.tsx      # Product detail/edit
│   │   │   │   └── new.tsx             # New product
│   │   │   ├── categories/
│   │   │   │   └── index.tsx
│   │   │   ├── customers/
│   │   │   │   ├── index.tsx
│   │   │   │   └── $customerId.tsx
│   │   │   ├── transactions/
│   │   │   │   ├── index.tsx
│   │   │   │   └── $transactionId.tsx
│   │   │   ├── reports/
│   │   │   │   ├── sales.tsx
│   │   │   │   ├── products.tsx
│   │   │   │   └── cashiers.tsx
│   │   │   ├── outlets/
│   │   │   │   ├── index.tsx
│   │   │   │   └── $outletId.tsx
│   │   │   ├── employees/
│   │   │   │   └── index.tsx
│   │   │   └── settings/
│   │   │       ├── general.tsx
│   │   │       ├── payments.tsx
│   │   │       ├── receipt.tsx
│   │   │       └── tax.tsx
│   │   └── _admin/                     # Super admin routes
│   │       ├── tenants/
│   │       │   ├── index.tsx
│   │       │   └── $tenantId.tsx
│   │       ├── plans.tsx
│   │       └── system.tsx
│   │
│   ├── api/                            # API client layer
│   │   ├── client.ts                   # Axios instance + interceptors
│   │   ├── auth.api.ts
│   │   ├── products.api.ts
│   │   ├── categories.api.ts
│   │   ├── transactions.api.ts
│   │   ├── customers.api.ts
│   │   ├── outlets.api.ts
│   │   ├── reports.api.ts
│   │   └── users.api.ts
│   │
│   ├── hooks/                          # TanStack Query hooks
│   │   ├── useAuth.ts
│   │   ├── useProducts.ts
│   │   ├── useCategories.ts
│   │   ├── useTransactions.ts
│   │   ├── useCustomers.ts
│   │   ├── useOutlets.ts
│   │   ├── useReports.ts
│   │   └── useUsers.ts
│   │
│   ├── stores/                         # Zustand stores
│   │   ├── authStore.ts                # Auth state (token, user)
│   │   ├── cartStore.ts                # POS cart state
│   │   ├── shiftStore.ts               # Current shift state
│   │   ├── uiStore.ts                  # UI state (sidebar, theme)
│   │   └── tenantStore.ts              # Active tenant/outlet
│   │
│   ├── lib/                            # Utilities
│   │   ├── utils.ts                    # shadcn cn() + helpers
│   │   ├── format.ts                   # Currency, date formatters
│   │   ├── constants.ts
│   │   ├── validators.ts               # Zod schemas
│   │   └── print.ts                    # Receipt printing utility
│   │
│   ├── types/                          # TypeScript types
│   │   ├── auth.types.ts
│   │   ├── product.types.ts
│   │   ├── transaction.types.ts
│   │   ├── customer.types.ts
│   │   ├── outlet.types.ts
│   │   ├── report.types.ts
│   │   └── api.types.ts                # Generic API response types
│   │
│   └── styles/
│       └── globals.css                 # Tailwind + shadcn styles
│
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── postcss.config.js
├── components.json                     # shadcn/ui config
├── package.json
├── .env.example
├── .eslintrc.cjs
├── .prettierrc
└── Dockerfile
```

### 8.2 Backend (Microservice)

```
pos-backend/
├── docker-compose.yml                  # Orchestration
├── docker-compose.dev.yml              # Dev overrides
├── nginx/
│   └── nginx.conf                      # API Gateway config
│
├── packages/                           # Shared packages
│   └── shared/
│       ├── src/
│       │   ├── middleware/
│       │   │   ├── auth.middleware.ts       # JWT verification
│       │   │   ├── tenant.middleware.ts     # Tenant resolution
│       │   │   ├── rbac.middleware.ts       # Role-based access
│       │   │   ├── validate.middleware.ts   # Request validation
│       │   │   └── rateLimit.middleware.ts  # Rate limiting
│       │   ├── utils/
│       │   │   ├── logger.ts               # Winston logger
│       │   │   ├── response.ts             # Standard API responses
│       │   │   ├── errors.ts               # Custom error classes
│       │   │   ├── jwt.ts                  # JWT helpers
│       │   │   └── redis.ts                # Redis client
│       │   ├── types/
│       │   │   ├── auth.types.ts
│       │   │   ├── tenant.types.ts
│       │   │   └── common.types.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── services/
│   ├── auth-service/                       # Port 3001
│   │   ├── src/
│   │   │   ├── app.ts                      # Express app setup
│   │   │   ├── server.ts                   # Server entry point
│   │   │   ├── routes/
│   │   │   │   └── auth.routes.ts
│   │   │   ├── controllers/
│   │   │   │   └── auth.controller.ts
│   │   │   ├── services/
│   │   │   │   └── auth.service.ts
│   │   │   ├── validators/
│   │   │   │   └── auth.validator.ts       # Zod schemas
│   │   │   └── config/
│   │   │       └── index.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── tenant-service/                     # Port 3002
│   │   ├── src/
│   │   │   ├── app.ts
│   │   │   ├── server.ts
│   │   │   ├── routes/
│   │   │   │   ├── tenant.routes.ts
│   │   │   │   └── outlet.routes.ts
│   │   │   ├── controllers/
│   │   │   │   ├── tenant.controller.ts
│   │   │   │   └── outlet.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── tenant.service.ts
│   │   │   │   ├── outlet.service.ts
│   │   │   │   └── schema.service.ts       # Schema creation & migration
│   │   │   └── validators/
│   │   │       ├── tenant.validator.ts
│   │   │       └── outlet.validator.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma               # Public schema
│   │   │   └── tenant-schema.prisma        # Tenant schema template
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── product-service/                    # Port 3003
│   │   ├── src/
│   │   │   ├── app.ts
│   │   │   ├── server.ts
│   │   │   ├── routes/
│   │   │   │   ├── product.routes.ts
│   │   │   │   ├── category.routes.ts
│   │   │   │   └── stock.routes.ts
│   │   │   ├── controllers/
│   │   │   │   ├── product.controller.ts
│   │   │   │   ├── category.controller.ts
│   │   │   │   └── stock.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── product.service.ts
│   │   │   │   ├── category.service.ts
│   │   │   │   └── stock.service.ts
│   │   │   └── validators/
│   │   │       ├── product.validator.ts
│   │   │       ├── category.validator.ts
│   │   │       └── stock.validator.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── pos-service/                        # Port 3004
│   │   ├── src/
│   │   │   ├── app.ts
│   │   │   ├── server.ts
│   │   │   ├── routes/
│   │   │   │   ├── transaction.routes.ts
│   │   │   │   ├── cart.routes.ts
│   │   │   │   ├── shift.routes.ts
│   │   │   │   └── refund.routes.ts
│   │   │   ├── controllers/
│   │   │   │   ├── transaction.controller.ts
│   │   │   │   ├── cart.controller.ts
│   │   │   │   ├── shift.controller.ts
│   │   │   │   └── refund.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── transaction.service.ts
│   │   │   │   ├── cart.service.ts         # Redis-based cart
│   │   │   │   ├── shift.service.ts
│   │   │   │   ├── refund.service.ts
│   │   │   │   └── receipt.service.ts
│   │   │   └── validators/
│   │   │       ├── transaction.validator.ts
│   │   │       ├── cart.validator.ts
│   │   │       └── refund.validator.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── report-service/                     # Port 3005
│   │   ├── src/
│   │   │   ├── app.ts
│   │   │   ├── server.ts
│   │   │   ├── routes/
│   │   │   │   └── report.routes.ts
│   │   │   ├── controllers/
│   │   │   │   └── report.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── sales.report.ts
│   │   │   │   ├── product.report.ts
│   │   │   │   ├── cashier.report.ts
│   │   │   │   └── export.service.ts       # PDF/Excel generation
│   │   │   └── validators/
│   │   │       └── report.validator.ts
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── notification-service/               # Port 3006
│       ├── src/
│       │   ├── app.ts
│       │   ├── server.ts
│       │   ├── routes/
│       │   │   └── notification.routes.ts
│       │   ├── controllers/
│       │   │   └── notification.controller.ts
│       │   ├── services/
│       │   │   ├── email.service.ts
│       │   │   ├── push.service.ts
│       │   │   └── queue.service.ts        # Bull/Redis queue
│       │   └── templates/
│       │       ├── welcome.hbs
│       │       ├── invite.hbs
│       │       └── low-stock.hbs
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
│
├── scripts/
│   ├── seed.ts                             # Database seeding
│   ├── migrate.ts                          # Migration runner
│   └── create-tenant-schema.ts             # Tenant schema creator
│
├── .env.example
├── .eslintrc.js
├── .prettierrc
├── package.json                            # Root workspace
├── tsconfig.base.json
└── turbo.json                              # Monorepo build (Turborepo)
```

---

## 9. Docker Compose

```yaml
version: '3.8'

services:
  # API Gateway
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - auth-service
      - tenant-service
      - product-service
      - pos-service
      - report-service

  # Database
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: pos_multitenant
      POSTGRES_USER: pos_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Cache & Session
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Services
  auth-service:
    build: ./services/auth-service
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://pos_admin:${DB_PASSWORD}@postgres:5432/pos_multitenant
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis

  tenant-service:
    build: ./services/tenant-service
    ports:
      - "3002:3002"
    environment:
      - DATABASE_URL=postgresql://pos_admin:${DB_PASSWORD}@postgres:5432/pos_multitenant
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  product-service:
    build: ./services/product-service
    ports:
      - "3003:3003"
    environment:
      - DATABASE_URL=postgresql://pos_admin:${DB_PASSWORD}@postgres:5432/pos_multitenant
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  pos-service:
    build: ./services/pos-service
    ports:
      - "3004:3004"
    environment:
      - DATABASE_URL=postgresql://pos_admin:${DB_PASSWORD}@postgres:5432/pos_multitenant
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  report-service:
    build: ./services/report-service
    ports:
      - "3005:3005"
    environment:
      - DATABASE_URL=postgresql://pos_admin:${DB_PASSWORD}@postgres:5432/pos_multitenant
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  notification-service:
    build: ./services/notification-service
    ports:
      - "3006:3006"
    environment:
      - DATABASE_URL=postgresql://pos_admin:${DB_PASSWORD}@postgres:5432/pos_multitenant
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
  redis_data:
```

---

## 10. API Endpoints Overview

### Auth Service (3001)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/register` | Register tenant + owner |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh token |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/forgot-password` | Request reset password |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/auth/me` | Get current user |

### Tenant Service (3002)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/tenants` | List tenants (super admin) |
| GET | `/api/tenants/:id` | Get tenant detail |
| PUT | `/api/tenants/:id` | Update tenant |
| GET | `/api/outlets` | List outlets |
| POST | `/api/outlets` | Create outlet |
| PUT | `/api/outlets/:id` | Update outlet |
| DELETE | `/api/outlets/:id` | Delete outlet |
| POST | `/api/tenants/:id/invite` | Invite user |

### Product Service (3003)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/products` | List products |
| GET | `/api/products/:id` | Get product |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category |
| GET | `/api/stock/:outletId` | Get stock per outlet |
| POST | `/api/stock/adjust` | Adjust stock |
| POST | `/api/stock/transfer` | Transfer stock |

### POS Service (3004)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/cart` | Get current cart |
| POST | `/api/cart/items` | Add item to cart |
| PUT | `/api/cart/items/:id` | Update cart item |
| DELETE | `/api/cart/items/:id` | Remove cart item |
| DELETE | `/api/cart` | Clear cart |
| POST | `/api/transactions` | Create transaction (checkout) |
| GET | `/api/transactions` | List transactions |
| GET | `/api/transactions/:id` | Get transaction detail |
| POST | `/api/transactions/:id/void` | Void transaction |
| POST | `/api/refunds` | Create refund |
| POST | `/api/shifts/open` | Open shift |
| POST | `/api/shifts/close` | Close shift |
| GET | `/api/shifts/current` | Get current shift |

### Report Service (3005)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/reports/sales` | Sales report |
| GET | `/api/reports/products` | Product report |
| GET | `/api/reports/cashiers` | Cashier report |
| GET | `/api/reports/dashboard` | Dashboard summary |
| GET | `/api/reports/export/:type` | Export PDF/Excel |

---

## 11. JWT Payload Structure

```json
{
  "sub": "user-uuid",
  "email": "user@email.com",
  "name": "John Doe",
  "tenants": [
    {
      "tenant_id": "tenant-uuid",
      "tenant_name": "Toko ABC",
      "schema": "tenant_abc123",
      "role": "owner",
      "outlet_id": "outlet-uuid"
    }
  ],
  "active_tenant": "tenant-uuid",
  "active_outlet": "outlet-uuid",
  "iat": 1714531200,
  "exp": 1714532100
}
```

---

## 12. Non-Functional Requirements

| Aspek | Target |
|-------|--------|
| Response time | < 200ms untuk API biasa, < 500ms untuk report |
| Uptime | 99.9% |
| Max concurrent users | 1000 per tenant |
| Data isolation | Complete schema isolation |
| Security | HTTPS, JWT, rate limiting, input validation |
| Backup | Daily automated backup |
| Scalability | Horizontal scaling via Docker |

---

## 13. Timeline (MVP)

| Phase | Durasi | Deliverable |
|-------|--------|-------------|
| Phase 1 - Foundation | 2 minggu | Auth, Tenant, DB setup, Docker |
| Phase 2 - Product | 2 minggu | CRUD produk, kategori, stock |
| Phase 3 - POS Core | 3 minggu | Cart, checkout, payment, receipt |
| Phase 4 - Reports | 1 minggu | Dashboard, sales report |
| Phase 5 - Polish | 2 minggu | Testing, bug fix, optimization |
| **Total MVP** | **10 minggu** | |

---

## 14. Future Enhancements (Post-MVP)

- [ ] Kitchen Display System (KDS) untuk F&B
- [ ] Loyalty program & membership tiers
- [ ] Multi-currency support
- [ ] Offline mode (PWA + IndexedDB)
- [ ] API for third-party integrations
- [ ] Mobile app (React Native)
- [ ] Payment gateway integration (Midtrans, Xendit)
- [ ] Accounting integration
- [ ] Multi-language (i18n)
- [ ] White-label support

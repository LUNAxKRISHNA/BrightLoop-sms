# BrightLoopSMS — 5-Hour Hackathon Execution & Database Deployment Plan (`PLAN.md`)

> **Objective:** Deploy PostgreSQL 16.15 on an Apple Silicon (M4 Pro) MacBook Pro, seed the schema from `DB.md`, expose the database to 2 teammates within **Hour 1**, and deliver a working end-to-end subscription & billing prototype within **5 Hours**.

---

## Phase 1: Hour 1 — Database Spin-Up & Team Network Handoff (0:00 – 0:45)

### 1.1 Local PostgreSQL 16.15 Container Setup (Minutes 0 – 10)

Run PostgreSQL 16.15 via Docker/OrbStack (native `arm64` on M4 Pro) so the entire schema, indexes, and test data load automatically on boot.

1. **Create the DB directory in your repo:**
   ```bash
   mkdir -p db && cd db
   ```
2. **Create `db/docker-compose.yml`:**
   ```yaml
   services:
     postgres:
       image: postgres:16.15-alpine
       container_name: brightloop_pg
       restart: unless-stopped
       environment:
         POSTGRES_USER: admin
         POSTGRES_PASSWORD: CHANGE_ME
         POSTGRES_DB: brightloop_sms
       ports:
         - '0.0.0.0:5432:5432'
       volumes:
         - pgdata:/var/lib/postgresql/data
         - ./init.sql:/docker-entrypoint-initdb.d/01-init.sql
       command: >
         postgres -c listen_addresses='*'
                  -c max_connections=200

   volumes:
     pgdata:
   ```

### 1.2 Automated Schema, Indexes & Seed Script (`db/init.sql`) (Minutes 10 – 20)

Create `db/init.sql` with the exact DDL and seed records required by `DB.md`:

```sql
-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('ADMIN', 'STAFF', 'CUSTOMER');
CREATE TYPE product_type AS ENUM ('SOFTWARE', 'ADD_ON', 'SERVICE');
CREATE TYPE billing_interval AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');
CREATE TYPE discount_type AS ENUM ('FIXED', 'PERCENTAGE');
CREATE TYPE discount_target AS ENUM ('SUBSCRIPTION', 'SPECIFIC_PRODUCTS');
CREATE TYPE subscription_status AS ENUM ('DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED');
CREATE TYPE invoice_status AS ENUM ('DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED');
CREATE TYPE payment_method AS ENUM ('BANK_TRANSFER', 'CREDIT_CARD', 'UPI', 'CASH', 'OTHER');

-- 2. CORE TABLES
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reset_token VARCHAR(255),
    reset_token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    billing_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE taxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    rate_percentage DECIMAL(5,2) NOT NULL CHECK (rate_percentage >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES users(id)
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    product_type product_type NOT NULL,
    sales_price DECIMAL(12,2) NOT NULL CHECK (sales_price >= 0),
    cost_price DECIMAL(12,2) NOT NULL CHECK (cost_price >= 0),
    default_tax_id UUID REFERENCES taxes(id) ON DELETE SET NULL,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    attribute_name VARCHAR(100) NOT NULL,
    attribute_value VARCHAR(100) NOT NULL,
    price_surcharge DECIMAL(12,2) NOT NULL DEFAULT 0.00
);

CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    base_price DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (base_price >= 0),
    billing_interval billing_interval NOT NULL,
    min_quantity INT NOT NULL DEFAULT 1 CHECK (min_quantity >= 1),
    available_from DATE NOT NULL,
    available_to DATE,
    auto_close_at_end BOOLEAN NOT NULL DEFAULT FALSE,
    can_close_early BOOLEAN NOT NULL DEFAULT FALSE,
    can_pause BOOLEAN NOT NULL DEFAULT FALSE,
    can_renew BOOLEAN NOT NULL DEFAULT TRUE,
    CHECK (available_to IS NULL OR available_to >= available_from)
);

CREATE TABLE quotation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    validity_days INT NOT NULL CHECK (validity_days > 0)
);

CREATE TABLE quotation_template_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES quotation_templates(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    default_quantity INT NOT NULL DEFAULT 1 CHECK (default_quantity > 0)
);

CREATE TABLE discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    discount_type discount_type NOT NULL,
    discount_value DECIMAL(12,2) NOT NULL CHECK (discount_value > 0),
    applies_to discount_target NOT NULL,
    min_purchase_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    min_quantity INT NOT NULL DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE,
    max_uses INT,
    current_uses INT NOT NULL DEFAULT 0,
    created_by UUID NOT NULL REFERENCES users(id),
    CHECK (max_uses IS NULL OR current_uses <= max_uses),
    CHECK (discount_type != 'PERCENTAGE' OR discount_value <= 100.00)
);

CREATE TABLE discount_products (
    discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    PRIMARY KEY (discount_id, product_id)
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE RESTRICT,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    template_id UUID REFERENCES quotation_templates(id) ON DELETE SET NULL,
    discount_id UUID REFERENCES discounts(id) ON DELETE SET NULL,
    status subscription_status NOT NULL DEFAULT 'DRAFT',
    start_date DATE NOT NULL,
    expiry_date DATE,
    next_billing_date DATE NOT NULL,
    payment_terms_days INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subscription_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    discount_id UUID REFERENCES discounts(id) ON DELETE SET NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL,
    tax_id UUID REFERENCES taxes(id) ON DELETE SET NULL,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    line_amount DECIMAL(12,2) NOT NULL
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customer_accounts(id) ON DELETE RESTRICT,
    status invoice_status NOT NULL DEFAULT 'DRAFT',
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    discount_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL,
    amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    is_sent BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    subscription_line_id UUID REFERENCES subscription_lines(id) ON DELETE SET NULL,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(12,2) NOT NULL
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    payment_method payment_method NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    notes TEXT,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PERFORMANCE & IDEMPOTENCY INDEXES
CREATE UNIQUE INDEX idx_unique_billing_cycle
ON invoices (subscription_id, billing_period_start, billing_period_end)
WHERE status != 'CANCELLED';

CREATE INDEX idx_sub_status_billing ON subscriptions (status, next_billing_date);
CREATE INDEX idx_inv_overdue ON invoices (status, due_date) WHERE status = 'CONFIRMED';
CREATE INDEX idx_payments_date ON payments (payment_date, amount);
CREATE INDEX idx_sub_customer ON subscriptions (customer_id, status);
CREATE INDEX idx_inv_customer ON invoices (customer_id, status, due_date);

-- 4. INITIAL SEED DATA
DO $$
DECLARE
    v_admin_id UUID := gen_random_uuid();
    v_staff_id UUID := gen_random_uuid();
    v_cust_user_id UUID := gen_random_uuid();
    v_cust_acc_id UUID := gen_random_uuid();
    v_tax_id UUID := gen_random_uuid();
    v_prod_id UUID := gen_random_uuid();
    v_variant_id UUID := gen_random_uuid();
    v_plan_id UUID := gen_random_uuid();
    v_sub_id UUID := gen_random_uuid();
    v_inv_id UUID := gen_random_uuid();
BEGIN
    INSERT INTO users (id, email, password_hash, role) VALUES
    (v_admin_id, 'admin@brightloop.io', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', 'ADMIN'),
    (v_staff_id, 'staff@brightloop.io', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', 'STAFF'),
    (v_cust_user_id, 'acme@client.com', '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', 'CUSTOMER');

    INSERT INTO customer_accounts (id, user_id, company_name, billing_address) VALUES
    (v_cust_acc_id, v_cust_user_id, 'Acme Corp Retail', '42 Tech Park, Bengaluru, KA');

    INSERT INTO taxes (id, name, rate_percentage, created_by) VALUES
    (v_tax_id, 'GST 18%', 18.00, v_admin_id);

    INSERT INTO products (id, name, product_type, sales_price, cost_price, default_tax_id, notes) VALUES
    (v_prod_id, 'BrightLoop Core ERP', 'SOFTWARE', 1000.00, 400.00, v_tax_id, 'Base ERP license');

    INSERT INTO product_variants (id, product_id, attribute_name, attribute_value, price_surcharge) VALUES
    (v_variant_id, v_prod_id, 'Brand', 'Odoo', 560.00);

    INSERT INTO plans (id, name, base_price, billing_interval, min_quantity, available_from, can_pause, can_close_early, can_renew) VALUES
    (v_plan_id, 'Standard Monthly Plan', 0.00, 'MONTHLY', 1, '2026-01-01', TRUE, TRUE, TRUE);

    INSERT INTO subscriptions (id, subscription_number, customer_id, plan_id, status, start_date, next_billing_date, payment_terms_days) VALUES
    (v_sub_id, 'SUB-2026-0001', v_cust_acc_id, v_plan_id, 'ACTIVE', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, 15);

    INSERT INTO subscription_lines (subscription_id, product_id, variant_id, quantity, unit_price, tax_id, tax_amount, line_amount) VALUES
    (v_sub_id, v_prod_id, v_variant_id, 1, 1560.00, v_tax_id, 280.80, 1840.80);

    INSERT INTO invoices (id, invoice_number, subscription_id, customer_id, status, billing_period_start, billing_period_end, issue_date, due_date, subtotal, tax_total, total_amount, amount_paid) VALUES
    (v_inv_id, 'INV-2026-0001', v_sub_id, v_cust_acc_id, 'CONFIRMED', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '15 days', 1560.00, 280.80, 1840.80, 500.00);

    INSERT INTO payments (invoice_id, payment_method, amount, payment_date, notes, recorded_by) VALUES
    (v_inv_id, 'UPI', 500.00, CURRENT_DATE - INTERVAL '10 days', 'Initial partial UPI payment', v_staff_id);
END $$;
```

3. **Start & Verify the Database:**
   ```bash
   docker compose up -d
   docker exec -it brightloop_pg psql -U admin -d brightloop_sms -c "SELECT version(); SELECT subscription_number, status FROM subscriptions;"
   ```

### 1.3 Expose DB to Teammates (Minutes 20 – 35)

Pick **one** method depending on your hackathon network:

- **Method A — Same Wi-Fi / Hotspot (Fastest):**
  1. Get your M4 Pro's local IP: `ipconfig getifaddr en0`
  2. Disable macOS Firewall (System Settings $\rightarrow$ Network $\rightarrow$ Firewall $\rightarrow$ Off).
  3. Keep your Mac awake for 5 hours: run `caffeinate -d` in a dedicated terminal tab.
  4. Share connection URL:
     ```text
     DATABASE_URL="postgresql://admin:CHANGE_ME@<YOUR_MAC_IP>:5432/brightloop_sms"
     ```
- **Method B — Public/Venue Wi-Fi with Client Isolation (Tailscale):**
  1. All 3 teammates install Tailscale (`brew install --cask tailscale`) and sign into the same account.
  2. Share your Mac's `100.x.y.z` Tailscale IP in `DATABASE_URL`.
- **Method C — Cloud Fallback (Neon / Railway / Supabase):**
  1. If local networking is blocked, create a free PG 16 instance on Neon.tech.
  2. Push the schema from your Mac: `psql "<NEON_DB_URL>" -f db/init.sql`
  3. Share `<NEON_DB_URL>` with both teammates.

### 1.4 ORM Introspection & Git Sync (Minutes 35 – 60)

- Commit `DB.md`, `PLAN.md`, `db/docker-compose.yml`, and `db/init.sql` to `main`.
- Run ORM introspection (`npx prisma db pull` / `npx drizzle-kit pull` / `sqlacodegen`) so nobody writes manual table definitions.

---

## Phase 2: Role Division (Team of 3)

| Role                                          | Owner         | Core Responsibilities                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| :-------------------------------------------- | :------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Builder 1: Data, Auth & Catalog CRUD**      | You (DB Host) | • Maintain PostgreSQL 16.15 container & seed scripts.<br>• Build JWT Auth & RBAC middleware (`ADMIN`, `STAFF`, `CUSTOMER`) + password policy validation ($>8$ chars, upper, lower, special).<br>• Build CRUD APIs for `users`, `customer_accounts`, `products`, `product_variants` (e.g., Odoo `+560.00`), `plans`, `taxes`, and `discounts`.                                                                                                                                                                                                              |
| **Builder 2: Billing & State Machine Engine** | Teammate 2    | • Implement Quote-to-Subscription lifecycle (`DRAFT` $\rightarrow$ `QUOTATION` $\rightarrow$ `CONFIRMED` $\rightarrow$ `ACTIVE` $\rightarrow$ `PAUSED`/`CLOSED`) checking `plans` flags.<br>• Implement Batch Billing Generator (`POST /api/billing/run`) with idempotency (`idx_unique_billing_cycle`), price grandfathering snapshots, discount auto-expiry (`current_uses < max_uses`), and tax formula.<br>• Implement Payment recording (`POST /api/payments`) that increments `invoices.amount_paid` and flips `status = 'PAID'` when fully covered. |
| **Builder 3: Frontend & Dashboards**          | Teammate 3    | • Build Role-Based Login & Navigation.<br>• Build Admin/Staff Catalog, Subscription Lifecycle Controls, and "Run Batch Billing" trigger UI.<br>• Build the **Finance Lead Dashboard** (Active Subscriptions, Revenue Collected, Outstanding Balance, Overdue Invoices table).<br>• Build the **Customer Self-Service Portal** (isolated to their own `customer_id`).                                                                                                                                                                                       |

---

## Phase 3: Hour-by-Hour Execution Roadmap (Hours 2 – 5)

### Hour 2: Parallel Core Build (1:00 – 2:00)

- **Builder 1:** Implement `/api/auth/login`, `/api/products`, `/api/plans`, `/api/taxes`, and `/api/discounts` (Admin-only guard on write routes).
- **Builder 2:** Write the subscription creation service (calculating `unit_price = sales_price + variant.price_surcharge`) and the transactional invoice generator (`SELECT ... FOR UPDATE SKIP LOCKED`).
- **Builder 3:** Scaffold UI layout using Tailwind/Shadcn or MUI. Build the Finance Dashboard cards and tables against mock JSON matching `DB.md` column names.

### Hour 3: Pipeline Wiring & Dashboard Queries (2:00 – 3:00)

- **Builder 1:** Expose `/api/dashboard/finance` running the 4 canonical SQL queries from Section 5 of `DB.md` (guaranteed $<2\text{s}$ via `idx_inv_overdue` and `idx_payments_date`).
- **Builder 2:** Complete `/api/subscriptions/:id/status` (enforcing `can_pause` and `can_close_early`) and `/api/payments` (handling partial payments).
- **Builder 3:** Connect Catalog, Subscription creation, and Finance Dashboard UI components to live backend APIs.

### Hour 4: The Big Stitch & Edge-Case Verification (3:00 – 4:00)

- Stop building isolated features and test the integrated flow across all 3 laptops:
  1. **Double-Billing Check:** Click "Generate Invoices" twice for the same billing date; verify the second run skips already-billed subscriptions without throwing a 500 error.
  2. **Price Grandfathering Check:** Change a product's `sales_price` as Admin; verify existing `ACTIVE` subscription lines and `CONFIRMED` invoices keep their original snapshot amounts.
  3. **Discount Cutoff Check:** Create a discount with `max_uses = 1`, run billing for 2 subscriptions, and verify only the first receives the discount.

### Hour 5: Polish, Seed Reset & Demo Rehearsal (4:00 – 5:00)

- Add a quick demo reset script (`docker compose down -v && docker compose up -d`) to restore clean seed data before judging.
- Walk through the final 3-minute demo script linearly:
  1. **Admin View:** Configure product + Odoo variant (`+560.00`), tax rule, plan, and limited-use discount.
  2. **Staff View:** Create a quotation from a template $\rightarrow$ confirm $\rightarrow$ activate subscription $\rightarrow$ trigger Billing Day batch run $\rightarrow$ log a partial payment and then final payment.
  3. **Finance Dashboard:** Show real-time updates to Active Subscriptions, Collected Revenue, and Overdue Invoices in $<2$ seconds.
  4. **Customer Portal:** Log in as `acme@client.com` and verify strict isolation (sees only their own subscriptions and invoices, zero internal cost prices/notes).

---

## Quick Verification Checklist Before Demo

- [ ] `caffeinate -d` is running on the M4 Pro MacBook Pro.
- [ ] All money fields return formatted decimals (`1840.80`), never floating-point artifacts.
- [ ] `CUSTOMER` role cannot access `/api/discounts` or view other customers' invoices.
- [ ] Finance Dashboard loads in under 2 seconds.

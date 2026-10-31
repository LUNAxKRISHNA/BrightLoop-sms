-- ==============================================================================
-- BrightLoopSMS Database Schema & Seed Data
-- ==============================================================================

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
    v_sub_line_id UUID := gen_random_uuid();
    v_inv_id UUID := gen_random_uuid();
    -- bcrypt hash for 'Password@123' (satisfies password policy: > 8 chars, uppercase, lowercase, special char)
    v_default_password_hash VARCHAR := '$2b$10$MbfXpUe4FeMi7M6JEBQp9.56CfYvec1HxYH7reOK3xCPSGIzsW2.y';
BEGIN
    INSERT INTO users (id, email, password_hash, role) VALUES
    (v_admin_id, 'admin@brightloop.io', v_default_password_hash, 'ADMIN'),
    (v_staff_id, 'staff@brightloop.io', v_default_password_hash, 'STAFF'),
    (v_cust_user_id, 'acme@client.com', v_default_password_hash, 'CUSTOMER');

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

    INSERT INTO subscription_lines (id, subscription_id, product_id, variant_id, quantity, unit_price, tax_id, tax_amount, line_amount) VALUES
    (v_sub_line_id, v_sub_id, v_prod_id, v_variant_id, 1, 1560.00, v_tax_id, 280.80, 1840.80);

    INSERT INTO invoices (id, invoice_number, subscription_id, customer_id, status, billing_period_start, billing_period_end, issue_date, due_date, subtotal, tax_total, total_amount, amount_paid) VALUES
    (v_inv_id, 'INV-2026-0001', v_sub_id, v_cust_acc_id, 'CONFIRMED', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '1 day', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '15 days', 1560.00, 280.80, 1840.80, 500.00);

    INSERT INTO invoice_lines (invoice_id, subscription_line_id, product_id, description, quantity, unit_price, tax_amount, line_total) VALUES
    (v_inv_id, v_sub_line_id, v_prod_id, 'BrightLoop Core ERP - Odoo', 1, 1560.00, 280.80, 1840.80);

    INSERT INTO payments (invoice_id, payment_method, amount, payment_date, notes, recorded_by) VALUES
    (v_inv_id, 'UPI', 500.00, CURRENT_DATE - INTERVAL '10 days', 'Initial partial UPI payment', v_staff_id);
END $$;

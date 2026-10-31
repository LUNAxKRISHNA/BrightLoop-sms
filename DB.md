# BrightLoopSMS — Database Schema & AI Agent Context (`DB.md`)

> **AGENT DIRECTIVE:** This file is the single source of truth for the **BrightLoopSMS** relational database (PostgreSQL). Whenever you generate SQL migrations, ORM models (Prisma/Drizzle/SQLAlchemy/TypeORM), API endpoints, or billing business logic, you **must** adhere strictly to the table names, column types, state machines, and edge-case constraints defined below.

---

## 1. System Overview & Core Mandates

BrightLoopSMS is a unified B2B/B2C subscription management and recurring billing platform.

- **Database Engine:** PostgreSQL
- **Primary Keys:** All primary keys are `UUID` (`gen_random_uuid()`).
- **Currency & Math:** Never use `FLOAT` or `REAL` for money or tax rates. Always use `DECIMAL(12,2)` for currency and `DECIMAL(5,2)` for tax percentages.
- **Performance SLA:** All queries—especially the Finance Lead Dashboard—must execute well under **2 seconds** even with thousands of subscriptions. Always ensure queries hit the composite/partial indexes defined in Section 5.

---

## 2. Database Enums & State Machines

### Enums

- `user_role`: `'ADMIN'`, `'STAFF'`, `'CUSTOMER'`
- `product_type`: `'SOFTWARE'`, `'ADD_ON'`, `'SERVICE'`
- `billing_interval`: `'DAILY'`, `'WEEKLY'`, `'MONTHLY'`, `'YEARLY'`
- `discount_type`: `'FIXED'`, `'PERCENTAGE'`
- `discount_target`: `'SUBSCRIPTION'`, `'SPECIFIC_PRODUCTS'`
- `subscription_status`: `'DRAFT'`, `'QUOTATION'`, `'CONFIRMED'`, `'ACTIVE'`, `'PAUSED'`, `'CLOSED'`
- `invoice_status`: `'DRAFT'`, `'CONFIRMED'`, `'PAID'`, `'CANCELLED'`
- `payment_method`: `'BANK_TRANSFER'`, `'CREDIT_CARD'`, `'UPI'`, `'CASH'`, `'OTHER'`

### Valid State Transitions

1. **Subscription Lifecycle:**
   `DRAFT` $\rightarrow$ `QUOTATION` $\rightarrow$ `CONFIRMED` $\rightarrow$ `ACTIVE` $\rightarrow$ (`PAUSED` $\leftrightarrow$ `ACTIVE`) $\rightarrow$ `CLOSED`
   - _Constraint:_ Pausing (`PAUSED`) or early closing (`CLOSED` before `expiry_date`) is only allowed if the associated `plans.can_pause` or `plans.can_close_early` flag is `TRUE`.
2. **Invoice Lifecycle:**
   `DRAFT` $\rightarrow$ `CONFIRMED` $\rightarrow$ `PAID` (or `DRAFT`/`CONFIRMED` $\rightarrow$ `CANCELLED`)
   - _Constraint:_ Only `CONFIRMED` invoices contribute to Accounts Receivable / Overdue calculations. `PAID` invoices cannot be edited or cancelled.

---

## 3. Complete Schema Reference (DBML)

```dbml
Table users {
  id uuid [pk]
  email varchar(255) [unique, not null]
  password_hash varchar(255) [not null]
  role user_role [not null]
  created_by uuid [ref: > users.id, null]
  reset_token varchar(255) [null]
  reset_token_expires_at timestamptz [null]
  created_at timestamptz [not null, default: `now()`]
}

Table customer_accounts {
  id uuid [pk]
  user_id uuid [unique, not null, ref: - users.id]
  company_name varchar(255) [not null]
  billing_address text [null]
  created_at timestamptz [not null, default: `now()`]
}

Table taxes {
  id uuid [pk]
  name varchar(100) [not null]
  rate_percentage decimal(5,2) [not null]
  is_active boolean [not null, default: true]
  created_by uuid [not null, ref: > users.id]
}

Table products {
  id uuid [pk]
  name varchar(255) [not null]
  product_type product_type [not null]
  sales_price decimal(12,2) [not null]
  cost_price decimal(12,2) [not null]
  default_tax_id uuid [null, ref: > taxes.id]
  notes text [null]
  is_active boolean [not null, default: true]
}

Table product_variants {
  id uuid [pk]
  product_id uuid [not null, ref: > products.id]
  attribute_name varchar(100) [not null]
  attribute_value varchar(100) [not null]
  price_surcharge decimal(12,2) [not null, default: 0.00]
}

Table plans {
  id uuid [pk]
  name varchar(255) [not null]
  base_price decimal(12,2) [not null, default: 0.00]
  billing_interval billing_interval [not null]
  min_quantity int [not null, default: 1]
  available_from date [not null]
  available_to date [null]
  auto_close_at_end boolean [not null, default: false]
  can_close_early boolean [not null, default: false]
  can_pause boolean [not null, default: false]
  can_renew boolean [not null, default: true]
}

Table quotation_templates {
  id uuid [pk]
  name varchar(255) [not null]
  plan_id uuid [not null, ref: > plans.id]
  validity_days int [not null]
}

Table quotation_template_lines {
  id uuid [pk]
  template_id uuid [not null, ref: > quotation_templates.id]
  product_id uuid [not null, ref: > products.id]
  variant_id uuid [null, ref: > product_variants.id]
  default_quantity int [not null, default: 1]
}

Table discounts {
  id uuid [pk]
  name varchar(255) [not null]
  discount_type discount_type [not null]
  discount_value decimal(12,2) [not null]
  applies_to discount_target [not null]
  min_purchase_amount decimal(12,2) [not null, default: 0.00]
  min_quantity int [not null, default: 1]
  start_date date [not null]
  end_date date [null]
  max_uses int [null]
  current_uses int [not null, default: 0]
  created_by uuid [not null, ref: > users.id]
}

Table discount_products {
  discount_id uuid [ref: > discounts.id]
  product_id uuid [ref: > products.id]
  indexes {
    (discount_id, product_id) [pk]
  }
}

Table subscriptions {
  id uuid [pk]
  subscription_number varchar(50) [unique, not null]
  customer_id uuid [not null, ref: > customer_accounts.id]
  plan_id uuid [not null, ref: > plans.id]
  template_id uuid [null, ref: > quotation_templates.id]
  discount_id uuid [null, ref: > discounts.id]
  status subscription_status [not null, default: 'DRAFT']
  start_date date [not null]
  expiry_date date [null]
  next_billing_date date [not null]
  payment_terms_days int [not null, default: 0]
  created_at timestamptz [not null, default: `now()`]
}

Table subscription_lines {
  id uuid [pk]
  subscription_id uuid [not null, ref: > subscriptions.id]
  product_id uuid [not null, ref: > products.id]
  variant_id uuid [null, ref: > product_variants.id]
  discount_id uuid [null, ref: > discounts.id]
  quantity int [not null]
  unit_price decimal(12,2) [not null]
  tax_id uuid [null, ref: > taxes.id]
  tax_amount decimal(12,2) [not null, default: 0.00]
  line_amount decimal(12,2) [not null]
}

Table invoices {
  id uuid [pk]
  invoice_number varchar(50) [unique, not null]
  subscription_id uuid [not null, ref: > subscriptions.id]
  customer_id uuid [not null, ref: > customer_accounts.id]
  status invoice_status [not null, default: 'DRAFT']
  billing_period_start date [not null]
  billing_period_end date [not null]
  issue_date date [not null, default: `CURRENT_DATE`]
  due_date date [not null]
  subtotal decimal(12,2) [not null]
  discount_total decimal(12,2) [not null, default: 0.00]
  tax_total decimal(12,2) [not null, default: 0.00]
  total_amount decimal(12,2) [not null]
  amount_paid decimal(12,2) [not null, default: 0.00]
  is_sent boolean [not null, default: false]
}

Table invoice_lines {
  id uuid [pk]
  invoice_id uuid [not null, ref: > invoices.id]
  subscription_line_id uuid [null, ref: > subscription_lines.id]
  product_id uuid [not null, ref: > products.id]
  description varchar(255) [not null]
  quantity int [not null]
  unit_price decimal(12,2) [not null]
  discount_amount decimal(12,2) [not null, default: 0.00]
  tax_amount decimal(12,2) [not null, default: 0.00]
  line_total decimal(12,2) [not null]
}

Table payments {
  id uuid [pk]
  invoice_id uuid [not null, ref: > invoices.id]
  payment_method payment_method [not null]
  amount decimal(12,2) [not null]
  payment_date date [not null]
  notes text [null]
  recorded_by uuid [null, ref: > users.id]
  created_at timestamptz [not null, default: `now()`]
}
```

---

## 4. Critical Edge Cases & Business Logic Rules

When writing backend services or database triggers, the AI agent **must** implement the following edge-case protections:

### Edge Case 1: Idempotent Batch Billing (No Double-Billing)

- **Scenario:** On billing day, a cron job or multiple staff members trigger the batch invoice generator simultaneously, or a network retry fires midway through a batch.
- **Rule:** A subscription must never be billed twice for the same cycle.
- **Implementation:**
  1. Enforce a unique partial index in PostgreSQL:
     ```sql
     CREATE UNIQUE INDEX idx_unique_billing_cycle
     ON invoices (subscription_id, billing_period_start, billing_period_end)
     WHERE status != 'CANCELLED';
     ```
  2. When generating an invoice, advance `subscriptions.next_billing_date` by `plans.billing_interval` inside the **same database transaction**. Use `SELECT ... FOR UPDATE SKIP LOCKED` when picking up due subscriptions (`status = 'ACTIVE' AND next_billing_date <= CURRENT_DATE`).

### Edge Case 2: Historical Price Grandfathering & Immutable Invoices

- **Scenario:** An Admin updates `products.sales_price` from `100.00` to `150.00`, or changes `product_variants.price_surcharge`, or alters `taxes.rate_percentage`.
- **Rule:** Existing active subscriptions and past invoices must **never** retroactively recalculate their totals when catalog prices change.
- **Implementation:**
  - When a `subscription_line` is created, calculate `unit_price = products.sales_price + COALESCE(product_variants.price_surcharge, 0)` (e.g., Base Price + `560.00` for the Odoo brand variant) and store it directly on `subscription_lines.unit_price`.
  - When generating `invoice_lines`, copy `unit_price`, `quantity`, `discount_amount`, `tax_amount`, and a formatted `description` (`Product Name - Variant Value`) into `invoice_lines`. Never join back to `products` to compute historical invoice totals.

### Edge Case 3: Discount Auto-Expiry & Concurrency Race Conditions

- **Scenario:** A discount has `max_uses = 10` and `current_uses = 9`, or its `end_date` was yesterday. During a billing run, two subscriptions attempt to claim the 10th use simultaneously.
- **Rule:** Discounts must automatically stop applying on invoices the moment `CURRENT_DATE > end_date` or `current_uses >= max_uses`, without manual intervention.
- **Implementation:**
  - Before applying a discount during invoice generation, verify:
    1. `CURRENT_DATE BETWEEN start_date AND COALESCE(end_date, '9999-12-31')`
    2. `max_uses IS NULL OR current_uses < max_uses`
    3. Minimum thresholds (`min_quantity` and `min_purchase_amount`) are still satisfied.
  - Increment `discounts.current_uses` atomically:
    ```sql
    UPDATE discounts
    SET current_uses = current_uses + 1
    WHERE id = $1 AND (max_uses IS NULL OR current_uses < max_uses)
    RETURNING id;
    ```
    If no row is returned, the discount limit was reached; bill the line/subscription without the discount.

### Edge Case 4: Order of Financial Operations (Discounts vs. Taxes)

- **Scenario:** Calculating `line_total` and `total_amount` when both discounts and taxes exist.
- **Rule:** Discounts reduce the taxable base before taxes are applied.
- **Formula:**
  1. $\text{Gross Line} = \text{quantity} \times \text{unit\_price}$
  2. $\text{Line Discount} = \text{FIXED amount or } (\text{Gross Line} \times \frac{\text{discount\_value}}{100})$ (capped at $\text{Gross Line}$ so it never goes negative).
  3. $\text{Taxable Line Base} = \text{Gross Line} - \text{Line Discount}$
  4. $\text{Line Tax} = \text{Taxable Line Base} \times \frac{\text{rate\_percentage}}{100}$
  5. $\text{Line Total} = \text{Taxable Line Base} + \text{Line Tax}$

### Edge Case 5: Partial Payments & Overpayments

- **Scenario:** An invoice `total_amount` is `1000.00`. The customer sends `400.00` via UPI today and `600.00` via Bank Transfer next week.
- **Rule:** Recording a payment must not blindly flip `invoices.status` to `'PAID'` unless the cumulative payments cover the invoice total.
- **Implementation:**
  - On inserting a record into `payments`, update the parent invoice inside the same transaction:
    ```sql
    UPDATE invoices
    SET amount_paid = amount_paid + $payment_amount,
        status = CASE
                   WHEN (amount_paid + $payment_amount) >= total_amount THEN 'PAID'::invoice_status
                   ELSE status
                 END
    WHERE id = $invoice_id;
    ```
  - Outstanding balance for any invoice is always `total_amount - amount_paid`.

### Edge Case 6: Plan Lifecycle Enforcement & Auto-Close

- **Scenario:** A subscription reaches its `expiry_date`.
- **Rule:** Depending on `plans` settings:
  - If `plans.auto_close_at_end = TRUE`, the billing cron job must transition the subscription `status` to `'CLOSED'` once `CURRENT_DATE >= expiry_date` instead of generating a new renewal invoice.
  - When creating a quote or subscription, validate that `CURRENT_DATE` falls within `plans.available_from` and `COALESCE(plans.available_to, '9999-12-31')`, and that line quantities meet `plans.min_quantity`.

### Edge Case 7: Strict Role-Based Access Control (RBAC) & Password Policy

- **Password Validation:** Before hashing into `users.password_hash`, the API must validate: length $> 8$ characters, at least 1 uppercase letter, 1 lowercase letter, and 1 special character.
- **Admin-Only Actions:** Only `users.role = 'ADMIN'` can:
  - Create a user with `role = 'STAFF'` (`created_by` must reference the Admin's `users.id`).
  - Create or modify `products`, `product_variants`, `plans`, `taxes`, and `discounts`.
- **Customer Isolation:** A `CUSTOMER` user can only query `subscriptions`, `invoices`, and `payments` where `customer_id` matches their `customer_accounts.id` (`customer_accounts.user_id = current_user_id`). Never expose internal `products.cost_price` or `products.notes` to `CUSTOMER` API responses.

---

## 5. Required Performance Indexes & Dashboard Queries

To guarantee the **< 2-second response time** for the Finance Lead Dashboard, the following indexes must be created in migration scripts:

```sql
-- 1. Prevent double billing per cycle
CREATE UNIQUE INDEX idx_unique_billing_cycle
ON invoices (subscription_id, billing_period_start, billing_period_end)
WHERE status != 'CANCELLED';

-- 2. Fast active subscription lookup & billing-day batch execution
CREATE INDEX idx_sub_status_billing
ON subscriptions (status, next_billing_date);

-- 3. Instant overdue invoice filtering for the Finance Dashboard
CREATE INDEX idx_inv_overdue
ON invoices (status, due_date)
WHERE status = 'CONFIRMED';

-- 4. Fast revenue aggregation by date range
CREATE INDEX idx_payments_date
ON payments (payment_date, amount);

-- 5. Fast Customer Portal lookups
CREATE INDEX idx_sub_customer ON subscriptions (customer_id, status);
CREATE INDEX idx_inv_customer ON invoices (customer_id, status, due_date);
```

### Canonical Finance Dashboard Definitions

When building the Finance Lead's summary endpoints, use these exact definitions:

- **Active Subscriptions Count:** `SELECT COUNT(*) FROM subscriptions WHERE status = 'ACTIVE';`
- **Revenue Collected (Period):** `SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_date BETWEEN $start AND $end;`
- **Total Outstanding (Owed):** `SELECT COALESCE(SUM(total_amount - amount_paid), 0) FROM invoices WHERE status = 'CONFIRMED';`
- **Overdue Invoices List:** `SELECT * FROM invoices WHERE status = 'CONFIRMED' AND due_date < CURRENT_DATE ORDER BY due_date ASC;`


# Product Requirements Document — Subscription Management System

| | |
|---|---|
| **Product** | Subscription Management System for Brightloop Software |
| **Team** | 3 members |
| **Status** | Draft v1 |
| **Stack** | See [TECH_STACK.md](./TECH_STACK.md) |

---

## 1. Overview

Brightloop Software sells software on subscription: monthly and yearly plans, add-ons, and products with variants. Today subscriptions sit in a spreadsheet, invoices are typed by hand, payments are matched from bank statements and revenue reports take days. Renewals get missed and nobody knows the real recurring revenue.

We are building one web application that runs the full subscription lifecycle: catalog, quotations, subscriptions, automatic invoicing, discounts, payments and reporting.

## 2. Goals

1. No invoice is typed by hand. Every invoice is generated from a subscription.
2. No subscription is billed twice or skipped in a billing period.
3. Taxes and discounts apply automatically from rules set by the admin.
4. Anyone on the team can see a subscription's or invoice's status at any time.
5. The finance lead sees active subscriptions, revenue, payments and overdue invoices on one dashboard.
6. Every page responds in under 2 seconds with thousands of subscriptions.

## 3. Users and Roles

| Role | Who | Can do |
|---|---|---|
| **Admin** | System owner | Everything. Only role that manages products, plans, taxes, discounts and staff accounts. |
| **Staff** | Internal team | Day-to-day work: customers, quotations, subscriptions, invoices, payments, reports. Cannot manage catalog settings, taxes, discounts or users. |
| **Customer** | Subscriber | Signs up themselves. Sees only their own subscriptions and invoices in a portal. Can view and print invoices. |

### Permission matrix

| Action | Admin | Staff | Customer |
|---|---|---|---|
| Create staff users | ✅ | ❌ | ❌ |
| Manage products, variants, plans | ✅ | View | ❌ |
| Manage taxes and discounts | ✅ | View | ❌ |
| Manage quotation templates | ✅ | ✅ | ❌ |
| Create / edit subscriptions | ✅ | ✅ | ❌ |
| Confirm / cancel / send invoices | ✅ | ✅ | ❌ |
| Record payments | ✅ | ✅ | ❌ |
| View reports dashboard | ✅ | ✅ | ❌ |
| View own subscriptions and invoices | — | — | ✅ |

## 4. Scope

**Priority key:** P0 = must have for the demo, P1 = should have, P2 = nice to have if time allows.

### 4.1 Authentication and Users (P0)

- Customer signup with email and password.
- Email is unique across all accounts, compared after trimming and lowercasing.
- Password rules: at least 9 characters, at least one uppercase letter, one lowercase letter and one special character. Checked on both client and server.
- Login returns a JWT containing user ID and role.
- Forgot password sends a reset link to the registered email. The link expires after 30 minutes and works once. The response never reveals whether the email exists.
- Public signup always creates a Customer. Only Admin can create Staff accounts.
- The last remaining Admin cannot be deleted or demoted.

### 4.2 Products and Variants (P0)

- Product fields: name, type (service / goods), sales price, cost price, notes, active flag.
- Attributes (e.g. Brand) with values (e.g. Odoo), each value carrying an extra price (e.g. +560).
- A variant's price = product sales price + sum of selected attribute value extras.
- Products used by subscriptions are archived, never deleted.
- Cost price is never shown in the customer portal.

### 4.3 Recurring Plans (P0)

- Plan fields: name, price, billing period (daily / weekly / monthly / yearly), minimum quantity, available-from and available-until dates.
- Per-plan flags: **auto-close** (closes subscriptions at expiry), **closable** (can be closed early), **pausable**, **renewable**.
- A plan past its available-until date can no longer be sold. Existing subscriptions continue.
- Next billing date is anchored to the subscription's start day (31 Jan → 28/29 Feb → 31 Mar).

### 4.4 Quotation Templates (P1)

- Template fields: name, plan, product lines (product/variant, quantity, unit price), validity in days.
- Creating a quotation from a template copies its lines; editing the template later does not change existing quotations.
- Quotation expiry date = creation date + validity days. An expired quotation cannot be confirmed without being re-issued.

### 4.5 Subscriptions (P0)

- Fields: auto-generated number (e.g. `SUB-00042`), customer, plan, start date, expiry date, payment terms (days), status.
- Lines: product/variant, quantity, unit price, taxes, amount. Unit price and tax rate are copied at creation.
- Status flow, enforced on the server:

```
Draft → Quotation → Confirmed → Active → Closed
                        ↘ (start date reached: job moves to Active)
Paused ⇄ Active (only if plan is pausable)
```

- Confirmed means agreed but not yet started. A daily job moves Confirmed subscriptions to Active on their start date.
- Expiry date must be after start date.
- Quantity cannot go below the plan's minimum quantity.
- Line changes on an Active subscription apply from the next billing period (no proration).
- Renewal (if plan is renewable) extends the expiry date by one plan period on the same subscription.
- Closing early only allowed if the plan is closable. Auto-close plans close automatically at expiry.
- Numbering uses a database sequence, so concurrent confirmations never share a number.

### 4.6 Invoicing and Taxes (P0)

- Taxes: admin defines tax rules (name, rate %, active). Products are linked to one or more taxes.
- A billing job runs daily and creates one Draft invoice for each Active subscription whose next billing date is today or earlier.
- Each invoice stores `periodStart` and `periodEnd`. A unique constraint on `(subscriptionId, periodStart)` guarantees no double billing; reruns after a crash simply skip invoices that already exist.
- If the job missed days, it creates invoices for every period that came due.
- Invoices copy customer details, lines, unit prices, tax amounts and discounts at creation; later rule changes don't alter them.
- Calculation order per line: `quantity × unit price` → apply discount → compute tax on discounted amount → round to 2 decimals.
- Invoice status: `Draft → Confirmed → Paid`, plus `Cancelled`.
- Actions: confirm, cancel, send by email, print.
- A confirmed invoice cannot be edited. A paid invoice cannot be cancelled.
- Due date = invoice date + subscription payment terms.
- Paused and closed subscriptions are not invoiced.

### 4.7 Discounts (P1)

- Admin only. Fields: name, type (fixed / percentage), value, minimum purchase amount, minimum quantity, start date, end date, usage limit, times used.
- Scope: specific products, or a whole subscription.
- Applied automatically during invoice generation if valid on the invoice date and the conditions are met.
- One "use" = one invoice it is applied to. The counter is incremented with an atomic database update.
- No stacking: at most one discount per line and one per subscription.
- A fixed discount never makes a line or total negative.
- Stops applying once expired or the usage limit is reached.

### 4.8 Payments (P0)

- Fields: invoice, method (cash / bank transfer / card / UPI / other), amount, date, note.
- Only Confirmed invoices accept payments.
- Multiple partial payments allowed. The invoice moves to Paid when payments total the invoice amount.
- Payments greater than the outstanding amount are rejected.
- Deleting a payment recalculates the invoice status.
- **Outstanding** = Confirmed and not fully paid. **Overdue** = outstanding and past due date.

### 4.9 Reports Dashboard (P0 summary, P1 charts)

- Summary cards: active subscriptions, MRR (yearly ÷ 12, weekly × 52 ÷ 12, daily × 365 ÷ 12), revenue invoiced, revenue collected, outstanding amount, overdue count and amount.
- Charts (Bklit): revenue over time, paid vs outstanding, subscriptions by plan.
- Tables: overdue invoices, recent payments.
- Filters: date range, plan, customer, status.
- All figures computed with SQL aggregates, not application loops.

### 4.10 Customer Portal (P1)

- Customer sees their subscriptions (plan, status, next billing date, lines).
- Customer sees their invoices (status, amount, due date, payments) and can print them.
- All portal endpoints filter by the logged-in customer's ID.

### Out of scope

Online payment gateway, refunds and credit notes, multiple currencies, proration, customer self-service plan changes, multi-company support.

## 5. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Every page under 2 s with 10,000 subscriptions and 100,000 invoices. Lists paginated (default 20). Indexes on status, customer, due date, invoice date, next billing date. |
| Security | Passwords hashed with bcrypt. Role and ownership checked on every endpoint. Secrets only in `.env`. |
| Data integrity | Money stored as `Decimal(12,2)`. Invoice generation and payment recording run in transactions. |
| Auditability | `createdAt`, `updatedAt`, `createdBy` on all business records. |
| Validation | Zod schemas on every request body; same schemas reused in frontend forms. |
| Usability | Status shown as colored badges everywhere. Clear empty, loading and error states. |

## 6. Data Model

```
User                (id, name, email*, passwordHash, role, isActive, createdAt)
PasswordResetToken  (id, userId, tokenHash, expiresAt, usedAt)

Product             (id, name, type, salesPrice, costPrice, notes, isActive)
Attribute           (id, name)                          e.g. Brand
AttributeValue      (id, attributeId, value, extraPrice) e.g. Odoo, 560
ProductVariant      (id, productId, name, price)
VariantValue        (variantId, attributeValueId)
Tax                 (id, name, rate, isActive)
ProductTax          (productId, taxId)

Plan                (id, name, price, billingPeriod, minQuantity, availableFrom,
                     availableUntil, autoClose, closable, pausable, renewable)

QuotationTemplate     (id, name, planId, validityDays)
QuotationTemplateLine (id, templateId, productId, variantId, quantity, unitPrice)

Subscription        (id, number*, customerId, planId, status, startDate, expiryDate,
                     nextBillingDate, paymentTermsDays, quotationExpiresAt, createdBy)
SubscriptionLine    (id, subscriptionId, productId, variantId, quantity, unitPrice, taxRate)

Discount            (id, name, type, value, minPurchase, minQuantity, startDate,
                     endDate, usageLimit, timesUsed, scope)
DiscountProduct     (discountId, productId)
DiscountSubscription(discountId, subscriptionId)

Invoice             (id, number*, subscriptionId, customerId, status, invoiceDate, dueDate,
                     periodStart, periodEnd, subtotal, discountTotal, taxTotal, total,
                     amountPaid)          unique(subscriptionId, periodStart)
InvoiceLine         (id, invoiceId, description, quantity, unitPrice, discountAmount,
                     taxAmount, lineTotal)

Payment             (id, invoiceId, method, amount, paymentDate, note, createdBy)
```

`*` = unique. Full schema lives in `server/prisma/schema.prisma`.

## 7. API Outline

All routes are prefixed with `/api`. 🔒 = login required, roles in brackets.

| Module | Endpoints |
|---|---|
| Auth | `POST /auth/signup`, `POST /auth/login`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET /auth/me` |
| Users | `GET/POST /users` 🔒[Admin], `PATCH /users/:id` 🔒[Admin] |
| Products | `GET/POST /products`, `GET/PATCH/DELETE /products/:id`, `POST /products/:id/variants` 🔒 |
| Attributes | `GET/POST /attributes`, `POST /attributes/:id/values` 🔒[Admin] |
| Taxes | `GET/POST /taxes`, `PATCH /taxes/:id` 🔒[Admin] |
| Plans | `GET/POST /plans`, `GET/PATCH /plans/:id` 🔒 |
| Templates | `GET/POST /quotation-templates`, `GET/PATCH /quotation-templates/:id` 🔒[Admin, Staff] |
| Subscriptions | `GET/POST /subscriptions`, `GET/PATCH /subscriptions/:id`, `POST /subscriptions/:id/{send-quotation,confirm,pause,resume,renew,close}` 🔒[Admin, Staff] |
| Invoices | `GET /invoices`, `GET /invoices/:id`, `POST /invoices/:id/{confirm,cancel,send}`, `POST /invoices/generate` 🔒[Admin, Staff] |
| Discounts | `GET/POST /discounts`, `PATCH /discounts/:id` 🔒[Admin] |
| Payments | `GET/POST /payments`, `DELETE /payments/:id` 🔒[Admin, Staff] |
| Reports | `GET /reports/summary`, `GET /reports/revenue`, `GET /reports/overdue` 🔒[Admin, Staff] |
| Portal | `GET /portal/subscriptions`, `GET /portal/invoices`, `GET /portal/invoices/:id` 🔒[Customer] |

## 8. Scheduled Jobs

| Job | Runs | Does |
|---|---|---|
| Activate subscriptions | Daily 00:05 | Confirmed → Active when start date is reached |
| Generate invoices | Daily 00:10 | Creates invoices for all due periods (idempotent) |
| Close / renew | Daily 00:15 | Auto-closes expired subscriptions on auto-close plans |
| Flag overdue | Daily 00:20 | Refreshes overdue list for the dashboard |

`POST /invoices/generate` triggers the billing job manually for the demo.

## 9. Work Split

Each member owns their modules end to end: Prisma models, API, and UI.

### Member 1 — Foundation and Catalog

- Repo setup: monorepo folders, Docker Compose, Prisma, ESLint, Prettier, `.env.example`
- Auth: signup, login, JWT, password rules, forgot/reset password, email service
- Role middleware and frontend route guards
- Admin user management (create staff)
- App layout: sidebar, header, role-based navigation
- Products, attributes, variants, taxes, plans (CRUD screens and APIs)

### Member 2 — Sales and Billing Engine

- Quotation templates
- Subscriptions: create/edit, lines, numbering, status transitions, pause/resume/renew/close
- Billing date calculation (`lib/billing-dates.ts`) with unit tests
- Invoice generation job (idempotent), tax and discount calculator with unit tests
- Invoice actions: confirm, cancel, send, print view
- Discounts (CRUD and automatic application)
- All cron jobs

### Member 3 — Money, Insights and Portal

- Shared UI components: data table with pagination and filters, status badges, money/date formatters, empty and loading states
- Payments: record, partial payments, status updates, outstanding and overdue views
- Reports dashboard with Bklit charts and filters
- Customer portal
- Seed script: realistic demo data plus a volume seed (10k subscriptions) for the performance check
- Demo script and final presentation

### Shared

- Prisma schema v1 is designed together in Phase 0, then each owner extends their own models. Announce schema changes before pushing a migration.
- Everyone reviews one other member's PRs.

## 10. Timeline

| Phase | Share of time | Member 1 | Member 2 | Member 3 |
|---|---|---|---|---|
| **0. Setup** | 10% | Repo, Docker, Prisma, auth skeleton | Schema v1 (together) | Schema v1 (together), UI components |
| **1. Core build** | 35% | Auth complete, products, variants, taxes, plans | Subscriptions + lifecycle | Data table, layouts, seed script |
| **2. Billing** | 25% | User management, guards, polish catalog | Invoice generation, taxes, discounts | Payments, invoice list views |
| **3. Insights** | 20% | Help with templates / testing | Quotation templates, cron jobs | Dashboard, portal |
| **4. Polish** | 10% | Bug fixes, validation | Edge-case tests | Volume test, demo script |

**Integration checkpoints:** end of Phase 1 (subscriptions can use real plans and products) and end of Phase 2 (full flow from subscription to paid invoice works).

## 11. Demo Flow

1. Customer signs up (show password validation), then admin logs in.
2. Admin creates a product with a Brand variant (Odoo +560), a tax and a monthly plan.
3. Staff creates a subscription from a quotation template and moves it to Active.
4. Admin creates a 10% discount for quantities of 5 or more.
5. Trigger billing: invoices appear with tax and discount applied. Trigger again: no duplicates.
6. Record a partial payment, then the rest: invoice moves to Paid.
7. Dashboard shows MRR, revenue, outstanding and overdue invoices; filters respond instantly on 10k seeded subscriptions.
8. Customer logs in to the portal and sees only their own subscription and invoices.

## 12. Success Criteria

- The demo flow above runs end to end without errors.
- Running the billing job twice creates zero duplicate invoices.
- A customer cannot access another customer's data by changing an ID in the URL.
- Dashboard and list pages load in under 2 seconds on the volume seed.

## 13. Open Questions

| Question | Current assumption |
|---|---|
| Proration on mid-cycle changes? | No; changes apply from next period |
| Does plan end date close existing subscriptions? | No; it only stops new sales |
| Can discounts stack? | No; one per line, one per subscription |
| Does a paused subscription extend its expiry? | Yes, by the paused duration |
| Are refunds and credit notes needed? | Out of scope |
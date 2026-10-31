<p align="center">
  <img src="client/src/assets/logo.png" alt="Brightloop" width="360" />
</p>

<h3 align="center">Subscription Management System</h3>

<p align="center">
  One place to run plans, subscriptions, invoicing and payments for a subscription business.
</p>

<p align="center">
  <img alt="React 19" src="https://img.shields.io/badge/React-19-171717?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-7-171717?logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind-4-171717?logo=tailwindcss&logoColor=white" />
  <img alt="Express 5" src="https://img.shields.io/badge/Express-5-171717?logo=express&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-16-171717?logo=postgresql&logoColor=white" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-6-171717?logo=prisma&logoColor=white" />
</p>

---

## The problem

Brightloop Software sells everything on subscription: monthly and yearly plans, add-ons, and products with variants. Today it all runs on spreadsheets. Renewals get missed, invoices are typed by hand, payments are matched from bank statements, and nobody can say what the recurring revenue actually is.

This project replaces that with one web app covering the whole lifecycle: **catalog → quotation → subscription → invoice → payment → reporting**.

## What's built

### Public site

- Landing page with an animated logo hero, a cursor-reactive "space ripple" background, and a plans section with a Monthly / Annual toggle.
- Every plan's **Know more** leads to sign-up, and **Login** is always in the nav.

### Authentication

- Sign in, sign up and forgot password, with a **Customer / Staff** toggle on the sign-in screen.
- Password rules (9+ characters, upper, lower and special) checked live on the client and again on the server.
- JWT sessions with three roles: **Admin**, **Staff** and **Customer**. Public sign-up always creates a Customer.
- Forgot password gives the same answer whether or not the email exists, so it never reveals accounts.

### Customer portal (`/portal`)

| Page              | What the customer can do                                                                                                                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overview**      | See balance due, next payment and active subscriptions at a glance. An alert appears when an invoice is overdue. Includes a billing-history chart (paid / outstanding / overdue) and monthly spend by plan.                               |
| **Subscriptions** | Filter (all / current / ended) and open any subscription to see its billing period, dates, payment terms, plan lines with tax, and related invoices.                                                                                      |
| **Invoices**      | Filter by status. Each invoice opens as a print-ready A4 document with **Pay** (unpaid) or **Print invoice** (paid). The printed copy carries the invoice number as an edge strip and a "system-generated, no signature required" footer. |
| **Profile**       | Edit personal details and billing address, change password, and view account info.                                                                                                                                                        |

### Admin and staff area (`/admin`)

- **Dashboard** with revenue, collections and overdue figures.
- **Sales:** customers, subscriptions (with a line editor) and quotation templates.
- **Billing:** invoices, invoice detail and payment recording.
- **Catalog:** products, plans, taxes and discounts.
- **Staff management.** Staff only see the sections they're allowed into, while Admin sees everything.

### API (`server/`)

An Express 5 + Prisma REST API over PostgreSQL.

| Area              | Endpoints                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth              | `POST /api/auth/login`, `/signup`, `/forgot-password`, `/change-password`                                                                                                |
| Portal (customer) | `GET /api/portal`, `POST /api/portal/invoices/:id/pay`, `PATCH /api/portal/profile`                                                                                      |
| Admin / staff     | `/api/dashboard`, `/api/me`, `/api/staff`, plus CRUD for `customers`, `products`, `plans`, `taxes`, `discounts`, `templates`, `subscriptions`, `invoices` and `payments` |
| Health            | `GET /api/health` (also checks the database connection)                                                                                                                  |

Every route except auth and health is guarded by role. Customer routes only ever return the signed-in customer's own data.

## Design

The UI follows a single design spec: black, white and neutral greys, with colour reserved for status (green, yellow, blue, grey, and red for overdue). It uses Geist and Geist Mono, pill-shaped buttons, 8px cards, soft shadows, Phosphor icons and greyscale charts. Animation respects the visitor's reduced-motion setting.

## Tech stack

| Layer       | Tools                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| **Client**  | React 19, Vite, TypeScript, Tailwind CSS 4, React Router, React Hook Form + Zod, Bklit charts, Phosphor icons |
| **Server**  | Node 20+, Express 5, Prisma, PostgreSQL, JWT, bcrypt                                                          |
| **Tooling** | npm workspaces, oxlint, Prettier                                                                              |

## Project structure

```
subscription-ms/
├── client/                 React app (Vite)
│   └── src/
│       ├── pages/          landing, auth, portal/, admin/
│       ├── components/     ui/, auth/, portal/, admin/, sections/, charts/
│       └── lib/            API client, schemas, helpers
├── server/                 Express API
│   ├── prisma/             schema.prisma and SQL migrations
│   └── src/                app, auth, routes, insights
└── db/init.sql             database schema and demo seed data
```

## Running locally

**You need** Node 20+ and PostgreSQL 16.

```bash
npm install
```

1. **Create the database and load the schema and demo data:**

   ```bash
   psql -d brightloop_sms -f db/init.sql
   ```

   ```bash
   psql -d brightloop_sms -f server/prisma/sql/001_profile_columns.sql
   ```

2. **Configure the server.** Copy `server/.env.example` to `server/.env` and fill in your own values. The file only contains placeholders.

3. **Generate the Prisma client and start both apps:**

   ```bash
   npx prisma generate --schema server/prisma/schema.prisma
   ```

   ```bash
   npm run dev
   ```

The client runs at <http://localhost:5173> and proxies `/api` to the server on port 4000. Demo accounts for each role are created by `db/init.sql`.

### Useful scripts

| Command             | What it does                     |
| ------------------- | -------------------------------- |
| `npm run dev`       | Start client and server together |
| `npm run build`     | Build both workspaces            |
| `npm run typecheck` | Type-check client and server     |
| `npm run lint`      | Lint with oxlint                 |
| `npm run format`    | Format with Prettier             |

## Roadmap

- [x] Design system and auth screens
- [x] Customer portal: overview, subscriptions, invoices, payments, print, profile
- [x] Admin and staff area: catalog, sales, billing, dashboard, staff
- [x] Database-backed API with role-based access
- [x] Public landing page
- [ ] Scheduled billing job (auto-generate invoices each period)
- [ ] Email delivery for invoices and password reset
- [ ] Online payment gateway (out of scope for v1, so payments are recorded in-app)

## Team

Built by a team of three for Brightloop Software.

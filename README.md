# Bistro OS — Restaurant Business Software

A full-stack restaurant management system: point-of-sale, order & kitchen
tracking, table/floor management, reservations, menu management, inventory
with automatic stock deduction, staff accounts with roles, a customer
directory with loyalty points, and a live analytics dashboard.

## Tech stack

| Layer    | Technology |
|----------|------------|
| Frontend | React 18 + TypeScript + Vite, Tailwind CSS, React Router, TanStack Query, Recharts |
| Backend  | Node.js + Express + TypeScript, Prisma ORM, JWT auth, Zod validation |
| Database | SQLite by default (zero config) — swap the Prisma provider for Postgres in production |

## Project layout

```
backend/    Express API (REST), Prisma schema + migrations, seed data
frontend/   React SPA (Vite)
```

## Features

- **Auth & roles** — JWT login; ADMIN, MANAGER, CHEF, WAITER, CASHIER roles gate
  sensitive routes both in the API and the UI.
- **Point of Sale** — build an order by tapping menu items, choose dine-in
  table / takeaway / delivery, auto-computed tax & totals, record payments
  (cash/card/online/wallet), auto-completes the order once fully paid.
- **Orders / Kitchen board** — filter by status, progress an order through
  Open → Preparing → Ready → Served → Completed, cancel items or orders.
- **Menu management** — categories and dishes with price, cost, veg flag,
  availability toggle ("86" an item).
- **Tables** — floor plan grid with live status (available/occupied/reserved/
  cleaning), auto-updates as orders and reservations are placed.
- **Reservations** — book a guest against a table and time, status workflow
  (pending → confirmed → seated → completed / no-show / cancelled).
- **Inventory** — stock levels, reorder thresholds, purchase/usage/waste/
  adjustment transactions, and **recipe links** so placing an order for a
  dish automatically deducts the ingredients it consumes.
- **Customers** — searchable directory with loyalty points earned per order.
- **Staff** — manage team accounts, roles, and clock-in/clock-out shifts.
- **Dashboard** — today's orders/revenue/avg order value, table occupancy,
  a 7-day revenue chart, top-selling items, and low-stock alerts.

## Getting started

Requires Node.js 18+.

```bash
# from the repo root
npm run setup   # installs backend + frontend deps, runs migrations, seeds demo data
npm run dev     # runs backend (http://localhost:4000) and frontend (http://localhost:5173) together
```

Then open **http://localhost:5173** and sign in with any seeded account
(password `password123`):

| Role    | Email                  |
|---------|-------------------------|
| Admin   | admin@restaurant.com   |
| Manager | manager@restaurant.com |
| Waiter  | waiter@restaurant.com  |
| Chef    | chef@restaurant.com    |

### Running the pieces individually

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run prisma:migrate   # creates dev.db and applies the schema
npm run seed              # loads demo categories, menu, tables, inventory, staff
npm run dev                # http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                # http://localhost:5173 (proxies /api to the backend)
```

## Switching to Postgres for production

The schema is Postgres-compatible. In `backend/prisma/schema.prisma` change:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Set `DATABASE_URL` to your Postgres connection string, then run
`npm run prisma:deploy` (applies committed migrations) instead of
`prisma migrate dev`. Note: the SQLite schema stores "enum-like" fields
(role, status, etc.) as plain `String` columns validated by Zod at the API
layer — you may optionally convert them to real Postgres `enum` types.

## API overview

All endpoints are namespaced under `/api`. Auth uses `Authorization: Bearer
<token>` headers (obtained from `POST /api/auth/login`).

| Resource | Base path |
|----------|-----------|
| Auth | `/api/auth` (login, register, me) |
| Categories | `/api/categories` |
| Menu items | `/api/menu-items` |
| Tables | `/api/tables` |
| Reservations | `/api/reservations` |
| Orders | `/api/orders` (items, payments) |
| Inventory | `/api/inventory` (transactions, recipes) |
| Staff | `/api/staff` (shifts) |
| Customers | `/api/customers` |
| Dashboard | `/api/dashboard/summary` |

## Building for production

```bash
npm run build   # builds backend (tsc) and frontend (vite build) from the repo root
```

Serve `backend/dist` with Node (`node dist/index.js`, after `prisma migrate
deploy`) and deploy `frontend/dist` as a static site, pointing
`VITE_API_URL` at your backend's public URL.

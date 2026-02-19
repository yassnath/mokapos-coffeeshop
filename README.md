# Solvix Moka POS

Production-ready coffee shop POS web app built with Next.js App Router, TypeScript, Prisma, and PostgreSQL.

## Highlights

- Fast cashier checkout (`/pos`): search, favorites, modifier-driven items, split payments, receipt + QR, keyboard shortcuts
- Realtime KDS (`/kds`): live queue with `New / In Progress / Ready`, status actions, optional sound alert
- Manager dashboard (`/admin`): sales summary, best sellers, peak hours, payment breakdown, audit report, CSV export
- Product and staff operations: product CRUD-lite, availability toggles, shift summaries, settings management
- Role-based security: `ADMIN`, `MANAGER`, `CASHIER`, `BARISTA` with discount/void/refund restricted to manager/admin
- Offline-friendly POS flow: local queue and auto-sync on reconnect
- Public marketing pages (`/features`, `/pricing`, `/demo`, `/contact`) with default root redirect to `/login`
- Responsive UI for mobile, tablet/iPad, and desktop

## Tech Stack

- Frontend: Next.js App Router + TypeScript
- UI: TailwindCSS + shadcn-style Radix components + lucide-react icons
- State: Zustand (local UI) + TanStack React Query (server state)
- Backend: Next.js route handlers
- DB: PostgreSQL + Prisma ORM
- Auth: NextAuth (Credentials + optional Google OAuth)
- Realtime: Server-Sent Events (SSE)
- Validation: Zod
- Testing: Vitest (unit) + Playwright (e2e)
- Deployment: Docker + docker-compose

## Role Access

- `ADMIN`: full access (`/admin`, `/pos`, `/kds`, `/history`)
- `MANAGER`: full operational access (`/admin`, `/pos`, `/kds`, `/history`)
- `CASHIER`: POS + cashier history (`/pos`, `/history`)
- `BARISTA`: KDS only (`/kds`)

Restricted actions:

- Discounts: `MANAGER`, `ADMIN`
- Void/Refund: `MANAGER`, `ADMIN`

## Routes

- Root redirect: `/` -> `/login`
- Marketing: `/features`, `/pricing`, `/demo`, `/contact`
- Login: `/login`
- Cashier POS: `/pos`
- Cashier history: `/history`
- KDS: `/kds`
- Admin dashboard: `/admin`
- Receipt print view: `/receipt/[orderId]`

## Notes

- Realtime uses SSE in-process bus for simplicity.
- For multi-instance production scaling, replace in-memory realtime bus with Redis pub/sub.
- Currency and date formatting are Indonesian locale-ready (IDR / `id-ID`).

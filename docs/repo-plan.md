# Solvix POS Repository Plan

## Proposed File Tree

```text
.
|-- prisma/
|   |-- migrations/
|   |-- schema.prisma
|   `-- seed.ts
|-- public/
|   |-- images/
|   `-- screenshots/
|-- src/
|   |-- app/
|   |   |-- (marketing)/
|   |   |   |-- layout.tsx
|   |   |   |-- page.tsx
|   |   |   |-- features/page.tsx
|   |   |   |-- pricing/page.tsx
|   |   |   |-- demo/page.tsx
|   |   |   `-- contact/page.tsx
|   |   |-- admin/page.tsx
|   |   |-- kds/page.tsx
|   |   |-- login/page.tsx
|   |   |-- pos/page.tsx
|   |   |-- receipt/[orderId]/page.tsx
|   |   |-- api/
|   |   |   |-- auth/[...nextauth]/route.ts
|   |   |   |-- categories/route.ts
|   |   |   |-- customers/route.ts
|   |   |   |-- orders/route.ts
|   |   |   |-- orders/events/route.ts
|   |   |   |-- orders/[id]/status/route.ts
|   |   |   |-- products/route.ts
|   |   |   |-- products/[id]/route.ts
|   |   |   |-- reports/summary/route.ts
|   |   |   |-- reports/export/route.ts
|   |   |   |-- settings/route.ts
|   |   |   |-- shifts/open/route.ts
|   |   |   `-- shifts/[id]/close/route.ts
|   |   |-- globals.css
|   |   `-- layout.tsx
|   |-- components/
|   |   |-- layout/
|   |   |-- marketing/
|   |   |-- pos/
|   |   |-- kds/
|   |   |-- admin/
|   |   `-- ui/
|   |-- hooks/
|   |-- lib/
|   |   |-- auth.ts
|   |   |-- db.ts
|   |   |-- env.ts
|   |   |-- rbac.ts
|   |   |-- realtime.ts
|   |   |-- validations.ts
|   |   `-- utils.ts
|   |-- store/
|   |   `-- pos-store.ts
|   `-- types/
|-- tests/
|   |-- e2e/checkout-to-kds.spec.ts
|   |-- fixtures/
|   `-- unit/pos-calculations.test.ts
|-- Dockerfile
|-- docker-compose.yml
|-- playwright.config.ts
|-- vitest.config.ts
`-- README.md
```

## POS Wireframe (`/pos`)

```text
+-------------------------------------------------------------------------------------+
| Top Bar: Solvix POS | Register | Shift Status | Search (Ctrl+K) | User | Online/Off |
+-----------------------------------------+-------------------------------------------+
| Categories (chips/tabs)                 | Cart (sticky panel)                       |
| Search products                         | ----------------------------------------- |
| [Favorite Filter]                       | Customer: Walk-in / Select / New          |
|                                         | Cart Items                                |
| +---------------- Product Grid --------+ |  - Latte (L, Ice, Oat)   qty[-][2][+]     |
| | [Tile] Espresso   Rp18.000        + | |    note, line discount                   |
| | [Tile] Cappuccino Rp28.000        + | |  - Croissant             qty[-][1][+]    |
| | [Tile] Matcha     Rp30.000        + | |                                           |
| | ... virtualized ...                 | | Modifiers Drawer/Dialog                  |
| +-------------------------------------+ | Totals: subtotal, tax, service, tip        |
| Quick keys hint bar                    | Discount (role-gated), rounding             |
|                                         | Split Payments rows (Cash/Card/QRIS)       |
|                                         | [Charge] primary CTA                       |
|                                         | [Print Receipt] after success + QR         |
+-----------------------------------------+-------------------------------------------+
| Offline Banner (if offline): Orders are queued locally and synced when back online  |
+-------------------------------------------------------------------------------------+
```

## KDS Wireframe (`/kds`)

```text
+-----------------------------------------------------------------------------------+
| KDS Header: Store | Clock | Sound Alert Toggle | Filter (All/Hot/Ice) | User      |
+----------------------------+----------------------------+-----------------+
| NEW                        | IN PROGRESS                | READY           |
| -------------------------- | -------------------------- | --------------- |
| #A102 10:22                | #A099 10:18               | #A095 10:12     |
| 2 items                    | 3 items                   | 1 item          |
| - Latte (L, Oat, Less Ice) | - Americano (Hot)         | - Mocha (Iced)  |
| - Croissant                | - Matcha (No Sugar)       |                 |
| Note: no lid               | Note: extra hot           |                 |
| [Start] [Void*]            | [Mark Ready]              | [Complete]      |
|                            |                            |                 |
| New order visual pulse + optional alert sound                               |
+----------------------------+----------------------------+-----------------+
```

Notes:

- `Void`/`Refund`/`Discount` actions are restricted to `MANAGER`/`ADMIN`.
- KDS receives new orders through SSE stream and optimistic local updates.

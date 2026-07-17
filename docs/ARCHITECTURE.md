# Casan Rent — Architecture

## Stack

| Layer | Choice |
|-------|--------|
| Client | Next.js App Router PWA (TypeScript, Tailwind) |
| API | Next.js Route Handlers |
| Data | Seed + client store (localStorage); Supabase Postgres when env configured |
| Mock IoT | `/api/iot` — unlock / lock / motor |
| Mock Pay | `/api/payment` — always succeeds after short delay semantics |

## Request flow

```
Rider / Operator UI
       │
       ▼
  Zustand store  ←→  localStorage (demo persistence)
       │
       ├── fetch /api/payment
       └── fetch /api/iot
              │
              ▼
      Optional Supabase (NEXT_PUBLIC_SUPABASE_URL set)
```

## Multi-tenant model

- `operators` own `vehicles`, `pricing_rules`, `staff_memberships`
- `bookings` reference `operator_id` + `vehicle_id`
- Staff scoped by membership role + assigned `siteIds`

## Operator authorization

The demo store enforces a role matrix before operator mutations:

- `admin`: bookings, fleet, locations, pricing, staff assignments
- `booking_manager`: bookings at assigned sites
- `fleet_attendant`: fleet status/add/move at assigned sites
- `viewer`: read-only

Operator Home, Orders, Fleet, Earnings, and navigation badges filter data to the
signed-in staff member’s assigned sites. These client-store checks make the demo
behavior consistent, but are not a production security boundary. Supabase
deployments must mirror them in server authorization and RLS policies.

## Schema

See [`supabase/migrations/001_initial.sql`](../supabase/migrations/001_initial.sql).

## Environments

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Optional Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional anon key |
| `NEXT_PUBLIC_APP_URL` | Canonical site URL |

Without Supabase env vars, the app runs fully in **demo mode** using seeded Bali data.

# Casan Rent

Multi-operator micro-mobility rental platform for **bicycles**, **e-bikes**, and **e-mopeds**.

Riders discover nearby operators, book, pay (demo), check in, ride, and return. Operators manage fleet, bookings, pricing, and staff.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo logins

| Role | How |
|------|-----|
| Rider | Continue as Guest, or any phone + OTP `548271` |
| Operator | Username `balisunset.admin` · Password `casan2026` |

## Docs

- [Product requirements](docs/PRD.md) — living PRD; **update on every app version**
- [Architecture](docs/ARCHITECTURE.md)

## Stack

Next.js · TypeScript · Tailwind · Zustand · Supabase-ready schema · Mock payment & IoT APIs

## Deploy

Push to GitHub and connect the repo in Vercel. No env vars required for demo mode.

Optional Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Apply [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql) then run the seed notes in that file.

## License

Private / proprietary unless otherwise stated.

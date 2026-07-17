# Casan Rent — Product Requirements Document

| Field | Value |
|-------|--------|
| **Product** | Casan Rent |
| **Product version** | **0.5.1** (must match `APP_VERSION` in `src/lib/version.ts`) |
| **Document** | PRD (living) — revise on every product version |
| **Status** | Current as of **v0.5.1** · 2026-07-17 |
| **Live demo** | https://casan-rent.vercel.app |
| **Repo** | https://github.com/CASANMGT/casan-rent |
| **Audience** | Product, design, engineering, ops, partners |
| **Supersedes** | PRD v1.1 (July 2026) |

### Version sync policy (mandatory)

**Every new product version requires a PRD update in the same release.**

When shipping (bumping `APP_VERSION` + changelog):

1. Update this header’s **Product version** and **Status** date.
2. Add a row under **Document history**.
3. Patch requirements, glossary, business rules, routes, and roadmap so they match what shipped.
4. Do not commit a version bump without touching `docs/PRD.md`.

Agents: follow `.cursor/rules/prd-version-sync.mdc` and `AGENTS.md`.

---

## 1. Executive summary

**Casan Rent** is an Indonesia-first **B2B2C micro-mobility rental platform**. Multiple **operators** list bicycles, e-bikes, and e-mopeds at physical **hubs** (pickup locations). **Riders** discover hubs near them, book now or in advance, pay (demo), collect, ride, and return. **Operators** run a desk console for orders, fleet stock per lokasi, earnings, pricing, and staff.

Phase 1 (current) is a **Progressive Web App** with seeded multi-operator data, mock payments, mock IoT, and client-side persistence. Real payment settlement, production GPS/MQTT hardware, and full multi-city ops tooling are **Phase 2+**.

### Why this product exists

| Stakeholder | Job to be done |
|-------------|----------------|
| Rider (student / tourist / local) | Get a reliable bike near kost, campus, hotel, or beach — book in minutes or reserve days ahead |
| Operator (hub / hotel / campus desk) | Fill inventory, accept requests, hand keys, track who’s out, see take-home money |
| Platform (Casan) | Aggregate operators under one rider app; take a configurable fee per rental |

### Product principles

1. **Hub ≠ operator** — riders search **pickup locations**; operators are the brand behind one or many hubs.
2. **Timer starts at collect** — not at payment.
3. **Indonesia-native** — IDR, QRIS / e-wallets, WhatsApp contact, Bahasa-friendly operator UI.
4. **Desk-ready operator console** — attention-first (pending, overdue, cash, keys), not a generic admin CMS.
5. **Honest demo** — mock payments/IoT clearly labeled where it matters; rules in code should match this PRD.

---

## 2. Vision & positioning

**Vision:** The default way to rent a bike in Indonesian cities — from kost lobby to beach hub — with one rider app and many local operators.

**Positioning:** Multi-operator marketplace + operator tools, not a single-fleet scooter company.

**Primary market:** Greater Jakarta (Depok / Margonda, Tebet, Kemang, Rawamangun) — kost & campus.  
**Secondary market:** Bali (Kuta, Canggu, Ubud) — hotel & tourism desks.

---

## 3. Glossary (canonical language)

Use these terms in UI, docs, and support. Avoid mixing synonyms in rider-facing copy.

| Term | Meaning | Avoid saying |
|------|---------|----------------|
| **Hub** | Physical pickup location (`OperatorSite`) | site, station, place (in rider UI) |
| **Operator** | Business / brand that owns hubs (`Operator`) | calling the hub “operator” |
| **Lokasi** | Operator-console word for hub | hub (in staff ID UI) |
| **Model** | Catalog listing riders book (`VehicleModel`) | “bike type” alone |
| **Unit** | Specific physical bike (`Vehicle`) | — |
| **Book now** | Same-day pickup (soon slots) | Collect soon |
| **Book later** | Advance booking — pick date & time (≤ 14 days) | Reserve a day |
| **Shop pickup** | Staff handover at counter | Front Desk |
| **Self-unlock** | App digital key at hub | Self-service at location |
| **Refundable deposit** | Held then returned after clean return | float / bond without “refundable” |

### Control & pickup (orthogonal)

| Concept | Options | Meaning |
|---------|---------|---------|
| **Rental / keys mode** | Digital · Physical · Both | How the vehicle is unlocked / controlled |
| **Pickup type** | Shop pickup · Self-unlock | How the rider obtains the bike |

A model may support combinations; e-mopeds often require **SIM acknowledgement**.

### Vehicle types

| Type | Notes |
|------|--------|
| **Bicycle** | Pedal; typically physical key; no battery gate |
| **E-bike** | Assist motor; battery rules apply |
| **E-moped** | Higher class; often `requiresSimAck` |

---

## 4. Personas

| Persona | Need | Product response |
|---------|------|------------------|
| **Kost student** | Cheap short rides near Margonda / Tebet | Hub-first search, hourly tiers, vouchers/adapters |
| **Campus rider** | Quick find + pickup at counter | Book now, shop pickup, WhatsApp |
| **Tourist (Bali)** | Hotel lobby collect, clear English | Book later for trip day, hotel operators |
| **Senior / low digital** | Staff help | Shop pickup + physical key |
| **Hub admin** | Clear queue, keys, cash | Operator Home alerts + Orders tabs |
| **Fleet attendant** | Stock by lokasi | Fleet chip switcher + model stock |

---

## 5. Scope

### In scope (shipped / Phase 1)

- Rider PWA: discover hubs & bikes, book now/later, pay (mock), confirm, handover/check-in, ride, geofenced return, review, trips, notifications, profile
- Operator PWA: home triage, orders, fleet by lokasi, earnings, pricing, staff list, profile
- Multi-operator + multi-hub data model
- Charging vouchers & voltage-matched adapters (optional add-ons)
- Demo mode toggles (`NEXT_PUBLIC_DEMO_MODE`)
- Supabase-ready schema (optional); default = Zustand + localStorage seed

### Out of scope (Phase 1 non-goals)

- Real Midtrans / Xendit / bank settlement
- Production MQTT immobilizer / live fleet GPS telemetry
- Native iOS/Android store apps
- Full staff **permission enforcement** (roles exist; many actions are not hard-gated)
- Dynamic pricing / surge
- Cross-operator roaming returns
- Real SMS OTP / KYC

---

## 6. User roles & authentication

| Role | How they enter | Landing |
|------|----------------|---------|
| **Guest rider** | Continue as Guest | `/home` |
| **Rider** | Phone + OTP stub (`548271`) | `/home` |
| **Operator staff** | Username / password (seeded) | `/operator` |

**Staff roles** (metadata): `admin` · `booking_manager` · `fleet_attendant` · `viewer`.

**AuthGate:** Protected surfaces redirect to `/login` if role mismatches.

**Demo operator accounts** (password `casan2026`): e.g. `margonda.admin`, `tebet.admin`, `balisunset.admin` — see seed staff table in `src/lib/seed.ts`.

---

## 7. Information architecture

### Rider routes

| Route | Purpose |
|-------|---------|
| `/login` | Role picker |
| `/home` | Discovery — **Hubs** (default) · **Bikes** |
| `/operators/[id]?site=` | Hub detail (operator page scoped to site) |
| `/models/[id]?site=&when=` | Booking configuration |
| `/book/[id]` | Payment |
| `/book/[id]/confirmed` | Waiting / ready / pay-at-hub |
| `/book/[id]/handover` | Physical / dual key collect |
| `/book/[id]/checkin` | Self-unlock → start ride |
| `/ride/[id]` | Active ride, extend, return, review |
| `/history` | Trips |
| `/notifications` | Inbox (deep links) |
| `/profile` | Account, referral, dark mode, reset demo |
| `/updates` | What’s New changelog |

**Bottom nav:** Home · Trips · Profile

### Operator routes

| Route | Purpose | Nav |
|-------|---------|-----|
| `/operator` | Desk home (money / requests / ready, alerts) | Home / Beranda |
| `/operator/bookings` | Orders Baru · Dipinjam · Selesai | Orders / Pesanan |
| `/operator/fleet` | Lokasi + model stock + units | Bikes / Sepeda |
| `/operator/earnings` | Take-home, breakdowns | Money / Uang |
| `/operator/pricing` | Duration tiers + weekend toggle | From More |
| `/operator/staff` | Staff list / invite (demo) | From More |
| `/operator/profile` | More | More / Lainnya |

---

## 8. Functional requirements — Rider

### 8.1 Discovery (`/home`)

| ID | Requirement | Priority |
|----|-------------|----------|
| R-D1 | Default tab is **Hubs** (locations), not operators | P0 |
| R-D2 | Search matches hub name, area, city, address, operator name, bike model | P0 |
| R-D3 | Hubs sorted by distance from demo user pin (Margonda-area default) | P0 |
| R-D4 | Hub row shows site name, operator (“by …”), free bikes, hours, distance | P0 |
| R-D5 | Hub opens `/operators/{opId}?site={siteId}` | P0 |
| R-D6 | Bikes tab lists **model × hub** rows with stock at that hub; deep-link with `?site=` | P0 |
| R-D7 | Vehicle type chips on Bikes tab | P1 |
| R-D8 | Map toggle on Hubs is **Approximate map · demo**; **Directions (OSM)** primary for navigation | P0 |
| R-D9 | Resume banners: active ride · pay to continue · ready to collect (priority order) | P0 |
| R-D10 | Pay / ready banners show **hub name** + appointment when set | P1 |
| R-D11 | First rider Home visit shows a dismissible 3-step bottom sheet: **Find → Book/pay → Collect**; explicitly state the rental timer starts at collect/unlock | P1 |
| R-D12 | Home shows compact, advisory-only city weather and dismissible city-aware safety tips; safety tips can be reopened from Profile | P1 |
| R-D13 | Discovery shows estimated walk minutes + distance; ride and fleet surfaces state GPS freshness and identify demo telemetry | P1 |

### 8.2 Hub detail (`/operators/[id]`)

| ID | Requirement | Priority |
|----|-------------|----------|
| R-H1 | Header / focus = **selected hub**; operator as secondary | P0 |
| R-H2 | Distance/hours from **active site** coords | P0 |
| R-H3 | Multi-site: chip switcher filters bike list & availability | P0 |
| R-H4 | Per bike: **Book now** / **Book later** with `site` (+ `when=later`) | P0 |
| R-H5 | Sticky: choose bike (multi) or Book now/later (single) | P1 |
| R-H6 | Reviews with aggregate score (e.g. 4.5 / 5) + sort/pagination | P1 |
| R-H7 | Directions + WhatsApp at top; no duplicate Contact hub block | P0 |

### 8.3 Booking (`/models/[id]`)

| ID | Requirement | Priority |
|----|-------------|----------|
| R-B1 | Lean page: model summary, pickup hub, when, duration, deposit, **Book** | P0 |
| R-B2 | **Main pickup** shown; **Select other hub** expands alternatives | P0 |
| R-B3 | **Book now** = same-day time chips; **Book later** = day presets + datetime (max **14 days**) | P0 |
| R-B4 | Duration tiers from operator pricing (or default hourly ladder) | P0 |
| R-B5 | Optional charging add-ons (collapsed) for battery models | P1 |
| R-B6 | SIM ack required when model.requiresSimAck | P0 |
| R-B7 | Highlight **refundable deposit** (amount + “returned after bike back”) | P0 |
| R-B8 | Sticky total includes rental + add-ons + deposit; CTA label **Book** | P0 |
| R-B9 | Preserve `?site=` to/from hub and payment back link | P0 |
| R-B10 | Assign unit with battery ≥ **30%** when battery known; else toast sold out | P0 |

### 8.4 Payment & confirmation

| ID | Requirement | Priority |
|----|-------------|----------|
| R-P1 | Methods: QRIS, DANA, OVO, GoPay, ShopeePay; **Pay at hub** only for shop pickup | P0 |
| R-P2 | Mock payment API always succeeds (demo) | P0 |
| R-P3 | Confirmed states: waiting hub confirm · pay at hub · ready | P0 |
| R-P4 | Copy: “Waiting for hub confirm” (not shop/operator mix) | P1 |
| R-P5 | Demo: simulate hub confirm when `IS_DEMO` | P1 |
| R-P6 | “Demo checkout” copy only when `IS_DEMO`; rider can **Cancel booking** on unpaid | P1 |

### 8.5 Collect & ride

| ID | Requirement | Priority |
|----|-------------|----------|
| R-C1 | Shop path → handover; self path → check-in **Unlock unit** (no fake QR) | P0 |
| R-C2 | Physical / both keys: block start until staff `physicalKeyGiven` (or demo simulate) | P0 |
| R-C3 | Active ride: countdown / return-by, motor mock (non-bicycle), SOS, extend (paid) | P0 |
| R-C4 | Return: geofence **80 m** of hub; GPS or demo simulate in/out | P0 |
| R-C5 | Physical key return: wait for staff `physicalKeyReturned` + contact + demo simulate | P0 |
| R-C6 | Complete → review stars + note → home | P0 |
| R-C7 | SOS shares **rider GPS** (fallback demo pin); not operator HQ | P1 |
| R-C8 | Check-in / return maps labeled approximate; OSM directions available | P1 |
| R-C9 | Once ready, confirmed and handover screens show a non-blocking **15-minute collection countdown**; the rental duration still starts only at collect/unlock | P1 |

### 8.6 Trips, notifications, profile

| ID | Requirement | Priority |
|----|-------------|----------|
| R-T1 | Trips deep-link to pay / confirmed / ride correctly | P0 |
| R-T2 | Trip cards show hub name + appointment when available | P1 |
| R-N1 | Notifications tappable via `href` / bookingId; per-item read | P0 |
| R-F1 | Profile: dark mode, What’s New, referral display (demo), reset demo when `IS_DEMO` | P1 |
| R-F2 | Profile provides an entry to reopen city-aware safety and local riding tips | P1 |

---

## 9. Functional requirements — Operator

### 9.1 Home

| ID | Requirement | Priority |
|----|-------------|----------|
| O-H1 | Today strip: take-home money, pending requests, ready bikes | P0 |
| O-H2 | Alerts: overdue, awaiting cash, keys out | P0 |
| O-H3 | Inline Terima / Tolak for pending | P0 |
| O-H4 | **Lokasi aktif** filter (Semua + chips) scopes stats & queues; shared with Orders | P0 |
| O-H5 | Non-admin staff only see hubs included in their `siteIds` assignment | P0 |
| O-H6 | Every pending request shows relative age; age turns amber at **5 min** and red at **10 min** | P1 |

### 9.2 Orders

| ID | Requirement | Priority |
|----|-------------|----------|
| O-O1 | Tabs: Baru · Dipinjam · Selesai | P0 |
| O-O2 | Terima stays on Baru (awaiting handoff); do not jump to Dipinjam | P0 |
| O-O3 | Terima semua counts **pending only** | P0 |
| O-O4 | Give key / Receive key for physical & both | P0 |
| O-O5 | Filter by active lokasi | P0 |
| O-O6 | Demo: simulate rider request when `IS_DEMO` | P1 |
| O-O7 | Bottom nav **Orders badge**: pending queue + overdue + awaiting cash + keys out (scoped by lokasi) | P1 |
| O-O8 | Booking mutations require `bookings.manage` and an assigned booking site | P0 |

### 9.3 Fleet

| ID | Requirement | Priority |
|----|-------------|----------|
| O-F1 | Switch lokasi; models with stock counts; expand units | P0 |
| O-F2 | Unit status: Ready / Out / Maintenance / Disabled (+ charging where used) | P0 |
| O-F3 | Move unit between lokasi; add stock modal (model, color, qty) | P0 |
| O-F4 | Create/edit lokasi (hours, WA, store info, coords) | P1 |
| O-F5 | **Semua** overview compares each assigned lokasi: total, ready, out, attention | P1 |
| O-F6 | New/edit lokasi can fill lat/lng from device GPS with accuracy feedback | P1 |
| O-F7 | Fleet status/move/add mutations require `fleet.manage`; location CRUD requires `locations.manage` | P0 |

### 9.4 Earnings, pricing, staff

| ID | Requirement | Priority |
|----|-------------|----------|
| O-E1 | Net take-home after platform fee; deposit disclaimer | P0 |
| O-E2 | Breakdown: rental / add-ons / extensions; by lokasi & method | P1 |
| O-E3 | **Lokasi** filter (shared `operatorActiveSiteId`) scopes earnings like Home/Orders | P1 |
| O-P1 | Edit duration tiers; weekend surcharge toggle | P1 |
| O-P2 | Pricing mutations require `pricing.manage` | P0 |
| O-S1 | Staff have `siteIds: string[] \| null`; `null` means every operator hub | P0 |
| O-S2 | Admin can assign staff to all or selected hubs; assignment scopes UI and mutations | P0 |
| O-S3 | Role permissions are enforced in Zustand mutations, not labels only | P0 |
| O-S4 | Fake invite action removed; real account invitation remains backend scope | P2 |

### 9.5 Operator permission matrix

| Role | Bookings | Fleet | Locations | Pricing | Staff assignments |
|------|----------|-------|-----------|---------|-------------------|
| `admin` | Manage | Manage | Manage | Manage | Manage |
| `booking_manager` | Manage at assigned hubs | View | View | View | View |
| `fleet_attendant` | View | Status / move / add at assigned hubs | View | View | View |
| `viewer` | View | View | View | View | View |

All operator surfaces scope visible bookings, units, earnings, badges, and hub
switchers to the signed-in staff member’s assigned `siteIds`. These are real
client-store gates for the demo architecture; production authorization must
repeat the same matrix server-side with Supabase RLS.

---

## 10. Domain model

```
Operator 1──* OperatorSite (hub / lokasi)
Operator 1──* VehicleModel (catalog)
VehicleModel 1──* Vehicle (unit @ siteId)
Operator 1──* Booking
Booking *──1 Vehicle (assigned)
Booking *──0..1 OperatorSite
Booking *──* ChargingAddon (snapshot on order)
Operator 1──* StaffMember ──* OperatorSite (siteIds scope)
```

### Booking lifecycle

```
pending → confirmed → awaiting_pickup → active → completed
                ↘ cancelled
active → overdue (timer elapsed / mark overdue)
```

**Payment status:** `pending` | `paid` | `refunded`  
**Keys:** `physicalKeyGiven` / `physicalKeyReturned` when access is physical or both.

---

## 11. Business rules

| Rule | Value |
|------|--------|
| Refundable deposit | **Rp 200,000** (`DEPOSIT_IDR`) |
| Return geofence | **80 m** from hub lat/lng |
| Advance booking window | **≤ 14 days** |
| Min battery to assign | **≥ 30%** (null OK for pedal bikes) |
| Platform fee | **14–22%** in seed (configurable per operator; UI default fallback 15%) |
| Rental timer start | Check-in unlock **or** key handover / start ride — **not** payment time |
| Ready-to-collect arrival window | **15 min**, advisory countdown; expiry does not auto-cancel |
| Pending request SLA cues | Amber at **5 min**; red at **10 min** |
| Booking code | `CR-` + short code |
| Referral (demo UI) | `CASAN25` · Rp 25K credit label |

### Pricing

Default ladder from hourly rate: 30 min → 1 week tiers (`defaultPricingForHourly`). Operators can edit tiers; optional weekend surcharge flag.

### Charging add-ons (optional)

- Casan vouchers (e.g. Rp 25k / 65k / 120k packs)
- Portable adapters matched to battery voltage (48 / 60 / 72 V)

---

## 12. Markets & seed content (demo)

**Jakarta (primary)**

| Operator | Fee | Hubs (examples) |
|----------|-----|-----------------|
| Casan Jakarta Hub | 15% | Margonda Kost Lobby, Tebet Hub, Kemang Corner |
| Tebet Student Wheels | 16% | Tebet Student Desk |
| Rawamangun Campus Ride | 14% | Rawamangun UNJ Counter |

**Bali (secondary)**

| Operator | Fee | Hub |
|----------|-----|-----|
| Bali Sunset Hotel | 20% | Bali Sunset Lobby (Kuta) |
| BeachWalk Rental Hub | 18% | BeachWalk Berawa (Canggu) |
| Ubud Tourism Center | 22% | Ubud Tourism Desk |

Catalog examples: Ofero Galaxy / Stareer / Picassio / Magical, Uwinfly M110G, kost/campus pedals, beach pedal lite.

---

## 13. Technical requirements

| Layer | Choice |
|-------|--------|
| Client | Next.js 16 App Router, React 19, TypeScript, Tailwind 4 |
| State | Zustand + persist key `casan-rent-v1` |
| PWA | `manifest.webmanifest`, standalone, theme `#0d6b5c` |
| Fonts | Figtree + Fraunces |
| Mock APIs | `POST /api/payment`, `POST /api/iot`, fleet helpers |
| Optional DB | Supabase (`NEXT_PUBLIC_SUPABASE_*`); migration `supabase/migrations/001_initial.sql` |
| Deploy | Vercel from `master` |

### Demo flag

```text
NEXT_PUBLIC_DEMO_MODE=true
```

Gates: simulate operator confirm, simulate key handoff/return, simulate geofence, fake rider request, reset demo, login hints. **Without** Supabase, seed data is always used regardless of this flag.

### Non-functional

| Area | Expectation |
|------|-------------|
| Mobile | Primary; shell ~430px max width |
| Safe area | Bottom nav & sticky CTAs respect `env(safe-area-inset-bottom)` |
| Offline | PWA installable; full offline sync not required in Phase 1 |
| Performance | Demo OK on mid phones; avoid unbounded localStorage growth |
| i18n | Rider EN-first; operator bilingual EN + ID hints |
| Accessibility | Buttons labeled; forms with labels; avoid dead `href="#"` |

---

## 14. User flows (happy paths)

### Rider — Book now

1. Open Home → Hubs → pick nearest hub  
2. Choose bike → **Book now**  
3. Confirm hub (change if needed) → time → duration → **Book**  
4. Pay → Confirmed → (handover or check-in) → Ride  
5. Return in geofence → (key if needed) → Complete → Review  

### Rider — Book later

1. Hub → **Book later** (`when=later`)  
2. Select date & time (chips or datetime ≤ 14 days)  
3. Pay / confirm; collect at appointment  

### Operator — Accept & hand key

1. Home or Orders → Baru → **Terima** (stay on Baru)  
2. Rider arrives → **Give key**  
3. Ride active under Dipinjam  
4. Return → **Receive key** → complete  

---

## 15. Success metrics

### Product / demo (Phase 1)

| Metric | Target |
|--------|--------|
| Rider completes book → pay → ride → return on demo | Yes, both digital and physical-key paths |
| Multi-hub operator (Casan Jakarta) discoverable as 3 hubs | Yes |
| Advance booking for a day ≥ 1 ahead | Yes |
| Operator filters Orders by lokasi | Yes |
| Deployed production URL | casan-rent.vercel.app |
| Staff role cannot mutate outside permission/site assignment | Yes (demo store); server RLS required for production |

### Future (Phase 2+)

- Booking conversion, GMV, take rate, hub utilization, NPS, time-to-accept, key-loss incidents

---

## 16. Roadmap

### Shipped (through v0.5.1)

- Multi-operator PWA, hub-first discovery, Book now / Book later  
- Lean booking + refundable deposit highlight  
- Operator lokasi filter (Home, Orders, Earnings), fleet model stock, earnings clarity  
- UX P0/P1: distance from site, key-return escape, AuthGate mid-funnel, notifications deep links, lexicon  
- UX P2: honest maps + OSM directions, Unlock check-in, Orders nav badge, hub+time on banners/Trips, SOS rider GPS, cancel unpaid  
- Operator Phase 1.5: Fleet Semua comparison, GPS-assisted lokasi, staff `siteIds`, enforced role/site mutation gates
- ID-first fleet forms, flatter fleet/staff lists, semantic status tokens with dark-mode variants
- Guided rider discovery: 3-step welcome, city safety/weather, walk ETA, and GPS freshness
- Time-aware operations: pending-request SLA age colors and 15-minute ready-to-collect countdown

### Phase 1.5 (near-term)

- Extend flat-list + semantic-token pass to remaining rider surfaces
- Real staff invitation / account lifecycle
- Align Supabase schema with `OperatorSite` + staff-site membership
- Server-side permission enforcement / Supabase RLS

### Phase 2

- Real payments (QRIS settlement)  
- Real OTP / accounts  
- Hardware IoT + live GPS  
- Push notifications  
- Operator payouts & tax exports  

### Phase 3

- More cities, hotel channel managers, memberships, ads  

---

## 17. Open decisions / known gaps

| Topic | Current state | Recommendation |
|-------|---------------|----------------|
| Staff permissions | Enforced in client store + site-scoped UI | Mirror with server auth/RLS before production |
| Maps | Labeled Approximate + OSM directions | Keep honest; live GPS later |
| Saved favorites | Removed from nav (v0.4.6) | Keep out unless demand |
| Deposit amount | Fixed Rp 200k | Per-operator or per-type later |
| SCBD / Kelapa Gading | Mentioned in older changelog only | Re-add as hubs when needed |
| `card` payment method | In types, not in checkout UI | Add or remove from types |
| Staff invitation | Fake action removed | Add real account lifecycle with backend |
| Design density | Fleet/staff flattened; rider screens still mixed | Continue semantic-token / flat-list pass |

---

## 18. Document history

PRD revisions are keyed to **product versions**. Each app release that changes product behavior must add a row here.

| Product version | Date | PRD changes |
|-----------------|------|-------------|
| **0.5.1** | 17 Jul 2026 | Guided discovery, city weather/safety, walk ETA, GPS freshness, pending request SLA age cues, and non-blocking 15-minute collection window; requirements R-D11–13, R-C9, R-F2, O-H6 |
| **0.5.0** | 17 Jul 2026 | Operator Phase 1.5: Fleet Semua + GPS, staff `siteIds`, role/site mutation gates, ID-first fleet forms, flatter lists, semantic status tokens; roadmap and permission matrix updated |
| **0.4.9** | 16 Jul 2026 | UX P2: maps honesty, check-in unlock, Orders badge, banners/Trips hub+time, SOS GPS, Earnings lokasi, cancel unpaid; requirements R-D10, R-P6, R-C7–8, R-T2, O-O7, O-E3 |
| **0.4.8** | 16 Jul 2026 | Living PRD rewrite: hub-first discovery, Book now/later, lean booking, lokasi filter, lexicon, business rules; **version-sync policy** added |
| 0.4.7 and earlier | Jul 2026 | Covered by legacy PRD v1.0–v1.1 drafts (EcoRide → Indonesia multi-type) |

---

## 19. Related docs

- [Architecture](./ARCHITECTURE.md)  
- [README](../README.md)  
- App changelog: `src/lib/version.ts`  
- Types: `src/lib/types.ts`  
- Seed markets: `src/lib/seed.ts`  
- Agent rule: `.cursor/rules/prd-version-sync.mdc`  

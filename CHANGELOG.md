# Changelog

All notable user-facing changes to Casan Rent are listed here.
The same history appears in-app at **What's New** (`/updates`).

## [0.4.5] — 2026-07-16

### Rider
- Active ride shows a **Return by** card (date + time) and a countdown that stays readable for multi-day/week rentals ("6d 23h" instead of "10080:00")
- Overdue banner now says how late the return is
- **Extend rental requires payment**: each duration shows its price, then a pay step (QRIS / e-wallets / cash) before time is added
- Trips split into **Ongoing** on top and a collapsible **Past trips** list
- Decluttered home (removed promo card + version chip), model page (bicycle specs, adapter jargon, CTA above contact), and profile charging help

## [0.4.4] — 2026-07-16

### Rider
- Payment back button returns to the model page (was a dead redirect)
- Unpaid bookings in History now say **Pay to continue** and resume checkout
- Confirmed screen: dynamic title + primary next-step button moved above map/contact
- Key handover: contact-the-shop actions while waiting for staff
- Model page: explains why "Continue to payment" is disabled (SIM box / battery)
- Home: readable tab labels (Map / Hubs / Bikes / Saved) + proper search icon
- Notifications: friendly empty state

### Operator
- Jakarta fleet spread across 6 real areas far apart (Depok, Tebet, Kemang, SCBD, Rawamangun, Kelapa Gading) with area badges + filters
- Full Bahasa on bookings/fleet/earnings actions and toasts
- Fleet type rows use icons instead of emoji
- Dashboard on-rent / waiting cards now tap through to Bookings
- Pricing & Staff pages redesigned to match the operator design system

## [0.4.3] — 2026-07-16

### Operator
- **Give physical key** / **Collect physical key** on Busy bookings
- Fleet grouped by **3 types**: Bicycle (no battery, key only) · E-Bike · E-Moped
- Big **free bike** count; free bikes highlighted green
- Move free bikes from one place → another in one tap
- Quick **Prices** link on fleet

### Rider
- Pedal bikes show no battery; shop physical key only

## [0.4.2] — 2026-07-16

### Operator (simple desk)
- Home shows **money you keep today** first
- Big **Accept / Reject** for new booking requests
- **Demo: customer wants to book** simulates a request
- Fleet filters: Free / On rent / Waiting / Broken
- Earnings: plain “money you keep” + mocked paid trips

## [0.4.1] — 2026-07-16

### Operator
- Multi-site hub cards on Fleet (tap site to manage stock)
- Dashboard lists every site with free/total units
- Bookings show site name + key type (app / physical / both)

### Rider
- Home polish: kost framing, battery + keys chips, richer active-ride banner
- Booking **request simulation** — auto-confirm after pay, or tap “Simulate operator confirm”
- Dual-key bikes: shop physical key handover **and** app digital unlock
- Battery never blank (`Charge TBD` / `No pack` instead of empty)

## [0.4.0] — 2026-07-16

### Rider (Jakarta kost student)
- **Jakarta primary** operators: Margonda, Tebet, Rawamangun (Bali kept secondary)
- Every model shows **battery V (48/60/72) + Ah** and default charger amps
- Book **Casan charging vouchers** and/or **include adapter** (2A / 3A / 5A with kost warning)
- Maps use **OpenStreetMap static screenshots** — Google Directions removed
- Operator reviews show **total count** and paginate **5 per page** (sort newest / highest / lowest)
- Location mock photos on operator galleries

## [0.3.2] — 2026-07-16

### Operator
- **Multiple sites** per operator (add / delete locations)
- **+ / − fleet stock** per model at a chosen site
- Move units between sites; remove idle units

## [0.3.1] — 2026-07-16

### Rider
- Real product photos from **Ofero** (ofero.id) and **Uwinfly** (uwinflyofficial.id)
- Extend rental: +1h / +3h / +6h / +1 day / +3 days / +1 week
- Mock maps on home, operator station, and return wizard

## [0.3.0] — 2026-07-16

### Rider
- Catalog **models** with fleet stock counts (same bike × N units)
- Photo gallery on model pages
- Operator ★ ratings + written reviews
- Pickup rewrite: **Collect at shop** vs **Self-collect (no staff)**
- WhatsApp / Email / Call contact actions
- Auto-assign a free unit when booking a model

### Operator
- Fleet units remain unit-level; add vehicle attaches to / creates a model

## [0.2.0] — 2026-07-16

### Rider
- Extend, overdue, post-trip review, live confirm, payment method persist
- Auth gates, empty states, What's New

### Operator
- Dashboard alerts, reserved filter, vehicle CRUD, period earnings

## [0.1.0] — 2026-07-01

- First demo: discovery, booking, mock pay, check-in, return
- Operator confirm / decline, fleet status, pricing
- Mock IoT unlock and SOS

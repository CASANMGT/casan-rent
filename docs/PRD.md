# Casan Rent — Product Requirements Document (v1.1)

**Smart multi-operator micro-mobility** · July 2026 · Improved from v1.0 EcoRide PRD

## 1. Executive summary

Casan Rent is a B2B2C platform where **multiple operators** list and rent **bicycles, e-bikes, and e-mopeds** to riders (tourists, students, locals). Riders book via a Progressive Web App. Operators manage fleet, bookings, pricing, and staff from a dashboard.

Phase 1 ships discovery, booking, mock payments, mock IoT unlock, and operator CRUD. Live GPS hardware, MQTT, and real payment gateways are Phase 2+.

### What changed from v1.0

| Gap | Improvement |
|-----|-------------|
| E-bike only | Vehicle types: `bicycle` · `ebike` · `emoped` with type-specific rules |
| Weak multi-tenant story | Operator = tenant (fleet, locations, pricing, staff, commission) |
| Mode vs pickup conflated | **Rental mode** ≠ **pickup type** (defined below) |
| Overbuilt Phase 1 | Cut IoT microservices / K8s from MVP |
| Foreign branding | **Casan Rent**, Indonesia-first (IDR, QRIS-first, WhatsApp) |
| Vague revenue | Platform fee 15–30% of rental; deposits as refundable float |

## 2. Vision

Seamless, sustainable exploration for riders — and full fleet control for operators — across hotels, hubs, campuses, and city neighborhoods.

## 3. Concepts (clear definitions)

### Rental mode (how the vehicle is controlled)

- **Digital Control** — app unlock / motor immobilizer (e-bike & e-moped with IoT; optional tracking for bicycle)
- **Key Handover** — physical key collected from staff; app tracks booking & timer only

### Pickup type (how the rider takes the vehicle)

- **Front Desk** — staff-assisted handover (booking code)
- **Self-Service** — rider unlocks at parking / dock (QR)

A vehicle may support one or both modes and one or both pickup types.

### Vehicle types

| Type | Notes |
|------|--------|
| Bicycle | No motor/battery; Key Handover typical; optional GPS tracker |
| E-bike | Assist motor; Digital and/or Key; battery ≥30% to rent |
| E-moped | Higher speed; may require SIM acknowledgement; Digital and/or Key |

## 4. Personas (unchanged intent, local context)

- Leisure tourist (digital-first day rides)
- University student (short, price-sensitive trips)
- Senior couple (Key Handover + front desk)
- Hotel / hub operations manager (dual mode, low staff load)

## 5. Rider requirements (Phase 1)

1. Guest or phone OTP stub login
2. Map / operators / vehicles / saved; filter by vehicle type
3. Operator detail with hours, distance, fleet mix
4. Vehicle detail: specs, battery (if any), modes, pickup options, duration tiers (30m → weeks)
5. Mock checkout: QRIS / e-wallets / pay-at-operator + deposit
6. Booking confirmed → front-desk wait **or** self check-in
7. Active ride: timer (starts at check-in), motor ON/OFF (mock), SOS, extend stub
8. Return wizard → receipt → review
9. History, profile, dark mode preference, referral code display

**Timer rule:** rental timer starts at check-in / key handover, **not** at payment.

## 6. Operator requirements (Phase 1)

1. Login (demo staff accounts)
2. Dashboard KPIs + alerts
3. Bookings: pending / active / completed; confirm / decline; bulk confirm
4. Fleet list: search, filter status; add/edit vehicle; locate (maps link); maintenance flag
5. Pricing rules editor (duration tiers + weekend/holiday toggles)
6. Staff list with roles: `admin` · `booking_manager` · `fleet_attendant` · `viewer`
7. Earnings stub (period totals + transaction list)

## 7. Business model

- Rental fees split: **~70–85% operator / 15–30% platform** (configurable per operator)
- Refundable security deposits (held, released on clean return)
- Future: memberships, hotel guest packages, tourism ads

## 8. Non-goals (Phase 1)

- Real Midtrans/Xendit settlement
- Production MQTT / GPS immobilizer hardware
- Kubernetes microservices
- App Store native apps (PWA first)

## 9. Success metrics (Phase 1 demo)

- Rider books any vehicle type across ≥2 operators
- Operator confirms booking and sees fleet status update
- Mock unlock / immobilizer APIs return deterministic results
- Deployed on Vercel with docs in GitHub

## 10. Roadmap

- **Phase 1 (now):** PWA + API + Supabase-ready schema + mock pay/IoT
- **Phase 2:** Real QRIS, WhatsApp notifications, Mapbox live map
- **Phase 3:** IoT gateway, auto-immobilize on expiry
- **Phase 4:** Multi-city operators, dynamic pricing ML

**North star:** Hours of sustainable exploration enabled.

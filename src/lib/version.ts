export const APP_VERSION = "0.4.7";

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  highlights: string[];
}

/** Newest first — shown in What's New for riders and operators. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.4.7",
    date: "2026-07-16",
    title: "Location fleet, appointments & UX polish",
    highlights: [
      "Operator fleet: manage bikes per location with stock, hours, WA, store info",
      "Pickup appointments on booking; order timeline + paid extension history",
      "Cleaner checkout (sticky total, collapsed charging) and clearer trip statuses",
    ],
  },
  {
    version: "0.4.6",
    date: "2026-07-16",
    title: "Geofenced return & simpler discovery",
    highlights: [
      "Return only unlocks inside an 80m hub geofence (GPS + demo simulate)",
      "Discovery: Bikes + Rental hubs only; map is a toggle on hubs; Saved removed",
      "Bike list sorted by nearest hub; yellow star ratings across the app",
    ],
  },
  {
    version: "0.4.5",
    date: "2026-07-16",
    title: "Return countdown & paid extensions",
    highlights: [
      "Active ride: return date/time card + countdown readable for day/week rentals",
      "Extend rental now shows the price and requires payment first",
      "Trips split into Ongoing and collapsible Past trips",
      "Decluttered home, model, and profile screens — one clear action per screen",
    ],
  },
  {
    version: "0.4.4",
    date: "2026-07-16",
    title: "Smoother flows & cleaner design",
    highlights: [
      "Booking: fixed back navigation and unpaid trips resume at payment",
      "Pickup screens: clear next step first, shop contact while waiting for key",
      "Jakarta fleet spread across 6 areas (Depok, Tebet, Kemang, SCBD, Rawamangun, Kelapa Gading)",
      "Operator: full Bahasa labels, icons everywhere, tappable rent cards",
      "Pricing & staff pages redesigned to match the rest of the app",
    ],
  },
  {
    version: "0.4.3",
    date: "2026-07-16",
    title: "Physical keys & fleet by type",
    highlights: [
      "Operator give / collect physical key on pickup and return",
      "Fleet grouped by 3 types: Bicycle (no battery, key only), E-Bike, E-Moped",
      "Free bikes highlighted green; move free bikes between places easily",
      "Fleet shows free counts + quick link to set prices",
    ],
  },
  {
    version: "0.4.2",
    date: "2026-07-16",
    title: "Simple operator desk",
    highlights: [
      "Home: money first, big Accept/Reject for new requests",
      "Demo button: fake customer booking to practice",
      "Fleet: Free / On rent / Broken plain labels",
      "Earnings: clear “money you keep” with mocked trips",
    ],
  },
  {
    version: "0.4.1",
    date: "2026-07-16",
    title: "Sites, dual keys & home polish",
    highlights: [
      "Operator multi-site hub cards + dashboard site list",
      "Booking request simulation (auto + tap to confirm)",
      "App digital key + physical shop key flow for dual-key bikes",
      "Home: kost framing, battery/keys chips, clearer active ride",
      "Battery charge never blank (shows Charge TBD when unknown)",
    ],
  },
  {
    version: "0.4.0",
    date: "2026-07-16",
    title: "Jakarta kost rental",
    highlights: [
      "Jakarta primary hubs (Margonda, Tebet, Rawamangun) — Bali secondary",
      "Battery voltage (48/60/72V) + Ah specs on every model",
      "Casan charging vouchers + include adapter (2A/3A/5A) at book time",
      "OpenStreetMap static screenshots (no Google Maps)",
      "Operator reviews: total count + paginate 5 per page",
    ],
  },
  {
    version: "0.3.2",
    date: "2026-07-16",
    title: "Multi-site fleet control",
    highlights: [
      "Operators manage multiple sites / locations",
      "Add (+) or remove (−) fleet stock per model per site",
      "Move units between sites; delete idle sites",
    ],
  },
  {
    version: "0.3.1",
    date: "2026-07-16",
    title: "Real product photos & longer extends",
    highlights: [
      "Real Ofero & Uwinfly product photos on every model",
      "Extend rental by hours, days, or weeks (not just minutes)",
      "Shared mock maps on home, operator, and return flows",
      "Catalog renamed to real fleet brands (demo attribution)",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-07-16",
    title: "Trust before booking",
    highlights: [
      "Browse models with stock counts",
      "Photo gallery, reviews, shop vs self-collect, WhatsApp contact",
      "Booking auto-assigns a free fleet unit",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-07-16",
    title: "Ride control & ops upgrades",
    highlights: [
      "Extend, overdue, review, live confirm, payment persist",
      "Operator alerts, fleet filters, earnings by period",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-07-01",
    title: "First demo release",
    highlights: [
      "Rider discovery, booking, mock pay, check-in, and return",
      "Operator confirm / decline, fleet status, pricing",
    ],
  },
];

export function hasUnseenUpdates(lastSeenVersion: string | null): boolean {
  if (!lastSeenVersion) return true;
  return lastSeenVersion !== APP_VERSION;
}

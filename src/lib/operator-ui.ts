import type { LucideIcon } from "lucide-react";
import type { OperatorSite } from "./types";

/** Plain labels for low-literacy operators — English + short Bahasa hint. */
export const OP = {
  nav: {
    home: { en: "Home", id: "Beranda" },
    bookings: { en: "Orders", id: "Pesanan" },
    fleet: { en: "Bikes", id: "Sepeda" },
    money: { en: "Money", id: "Uang" },
    more: { en: "More", id: "Lainnya" },
  },
  status: {
    free: { en: "Free", id: "Siap" },
    onRent: { en: "Out", id: "Dipinjam" },
    broken: { en: "Broken", id: "Rusak" },
  },
} as const;

export function groupSitesByCity<T extends { city: string }>(
  sites: T[],
): { city: string; sites: T[] }[] {
  const map = new Map<string, T[]>();
  for (const s of sites) {
    const list = map.get(s.city) ?? [];
    list.push(s);
    map.set(s.city, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([city, list]) => ({ city, sites: list }));
}

export function groupSitesByArea<T extends { area: string; city: string }>(
  sites: T[],
): { area: string; city: string; sites: T[] }[] {
  const map = new Map<string, T[]>();
  for (const s of sites) {
    const key = `${s.city}::${s.area}`;
    const list = map.get(key) ?? [];
    list.push(s);
    map.set(key, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => {
      const [city, area] = key.split("::");
      return { city, area, sites: list };
    });
}

export function siteShortLabel(
  site: Pick<OperatorSite, "city" | "area" | "name">,
): string {
  return `${site.area} · ${site.name}`;
}

export function uniqueCities(sites: Pick<OperatorSite, "city">[]): string[] {
  return [...new Set(sites.map((s) => s.city))].sort();
}

export function uniqueAreas(
  sites: Pick<OperatorSite, "area">[],
): string[] {
  return [...new Set(sites.map((s) => s.area))].sort();
}

export type OpMenuItem = {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  badge?: string;
};

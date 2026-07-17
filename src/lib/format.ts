export function formatIdr(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

export function formatIdrShort(amount: number): string {
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (amount >= 1_000) {
    return `Rp ${Math.round(amount / 1_000)}K`;
  }
  return formatIdr(amount);
}

export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

/**
 * Countdown that stays readable for week-long rentals:
 * ≥1 day → "3d 5h", ≥1 hour → "5h 23m", under 1 hour → live MM:SS.
 */
export function formatCountdown(totalSeconds: number): {
  main: string;
  unit: string;
} {
  const s = Math.max(0, totalSeconds);
  const days = Math.floor(s / 86_400);
  const hours = Math.floor((s % 86_400) / 3_600);
  const mins = Math.floor((s % 3_600) / 60);
  if (days >= 1) {
    return { main: `${days}d ${hours}h`, unit: "left" };
  }
  if (hours >= 1) {
    return { main: `${hours}h ${String(mins).padStart(2, "0")}m`, unit: "left" };
  }
  return { main: formatTimer(s), unit: "min left" };
}

/** Operator-facing return deadline from endsAt or planned duration. */
export function formatReturnBy(
  endsAt: string | null,
  durationMinutes?: number,
  fromMs: number = Date.now(),
): string {
  const when = endsAt
    ? new Date(endsAt)
    : durationMinutes != null
      ? new Date(fromMs + durationMinutes * 60_000)
      : null;
  if (!when) return "Return time unknown";

  const now = new Date(fromMs);
  const sameDay =
    when.getFullYear() === now.getFullYear() &&
    when.getMonth() === now.getMonth() &&
    when.getDate() === now.getDate();
  const time = when.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) return `Today ${time}`;
  return when.toLocaleString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatOrderDateTime(value: string | null | undefined): string {
  if (!value) return "Belum ditentukan";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Belum ditentukan";
  return date.toLocaleString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function returnDueSummary(
  endsAt: string | null,
  durationMinutes?: number,
): { when: string; late: boolean; remaining: string } {
  const whenMs = endsAt
    ? new Date(endsAt).getTime()
    : durationMinutes != null
      ? Date.now() + durationMinutes * 60_000
      : null;
  if (whenMs == null) {
    return { when: "Return time unknown", late: false, remaining: "" };
  }

  const late = whenMs < Date.now();
  const when = formatReturnBy(endsAt, durationMinutes);
  const diffMin = Math.ceil(Math.abs(whenMs - Date.now()) / 60_000);

  let remaining = "";
  if (late) {
    remaining =
      diffMin < 60
        ? `${diffMin} min late`
        : `${Math.floor(diffMin / 60)}h ${diffMin % 60}m late`;
  } else if (endsAt) {
    remaining =
      diffMin < 60
        ? `${diffMin} min left`
        : `${Math.floor(diffMin / 60)}h ${diffMin % 60}m left`;
  }

  return { when, late, remaining };
}

export function vehicleTypeLabel(t: string): string {
  switch (t) {
    case "bicycle":
      return "Bicycle";
    case "ebike":
      return "E-Bike";
    case "emoped":
      return "E-Moped";
    default:
      return t;
  }
}

export function modeLabel(mode: string): string {
  switch (mode) {
    case "digital":
      return "App digital key";
    case "key_handover":
      return "Physical key (shop)";
    case "both":
      return "App + physical key";
    default:
      return mode;
  }
}

export function keysAccessLabel(keys: string): string {
  switch (keys) {
    case "digital":
      return "App unlock only";
    case "physical":
    case "key_handover":
      return "Physical key at hub";
    case "both":
      return "App unlock + hub key";
    default:
      return keys;
  }
}

/** Always show a battery line — never blank. */
export function batteryPctLabel(
  batteryPct: number | null | undefined,
  vehicleType?: string,
): string {
  if (batteryPct != null) return `${batteryPct}%`;
  if (vehicleType === "bicycle") return "No pack";
  return "Charge TBD";
}

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

/** Walking estimate at a conservative urban pace (~72 m/min). Beyond a 60-minute walk, show distance only. */
export function formatWalkEta(km: number): string {
  const meters = Math.max(0, Math.round(km * 1000));
  const minutes = Math.max(1, Math.ceil(meters / 72));
  if (minutes > 60) return formatDistance(km);
  return `${minutes} min walk · ${formatDistance(km)}`;
}

export function relativeAge(
  value: string | number | Date,
  nowMs: number = Date.now(),
): { label: string; minutes: number; tone: "fresh" | "warn" | "danger" } {
  const timestamp = new Date(value).getTime();
  const minutes = Number.isFinite(timestamp)
    ? Math.max(0, Math.floor((nowMs - timestamp) / 60_000))
    : 0;
  const label =
    minutes < 1
      ? "Just now"
      : minutes === 1
        ? "1 min ago"
        : `${minutes} min ago`;
  return {
    label,
    minutes,
    tone: minutes >= 10 ? "danger" : minutes >= 5 ? "warn" : "fresh",
  };
}

/** Return allowed only within this radius of the hub (meters). */
export const RETURN_GEOFENCE_M = 80;

export function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  return haversineKm(lat1, lon1, lat2, lon2) * 1000;
}

export function isInsideReturnGeofence(
  userLat: number,
  userLng: number,
  zoneLat: number,
  zoneLng: number,
  radiusM: number = RETURN_GEOFENCE_M,
): boolean {
  return distanceMeters(userLat, userLng, zoneLat, zoneLng) <= radiusM;
}

export function formatMetersAway(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m away`;
  return `${(meters / 1000).toFixed(1)}km away`;
}

export function formatExtendLabel(minutes: number): string {
  if (minutes < 60) return `+${minutes} min`;
  if (minutes % (60 * 24 * 7) === 0) {
    const w = minutes / (60 * 24 * 7);
    return w === 1 ? "+1 week" : `+${w} weeks`;
  }
  if (minutes % (60 * 24) === 0) {
    const d = minutes / (60 * 24);
    return d === 1 ? "+1 day" : `+${d} days`;
  }
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    return h === 1 ? "+1 hour" : `+${h} hours`;
  }
  return `+${minutes} min`;
}

export function bookingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "CR-";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/** Demo rider: student kost near Margonda / UI Depok corridor. */
export const USER_LAT = -6.3705;
export const USER_LNG = 106.8245;

export function osmBrowseUrl(lat: number, lng: number, zoom = 16): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
}

export function osmStaticMapUrl(
  lat: number,
  lng: number,
  zoom = 15,
  w = 600,
  h = 360,
): string {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=${w}x${h}&maptype=mapnik`;
}

export function paymentMethodLabel(method: string): string {
  switch (method) {
    case "qris":
      return "QRIS";
    case "gopay":
      return "GoPay";
    case "ovo":
      return "OVO";
    case "dana":
      return "DANA";
    case "pay_at_operator":
      return "Bayar di toko";
    default:
      return method;
  }
}

export function pickupTypeLabel(pickup: string): string {
  return pickup === "self_service" ? "Ambil sendiri" : "Ambil di toko";
}

export function siteOpenClose(site: {
  opensAt?: string;
  closesAt?: string;
  hours: string;
}): { open: string; close: string } {
  if (site.opensAt && site.closesAt) {
    return { open: site.opensAt, close: site.closesAt };
  }
  const parts = site.hours.split(/\s*[-–—]\s*/);
  if (parts.length >= 2) {
    return { open: parts[0].trim(), close: parts[1].trim() };
  }
  return { open: site.hours, close: "—" };
}

export function batteryWh(voltageV: number, ah: number): number {
  return Math.round(voltageV * ah);
}

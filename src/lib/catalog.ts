import type {
  BatteryVoltageV,
  Booking,
  ChargingAddon,
  Operator,
  OperatorReview,
  OperatorSite,
  Vehicle,
  VehicleModel,
  VehicleType,
} from "./types";
import { batteryWh, haversineKm } from "./format";

export function modelBatteryLabel(m: {
  batteryVoltageV: number | null;
  batteryAh: number | null;
  vehicleType?: string;
}): string {
  if (m.vehicleType === "bicycle" || m.batteryVoltageV == null || m.batteryAh == null) {
    return "No battery · pedal";
  }
  return `${m.batteryVoltageV}V · ${m.batteryAh}Ah · ~${batteryWh(m.batteryVoltageV, m.batteryAh)}Wh`;
}

export function adaptersForVoltage(
  addons: ChargingAddon[],
  voltage: BatteryVoltageV | null,
): ChargingAddon[] {
  if (voltage == null) return [];
  return addons.filter(
    (a) => a.kind === "adapter" && (a.forVoltageV == null || a.forVoltageV === voltage),
  );
}

export function casanVouchers(addons: ChargingAddon[]): ChargingAddon[] {
  return addons.filter((a) => a.kind === "casan_voucher");
}

export function unitsForModel(
  vehicles: Vehicle[],
  modelId: string,
): Vehicle[] {
  return vehicles.filter((v) => v.modelId === modelId);
}

export function availableUnits(
  vehicles: Vehicle[],
  modelId: string,
): Vehicle[] {
  return unitsForModel(vehicles, modelId).filter(
    (v) => v.status === "available",
  );
}

export function pickAssignableUnit(
  vehicles: Vehicle[],
  modelId: string,
): Vehicle | null {
  const available = availableUnits(vehicles, modelId);
  if (available.length === 0) return null;
  const charged = available.filter(
    (v) => v.batteryPct == null || v.batteryPct >= 30,
  );
  const pool = charged.length ? charged : available;
  return [...pool].sort(
    (a, b) => (b.batteryPct ?? 100) - (a.batteryPct ?? 100),
  )[0];
}

export interface ModelListing {
  model: VehicleModel;
  availableCount: number;
  totalCount: number;
  bestBattery: number | null;
}

export function listModelsForOperator(
  models: VehicleModel[],
  vehicles: Vehicle[],
  operatorId: string,
  typeFilter: VehicleType | "all" = "all",
  query = "",
): ModelListing[] {
  const q = query.toLowerCase();
  return models
    .filter((m) => m.operatorId === operatorId)
    .filter((m) => typeFilter === "all" || m.vehicleType === typeFilter)
    .filter((m) => `${m.name} ${m.description}`.toLowerCase().includes(q))
    .map((model) => {
      const units = unitsForModel(vehicles, model.id);
      const available = units.filter((v) => v.status === "available");
      const batts = available
        .map((v) => v.batteryPct)
        .filter((b): b is number => b != null);
      return {
        model,
        availableCount: available.length,
        totalCount: units.length,
        bestBattery: batts.length ? Math.max(...batts) : null,
      };
    });
}

export function listAllModels(
  models: VehicleModel[],
  vehicles: Vehicle[],
  typeFilter: VehicleType | "all" = "all",
  query = "",
  operatorsNames: Record<string, string> = {},
): ModelListing[] {
  const q = query.toLowerCase();
  return models
    .filter((m) => typeFilter === "all" || m.vehicleType === typeFilter)
    .filter((m) => {
      const hay = `${m.name} ${m.description} ${operatorsNames[m.operatorId] ?? ""}`.toLowerCase();
      return hay.includes(q);
    })
    .map((model) => {
      const units = unitsForModel(vehicles, model.id);
      const available = units.filter((v) => v.status === "available");
      const batts = available
        .map((v) => v.batteryPct)
        .filter((b): b is number => b != null);
      return {
        model,
        availableCount: available.length,
        totalCount: units.length,
        bestBattery: batts.length ? Math.max(...batts) : null,
      };
    })
    .filter((x) => x.availableCount > 0 || x.totalCount > 0)
    .sort((a, b) => b.availableCount - a.availableCount);
}

/** One listing per (model × site) with stock — distance from the site, not operator HQ. */
export interface HubModelListing extends ModelListing {
  siteId: string;
  siteName: string;
  siteArea: string;
  siteCity: string;
  operatorName: string;
  distKm: number;
}

export function listModelsByHub(
  models: VehicleModel[],
  vehicles: Vehicle[],
  sites: OperatorSite[],
  operators: Operator[],
  typeFilter: VehicleType | "all" = "all",
  query = "",
  userLat: number,
  userLng: number,
): HubModelListing[] {
  const q = query.trim().toLowerCase();
  const opName = Object.fromEntries(operators.map((o) => [o.id, o.name]));
  const siteById = Object.fromEntries(sites.map((s) => [s.id, s]));
  const results: HubModelListing[] = [];

  for (const model of models) {
    if (typeFilter !== "all" && model.vehicleType !== typeFilter) continue;

    const available = availableUnits(vehicles, model.id);
    const bySite = new Map<string, Vehicle[]>();
    for (const v of available) {
      if (!v.siteId) continue;
      const list = bySite.get(v.siteId) ?? [];
      list.push(v);
      bySite.set(v.siteId, list);
    }

    for (const [siteId, unitsAtSite] of bySite) {
      const site = siteById[siteId];
      if (!site) continue;
      const operatorName = opName[model.operatorId] ?? "";
      const hay =
        `${model.name} ${model.description} ${site.name} ${site.area} ${site.city} ${site.address} ${operatorName}`.toLowerCase();
      if (q && !hay.includes(q)) continue;

      const allAtSite = unitsForModel(vehicles, model.id).filter(
        (v) => v.siteId === siteId,
      );
      const batts = unitsAtSite
        .map((v) => v.batteryPct)
        .filter((b): b is number => b != null);

      results.push({
        model,
        availableCount: unitsAtSite.length,
        totalCount: allAtSite.length,
        bestBattery: batts.length ? Math.max(...batts) : null,
        siteId,
        siteName: site.name,
        siteArea: site.area,
        siteCity: site.city,
        operatorName,
        distKm: haversineKm(userLat, userLng, site.lat, site.lng),
      });
    }
  }

  return results.sort((a, b) => a.distKm - b.distKm);
}

export interface HubListing {
  site: OperatorSite;
  operator: Operator;
  distKm: number;
  availableCount: number;
  ratingAvg: number | null;
}

/** Rider discovery unit: a physical pickup location (site), not the operator brand. */
export function listHubs(
  sites: OperatorSite[],
  operators: Operator[],
  vehicles: Vehicle[],
  bookings: Booking[],
  reviews: OperatorReview[],
  query = "",
  userLat: number,
  userLng: number,
): HubListing[] {
  const q = query.trim().toLowerCase();
  const opById = Object.fromEntries(operators.map((o) => [o.id, o]));

  return sites
    .map((site) => {
      const operator = opById[site.operatorId];
      if (!operator) return null;
      const hay =
        `${site.name} ${site.area} ${site.city} ${site.address} ${operator.name}`.toLowerCase();
      if (q && !hay.includes(q)) return null;
      const availableCount = vehicles.filter(
        (v) => v.siteId === site.id && v.status === "available",
      ).length;
      const rating = operatorRatingStats(operator.id, bookings, reviews);
      return {
        site,
        operator,
        distKm: haversineKm(userLat, userLng, site.lat, site.lng),
        availableCount,
        ratingAvg: rating.count ? rating.avg : null,
      };
    })
    .filter((x): x is HubListing => x != null)
    .sort((a, b) => a.distKm - b.distKm);
}

export function operatorRatingStats(
  operatorId: string,
  bookings: Booking[],
  seedReviews: OperatorReview[],
): { avg: number; count: number; reviews: OperatorReview[] } {
  const fromBookings: OperatorReview[] = bookings
    .filter(
      (b) =>
        b.operatorId === operatorId &&
        b.rating != null &&
        b.status === "completed",
    )
    .map((b) => ({
      id: `br-${b.id}`,
      operatorId,
      riderName: b.riderName,
      rating: b.rating!,
      note: b.reviewNote || "Great ride",
      modelName: b.durationLabel,
      createdAt: b.createdAt,
    }));

  const seeded = seedReviews.filter((r) => r.operatorId === operatorId);
  const reviews = [...fromBookings, ...seeded].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const count = reviews.length;
  const avg =
    count === 0
      ? 0
      : Math.round(
          (reviews.reduce((s, r) => s + r.rating, 0) / count) * 10,
        ) / 10;
  return { avg, count, reviews };
}

export function waLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function mailLink(email: string, subject: string, body = ""): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}${
    body ? `&body=${encodeURIComponent(body)}` : ""
  }`;
}

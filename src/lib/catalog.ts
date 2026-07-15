import type {
  BatteryVoltageV,
  Booking,
  ChargingAddon,
  OperatorReview,
  Vehicle,
  VehicleModel,
  VehicleType,
} from "./types";
import { batteryWh } from "./format";

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

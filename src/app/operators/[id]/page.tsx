"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Header } from "@/components/Header";
import { useAppStore } from "@/lib/store";
import {
  formatDistance,
  formatIdrShort,
  haversineKm,
  modeLabel,
  USER_LAT,
  USER_LNG,
  vehicleTypeLabel,
} from "@/lib/format";

export default function OperatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const operators = useAppStore((s) => s.operators);
  const vehicles = useAppStore((s) => s.vehicles);
  const op = operators.find((o) => o.id === id);
  const fleet = vehicles.filter((v) => v.operatorId === id);

  if (!op) {
    return (
      <div>
        <Header title="Not found" backHref="/home" />
        <p className="p-6">Operator not found.</p>
      </div>
    );
  }

  const dist = formatDistance(haversineKm(USER_LAT, USER_LNG, op.lat, op.lng));
  const available = fleet.filter((v) => v.status === "available");

  return (
    <div className="content-pad pb-8">
      <Header title={op.name} subtitle="Rental station" backHref="/home" />
      <div
        className="relative mx-4 mt-3 h-40 overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(145deg, #b8d4ce, #9bc4bb)",
        }}
      >
        <div className="absolute left-1/2 top-[40%] -translate-x-1/2 text-3xl">📍</div>
      </div>
      <div className="card">
        <div className="flex justify-between">
          <div>
            <div className="text-lg font-bold">{op.name}</div>
            <div className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
              {op.address}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span
                className="rounded-full px-2 py-1 font-semibold"
                style={{ background: "#E8F8F5", color: "var(--ok)" }}
              >
                Open · {op.hours}
              </span>
              <span style={{ color: "var(--text2)" }}>{dist} away</span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
              {available.length}
            </div>
            <div className="text-[11px]" style={{ color: "var(--text2)" }}>
              available
            </div>
          </div>
        </div>
        <div className="mt-3 border-t pt-3 text-xs" style={{ borderColor: "var(--border)", color: "var(--text2)" }}>
          Pickup:{" "}
          <strong>
            {[
              op.supportsFrontDesk ? "Front Desk" : null,
              op.supportsSelfService ? "Self-Service" : null,
            ]
              .filter(Boolean)
              .join(" & ")}
          </strong>
        </div>
      </div>

      <p className="section-label">Fleet</p>
      {fleet.map((v) => (
        <Link
          key={v.id}
          href={`/vehicles/${v.id}`}
          className="mx-4 mb-2.5 flex gap-3 rounded-2xl p-3.5"
          style={{ background: "var(--card)", opacity: v.status === "available" ? 1 : 0.7 }}
        >
          <div className="text-4xl">{v.emoji}</div>
          <div className="flex-1">
            <div className="font-bold">{v.name}</div>
            <div className="text-xs" style={{ color: "var(--text2)" }}>
              {vehicleTypeLabel(v.vehicleType)} · {modeLabel(v.rentalMode)}
              {v.batteryPct != null ? ` · ${v.batteryPct}%` : ""}
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="font-bold" style={{ color: "var(--primary)" }}>
                {formatIdrShort(v.pricePerHour)}/hr
              </span>
              <span className="capitalize" style={{ color: "var(--text2)" }}>
                {v.status}
              </span>
            </div>
          </div>
        </Link>
      ))}

      <div className="card">
        <div className="mb-2 font-bold">Contact</div>
        <div className="text-sm" style={{ color: "var(--text2)" }}>
          {op.phone}
          <br />
          {op.email}
        </div>
      </div>
    </div>
  );
}

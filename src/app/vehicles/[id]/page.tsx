"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { DEPOSIT_IDR, defaultPricingForHourly } from "@/lib/seed";
import {
  formatIdr,
  formatIdrShort,
  modeLabel,
  vehicleTypeLabel,
} from "@/lib/format";
import type { PickupType } from "@/lib/types";
import { Star } from "lucide-react";

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const vehicles = useAppStore((s) => s.vehicles);
  const operators = useAppStore((s) => s.operators);
  const pricing = useAppStore((s) => s.pricing);
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const createBooking = useAppStore((s) => s.createBooking);
  const setToast = useAppStore((s) => s.setToast);

  const vehicle = vehicles.find((v) => v.id === id);
  const op = operators.find((o) => o.id === vehicle?.operatorId);

  const tiers = useMemo(() => {
    if (!vehicle) return [];
    return (
      pricing[vehicle.operatorId] ?? defaultPricingForHourly(vehicle.pricePerHour)
    );
  }, [pricing, vehicle]);

  const [pickup, setPickup] = useState<PickupType>(
    vehicle?.allowFrontDesk ? "front_desk" : "self_service",
  );
  const [tierIdx, setTierIdx] = useState(1);
  const [simAck, setSimAck] = useState(false);

  if (!vehicle || !op) {
    return <div className="p-6">Vehicle not found.</div>;
  }

  const tier = tiers[Math.min(tierIdx, tiers.length - 1)];
  const total = tier.priceIdr + DEPOSIT_IDR;
  const canBook =
    vehicle.status === "available" &&
    (vehicle.batteryPct == null || vehicle.batteryPct >= 30) &&
    (!vehicle.requiresSimAck || simAck);

  async function book() {
    if (!canBook) return;
    const booking = createBooking({
      vehicleId: vehicle!.id,
      pickupType: pickup,
      durationLabel: tier.label,
      durationMinutes: tier.durationMinutes,
      rentalPriceIdr: tier.priceIdr,
      paymentMethod: "qris",
    });
    if (!booking) {
      setToast("Vehicle unavailable");
      return;
    }
    setToast("Booking created — continue to payment");
    router.push(`/book/${booking.id}`);
  }

  return (
    <div className="pb-8">
      <div
        className="relative flex h-52 items-end justify-center pb-5 text-white"
        style={{
          background:
            "linear-gradient(145deg, var(--primary-dark), var(--primary), var(--primary-light))",
        }}
      >
        <button
          type="button"
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/25 text-xl"
          onClick={() => router.back()}
        >
          ‹
        </button>
        <button
          type="button"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/25"
          onClick={() => toggleFavorite(vehicle.id)}
        >
          <Star
            size={18}
            fill={favorites.includes(vehicle.id) ? "#F4D03F" : "none"}
            color="#F4D03F"
          />
        </button>
        <div className="absolute top-1/2 -translate-y-8 text-7xl">{vehicle.emoji}</div>
        <div className="relative z-10 w-full px-5">
          <h2 className="font-display text-2xl font-semibold">{vehicle.name}</h2>
          <p className="text-sm text-white/85">
            {op.name} · {vehicleTypeLabel(vehicle.vehicleType)} · {modeLabel(vehicle.rentalMode)}
          </p>
        </div>
      </div>

      <div
        className="mx-4 -mt-3 grid grid-cols-3 gap-3 rounded-2xl p-4 shadow"
        style={{ background: "var(--card)" }}
      >
        <Spec
          value={vehicle.motorWatts ? `${vehicle.motorWatts}W` : "—"}
          label="Motor"
        />
        <Spec value={vehicle.rangeKm ? `${vehicle.rangeKm}km` : "—"} label="Range" />
        <Spec
          value={vehicle.maxSpeedKmh ? `${vehicle.maxSpeedKmh}` : "—"}
          label="Max km/h"
        />
        <Spec
          value={vehicle.batteryPct != null ? `${vehicle.batteryPct}%` : "N/A"}
          label="Battery"
        />
        <Spec value={vehicle.weightKg ? `${vehicle.weightKg}kg` : "—"} label="Weight" />
        <Spec value={vehicle.code} label="Code" />
      </div>

      <p className="section-label">Pickup type</p>
      {vehicle.allowFrontDesk ? (
        <PickupOption
          selected={pickup === "front_desk"}
          title="Collect from Front Desk"
          desc="Staff handed key or vehicle at counter"
          onClick={() => setPickup("front_desk")}
        />
      ) : null}
      {vehicle.allowSelfService ? (
        <PickupOption
          selected={pickup === "self_service"}
          title="Self-Service Pickup"
          desc="Unlock yourself at the parking point"
          onClick={() => setPickup("self_service")}
        />
      ) : null}

      <p className="section-label">Duration</p>
      <div className="grid grid-cols-3 gap-2 px-4">
        {tiers.slice(0, 9).map((t, i) => (
          <button
            key={t.label}
            type="button"
            className="rounded-xl border-2 p-3 text-center"
            style={{
              borderColor: tierIdx === i ? "var(--primary)" : "var(--border)",
              background:
                tierIdx === i
                  ? "color-mix(in srgb, var(--primary) 8%, white)"
                  : "var(--card)",
            }}
            onClick={() => setTierIdx(i)}
          >
            <div className="text-sm font-bold">{t.label}</div>
            <div className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
              {formatIdrShort(t.priceIdr)}
            </div>
          </button>
        ))}
      </div>

      {vehicle.requiresSimAck ? (
        <label className="card mt-3 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={simAck}
            onChange={(e) => setSimAck(e.target.checked)}
            className="mt-1"
          />
          <span>
            I confirm I hold a valid Indonesian driving license (SIM) for e-moped
            use.
          </span>
        </label>
      ) : null}

      <div className="card mt-3">
        <div className="flex justify-between py-2 text-sm">
          <span>Rental ({tier.label})</span>
          <span>{formatIdr(tier.priceIdr)}</span>
        </div>
        <div className="flex justify-between border-t border-dashed py-2 text-sm" style={{ borderColor: "var(--border)" }}>
          <span>Security deposit</span>
          <span>{formatIdr(DEPOSIT_IDR)}</span>
        </div>
        <div className="flex justify-between border-t-2 pt-3 text-base font-bold" style={{ borderColor: "var(--text)" }}>
          <span>Total due</span>
          <span>{formatIdr(total)}</span>
        </div>
      </div>

      <button
        type="button"
        className="btn-primary"
        disabled={!canBook}
        style={{ opacity: canBook ? 1 : 0.5 }}
        onClick={book}
      >
        Continue to payment
      </button>
    </div>
  );
}

function Spec({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-base font-bold" style={{ color: "var(--primary)" }}>
        {value}
      </div>
      <div className="text-[11px]" style={{ color: "var(--text2)" }}>
        {label}
      </div>
    </div>
  );
}

function PickupOption({
  selected,
  title,
  desc,
  onClick,
}: {
  selected: boolean;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-4 mb-2 flex w-[calc(100%-32px)] items-center gap-3 rounded-2xl border-2 p-4 text-left"
      style={{
        borderColor: selected ? "var(--primary)" : "var(--border)",
        background: selected
          ? "color-mix(in srgb, var(--primary) 8%, white)"
          : "var(--card)",
      }}
    >
      <div className="flex-1">
        <div className="font-bold text-[15px]">{title}</div>
        <div className="text-xs" style={{ color: "var(--text2)" }}>
          {desc}
        </div>
      </div>
      <div
        className="flex h-5 w-5 items-center justify-center rounded-full border-2"
        style={{
          borderColor: selected ? "var(--primary)" : "var(--border)",
          background: selected ? "var(--primary)" : "transparent",
          color: "white",
          fontSize: 11,
        }}
      >
        {selected ? "✓" : ""}
      </div>
    </button>
  );
}

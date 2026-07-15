"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { DEPOSIT_IDR, defaultPricingForHourly } from "@/lib/seed";
import {
  batteryWh,
  formatIdr,
  formatIdrShort,
  modeLabel,
  batteryPctLabel,
  osmBrowseUrl,
  vehicleTypeLabel,
} from "@/lib/format";
import type { PickupType } from "@/lib/types";
import { Star } from "lucide-react";
import { PhotoGallery } from "@/components/PhotoGallery";
import { ContactActions } from "@/components/ContactActions";
import { MockMap } from "@/components/MockMap";
import {
  adaptersForVoltage,
  availableUnits,
  casanVouchers,
  modelBatteryLabel,
  operatorRatingStats,
} from "@/lib/catalog";
import { Header } from "@/components/Header";

export default function ModelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const models = useAppStore((s) => s.models);
  const vehicles = useAppStore((s) => s.vehicles);
  const operators = useAppStore((s) => s.operators);
  const pricing = useAppStore((s) => s.pricing);
  const favorites = useAppStore((s) => s.favorites);
  const reviews = useAppStore((s) => s.reviews);
  const bookings = useAppStore((s) => s.bookings);
  const chargingAddons = useAppStore((s) => s.chargingAddons);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const createBooking = useAppStore((s) => s.createBooking);
  const setToast = useAppStore((s) => s.setToast);

  const model = models.find((m) => m.id === id);
  const op = operators.find((o) => o.id === model?.operatorId);
  const units = model ? availableUnits(vehicles, model.id) : [];
  const rating = op
    ? operatorRatingStats(op.id, bookings, reviews)
    : { avg: 0, count: 0, reviews: [] };

  const tiers = useMemo(() => {
    if (!model) return [];
    return (
      pricing[model.operatorId] ?? defaultPricingForHourly(model.pricePerHour)
    );
  }, [pricing, model]);

  const vouchers = useMemo(
    () => casanVouchers(chargingAddons),
    [chargingAddons],
  );
  const adapters = useMemo(
    () =>
      model ? adaptersForVoltage(chargingAddons, model.batteryVoltageV) : [],
    [chargingAddons, model],
  );

  const [pickup, setPickup] = useState<PickupType>(
    model?.allowFrontDesk ? "front_desk" : "self_service",
  );
  const [tierIdx, setTierIdx] = useState(1);
  const [simAck, setSimAck] = useState(false);
  const [voucherId, setVoucherId] = useState<string | null>(null);
  const [adapterId, setAdapterId] = useState<string | null>(null);

  if (!model || !op) {
    return (
      <div>
        <Header title="Not found" backHref="/home" />
        <p className="p-6">Model not found.</p>
      </div>
    );
  }

  const tier = tiers[Math.min(tierIdx, tiers.length - 1)];
  const selectedAddons = chargingAddons.filter(
    (a) => a.id === voucherId || a.id === adapterId,
  );
  const addonsTotal = selectedAddons.reduce((s, a) => s + a.priceIdr, 0);
  const total = tier.priceIdr + addonsTotal + DEPOSIT_IDR;
  const selectedAdapter = adapters.find((a) => a.id === adapterId);
  const canBook =
    units.length > 0 &&
    (units[0].batteryPct == null ||
      units.some((u) => (u.batteryPct ?? 100) >= 30)) &&
    (!model.requiresSimAck || simAck);

  async function book() {
    if (!canBook) return;
    const addonIds = [voucherId, adapterId].filter(
      (x): x is string => Boolean(x),
    );
    const booking = createBooking({
      modelId: model!.id,
      pickupType: pickup,
      durationLabel: tier.label,
      durationMinutes: tier.durationMinutes,
      rentalPriceIdr: tier.priceIdr,
      paymentMethod: "qris",
      addonIds,
    });
    if (!booking) {
      setToast("No units available right now");
      return;
    }
    setToast("Booking created — continue to payment");
    router.push(`/book/${booking.id}`);
  }

  return (
    <div className="pb-8">
      <div className="relative">
        <PhotoGallery images={model.images} alt={model.name} tall />
        <button
          type="button"
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-xl text-white"
          onClick={() => router.back()}
        >
          ‹
        </button>
        <button
          type="button"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/35"
          onClick={() => toggleFavorite(model.id)}
        >
          <Star
            size={18}
            fill={favorites.includes(model.id) ? "#F4D03F" : "none"}
            color="#F4D03F"
          />
        </button>
        <div className="absolute bottom-3 left-4 right-4 flex justify-between text-white drop-shadow">
          <div>
            <div className="font-display text-xl font-semibold">{model.name}</div>
            <div className="text-xs text-white/90">
              {vehicleTypeLabel(model.vehicleType)} · {units.length} available ·{" "}
              {modelBatteryLabel(model)}
            </div>
          </div>
        </div>
      </div>

      <div className="card -mt-2">
        <Link
          href={`/operators/${op.id}`}
          className="flex items-center justify-between"
        >
          <div>
            <div className="font-bold text-sm">{op.name}</div>
            <div className="text-xs" style={{ color: "var(--text2)" }}>
              {rating.count > 0
                ? `★ ${rating.avg} · ${rating.count} reviews`
                : "New operator"}
              {op.city ? ` · ${op.city}` : ""}
            </div>
          </div>
          <span
            className="text-xs font-semibold"
            style={{ color: "var(--primary)" }}
          >
            View →
          </span>
        </Link>
        <p className="mt-3 text-sm" style={{ color: "var(--text2)" }}>
          {model.description}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {model.includes.map((inc) => (
            <span
              key={inc}
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: "var(--bg-deep)", color: "var(--primary)" }}
            >
              {inc}
            </span>
          ))}
        </div>
      </div>

      <div
        className="mx-4 grid grid-cols-3 gap-3 rounded-2xl p-4"
        style={{ background: "var(--card)" }}
      >
        {model.vehicleType === "bicycle" || model.batteryVoltageV == null ? (
          <>
            <Spec value="Pedal" label="Power" />
            <Spec value="Physical" label="Key" />
            <Spec value={String(units.length)} label="In stock" />
          </>
        ) : (
          <>
            <Spec value={`${model.batteryVoltageV}V`} label="Battery V" />
            <Spec value={`${model.batteryAh}Ah`} label="Capacity" />
            <Spec
              value={`${batteryWh(model.batteryVoltageV, model.batteryAh!)}Wh`}
              label="Energy"
            />
            <Spec
              value={
                units.some((u) => u.batteryPct != null)
                  ? `up to ${Math.max(...units.map((u) => u.batteryPct ?? 0))}%`
                  : batteryPctLabel(null, model.vehicleType)
              }
              label="Charge now"
            />
            <Spec value={modeLabel(model.rentalMode)} label="Keys" />
            <Spec value={String(units.length)} label="In stock" />
          </>
        )}
      </div>

      {(model.rentalMode === "both" || model.rentalMode === "key_handover") ? (
        <div
          className="mx-4 mt-3 rounded-xl border p-3 text-xs"
          style={{
            borderColor: "var(--primary)",
            background: "color-mix(in srgb, var(--primary) 8%, white)",
          }}
        >
          <div className="font-bold" style={{ color: "var(--primary)" }}>
            {model.rentalMode === "both"
              ? "App digital key + physical key"
              : "Physical key at shop only"}
          </div>
          <p className="mt-1" style={{ color: "var(--text2)" }}>
            {model.vehicleType === "bicycle"
              ? "No battery pack. Staff give you the metal key at the shop, and collect it when you return."
              : model.rentalMode === "both"
                ? "Pick up the real key at the shop, then unlock/start the motor in the app."
                : "Collect the physical key at the shop after staff confirm your request."}
          </p>
        </div>
      ) : null}

      {model.vehicleType !== "bicycle" && model.batteryVoltageV != null ? (
        <>
      <p className="section-label">Charging add-ons</p>
      <div className="mx-4 mb-2 rounded-xl p-3 text-xs" style={{ background: "var(--bg-deep)" }}>
        <div className="font-semibold" style={{ color: "var(--primary)" }}>
          Casan charging voucher
        </div>
        <p className="mt-1" style={{ color: "var(--text2)" }}>
          Redeem overnight slots at Casan hubs near campus / kost.
        </p>
      </div>
      <AddonChoice
        selected={voucherId === null}
        title="No voucher"
        desc="Skip — charge at home or later"
        price={0}
        onClick={() => setVoucherId(null)}
      />
      {vouchers.map((v) => (
        <AddonChoice
          key={v.id}
          selected={voucherId === v.id}
          title={v.label}
          desc={v.description}
          price={v.priceIdr}
          onClick={() => setVoucherId(v.id)}
        />
      ))}

      <div className="mx-4 mb-2 mt-3 rounded-xl p-3 text-xs" style={{ background: "var(--bg-deep)" }}>
        <div className="font-semibold" style={{ color: "var(--primary)" }}>
          Include charging adapter ({model.batteryVoltageV}V only)
        </div>
        <p className="mt-1" style={{ color: "var(--text2)" }}>
          Recommended default: {model.chargerAmpsDefault}A for kost overnight.
        </p>
      </div>
      <AddonChoice
        selected={adapterId === null}
        title="No adapter"
        desc="Use Casan voucher or your own matching charger"
        price={0}
        onClick={() => setAdapterId(null)}
      />
      {adapters.map((a) => (
        <AddonChoice
          key={a.id}
          selected={adapterId === a.id}
          title={a.label}
          desc={a.description}
          price={a.priceIdr}
          warn={a.amps != null && a.amps >= 5}
          onClick={() => setAdapterId(a.id)}
        />
      ))}
      {selectedAdapter && (selectedAdapter.amps ?? 0) >= 5 ? (
        <div
          className="mx-4 mb-2 rounded-xl border p-3 text-xs"
          style={{ borderColor: "var(--warn)", background: "#FEF5E7" }}
        >
          <strong>Kost warning:</strong> {selectedAdapter.amps}A may trip shared
          900 VA outlets. Prefer a Casan hub bay for daytime fast charge.
        </div>
      ) : null}

      </>
      ) : null}

      <p className="section-label">How will you pick up?</p>
      {model.rentalMode === "both" || model.rentalMode === "key_handover" ? (
        <PickupOption
          selected
          title="Collect at shop (required)"
          desc={`${op.shopPickupLabel}. ${
            model.rentalMode === "both"
              ? "Physical key handover + app digital unlock."
              : "Physical key handover with staff."
          } Booking request needs operator confirm.`}
          onClick={() => setPickup("front_desk")}
        />
      ) : (
        <>
          {model.allowFrontDesk ? (
            <PickupOption
              selected={pickup === "front_desk"}
              title="Collect at shop"
              desc={`${op.shopPickupLabel}. Staff will hand over the bike.`}
              onClick={() => setPickup("front_desk")}
            />
          ) : null}
          {model.allowSelfService ? (
            <PickupOption
              selected={pickup === "self_service"}
              title="Self-collect at location"
              desc={`${op.selfCollectLabel}. App digital key — no staff required.`}
              onClick={() => setPickup("self_service")}
            />
          ) : null}
        </>
      )}

      {pickup === "self_service" &&
      model.allowSelfService &&
      model.rentalMode === "digital" ? (
        <>
          <div className="mx-4 mb-2">
            <MockMap
              height={140}
              mapImage={op.mapImage}
              label="OpenStreetMap · self-collect"
              pins={[
                {
                  id: "self",
                  label: "Self-collect",
                  top: "48%",
                  left: "58%",
                },
              ]}
              userPin={{ top: "68%", left: "38%" }}
            />
          </div>
          <a
            className="mx-4 mb-2 block rounded-xl px-3 py-2 text-center text-xs font-bold"
            style={{ background: "var(--bg-deep)", color: "var(--primary)" }}
            href={osmBrowseUrl(op.selfCollectLat, op.selfCollectLng)}
            target="_blank"
            rel="noreferrer"
          >
            Open self-collect pin on OpenStreetMap →
          </a>
        </>
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

      {model.requiresSimAck ? (
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
        {selectedAddons.map((a) => (
          <div key={a.id} className="flex justify-between py-1 text-sm">
            <span>{a.label}</span>
            <span>{formatIdr(a.priceIdr)}</span>
          </div>
        ))}
        <div
          className="flex justify-between border-t border-dashed py-2 text-sm"
          style={{ borderColor: "var(--border)" }}
        >
          <span>Security deposit</span>
          <span>{formatIdr(DEPOSIT_IDR)}</span>
        </div>
        <div
          className="flex justify-between border-t-2 pt-3 text-base font-bold"
          style={{ borderColor: "var(--text)" }}
        >
          <span>Total due</span>
          <span>{formatIdr(total)}</span>
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--text2)" }}>
          A free unit is assigned automatically at booking
          {units[0] ? ` (e.g. ${units[0].code})` : ""}.
        </p>
      </div>

      <button
        type="button"
        className="btn-primary"
        disabled={!canBook}
        style={{ opacity: canBook ? 1 : 0.5 }}
        onClick={book}
      >
        {units.length === 0 ? "Sold out" : "Continue to payment"}
      </button>
      {!canBook && units.length > 0 ? (
        <p
          className="-mt-2 px-6 pb-2 text-center text-xs font-semibold"
          style={{ color: "var(--warn)" }}
        >
          {model.requiresSimAck && !simAck
            ? "Tick the SIM / license box above to continue"
            : "All units are low on battery right now — try again soon"}
        </p>
      ) : null}

      <div className="card">
        <div className="mb-2 font-bold text-sm">Questions? Contact {op.name}</div>
        <ContactActions phone={op.phone} email={op.email} name={op.name} />
      </div>
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

function AddonChoice({
  selected,
  title,
  desc,
  price,
  warn,
  onClick,
}: {
  selected: boolean;
  title: string;
  desc: string;
  price: number;
  warn?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-4 mb-2 flex w-[calc(100%-32px)] items-center gap-3 rounded-2xl border-2 p-3.5 text-left"
      style={{
        borderColor: selected
          ? warn
            ? "var(--warn)"
            : "var(--primary)"
          : "var(--border)",
        background: selected
          ? warn
            ? "#FEF5E7"
            : "color-mix(in srgb, var(--primary) 8%, white)"
          : "var(--card)",
      }}
    >
      <div className="flex-1">
        <div className="font-bold text-[14px]">{title}</div>
        <div className="text-[11px]" style={{ color: "var(--text2)" }}>
          {desc}
        </div>
      </div>
      <div className="text-right">
        <div className="text-xs font-bold" style={{ color: "var(--primary)" }}>
          {price === 0 ? "Free" : formatIdrShort(price)}
        </div>
        <div
          className="ml-auto mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2"
          style={{
            borderColor: selected ? "var(--primary)" : "var(--border)",
            background: selected ? "var(--primary)" : "transparent",
            color: "white",
            fontSize: 11,
          }}
        >
          {selected ? "✓" : ""}
        </div>
      </div>
    </button>
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

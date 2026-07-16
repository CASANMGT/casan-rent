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

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultAppointmentInput(): string {
  const d = new Date(Date.now() + 60 * 60_000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return toLocalInput(d);
}

function appointmentSlot(hoursFromNow: number, label: string) {
  const d = new Date(Date.now() + hoursFromNow * 60_000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return { label, value: toLocalInput(d) };
}

export default function ModelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const models = useAppStore((s) => s.models);
  const vehicles = useAppStore((s) => s.vehicles);
  const operators = useAppStore((s) => s.operators);
  const sites = useAppStore((s) => s.sites);
  const pricing = useAppStore((s) => s.pricing);
  const reviews = useAppStore((s) => s.reviews);
  const bookings = useAppStore((s) => s.bookings);
  const chargingAddons = useAppStore((s) => s.chargingAddons);
  const createBooking = useAppStore((s) => s.createBooking);
  const setToast = useAppStore((s) => s.setToast);

  const model = models.find((m) => m.id === id);
  const op = operators.find((o) => o.id === model?.operatorId);
  const units = model ? availableUnits(vehicles, model.id) : [];
  const availableSites = useMemo(
    () =>
      sites
        .filter(
          (site) =>
            site.operatorId === model?.operatorId &&
            units.some((unit) => unit.siteId === site.id),
        )
        .map((site) => ({
          site,
          count: units.filter((unit) => unit.siteId === site.id).length,
        })),
    [sites, units, model?.operatorId],
  );
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
  const [tierIdx, setTierIdx] = useState(0);
  const [simAck, setSimAck] = useState(false);
  const [voucherId, setVoucherId] = useState<string | null>(null);
  const [adapterId, setAdapterId] = useState<string | null>(null);
  const [showCharging, setShowCharging] = useState(false);
  const [appointmentInput, setAppointmentInput] = useState(
    defaultAppointmentInput,
  );
  const [selectedSiteId, setSelectedSiteId] = useState(
    units[0]?.siteId ?? "",
  );

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
  const selectedSite =
    availableSites.find(({ site }) => site.id === selectedSiteId)?.site ??
    availableSites[0]?.site;
  const selectedSiteUnits = units.filter(
    (unit) => unit.siteId === selectedSite?.id,
  );
  const appointmentMs = new Date(appointmentInput).getTime();
  const appointmentValid =
    Boolean(appointmentInput) &&
    Number.isFinite(appointmentMs) &&
    appointmentMs >= Date.now();
  const canBook =
    selectedSiteUnits.length > 0 &&
    (selectedSiteUnits[0].batteryPct == null ||
      selectedSiteUnits.some((u) => (u.batteryPct ?? 100) >= 30)) &&
    (!model.requiresSimAck || simAck) &&
    appointmentValid;

  async function book() {
    if (!canBook) return;
    const addonIds = [voucherId, adapterId].filter(
      (x): x is string => Boolean(x),
    );
    const booking = createBooking({
      modelId: model!.id,
      siteId: selectedSite?.id,
      pickupType: pickup,
      durationLabel: tier.label,
      durationMinutes: tier.durationMinutes,
      rentalPriceIdr: tier.priceIdr,
      paymentMethod: "qris",
      addonIds,
      appointmentAt: new Date(appointmentMs).toISOString(),
    });
    if (!booking) {
      setToast("No units available right now");
      return;
    }
    setToast("Booking created — continue to payment");
    router.push(`/book/${booking.id}`);
  }

  const slots = [
    appointmentSlot(60, "In 1 hour"),
    appointmentSlot(120, "In 2 hours"),
    appointmentSlot(24 * 60, "Tomorrow"),
  ];

  return (
    <div className="pb-32">
      <div className="relative">
        <PhotoGallery images={model.images} alt={model.name} tall />
        <button
          type="button"
          aria-label="Go back"
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-xl text-white"
          onClick={() => router.back()}
        >
          ‹
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
              {rating.count > 0 ? (
                <>
                  <span style={{ color: "#F4D03F" }}>★</span> {rating.avg} ·{" "}
                  {rating.count} reviews
                </>
              ) : (
                "New operator"
              )}
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
          <div className="mt-2 px-4">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm font-semibold"
              style={{
                borderColor: "var(--border)",
                background: "var(--card)",
              }}
              onClick={() => setShowCharging((v) => !v)}
              aria-expanded={showCharging}
            >
              <span>Need overnight charge?</span>
              <span style={{ color: "var(--text2)" }}>
                {showCharging ? "Hide" : "Show"}
                {selectedAddons.length
                  ? ` · ${selectedAddons.length} selected`
                  : " · optional"}
              </span>
            </button>
          </div>
          {showCharging ? (
            <>
              <p className="section-label">Charging voucher</p>
              <div
                className="mx-4 mb-2 rounded-xl p-3 text-xs"
                style={{ background: "var(--bg-deep)" }}
              >
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

              <p className="section-label">Portable adapter</p>
              <div
                className="mx-4 mb-2 rounded-xl p-3 text-xs"
                style={{ background: "var(--bg-deep)" }}
              >
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
                  <strong>Kost warning:</strong> {selectedAdapter.amps}A may trip
                  shared 900 VA outlets. Prefer a Casan hub bay for daytime fast
                  charge.
                </div>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      <p className="section-label">Choose pickup location</p>
      <div className="mx-4 space-y-2">
        {availableSites.map(({ site, count }) => (
          <button
            key={site.id}
            type="button"
            className="w-full rounded-2xl border-2 p-3.5 text-left"
            style={{
              borderColor:
                selectedSite?.id === site.id
                  ? "var(--primary)"
                  : "var(--border)",
              background:
                selectedSite?.id === site.id
                  ? "color-mix(in srgb, var(--primary) 8%, white)"
                  : "var(--card)",
            }}
            onClick={() => setSelectedSiteId(site.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-sm">{site.name}</div>
                <div className="text-xs" style={{ color: "var(--text2)" }}>
                  {site.area} · {site.address}
                  <br />
                  Open {site.hours}
                </div>
              </div>
              <span
                className="rounded-full px-2.5 py-1 text-xs font-bold"
                style={{ background: "#E8F8F5", color: "var(--ok)" }}
              >
                {count} available
              </span>
            </div>
          </button>
        ))}
      </div>

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

      <p className="section-label">Pickup appointment</p>
      <div className="card !py-3">
        <label className="text-sm font-bold" htmlFor="pickup-appointment">
          Date and time to collect
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {slots.map((s) => (
            <button
              key={s.label}
              type="button"
              className="rounded-full border px-3 py-1.5 text-xs font-semibold"
              style={{
                borderColor:
                  appointmentInput === s.value
                    ? "var(--primary)"
                    : "var(--border)",
                background:
                  appointmentInput === s.value
                    ? "color-mix(in srgb, var(--primary) 12%, white)"
                    : "var(--bg)",
                color:
                  appointmentInput === s.value
                    ? "var(--primary)"
                    : "var(--text2)",
              }}
              onClick={() => setAppointmentInput(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <input
          id="pickup-appointment"
          type="datetime-local"
          className="mt-2 w-full rounded-xl border px-3 py-3 text-sm outline-none"
          style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          value={appointmentInput}
          min={toLocalInput(new Date())}
          onChange={(e) => setAppointmentInput(e.target.value)}
        />
        <p className="mt-1.5 text-xs" style={{ color: "var(--text2)" }}>
          The operator will see this appointment on your order.
        </p>
        {!appointmentValid ? (
          <p className="mt-1 text-xs font-semibold" style={{ color: "var(--warn)" }}>
            Pick a time in the future
          </p>
        ) : null}
      </div>

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

      <div className="card">
        <div className="mb-2 font-bold text-sm">Questions? Contact {op.name}</div>
        <ContactActions phone={op.phone} email={op.email} name={op.name} />
      </div>

      <div
        className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
        style={{
          background: "color-mix(in srgb, var(--card) 94%, transparent)",
          borderColor: "var(--border)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px]" style={{ color: "var(--text2)" }}>
              {tier.label}
              {selectedAddons.length
                ? ` · +${selectedAddons.length} add-on`
                : ""}
            </div>
            <div className="text-lg font-extrabold">{formatIdr(total)}</div>
            <div className="text-[11px]" style={{ color: "var(--text2)" }}>
              Incl. {formatIdrShort(DEPOSIT_IDR)} refundable deposit
            </div>
          </div>
          <button
            type="button"
            className="btn-primary !mt-0 !w-auto shrink-0 px-5 py-3"
            disabled={!canBook}
            style={{ opacity: canBook ? 1 : 0.5 }}
            onClick={book}
          >
            {units.length === 0 ? "Sold out" : "Continue"}
          </button>
        </div>
        {!canBook && units.length > 0 ? (
          <p
            className="pb-1 text-center text-xs font-semibold"
            style={{ color: "var(--warn)" }}
          >
            {model.requiresSimAck && !simAck
              ? "Tick the SIM / license box above to continue"
              : !appointmentValid
                ? "Choose a future pickup appointment"
                : "All units are low on battery right now — try again soon"}
          </p>
        ) : null}
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

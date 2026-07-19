"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { DEPOSIT_IDR, defaultPricingForHourly } from "@/lib/seed";
import {
  formatIdr,
  formatIdrShort,
  formatReturnBy,
  modeLabel,
  vehicleTypeLabel,
  applyWeekendSurcharge,
  RETURN_GEOFENCE_M,
} from "@/lib/format";
import type { KeysAccess, PickupType } from "@/lib/types";
import { PhotoGallery } from "@/components/PhotoGallery";
import {
  adaptersForVoltage,
  availableUnits,
  casanVouchers,
  modelBatteryLabel,
  operatorRatingStats,
} from "@/lib/catalog";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultSoonInput(): string {
  const d = new Date(Date.now() + 60 * 60_000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return toLocalInput(d);
}

function defaultLaterInput(): string {
  return daySlot(1, 9, "").value;
}

/** `minutesFromNow` — rounded up to next 15 min. */
function appointmentSlot(minutesFromNow: number, label: string) {
  const d = new Date(Date.now() + minutesFromNow * 60_000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return { label, value: toLocalInput(d) };
}

/** Fixed morning/afternoon on a future calendar day. */
function daySlot(daysAhead: number, hour: number, label: string) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() <= Date.now()) {
    d.setDate(d.getDate() + 1);
  }
  return { label, value: toLocalInput(d) };
}

const MAX_ADVANCE_DAYS = 14;

function weekdayLabel(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export default function ModelDetailPage() {
  return (
    <AuthGate role="rider">
      <Suspense
        fallback={
          <div>
            <Header title="Loading…" backHref="/home" />
            <p className="p-6 text-sm" style={{ color: "var(--text2)" }}>
              Loading booking…
            </p>
          </div>
        }
      >
        <ModelDetailInner />
      </Suspense>
    </AuthGate>
  );
}

function ModelDetailInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const siteParam = searchParams.get("site");
  const whenLater = searchParams.get("when") === "later";

  const models = useAppStore((s) => s.models);
  const vehicles = useAppStore((s) => s.vehicles);
  const operators = useAppStore((s) => s.operators);
  const sites = useAppStore((s) => s.sites);
  const pricing = useAppStore((s) => s.pricing);
  const reviews = useAppStore((s) => s.reviews);
  const bookings = useAppStore((s) => s.bookings);
  const chargingAddons = useAppStore((s) => s.chargingAddons);
  const weekendSurcharge = useAppStore((s) => s.weekendSurcharge);
  const walletBalanceIdr = useAppStore((s) => s.walletBalanceIdr);
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
  /** When model allows both: digital (app) vs physical (desk key). */
  const [keyChoice, setKeyChoice] = useState<"digital" | "physical">(() =>
    model?.rentalMode === "key_handover" ? "physical" : "digital",
  );
  const [tierIdx, setTierIdx] = useState(0);
  const [simAck, setSimAck] = useState(false);
  const [voucherId, setVoucherId] = useState<string | null>(null);
  const [adapterId, setAdapterId] = useState<string | null>(null);
  const [showCharging, setShowCharging] = useState(false);
  const [whenMode, setWhenMode] = useState<"soon" | "later">(
    whenLater ? "later" : "soon",
  );
  const [appointmentInput, setAppointmentInput] = useState(() =>
    whenLater ? defaultLaterInput() : defaultSoonInput(),
  );
  const [selectedSiteId, setSelectedSiteId] = useState(
    () => siteParam || units[0]?.siteId || "",
  );
  const [showOtherHubs, setShowOtherHubs] = useState(false);

  useEffect(() => {
    if (!siteParam) return;
    if (availableSites.some(({ site }) => site.id === siteParam)) {
      setSelectedSiteId(siteParam);
    }
  }, [siteParam, availableSites]);

  useEffect(() => {
    if (!whenLater) return;
    setWhenMode("later");
    setAppointmentInput(defaultLaterInput());
  }, [whenLater]);

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
  const weekend = applyWeekendSurcharge(
    tier.priceIdr,
    Boolean(model && weekendSurcharge[model.operatorId]),
    appointmentInput,
  );
  const rentalPriceIdr = weekend.priceIdr;
  const total = rentalPriceIdr + addonsTotal + DEPOSIT_IDR;
  const selectedAdapter = adapters.find((a) => a.id === adapterId);
  const selectedSite =
    availableSites.find(({ site }) => site.id === selectedSiteId)?.site ??
    availableSites[0]?.site;
  const selectedSiteUnits = units.filter(
    (unit) => unit.siteId === selectedSite?.id,
  );
  const appointmentMs = new Date(appointmentInput).getTime();
  const maxAdvanceMs = Date.now() + MAX_ADVANCE_DAYS * 24 * 60 * 60_000;
  const appointmentTooFar =
    Number.isFinite(appointmentMs) && appointmentMs > maxAdvanceMs;
  const appointmentValid =
    Boolean(appointmentInput) &&
    Number.isFinite(appointmentMs) &&
    appointmentMs >= Date.now() &&
    !appointmentTooFar;
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
    const keysAccess: KeysAccess =
      model!.rentalMode === "both"
        ? keyChoice === "physical"
          ? "physical"
          : "digital"
        : model!.rentalMode === "key_handover"
          ? "physical"
          : "digital";
    const resolvedPickup: PickupType =
      keysAccess === "physical" ? "front_desk" : pickup;
    const totalDue = rentalPriceIdr + addonsTotal + DEPOSIT_IDR;
    const paymentMethod =
      walletBalanceIdr >= totalDue ? "casan_wallet" : "pay_at_operator";
    const booking = createBooking({
      modelId: model!.id,
      siteId: selectedSite?.id,
      pickupType: resolvedPickup,
      keysAccess,
      digitalKeyIssueMode: "auto",
      durationLabel: tier.label,
      durationMinutes: tier.durationMinutes,
      rentalPriceIdr,
      paymentMethod,
      addonIds,
      appointmentAt: new Date(appointmentMs).toISOString(),
    });
    if (!booking) {
      setToast("No units available right now");
      return;
    }
    const collectLabel = formatReturnBy(new Date(appointmentMs).toISOString());
    setToast(
      weekend.applied
        ? `Booking created · weekend +15% applied`
        : whenMode === "later"
          ? `Reserved — collect ${collectLabel}`
          : "Booking created — continue to payment",
    );
    router.push(`/book/${booking.id}`);
  }

  const soonSlots = [
    appointmentSlot(60, "In 1 hour"),
    appointmentSlot(120, "In 2 hours"),
    appointmentSlot(180, "In 3 hours"),
  ];
  const laterSlots = [
    daySlot(1, 9, `Tomorrow 09:00`),
    daySlot(1, 14, `Tomorrow 14:00`),
    daySlot(2, 9, `${weekdayLabel(2)} 09:00`),
    daySlot(3, 9, `${weekdayLabel(3)} 09:00`),
    daySlot(7, 9, `${weekdayLabel(7)} 09:00`),
  ];
  const slots = whenMode === "later" ? laterSlots : soonSlots;
  const collectSummary = appointmentValid
    ? formatReturnBy(new Date(appointmentMs).toISOString())
    : null;

  function switchWhenMode(mode: "soon" | "later") {
    setWhenMode(mode);
    setAppointmentInput(mode === "later" ? defaultLaterInput() : defaultSoonInput());
  }

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

      <div className="card -mt-2 !py-3">
        <Link
          href={
            selectedSite
              ? `/operators/${op.id}?site=${selectedSite.id}`
              : `/operators/${op.id}`
          }
          className="flex items-center justify-between"
        >
          <div className="min-w-0">
            <div className="truncate font-bold text-sm">{model.name}</div>
            <div className="text-xs" style={{ color: "var(--text2)" }}>
              {op.name}
              {rating.count > 0 ? ` · ★ ${rating.avg}` : ""}
              {` · ${vehicleTypeLabel(model.vehicleType)}`}
            </div>
          </div>
          <span
            className="shrink-0 text-xs font-semibold"
            style={{ color: "var(--primary)" }}
          >
            Hub →
          </span>
        </Link>
      </div>

      <div
        className="mx-4 mt-2 flex gap-2 overflow-x-auto pb-1"
      >
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: "var(--bg-deep)", color: "var(--primary)" }}
        >
          {modelBatteryLabel(model)}
        </span>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: "var(--bg-deep)", color: "var(--text2)" }}
        >
          {modeLabel(model.rentalMode)}
        </span>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: "#E8F8F5", color: "var(--ok)" }}
        >
          {units.length} ready
        </span>
      </div>

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

      <p className="section-label">Pickup hub</p>
      <div className="mx-4">
        {selectedSite ? (
          <div
            className="rounded-2xl border-2 p-3.5"
            style={{
              borderColor: "var(--primary)",
              background: "color-mix(in srgb, var(--primary) 8%, white)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--primary)" }}>
                  Main pickup
                </div>
                <div className="font-bold text-sm">{selectedSite.name}</div>
                <div className="text-xs" style={{ color: "var(--text2)" }}>
                  {selectedSite.area} · Open {selectedSite.hours}
                </div>
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold"
                style={{ background: "#E8F8F5", color: "var(--ok)" }}
              >
                {selectedSiteUnits.length} ready
              </span>
            </div>
            {availableSites.length > 1 ? (
              <button
                type="button"
                className="mt-2 text-xs font-bold"
                style={{ color: "var(--primary)" }}
                onClick={() => setShowOtherHubs((v) => !v)}
              >
                {showOtherHubs ? "Hide other hubs" : "Select other hub →"}
              </button>
            ) : null}
          </div>
        ) : null}
        {showOtherHubs && availableSites.length > 1 ? (
          <div className="mt-2 space-y-2">
            {availableSites
              .filter(({ site }) => site.id !== selectedSite?.id)
              .map(({ site, count }) => (
                <button
                  key={site.id}
                  type="button"
                  className="w-full rounded-2xl border p-3 text-left"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--card)",
                  }}
                  onClick={() => {
                    setSelectedSiteId(site.id);
                    setShowOtherHubs(false);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm">{site.name}</div>
                      <div className="text-xs" style={{ color: "var(--text2)" }}>
                        {site.area}
                      </div>
                    </div>
                    <span
                      className="text-xs font-bold"
                      style={{ color: "var(--ok)" }}
                    >
                      {count} ready
                    </span>
                  </div>
                </button>
              ))}
          </div>
        ) : null}
      </div>

      {model.rentalMode === "both" ? (
        <>
          <p className="section-label">Key option</p>
          <div className="mx-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-xl border-2 px-3 py-3 text-left"
              style={{
                borderColor:
                  keyChoice === "digital" ? "var(--primary)" : "var(--border)",
                background:
                  keyChoice === "digital"
                    ? "color-mix(in srgb, var(--primary) 10%, white)"
                    : "var(--card)",
              }}
              onClick={() => {
                setKeyChoice("digital");
                setPickup("self_service");
              }}
            >
              <div
                className="text-xs font-bold"
                style={{
                  color:
                    keyChoice === "digital" ? "var(--primary)" : "var(--text)",
                }}
              >
                Digital key
              </div>
              <p className="mt-1 text-[11px] leading-snug" style={{ color: "var(--text2)" }}>
                App unlock · motor on/off · return at any listed hub
              </p>
            </button>
            <button
              type="button"
              className="rounded-xl border-2 px-3 py-3 text-left"
              style={{
                borderColor:
                  keyChoice === "physical" ? "var(--primary)" : "var(--border)",
                background:
                  keyChoice === "physical"
                    ? "color-mix(in srgb, var(--primary) 10%, white)"
                    : "var(--card)",
              }}
              onClick={() => {
                setKeyChoice("physical");
                setPickup("front_desk");
              }}
            >
              <div
                className="text-xs font-bold"
                style={{
                  color:
                    keyChoice === "physical" ? "var(--primary)" : "var(--text)",
                }}
              >
                Physical key
              </div>
              <p className="mt-1 text-[11px] leading-snug" style={{ color: "var(--text2)" }}>
                Staff hand over key · return to desk
              </p>
            </button>
          </div>
        </>
      ) : model.rentalMode === "digital" ? (
        <p className="mx-4 mt-3 text-xs" style={{ color: "var(--text2)" }}>
          Digital key · app unlock and motor control · return at any of this
          operator&apos;s hubs (within {RETURN_GEOFENCE_M} m)
        </p>
      ) : (
        <p className="mx-4 mt-3 text-xs" style={{ color: "var(--text2)" }}>
          Shop pickup required · staff hand over the key
        </p>
      )}

      {(model.allowFrontDesk &&
        model.allowSelfService &&
        (model.rentalMode === "digital" ||
          (model.rentalMode === "both" && keyChoice === "digital"))) ? (
        <>
          <p className="section-label">Pickup style</p>
          <div className="mx-4 grid grid-cols-2 gap-2">
            {model.allowFrontDesk ? (
              <button
                type="button"
                className="rounded-xl border-2 py-2.5 text-xs font-bold"
                style={{
                  borderColor:
                    pickup === "front_desk" ? "var(--primary)" : "var(--border)",
                  background:
                    pickup === "front_desk"
                      ? "color-mix(in srgb, var(--primary) 10%, white)"
                      : "var(--card)",
                  color:
                    pickup === "front_desk" ? "var(--primary)" : "var(--text2)",
                }}
                onClick={() => setPickup("front_desk")}
              >
                Shop pickup
              </button>
            ) : null}
            {model.allowSelfService ? (
              <button
                type="button"
                className="rounded-xl border-2 py-2.5 text-xs font-bold"
                style={{
                  borderColor:
                    pickup === "self_service" ? "var(--primary)" : "var(--border)",
                  background:
                    pickup === "self_service"
                      ? "color-mix(in srgb, var(--primary) 10%, white)"
                      : "var(--card)",
                  color:
                    pickup === "self_service" ? "var(--primary)" : "var(--text2)",
                }}
                onClick={() => setPickup("self_service")}
              >
                Self-unlock
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      <p className="section-label">Book now or later</p>
      <div className="card !py-3">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["soon", "Book now"],
              ["later", "Book later"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              className="rounded-xl border-2 py-2.5 text-xs font-bold"
              style={{
                borderColor:
                  whenMode === mode ? "var(--primary)" : "var(--border)",
                background:
                  whenMode === mode
                    ? "color-mix(in srgb, var(--primary) 10%, white)"
                    : "var(--bg)",
                color: whenMode === mode ? "var(--primary)" : "var(--text2)",
              }}
              onClick={() => switchWhenMode(mode)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--text2)" }}>
          {whenMode === "later"
            ? `Advance booking — pick a date & time up to ${MAX_ADVANCE_DAYS} days ahead.`
            : "Pickup today — choose a time in the next few hours."}
        </p>
        <label className="mt-3 block text-sm font-bold" htmlFor="pickup-appointment">
          {whenMode === "later" ? "Select date & time" : "Pickup time"}
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {slots.map((s) => (
            <button
              key={s.label + s.value}
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
          max={toLocalInput(new Date(maxAdvanceMs))}
          onChange={(e) => setAppointmentInput(e.target.value)}
        />
        {collectSummary ? (
          <p
            className="mt-2 rounded-lg px-2.5 py-2 text-xs font-semibold"
            style={{
              background: "color-mix(in srgb, var(--primary) 10%, white)",
              color: "var(--primary)",
            }}
          >
            Collect {collectSummary}
            {selectedSite ? ` · ${selectedSite.name}` : ""}
          </p>
        ) : (
          <p className="mt-1.5 text-xs" style={{ color: "var(--text2)" }}>
            The operator will see this appointment on your order.
          </p>
        )}
        {!appointmentValid ? (
          <p className="mt-1 text-xs font-semibold" style={{ color: "var(--warn)" }}>
            {appointmentTooFar
              ? `Furthest you can book is ${MAX_ADVANCE_DAYS} days ahead`
              : "Pick a time in the future"}
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
            I confirm I hold a valid Indonesian SIM or an international driving
            permit where local law requires it for this e-moped.
          </span>
        </label>
      ) : null}

      <div
        className="mx-4 mt-3 rounded-2xl border px-4 py-3"
        style={{
          borderColor: "var(--ok)",
          background: "#E8F8F5",
        }}
      >
        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--ok)" }}>
          Refundable deposit
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-2">
          <div className="text-lg font-extrabold" style={{ color: "var(--ok)" }}>
            {formatIdr(DEPOSIT_IDR)}
          </div>
          <div className="text-right text-[11px] font-semibold" style={{ color: "var(--text2)" }}>
            Returned after
            <br />
            you bring the bike back
          </div>
        </div>
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
              {weekend.applied ? " · weekend +15%" : ""}
              {selectedAddons.length
                ? ` · +${selectedAddons.length} add-on`
                : ""}
              {collectSummary ? ` · ${collectSummary}` : ""}
            </div>
            <div className="text-lg font-extrabold">{formatIdr(total)}</div>
            <div className="text-[11px] font-semibold" style={{ color: "var(--ok)" }}>
              Incl. {formatIdrShort(DEPOSIT_IDR)} refundable deposit
            </div>
          </div>
          <button
            type="button"
            className="btn-primary !mt-0 !w-auto shrink-0 px-8 py-3"
            disabled={!canBook}
            style={{ opacity: canBook ? 1 : 0.5 }}
            onClick={book}
          >
            {units.length === 0 ? "Sold out" : "Book"}
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
                ? appointmentTooFar
                  ? `Book within the next ${MAX_ADVANCE_DAYS} days`
                  : "Choose a future pickup appointment"
                : "All units are low on battery right now — try again soon"}
          </p>
        ) : null}
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

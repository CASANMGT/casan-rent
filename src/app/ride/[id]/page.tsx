"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAppStore } from "@/lib/store";
import {
  formatExtendLabel,
  formatIdr,
  formatCountdown,
  formatReturnBy,
  formatTimer,
  batteryPctLabel,
  keysAccessLabel,
  distanceMeters,
  formatMetersAway,
  isInsideReturnGeofence,
  applyWeekendSurcharge,
  RETURN_GEOFENCE_M,
  USER_LAT,
  USER_LNG,
  osmBrowseUrl,
  demoPinPctToLatLng,
  demoLatLngToPinPct,
  DEMO_MAP_HUB_PIN,
} from "@/lib/format";
import { CalendarClock, MapPin, Navigation } from "lucide-react";
import { MockMap } from "@/components/MockMap";
import { StarRating, StarsText } from "@/components/StarRating";
import { ContactActions } from "@/components/ContactActions";
import { AuthGate } from "@/components/AuthGate";
import type { Booking, PaymentMethod } from "@/lib/types";
import { IS_DEMO } from "@/lib/demo";
import { GpsFreshness } from "@/components/UxSignals";

/** Mirrors the store's extendRide pricing: pro-rata on the current rate. */
function extendPriceFor(
  booking: Booking,
  extraMinutes: number,
  weekendOn: boolean,
): number {
  const perMin =
    booking.rentalPriceIdr / Math.max(1, booking.durationMinutes);
  const base = Math.round(perMin * extraMinutes);
  const endsAt = booking.endsAt
    ? new Date(new Date(booking.endsAt).getTime() + extraMinutes * 60_000)
    : new Date();
  return applyWeekendSurcharge(base, weekendOn, endsAt).priceIdr;
}

const extendPayMethods: { id: PaymentMethod; name: string }[] = [
  { id: "casan_wallet", name: "Wallet" },
  { id: "pay_at_operator", name: "Pay at hub" },
  { id: "qris", name: "QRIS" },
  { id: "dana", name: "DANA" },
  { id: "ovo", name: "OVO" },
  { id: "gopay", name: "GoPay" },
  { id: "shopeepay", name: "ShopeePay" },
];

export default function RidePage() {
  return (
    <AuthGate role="rider">
      <RideInner />
    </AuthGate>
  );
}

function RideInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const bookings = useAppStore((s) => s.bookings);
  const vehicles = useAppStore((s) => s.vehicles);
  const operators = useAppStore((s) => s.operators);
  const sites = useAppStore((s) => s.sites);
  const toggleMotor = useAppStore((s) => s.toggleMotor);
  const completeReturn = useAppStore((s) => s.completeReturn);
  const collectPhysicalKey = useAppStore((s) => s.collectPhysicalKey);
  const extendRide = useAppStore((s) => s.extendRide);
  const markOverdue = useAppStore((s) => s.markOverdue);
  const submitReview = useAppStore((s) => s.submitReview);
  const setReturnSite = useAppStore((s) => s.setReturnSite);
  const setToast = useAppStore((s) => s.setToast);
  const walletBalanceIdr = useAppStore((s) => s.walletBalanceIdr);
  const weekendSurcharge = useAppStore((s) => s.weekendSurcharge);

  const booking = bookings.find((b) => b.id === id);
  const vehicle = vehicles.find((v) => v.id === booking?.vehicleId);
  const op = operators.find((o) => o.id === booking?.operatorId);
  const site = sites.find((x) => x.id === booking?.siteId);
  const returnSite =
    sites.find((s) => s.id === (booking?.returnSiteId || booking?.siteId)) ??
    site;
  const returnHubs = booking
    ? sites.filter((s) => s.operatorId === booking.operatorId)
    : [];
  const weekendOn = Boolean(
    booking && weekendSurcharge[booking.operatorId],
  );

  const [now, setNow] = useState(0);
  const [sos, setSos] = useState(false);
  const [returnStep, setReturnStep] = useState(0);
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendMins, setExtendMins] = useState<number | null>(null);
  const [extendMethod, setExtendMethod] = useState<PaymentMethod>("casan_wallet");
  const [extendPaying, setExtendPaying] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewNote, setReviewNote] = useState("");
  const [simulatingKey, setSimulatingKey] = useState(false);
  /** Rider GPS — demo starts "away" so return is blocked until in zone. */
  const [riderPos, setRiderPos] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [gpsUpdatedAt, setGpsUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setNow(Date.now());
    const first = window.setTimeout(update, 0);
    const timer = window.setInterval(update, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

  const remainingSec = useMemo(() => {
    if (!booking?.endsAt)
      return booking?.durationMinutes ? booking.durationMinutes * 60 : 0;
    return Math.floor((new Date(booking.endsAt).getTime() - now) / 1000);
  }, [booking, now]);

  useEffect(() => {
    if (
      booking &&
      (booking.status === "active" || booking.status === "overdue") &&
      remainingSec <= 0 &&
      booking.status === "active"
    ) {
      markOverdue(booking.id);
    }
  }, [booking, remainingSec, markOverdue]);

  if (!booking || !vehicle || !op) {
    return <div className="p-6">Ride not found</div>;
  }

  if (booking.status === "completed") {
    const needsReview = booking.rating == null;
    return (
      <div>
        <Header title="Receipt" backHref="/history" />
        <div className="card text-center">
          <div className="text-4xl">✓</div>
          <div className="mt-2 font-display text-xl font-semibold">
            Trip complete
          </div>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
            {booking.paymentMethod === "casan_wallet"
              ? "Deposit returned to Casan Wallet."
              : "Deposit refund initiated (mock)."}
          </p>
        </div>
        <div className="card">
          <Row label="Vehicle" value={vehicle.name} />
          <Row label="Duration" value={booking.durationLabel} />
          <Row label="Rental" value={formatIdr(booking.rentalPriceIdr)} />
          <Row
            label="Deposit"
            value={`${formatIdr(booking.depositIdr)} refund`}
          />
          <Row
            label="Paid via"
            value={booking.paymentMethod.replace(/_/g, " ").toUpperCase()}
          />
          {booking.rating != null ? (
            <div className="flex items-center justify-between border-b border-dashed py-2.5 text-sm" style={{ borderColor: "var(--border)" }}>
              <span style={{ color: "var(--text2)" }}>Your rating</span>
              <StarsText value={booking.rating} />
            </div>
          ) : null}
        </div>

        {needsReview ? (
          <div className="card">
            <div className="font-bold">How was your ride?</div>
            <div className="mt-3 flex justify-center">
              <StarRating
                value={rating}
                size={32}
                interactive
                onChange={setRating}
              />
            </div>
            <textarea
              className="mt-3 w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              rows={2}
              placeholder="Optional note…"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
            <button
              type="button"
              className="btn-primary !mx-0 !mt-3 !w-full"
              onClick={() => submitReview(booking.id, rating, reviewNote)}
            >
              Submit review
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className="btn-primary"
          onClick={() => router.push("/home")}
        >
          Back home
        </button>
      </div>
    );
  }

  if (returnStep > 0) {
    const zoneLat = returnSite?.lat ?? site?.lat ?? op.lat;
    const zoneLng = returnSite?.lng ?? site?.lng ?? op.lng;
    const zoneName = returnSite?.name ?? site?.name ?? op.name;
    const selectedReturnId =
      booking.returnSiteId || booking.siteId || returnSite?.id;
    const pos = riderPos ?? { lat: USER_LAT, lng: USER_LNG };
    const metersAway = distanceMeters(pos.lat, pos.lng, zoneLat, zoneLng);
    const inZone = isInsideReturnGeofence(pos.lat, pos.lng, zoneLat, zoneLng);
    const needsPhysicalReturn =
      booking.keysAccess === "physical" || booking.keysAccess === "both";
    const hubPins = returnHubs.map((hub, i) => {
      const n = Math.max(1, returnHubs.length);
      const top = `${28 + (i % 3) * 18}%`;
      const left = `${22 + ((i * 5) % n) * (50 / n) + (i % 2) * 8}%`;
      return {
        id: hub.id,
        label: hub.name,
        top,
        left,
      };
    });

    function refreshGps() {
      setLocating(true);
      setGeoError(null);
      if (!navigator.geolocation) {
        setGeoError("GPS not available on this device — use demo buttons below.");
        setLocating(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (p) => {
          setRiderPos({ lat: p.coords.latitude, lng: p.coords.longitude });
          setGpsUpdatedAt(now);
          setLocating(false);
        },
        () => {
          setGeoError("Could not read GPS. Allow location, or use demo buttons.");
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10_000 },
      );
    }

    return (
      <div>
        <Header title="Return" backHref={`/ride/${id}`} />
        {returnStep === 1 ? (
          <>
            <div
              className="mx-4 rounded-xl border p-4 text-sm"
              style={{
                borderColor: inZone ? "var(--ok)" : "var(--warn)",
                background: inZone ? "#E8F8F5" : "#FEF5E7",
              }}
            >
              <div className="flex items-start gap-2">
                <MapPin
                  size={20}
                  className="mt-0.5 shrink-0"
                  style={{ color: inZone ? "var(--ok)" : "#E65100" }}
                />
                <div>
                  <div
                    className="font-bold"
                    style={{ color: inZone ? "var(--ok)" : "#E65100" }}
                  >
                    {inZone
                      ? "You are in the return zone"
                      : "Not at the return zone yet"}
                  </div>
                  <p className="mt-1" style={{ color: "var(--text2)" }}>
                    Return within {RETURN_GEOFENCE_M}m of chosen hub{" "}
                    <strong>{zoneName}</strong>.{" "}
                    {inZone
                      ? "You can finish the return now."
                      : `You are ${formatMetersAway(metersAway)} — ride closer to unlock return.`}
                  </p>
                </div>
              </div>
            </div>

            {returnHubs.length > 0 ? (
              <div className="mx-4 mt-3">
                <div className="mb-2 text-sm font-bold">Return hub</div>
                <div className="grid gap-2">
                  {returnHubs.map((hub) => {
                    const selected = selectedReturnId === hub.id;
                    return (
                      <button
                        key={hub.id}
                        type="button"
                        className="rounded-xl border-2 px-3 py-2.5 text-left text-sm font-bold"
                        style={{
                          borderColor: selected
                            ? "var(--primary)"
                            : "var(--border)",
                          background: selected
                            ? "color-mix(in srgb, var(--primary) 8%, white)"
                            : "var(--card)",
                          color: selected ? "var(--primary)" : "var(--text)",
                        }}
                        onClick={() => setReturnSite(booking.id, hub.id)}
                      >
                        {hub.name}
                        {hub.area ? (
                          <span
                            className="mt-0.5 block text-[11px] font-semibold"
                            style={{ color: "var(--text2)" }}
                          >
                            {hub.area}
                            {hub.city ? ` · ${hub.city}` : ""}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="mx-4 mt-3">
              <MockMap
                height={200}
                mapImage={op.mapImage}
                label={
                  IS_DEMO
                    ? `Drag blue pin · ${RETURN_GEOFENCE_M}m zone`
                    : `Approximate return zone · ${RETURN_GEOFENCE_M}m`
                }
                directionsHref={osmBrowseUrl(zoneLat, zoneLng)}
                userPin={demoLatLngToPinPct(
                  zoneLat,
                  zoneLng,
                  pos.lat,
                  pos.lng,
                )}
                onUserPinDrag={
                  IS_DEMO
                    ? ({ topPct, leftPct }) => {
                        const next = demoPinPctToLatLng(
                          zoneLat,
                          zoneLng,
                          topPct,
                          leftPct,
                        );
                        setRiderPos(next);
                        setGpsUpdatedAt(now);
                        setGeoError(null);
                      }
                    : undefined
                }
                pins={
                  hubPins.length > 0
                    ? hubPins.map((p) =>
                        p.id === selectedReturnId || p.id === "return"
                          ? {
                              ...p,
                              top: `${DEMO_MAP_HUB_PIN.topPct}%`,
                              left: `${DEMO_MAP_HUB_PIN.leftPct}%`,
                            }
                          : p,
                      )
                    : [
                        {
                          id: "return",
                          label: zoneName,
                          top: `${DEMO_MAP_HUB_PIN.topPct}%`,
                          left: `${DEMO_MAP_HUB_PIN.leftPct}%`,
                        },
                      ]
                }
              />
              {IS_DEMO ? (
                <p
                  className="mt-2 text-center text-[11px]"
                  style={{ color: "var(--text2)" }}
                >
                  Drag the blue pin onto the hub marker to enter the parking
                  geofence.
                </p>
              ) : null}
            </div>

            <div
              className="mx-4 mt-3 flex items-center justify-between rounded-xl px-4 py-3 text-sm"
              style={{ background: "var(--card)" }}
            >
              <div>
                <div style={{ color: "var(--text2)" }}>Distance to hub</div>
                <div className="mt-0.5 text-[10px]" style={{ color: "var(--text2)" }}>
                  <GpsFreshness
                    updatedAt={gpsUpdatedAt}
                    label="Your phone location (demo)"
                    mock={!gpsUpdatedAt}
                  />
                </div>
              </div>
              <span
                className="font-bold tabular-nums"
                style={{ color: inZone ? "var(--ok)" : "var(--text)" }}
              >
                {formatMetersAway(metersAway)}
              </span>
            </div>

            <button
              type="button"
              className="btn-secondary"
              disabled={locating}
              onClick={refreshGps}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Navigation size={16} />
                {locating ? "Checking GPS…" : "Check my location"}
              </span>
            </button>
            {geoError ? (
              <p
                className="-mt-2 px-6 text-center text-xs"
                style={{ color: "var(--warn)" }}
              >
                {geoError}
              </p>
            ) : null}

            {IS_DEMO ? (
            <div
              className="mx-4 mt-1 rounded-xl border p-3 text-xs"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
            >
              <div className="font-semibold" style={{ color: "var(--text2)" }}>
                Demo (no real GPS needed)
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="rounded-lg border py-2.5 font-bold"
                  style={{
                    borderColor: "var(--ok)",
                    color: "var(--ok)",
                    background: "#E8F8F5",
                  }}
                  onClick={() => {
                    setRiderPos({ lat: zoneLat, lng: zoneLng });
                    setGpsUpdatedAt(now);
                    setGeoError(null);
                    setToast("Demo: you are at the hub");
                  }}
                >
                  Simulate at hub
                </button>
                <button
                  type="button"
                  className="rounded-lg border py-2.5 font-bold"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text2)",
                    background: "var(--card)",
                  }}
                  onClick={() => {
                    setRiderPos({ lat: USER_LAT, lng: USER_LNG });
                    setGpsUpdatedAt(now);
                    setGeoError(null);
                    setToast("Demo: you are away from hub");
                  }}
                >
                  Simulate far away
                </button>
              </div>
            </div>
            ) : null}

            <button
              type="button"
              className="btn-primary"
              disabled={!inZone}
              style={{ opacity: inZone ? 1 : 0.45 }}
              onClick={() => {
                if (!inZone) {
                  setToast("Move into the return zone first");
                  return;
                }
                setReturnStep(2);
              }}
            >
              {inZone ? "I'm at the return point" : "Return locked — too far"}
            </button>
            {!inZone ? (
              <p
                className="-mt-2 px-6 pb-2 text-center text-xs font-semibold"
                style={{ color: "var(--warn)" }}
              >
                Geofence: return opens only within {RETURN_GEOFENCE_M}m of chosen
                hub
              </p>
            ) : null}
          </>
        ) : null}
        {returnStep === 2 ? (
          <>
            <div className="card text-sm">
              {!needsPhysicalReturn
                ? "Lock the vehicle via app. Parking photo optional (mock)."
                : booking.physicalKeyReturned
                  ? "Staff confirmed that the physical key is back."
                  : "Hand the physical key to staff at the hub. Return stays locked until they tap Receive key in the operator app."}
            </div>
            {!needsPhysicalReturn ? (
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  await fetch("/api/iot", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      command: "lock",
                      vehicleId: vehicle.id,
                      bookingId: booking.id,
                    }),
                  });
                  setReturnStep(3);
                }}
              >
                Lock vehicle
              </button>
            ) : booking.physicalKeyReturned ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setReturnStep(3)}
              >
                Staff received key · continue
              </button>
            ) : (
              <>
                <div
                  className="mx-4 rounded-xl border px-4 py-3 text-center text-sm font-semibold"
                  style={{ borderColor: "var(--warn)", background: "#FEF5E7" }}
                >
                  Waiting for staff to confirm the key…
                  <p
                    className="mt-1 text-xs font-normal"
                    style={{ color: "var(--text2)" }}
                  >
                    Ask staff to open Orders → Dipinjam → Receive key for{" "}
                    {booking.code}.
                  </p>
                  {IS_DEMO ? (
                    <button
                      type="button"
                      className="mt-3 w-full rounded-xl py-2.5 text-xs font-bold text-white"
                      style={{
                        background: "var(--primary)",
                        opacity: simulatingKey ? 0.6 : 1,
                      }}
                      disabled={simulatingKey}
                      onClick={() => {
                        setSimulatingKey(true);
                        setToast("Staff is confirming key receipt…");
                        window.setTimeout(() => {
                          collectPhysicalKey(booking.id);
                          setSimulatingKey(false);
                          setToast("Staff received key ✓");
                        }, 1200);
                      }}
                    >
                      {simulatingKey
                        ? "Staff confirming…"
                        : "Demo: simulate staff received key"}
                    </button>
                  ) : null}
                </div>
                {op ? (
                  <div className="card">
                    <div className="mb-2 font-bold text-sm">
                      Staff not around? Contact the hub
                    </div>
                    <ContactActions
                      phone={site?.whatsapp || op.phone}
                      email={op.email}
                      name={site?.name ?? op.name}
                      bookingCode={booking.code}
                    />
                  </div>
                ) : null}
              </>
            )}
          </>
        ) : null}
        {returnStep === 3 ? (
          <>
            <div className="card text-center">
              <div className="font-bold">Confirm return</div>
              <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
                Finalize billing and release deposit.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                completeReturn(booking.id);
                setToast("Return complete — leave a quick rating");
              }}
            >
              Complete return
            </button>
          </>
        ) : null}
      </div>
    );
  }

  const isOverdue = booking.status === "overdue" || remainingSec <= 0;
  const warn = !isOverdue && remainingSec <= 900 && remainingSec > 300;
  const danger = !isOverdue && remainingSec <= 300;
  const countdown = formatCountdown(remainingSec);
  const returnBy = formatReturnBy(booking.endsAt, booking.durationMinutes);
  const longRental = remainingSec >= 86_400;
  const overdueBy = isOverdue
    ? formatCountdown(Math.abs(remainingSec)).main
    : null;

  return (
    <div className="content-pad relative pb-28">
      <Header title="Active rental" subtitle={vehicle.name} backHref="/home" />

      {isOverdue ? (
        <div
          className="mx-4 mt-3 rounded-xl border px-4 py-3 text-sm font-semibold"
          style={{
            borderColor: "var(--danger)",
            background: "#FADBD8",
            color: "var(--danger)",
          }}
        >
          Overdue{overdueBy ? ` by ${overdueBy}` : ""} — return now or extend.
          Motor locked (mock). Overtime billing coming soon.
        </div>
      ) : null}
      {warn ? (
        <div
          className="mx-4 mt-3 rounded-xl border px-4 py-3 text-sm font-semibold"
          style={{
            borderColor: "#FFB74D",
            background: "#FFF3E0",
            color: "#E65100",
          }}
        >
          15 min or less remaining — head back soon.
        </div>
      ) : null}
      {danger ? (
        <div
          className="mx-4 mt-3 rounded-xl border px-4 py-3 text-sm font-semibold"
          style={{
            borderColor: "var(--danger)",
            background: "#FADBD8",
            color: "var(--danger)",
          }}
        >
          Under 5 minutes left — return now or extend. Overtime billing coming
          soon.
        </div>
      ) : null}

      <div className="flex flex-col items-center px-5 pb-4 pt-6">
        <div
          className="relative flex h-44 w-44 flex-col items-center justify-center rounded-full border-8"
          style={{
            borderColor: "var(--border)",
            borderTopColor: isOverdue ? "var(--danger)" : "var(--primary)",
          }}
        >
          <div
            className={`font-display font-bold tabular-nums ${
              longRental ? "text-3xl" : "text-4xl"
            }`}
            style={{ color: isOverdue ? "var(--danger)" : "var(--text)" }}
          >
            {isOverdue ? formatTimer(0) : countdown.main}
          </div>
          <div className="text-xs" style={{ color: "var(--text2)" }}>
            {isOverdue ? "time expired" : countdown.unit}
          </div>
          <div
            className="absolute -bottom-2 rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ background: isOverdue ? "var(--danger)" : "var(--ok)" }}
          >
            {isOverdue ? "Overdue" : "Active"}
          </div>
        </div>
      </div>

      {/* Return deadline — date + time, readable for multi-day rentals */}
      <div
        className="mx-4 mb-3 flex items-center gap-3 rounded-2xl border px-4 py-3.5"
        style={{
          borderColor: isOverdue ? "var(--danger)" : "var(--ok)",
          background: isOverdue ? "#FADBD8" : "#E8F8F5",
        }}
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: "var(--card)",
            color: isOverdue ? "var(--danger)" : "var(--ok)",
          }}
        >
          <CalendarClock size={22} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div
            className="text-[11px] font-bold uppercase tracking-wide"
            style={{ color: isOverdue ? "var(--danger)" : "var(--ok)" }}
          >
            {isOverdue ? "Was due" : "Return by"}
          </div>
          <div className="text-base font-bold" style={{ color: "var(--text)" }}>
            {returnBy}
          </div>
          <div className="text-xs" style={{ color: "var(--text2)" }}>
            {booking.durationLabel} rental
            {isOverdue && overdueBy ? ` · ${overdueBy} over` : ""}
          </div>
        </div>
      </div>

      <div
        className="mx-4 mb-3 grid grid-cols-3 gap-2 rounded-2xl p-3"
        style={{ background: "var(--card)" }}
      >
        <Stat
          value={batteryPctLabel(vehicle.batteryPct, vehicle.vehicleType)}
          label="Battery"
        />
        <Stat
          value={
            vehicle.rangeKm != null ? `~${vehicle.rangeKm} km` : "—"
          }
          label="Est. range"
        />
        <Stat
          value={keysAccessLabel(booking.keysAccess ?? booking.rentalMode)}
          label="Keys"
        />
      </div>
      <p className="mx-4 -mt-1 mb-2 text-center text-[10px]" style={{ color: "var(--text2)" }}>
        Distance ridden omitted — no live trip GPS trail yet. Est. range is from
        the bike model, not a trip odometer.
      </p>
      <div className="-mt-1 mb-3 px-4 text-center text-[10px]" style={{ color: "var(--text2)" }}>
        <GpsFreshness label="Bike GPS" mock />
      </div>

      {(booking.rentalMode === "digital" || booking.keysAccess === "both") &&
      vehicle.vehicleType !== "bicycle" ? (
        <button
          type="button"
          className="mx-4 mb-4 flex w-[calc(100%-32px)] flex-col items-center gap-1 rounded-2xl border-2 py-5"
          style={{
            borderColor: booking.motorOn ? "var(--ok)" : "var(--danger)",
            background: booking.motorOn ? "#E8F8F5" : "#FADBD8",
          }}
          onClick={async () => {
            if (isOverdue) {
              setToast("Extend rental to unlock motor");
              return;
            }
            const command = booking.motorOn ? "motor_off" : "motor_on";
            await fetch("/api/iot", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                command,
                vehicleId: vehicle.id,
                bookingId: booking.id,
              }),
            });
            toggleMotor(booking.id);
            setToast(booking.motorOn ? "Motor OFF" : "Motor ON");
          }}
        >
          <span className="text-3xl">{booking.motorOn ? "⚡" : "🔒"}</span>
          <span className="font-bold">
            Motor is {booking.motorOn ? "ON" : "OFF"}
          </span>
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            Timer keeps running either way
          </span>
        </button>
      ) : (
        <div className="card text-sm" style={{ color: "var(--text2)" }}>
          Key / bicycle mode — control the vehicle physically. App tracks time
          and support only.
        </div>
      )}

      {(booking.rentalMode === "digital" ||
        booking.keysAccess === "both") &&
      vehicle.vehicleType !== "bicycle" ? (
        <>
          <button
            type="button"
            className="btn-secondary"
            disabled={locating}
            onClick={() => {
              setLocating(true);
              setGeoError(null);
              if (!navigator.geolocation) {
                setGeoError("GPS not available on this device");
                setLocating(false);
                setToast("GPS not available");
                return;
              }
              navigator.geolocation.getCurrentPosition(
                (p) => {
                  const lat = p.coords.latitude;
                  const lng = p.coords.longitude;
                  setRiderPos({ lat, lng });
                  setGpsUpdatedAt(now);
                  setLocating(false);
                  setToast(
                    `Location · ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
                  );
                },
                () => {
                  setGeoError("Could not read GPS. Allow location access.");
                  setLocating(false);
                  setToast("Could not read GPS");
                },
                { enableHighAccuracy: true, timeout: 10_000 },
              );
            }}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Navigation size={16} />
              {locating ? "Pinging…" : "Ping location"}
            </span>
          </button>
          {geoError ? (
            <p
              className="-mt-2 px-6 text-center text-xs"
              style={{ color: "var(--warn)" }}
            >
              {geoError}
            </p>
          ) : null}
          <div
            className="-mt-1 mb-3 px-4 text-center text-[10px]"
            style={{ color: "var(--text2)" }}
          >
            <GpsFreshness
              updatedAt={gpsUpdatedAt}
              label="Your phone location (demo)"
              mock={!gpsUpdatedAt}
            />
          </div>
        </>
      ) : null}

      <div
        className="mx-4 mb-3 rounded-2xl border px-4 py-3"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <div className="flex items-start gap-3">
          <MapPin
            size={18}
            className="mt-0.5 shrink-0"
            style={{ color: "var(--primary)" }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--text2)" }}>
              Return here
            </div>
            <div className="text-sm font-bold">
              {returnSite?.name ?? site?.name ?? op.name}
            </div>
            <p className="mt-0.5 text-xs" style={{ color: "var(--text2)" }}>
              Within {RETURN_GEOFENCE_M}m · phone GPS
            </p>
            <button
              type="button"
              className="mt-2 text-xs font-bold"
              style={{ color: "var(--primary)" }}
              onClick={() => {
                if (!riderPos) {
                  setRiderPos({ lat: USER_LAT, lng: USER_LNG });
                }
                setReturnStep(1);
              }}
            >
              Start return →
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn-secondary"
        onClick={() => setExtendOpen(true)}
      >
        Extend rental
      </button>

      <button
        type="button"
        className="btn-danger"
        onClick={() => {
          // Start outside the zone so return stays locked until GPS / demo puts them in.
          if (!riderPos) {
            setRiderPos({ lat: USER_LAT, lng: USER_LNG });
          }
          setReturnStep(1);
        }}
      >
        End ride / return
      </button>

      <button
        type="button"
        className="fixed bottom-[100px] right-4 z-[150] flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white shadow-lg"
        style={{
          background: "linear-gradient(135deg,#DC2626,#B91C1C)",
          right: "max(1rem, calc(50% - 215px + 1rem))",
        }}
        onClick={() => setSos(true)}
      >
        SOS
      </button>

      {extendOpen ? (
        <>
          <div
            className="fixed inset-0 z-[179] bg-black/40"
            onClick={() => {
              if (!extendPaying) {
                setExtendOpen(false);
                setExtendMins(null);
              }
            }}
          />
          <div
            className="fixed bottom-0 left-1/2 z-[180] w-full max-w-[430px] -translate-x-1/2 rounded-t-3xl p-5 pb-8"
            style={{ background: "var(--card)" }}
          >
            {extendMins == null ? (
              <>
                <div className="font-display text-lg font-semibold">
                  Extend rental
                </div>
                <p
                  className="mt-1 mb-2 text-sm"
                  style={{ color: "var(--text2)" }}
                >
                  Pick extra time — you pay for it before it&apos;s added.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      60,
                      60 * 3,
                      60 * 6,
                      60 * 24,
                      60 * 24 * 3,
                      60 * 24 * 7,
                    ] as const
                  ).map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      className="rounded-xl border py-3 text-sm font-bold"
                      style={{
                        borderColor: "var(--border)",
                        background: "var(--bg)",
                        color: "var(--primary)",
                      }}
                      onClick={() => setExtendMins(mins)}
                    >
                      <div>{formatExtendLabel(mins)}</div>
                      <div
                        className="mt-0.5 text-[11px] font-semibold"
                        style={{ color: "var(--text2)" }}
                      >
                        {formatIdr(extendPriceFor(booking, mins, weekendOn))}
                      </div>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn-secondary !mx-0 !mt-3 !w-full"
                  onClick={() => setExtendOpen(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <div className="font-display text-lg font-semibold">
                  Pay for extension
                </div>
                <div
                  className="mt-3 flex items-center justify-between rounded-xl border px-4 py-3"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--bg)",
                  }}
                >
                  <div>
                    <div className="text-sm font-bold">
                      +{formatExtendLabel(extendMins)}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text2)" }}>
                      New return:{" "}
                      {formatReturnBy(
                        booking.endsAt
                          ? new Date(
                              new Date(booking.endsAt).getTime() +
                                extendMins * 60_000,
                            ).toISOString()
                          : null,
                      )}
                    </div>
                  </div>
                  <div
                    className="text-base font-bold"
                    style={{ color: "var(--primary)" }}
                  >
                    {formatIdr(extendPriceFor(booking, extendMins, weekendOn))}
                  </div>
                </div>
                <p className="section-label !px-0">Payment method</p>
                <div className="grid grid-cols-2 gap-2">
                  {extendPayMethods.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="rounded-xl border-2 py-2.5 text-xs font-bold"
                      style={{
                        borderColor:
                          extendMethod === m.id
                            ? "var(--primary)"
                            : "var(--border)",
                        background:
                          extendMethod === m.id
                            ? "color-mix(in srgb, var(--primary) 8%, white)"
                            : "var(--bg)",
                      }}
                      onClick={() => setExtendMethod(m.id)}
                    >
                      {m.id === "casan_wallet"
                        ? `Wallet (${formatIdr(walletBalanceIdr)})`
                        : m.name}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn-primary !mx-0 !mt-4 !w-full"
                  disabled={extendPaying}
                  style={{ opacity: extendPaying ? 0.6 : 1 }}
                  onClick={async () => {
                    const amountIdr = extendPriceFor(
                      booking,
                      extendMins,
                      weekendOn,
                    );
                    if (
                      extendMethod === "casan_wallet" &&
                      walletBalanceIdr < amountIdr
                    ) {
                      setToast(
                        "Top up Casan Wallet or choose Pay at hub / QRIS",
                      );
                      return;
                    }
                    setExtendPaying(true);
                    try {
                      if (
                        extendMethod === "casan_wallet" ||
                        extendMethod === "pay_at_operator"
                      ) {
                        extendRide(booking.id, extendMins, extendMethod);
                        setExtendOpen(false);
                        setExtendMins(null);
                        return;
                      }
                      const response = await fetch("/api/payment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          bookingId: booking.id,
                          method: extendMethod,
                          amountIdr,
                          purpose: "extension",
                        }),
                      });
                      const data = await response.json().catch(() => ({}));
                      if (!response.ok) {
                        throw new Error(
                          data.message || "Extension payment failed",
                        );
                      }
                      extendRide(booking.id, extendMins);
                      setToast(
                        `Paid ${formatIdr(amountIdr)} · extended ${formatExtendLabel(extendMins)}`,
                      );
                      setExtendOpen(false);
                      setExtendMins(null);
                    } catch (error) {
                      setToast(
                        error instanceof Error
                          ? error.message
                          : "Payment failed — try again",
                      );
                    } finally {
                      setExtendPaying(false);
                    }
                  }}
                >
                  {extendPaying
                    ? "Processing payment…"
                    : extendMethod === "pay_at_operator"
                      ? `Confirm · pay ${formatIdr(extendPriceFor(booking, extendMins, weekendOn))} at hub`
                      : `Pay ${formatIdr(extendPriceFor(booking, extendMins, weekendOn))}`}
                </button>
                <button
                  type="button"
                  className="btn-secondary !mx-0 !mt-2 !w-full"
                  disabled={extendPaying}
                  onClick={() => setExtendMins(null)}
                >
                  Back
                </button>
              </>
            )}
          </div>
        </>
      ) : null}

      {sos ? (
        <>
          <div
            className="fixed inset-0 z-[179] bg-black/40"
            onClick={() => setSos(false)}
          />
          <div
            className="fixed bottom-0 left-1/2 z-[180] w-full max-w-[430px] -translate-x-1/2 rounded-t-3xl p-5 pb-8"
            style={{ background: "var(--card)" }}
          >
            <div className="font-display text-lg font-semibold">Emergency</div>
            <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
              Location shared:{" "}
              {(riderPos ?? { lat: USER_LAT, lng: USER_LNG }).lat.toFixed(4)},{" "}
              {(riderPos ?? { lat: USER_LAT, lng: USER_LNG }).lng.toFixed(4)}
              {riderPos ? " (your GPS)" : " (approx · enable GPS for exact)"}
            </p>
            <a className="btn-primary !mx-0 !w-full" href="tel:118">
              Call ambulance (118)
            </a>
            <a className="btn-secondary !mx-0 !w-full" href={`tel:${op.phone}`}>
              Call operator
            </a>
            <a
              className="btn-secondary !mx-0 !w-full"
              href={`https://wa.me/${op.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp support
            </a>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold" style={{ color: "var(--primary)" }}>
        {value}
      </div>
      <div className="text-[11px]" style={{ color: "var(--text2)" }}>
        {label}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex justify-between border-b border-dashed py-2.5 text-sm"
      style={{ borderColor: "var(--border)" }}
    >
      <span style={{ color: "var(--text2)" }}>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

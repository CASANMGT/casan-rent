"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { ContactActions } from "@/components/ContactActions";
import { AuthGate } from "@/components/AuthGate";
import { useAppStore } from "@/lib/store";
import {
  formatIdr,
  formatOrderDateTime,
  keysAccessLabel,
  osmBrowseUrl,
  RETURN_GEOFENCE_M,
} from "@/lib/format";
import { operatorRatingStats } from "@/lib/catalog";
import { IS_DEMO } from "@/lib/demo";
import { CollectWindow } from "@/components/UxSignals";

export default function BookingConfirmedPage() {
  return (
    <AuthGate role="rider">
      <BookingConfirmedInner />
    </AuthGate>
  );
}

function BookingConfirmedInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const bookings = useAppStore((s) => s.bookings);
  const vehicles = useAppStore((s) => s.vehicles);
  const operators = useAppStore((s) => s.operators);
  const sites = useAppStore((s) => s.sites);
  const reviews = useAppStore((s) => s.reviews);
  const confirmBooking = useAppStore((s) => s.confirmBooking);
  const cancelBooking = useAppStore((s) => s.cancelBooking);
  const setToast = useAppStore((s) => s.setToast);

  const booking = bookings.find((b) => b.id === id);
  const vehicle = vehicles.find((v) => v.id === booking?.vehicleId);
  const op = operators.find((o) => o.id === booking?.operatorId);
  const site = sites.find((s) => s.id === booking?.siteId);
  const hubRating = op
    ? operatorRatingStats(op.id, bookings, reviews)
    : { avg: 0, count: 0 };
  const prevStatus = useRef(booking?.status);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (!booking) return;
    if (
      prevStatus.current === "pending" &&
      booking.status !== "pending" &&
      booking.status !== "cancelled"
    ) {
      setToast("Hub confirmed — ready for pickup");
      setSimulating(false);
    }
    prevStatus.current = booking.status;
  }, [booking, setToast]);

  if (!booking || !vehicle || !op) {
    return <div className="p-6">Booking not found.</div>;
  }

  const keys = booking.keysAccess ?? "digital";
  const needsShop =
    keys === "physical" || keys === "both" || booking.pickupType === "front_desk";
  const needsDigital = keys === "digital" || keys === "both";
  const payAtCounter =
    booking.paymentMethod === "pay_at_operator" &&
    booking.paymentStatus === "pending";
  const waitingConfirm = booking.status === "pending";
  const ready =
    !payAtCounter &&
    (booking.status === "confirmed" || booking.status === "awaiting_pickup");
  const shopLat = site?.lat ?? op.lat;
  const shopLng = site?.lng ?? op.lng;
  const shopLabel =
    site?.shopPickupLabel || op.shopPickupLabel || site?.name || op.name;
  const returnHubs = sites.filter((s) => s.operatorId === booking.operatorId);
  const selectedReturnId = booking.returnSiteId || booking.siteId;

  function simulateConfirm() {
    setSimulating(true);
    setToast("Sending request to hub…");
    window.setTimeout(() => {
      confirmBooking(booking!.id);
    }, 1200);
  }

  return (
    <div className="pb-10">
      <Header
        title={
          waitingConfirm
            ? "Waiting for hub confirm"
            : payAtCounter
              ? "Pay at hub"
            : ready
              ? "Ready for pickup"
              : "Your booking"
        }
        backHref="/home"
      />
      <div className="booking-code px-4 py-6 text-center">
        <div className="text-sm" style={{ color: "var(--text2)" }}>
          Booking code
        </div>
        <div
          className="mt-3 inline-block rounded-2xl px-8 py-5 font-display text-3xl font-bold tracking-[0.2em]"
          style={{ background: "#E8F8F5", color: "var(--primary)" }}
        >
          {booking.code}
        </div>
        <div className="mt-4 text-sm" style={{ color: "var(--text2)" }}>
          {vehicle.name} · unit {vehicle.code}
          <br />
          {booking.durationLabel} · {op.name}
          {site ? ` · ${site.name}` : ""}
          {hubRating.count > 0 ? (
            <>
              <br />
              Hub ★ {hubRating.avg} ({hubRating.count} reviews)
            </>
          ) : null}
          <br />
          Keys: {keysAccessLabel(keys)}
          <br />
          {formatIdr(
            booking.rentalPriceIdr +
              (booking.addonsPriceIdr ?? 0) +
              booking.depositIdr,
          )}{" "}
          {booking.paymentStatus === "paid"
            ? "paid"
            : payAtCounter
              ? "due at counter"
              : "payment pending"}
          <br />
          via {booking.paymentMethod.replace(/_/g, " ")}
        </div>
        <div
          className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold"
          style={{
            background: "color-mix(in srgb, var(--warn) 14%, white)",
            color: "var(--text-warn)",
          }}
        >
          Schedule · {formatOrderDateTime(booking.appointmentAt)}
        </div>
      </div>

      {(ready || payAtCounter) && !booking.startsAt ? (
        <CollectWindow booking={booking} />
      ) : null}

      {(booking.addons ?? []).length > 0 ? (
        <div className="card">
          <div className="font-bold text-sm">Charging add-ons</div>
          <ul className="mt-2 space-y-2 text-sm" style={{ color: "var(--text2)" }}>
            {(booking.addons ?? []).map((a) => (
              <li key={a.id}>
                <strong style={{ color: "var(--text)" }}>{a.label}</strong>
                {a.voucherCode ? (
                  <>
                    <br />
                    Voucher code:{" "}
                    <span
                      className="font-mono font-bold"
                      style={{ color: "var(--primary)" }}
                    >
                      {a.voucherCode}
                    </span>{" "}
                    — show at any Casan hub
                  </>
                ) : null}
                {a.amps != null ? (
                  <>
                    <br />
                    Adapter: {a.amps}A (matches pack voltage only)
                  </>
                ) : null}
                <br />
                {formatIdr(a.priceIdr)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {waitingConfirm ? (
        <div
          className="mx-4 rounded-xl border p-4 text-sm"
          style={{ borderColor: "var(--warn)", background: "#FEF5E7" }}
        >
          <div className="font-semibold">Request sent — waiting for operator</div>
          <p className="mt-1" style={{ color: "var(--text2)" }}>
            Staff must confirm shop / key bookings. You will be notified when
            the bike is ready.
          </p>
          {IS_DEMO ? (
          <button
            type="button"
            className="mt-3 w-full rounded-xl py-2.5 text-xs font-bold text-white"
            style={{ background: "var(--primary)", opacity: simulating ? 0.6 : 1 }}
            disabled={simulating}
            onClick={simulateConfirm}
          >
            {simulating ? "Simulating operator…" : "Simulate operator confirm"}
          </button>
          ) : null}
        </div>
      ) : null}

      {ready ? (
        <div
          className="mx-4 rounded-xl border p-4 text-sm"
          style={{ borderColor: "var(--ok)", background: "#E8F8F5" }}
        >
          Ready for pickup — show code <strong>{booking.code}</strong>.
        </div>
      ) : null}

      {payAtCounter ? (
        <div
          className="mx-4 rounded-xl border p-4 text-sm"
          style={{ borderColor: "var(--warn)", background: "#FEF5E7" }}
        >
          Pay at the shop when you collect the bike. Staff will mark the
          payment received before the rental starts.
        </div>
      ) : null}

      {/* Primary next step first — map & contact are secondary. */}
      <button
        type="button"
        className="btn-primary"
        disabled={waitingConfirm}
        style={{ opacity: waitingConfirm ? 0.5 : 1 }}
        onClick={() => {
          if (waitingConfirm) {
            setToast("Still waiting for hub confirm");
            return;
          }
          router.push(
            needsShop
              ? `/book/${booking.id}/handover`
              : `/book/${booking.id}/checkin`,
          );
        }}
      >
        {waitingConfirm
          ? "Waiting for hub confirm…"
          : payAtCounter
            ? "Go to hub · pay and collect"
          : needsShop
            ? keys === "both"
              ? "I've arrived — collect key + start"
              : "I've arrived / collect at hub"
            : "Self check-in (app unlock)"}
      </button>

      <div className="card">
        <div className="font-bold">How pickup works</div>
        {keys === "both" ? (
          <ol
            className="mt-2 list-decimal space-y-1 pl-4 text-sm"
            style={{ color: "var(--text2)" }}
          >
            <li>Go to hub: {shopLabel}</li>
            <li>Show booking code {booking.code} to staff</li>
            <li>
              Collect the <strong>physical key</strong> (handed over at counter)
            </li>
            <li>
              Unlock & control motor with the <strong>app digital key</strong>
            </li>
          </ol>
        ) : needsShop ? (
          <ol
            className="mt-2 list-decimal space-y-1 pl-4 text-sm"
            style={{ color: "var(--text2)" }}
          >
            <li>Go to {shopLabel}</li>
            <li>Show booking code {booking.code} to staff</li>
            <li>Collect physical key / bike — then start timer in app</li>
          </ol>
        ) : (
          <ol
            className="mt-2 list-decimal space-y-1 pl-4 text-sm"
            style={{ color: "var(--text2)" }}
          >
            <li>Navigate to {op.selfCollectLabel}</li>
            <li>Find unit {vehicle.code} at the pin</li>
            <li>Unlock with the app digital key — no staff required</li>
          </ol>
        )}
      </div>

      <a
        className="btn-secondary text-center"
        href={osmBrowseUrl(
          needsShop ? shopLat : op.selfCollectLat,
          needsShop ? shopLng : op.selfCollectLng,
        )}
        target="_blank"
        rel="noreferrer"
      >
        {needsShop
          ? "Open shop on OpenStreetMap"
          : "Open self-collect pin on OpenStreetMap"}
      </a>

      {returnHubs.length > 0 ? (
        <div className="card">
          <div className="font-bold">Return here</div>
          <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
            Return within {RETURN_GEOFENCE_M} m of your chosen hub · phone GPS
          </p>
          <ul className="mt-3 space-y-2">
            {returnHubs.map((hub) => {
              const selected = hub.id === selectedReturnId;
              return (
                <li
                  key={hub.id}
                  className="rounded-xl border px-3 py-2.5 text-sm"
                  style={{
                    borderColor: selected ? "var(--primary)" : "var(--border)",
                    background: selected
                      ? "color-mix(in srgb, var(--primary) 8%, white)"
                      : "var(--bg)",
                  }}
                >
                  <div
                    className="font-bold"
                    style={{
                      color: selected ? "var(--primary)" : "var(--text)",
                    }}
                  >
                    {hub.name}
                    {selected ? " · chosen" : ""}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text2)" }}>
                    {hub.area}
                    {hub.city ? ` · ${hub.city}` : ""}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {needsDigital ? (
        <div
          className="mx-4 rounded-xl border p-4 text-sm"
          style={{
            borderColor: booking.digitalKeyIssuedAt
              ? "var(--ok)"
              : "var(--warn)",
            background: booking.digitalKeyIssuedAt ? "#E8F8F5" : "#FEF5E7",
          }}
        >
          {booking.digitalKeyIssuedAt ? (
            <>
              <div className="font-semibold">
                Digital key ready — open Unlock
              </div>
              <p className="mt-1" style={{ color: "var(--text2)" }}>
                Use the app to unlock when you arrive at the unit.
              </p>
            </>
          ) : booking.digitalKeyIssueMode === "auto" && waitingConfirm ? (
            <>
              <div className="font-semibold">
                Digital key pending (auto)
              </div>
              <p className="mt-1" style={{ color: "var(--text2)" }}>
                Key issues automatically when the hub confirms your booking.
              </p>
            </>
          ) : (
            <>
              <div className="font-semibold">
                Waiting for staff to issue digital key
              </div>
              <p className="mt-1" style={{ color: "var(--text2)" }}>
                Staff will send the unlock key from the operator app.
              </p>
            </>
          )}
        </div>
      ) : null}

      <div className="card">
        <div className="mb-2 font-bold text-sm">Need help?</div>
        <ContactActions
          phone={op.phone}
          email={op.email}
          name={op.name}
          bookingCode={booking.code}
        />
      </div>

      <div className="card">
        <div className="font-bold text-sm">Change appointment or duration?</div>
        <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
          The app does not rewrite price silently. Contact the hub to modify a
          paid booking, or cancel while unpaid and book again.
        </p>
        {booking.paymentStatus === "pending" &&
        !["active", "overdue", "completed", "cancelled"].includes(
          booking.status,
        ) ? (
          <button
            type="button"
            className="btn-secondary !mx-0 mt-3 !w-full"
            onClick={() => {
              if (
                !window.confirm(
                  "Cancel this unpaid booking? You can book again with a new time.",
                )
              ) {
                return;
              }
              cancelBooking(booking.id);
              setToast("Booking cancelled — book again to change schedule");
              router.push(
                booking.siteId
                  ? `/models/${booking.modelId}?site=${booking.siteId}`
                  : `/models/${booking.modelId}`,
              );
            }}
          >
            Cancel unpaid · rebook
          </button>
        ) : (
          <a
            className="btn-secondary !mx-0 mt-3 !w-full text-center"
            href={`https://wa.me/${(site?.whatsapp || op.phone).replace(/\D/g, "")}?text=${encodeURIComponent(
              `Hi, I'd like to change booking ${booking.code} (appointment/duration).`,
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp hub to modify
          </a>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { ContactActions } from "@/components/ContactActions";
import { useAppStore } from "@/lib/store";
import {
  formatIdr,
  formatOrderDateTime,
  keysAccessLabel,
  osmBrowseUrl,
} from "@/lib/format";
import { IS_DEMO } from "@/lib/demo";

export default function BookingConfirmedPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const bookings = useAppStore((s) => s.bookings);
  const vehicles = useAppStore((s) => s.vehicles);
  const operators = useAppStore((s) => s.operators);
  const sites = useAppStore((s) => s.sites);
  const confirmBooking = useAppStore((s) => s.confirmBooking);
  const setToast = useAppStore((s) => s.setToast);

  const booking = bookings.find((b) => b.id === id);
  const vehicle = vehicles.find((v) => v.id === booking?.vehicleId);
  const op = operators.find((o) => o.id === booking?.operatorId);
  const site = sites.find((s) => s.id === booking?.siteId);
  const prevStatus = useRef(booking?.status);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (!booking) return;
    if (
      prevStatus.current === "pending" &&
      booking.status !== "pending" &&
      booking.status !== "cancelled"
    ) {
      setToast("Operator confirmed — ready for pickup");
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

  function simulateConfirm() {
    setSimulating(true);
    setToast("Sending request to operator…");
    window.setTimeout(() => {
      confirmBooking(booking!.id);
    }, 1200);
  }

  return (
    <div className="pb-10">
      <Header
        title={
          waitingConfirm
            ? "Waiting for operator"
            : payAtCounter
              ? "Pay at pickup"
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
          <br />
          Pickup appointment: {formatOrderDateTime(booking.appointmentAt)}
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
      </div>

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
            setToast("Still waiting for operator confirm");
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
          ? "Waiting for operator confirm…"
          : payAtCounter
            ? "Go to shop · pay and collect"
          : needsShop
            ? keys === "both"
              ? "I've arrived — collect key + start"
              : "I've arrived / collect at shop"
            : "Self check-in (app unlock)"}
      </button>

      <div className="card">
        <div className="font-bold">How pickup works</div>
        {keys === "both" ? (
          <ol
            className="mt-2 list-decimal space-y-1 pl-4 text-sm"
            style={{ color: "var(--text2)" }}
          >
            <li>Go to shop: {shopLabel}</li>
            <li>Show booking code {booking.code} to staff</li>
            <li>
              Collect the <strong>physical key</strong> (handedness at counter)
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

      <div className="card">
        <div className="mb-2 font-bold text-sm">Need help?</div>
        <ContactActions
          phone={op.phone}
          email={op.email}
          name={op.name}
          bookingCode={booking.code}
        />
      </div>
    </div>
  );
}

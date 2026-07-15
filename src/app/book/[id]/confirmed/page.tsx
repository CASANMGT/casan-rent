"use client";

import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAppStore } from "@/lib/store";
import { formatIdr } from "@/lib/format";

export default function BookingConfirmedPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const bookings = useAppStore((s) => s.bookings);
  const vehicles = useAppStore((s) => s.vehicles);
  const operators = useAppStore((s) => s.operators);
  const setToast = useAppStore((s) => s.setToast);

  const booking = bookings.find((b) => b.id === id);
  const vehicle = vehicles.find((v) => v.id === booking?.vehicleId);
  const op = operators.find((o) => o.id === booking?.operatorId);

  if (!booking || !vehicle || !op) {
    return <div className="p-6">Booking not found.</div>;
  }

  const isFrontDesk = booking.pickupType === "front_desk";
  const waitingConfirm = booking.status === "pending";

  return (
    <div className="pb-10">
      <Header title="Booking confirmed" backHref="/home" />
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
          {vehicle.name} · {booking.durationLabel}
          <br />
          {op.name}
          <br />
          {formatIdr(booking.rentalPriceIdr + booking.depositIdr)} paid (mock)
        </div>
      </div>

      {waitingConfirm ? (
        <div
          className="mx-4 rounded-xl border p-4 text-sm"
          style={{ borderColor: "var(--warn)", background: "#FEF5E7" }}
        >
          Waiting for operator confirmation. You&apos;ll be notified when ready
          for pickup.
        </div>
      ) : null}

      {isFrontDesk ? (
        <div className="card">
          <div className="font-bold">Next: collect at front desk</div>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
            Show your booking code to staff at {op.name}. Tap below once you
            have the key / vehicle — that starts your timer.
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="font-bold">Next: self check-in</div>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
            Go to the parking point, verify vehicle code {vehicle.code}, then
            start your ride. Timer begins at unlock.
          </p>
        </div>
      )}

      <a
        className="btn-secondary text-center"
        href={`https://www.google.com/maps/dir/?api=1&destination=${op.lat},${op.lng}`}
        target="_blank"
        rel="noreferrer"
      >
        Directions to operator
      </a>

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
            isFrontDesk
              ? `/book/${booking.id}/handover`
              : `/book/${booking.id}/checkin`,
          );
        }}
      >
        {isFrontDesk ? "I've arrived / collect key" : "Self check-in"}
      </button>
    </div>
  );
}

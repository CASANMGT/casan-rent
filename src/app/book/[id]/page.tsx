"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAppStore } from "@/lib/store";
import { formatIdr } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

const methods: { id: PaymentMethod; name: string; desc: string }[] = [
  { id: "qris", name: "QRIS", desc: "Scan any Indonesian QRIS" },
  { id: "dana", name: "DANA", desc: "E-wallet" },
  { id: "ovo", name: "OVO", desc: "E-wallet" },
  { id: "gopay", name: "GoPay", desc: "E-wallet" },
  { id: "shopeepay", name: "ShopeePay", desc: "E-wallet" },
  { id: "pay_at_operator", name: "Pay at operator", desc: "Cash / counter QRIS" },
];

export default function BookPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const bookings = useAppStore((s) => s.bookings);
  const vehicles = useAppStore((s) => s.vehicles);
  const operators = useAppStore((s) => s.operators);
  const payBooking = useAppStore((s) => s.payBooking);
  const setToast = useAppStore((s) => s.setToast);

  const booking = bookings.find((b) => b.id === id);
  const vehicle = vehicles.find((v) => v.id === booking?.vehicleId);
  const op = operators.find((o) => o.id === booking?.operatorId);

  const [method, setMethod] = useState<PaymentMethod>("qris");
  const [loading, setLoading] = useState(false);

  if (!booking || !vehicle || !op) {
    return (
      <div>
        <Header title="Booking" backHref="/home" />
        <p className="p-6">Booking not found. Start from a vehicle page.</p>
      </div>
    );
  }

  const total = booking.rentalPriceIdr + booking.depositIdr;

  async function pay() {
    setLoading(true);
    try {
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking!.id,
          method,
          amountIdr: total,
        }),
      });
      const data = await res.json();
      payBooking(booking!.id);
      setToast(data.message ?? "Payment succeeded (mock)");
      router.push(`/book/${booking!.id}/confirmed`);
    } catch {
      setToast("Payment failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content-pad">
      <Header title="Payment" subtitle="Demo checkout" backHref={`/vehicles/${vehicle.id}`} />
      <div className="card">
        <div className="font-bold">{vehicle.name}</div>
        <div className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
          {op.name} · {booking.durationLabel}
        </div>
        <div className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
          Pickup:{" "}
          {booking.pickupType === "front_desk"
            ? "Front Desk"
            : "Self-Service"}
        </div>
        <div className="mt-3 flex justify-between border-t pt-3 text-sm" style={{ borderColor: "var(--border)" }}>
          <span>Rental</span>
          <span>{formatIdr(booking.rentalPriceIdr)}</span>
        </div>
        <div className="flex justify-between py-2 text-sm">
          <span>Deposit</span>
          <span>{formatIdr(booking.depositIdr)}</span>
        </div>
        <div className="flex justify-between border-t-2 pt-3 font-bold" style={{ borderColor: "var(--text)" }}>
          <span>Total</span>
          <span>{formatIdr(total)}</span>
        </div>
      </div>

      <p className="section-label">Payment method</p>
      {methods.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setMethod(m.id)}
          className="mx-4 mb-2 flex w-[calc(100%-32px)] items-center gap-3 rounded-xl border-2 p-3.5 text-left"
          style={{
            borderColor: method === m.id ? "var(--primary)" : "transparent",
            background:
              method === m.id
                ? "color-mix(in srgb, var(--primary) 8%, white)"
                : "var(--card)",
          }}
        >
          <div className="flex-1">
            <div className="text-sm font-semibold">{m.name}</div>
            <div className="text-xs" style={{ color: "var(--text2)" }}>
              {m.desc}
            </div>
          </div>
          <div
            className="h-5 w-5 rounded-full border-2"
            style={{
              borderColor: method === m.id ? "var(--primary)" : "var(--border)",
              background: method === m.id ? "var(--primary)" : "transparent",
            }}
          />
        </button>
      ))}

      <p className="mx-4 mt-2 text-center text-xs" style={{ color: "var(--text2)" }}>
        Payments are mocked via /api/payment — no real charge.
      </p>

      <button
        type="button"
        className="btn-primary"
        disabled={loading}
        onClick={pay}
      >
        {loading ? "Processing…" : `Pay ${formatIdr(total)}`}
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";
import { useAppStore } from "@/lib/store";
import { formatIdr, formatOrderDateTime } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import { IS_DEMO } from "@/lib/demo";

const methods: { id: PaymentMethod; name: string; desc: string }[] = [
  { id: "qris", name: "QRIS", desc: "Scan any Indonesian QRIS" },
  { id: "dana", name: "DANA", desc: "E-wallet" },
  { id: "ovo", name: "OVO", desc: "E-wallet" },
  { id: "gopay", name: "GoPay", desc: "E-wallet" },
  { id: "shopeepay", name: "ShopeePay", desc: "E-wallet" },
  { id: "pay_at_operator", name: "Pay at hub", desc: "Cash / counter QRIS" },
];

export default function BookPaymentPage() {
  return (
    <AuthGate role="rider">
      <BookPaymentInner />
    </AuthGate>
  );
}

function BookPaymentInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const bookings = useAppStore((s) => s.bookings);
  const vehicles = useAppStore((s) => s.vehicles);
  const operators = useAppStore((s) => s.operators);
  const payBooking = useAppStore((s) => s.payBooking);
  const setPaymentMethod = useAppStore((s) => s.setPaymentMethod);
  const cancelBooking = useAppStore((s) => s.cancelBooking);
  const setToast = useAppStore((s) => s.setToast);
  const sites = useAppStore((s) => s.sites);

  const booking = bookings.find((b) => b.id === id);
  const vehicle = vehicles.find((v) => v.id === booking?.vehicleId);
  const op = operators.find((o) => o.id === booking?.operatorId);
  const site = sites.find((s) => s.id === booking?.siteId);

  const [method, setMethod] = useState<PaymentMethod>(
    booking?.paymentMethod === "pay_at_operator" &&
      booking.pickupType !== "front_desk"
      ? "qris"
      : (booking?.paymentMethod ?? "qris"),
  );
  const [loading, setLoading] = useState(false);

  if (!booking || !vehicle || !op) {
    return (
      <div>
        <Header title="Booking" backHref="/home" />
        <p className="p-6">Booking not found. Start from a vehicle page.</p>
      </div>
    );
  }

  const total = booking.rentalPriceIdr + (booking.addonsPriceIdr ?? 0) + booking.depositIdr;
  const bookingId = booking.id;
  const visibleMethods = methods.filter(
    (m) =>
      m.id !== "pay_at_operator" || booking.pickupType === "front_desk",
  );

  async function pay() {
    setLoading(true);
    try {
      setPaymentMethod(bookingId, method);
      if (method === "pay_at_operator") {
        setToast("Pay at the counter when you collect the bike");
        router.push(`/book/${bookingId}/confirmed`);
        return;
      }
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          method,
          amountIdr: total,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Payment was not completed");
      }
      payBooking(bookingId);
      setToast(data.message ?? "Payment succeeded (mock)");
      router.push(`/book/${bookingId}/confirmed`);
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Payment failed — try again",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="content-pad">
      <Header
        title="Payment"
        subtitle={IS_DEMO ? "Demo checkout — no real charge" : undefined}
        backHref={
          booking.siteId
            ? `/models/${booking.modelId}?site=${booking.siteId}`
            : `/models/${booking.modelId}`
        }
      />
      <div className="card">
        <div className="font-bold">{vehicle.name}</div>
        <div className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
          {site?.name ?? op.name} · {booking.durationLabel}
        </div>
        <div className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
          Pickup:{" "}
          {booking.pickupType === "front_desk"
            ? "Shop pickup"
            : "Self-unlock at hub"}
          <br />
          Appointment: {formatOrderDateTime(booking.appointmentAt)}
        </div>
        <div className="mt-3 flex justify-between border-t pt-3 text-sm" style={{ borderColor: "var(--border)" }}>
          <span>Rental</span>
          <span>{formatIdr(booking.rentalPriceIdr)}</span>
        </div>
        {(booking.addons ?? []).map((a) => (
          <div key={a.id} className="flex justify-between py-1.5 text-sm">
            <span>{a.label}</span>
            <span>{formatIdr(a.priceIdr)}</span>
          </div>
        ))}
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
      <div role="radiogroup" aria-label="Payment method">
      {visibleMethods.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={method === m.id}
          onClick={() => {
            setMethod(m.id);
            setPaymentMethod(booking.id, m.id);
          }}
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
      </div>

      {IS_DEMO ? (
        <p className="mx-4 mt-2 text-center text-xs" style={{ color: "var(--text2)" }}>
          Demo mode: payments are mocked via /api/payment — no real charge.
        </p>
      ) : null}

      <button
        type="button"
        className="btn-primary"
        disabled={loading}
        onClick={pay}
      >
        {loading
          ? "Processing…"
          : method === "pay_at_operator"
            ? "Reserve · pay at pickup"
            : `Pay ${formatIdr(total)}`}
      </button>

      {booking.paymentStatus === "pending" &&
      !["active", "overdue", "completed", "cancelled"].includes(booking.status) ? (
        <button
          type="button"
          className="btn-secondary"
          disabled={loading}
          onClick={() => {
            cancelBooking(booking.id);
            router.push("/history");
          }}
        >
          Cancel booking
        </button>
      ) : null}
    </div>
  );
}

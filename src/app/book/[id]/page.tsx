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
  {
    id: "casan_wallet",
    name: "Casan Wallet",
    desc: "Pay from your demo balance",
  },
  { id: "qris", name: "QRIS", desc: "Scan any Indonesian QRIS" },
  { id: "dana", name: "DANA", desc: "E-wallet" },
  { id: "ovo", name: "OVO", desc: "E-wallet" },
  { id: "gopay", name: "GoPay", desc: "E-wallet" },
  { id: "shopeepay", name: "ShopeePay", desc: "E-wallet" },
  {
    id: "pay_at_operator",
    name: "Pay at hub",
    desc: "Cash / counter — best for visitors without Indo e-wallets",
  },
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
  const walletBalanceIdr = useAppStore((s) => s.walletBalanceIdr);

  const booking = bookings.find((b) => b.id === id);
  const vehicle = vehicles.find((v) => v.id === booking?.vehicleId);
  const op = operators.find((o) => o.id === booking?.operatorId);
  const site = sites.find((s) => s.id === booking?.siteId);

  const [method, setMethod] = useState<PaymentMethod>(() => {
    if (!booking) return "casan_wallet";
    const totalDue =
      booking.rentalPriceIdr +
      (booking.addonsPriceIdr ?? 0) +
      booking.depositIdr;
    const preferred =
      booking.paymentMethod === "pay_at_operator" &&
      booking.pickupType !== "front_desk"
        ? "casan_wallet"
        : (booking.paymentMethod ?? "casan_wallet");
    if (preferred === "casan_wallet" && walletBalanceIdr < totalDue) {
      return "pay_at_operator";
    }
    return preferred;
  });
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

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
  const walletShort = method === "casan_wallet" && walletBalanceIdr < total;
  const visibleMethods = methods;

  async function pay() {
    if (!termsAccepted) {
      setToast("Accept the rental terms to continue");
      return;
    }
    if (method === "casan_wallet" && walletBalanceIdr < total) {
      setToast("Top up Casan Wallet or choose Pay at hub / QRIS");
      return;
    }
    setLoading(true);
    try {
      setPaymentMethod(bookingId, method);
      if (method === "pay_at_operator") {
        setToast("Pay at the counter when you collect the bike");
        router.push(`/book/${bookingId}/confirmed`);
        return;
      }
      if (method === "casan_wallet") {
        payBooking(bookingId);
        setToast("Paid with Casan Wallet (demo)");
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
              {m.id === "casan_wallet"
                ? `Balance ${formatIdr(walletBalanceIdr)} · ${m.desc}`
                : m.desc}
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

      <label className="mx-4 mt-4 flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-1 h-4 w-4 shrink-0"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
        />
        <span style={{ color: "var(--text2)" }}>
          I agree to the{" "}
          <button
            type="button"
            className="font-semibold underline"
            style={{ color: "var(--primary)" }}
            onClick={() => setTermsOpen(true)}
          >
            rental terms
          </button>
          {" "}(lost-key fee, return at hub, overtime billing coming soon).
        </span>
      </label>

      {termsOpen ? (
        <>
          <div
            className="fixed inset-0 z-[200] bg-black/40"
            onClick={() => setTermsOpen(false)}
          />
          <div
            className="fixed bottom-0 left-1/2 z-[201] w-full max-w-[430px] -translate-x-1/2 rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            style={{ background: "var(--card)" }}
            role="dialog"
            aria-modal="true"
            aria-label="Rental terms"
          >
            <div className="font-display text-lg font-semibold">Rental terms</div>
            <ul
              className="mt-3 list-disc space-y-2 pl-4 text-sm"
              style={{ color: "var(--text2)" }}
            >
              <li>Timer starts when you collect / unlock — not at payment.</li>
              <li>Return the bike at the booked hub within the return zone.</li>
              <li>
                Lost or damaged physical key may incur a replacement fee set by
                the hub (typically up to the deposit).
              </li>
              <li>
                Overtime billing is not charged in-app yet — return on time;
                hubs may settle late returns separately.
              </li>
            </ul>
            <button
              type="button"
              className="btn-primary !mx-0 mt-4 !w-full"
              onClick={() => {
                setTermsAccepted(true);
                setTermsOpen(false);
              }}
            >
              Agree and close
            </button>
          </div>
        </>
      ) : null}

      <button
        type="button"
        className="btn-primary"
        disabled={loading || !termsAccepted || walletShort}
        style={{ opacity: loading || !termsAccepted || walletShort ? 0.55 : 1 }}
        onClick={pay}
      >
        {loading
          ? "Processing…"
          : method === "pay_at_operator"
            ? "Reserve · pay at pickup"
            : method === "casan_wallet"
              ? walletShort
                ? "Insufficient wallet balance"
                : `Pay ${formatIdr(total)} with Wallet`
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

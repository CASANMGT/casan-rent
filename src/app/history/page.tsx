"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";
import { useAppStore } from "@/lib/store";
import { formatIdr } from "@/lib/format";
import type { Booking } from "@/lib/types";
import { StarsText } from "@/components/StarRating";

export default function HistoryPage() {
  return (
    <AuthGate role="rider">
      <HistoryInner />
    </AuthGate>
  );
}

function tripHref(status: string, paymentStatus: string, id: string) {
  if (status === "active" || status === "overdue" || status === "completed") {
    return `/ride/${id}`;
  }
  if (status === "cancelled") return `/history`;
  // Unpaid booking → resume checkout, not the confirmed screen.
  if (paymentStatus === "pending") return `/book/${id}`;
  return `/book/${id}/confirmed`;
}

function tripStatusLabel(status: string, paymentStatus: string) {
  if (
    paymentStatus === "pending" &&
    !["active", "completed", "cancelled", "overdue"].includes(status)
  ) {
    return "Pay to continue";
  }
  switch (status) {
    case "pending":
      return "Waiting for shop";
    case "confirmed":
    case "awaiting_pickup":
      return "Ready to collect";
    case "active":
      return "On ride";
    case "overdue":
      return "Overdue — return now";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status.replace("_", " ");
  }
}

const PAST_STATUSES = ["completed", "cancelled"] as const;

function HistoryInner() {
  const bookings = useAppStore((s) => s.bookings);
  const vehicles = useAppStore((s) => s.vehicles);
  const [showPast, setShowPast] = useState(false);

  const { ongoing, past } = useMemo(() => {
    const byNewest = [...bookings].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return {
      ongoing: byNewest.filter(
        (b) => !PAST_STATUSES.includes(b.status as (typeof PAST_STATUSES)[number]),
      ),
      past: byNewest.filter((b) =>
        PAST_STATUSES.includes(b.status as (typeof PAST_STATUSES)[number]),
      ),
    };
  }, [bookings]);

  const vehicleName = (b: Booking) =>
    vehicles.find((x) => x.id === b.vehicleId)?.name ?? "Vehicle";

  return (
    <div className="content-pad">
      <Header title="Your trips" />
      {bookings.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            No trips yet. Book a vehicle from Home.
          </p>
          <Link
            href="/home"
            className="mt-4 inline-block text-sm font-bold"
            style={{ color: "var(--primary)" }}
          >
            Browse nearby bikes →
          </Link>
        </div>
      ) : (
        <>
          <p className="section-label">Ongoing</p>
          {ongoing.length === 0 ? (
            <p
              className="mx-4 mb-2.5 rounded-2xl p-4 text-sm"
              style={{ background: "var(--card)", color: "var(--text2)" }}
            >
              No ongoing trip. Book a bike from Home.
            </p>
          ) : (
            ongoing.map((b) => (
              <TripCard key={b.id} booking={b} name={vehicleName(b)} />
            ))
          )}

          {past.length > 0 ? (
            <>
              <button
                type="button"
                className="mx-4 mt-3 mb-2.5 flex w-[calc(100%-32px)] items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--bg)",
                  color: "var(--text2)",
                }}
                onClick={() => setShowPast((v) => !v)}
              >
                <span>Past trips ({past.length})</span>
                {showPast ? (
                  <ChevronUp size={18} />
                ) : (
                  <ChevronDown size={18} />
                )}
              </button>
              {showPast
                ? past.map((b) => (
                    <TripCard key={b.id} booking={b} name={vehicleName(b)} />
                  ))
                : null}
            </>
          ) : null}
        </>
      )}
      <BottomNav variant="rider" />
    </div>
  );
}

function TripCard({ booking: b, name }: { booking: Booking; name: string }) {
  const href = tripHref(b.status, b.paymentStatus, b.id);
  const label = tripStatusLabel(b.status, b.paymentStatus);
  const inner = (
    <>
      <div className="flex justify-between gap-3">
        <div className="font-bold">{name}</div>
        <div
          className="shrink-0 text-right text-xs font-semibold"
          style={{
            color:
              b.status === "overdue"
                ? "var(--danger)"
                : b.status === "cancelled"
                  ? "var(--text2)"
                  : b.paymentStatus === "pending" &&
                      !["active", "completed"].includes(b.status)
                    ? "var(--warn)"
                    : "var(--primary)",
          }}
        >
          {label}
        </div>
      </div>
      <div className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
        {b.code} · {b.durationLabel} · {formatIdr(b.rentalPriceIdr)}
        {b.rating != null ? (
          <>
            {" · "}
            <StarsText value={b.rating} />
          </>
        ) : null}
      </div>
      {b.status === "cancelled" ? (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            This booking was cancelled. You can book again anytime.
          </p>
          <Link
            href="/home"
            className="shrink-0 text-xs font-bold"
            style={{ color: "var(--primary)" }}
          >
            Rebook →
          </Link>
        </div>
      ) : null}
    </>
  );
  if (b.status === "cancelled") {
    return (
      <div
        className="mx-4 mb-2.5 rounded-2xl p-4"
        style={{ background: "var(--card)" }}
      >
        {inner}
      </div>
    );
  }
  return (
    <Link
      href={href}
      className="mx-4 mb-2.5 block rounded-2xl p-4"
      style={{ background: "var(--card)" }}
    >
      {inner}
    </Link>
  );
}

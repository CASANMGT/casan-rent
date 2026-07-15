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
  const inner = (
    <>
      <div className="flex justify-between">
        <div className="font-bold">{name}</div>
        <div
          className="text-xs font-semibold capitalize"
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
          {b.paymentStatus === "pending" &&
          !["active", "completed", "cancelled", "overdue"].includes(b.status)
            ? "Pay to continue"
            : b.status.replace("_", " ")}
        </div>
      </div>
      <div className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
        {b.code} · {b.durationLabel} · {formatIdr(b.rentalPriceIdr)}
        {b.rating != null ? ` · ${"★".repeat(b.rating)}` : ""}
      </div>
    </>
  );
  if (b.status === "cancelled") {
    return (
      <div
        className="mx-4 mb-2.5 rounded-2xl p-4 opacity-70"
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

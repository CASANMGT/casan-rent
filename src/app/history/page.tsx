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
  if (paymentStatus === "pending") return `/book/${id}`;
  if (status === "pending") return `/book/${id}/confirmed`;
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
      return "Waiting for hub approval";
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

function isPendingManage(b: Booking) {
  if (b.status === "cancelled" || b.status === "completed") return false;
  if (b.status === "pending") return true;
  if (
    b.paymentStatus === "pending" &&
    !["active", "overdue"].includes(b.status)
  ) {
    return true;
  }
  return false;
}

function isLiveRide(b: Booking) {
  return b.status === "active" || b.status === "overdue";
}

function isReadyCollect(b: Booking) {
  return (
    (b.status === "confirmed" || b.status === "awaiting_pickup") &&
    b.paymentStatus === "paid"
  );
}

const PAST_STATUSES = ["completed", "cancelled"] as const;

function HistoryInner() {
  const bookings = useAppStore((s) => s.bookings);
  const vehicles = useAppStore((s) => s.vehicles);
  const sites = useAppStore((s) => s.sites);
  const cancelBooking = useAppStore((s) => s.cancelBooking);
  const setToast = useAppStore((s) => s.setToast);
  const [showPast, setShowPast] = useState(false);

  const { pending, ready, live, past } = useMemo(() => {
    const byNewest = [...bookings].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const pastList = byNewest.filter((b) =>
      PAST_STATUSES.includes(b.status as (typeof PAST_STATUSES)[number]),
    );
    const open = byNewest.filter(
      (b) => !PAST_STATUSES.includes(b.status as (typeof PAST_STATUSES)[number]),
    );
    return {
      pending: open.filter(isPendingManage),
      ready: open.filter((b) => isReadyCollect(b) && !isPendingManage(b)),
      live: open.filter(isLiveRide),
      past: pastList,
    };
  }, [bookings]);

  const vehicleName = (b: Booking) =>
    vehicles.find((x) => x.id === b.vehicleId)?.name ?? "Vehicle";
  const hubName = (b: Booking) =>
    sites.find((s) => s.id === b.siteId)?.name ?? null;

  function handleCancel(b: Booking) {
    const canCancel =
      b.paymentStatus !== "paid" || b.status === "pending";
    if (!canCancel) {
      setToast("This booking can no longer be cancelled here");
      return;
    }
    if (
      !window.confirm(
        b.status === "pending" && b.paymentStatus === "paid"
          ? `Cancel ${b.code}? The hub has not approved it yet.`
          : `Cancel unpaid booking ${b.code}?`,
      )
    ) {
      return;
    }
    cancelBooking(b.id);
  }

  const empty =
    pending.length === 0 &&
    ready.length === 0 &&
    live.length === 0 &&
    past.length === 0;

  return (
    <div className="content-pad">
      <Header title="Your trips" />
      {empty ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            No trips yet. Book a vehicle from Home.
          </p>
          <Link
            href="/home"
            className="mt-4 inline-block text-sm font-bold"
            style={{ color: "var(--primary)" }}
          >
            Find a hub →
          </Link>
        </div>
      ) : (
        <>
          {pending.length > 0 ? (
            <>
              <p className="section-label">Pending</p>
              <p
                className="mx-4 -mt-1 mb-2 text-xs"
                style={{ color: "var(--text2)" }}
              >
                Not on a ride yet — pay, wait for hub approval, or cancel.
              </p>
              {pending.map((b) => (
                <TripCard
                  key={b.id}
                  booking={b}
                  name={vehicleName(b)}
                  hub={hubName(b)}
                  onCancel={() => handleCancel(b)}
                />
              ))}
            </>
          ) : null}

          {live.length > 0 ? (
            <>
              <p className="section-label">On ride</p>
              {live.map((b) => (
                <TripCard
                  key={b.id}
                  booking={b}
                  name={vehicleName(b)}
                  hub={hubName(b)}
                />
              ))}
            </>
          ) : null}

          {ready.length > 0 ? (
            <>
              <p className="section-label">Ready to collect</p>
              {ready.map((b) => (
                <TripCard
                  key={b.id}
                  booking={b}
                  name={vehicleName(b)}
                  hub={hubName(b)}
                />
              ))}
            </>
          ) : null}

          {pending.length === 0 && live.length === 0 && ready.length === 0 ? (
            <p
              className="mx-4 mb-2.5 rounded-2xl p-4 text-sm"
              style={{ background: "var(--card)", color: "var(--text2)" }}
            >
              No open trips. Book a bike from Home.
            </p>
          ) : null}

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
                    <TripCard
                      key={b.id}
                      booking={b}
                      name={vehicleName(b)}
                      hub={hubName(b)}
                    />
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

function TripCard({
  booking: b,
  name,
  hub,
  onCancel,
}: {
  booking: Booking;
  name: string;
  hub: string | null;
  onCancel?: () => void;
}) {
  const href = tripHref(b.status, b.paymentStatus, b.id);
  const label = tripStatusLabel(b.status, b.paymentStatus);
  const when = b.appointmentAt
    ? new Date(b.appointmentAt).toLocaleString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const needsPay =
    b.paymentStatus === "pending" &&
    !["active", "completed", "cancelled", "overdue"].includes(b.status);
  const waitingApproval = b.status === "pending" && b.paymentStatus === "paid";
  const canCancel =
    Boolean(onCancel) &&
    (needsPay || waitingApproval);

  const details = (
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
                  : needsPay || waitingApproval
                    ? "var(--warn)"
                    : "var(--primary)",
          }}
        >
          {label}
        </div>
      </div>
      <div className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
        {hub ? `${hub} · ` : ""}
        {b.code} · {b.durationLabel} · {formatIdr(b.rentalPriceIdr)}
        {when ? ` · ${when}` : ""}
        {b.rating != null ? (
          <>
            {" · "}
            <StarsText value={b.rating} />
          </>
        ) : null}
      </div>
      {waitingApproval ? (
        <p className="mt-2 text-xs" style={{ color: "var(--text2)" }}>
          Paid — waiting for the hub to accept. You can cancel until they
          confirm.
        </p>
      ) : null}
      {needsPay ? (
        <p className="mt-2 text-xs" style={{ color: "var(--text2)" }}>
          Finish payment to send this request to the hub.
        </p>
      ) : null}
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
      {canCancel || needsPay || waitingApproval ? (
        <div className="mt-3 flex gap-2">
          {needsPay ? (
            <Link
              href={href}
              className="flex-1 rounded-xl py-2.5 text-center text-xs font-bold text-white"
              style={{ background: "var(--primary)" }}
              onClick={(e) => e.stopPropagation()}
            >
              Pay now
            </Link>
          ) : waitingApproval ? (
            <Link
              href={href}
              className="flex-1 rounded-xl py-2.5 text-center text-xs font-bold text-white"
              style={{ background: "var(--primary)" }}
              onClick={(e) => e.stopPropagation()}
            >
              View status
            </Link>
          ) : null}
          {canCancel ? (
            <button
              type="button"
              className="flex-1 rounded-xl border py-2.5 text-xs font-bold"
              style={{
                borderColor: "var(--border)",
                color: "var(--danger)",
                background: "var(--card)",
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCancel?.();
              }}
            >
              Cancel
            </button>
          ) : null}
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
        {details}
      </div>
    );
  }

  if (canCancel || needsPay || waitingApproval) {
    return (
      <div
        className="mx-4 mb-2.5 rounded-2xl p-4"
        style={{ background: "var(--card)" }}
      >
        {details}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="mx-4 mb-2.5 block rounded-2xl p-4"
      style={{ background: "var(--card)" }}
    >
      {details}
    </Link>
  );
}

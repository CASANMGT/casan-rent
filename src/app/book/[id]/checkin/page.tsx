"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";
import { useAppStore } from "@/lib/store";

export default function CheckinPage() {
  return (
    <AuthGate role="rider">
      <CheckinInner />
    </AuthGate>
  );
}

function CheckinInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const bookings = useAppStore((s) => s.bookings);
  const vehicles = useAppStore((s) => s.vehicles);
  const sites = useAppStore((s) => s.sites);
  const startRide = useAppStore((s) => s.startRide);
  const setToast = useAppStore((s) => s.setToast);
  const [busy, setBusy] = useState(false);

  const booking = bookings.find((b) => b.id === id);
  const vehicle = vehicles.find((v) => v.id === booking?.vehicleId);
  const site = sites.find((s) => s.id === booking?.siteId);

  if (!booking || !vehicle) return <div className="p-6">Not found</div>;

  async function unlockAndStart() {
    setBusy(true);
    try {
      const res = await fetch("/api/iot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "unlock",
          vehicleId: vehicle!.id,
          bookingId: booking!.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setToast(
          typeof data.message === "string"
            ? data.message
            : "Unlock failed — try again",
        );
        return;
      }
      startRide(booking!.id);
      setToast(data.message ?? "Unlocked — ride started");
      router.push(`/ride/${booking!.id}`);
    } catch {
      setToast("Unlock failed — check connection and try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="content-pad pb-8">
      <Header title="Self check-in" backHref={`/book/${id}/confirmed`} />
      <div className="card text-center !py-5">
        <div
          className="text-[10px] font-bold uppercase tracking-wide"
          style={{ color: "var(--text2)" }}
        >
          Unit to unlock
        </div>
        <div
          className="mt-2 font-display text-3xl font-bold tracking-widest"
          style={{ color: "var(--primary)" }}
        >
          {vehicle.code}
        </div>
        <div className="mt-2 font-bold">{vehicle.name}</div>
        {site ? (
          <div className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
            {site.name}
            {booking.appointmentAt
              ? ` · ${new Date(booking.appointmentAt).toLocaleString("id-ID", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : ""}
          </div>
        ) : null}
        <p className="mt-3 text-sm" style={{ color: "var(--text2)" }}>
          Match the code on the bike, then unlock. Timer starts when you unlock —
          not at payment.
        </p>
      </div>
      <button
        type="button"
        className="btn-primary"
        disabled={busy}
        onClick={unlockAndStart}
      >
        {busy ? "Unlocking…" : "Unlock unit & start"}
      </button>
    </div>
  );
}

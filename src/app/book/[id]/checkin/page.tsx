"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAppStore } from "@/lib/store";

export default function CheckinPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const bookings = useAppStore((s) => s.bookings);
  const vehicles = useAppStore((s) => s.vehicles);
  const startRide = useAppStore((s) => s.startRide);
  const setToast = useAppStore((s) => s.setToast);
  const [busy, setBusy] = useState(false);

  const booking = bookings.find((b) => b.id === id);
  const vehicle = vehicles.find((v) => v.id === booking?.vehicleId);

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
      const data = await res.json();
      startRide(booking!.id);
      setToast(data.message ?? "Unlocked");
      router.push(`/ride/${booking!.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Header title="Self check-in" backHref={`/book/${id}/confirmed`} />
      <div className="card text-center">
        <div
          className="mx-auto flex h-40 w-40 items-center justify-center rounded-2xl border-2 border-dashed text-sm"
          style={{ borderColor: "var(--primary)", color: "var(--text2)" }}
        >
          QR scan mock
          <br />
          {vehicle.code}
        </div>
        <div className="mt-4 font-bold">{vehicle.name}</div>
        <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
          Verify the plate/code, then unlock. Timer starts now — not at payment.
        </p>
      </div>
      <button
        type="button"
        className="btn-primary"
        disabled={busy}
        onClick={unlockAndStart}
      >
        {busy ? "Unlocking…" : "Unlock & start ride"}
      </button>
    </div>
  );
}

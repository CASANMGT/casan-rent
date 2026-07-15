"use client";

import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAppStore } from "@/lib/store";

export default function HandoverPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const bookings = useAppStore((s) => s.bookings);
  const vehicles = useAppStore((s) => s.vehicles);
  const startRide = useAppStore((s) => s.startRide);
  const setToast = useAppStore((s) => s.setToast);

  const booking = bookings.find((b) => b.id === id);
  const vehicle = vehicles.find((v) => v.id === booking?.vehicleId);

  if (!booking || !vehicle) return <div className="p-6">Not found</div>;

  return (
    <div>
      <Header title="Key handover" backHref={`/book/${id}/confirmed`} />
      <div className="card text-center">
        <div className="text-5xl">{vehicle.emoji}</div>
        <div className="mt-3 font-bold">{vehicle.name}</div>
        <div className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
          Show code <strong>{booking.code}</strong> to staff, receive the key,
          then start the rental.
        </div>
      </div>
      <button
        type="button"
        className="btn-primary"
        onClick={() => {
          startRide(booking.id);
          setToast("Ride started — timer running");
          router.push(`/ride/${booking.id}`);
        }}
      >
        I&apos;ve collected the key — start timer
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { useAppStore } from "@/lib/store";
import { formatIdr } from "@/lib/format";

export default function HistoryPage() {
  const bookings = useAppStore((s) => s.bookings);
  const vehicles = useAppStore((s) => s.vehicles);

  return (
    <div className="content-pad">
      <Header title="Your trips" />
      {bookings.length === 0 ? (
        <p className="p-8 text-center text-sm" style={{ color: "var(--text2)" }}>
          No trips yet. Book a vehicle from Home.
        </p>
      ) : (
        bookings.map((b) => {
          const v = vehicles.find((x) => x.id === b.vehicleId);
          return (
            <Link
              key={b.id}
              href={b.status === "active" ? `/ride/${b.id}` : `/book/${b.id}/confirmed`}
              className="mx-4 mb-2.5 block rounded-2xl p-4"
              style={{ background: "var(--card)" }}
            >
              <div className="flex justify-between">
                <div className="font-bold">{v?.name ?? "Vehicle"}</div>
                <div className="text-xs font-semibold capitalize" style={{ color: "var(--primary)" }}>
                  {b.status.replace("_", " ")}
                </div>
              </div>
              <div className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
                {b.code} · {b.durationLabel} · {formatIdr(b.rentalPriceIdr)}
              </div>
            </Link>
          );
        })
      )}
      <BottomNav variant="rider" />
    </div>
  );
}

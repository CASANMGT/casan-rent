"use client";

import { useMemo, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";
import { useAppStore } from "@/lib/store";
import { formatIdr } from "@/lib/format";

type Tab = "pending" | "active" | "completed";

export default function OperatorBookingsPage() {
  return (
    <AuthGate role="operator">
      <BookingsInner />
    </AuthGate>
  );
}

function BookingsInner() {
  const user = useAppStore((s) => s.user);
  const bookings = useAppStore((s) => s.bookings);
  const vehicles = useAppStore((s) => s.vehicles);
  const confirmBooking = useAppStore((s) => s.confirmBooking);
  const declineBooking = useAppStore((s) => s.declineBooking);
  const confirmBulk = useAppStore((s) => s.confirmBulk);
  const setToast = useAppStore((s) => s.setToast);

  const [tab, setTab] = useState<Tab>("pending");
  const [bulk, setBulk] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const list = useMemo(() => {
    const mine = bookings.filter((b) => b.operatorId === user.operatorId);
    if (tab === "pending") return mine.filter((b) => b.status === "pending");
    if (tab === "active")
      return mine.filter((b) =>
        ["confirmed", "awaiting_pickup", "active"].includes(b.status),
      );
    return mine.filter((b) =>
      ["completed", "cancelled"].includes(b.status),
    );
  }, [bookings, user.operatorId, tab]);

  return (
    <div className="content-pad">
      <Header
        title="Bookings"
        right={
          <button
            type="button"
            className="text-xs font-bold text-white"
            onClick={() => {
              setBulk((b) => !b);
              setSelected([]);
            }}
          >
            {bulk ? "Done" : "Bulk"}
          </button>
        }
      />

      {bulk ? (
        <div
          className="flex items-center justify-between px-4 py-2.5 text-sm text-white"
          style={{ background: "var(--primary)" }}
        >
          <span>{selected.length} selected</span>
          <button
            type="button"
            className="font-bold"
            onClick={() => {
              confirmBulk(selected);
              setToast(`Confirmed ${selected.length}`);
              setSelected([]);
            }}
          >
            Confirm all
          </button>
        </div>
      ) : null}

      <div
        className="mx-4 mt-3 flex gap-1 rounded-xl p-1"
        style={{ background: "var(--card)" }}
      >
        {(["pending", "active", "completed"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className="flex-1 rounded-lg py-2 text-xs font-semibold capitalize"
            style={{
              background: tab === t ? "var(--primary)" : "transparent",
              color: tab === t ? "white" : "var(--text2)",
            }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="p-8 text-center text-sm" style={{ color: "var(--text2)" }}>
          No bookings in this tab.
        </p>
      ) : (
        list.map((b) => {
          const v = vehicles.find((x) => x.id === b.vehicleId);
          return (
            <div
              key={b.id}
              className="mx-4 mt-3 rounded-xl border-l-4 p-3.5"
              style={{
                background: "var(--card)",
                borderLeftColor:
                  b.status === "pending" ? "var(--warn)" : "var(--primary)",
              }}
            >
              <div className="flex items-start gap-2">
                {bulk && b.status === "pending" ? (
                  <input
                    type="checkbox"
                    checked={selected.includes(b.id)}
                    onChange={(e) =>
                      setSelected((s) =>
                        e.target.checked
                          ? [...s, b.id]
                          : s.filter((x) => x !== b.id),
                      )
                    }
                  />
                ) : null}
                <div className="flex-1">
                  <div className="font-bold text-sm">
                    {b.riderName} · {v?.name}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text2)" }}>
                    {b.code} · {b.durationLabel} · {formatIdr(b.rentalPriceIdr)}
                  </div>
                  <div className="mt-1 text-xs capitalize" style={{ color: "var(--text2)" }}>
                    {b.status.replace("_", " ")} · {b.pickupType.replace("_", " ")}
                  </div>
                  {b.status === "pending" ? (
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        className="rounded-lg px-3 py-2 text-xs font-bold text-white"
                        style={{ background: "var(--ok)" }}
                        onClick={() => {
                          confirmBooking(b.id);
                          setToast("Booking confirmed");
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className="rounded-lg px-3 py-2 text-xs font-bold"
                        style={{ background: "#FADBD8", color: "var(--danger)" }}
                        onClick={() => {
                          declineBooking(b.id);
                          setToast("Booking declined");
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })
      )}
      <BottomNav variant="operator" />
    </div>
  );
}

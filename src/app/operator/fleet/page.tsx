"use client";

import { useMemo, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";
import { useAppStore } from "@/lib/store";
import { vehicleTypeLabel } from "@/lib/format";
import type { VehicleStatus } from "@/lib/types";

export default function FleetPage() {
  return (
    <AuthGate role="operator">
      <FleetInner />
    </AuthGate>
  );
}

function FleetInner() {
  const user = useAppStore((s) => s.user);
  const vehicles = useAppStore((s) => s.vehicles);
  const updateVehicleStatus = useAppStore((s) => s.updateVehicleStatus);
  const setToast = useAppStore((s) => s.setToast);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | VehicleStatus>("all");

  const list = useMemo(() => {
    return vehicles
      .filter((v) => v.operatorId === user.operatorId)
      .filter((v) => filter === "all" || v.status === filter)
      .filter((v) =>
        `${v.name} ${v.code}`.toLowerCase().includes(q.toLowerCase()),
      );
  }, [vehicles, user.operatorId, filter, q]);

  return (
    <div className="content-pad">
      <Header title="Fleet" />
      <div className="flex gap-2 px-4 pb-2">
        <input
          className="flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
          placeholder="Search bikes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-2">
        {(
          [
            "all",
            "available",
            "rented",
            "maintenance",
            "charging",
          ] as const
        ).map((f) => (
          <button
            key={f}
            type="button"
            className="whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold capitalize"
            style={{
              borderColor: filter === f ? "var(--primary)" : "var(--border)",
              background: filter === f ? "var(--primary)" : "var(--card)",
              color: filter === f ? "white" : "var(--text)",
            }}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {list.map((v) => (
        <div key={v.id} className="card">
          <div className="flex justify-between">
            <div>
              <div className="font-bold">
                {v.emoji} {v.name}
              </div>
              <div className="text-xs" style={{ color: "var(--text2)" }}>
                {v.code} · {vehicleTypeLabel(v.vehicleType)}
                {v.batteryPct != null ? ` · ${v.batteryPct}%` : ""}
              </div>
            </div>
            <span className="text-xs font-semibold capitalize">{v.status}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              className="rounded-lg px-3 py-2 text-xs font-bold"
              style={{ background: "var(--bg-deep)" }}
              href={`https://www.google.com/maps?q=${v.lat},${v.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              Locate
            </a>
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-xs font-bold"
              style={{ background: "var(--bg-deep)" }}
              onClick={async () => {
                await fetch("/api/iot", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ command: "locate", vehicleId: v.id }),
                });
                setToast("Mock GPS locate sent");
              }}
            >
              Ping IoT
            </button>
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-xs font-bold"
              style={{ background: "#FEF5E7", color: "var(--warn)" }}
              onClick={() => {
                updateVehicleStatus(v.id, "maintenance");
                setToast("Marked maintenance");
              }}
            >
              Maintain
            </button>
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-xs font-bold"
              style={{ background: "#E8F8F5", color: "var(--ok)" }}
              onClick={() => {
                updateVehicleStatus(v.id, "available");
                setToast("Marked available");
              }}
            >
              Available
            </button>
          </div>
        </div>
      ))}
      <BottomNav variant="operator" />
    </div>
  );
}

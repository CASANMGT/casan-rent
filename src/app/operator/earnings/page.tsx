"use client";

import { useMemo, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { AuthGate } from "@/components/AuthGate";
import { useAppStore } from "@/lib/store";
import { formatIdr } from "@/lib/format";

export default function EarningsPage() {
  return (
    <AuthGate role="operator">
      <EarningsInner />
    </AuthGate>
  );
}

function EarningsInner() {
  const user = useAppStore((s) => s.user);
  const bookings = useAppStore((s) => s.bookings);
  const operators = useAppStore((s) => s.operators);
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");

  const op = operators.find((o) => o.id === user.operatorId);
  const mine = bookings.filter(
    (b) =>
      b.operatorId === user.operatorId &&
      b.paymentStatus !== "pending" &&
      b.status !== "cancelled",
  );

  const gross = mine.reduce((s, b) => s + b.rentalPriceIdr, 0);
  const feePct = op?.platformFeePct ?? 20;
  const net = Math.round(gross * (1 - feePct / 100));

  const bars = useMemo(() => {
    const vals = [0.4, 0.7, 0.55, 0.9, 0.65, 0.8, 0.5];
    return vals.map((h, i) => ({ h, label: ["M", "T", "W", "T", "F", "S", "S"][i] }));
  }, []);

  return (
    <div className="content-pad">
      <div
        className="px-5 py-6 text-center text-white"
        style={{
          background:
            "linear-gradient(135deg, var(--primary), var(--primary-light))",
        }}
      >
        <div className="text-xs uppercase tracking-widest text-white/80">
          This {period}
        </div>
        <div className="font-display mt-2 text-4xl font-semibold">
          {formatIdr(net)}
        </div>
        <div className="mt-1 text-sm text-white/85">
          Net after {feePct}% platform fee · Gross {formatIdr(gross)}
        </div>
      </div>

      <div
        className="mx-4 -mt-3 flex gap-1 rounded-xl p-1"
        style={{ background: "var(--card)" }}
      >
        {(["day", "week", "month"] as const).map((p) => (
          <button
            key={p}
            type="button"
            className="flex-1 rounded-lg py-2 text-xs font-semibold capitalize"
            style={{
              background: period === p ? "var(--primary)" : "transparent",
              color: period === p ? "white" : "var(--text2)",
            }}
            onClick={() => setPeriod(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mx-4 mt-4 flex h-36 items-end gap-2 rounded-2xl p-4" style={{ background: "var(--card)" }}>
        {bars.map((b, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md"
              style={{
                height: `${b.h * 100}%`,
                background: "linear-gradient(180deg, var(--primary-light), var(--primary))",
                minHeight: 12,
              }}
            />
            <span className="text-[10px]" style={{ color: "var(--text2)" }}>
              {b.label}
            </span>
          </div>
        ))}
      </div>

      <p className="section-label">Transactions</p>
      {mine.length === 0 ? (
        <p className="px-6 text-sm" style={{ color: "var(--text2)" }}>
          No paid bookings yet.
        </p>
      ) : (
        mine.map((b) => (
          <div
            key={b.id}
            className="mx-4 mb-2 flex items-center justify-between rounded-xl px-4 py-3"
            style={{ background: "var(--card)" }}
          >
            <div>
              <div className="text-sm font-semibold">{b.riderName}</div>
              <div className="text-xs" style={{ color: "var(--text2)" }}>
                {b.code} · {b.durationLabel}
              </div>
            </div>
            <div className="font-bold text-sm" style={{ color: "var(--ok)" }}>
              +{formatIdr(b.rentalPriceIdr)}
            </div>
          </div>
        ))
      )}
      <BottomNav variant="operator" />
    </div>
  );
}

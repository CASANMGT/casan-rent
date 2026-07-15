"use client";

import { useMemo, useState } from "react";
import { Banknote } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { OpSection } from "@/components/operator/OperatorUi";
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

function startOfPeriod(period: "day" | "week" | "month"): Date {
  const now = new Date();
  if (period === "day") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === "week") {
    const d = new Date(now);
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function EarningsInner() {
  const user = useAppStore((s) => s.user);
  const bookings = useAppStore((s) => s.bookings);
  const operators = useAppStore((s) => s.operators);
  const vehicles = useAppStore((s) => s.vehicles);
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");

  const op = operators.find((o) => o.id === user.operatorId);
  const feePct = op?.platformFeePct ?? 15;
  const cutoff = startOfPeriod(period);

  const mine = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.operatorId === user.operatorId &&
          b.paymentStatus !== "pending" &&
          b.status !== "cancelled" &&
          new Date(b.createdAt) >= cutoff,
      ),
    [bookings, user.operatorId, cutoff],
  );

  const gross = mine.reduce(
    (s, b) => s + b.rentalPriceIdr + (b.addonsPriceIdr ?? 0),
    0,
  );
  const fee = Math.round(gross * (feePct / 100));
  const net = gross - fee;

  const bars = useMemo(() => {
    const labels =
      period === "day"
        ? ["Morning", "Noon", "Evening"]
        : period === "week"
          ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
          : ["Week 1", "Week 2", "Week 3", "Week 4"];
    const buckets = labels.map(() => 0);
    for (const b of mine) {
      const d = new Date(b.createdAt);
      let idx = 0;
      if (period === "day") {
        const h = d.getHours();
        idx = h < 12 ? 0 : h < 17 ? 1 : 2;
      } else if (period === "week") {
        const day = d.getDay();
        idx = day === 0 ? 6 : day - 1;
      } else idx = Math.min(3, Math.floor((d.getDate() - 1) / 7));
      buckets[idx] += b.rentalPriceIdr + (b.addonsPriceIdr ?? 0);
    }
    const max = Math.max(1, ...buckets);
    return labels.map((label, i) => ({
      label,
      h: buckets[i] / max,
      value: buckets[i],
    }));
  }, [mine, period]);

  const periodWord =
    period === "day" ? "today" : period === "week" ? "this week" : "this month";

  return (
    <div className="content-pad">
      <div
        className="px-5 py-6 text-center text-white"
        style={{
          background:
            "linear-gradient(135deg, #0f766e, var(--primary))",
        }}
      >
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-white/85">
          <Banknote size={16} />
          Uang masuk · {periodWord === "today" ? "hari ini" : periodWord === "this week" ? "minggu ini" : "bulan ini"}
        </div>
        <div className="font-display mt-2 text-4xl font-semibold">
          {formatIdr(net)}
        </div>
        <div className="mt-2 space-y-0.5 text-sm text-white/90">
          <div>Pelanggan bayar: {formatIdr(gross)}</div>
          <div>Potongan Casan ({feePct}%): −{formatIdr(fee)}</div>
        </div>
      </div>

      <div
        className="mx-4 -mt-3 flex gap-1 rounded-xl p-1"
        style={{ background: "var(--card)" }}
      >
        {(
          [
            ["day", "Hari"],
            ["week", "Minggu"],
            ["month", "Bulan"],
          ] as const
        ).map(([p, label]) => (
          <button
            key={p}
            type="button"
            className="flex-1 rounded-lg py-2.5 text-xs font-bold"
            style={{
              background: period === p ? "var(--primary)" : "transparent",
              color: period === p ? "white" : "var(--text2)",
            }}
            onClick={() => setPeriod(p)}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className="mx-4 mt-4 flex h-36 items-end gap-2 rounded-2xl p-4"
        style={{ background: "var(--card)" }}
      >
        {bars.map((b, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md"
              style={{
                height: `${Math.max(8, b.h * 100)}%`,
                background:
                  "linear-gradient(180deg, var(--primary-light), var(--primary))",
                minHeight: 8,
                opacity: b.value > 0 ? 1 : 0.25,
              }}
              title={formatIdr(b.value)}
            />
            <span className="text-[11px] font-semibold" style={{ color: "var(--text2)" }}>
              {b.label}
            </span>
          </div>
        ))}
      </div>

      <div className="card mx-4 mt-3 text-xs" style={{ color: "var(--text2)" }}>
        <strong style={{ color: "var(--text)" }}>Artinya:</strong> angka besar =
        uang yang masuk ke kamu setelah potongan Casan. Angka demo dari contoh
        trip.
      </div>

      <OpSection icon={Banknote} title="Siapa bayar" hint="Paid trips list" />
      {mine.length === 0 ? (
        <p className="px-6 text-sm" style={{ color: "var(--text2)" }}>
          Belum ada trip dibayar. Terima pesanan untuk mulai dapat uang.
        </p>
      ) : (
        mine.map((b) => {
          const v = vehicles.find((x) => x.id === b.vehicleId);
          const take = Math.round(
            (b.rentalPriceIdr + (b.addonsPriceIdr ?? 0)) * (1 - feePct / 100),
          );
          return (
            <div
              key={b.id}
              className="mx-4 mb-2 flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: "var(--card)" }}
            >
              <div>
                <div className="text-sm font-semibold">{b.riderName}</div>
                <div className="text-xs" style={{ color: "var(--text2)" }}>
                  {v?.name ?? "Bike"} · {b.durationLabel}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-sm" style={{ color: "var(--ok)" }}>
                  +{formatIdr(take)}
                </div>
                <div className="text-[10px]" style={{ color: "var(--text2)" }}>
                  kamu terima
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

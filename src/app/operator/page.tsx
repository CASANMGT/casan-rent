"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BottomNav } from "@/components/BottomNav";
import { useAppStore } from "@/lib/store";
import { formatIdr } from "@/lib/format";
import { AuthGate } from "@/components/AuthGate";

export default function OperatorDashboardPage() {
  return (
    <AuthGate role="operator">
      <DashboardInner />
    </AuthGate>
  );
}

function DashboardInner() {
  const user = useAppStore((s) => s.user);
  const operators = useAppStore((s) => s.operators);
  const vehicles = useAppStore((s) => s.vehicles);
  const bookings = useAppStore((s) => s.bookings);

  const opId = user.operatorId!;
  const op = operators.find((o) => o.id === opId);
  const fleet = vehicles.filter((v) => v.operatorId === opId);
  const opBookings = bookings.filter((b) => b.operatorId === opId);

  const stats = useMemo(() => {
    const available = fleet.filter((v) => v.status === "available").length;
    const rented = fleet.filter((v) => v.status === "rented").length;
    const pending = opBookings.filter((b) => b.status === "pending").length;
    const revenue = opBookings
      .filter((b) => b.paymentStatus !== "pending")
      .reduce((sum, b) => sum + b.rentalPriceIdr, 0);
    return { available, rented, pending, revenue, total: fleet.length };
  }, [fleet, opBookings]);

  return (
    <div className="content-pad">
      <header
        className="px-5 py-4 text-white"
        style={{
          background:
            "linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)",
        }}
      >
        <div className="text-xs text-white/80">Operator</div>
        <h1 className="font-display text-2xl font-semibold">{op?.name}</h1>
        <p className="text-sm text-white/85">Hi, {user.name}</p>
      </header>

      <div className="mt-3 grid grid-cols-2 gap-2.5 px-4">
        <StatCard value={String(stats.available)} label="Available" />
        <StatCard value={String(stats.rented)} label="On rent" />
        <StatCard value={String(stats.pending)} label="Pending" />
        <StatCard value={formatIdr(stats.revenue)} label="Revenue (demo)" />
      </div>

      <p className="section-label">Quick actions</p>
      <div className="mx-4 grid grid-cols-2 gap-2">
        <Quick href="/operator/bookings" label="Bookings" />
        <Quick href="/operator/fleet" label="Fleet" />
        <Quick href="/operator/pricing" label="Pricing" />
        <Quick href="/operator/staff" label="Staff" />
      </div>

      <p className="section-label">Fleet snapshot</p>
      {fleet.slice(0, 4).map((v) => (
        <div
          key={v.id}
          className="mx-4 mb-2 flex items-center justify-between rounded-xl px-4 py-3"
          style={{ background: "var(--card)" }}
        >
          <div>
            <div className="font-semibold text-sm">
              {v.emoji} {v.name}
            </div>
            <div className="text-xs" style={{ color: "var(--text2)" }}>
              {v.code}
            </div>
          </div>
          <span className="text-xs font-semibold capitalize">{v.status}</span>
        </div>
      ))}

      <BottomNav variant="operator" />
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--card)" }}>
      <div className="text-xl font-bold" style={{ color: "var(--primary)" }}>
        {value}
      </div>
      <div className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
        {label}
      </div>
    </div>
  );
}

function Quick({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl px-4 py-4 text-center text-sm font-bold"
      style={{ background: "var(--card)", color: "var(--primary)" }}
    >
      {label}
    </Link>
  );
}

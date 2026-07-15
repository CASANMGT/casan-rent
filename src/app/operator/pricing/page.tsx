"use client";

import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";
import { useAppStore } from "@/lib/store";
import { formatIdr } from "@/lib/format";

export default function PricingPage() {
  return (
    <AuthGate role="operator">
      <PricingInner />
    </AuthGate>
  );
}

function PricingInner() {
  const user = useAppStore((s) => s.user);
  const pricing = useAppStore((s) => s.pricing);
  const weekendSurcharge = useAppStore((s) => s.weekendSurcharge);
  const updatePricing = useAppStore((s) => s.updatePricing);
  const setWeekendSurcharge = useAppStore((s) => s.setWeekendSurcharge);
  const setToast = useAppStore((s) => s.setToast);

  const opId = user.operatorId!;
  const tiers = pricing[opId] ?? [];

  return (
    <div className="content-pad">
      <Header title="Pricing rules" backHref="/operator/profile" />
      <p className="section-label">Duration tiers</p>
      <div className="card space-y-2">
        {tiers.map((t, i) => (
          <div key={t.label} className="flex items-center justify-between gap-3">
            <span className="text-sm">{t.label}</span>
            <input
              className="w-32 rounded-lg border px-3 py-2 text-right text-sm outline-none"
              style={{ borderColor: "var(--border)", background: "var(--bg)" }}
              value={t.priceIdr}
              onChange={(e) => {
                const next = tiers.map((x, idx) =>
                  idx === i
                    ? { ...x, priceIdr: Number(e.target.value) || 0 }
                    : x,
                );
                updatePricing(opId, next);
              }}
            />
          </div>
        ))}
      </div>

      <p className="section-label">Dynamic pricing</p>
      <div className="card flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Weekend surcharge +15%</div>
          <div className="text-xs" style={{ color: "var(--text2)" }}>
            Saturdays &amp; Sundays
          </div>
        </div>
        <button
          type="button"
          className="relative h-6 w-11 rounded-full"
          style={{
            background: weekendSurcharge[opId] ? "var(--primary)" : "var(--border)",
          }}
          onClick={() => setWeekendSurcharge(opId, !weekendSurcharge[opId])}
        >
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white"
            style={{ left: weekendSurcharge[opId] ? 22 : 2 }}
          />
        </button>
      </div>

      <button
        type="button"
        className="btn-primary"
        onClick={() => setToast(`Saved · sample 1hr ${formatIdr(tiers[1]?.priceIdr ?? 0)}`)}
      >
        Save pricing rules
      </button>
      <BottomNav variant="operator" />
    </div>
  );
}

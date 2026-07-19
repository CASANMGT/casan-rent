"use client";

import { CalendarDays, Tag } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";
import { OpSection } from "@/components/operator/OperatorUi";
import { useAppStore } from "@/lib/store";
import { formatIdr } from "@/lib/format";
import { canStaff, getCurrentStaff } from "@/lib/permissions";

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
  const staff = useAppStore((s) => s.staff);
  const currentStaff = getCurrentStaff(user, staff);
  const canManagePricing = canStaff(currentStaff, "pricing.manage");

  const opId = user.operatorId!;
  const tiers = pricing[opId] ?? [];

  return (
    <div className="content-pad">
      <Header title="Atur harga · Prices" backHref="/operator" />
      <p className="px-4 pt-2 text-xs" style={{ color: "var(--text2)" }}>
        {canManagePricing
          ? "Isi harga sewa dalam Rupiah (Rp). Contoh: 50000 = Rp 50.000"
          : "Mode lihat saja · hanya admin yang dapat mengubah harga."}
      </p>

      <OpSection
        icon={Tag}
        title="Harga per durasi"
        hint="Price for each rental length"
      />
      {tiers.length === 0 ? (
        <p className="px-6 text-sm" style={{ color: "var(--text2)" }}>
          Belum ada harga. Hubungi Casan untuk setup awal.
        </p>
      ) : (
        <div className="op-card space-y-2">
          {tiers.map((t, i) => (
            <div key={t.label} className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{t.label}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs" style={{ color: "var(--text2)" }}>
                  Rp
                </span>
                <input
                  className="w-28 rounded-lg border px-3 py-2 text-right text-sm outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                  inputMode="numeric"
                  disabled={!canManagePricing}
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
            </div>
          ))}
        </div>
      )}

      <OpSection
        icon={CalendarDays}
        title="Harga akhir pekan"
        hint="Weekend price — Saturday & Sunday"
      />
      <div className="op-card flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Tambah +15% Sabtu–Minggu</div>
          <div className="text-xs" style={{ color: "var(--text2)" }}>
            Applied on rider booking when pickup is Saturday or Sunday
          </div>
        </div>
        <button
          type="button"
          className="relative h-6 w-11 rounded-full"
          style={{
            background: weekendSurcharge[opId] ? "var(--primary)" : "var(--border)",
          }}
          onClick={() => setWeekendSurcharge(opId, !weekendSurcharge[opId])}
          disabled={!canManagePricing}
        >
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
            style={{ left: weekendSurcharge[opId] ? 22 : 2 }}
          />
        </button>
      </div>

      {canManagePricing ? (
      <button
        type="button"
        className="btn-primary"
        onClick={() =>
          setToast(
            `Harga disimpan ✓ · contoh 1 jam ${formatIdr(tiers[1]?.priceIdr ?? 0)}`,
          )
        }
      >
        Simpan harga
      </button>
      ) : null}
      <BottomNav variant="operator" />
    </div>
  );
}

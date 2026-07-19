"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Download,
  MapPin,
  PiggyBank,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { AreaBadge, OpSection } from "@/components/operator/OperatorUi";
import { LocationSwitcher } from "@/components/operator/FleetModelStock";
import { AuthGate } from "@/components/AuthGate";
import { useAppStore } from "@/lib/store";
import {
  formatIdr,
  formatIdrShort,
  paymentMethodLabel,
} from "@/lib/format";
import type { Booking } from "@/lib/types";
import { canAccessSite, getCurrentStaff } from "@/lib/permissions";

export default function EarningsPage() {
  return (
    <AuthGate role="operator">
      <EarningsInner />
    </AuthGate>
  );
}

type Period = "day" | "week" | "month";

function startOfPeriod(period: Period): Date {
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

function prevPeriodRange(period: Period): { start: Date; end: Date } {
  const end = startOfPeriod(period);
  const start = new Date(end);
  if (period === "day") start.setDate(start.getDate() - 1);
  else if (period === "week") start.setDate(start.getDate() - 7);
  else start.setMonth(start.getMonth() - 1);
  return { start, end };
}

/** Money that counts as operator revenue (not deposit). */
function bookingGross(b: Booking): number {
  const ext = (b.extensions ?? []).reduce((s, e) => s + e.priceIdr, 0);
  return b.rentalPriceIdr + (b.addonsPriceIdr ?? 0) + ext;
}

function isPaidTrip(b: Booking): boolean {
  return (
    b.paymentStatus !== "pending" &&
    b.status !== "cancelled" &&
    bookingGross(b) > 0
  );
}

function EarningsInner() {
  const user = useAppStore((s) => s.user);
  const bookings = useAppStore((s) => s.bookings);
  const operators = useAppStore((s) => s.operators);
  const vehicles = useAppStore((s) => s.vehicles);
  const sites = useAppStore((s) => s.sites);
  const operatorActiveSiteId = useAppStore((s) => s.operatorActiveSiteId);
  const setOperatorActiveSiteId = useAppStore((s) => s.setOperatorActiveSiteId);
  const staff = useAppStore((s) => s.staff);
  const currentStaff = getCurrentStaff(user, staff);
  const [period, setPeriod] = useState<Period>("week");
  const [openId, setOpenId] = useState<string | null>(null);

  const op = operators.find((o) => o.id === user.operatorId);
  const feePct = op?.platformFeePct ?? 15;
  const cutoff = startOfPeriod(period);
  const prev = prevPeriodRange(period);

  const opSites = useMemo(
    () =>
      sites.filter(
        (site) =>
          site.operatorId === user.operatorId &&
          canAccessSite(currentStaff, site.id),
      ),
    [sites, user.operatorId, currentStaff],
  );

  const opBookings = useMemo(() => {
    const all = bookings.filter(
      (booking) =>
        booking.operatorId === user.operatorId &&
        canAccessSite(currentStaff, booking.siteId),
    );
    if (!operatorActiveSiteId) return all;
    return all.filter((b) => b.siteId === operatorActiveSiteId);
  }, [bookings, user.operatorId, operatorActiveSiteId, currentStaff]);

  const mine = useMemo(
    () =>
      opBookings
        .filter((b) => isPaidTrip(b) && new Date(b.createdAt) >= cutoff)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [opBookings, cutoff],
  );

  const previous = useMemo(
    () =>
      opBookings.filter((b) => {
        if (!isPaidTrip(b)) return false;
        const t = new Date(b.createdAt).getTime();
        return t >= prev.start.getTime() && t < prev.end.getTime();
      }),
    [opBookings, prev],
  );

  const awaitingCash = useMemo(
    () =>
      opBookings.filter(
        (b) =>
          b.paymentMethod === "pay_at_operator" &&
          b.paymentStatus === "pending" &&
          b.status !== "cancelled" &&
          b.status !== "pending",
      ),
    [opBookings],
  );

  const stats = useMemo(() => {
    let rental = 0;
    let addons = 0;
    let extensions = 0;
    const byMethod: Record<string, number> = {};
    const bySite: Record<string, { gross: number; trips: number }> = {};

    for (const b of mine) {
      rental += b.rentalPriceIdr;
      addons += b.addonsPriceIdr ?? 0;
      extensions += (b.extensions ?? []).reduce((s, e) => s + e.priceIdr, 0);
      const method = b.paymentMethod;
      byMethod[method] = (byMethod[method] ?? 0) + bookingGross(b);
      const siteId = b.siteId || "unknown";
      if (!bySite[siteId]) bySite[siteId] = { gross: 0, trips: 0 };
      bySite[siteId].gross += bookingGross(b);
      bySite[siteId].trips += 1;
    }

    const gross = rental + addons + extensions;
    const fee = Math.round(gross * (feePct / 100));
    const net = gross - fee;
    const prevGross = previous.reduce((s, b) => s + bookingGross(b), 0);
    const prevNet = Math.round(prevGross * (1 - feePct / 100));
    const deltaPct =
      prevNet > 0 ? Math.round(((net - prevNet) / prevNet) * 100) : null;
    const avgNet = mine.length ? Math.round(net / mine.length) : 0;

    return {
      rental,
      addons,
      extensions,
      gross,
      fee,
      net,
      prevNet,
      deltaPct,
      avgNet,
      byMethod,
      bySite,
      trips: mine.length,
    };
  }, [mine, previous, feePct]);

  const bars = useMemo(() => {
    const labels =
      period === "day"
        ? ["Pagi", "Siang", "Sore"]
        : period === "week"
          ? ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
          : ["Mgg 1", "Mgg 2", "Mgg 3", "Mgg 4"];
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
      buckets[idx] += bookingGross(b);
    }
    const max = Math.max(1, ...buckets);
    return labels.map((label, i) => ({
      label,
      h: buckets[i] / max,
      value: buckets[i],
      net: Math.round(buckets[i] * (1 - feePct / 100)),
    }));
  }, [mine, period, feePct]);

  const bestBar = useMemo(
    () =>
      bars.reduce(
        (best, row) => (row.value > best.value ? row : best),
        { label: "—", value: 0, h: 0, net: 0 },
      ),
    [bars],
  );

  const periodId =
    period === "day" ? "hari ini" : period === "week" ? "minggu ini" : "bulan ini";
  const periodPrev =
    period === "day"
      ? "kemarin"
      : period === "week"
        ? "minggu lalu"
        : "bulan lalu";

  const siteRows = Object.entries(stats.bySite)
    .map(([siteId, row]) => {
      const site = sites.find((s) => s.id === siteId);
      return {
        siteId,
        name: site?.name ?? "Lokasi lain",
        area: site?.area,
        ...row,
        net: Math.round(row.gross * (1 - feePct / 100)),
      };
    })
    .sort((a, b) => b.net - a.net);

  const methodRows = Object.entries(stats.byMethod)
    .map(([method, gross]) => ({
      method,
      gross,
      net: Math.round(gross * (1 - feePct / 100)),
    }))
    .sort((a, b) => b.net - a.net);

  const awaitingTotal = awaitingCash.reduce((s, b) => s + bookingGross(b), 0);

  function exportCsv() {
    const header = [
      "code",
      "createdAt",
      "rider",
      "site",
      "status",
      "paymentMethod",
      "rentalIdr",
      "addonsIdr",
      "extensionsIdr",
      "grossIdr",
      "feeIdr",
      "netIdr",
    ];
    const rows = mine.map((b) => {
      const site = sites.find((s) => s.id === b.siteId);
      const gross = bookingGross(b);
      const fee = Math.round(gross * (feePct / 100));
      const ext = (b.extensions ?? []).reduce((s, e) => s + e.priceIdr, 0);
      return [
        b.code,
        b.createdAt,
        b.riderName,
        site?.name ?? "",
        b.status,
        b.paymentMethod,
        String(b.rentalPriceIdr),
        String(b.addonsPriceIdr ?? 0),
        String(ext),
        String(gross),
        String(fee),
        String(gross - fee),
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `casan-earnings-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="content-pad pb-4">
      <div
        className="px-5 py-6 text-white"
        style={{
          background: "linear-gradient(135deg, #0f766e, var(--primary))",
        }}
      >
        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-white/85">
          <span className="inline-flex items-center gap-2">
            <PiggyBank size={16} />
            Uang kamu · {periodId}
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ background: "rgba(255,255,255,0.2)" }}
            onClick={exportCsv}
            disabled={mine.length === 0}
          >
            <Download size={12} />
            CSV
          </button>
        </div>
        <div className="font-display mt-2 text-4xl font-semibold tracking-tight">
          {formatIdr(stats.net)}
        </div>
        <p className="mt-1 text-sm text-white/90">
          Setelah potongan Casan {feePct}% — ini yang masuk ke toko
        </p>
        {stats.deltaPct != null ? (
          <div
            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
            style={{
              background: "rgba(255,255,255,0.18)",
              color: "white",
            }}
          >
            <TrendingUp size={14} />
            {stats.deltaPct >= 0 ? "+" : ""}
            {stats.deltaPct}% vs {periodPrev}
            <span className="font-normal opacity-80">
              ({formatIdrShort(stats.prevNet)})
            </span>
          </div>
        ) : (
          <div className="mt-3 text-xs text-white/75">
            Belum ada data {periodPrev} untuk dibandingkan
          </div>
        )}
      </div>

      {opSites.length > 1 ? (
        <div className="mt-3">
          <p
            className="mb-1 px-4 text-[11px] font-bold uppercase tracking-wide"
            style={{ color: "var(--text2)" }}
          >
            Lokasi
          </p>
          <LocationSwitcher
            locations={opSites.map((s) => ({
              id: s.id,
              name: s.name.replace(/\s+(Lobby|Hub|Corner|Desk|Counter)$/i, ""),
              total: vehicles.filter(
                (v) => v.operatorId === user.operatorId && v.siteId === s.id,
              ).length,
            }))}
            value={operatorActiveSiteId ?? "all"}
            onChange={(id) =>
              setOperatorActiveSiteId(id === "all" ? null : id)
            }
            unassignedCount={0}
            showUnassigned={false}
            showAll
          />
        </div>
      ) : null}

      <div
        className={`mx-4 flex gap-1 rounded-xl p-1 shadow-sm ${
          opSites.length > 1 ? "mt-3" : "-mt-3"
        }`}
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

      <div className="mx-4 mt-4 grid grid-cols-3 gap-2">
        <StatTile
          label="Trip dibayar"
          value={String(stats.trips)}
          sub="pesanan"
        />
        <StatTile
          label="Rata-rata"
          value={formatIdrShort(stats.avgNet)}
          sub="per trip"
        />
        <StatTile
          label="Terbaik"
          value={bestBar.label}
          sub={
            bestBar.value > 0 ? formatIdrShort(bestBar.value) : "belum ada"
          }
        />
      </div>

      <div
        className="mx-4 mt-3 rounded-2xl border p-4"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Receipt size={16} style={{ color: "var(--primary)" }} />
          Rincian uang
        </div>
        <MoneyRow label="Sewa sepeda" value={stats.rental} />
        <MoneyRow label="Add-on (charger / voucher)" value={stats.addons} />
        <MoneyRow label="Perpanjang waktu" value={stats.extensions} />
        <div
          className="my-2 border-t border-dashed"
          style={{ borderColor: "var(--border)" }}
        />
        <MoneyRow label="Pelanggan bayar (kotor)" value={stats.gross} bold />
        <MoneyRow
          label={`Potongan Casan ${feePct}%`}
          value={-stats.fee}
          tone="var(--danger)"
        />
        <MoneyRow
          label="Masuk ke kamu (bersih)"
          value={stats.net}
          bold
          tone="var(--ok)"
        />
        <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--text2)" }}>
          Deposit jaminan tidak dihitung di sini — biasanya dikembalikan ke
          pelanggan setelah sepeda kembali.
        </p>
      </div>

      {awaitingCash.length > 0 ? (
        <div
          className="mx-4 mt-3 flex gap-3 rounded-2xl border px-4 py-3"
          style={{ background: "var(--warning-soft)", borderColor: "var(--warn)" }}
        >
          <CircleAlert size={20} className="mt-0.5 shrink-0" style={{ color: "var(--text-warn)" }} />
          <div>
            <div className="text-sm font-bold" style={{ color: "var(--text-warn)" }}>
              {awaitingCash.length} bayar di toko belum dikonfirmasi
            </div>
            <div className="text-xs" style={{ color: "var(--text2)" }}>
              Total {formatIdr(awaitingTotal)} — konfirmasi di Pesanan supaya
              masuk laporan
            </div>
          </div>
        </div>
      ) : null}

      <OpSection
        icon={TrendingUp}
        title="Grafik penjualan"
        hint="Kotor per waktu · tinggi = lebih banyak bayar"
      />
      <div
        className="mx-4 flex h-44 items-end gap-2 rounded-2xl p-4"
        style={{ background: "var(--card)" }}
      >
        {bars.map((b) => (
          <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="text-[9px] font-bold tabular-nums"
              style={{ color: b.value > 0 ? "var(--primary)" : "var(--text2)" }}
            >
              {b.value > 0 ? formatIdrShort(b.net) : "—"}
            </div>
            <div
              className="w-full rounded-t-md"
              style={{
                height: `${Math.max(8, b.h * 100)}%`,
                background:
                  "linear-gradient(180deg, var(--primary-light), var(--primary))",
                minHeight: 8,
                opacity: b.value > 0 ? 1 : 0.22,
              }}
              title={`${b.label}: kotor ${formatIdr(b.value)} · bersih ${formatIdr(b.net)}`}
            />
            <span
              className="text-[10px] font-semibold"
              style={{ color: "var(--text2)" }}
            >
              {b.label}
            </span>
          </div>
        ))}
      </div>

      {siteRows.length > 0 ? (
        <>
          <OpSection
            icon={MapPin}
            title="Per lokasi"
            hint="Mana yang paling menghasilkan"
          />
          <div className="mx-4 space-y-2">
            {siteRows.map((row) => {
              const share =
                stats.gross > 0
                  ? Math.round((row.gross / stats.gross) * 100)
                  : 0;
              return (
                <div
                  key={row.siteId}
                  className="rounded-xl px-3.5 py-3"
                  style={{ background: "var(--card)" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {row.area ? <AreaBadge area={row.area} /> : null}
                        <span className="text-sm font-bold">{row.name}</span>
                      </div>
                      <div
                        className="mt-0.5 text-[11px]"
                        style={{ color: "var(--text2)" }}
                      >
                        {row.trips} trip · {share}% penjualan
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-sm font-bold"
                        style={{ color: "var(--ok)" }}
                      >
                        {formatIdr(row.net)}
                      </div>
                      <div
                        className="text-[10px]"
                        style={{ color: "var(--text2)" }}
                      >
                        bersih
                      </div>
                    </div>
                  </div>
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full"
                    style={{ background: "var(--bg-deep)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${share}%`,
                        background: "var(--primary)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {methodRows.length > 0 ? (
        <>
          <OpSection
            icon={Wallet}
            title="Cara bayar"
            hint="Digital vs cash di toko"
          />
          <div className="mx-4 grid grid-cols-2 gap-2">
            {methodRows.map((row) => (
              <div
                key={row.method}
                className="rounded-xl px-3 py-3"
                style={{ background: "var(--card)" }}
              >
                <div
                  className="text-[11px] font-semibold"
                  style={{ color: "var(--text2)" }}
                >
                  {paymentMethodLabel(row.method)}
                </div>
                <div
                  className="mt-1 text-base font-bold"
                  style={{ color: "var(--ok)" }}
                >
                  {formatIdrShort(row.net)}
                </div>
                <div className="text-[10px]" style={{ color: "var(--text2)" }}>
                  kotor {formatIdrShort(row.gross)}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <OpSection
        icon={Banknote}
        title="Detail trip"
        hint="Tap untuk lihat potongan & cara bayar"
      />
      {mine.length === 0 ? (
        <p
          className="mx-4 rounded-2xl px-4 py-8 text-center text-sm"
          style={{ background: "var(--card)", color: "var(--text2)" }}
        >
          Belum ada trip dibayar {periodId}. Terima pesanan dan pastikan
          pembayaran selesai.
        </p>
      ) : (
        mine.map((b) => {
          const v = vehicles.find((x) => x.id === b.vehicleId);
          const site = sites.find((s) => s.id === b.siteId);
          const gross = bookingGross(b);
          const fee = Math.round(gross * (feePct / 100));
          const take = gross - fee;
          const open = openId === b.id;
          const extTotal = (b.extensions ?? []).reduce(
            (s, e) => s + e.priceIdr,
            0,
          );
          return (
            <div
              key={b.id}
              className="mx-4 mb-2 overflow-hidden rounded-2xl"
              style={{ background: "var(--card)" }}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                onClick={() => setOpenId(open ? null : b.id)}
                aria-expanded={open}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{b.riderName}</div>
                  <div className="text-xs" style={{ color: "var(--text2)" }}>
                    {v?.name ?? "Sepeda"} · {b.durationLabel}
                    {site ? ` · ${site.area}` : ""}
                  </div>
                  <div
                    className="mt-0.5 text-[10px]"
                    style={{ color: "var(--text2)" }}
                  >
                    {new Date(b.createdAt).toLocaleString("id-ID", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {paymentMethodLabel(b.paymentMethod)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="text-right">
                    <div
                      className="font-bold text-sm"
                      style={{ color: "var(--ok)" }}
                    >
                      +{formatIdr(take)}
                    </div>
                    <div
                      className="text-[10px]"
                      style={{ color: "var(--text2)" }}
                    >
                      bersih
                    </div>
                  </div>
                  {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>
              {open ? (
                <div
                  className="space-y-1 border-t px-4 py-3 text-xs"
                  style={{ borderColor: "var(--border)", color: "var(--text2)" }}
                >
                  <DetailLine label="Kode" value={b.code} />
                  <DetailLine
                    label="Sewa"
                    value={formatIdr(b.rentalPriceIdr)}
                  />
                  {(b.addonsPriceIdr ?? 0) > 0 ? (
                    <DetailLine
                      label="Add-on"
                      value={formatIdr(b.addonsPriceIdr ?? 0)}
                    />
                  ) : null}
                  {extTotal > 0 ? (
                    <DetailLine
                      label="Extend"
                      value={formatIdr(extTotal)}
                    />
                  ) : null}
                  <DetailLine label="Kotor" value={formatIdr(gross)} />
                  <DetailLine
                    label={`Fee Casan ${feePct}%`}
                    value={`−${formatIdr(fee)}`}
                  />
                  <DetailLine
                    label="Bersih ke toko"
                    value={formatIdr(take)}
                    strong
                  />
                  <DetailLine
                    label="Bayar"
                    value={`${paymentMethodLabel(b.paymentMethod)} · ${b.paymentStatus === "paid" ? "lunas" : b.paymentStatus}`}
                  />
                  {site ? (
                    <DetailLine
                      label="Lokasi"
                      value={`${site.name} · ${site.area}`}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })
      )}

      <BottomNav variant="operator" />
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div
      className="rounded-xl px-2.5 py-3 text-center"
      style={{ background: "var(--card)" }}
    >
      <div className="text-[10px] font-semibold" style={{ color: "var(--text2)" }}>
        {label}
      </div>
      <div className="mt-1 text-sm font-bold tabular-nums">{value}</div>
      <div className="text-[10px]" style={{ color: "var(--text2)" }}>
        {sub}
      </div>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: number;
  bold?: boolean;
  tone?: string;
}) {
  const negative = value < 0;
  return (
    <div
      className={`flex items-center justify-between gap-3 py-1.5 text-sm ${bold ? "font-bold" : ""}`}
    >
      <span style={{ color: bold ? "var(--text)" : "var(--text2)" }}>{label}</span>
      <span
        className="tabular-nums"
        style={{
          color: tone ?? (negative ? "var(--danger)" : "var(--text)"),
        }}
      >
        {negative ? `−${formatIdr(Math.abs(value))}` : formatIdr(value)}
      </span>
    </div>
  );
}

function DetailLine({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span>{label}</span>
      <span
        className={strong ? "font-bold" : "font-semibold"}
        style={{ color: strong ? "var(--ok)" : "var(--text)" }}
      >
        {value}
      </span>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Banknote,
  BellRing,
  Bike,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock,
  KeyRound,
  MapPin,
  Tag,
  Wallet,
  Wrench,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import {
  CityBadge,
  OpSection,
  OpStat,
} from "@/components/operator/OperatorUi";
import { useAppStore } from "@/lib/store";
import { IS_DEMO } from "@/lib/demo";
import {
  formatIdr,
  formatIdrShort,
  formatReturnBy,
  returnDueSummary,
} from "@/lib/format";
import { OP, uniqueAreas } from "@/lib/operator-ui";
import { AuthGate } from "@/components/AuthGate";
import { APP_VERSION, hasUnseenUpdates } from "@/lib/version";
import { LocationSwitcher } from "@/components/operator/FleetModelStock";

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
  const sites = useAppStore((s) => s.sites);
  const vehicles = useAppStore((s) => s.vehicles);
  const bookings = useAppStore((s) => s.bookings);
  const lastSeenVersion = useAppStore((s) => s.lastSeenVersion);
  const operatorActiveSiteId = useAppStore((s) => s.operatorActiveSiteId);
  const setOperatorActiveSiteId = useAppStore((s) => s.setOperatorActiveSiteId);
  const confirmBooking = useAppStore((s) => s.confirmBooking);
  const declineBooking = useAppStore((s) => s.declineBooking);
  const simulateRiderRequest = useAppStore((s) => s.simulateRiderRequest);
  const setToast = useAppStore((s) => s.setToast);

  const opId = user.operatorId!;
  const op = operators.find((o) => o.id === opId);
  const feePct = op?.platformFeePct ?? 15;
  const fleetAll = vehicles.filter((v) => v.operatorId === opId);
  const opSites = sites.filter((s) => s.operatorId === opId);
  const opBookingsAll = bookings.filter((b) => b.operatorId === opId);
  const unseen = hasUnseenUpdates(lastSeenVersion);
  const areas = uniqueAreas(opSites);

  const fleet = useMemo(
    () =>
      operatorActiveSiteId
        ? fleetAll.filter((v) => v.siteId === operatorActiveSiteId)
        : fleetAll,
    [fleetAll, operatorActiveSiteId],
  );
  const opBookings = useMemo(
    () =>
      operatorActiveSiteId
        ? opBookingsAll.filter((b) => b.siteId === operatorActiveSiteId)
        : opBookingsAll,
    [opBookingsAll, operatorActiveSiteId],
  );

  const pending = opBookings.filter((b) => b.status === "pending");
  const overdue = opBookings.filter((b) => b.status === "overdue");
  const onRent = opBookings.filter(
    (b) => b.status === "active" || b.status === "overdue",
  );
  const waitingPickup = opBookings.filter((b) =>
    ["confirmed", "awaiting_pickup"].includes(b.status),
  );
  const awaitingCash = opBookings.filter(
    (b) =>
      b.paymentMethod === "pay_at_operator" &&
      b.paymentStatus === "pending" &&
      !["pending", "cancelled"].includes(b.status),
  );

  const stats = useMemo(() => {
    const free = fleet.filter((v) => v.status === "available").length;
    const rented = onRent.length;
    const broken = fleet.filter(
      (v) => v.status === "maintenance" || v.status === "disabled",
    ).length;
    const keysOut = opBookings.filter(
      (b) =>
        (b.keysAccess === "physical" || b.keysAccess === "both") &&
        b.physicalKeyGiven &&
        !b.physicalKeyReturned &&
        ["confirmed", "awaiting_pickup", "active", "overdue"].includes(b.status),
    ).length;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const paidToday = opBookings.filter(
      (b) =>
        (b.paymentStatus === "paid" || b.paymentStatus === "refunded") &&
        b.status !== "cancelled" &&
        new Date(b.createdAt) >= todayStart,
    );
    const grossToday = paidToday.reduce(
      (s, b) =>
        s +
        b.rentalPriceIdr +
        (b.addonsPriceIdr ?? 0) +
        (b.extensions ?? []).reduce((x, e) => x + e.priceIdr, 0),
      0,
    );
    const weekStart = new Date();
    const day = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - (day === 0 ? 6 : day - 1));
    weekStart.setHours(0, 0, 0, 0);
    const paidWeek = opBookings.filter(
      (b) =>
        (b.paymentStatus === "paid" || b.paymentStatus === "refunded") &&
        b.status !== "cancelled" &&
        new Date(b.createdAt) >= weekStart,
    );
    const grossWeek = paidWeek.reduce(
      (s, b) =>
        s +
        b.rentalPriceIdr +
        (b.addonsPriceIdr ?? 0) +
        (b.extensions ?? []).reduce((x, e) => x + e.priceIdr, 0),
      0,
    );
    return {
      free,
      rented,
      broken,
      keysOut,
      keepToday: Math.round(grossToday * (1 - feePct / 100)),
      keepWeek: Math.round(grossWeek * (1 - feePct / 100)),
      tripsToday: paidToday.length,
    };
  }, [fleet, opBookings, feePct, onRent.length]);

  const attentionCount =
    pending.length + overdue.length + awaitingCash.length + stats.keysOut;

  const topSites = opSites.slice(0, 3).map((s) => {
    const units = fleet.filter((v) => v.siteId === s.id);
    return {
      site: s,
      free: units.filter((v) => v.status === "available").length,
      out: onRent.filter((b) => b.siteId === s.id).length,
      total: units.length,
    };
  });

  return (
    <div className="content-pad pb-4">
      <header
        className="px-5 py-4 text-white"
        style={{
          background:
            "linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-white/85">Halo, {user.name}</p>
            <h1 className="font-display mt-0.5 text-2xl font-semibold leading-tight">
              {op?.name ?? "Operator"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-white/90">
              <MapPin size={12} />
              {opSites.length} lokasi
              {areas.length > 1 ? ` · ${areas.length} area` : ""}
              {attentionCount > 0 ? (
                <span className="rounded-full bg-white/20 px-2 py-0.5 font-bold">
                  {attentionCount} perlu tindakan
                </span>
              ) : (
                <span className="rounded-full bg-white/15 px-2 py-0.5">
                  Semua tenang
                </span>
              )}
            </div>
          </div>
          <Link
            href="/updates"
            className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold"
          >
            v{APP_VERSION}
            {unseen ? " · Baru" : ""}
          </Link>
        </div>
      </header>

      {opSites.length > 1 ? (
        <div className="mt-2">
          <p
            className="mb-1 px-4 text-[11px] font-bold uppercase tracking-wide"
            style={{ color: "var(--text2)" }}
          >
            Lokasi aktif
          </p>
          <LocationSwitcher
            locations={opSites.map((s) => ({
              id: s.id,
              name: s.name.replace(/\s+(Lobby|Hub|Corner|Desk|Counter)$/i, ""),
              total: fleetAll.filter((v) => v.siteId === s.id).length,
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

      {/* Today at a glance */}
      <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
        <Link
          href="/operator/earnings"
          className="rounded-2xl p-3 text-white"
          style={{
            background: "linear-gradient(135deg, #0f766e, var(--primary))",
          }}
        >
          <Wallet size={16} className="opacity-90" />
          <div className="mt-2 text-[10px] font-semibold text-white/85">
            Uang hari ini
          </div>
          <div className="font-display text-base font-bold leading-tight">
            {formatIdrShort(stats.keepToday)}
          </div>
          <div className="text-[10px] text-white/75">
            {stats.tripsToday} trip
          </div>
        </Link>
        <Link
          href="/operator/bookings"
          className="rounded-2xl border p-3"
          style={{
            background: pending.length ? "#FEF5E7" : "var(--card)",
            borderColor: pending.length ? "var(--warn)" : "var(--border)",
          }}
        >
          <BellRing
            size={16}
            style={{ color: pending.length ? "#9A5B00" : "var(--primary)" }}
          />
          <div
            className="mt-2 text-[10px] font-semibold"
            style={{ color: "var(--text2)" }}
          >
            Permintaan
          </div>
          <div className="text-xl font-bold tabular-nums">{pending.length}</div>
          <div className="text-[10px]" style={{ color: "var(--text2)" }}>
            baru
          </div>
        </Link>
        <Link
          href="/operator/fleet"
          className="rounded-2xl border p-3"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <Bike size={16} style={{ color: "var(--ok)" }} />
          <div
            className="mt-2 text-[10px] font-semibold"
            style={{ color: "var(--text2)" }}
          >
            Siap sewa
          </div>
          <div
            className="text-xl font-bold tabular-nums"
            style={{ color: "var(--ok)" }}
          >
            {stats.free}
          </div>
          <div className="text-[10px]" style={{ color: "var(--text2)" }}>
            dari {fleet.length}
          </div>
        </Link>
      </div>

      {(overdue.length > 0 || awaitingCash.length > 0 || stats.keysOut > 0) && (
        <div className="mx-4 mt-3 space-y-2">
          {overdue.length > 0 ? (
            <Link
              href="/operator/bookings"
              className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
              style={{ background: "#FADBD8", borderColor: "var(--danger)" }}
            >
              <CircleAlert size={18} style={{ color: "var(--danger)" }} />
              <div className="flex-1 text-sm font-bold" style={{ color: "var(--danger)" }}>
                {overdue.length} terlambat kembali
              </div>
              <span className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
                Buka →
              </span>
            </Link>
          ) : null}
          {awaitingCash.length > 0 ? (
            <Link
              href="/operator/bookings"
              className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
              style={{ background: "#FEF5E7", borderColor: "var(--warn)" }}
            >
              <Banknote size={18} style={{ color: "#9A5B00" }} />
              <div className="flex-1 text-sm font-bold" style={{ color: "#9A5B00" }}>
                {awaitingCash.length} bayar di toko belum dikonfirmasi
              </div>
            </Link>
          ) : null}
          {stats.keysOut > 0 ? (
            <Link
              href="/operator/bookings"
              className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
              style={{ background: "#FEF5E7", borderColor: "var(--warn)" }}
            >
              <KeyRound size={18} style={{ color: "#9A5B00" }} />
              <div className="flex-1 text-sm font-bold" style={{ color: "#9A5B00" }}>
                {stats.keysOut} kunci masih di pelanggan
              </div>
            </Link>
          ) : null}
        </div>
      )}

      <OpSection
        icon={BellRing}
        title={
          pending.length > 0
            ? `Perlu diterima (${pending.length})`
            : "Permintaan baru"
        }
        hint="Terima atau tolak sekarang"
        action={
          <Link
            href="/operator/bookings"
            className="text-xs font-bold"
            style={{ color: "var(--primary)" }}
          >
            Semua
          </Link>
        }
      />

      {pending.length === 0 ? (
        <div className="op-card text-sm" style={{ color: "var(--text2)" }}>
          Tidak ada permintaan baru — cek kunci & sepeda di bawah.
          {IS_DEMO ? (
            <button
              type="button"
              className="mt-3 w-full rounded-xl py-3 text-sm font-bold text-white"
              style={{ background: "var(--primary)" }}
              onClick={() => {
                simulateRiderRequest();
                setToast("Contoh pesanan siap — terima atau tolak");
              }}
            >
              Demo: pelanggan mau sewa
            </button>
          ) : null}
        </div>
      ) : (
        pending.slice(0, 3).map((b) => {
          const v = vehicles.find((x) => x.id === b.vehicleId);
          const site = sites.find((s) => s.id === b.siteId);
          return (
            <div
              key={b.id}
              className="mx-4 mb-3 rounded-2xl border-2 p-4"
              style={{ borderColor: "var(--warn)", background: "#FEF5E7" }}
            >
              <div
                className="flex items-center gap-2 text-xs font-bold"
                style={{ color: "#9A5B00" }}
              >
                <BellRing size={14} />
                Pelanggan menunggu
              </div>
              <div className="mt-1 text-lg font-bold">{b.riderName}</div>
              {b.riderPhone ? (
                <a
                  className="text-sm font-semibold"
                  style={{ color: "var(--primary)" }}
                  href={`https://wa.me/${b.riderPhone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WA {b.riderPhone}
                </a>
              ) : null}
              <div className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
                {v?.name ?? "sepeda"} · {v?.code} · {b.durationLabel}
                <br />
                {formatIdr(b.rentalPriceIdr + (b.addonsPriceIdr ?? 0))} ·{" "}
                {b.paymentStatus === "paid" ? "Sudah bayar" : "Belum bayar"}
                {b.appointmentAt ? (
                  <>
                    <br />
                    <Clock size={12} className="mr-1 inline" />
                    Janji{" "}
                    {new Date(b.appointmentAt).toLocaleString("id-ID", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </>
                ) : null}
                {site ? (
                  <>
                    <br />
                    <CityBadge city={site.city} /> {site.name}
                  </>
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white"
                  style={{ background: "var(--ok)" }}
                  onClick={() => {
                    confirmBooking(b.id);
                    setToast("Diterima ✓ — pelanggan bisa ambil");
                  }}
                >
                  <CircleCheck size={20} />
                  Terima
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold"
                  style={{ background: "#FADBD8", color: "var(--danger)" }}
                  onClick={() => {
                    if (!window.confirm(`Tolak pesanan ${b.code}?`)) return;
                    declineBooking(b.id);
                    setToast("Ditolak — sepeda bebas lagi");
                  }}
                >
                  <CircleX size={20} />
                  Tolak
                </button>
              </div>
            </div>
          );
        })
      )}

      {waitingPickup.length > 0 ? (
        <>
          <OpSection
            icon={KeyRound}
            title={`Serahkan kunci (${waitingPickup.length})`}
            hint="Pelanggan sudah bayar — tunggu di toko"
          />
          {waitingPickup.slice(0, 4).map((b) => {
            const v = vehicles.find((x) => x.id === b.vehicleId);
            return (
              <Link
                key={b.id}
                href="/operator/bookings"
                className="mx-4 mb-2 flex items-center gap-3 rounded-2xl border px-4 py-3"
                style={{
                  background: "var(--card)",
                  borderColor: "var(--border)",
                  borderLeft: "4px solid #b45309",
                }}
              >
                <KeyRound size={20} style={{ color: "#b45309" }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-sm">{b.riderName}</div>
                  <div className="text-xs" style={{ color: "var(--text2)" }}>
                    {v?.name} · {v?.code} · {b.code}
                    {b.appointmentAt
                      ? ` · ${new Date(b.appointmentAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
                      : ""}
                  </div>
                </div>
                <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>
                  Buka
                </span>
              </Link>
            );
          })}
        </>
      ) : null}

      {onRent.length > 0 ? (
        <>
          <OpSection
            icon={Bike}
            title={`Sedang dipinjam (${onRent.length})`}
            hint="Jam kembali & status"
          />
          {onRent.slice(0, 4).map((b) => {
            const v = vehicles.find((x) => x.id === b.vehicleId);
            const site = sites.find((s) => s.id === b.siteId);
            const due = returnDueSummary(b.endsAt, b.durationMinutes);
            return (
              <Link
                key={b.id}
                href="/operator/bookings"
                className="mx-4 mb-2 block rounded-2xl border px-4 py-3"
                style={{
                  background: b.status === "overdue" ? "#FADBD8" : "var(--card)",
                  borderColor:
                    b.status === "overdue" ? "var(--danger)" : "var(--border)",
                }}
              >
                <div className="flex justify-between gap-2">
                  <div className="font-bold text-sm">
                    {v?.name} · {v?.code}
                  </div>
                  <span
                    className="text-[10px] font-bold"
                    style={{
                      color:
                        b.status === "overdue" ? "var(--danger)" : "var(--ok)",
                    }}
                  >
                    {b.status === "overdue" ? "TERLAMBAT" : "ON RENT"}
                  </span>
                </div>
                <div className="mt-0.5 text-xs" style={{ color: "var(--text2)" }}>
                  {b.riderName}
                  {site ? ` · ${site.area}` : ""} · kembali{" "}
                  {formatReturnBy(b.endsAt, b.durationMinutes)}
                  {due.remaining ? ` · ${due.remaining}` : ""}
                </div>
              </Link>
            );
          })}
        </>
      ) : null}

      <OpSection
        icon={Bike}
        title="Armada"
        hint={`${OP.status.free.id} / ${OP.status.onRent.id} / rusak`}
      />
      <div className="mx-4 grid grid-cols-3 gap-2">
        <OpStat
          href="/operator/fleet"
          value={String(stats.free)}
          label={OP.status.free.en}
          sub={OP.status.free.id}
          icon={CircleCheck}
          color="var(--ok)"
        />
        <OpStat
          href="/operator/fleet"
          value={String(stats.rented)}
          label={OP.status.onRent.en}
          sub={OP.status.onRent.id}
          icon={Bike}
          color="var(--primary)"
        />
        <OpStat
          href="/operator/fleet"
          value={String(stats.broken)}
          label={OP.status.broken.en}
          sub="Rusak / off"
          icon={Wrench}
          color="var(--danger)"
        />
      </div>

      <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
        <Link
          href="/operator/fleet"
          className="flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold"
          style={{ background: "var(--bg-deep)", color: "var(--primary)" }}
        >
          <Bike size={16} />
          Kelola sepeda
        </Link>
        <Link
          href="/operator/pricing"
          className="flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold"
          style={{ background: "var(--bg-deep)", color: "var(--primary)" }}
        >
          <Tag size={16} />
          Atur harga
        </Link>
      </div>

      {topSites.length > 0 ? (
        <>
          <OpSection
            icon={MapPin}
            title="Lokasi"
            hint="Siap vs dipinjam per tempat"
            action={
              <Link
                href="/operator/fleet"
                className="text-xs font-bold"
                style={{ color: "var(--primary)" }}
              >
                Semua
              </Link>
            }
          />
          <div className="mx-4 space-y-2">
            {topSites.map(({ site, free, out, total }) => (
              <Link
                key={site.id}
                href="/operator/fleet"
                className="flex items-center gap-3 rounded-2xl border px-3.5 py-3"
                style={{ background: "var(--card)", borderColor: "var(--border)" }}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: "color-mix(in srgb, var(--primary) 10%, white)",
                    color: "var(--primary)",
                  }}
                >
                  <MapPin size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{site.name}</div>
                  <div className="text-[11px]" style={{ color: "var(--text2)" }}>
                    {site.area} · {site.hours}
                  </div>
                </div>
                <div className="text-right text-[11px] font-semibold">
                  <div style={{ color: "var(--ok)" }}>{free} siap</div>
                  <div style={{ color: "var(--primary)" }}>{out} out</div>
                  <div style={{ color: "var(--text2)" }}>{total} total</div>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : null}

      <p
        className="mx-4 mt-4 text-center text-[11px]"
        style={{ color: "var(--text2)" }}
      >
        Minggu ini {formatIdrShort(stats.keepWeek)} bersih · lihat detail di Uang
      </p>

      <BottomNav variant="operator" />
    </div>
  );
}

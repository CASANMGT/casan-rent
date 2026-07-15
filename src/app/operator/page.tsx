"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Banknote,
  BellRing,
  Bike,
  CircleCheck,
  CircleX,
  ClipboardList,
  KeyRound,
  MapPin,
  MoveRight,
  Tag,
  Wrench,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import {
  CityBadge,
  OpMenuLink,
  OpSection,
  OpStat,
  SiteRow,
} from "@/components/operator/OperatorUi";
import { useAppStore } from "@/lib/store";
import { formatIdr, formatIdrShort } from "@/lib/format";
import { groupSitesByArea, OP, uniqueAreas, uniqueCities } from "@/lib/operator-ui";
import type { VehicleType } from "@/lib/types";
import { AuthGate } from "@/components/AuthGate";
import { APP_VERSION, hasUnseenUpdates } from "@/lib/version";

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
  const confirmBooking = useAppStore((s) => s.confirmBooking);
  const declineBooking = useAppStore((s) => s.declineBooking);
  const simulateRiderRequest = useAppStore((s) => s.simulateRiderRequest);
  const setToast = useAppStore((s) => s.setToast);

  const opId = user.operatorId!;
  const op = operators.find((o) => o.id === opId);
  const feePct = op?.platformFeePct ?? 15;
  const fleet = vehicles.filter((v) => v.operatorId === opId);
  const opSites = sites.filter((s) => s.operatorId === opId);
  const opBookings = bookings.filter((b) => b.operatorId === opId);
  const unseen = hasUnseenUpdates(lastSeenVersion);
  const areas = uniqueAreas(opSites);
  const sitesByArea = groupSitesByArea(opSites);

  const pending = opBookings.filter((b) => b.status === "pending");
  const onRent = opBookings.filter(
    (b) => b.status === "active" || b.status === "overdue",
  );
  const waitingPickup = opBookings.filter((b) =>
    ["confirmed", "awaiting_pickup"].includes(b.status),
  );

  const stats = useMemo(() => {
    const free = fleet.filter((v) => v.status === "available").length;
    const rented = fleet.filter((v) => v.status === "rented").length;
    const broken = fleet.filter((v) => v.status === "maintenance").length;
    const types: VehicleType[] = ["bicycle", "ebike", "emoped"];
    const byType = types
      .map((t) => {
        const units = fleet.filter((v) => v.vehicleType === t);
        return {
          type: t,
          free: units.filter((v) => v.status === "available").length,
          total: units.length,
        };
      })
      .filter((x) => x.total > 0);
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
      (s, b) => s + b.rentalPriceIdr + (b.addonsPriceIdr ?? 0),
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
      (s, b) => s + b.rentalPriceIdr + (b.addonsPriceIdr ?? 0),
      0,
    );
    const keepToday = Math.round(grossToday * (1 - feePct / 100));
    const keepWeek = Math.round(grossWeek * (1 - feePct / 100));
    return {
      free,
      rented,
      broken,
      byType,
      keysOut,
      keepToday,
      keepWeek,
      tripsToday: paidToday.length,
    };
  }, [fleet, opBookings, feePct]);

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
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/90">
              <MapPin size={14} />
              {areas.length > 1
                ? `${areas.length} areas across Jakarta`
                : `${op?.city ?? "—"} · ${opSites.length} places`}
            </div>
            <h1 className="font-display mt-1 text-2xl font-semibold leading-tight">
              {op?.name}
            </h1>
            <p className="text-sm text-white/90">Halo {user.name}</p>
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

      <Link
        href="/operator/earnings"
        className="mx-4 mt-3 block rounded-2xl p-4 text-white"
        style={{
          background: "linear-gradient(135deg, #0f766e, var(--primary))",
        }}
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-white/85">
          <Banknote size={16} />
          Uang masuk hari ini · Money today
        </div>
        <div className="font-display mt-1 text-3xl font-bold">
          {formatIdr(stats.keepToday)}
        </div>
        <div className="mt-1 text-xs text-white/85">
          {stats.tripsToday} trip hari ini · minggu ini {formatIdrShort(stats.keepWeek)}
        </div>
      </Link>

      <OpSection
        icon={BellRing}
        title={
          pending.length > 0
            ? `Permintaan baru (${pending.length})`
            : "Permintaan baru"
        }
        hint="New booking requests — tap green to accept"
      />

      {pending.length === 0 ? (
        <div className="op-card text-sm" style={{ color: "var(--text2)" }}>
          Tidak ada yang menunggu. Latihan dengan tombol demo di bawah.
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
        </div>
      ) : (
        pending.map((b) => {
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
              <div className="text-sm" style={{ color: "var(--text2)" }}>
                {v?.emoji} {v?.name ?? "sepeda"} · {b.durationLabel}
                <br />
                {formatIdr(b.rentalPriceIdr)}
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

      <OpSection
        icon={Bike}
        title="Sepeda kamu"
        hint={`${OP.status.free.en} / ${OP.status.onRent.en} / ${OP.status.broken.en}`}
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
          sub={OP.status.broken.id}
          icon={Wrench}
          color="var(--danger)"
        />
      </div>

      {stats.keysOut > 0 ? (
        <Link
          href="/operator/bookings"
          className="mx-4 mt-3 flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{ background: "#FEF5E7", border: "1px solid var(--warn)" }}
        >
          <KeyRound size={22} style={{ color: "#9A5B00" }} />
          <div className="flex-1">
            <div className="text-sm font-bold" style={{ color: "#9A5B00" }}>
              {stats.keysOut} kunci masih di pelanggan
            </div>
            <div className="text-xs" style={{ color: "var(--text2)" }}>
              Ambil kembali saat mereka kembali · lihat jam kembali di Pesanan
            </div>
          </div>
        </Link>
      ) : null}

      <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
        <Link
          href="/operator/fleet"
          className="flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold"
          style={{ background: "var(--bg-deep)", color: "var(--primary)" }}
        >
          <MoveRight size={16} />
          Pindah sepeda
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

      {onRent.length > 0 ? (
        <>
          <OpSection icon={Bike} title="Sedang dipinjam" hint="On rent now — tap for actions" />
          {onRent.map((b) => {
            const v = vehicles.find((x) => x.id === b.vehicleId);
            const site = sites.find((s) => s.id === b.siteId);
            return (
              <Link
                key={b.id}
                href="/operator/bookings"
                className="op-card !my-1 block !py-3"
              >
                <div className="font-bold text-sm">
                  {v?.name} · {v?.code}
                </div>
                <div className="text-xs" style={{ color: "var(--text2)" }}>
                  {b.riderName} · {b.durationLabel}
                  {site ? ` · ${site.area}` : ""}
                  {b.status === "overdue" ? " · TERLAMBAT" : ""}
                </div>
              </Link>
            );
          })}
        </>
      ) : null}

      {waitingPickup.length > 0 ? (
        <>
          <OpSection icon={KeyRound} title="Tunggu ambil kunci" hint="Hand key at shop — tap for actions" />
          {waitingPickup.map((b) => {
            const v = vehicles.find((x) => x.id === b.vehicleId);
            return (
              <Link
                key={b.id}
                href="/operator/bookings"
                className="op-card !my-1 block !py-3"
              >
                <div className="font-bold text-sm">{b.riderName}</div>
                <div className="text-xs" style={{ color: "var(--text2)" }}>
                  Serahkan kunci untuk {v?.name} ({v?.code}) · kode {b.code}
                </div>
              </Link>
            );
          })}
        </>
      ) : null}

      <OpSection
        icon={MapPin}
        title="Lokasi · Locations"
        hint={
          areas.length > 1
            ? "Spread across Jakarta — tap to manage fleet"
            : "Each place can be a different address"
        }
      />

      {sitesByArea.map(({ area, city, sites: areaSites }) => (
        <div key={`${city}-${area}`} className="mb-1">
          {areaSites.map((s) => {
            const units = fleet.filter((v) => v.siteId === s.id);
            const free = units.filter((v) => v.status === "available").length;
            const rented = units.filter((v) => v.status === "rented").length;
            return (
              <SiteRow
                key={s.id}
                site={s}
                href="/operator/fleet"
                meta={`${free} ready · ${rented} out · ${units.length} total`}
              />
            );
          })}
        </div>
      ))}

      <OpSection icon={ClipboardList} title="Menu cepat" hint="Quick menu" />
      <OpMenuLink
        href="/operator/bookings"
        icon={ClipboardList}
        label="Semua pesanan"
        hint="Orders · terima, kunci, kembali"
      />
      <OpMenuLink
        href="/operator/fleet"
        icon={Bike}
        label="Kelola sepeda"
        hint="Bikes · pindah antar tempat"
      />
      <OpMenuLink
        href="/operator/earnings"
        icon={Banknote}
        label="Lihat uang"
        hint="Money · hari / minggu / bulan"
      />
      <OpMenuLink
        href="/operator/pricing"
        icon={Tag}
        label="Atur harga"
        hint="Prices · per jam / hari"
      />

      <BottomNav variant="operator" />
    </div>
  );
}

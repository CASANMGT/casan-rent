"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleX,
  Clock,
  Flag,
  KeyRound,
  PlayCircle,
  TimerReset,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { CityBadge, AreaBadge } from "@/components/operator/OperatorUi";
import { AuthGate } from "@/components/AuthGate";
import { useAppStore } from "@/lib/store";
import {
  formatExtendLabel,
  formatIdr,
  formatOrderDateTime,
  formatReturnBy,
  paymentMethodLabel,
  pickupTypeLabel,
  returnDueSummary,
} from "@/lib/format";
import { IS_DEMO } from "@/lib/demo";
import { LocationSwitcher } from "@/components/operator/FleetModelStock";
import {
  canAccessSite,
  canStaff,
  getCurrentStaff,
} from "@/lib/permissions";
import { PendingAge } from "@/components/UxSignals";

type Tab = "new" | "active" | "done";

function needsPhysicalKey(keys: string | undefined) {
  return keys === "physical" || keys === "both";
}

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
  const sites = useAppStore((s) => s.sites);
  const operatorActiveSiteId = useAppStore((s) => s.operatorActiveSiteId);
  const setOperatorActiveSiteId = useAppStore((s) => s.setOperatorActiveSiteId);
  const confirmBooking = useAppStore((s) => s.confirmBooking);
  const declineBooking = useAppStore((s) => s.declineBooking);
  const confirmBulk = useAppStore((s) => s.confirmBulk);
  const givePhysicalKey = useAppStore((s) => s.givePhysicalKey);
  const collectPhysicalKey = useAppStore((s) => s.collectPhysicalKey);
  const completeReturn = useAppStore((s) => s.completeReturn);
  const payBooking = useAppStore((s) => s.payBooking);
  const simulateRiderRequest = useAppStore((s) => s.simulateRiderRequest);
  const setToast = useAppStore((s) => s.setToast);
  const staff = useAppStore((s) => s.staff);
  const currentStaff = getCurrentStaff(user, staff);
  const canManageBookings = canStaff(currentStaff, "bookings.manage");

  const [tab, setTab] = useState<Tab>("new");
  const [openDetailIds, setOpenDetailIds] = useState<Record<string, boolean>>(
    {},
  );

  const opSites = useMemo(
    () =>
      sites.filter(
        (site) =>
          site.operatorId === user.operatorId &&
          canAccessSite(currentStaff, site.id),
      ),
    [sites, user.operatorId, currentStaff],
  );

  const mine = useMemo(() => {
    const all = bookings.filter(
      (booking) =>
        booking.operatorId === user.operatorId &&
        canAccessSite(currentStaff, booking.siteId),
    );
    if (!operatorActiveSiteId) return all;
    return all.filter((b) => b.siteId === operatorActiveSiteId);
  }, [bookings, user.operatorId, operatorActiveSiteId, currentStaff]);

  const list = useMemo(() => {
    if (tab === "new")
      return mine.filter((b) =>
        ["pending", "confirmed", "awaiting_pickup"].includes(b.status),
      );
    if (tab === "active")
      return mine.filter(
        (b) => b.status === "active" || b.status === "overdue",
      );
    return mine.filter((b) =>
      ["completed", "cancelled"].includes(b.status),
    );
  }, [mine, tab]);

  const newCount = mine.filter((b) =>
    ["pending", "confirmed", "awaiting_pickup"].includes(b.status),
  ).length;
  const availableCount = vehicles.filter(
    (v) =>
      v.operatorId === user.operatorId &&
      v.status === "available" &&
      (!operatorActiveSiteId || v.siteId === operatorActiveSiteId),
  ).length;
  const activeCount = mine.filter(
    (b) => b.status === "active" || b.status === "overdue",
  ).length;
  const keysOut = mine.filter(
    (b) =>
      needsPhysicalKey(b.keysAccess) &&
      b.physicalKeyGiven &&
      !b.physicalKeyReturned &&
      (b.status === "active" || b.status === "overdue"),
  ).length;

  return (
    <div className="content-pad">
      <Header
        title="Pesanan · Orders"
        right={
          IS_DEMO && canManageBookings ? (
          <button
            type="button"
            className="text-[11px] font-bold text-white"
            onClick={() => {
              simulateRiderRequest();
              setTab("new");
            }}
          >
            + Demo
          </button>
          ) : null
        }
      />

      {opSites.length > 1 ? (
        <div className="mt-2">
          <LocationSwitcher
            locations={opSites.map((s) => ({
              id: s.id,
              name: s.name.replace(/\s+(Lobby|Hub|Corner|Desk|Counter)$/i, ""),
              total: bookings.filter(
                (b) =>
                  b.siteId === s.id &&
                  ["pending", "confirmed", "awaiting_pickup", "active", "overdue"].includes(
                    b.status,
                  ),
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

      {keysOut > 0 ? (
        <div
          className="mx-4 mt-3 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold"
          style={{ borderColor: "var(--warn)", background: "var(--warning-soft)", color: "var(--text-warn)" }}
        >
          <KeyRound size={18} />
          {keysOut} kunci masih di pelanggan — ambil saat mereka kembali
        </div>
      ) : null}

      <p className="px-4 pt-2 text-xs" style={{ color: "var(--text2)" }}>
        Terima → serahkan kunci → pelanggan kembali jam di bawah → ambil kunci
      </p>

      <div
        role="tablist"
        aria-label="Order status"
        className="mx-4 mt-3 flex gap-1 rounded-xl p-1"
        style={{ background: "var(--card)" }}
      >
        {(
          [
            ["new", `Baru${newCount ? ` (${newCount})` : ""}`],
            ["active", `Dipinjam${activeCount ? ` (${activeCount})` : ""}`],
            ["done", "Selesai"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className="flex-1 rounded-lg py-2.5 text-xs font-bold"
            style={{
              background: tab === id ? "var(--primary)" : "transparent",
              color: tab === id ? "white" : "var(--text2)",
            }}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "new" ? (
        <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
          <div
            className="rounded-xl border p-3"
            style={{ background: "var(--warning-soft)", borderColor: "var(--warn)" }}
          >
            <div className="text-2xl font-bold" style={{ color: "var(--warn)" }}>
              {newCount}
            </div>
            <div className="text-xs font-semibold">Permintaan baru</div>
          </div>
          <div
            className="rounded-xl border p-3"
            style={{ background: "var(--success-soft)", borderColor: "var(--ok)" }}
          >
            <div className="text-2xl font-bold" style={{ color: "var(--ok)" }}>
              {availableCount}
            </div>
            <div className="text-xs font-semibold">Sepeda tersedia</div>
          </div>
        </div>
      ) : null}

      {canManageBookings &&
      tab === "new" &&
      list.some((b) => b.status === "pending") ? (
        <button
          type="button"
          className="mx-4 mt-3 w-[calc(100%-32px)] rounded-xl py-3 text-sm font-bold text-white"
          style={{ background: "var(--ok)" }}
          onClick={() => {
            const pendingIds = list
              .filter((b) => b.status === "pending")
              .map((b) => b.id);
            if (
              !window.confirm(
                `Accept all ${pendingIds.length} new requests? Review appointment and availability first.`,
              )
            ) {
              return;
            }
            confirmBulk(pendingIds);
            setToast(`Diterima ${pendingIds.length} pesanan`);
          }}
        >
          Terima semua (
          {list.filter((b) => b.status === "pending").length})
        </button>
      ) : null}

      {list.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            {tab === "new"
              ? "Tidak ada permintaan baru."
              : tab === "active"
                ? "Tidak ada yang sedang menyewa."
                : "Belum ada trip selesai."}
          </p>
          {tab === "new" && IS_DEMO && canManageBookings ? (
            <button
              type="button"
              className="mt-4 rounded-xl px-5 py-3 text-sm font-bold text-white"
              style={{ background: "var(--primary)" }}
              onClick={() => simulateRiderRequest()}
            >
              Demo: pelanggan mau sewa
            </button>
          ) : null}
        </div>
      ) : (
        list.map((b) => {
          const v = vehicles.find((x) => x.id === b.vehicleId);
          const site = sites.find((s) => s.id === b.siteId || s.id === v?.siteId);
          const availableAtSite = vehicles.filter(
            (x) =>
              x.operatorId === b.operatorId &&
              x.siteId === b.siteId &&
              x.status === "available",
          ).length;
          const phys = needsPhysicalKey(b.keysAccess);
          const returnDue = returnDueSummary(b.endsAt, b.durationMinutes);
          const expectedReturn = formatReturnBy(b.endsAt, b.durationMinutes);
          const plannedFinish =
            b.endsAt ??
            (b.appointmentAt
              ? new Date(
                  new Date(b.appointmentAt).getTime() +
                    b.durationMinutes * 60_000,
                ).toISOString()
              : null);
          const finishLabel =
            b.status === "completed" ? "Selesai aktual" : "Selesai perkiraan";
          const onTrip = ["confirmed", "awaiting_pickup", "active", "overdue"].includes(
            b.status,
          );
          const plainStatus =
            b.status === "pending"
              ? "Baru — terima atau tolak"
              : b.status === "awaiting_pickup" || b.status === "confirmed"
                ? phys && !b.physicalKeyGiven
                  ? "Di toko — serahkan kunci"
                  : "Sudah bayar — tunggu ambil"
                : b.status === "active"
                  ? phys && !b.physicalKeyReturned
                    ? "Dipinjam · kunci di pelanggan"
                    : "Dipinjam sekarang"
                  : b.status === "overdue"
                    ? "Terlambat · kunci belum kembali"
                    : b.status === "completed"
                      ? "Selesai"
                      : "Dibatalkan";

          return (
            <div
              key={b.id}
              className="mx-4 mt-3 rounded-2xl p-4"
              style={{
                background: "var(--card)",
                borderLeft: `5px solid ${
                  b.status === "pending"
                    ? "var(--warn)"
                    : b.status === "overdue"
                      ? "var(--danger)"
                      : phys && b.physicalKeyGiven && !b.physicalKeyReturned
                        ? "var(--key)"
                        : "var(--primary)"
                }`,
              }}
            >
              <div className="flex items-center justify-between gap-2 text-xs font-bold">
                <span style={{ color: "var(--text2)" }}>{plainStatus}</span>
                {b.status === "pending" ? (
                  <PendingAge createdAt={b.createdAt} />
                ) : null}
              </div>
              <div className="mt-1 text-base font-bold">{b.riderName}</div>
              {b.riderPhone ? (
                <a
                  className="text-sm font-semibold"
                  style={{ color: "var(--primary)" }}
                  href={`https://wa.me/${b.riderPhone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WA / tel {b.riderPhone}
                </a>
              ) : (
                <div className="text-xs" style={{ color: "var(--text2)" }}>
                  No phone on file
                </div>
              )}
              <div
                className="mt-2 grid grid-cols-2 gap-2 rounded-xl px-3 py-2.5 text-xs"
                style={{ background: "var(--bg-deep)" }}
              >
                <div>
                  <div style={{ color: "var(--text2)" }}>Pembayaran</div>
                  <div className="font-bold">
                    {paymentMethodLabel(b.paymentMethod)} ·{" "}
                    {b.paymentStatus === "paid"
                      ? "lunas"
                      : b.paymentStatus === "refunded"
                        ? "refund"
                        : "belum"}
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--text2)" }}>Cara ambil</div>
                  <div className="font-bold">
                    {pickupTypeLabel(b.pickupType)}
                  </div>
                </div>
                <div className="col-span-2">
                  <div style={{ color: "var(--text2)" }}>Durasi & total</div>
                  <div className="font-bold">
                    {b.durationLabel} ·{" "}
                    {formatIdr(b.rentalPriceIdr + (b.addonsPriceIdr ?? 0))}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
                {v?.emoji} {v?.name} · {v?.code}
                <br />
                {site ? (
                  <>
                    <AreaBadge area={site.area} /> <CityBadge city={site.city} />{" "}
                    {site.name}
                    <br />
                  </>
                ) : null}
                Kode: <strong style={{ color: "var(--text)" }}>{b.code}</strong>
                {phys ? (
                  <>
                    <br />
                    Kunci toko:{" "}
                    {!b.physicalKeyGiven
                      ? "masih dengan kamu"
                      : !b.physicalKeyReturned
                        ? "di pelanggan"
                        : "sudah kembali"}
                  </>
                ) : null}
              </div>

              <div
                className="mt-3 flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
                style={{ background: "var(--bg-deep)" }}
              >
                <div>
                  <div
                    className="text-[10px] font-semibold uppercase"
                    style={{ color: "var(--text2)" }}
                  >
                    Status sepeda
                  </div>
                  <div className="text-sm font-bold">
                    {v?.status === "reserved"
                      ? "Dipesan untuk permintaan ini"
                      : v?.status === "available"
                        ? "Tersedia"
                        : v?.status === "rented"
                          ? "Sedang dipinjam"
                          : v?.status === "maintenance"
                            ? "Rusak / maintenance"
                            : v?.status ?? "Unknown"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold" style={{ color: "var(--ok)" }}>
                    {availableAtSite}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text2)" }}>
                    tersedia di toko
                  </div>
                </div>
              </div>

              <div
                className="mt-3 overflow-hidden rounded-xl border"
                style={{ borderColor: "var(--border)" }}
              >
                <OrderTimeRow
                  icon={CalendarDays}
                  label="Janji ambil"
                  value={formatOrderDateTime(b.appointmentAt)}
                  tone="var(--warn)"
                  last={!openDetailIds[b.id]}
                />
                {openDetailIds[b.id] ? (
                  <>
                    <OrderTimeRow
                      icon={PlayCircle}
                      label="Diambil aktual"
                      value={
                        b.startsAt
                          ? formatOrderDateTime(b.startsAt)
                          : "Belum diambil"
                      }
                      tone="var(--primary)"
                    />
                    <OrderTimeRow
                      icon={Flag}
                      label={finishLabel}
                      value={formatOrderDateTime(
                        b.completedAt ?? plannedFinish,
                      )}
                      tone={
                        b.status === "overdue"
                          ? "var(--danger)"
                          : "var(--ok)"
                      }
                      last
                    />
                  </>
                ) : null}
              </div>

              <button
                type="button"
                className="mt-2 flex w-full items-center justify-center gap-1 text-xs font-bold"
                style={{ color: "var(--primary)" }}
                onClick={() =>
                  setOpenDetailIds((prev) => ({
                    ...prev,
                    [b.id]: !prev[b.id],
                  }))
                }
              >
                {openDetailIds[b.id] ? (
                  <>
                    Sembunyikan detail <ChevronUp size={14} />
                  </>
                ) : (
                  <>
                    Detail waktu
                    {(b.extensions?.length ?? 0) > 0
                      ? ` · ${b.extensions!.length} extend`
                      : ""}{" "}
                    <ChevronDown size={14} />
                  </>
                )}
              </button>

              {openDetailIds[b.id] && (b.extensions?.length ?? 0) > 0 ? (
                <div
                  className="mt-3 rounded-xl border p-3"
                  style={{
                    borderColor: "var(--primary)",
                    background:
                      "color-mix(in srgb, var(--primary) 7%, white)",
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 text-xs font-bold"
                    style={{ color: "var(--primary)" }}
                  >
                    <TimerReset size={15} />
                    Extend · sudah dibayar
                  </div>
                  {[...(b.extensions ?? [])].reverse().map((extension) => (
                    <div
                      key={extension.id}
                      className="mt-2 border-t pt-2 text-xs"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="flex justify-between gap-3 font-semibold">
                        <span>{formatExtendLabel(extension.extraMinutes)}</span>
                        <span>{formatIdr(extension.priceIdr)}</span>
                      </div>
                      <div
                        className="mt-0.5"
                        style={{ color: "var(--text2)" }}
                      >
                        Diminta {formatOrderDateTime(extension.requestedAt)}
                        <br />
                        Finish baru:{" "}
                        <strong style={{ color: "var(--text)" }}>
                          {formatOrderDateTime(extension.newEndsAt)}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {onTrip ? (
                <div
                  className="mt-3 rounded-xl px-3 py-2.5"
                  style={{
                    background: returnDue.late
                      ? "var(--danger-soft)"
                      : "var(--success-soft)",
                    border: `1px solid ${returnDue.late ? "var(--danger)" : "var(--ok)"}`,
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 text-xs font-bold"
                    style={{ color: returnDue.late ? "var(--danger)" : "var(--ok)" }}
                  >
                    <Clock size={14} />
                    {b.physicalKeyGiven || b.status === "active" || b.status === "overdue"
                      ? "Harus kembali jam"
                      : "Akan kembali jam (jika kunci diserahkan sekarang)"}
                  </div>
                  <div
                    className="mt-0.5 text-base font-bold"
                    style={{ color: "var(--text)" }}
                  >
                    {expectedReturn}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text2)" }}>
                    {b.durationLabel} rental
                    {returnDue.remaining
                      ? ` · ${returnDue.remaining}`
                      : ""}
                  </div>
                </div>
              ) : null}

              {canManageBookings ? (
              <>
              {b.status === "pending" ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white"
                    style={{ background: "var(--ok)" }}
                    onClick={() => {
                      confirmBooking(b.id);
                      setToast("Diterima ✓ — siap serahkan kunci");
                    }}
                  >
                    <CircleCheck size={20} />
                    Terima
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold"
                    style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
                    onClick={() => {
                      if (!window.confirm(`Tolak pesanan ${b.code}?`)) return;
                      declineBooking(b.id);
                      setToast("Ditolak");
                    }}
                  >
                    <CircleX size={20} />
                    Tolak
                  </button>
                </div>
              ) : null}

              {b.paymentMethod === "pay_at_operator" &&
              b.paymentStatus === "pending" &&
              b.status !== "pending" &&
              b.status !== "cancelled" ? (
                <button
                  type="button"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white"
                  style={{ background: "var(--ok)" }}
                  onClick={() => {
                    payBooking(b.id);
                    setToast("Pembayaran di toko diterima");
                  }}
                >
                  <CircleCheck size={20} />
                  Konfirmasi pembayaran di toko
                </button>
              ) : null}

              {phys &&
              (b.status === "confirmed" || b.status === "awaiting_pickup") &&
              b.paymentStatus === "paid" &&
              !b.physicalKeyGiven ? (
                <button
                  type="button"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white"
                  style={{ background: "var(--key)" }}
                  onClick={() => {
                    givePhysicalKey(b.id);
                    setToast(`Kunci diserahkan · kembali ${expectedReturn}`);
                  }}
                >
                  <KeyRound size={20} />
                  Serahkan kunci · mulai {b.durationLabel}
                </button>
              ) : null}

              {phys &&
              (b.status === "active" || b.status === "overdue") &&
              b.physicalKeyGiven &&
              !b.physicalKeyReturned ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
                    Pelanggan harus kembali jam {expectedReturn}
                    {returnDue.late ? " — sudah terlambat" : ""}
                  </p>
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white"
                    style={{ background: "var(--ok)" }}
                    onClick={() => {
                      if (
                        !window.confirm(
                          "Confirm the key and bike are both back, then close this rental?",
                        )
                      ) {
                        return;
                      }
                      collectPhysicalKey(b.id);
                      completeReturn(b.id);
                      setToast("Kunci kembali · selesai");
                      setTab("done");
                    }}
                  >
                    <KeyRound size={20} />
                    Kunci kembali · tutup sewa
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl py-3 text-sm font-bold"
                    style={{ background: "var(--bg-deep)", color: "var(--text2)" }}
                    onClick={() => {
                      if (
                        !window.confirm(
                          "Confirm only the key is back. The rental and timer will continue.",
                        )
                      ) {
                        return;
                      }
                      collectPhysicalKey(b.id);
                      setToast("Kunci sudah kembali — sewa masih jalan");
                    }}
                  >
                    Hanya kunci kembali (sepeda belum kembali)
                  </button>
                </div>
              ) : null}

              {(b.status === "active" || b.status === "overdue") &&
              (!phys || b.physicalKeyReturned) ? (
                <button
                  type="button"
                  className="mt-3 w-full rounded-xl py-3 text-sm font-bold text-white"
                  style={{ background: "var(--ok)" }}
                  onClick={() => {
                    completeReturn(b.id);
                    setToast("Sewa selesai");
                    setTab("done");
                  }}
                >
                  Tutup sewa (tanpa kunci toko)
                </button>
              ) : null}
              </>
              ) : null}
            </div>
          );
        })
      )}
      <BottomNav variant="operator" />
    </div>
  );
}

function OrderTimeRow({
  icon: Icon,
  label,
  value,
  tone,
  last = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: string;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5"
      style={{
        background: "var(--bg)",
        borderBottom: last ? undefined : "1px solid var(--border)",
      }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: `color-mix(in srgb, ${tone} 10%, white)`,
          color: tone,
        }}
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <div className="text-[10px] font-semibold" style={{ color: "var(--text2)" }}>
          {label}
        </div>
        <div className="text-sm font-bold">{value}</div>
      </div>
    </div>
  );
}

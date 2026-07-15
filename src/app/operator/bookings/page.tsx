"use client";

import { useMemo, useState } from "react";
import {
  CircleCheck,
  CircleX,
  Clock,
  KeyRound,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { CityBadge, AreaBadge } from "@/components/operator/OperatorUi";
import { AuthGate } from "@/components/AuthGate";
import { useAppStore } from "@/lib/store";
import { formatIdr, formatReturnBy, returnDueSummary } from "@/lib/format";

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
  const confirmBooking = useAppStore((s) => s.confirmBooking);
  const declineBooking = useAppStore((s) => s.declineBooking);
  const confirmBulk = useAppStore((s) => s.confirmBulk);
  const givePhysicalKey = useAppStore((s) => s.givePhysicalKey);
  const collectPhysicalKey = useAppStore((s) => s.collectPhysicalKey);
  const completeReturn = useAppStore((s) => s.completeReturn);
  const simulateRiderRequest = useAppStore((s) => s.simulateRiderRequest);
  const setToast = useAppStore((s) => s.setToast);

  const [tab, setTab] = useState<Tab>("new");

  const mine = useMemo(
    () => bookings.filter((b) => b.operatorId === user.operatorId),
    [bookings, user.operatorId],
  );

  const list = useMemo(() => {
    if (tab === "new") return mine.filter((b) => b.status === "pending");
    if (tab === "active")
      return mine.filter((b) =>
        ["confirmed", "awaiting_pickup", "active", "overdue"].includes(b.status),
      );
    return mine.filter((b) =>
      ["completed", "cancelled"].includes(b.status),
    );
  }, [mine, tab]);

  const newCount = mine.filter((b) => b.status === "pending").length;
  const activeCount = mine.filter((b) =>
    ["confirmed", "awaiting_pickup", "active", "overdue"].includes(b.status),
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
        }
      />

      {keysOut > 0 ? (
        <div
          className="mx-4 mt-3 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold"
          style={{ borderColor: "var(--warn)", background: "#FEF5E7", color: "#9A5B00" }}
        >
          <KeyRound size={18} />
          {keysOut} kunci masih di pelanggan — ambil saat mereka kembali
        </div>
      ) : null}

      <p className="px-4 pt-2 text-xs" style={{ color: "var(--text2)" }}>
        Terima → serahkan kunci → pelanggan kembali jam di bawah → ambil kunci
      </p>

      <div
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

      {tab === "new" && list.length > 1 ? (
        <button
          type="button"
          className="mx-4 mt-3 w-[calc(100%-32px)] rounded-xl py-3 text-sm font-bold text-white"
          style={{ background: "var(--ok)" }}
          onClick={() => {
            confirmBulk(list.map((b) => b.id));
            setToast(`Diterima ${list.length} pesanan`);
          }}
        >
          Terima semua ({list.length})
        </button>
      ) : null}

      {list.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm" style={{ color: "var(--text2)" }}>
            {tab === "new"
              ? "Tidak ada permintaan baru. Tekan “+ Demo”."
              : tab === "active"
                ? "Tidak ada yang sedang menyewa."
                : "Belum ada trip selesai."}
          </p>
          {tab === "new" ? (
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
          const phys = needsPhysicalKey(b.keysAccess);
          const returnDue = returnDueSummary(b.endsAt, b.durationMinutes);
          const expectedReturn = formatReturnBy(b.endsAt, b.durationMinutes);
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
                        ? "#b45309"
                        : "var(--primary)"
                }`,
              }}
            >
              <div
                className="text-xs font-bold"
                style={{ color: "var(--text2)" }}
              >
                {plainStatus}
              </div>
              <div className="mt-1 text-base font-bold">{b.riderName}</div>
              <div className="text-sm" style={{ color: "var(--text2)" }}>
                {v?.emoji} {v?.name} · {v?.code}
                <br />
                {b.durationLabel} ·{" "}
                {formatIdr(b.rentalPriceIdr + (b.addonsPriceIdr ?? 0))}
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

              {onTrip ? (
                <div
                  className="mt-3 rounded-xl px-3 py-2.5"
                  style={{
                    background: returnDue.late ? "#FADBD8" : "#E8F8F5",
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

              {b.status === "pending" ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white"
                    style={{ background: "var(--ok)" }}
                    onClick={() => {
                      confirmBooking(b.id);
                      setToast("Diterima ✓");
                      setTab("active");
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
                      setToast("Ditolak");
                    }}
                  >
                    <CircleX size={20} />
                    Tolak
                  </button>
                </div>
              ) : null}

              {phys &&
              (b.status === "confirmed" || b.status === "awaiting_pickup") &&
              !b.physicalKeyGiven ? (
                <button
                  type="button"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white"
                  style={{ background: "#b45309" }}
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
            </div>
          );
        })
      )}
      <BottomNav variant="operator" />
    </div>
  );
}

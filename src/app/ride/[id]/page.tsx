"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAppStore } from "@/lib/store";
import { formatIdr, formatTimer } from "@/lib/format";

export default function RidePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const bookings = useAppStore((s) => s.bookings);
  const vehicles = useAppStore((s) => s.vehicles);
  const operators = useAppStore((s) => s.operators);
  const toggleMotor = useAppStore((s) => s.toggleMotor);
  const completeReturn = useAppStore((s) => s.completeReturn);
  const setToast = useAppStore((s) => s.setToast);

  const booking = bookings.find((b) => b.id === id);
  const vehicle = vehicles.find((v) => v.id === booking?.vehicleId);
  const op = operators.find((o) => o.id === booking?.operatorId);

  const [now, setNow] = useState(Date.now());
  const [sos, setSos] = useState(false);
  const [returnStep, setReturnStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remainingSec = useMemo(() => {
    if (!booking?.endsAt) return booking?.durationMinutes
      ? booking.durationMinutes * 60
      : 0;
    return Math.floor((new Date(booking.endsAt).getTime() - now) / 1000);
  }, [booking, now]);

  if (!booking || !vehicle || !op) {
    return <div className="p-6">Ride not found</div>;
  }

  if (booking.status === "completed") {
    return (
      <div>
        <Header title="Receipt" backHref="/home" />
        <div className="card text-center">
          <div className="text-4xl">✓</div>
          <div className="mt-2 font-display text-xl font-semibold">
            Trip complete
          </div>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
            Deposit refund initiated (mock).
          </p>
        </div>
        <div className="card">
          <Row label="Vehicle" value={vehicle.name} />
          <Row label="Duration" value={booking.durationLabel} />
          <Row label="Rental" value={formatIdr(booking.rentalPriceIdr)} />
          <Row label="Deposit" value={`${formatIdr(booking.depositIdr)} refund`} />
        </div>
        <button type="button" className="btn-primary" onClick={() => router.push("/home")}>
          Back home
        </button>
      </div>
    );
  }

  if (returnStep > 0) {
    return (
      <div>
        <Header title="Return" backHref={`/ride/${id}`} />
        {returnStep === 1 ? (
          <>
            <div
              className="mx-4 rounded-xl border p-4 text-center text-sm"
              style={{ borderColor: "var(--warn)", background: "#FEF5E7" }}
            >
              Navigate back to {op.name} return zone (~50m).
            </div>
            <div
              className="mx-4 mt-3 h-40 rounded-2xl"
              style={{ background: "linear-gradient(145deg,#b8d4ce,#9bc4bb)" }}
            />
            <button type="button" className="btn-primary" onClick={() => setReturnStep(2)}>
              I&apos;m at the return point
            </button>
          </>
        ) : null}
        {returnStep === 2 ? (
          <>
            <div className="card text-sm">
              {booking.rentalMode === "digital"
                ? "Lock the vehicle via app. Parking photo optional (mock)."
                : "Hand the physical key to staff and wait for inspection."}
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                await fetch("/api/iot", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    command: "lock",
                    vehicleId: vehicle.id,
                    bookingId: booking.id,
                  }),
                });
                setReturnStep(3);
              }}
            >
              {booking.rentalMode === "digital" ? "Lock vehicle" : "Key returned"}
            </button>
          </>
        ) : null}
        {returnStep === 3 ? (
          <>
            <div className="card text-center">
              <div className="font-bold">Confirm return</div>
              <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
                Finalize billing and release deposit.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                completeReturn(booking.id);
                setToast("Return complete");
              }}
            >
              Complete return
            </button>
          </>
        ) : null}
      </div>
    );
  }

  const warn = remainingSec <= 900 && remainingSec > 300;
  const danger = remainingSec <= 300;

  return (
    <div className="content-pad relative pb-28">
      <Header title="Active rental" subtitle={vehicle.name} backHref="/home" />

      {warn ? (
        <div
          className="mx-4 mt-3 rounded-xl border px-4 py-3 text-sm font-semibold"
          style={{ borderColor: "#FFB74D", background: "#FFF3E0", color: "#E65100" }}
        >
          15 min or less remaining — head back soon.
        </div>
      ) : null}
      {danger ? (
        <div
          className="mx-4 mt-3 rounded-xl border px-4 py-3 text-sm font-semibold"
          style={{ borderColor: "var(--danger)", background: "#FADBD8", color: "var(--danger)" }}
        >
          Under 5 minutes left — overtime may apply.
        </div>
      ) : null}

      <div className="flex flex-col items-center px-5 py-8">
        <div
          className="relative flex h-44 w-44 flex-col items-center justify-center rounded-full border-8"
          style={{ borderColor: "var(--border)", borderTopColor: "var(--primary)" }}
        >
          <div className="font-display text-4xl font-bold tabular-nums">
            {formatTimer(remainingSec)}
          </div>
          <div className="text-xs" style={{ color: "var(--text2)" }}>
            remaining
          </div>
          <div
            className="absolute -bottom-2 rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ background: "var(--ok)" }}
          >
            Active
          </div>
        </div>
      </div>

      <div
        className="mx-4 mb-3 grid grid-cols-3 gap-2 rounded-2xl p-3"
        style={{ background: "var(--card)" }}
      >
        <Stat
          value={vehicle.batteryPct != null ? `${vehicle.batteryPct}%` : "—"}
          label="Battery"
        />
        <Stat value={booking.rentalMode === "digital" ? "App" : "Key"} label="Mode" />
        <Stat value={op.name.split(" ")[0]} label="Station" />
      </div>

      {booking.rentalMode === "digital" && vehicle.vehicleType !== "bicycle" ? (
        <button
          type="button"
          className="mx-4 mb-4 flex w-[calc(100%-32px)] flex-col items-center gap-1 rounded-2xl border-2 py-5"
          style={{
            borderColor: booking.motorOn ? "var(--ok)" : "var(--danger)",
            background: booking.motorOn ? "#E8F8F5" : "#FADBD8",
          }}
          onClick={async () => {
            const command = booking.motorOn ? "motor_off" : "motor_on";
            await fetch("/api/iot", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                command,
                vehicleId: vehicle.id,
                bookingId: booking.id,
              }),
            });
            toggleMotor(booking.id);
            setToast(booking.motorOn ? "Motor OFF" : "Motor ON");
          }}
        >
          <span className="text-3xl">{booking.motorOn ? "⚡" : "🔒"}</span>
          <span className="font-bold">
            Motor is {booking.motorOn ? "ON" : "OFF"}
          </span>
          <span className="text-xs" style={{ color: "var(--text2)" }}>
            Timer keeps running either way
          </span>
        </button>
      ) : (
        <div className="card text-sm" style={{ color: "var(--text2)" }}>
          Key / bicycle mode — control the vehicle physically. App tracks time
          and support only.
        </div>
      )}

      <button type="button" className="btn-danger" onClick={() => setReturnStep(1)}>
        End ride / return
      </button>

      <button
        type="button"
        className="fixed bottom-[100px] right-4 z-[150] flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white shadow-lg"
        style={{
          background: "linear-gradient(135deg,#DC2626,#B91C1C)",
          right: "max(1rem, calc(50% - 215px + 1rem))",
        }}
        onClick={() => setSos(true)}
      >
        SOS
      </button>

      {sos ? (
        <>
          <div
            className="fixed inset-0 z-[179] bg-black/40"
            onClick={() => setSos(false)}
          />
          <div
            className="fixed bottom-0 left-1/2 z-[180] w-full max-w-[430px] -translate-x-1/2 rounded-t-3xl p-5 pb-8"
            style={{ background: "var(--card)" }}
          >
            <div className="font-display text-lg font-semibold">Emergency</div>
            <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
              Location shared (mock): {op.lat.toFixed(4)}, {op.lng.toFixed(4)}
            </p>
            <a className="btn-primary !mx-0 !w-full" href="tel:118">
              Call ambulance (118)
            </a>
            <a className="btn-secondary !mx-0 !w-full" href={`tel:${op.phone}`}>
              Call operator
            </a>
            <a
              className="btn-secondary !mx-0 !w-full"
              href={`https://wa.me/${op.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp support
            </a>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold" style={{ color: "var(--primary)" }}>
        {value}
      </div>
      <div className="text-[11px]" style={{ color: "var(--text2)" }}>
        {label}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex justify-between border-b border-dashed py-2.5 text-sm"
      style={{ borderColor: "var(--border)" }}
    >
      <span style={{ color: "var(--text2)" }}>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

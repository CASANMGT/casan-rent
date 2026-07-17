"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { ContactActions } from "@/components/ContactActions";
import { AuthGate } from "@/components/AuthGate";
import { useAppStore } from "@/lib/store";
import { batteryPctLabel, keysAccessLabel } from "@/lib/format";
import { modelBatteryLabel } from "@/lib/catalog";
import { IS_DEMO } from "@/lib/demo";
import { CollectWindow } from "@/components/UxSignals";

export default function HandoverPage() {
  return (
    <AuthGate role="rider">
      <HandoverInner />
    </AuthGate>
  );
}

function HandoverInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const bookings = useAppStore((s) => s.bookings);
  const vehicles = useAppStore((s) => s.vehicles);
  const models = useAppStore((s) => s.models);
  const sites = useAppStore((s) => s.sites);
  const operators = useAppStore((s) => s.operators);
  const startRide = useAppStore((s) => s.startRide);
  const givePhysicalKey = useAppStore((s) => s.givePhysicalKey);
  const setToast = useAppStore((s) => s.setToast);
  const [simulating, setSimulating] = useState(false);

  const booking = bookings.find((b) => b.id === id);
  const vehicle = vehicles.find((v) => v.id === booking?.vehicleId);
  const model = models.find((m) => m.id === booking?.modelId);
  const site = sites.find((s) => s.id === booking?.siteId);
  const op = operators.find((o) => o.id === booking?.operatorId);

  if (!booking || !vehicle) {
    return (
      <div>
        <Header title="Key handover" backHref="/history" />
        <p className="p-6 text-sm" style={{ color: "var(--text2)" }}>
          Booking not found. Check your trips in History.
        </p>
      </div>
    );
  }

  const keys = booking.keysAccess ?? "physical";
  const dual = keys === "both";
  const needsPhys = keys === "physical" || keys === "both";
  const keyReady = !needsPhys || booking.physicalKeyGiven;

  return (
    <div>
      <Header
        title={dual ? "Key handover + app" : "Key handover"}
        backHref={`/book/${id}/confirmed`}
      />
      {!booking.startsAt ? <CollectWindow booking={booking} /> : null}
      <div className="card text-center">
        <div className="text-5xl">{vehicle.emoji}</div>
        <div className="mt-3 font-bold">{vehicle.name}</div>
        <div className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
          Unit {vehicle.code}
          {site ? ` · ${site.name}` : ""}
        </div>
        <div
          className="mt-2 text-xs font-semibold"
          style={{ color: "var(--primary)" }}
        >
          {keysAccessLabel(keys)}
        </div>
        <div className="mt-2 text-xs" style={{ color: "var(--text2)" }}>
          {vehicle.vehicleType === "bicycle"
            ? "Pedal bike · no battery"
            : `Battery: ${batteryPctLabel(vehicle.batteryPct, vehicle.vehicleType)}${
                model ? ` · ${modelBatteryLabel(model)}` : ""
              }`}
        </div>
      </div>

      <div className="card text-sm">
        <div className="font-bold">At the hub counter</div>
        <ol
          className="mt-2 list-decimal space-y-1.5 pl-4"
          style={{ color: "var(--text2)" }}
        >
          <li>
            Show code{" "}
            <strong style={{ color: "var(--text)" }}>{booking.code}</strong> to
            staff
          </li>
          {needsPhys ? (
            <li>
              Staff must{" "}
              <strong style={{ color: "var(--text)" }}>
                give you the physical key
              </strong>{" "}
              (they tap “Give key” in their app)
            </li>
          ) : null}
          {dual ? (
            <li>
              Then use the{" "}
              <strong style={{ color: "var(--text)" }}>app digital key</strong>{" "}
              for motor control
            </li>
          ) : null}
        </ol>
        {needsPhys && !booking.physicalKeyGiven ? (
          <div
            className="mt-3 rounded-xl border p-3 text-xs"
            style={{ borderColor: "var(--warn)", background: "#FEF5E7" }}
          >
            Waiting for hub staff to hand over the physical key…
            <br />
            <span style={{ color: "var(--text2)" }}>
              Staff must confirm “Give key” in the operator app before you can
              start.
            </span>
            {IS_DEMO ? (
            <button
              type="button"
              className="mt-2 w-full rounded-xl py-2.5 text-xs font-bold text-white"
              style={{
                background: "var(--primary)",
                opacity: simulating ? 0.6 : 1,
              }}
              disabled={simulating}
              onClick={() => {
                setSimulating(true);
                setToast("Staff is handing over the key…");
                window.setTimeout(() => {
                  givePhysicalKey(booking!.id);
                  setSimulating(false);
                }, 1200);
              }}
            >
              {simulating
                ? "Staff handing over key…"
                : "Demo: simulate staff gives key"}
            </button>
            ) : null}
          </div>
        ) : needsPhys && booking.physicalKeyGiven ? (
          <div
            className="mt-3 rounded-xl border p-3 text-xs"
            style={{ borderColor: "var(--ok)", background: "#E8F8F5" }}
          >
            Physical key received ✓
            {booking.status === "active"
              ? " — rental already started"
              : ""}
          </div>
        ) : null}
      </div>

      {needsPhys && !booking.physicalKeyGiven && op ? (
        <div className="card">
          <div className="mb-2 font-bold text-sm">
            Staff not around? Contact the shop
          </div>
          <ContactActions
            phone={op.phone}
            email={op.email}
            name={op.name}
            bookingCode={booking.code}
          />
        </div>
      ) : null}

      {booking.status === "active" ? (
        <button
          type="button"
          className="btn-primary"
          onClick={() => router.push(`/ride/${booking.id}`)}
        >
          Open active ride
        </button>
      ) : (
        <button
          type="button"
          className="btn-primary"
          disabled={!keyReady}
          style={{ opacity: keyReady ? 1 : 0.5 }}
          onClick={() => {
            if (!keyReady) {
              setToast("Ask staff to give you the physical key first");
              return;
            }
            startRide(booking.id);
            setToast(
              dual
                ? "Ride started — physical key + app ready"
                : "Ride started — timer running",
            );
            router.push(`/ride/${booking.id}`);
          }}
        >
          {keyReady
            ? dual
              ? "Key collected — start ride"
              : "I've got the key — start timer"
            : "Waiting for staff key…"}
        </button>
      )}
    </div>
  );
}

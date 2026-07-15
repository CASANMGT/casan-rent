"use client";

import Link from "next/link";
import {
  formatDistance,
  formatIdrShort,
  haversineKm,
  modeLabel,
  USER_LAT,
  USER_LNG,
  vehicleTypeLabel,
} from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";
import { useMemo, useState } from "react";
import type { VehicleType } from "@/lib/types";
import { Bell } from "lucide-react";

type Tab = "map" | "operators" | "vehicles" | "saved";

export default function RiderHomePage() {
  const operators = useAppStore((s) => s.operators);
  const vehicles = useAppStore((s) => s.vehicles);
  const bookings = useAppStore((s) => s.bookings);
  const favorites = useAppStore((s) => s.favorites);
  const notifications = useAppStore((s) => s.notifications);
  const [tab, setTab] = useState<Tab>("map");
  const [typeFilter, setTypeFilter] = useState<VehicleType | "all">("all");
  const [query, setQuery] = useState("");

  const active = bookings.find((b) => b.status === "active");
  const unread = notifications.filter((n) => !n.read).length;

  const available = useMemo(() => {
    return vehicles.filter((v) => {
      if (v.status !== "available") return false;
      if (typeFilter !== "all" && v.vehicleType !== typeFilter) return false;
      const op = operators.find((o) => o.id === v.operatorId);
      const hay = `${v.name} ${op?.name ?? ""} ${v.code}`.toLowerCase();
      return hay.includes(query.toLowerCase());
    });
  }, [vehicles, operators, typeFilter, query]);

  const opsFiltered = useMemo(() => {
    return operators
      .filter((o) =>
        `${o.name} ${o.address}`.toLowerCase().includes(query.toLowerCase()),
      )
      .map((o) => ({
        ...o,
        dist: haversineKm(USER_LAT, USER_LNG, o.lat, o.lng),
        count: vehicles.filter(
          (v) => v.operatorId === o.id && v.status === "available",
        ).length,
      }))
      .sort((a, b) => a.dist - b.dist);
  }, [operators, vehicles, query]);

  return (
    <div className="content-pad">
      {active ? (
        <Link
          href={`/ride/${active.id}`}
          className="flex items-center gap-3 px-4 py-3.5 text-white"
          style={{
            background:
              "linear-gradient(135deg, var(--primary), var(--primary-light))",
          }}
        >
          <span className="text-2xl">🚲</span>
          <div className="flex-1">
            <div className="text-xs text-white/85">Active rental</div>
            <div className="text-lg font-bold tabular-nums">
              Tap to open ride
            </div>
          </div>
          <span className="text-2xl opacity-70">›</span>
        </Link>
      ) : null}

      <header
        className="px-5 py-4 text-white"
        style={{
          background:
            "linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)",
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold">Casan Rent</h1>
            <p className="text-xs text-white/85">Multi-operator mobility</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/20"
            >
              <Bell size={18} />
              {unread > 0 ? (
                <span
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ background: "var(--danger)" }}
                >
                  {unread}
                </span>
              ) : null}
            </Link>
            <Link
              href="/profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm"
            >
              👤
            </Link>
          </div>
        </div>
      </header>

      <div
        className="mx-4 mt-3 flex items-center gap-2 rounded-xl px-3 py-3 shadow-sm"
        style={{ background: "var(--card)" }}
      >
        <span style={{ color: "var(--text2)" }}>⌕</span>
        <input
          className="w-full border-none bg-transparent text-[15px] outline-none"
          placeholder="Search location, hotel, vehicle…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div
        className="mx-4 mt-3 flex gap-1 rounded-xl p-1"
        style={{ background: "var(--card)" }}
      >
        {(["map", "operators", "vehicles", "saved"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className="flex-1 rounded-lg py-2.5 text-xs font-semibold capitalize"
            style={{
              background: tab === t ? "var(--primary)" : "transparent",
              color: tab === t ? "white" : "var(--text2)",
            }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "map" || tab === "vehicles" ? (
        <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {(
            [
              ["all", "All"],
              ["bicycle", "Bicycle"],
              ["ebike", "E-Bike"],
              ["emoped", "E-Moped"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className="whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold"
              style={{
                borderColor: typeFilter === id ? "var(--primary)" : "var(--border)",
                background:
                  typeFilter === id ? "color-mix(in srgb, var(--primary) 12%, white)" : "var(--card)",
                color: typeFilter === id ? "var(--primary)" : "var(--text)",
              }}
              onClick={() => setTypeFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {tab === "map" ? (
        <div className="anim-fade-up">
          <div
            className="relative mx-4 mt-3 h-52 overflow-hidden rounded-2xl"
            style={{
              background:
                "linear-gradient(145deg, #b8d4ce 0%, #9bc4bb 40%, #d4e8e2 100%)",
            }}
          >
            {opsFiltered.map((op, i) => (
              <Link
                key={op.id}
                href={`/operators/${op.id}`}
                className="absolute flex h-9 w-9 items-center justify-center rounded-full text-lg shadow"
                style={{
                  top: `${28 + i * 18}%`,
                  left: `${20 + i * 22}%`,
                  background: "var(--primary)",
                  color: "white",
                }}
                title={op.name}
              >
                📍
              </Link>
            ))}
            <div
              className="absolute h-4 w-4 rounded-full border-[3px] border-white"
              style={{
                top: "62%",
                left: "48%",
                background: "var(--digital)",
                boxShadow: "0 0 0 4px rgba(40,116,166,0.25)",
              }}
            />
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${opsFiltered[0]?.lat},${opsFiltered[0]?.lng}`}
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-2 text-xs font-semibold shadow"
            >
              Directions
            </a>
          </div>
          <p className="section-label">Nearby operators</p>
          {opsFiltered.slice(0, 3).map((op) => (
            <OperatorRow
              key={op.id}
              id={op.id}
              emoji={op.emoji}
              name={op.name}
              address={op.address}
              meta={`${op.count} available · ${op.supportsFrontDesk ? "Desk" : ""}${op.supportsFrontDesk && op.supportsSelfService ? " + " : ""}${op.supportsSelfService ? "Self-service" : ""}`}
              distance={formatDistance(op.dist)}
            />
          ))}
        </div>
      ) : null}

      {tab === "operators" ? (
        <div className="anim-fade-up mt-2">
          {opsFiltered.map((op) => (
            <OperatorRow
              key={op.id}
              id={op.id}
              emoji={op.emoji}
              name={op.name}
              address={op.address}
              meta={`${op.count} vehicles available`}
              distance={formatDistance(op.dist)}
            />
          ))}
        </div>
      ) : null}

      {tab === "vehicles" || tab === "map" ? null : null}
      {tab === "vehicles" ? (
        <div className="anim-fade-up mt-2">
          {available.map((v) => {
            const op = operators.find((o) => o.id === v.operatorId);
            const dist = op
              ? formatDistance(haversineKm(USER_LAT, USER_LNG, v.lat, v.lng))
              : "";
            return (
              <Link
                key={v.id}
                href={`/vehicles/${v.id}`}
                className="mx-4 mb-2.5 flex gap-3 rounded-2xl p-3.5 shadow-sm"
                style={{ background: "var(--card)" }}
              >
                <div
                  className="flex h-[90px] w-[90px] shrink-0 items-center justify-center rounded-xl text-4xl"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--primary-light), var(--primary))",
                  }}
                >
                  {v.emoji}
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="font-bold">{v.name}</div>
                    <div className="text-xs" style={{ color: "var(--text2)" }}>
                      {op?.name} · {dist} · {vehicleTypeLabel(v.vehicleType)} ·{" "}
                      {modeLabel(v.rentalMode)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="font-bold" style={{ color: "var(--primary)" }}>
                      {formatIdrShort(v.pricePerHour)}
                      <span className="text-xs font-normal" style={{ color: "var(--text2)" }}>
                        /hr
                      </span>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ background: "#E8F8F5", color: "var(--ok)" }}
                    >
                      Available
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}

      {tab === "saved" ? (
        <div className="anim-fade-up mt-2">
          {favorites.map((id) => {
            const v = vehicles.find((x) => x.id === id);
            const op = operators.find((x) => x.id === id);
            if (v) {
              return (
                <Link
                  key={id}
                  href={`/vehicles/${v.id}`}
                  className="mx-4 mb-2.5 flex gap-3 rounded-2xl p-3.5"
                  style={{ background: "var(--card)" }}
                >
                  <div className="text-4xl">{v.emoji}</div>
                  <div>
                    <div className="font-bold">{v.name}</div>
                    <div className="text-xs" style={{ color: "var(--text2)" }}>
                      Saved vehicle · {vehicleTypeLabel(v.vehicleType)}
                    </div>
                  </div>
                </Link>
              );
            }
            if (op) {
              return (
                <Link
                  key={id}
                  href={`/operators/${op.id}`}
                  className="mx-4 mb-2.5 flex gap-3 rounded-2xl p-3.5"
                  style={{ background: "var(--card)" }}
                >
                  <div className="text-4xl">{op.emoji}</div>
                  <div>
                    <div className="font-bold">{op.name}</div>
                    <div className="text-xs" style={{ color: "var(--text2)" }}>
                      Saved operator
                    </div>
                  </div>
                </Link>
              );
            }
            return null;
          })}
        </div>
      ) : null}

      {tab === "map" ? (
        <div className="mt-2">
          <p className="section-label">Available nearby</p>
          {available.slice(0, 3).map((v) => {
            const op = operators.find((o) => o.id === v.operatorId);
            return (
              <Link
                key={v.id}
                href={`/vehicles/${v.id}`}
                className="mx-4 mb-2.5 flex gap-3 rounded-2xl p-3.5"
                style={{ background: "var(--card)" }}
              >
                <div className="text-3xl">{v.emoji}</div>
                <div className="flex-1">
                  <div className="font-bold text-sm">{v.name}</div>
                  <div className="text-xs" style={{ color: "var(--text2)" }}>
                    {vehicleTypeLabel(v.vehicleType)} · {op?.name}
                  </div>
                </div>
                <div className="text-sm font-bold" style={{ color: "var(--primary)" }}>
                  {formatIdrShort(v.pricePerHour)}
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}

      <BottomNav variant="rider" />
    </div>
  );
}

function OperatorRow({
  id,
  emoji,
  name,
  address,
  meta,
  distance,
}: {
  id: string;
  emoji: string;
  name: string;
  address: string;
  meta: string;
  distance: string;
}) {
  return (
    <Link
      href={`/operators/${id}`}
      className="mx-4 mb-2.5 flex gap-3 rounded-2xl p-3.5 shadow-sm"
      style={{ background: "var(--card)" }}
    >
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl text-white"
        style={{
          background: "linear-gradient(135deg, var(--primary), var(--primary-light))",
        }}
      >
        {emoji}
      </div>
      <div className="flex-1">
        <div className="font-bold">{name}</div>
        <div className="text-xs" style={{ color: "var(--text2)" }}>
          {address}
        </div>
        <div className="mt-1 text-xs font-semibold" style={{ color: "var(--primary)" }}>
          {meta}
        </div>
      </div>
      <div className="text-right text-xs" style={{ color: "var(--text2)" }}>
        <div>{distance}</div>
        <div
          className="mt-1 inline-flex rounded-full px-2 py-0.5 font-semibold"
          style={{ background: "#E8F8F5", color: "var(--ok)" }}
        >
          Open
        </div>
      </div>
    </Link>
  );
}

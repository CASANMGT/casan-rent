"use client";

import Link from "next/link";
import {
  formatDistance,
  formatIdrShort,
  haversineKm,
  modeLabel,
  batteryPctLabel,
  osmBrowseUrl,
  USER_LAT,
  USER_LNG,
} from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";
import { AuthGate } from "@/components/AuthGate";
import { useMemo, useState } from "react";
import type { VehicleType } from "@/lib/types";
import { Bell, List, Map as MapIcon, Search, User } from "lucide-react";
import {
  listAllModels,
  modelBatteryLabel,
  operatorRatingStats,
} from "@/lib/catalog";
import { MockMap } from "@/components/MockMap";

type Tab = "vehicles" | "operators";

export default function RiderHomePage() {
  return (
    <AuthGate role="rider">
      <HomeInner />
    </AuthGate>
  );
}

function HomeInner() {
  const operators = useAppStore((s) => s.operators);
  const models = useAppStore((s) => s.models);
  const vehicles = useAppStore((s) => s.vehicles);
  const bookings = useAppStore((s) => s.bookings);
  const notifications = useAppStore((s) => s.notifications);
  const reviews = useAppStore((s) => s.reviews);
  const [tab, setTab] = useState<Tab>("vehicles");
  const [hubView, setHubView] = useState<"list" | "map">("list");
  const [typeFilter, setTypeFilter] = useState<VehicleType | "all">("all");
  const [query, setQuery] = useState("");

  const active = bookings.find(
    (b) => b.status === "active" || b.status === "overdue",
  );
  const activeVehicle = vehicles.find((v) => v.id === active?.vehicleId);
  const unread = notifications.filter((n) => !n.read).length;

  const opNames = useMemo(
    () => Object.fromEntries(operators.map((o) => [o.id, o.name])),
    [operators],
  );

  const modelListings = useMemo(() => {
    const distByOp = Object.fromEntries(
      operators.map((o) => [
        o.id,
        haversineKm(USER_LAT, USER_LNG, o.lat, o.lng),
      ]),
    );
    // Nearest hub first — new users read the list top-down by distance.
    return listAllModels(
      models,
      vehicles,
      typeFilter,
      query,
      opNames,
    )
      .filter((m) => m.availableCount > 0)
      .sort(
        (a, b) =>
          (distByOp[a.model.operatorId] ?? Infinity) -
          (distByOp[b.model.operatorId] ?? Infinity),
      );
  }, [models, vehicles, typeFilter, query, opNames, operators]);

  const opsFiltered = useMemo(() => {
    return operators
      .filter((o) =>
        `${o.name} ${o.address}`.toLowerCase().includes(query.toLowerCase()),
      )
      .map((o) => {
        const rating = operatorRatingStats(o.id, bookings, reviews);
        return {
          ...o,
          dist: haversineKm(USER_LAT, USER_LNG, o.lat, o.lng),
          count: vehicles.filter(
            (v) => v.operatorId === o.id && v.status === "available",
          ).length,
          rating,
        };
      })
      .sort((a, b) => a.dist - b.dist);
  }, [operators, vehicles, query, bookings, reviews]);

  return (
    <div className="content-pad">
      {active ? (
        <Link
          href={`/ride/${active.id}`}
          className="flex items-center gap-3 px-4 py-3.5 text-white"
          style={{
            background:
              active.status === "overdue"
                ? "linear-gradient(135deg, #c0392b, #e74c3c)"
                : "linear-gradient(135deg, var(--primary), var(--primary-light))",
          }}
        >
          <span className="text-2xl">{activeVehicle?.emoji ?? "🚲"}</span>
          <div className="flex-1">
            <div className="text-xs text-white/85">
              {active.status === "overdue" ? "Overdue — return now" : "Active rental"}
            </div>
            <div className="text-base font-bold">
              {activeVehicle?.name ?? "Open ride"} · {activeVehicle?.code}
            </div>
            <div className="text-[11px] text-white/80">
              {active.durationLabel} · tap to control
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
            <p className="text-xs text-white/85">
              Kost & campus e-bikes · Jakarta first
            </p>
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
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20"
            >
              <User size={18} />
            </Link>
          </div>
        </div>
      </header>

      <div
        className="mx-4 mt-3 flex items-center gap-2 rounded-xl px-3 py-3 shadow-sm"
        style={{ background: "var(--card)" }}
      >
        <Search size={18} style={{ color: "var(--text2)" }} />
        <input
          className="w-full border-none bg-transparent text-[15px] outline-none"
          placeholder="Search kost hub, model, operator…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div
        className="mx-4 mt-3 flex gap-1 rounded-xl p-1"
        style={{ background: "var(--card)" }}
      >
        {(
          [
            ["vehicles", "Bikes"],
            ["operators", "Rental hubs"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            className="flex-1 rounded-lg py-2.5 text-xs font-semibold"
            style={{
              background: tab === t ? "var(--primary)" : "transparent",
              color: tab === t ? "white" : "var(--text2)",
            }}
            onClick={() => setTab(t)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "vehicles" ? (
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

      {tab === "operators" ? (
        <div className="anim-fade-up mt-2">
          <div className="mb-2 flex justify-end px-4">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
              style={{
                borderColor: "var(--border)",
                background: "var(--card)",
                color: "var(--primary)",
              }}
              onClick={() =>
                setHubView((v) => (v === "list" ? "map" : "list"))
              }
            >
              {hubView === "list" ? (
                <>
                  <MapIcon size={14} /> Show on map
                </>
              ) : (
                <>
                  <List size={14} /> Show list
                </>
              )}
            </button>
          </div>

          {hubView === "map" ? (
            <div className="relative mx-4 mb-3">
              <MockMap
                height={208}
                mapImage={opsFiltered[0]?.mapImage ?? "/maps/margonda.svg"}
                label="OpenStreetMap · hubs near you"
                userPin={{ top: "62%", left: "48%" }}
                pins={opsFiltered.slice(0, 3).map((op, i) => ({
                  id: op.id,
                  label: op.name,
                  top: `${28 + i * 18}%`,
                  left: `${20 + i * 22}%`,
                  href: `/operators/${op.id}`,
                }))}
              />
              <a
                href={osmBrowseUrl(
                  opsFiltered[0]?.lat ?? USER_LAT,
                  opsFiltered[0]?.lng ?? USER_LNG,
                )}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-3 right-3 z-20 rounded-full bg-white px-3 py-2 text-xs font-semibold shadow"
              >
                Open OSM
              </a>
            </div>
          ) : null}

          {(hubView === "map" ? opsFiltered.slice(0, 5) : opsFiltered).map(
            (op) => (
              <OperatorRow
                key={op.id}
                id={op.id}
                emoji={op.emoji}
                name={op.name}
                address={`${op.city} · ${op.address}`}
                meta={`${op.count} bikes free`}
                ratingAvg={op.rating.count ? op.rating.avg : null}
                distance={formatDistance(op.dist)}
              />
            ),
          )}
        </div>
      ) : null}

      {tab === "vehicles" ? (
        <div className="anim-fade-up mt-2">
          {modelListings.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm" style={{ color: "var(--text2)" }}>
              No models match. Try another type or clear search.
            </p>
          ) : null}
          {modelListings.map(({ model, availableCount, bestBattery }) => {
            const op = operators.find((o) => o.id === model.operatorId);
            const dist = op
              ? formatDistance(haversineKm(USER_LAT, USER_LNG, op.lat, op.lng))
              : "";
            return (
              <Link
                key={model.id}
                href={`/models/${model.id}`}
                className="mx-4 mb-2.5 flex gap-3 rounded-2xl p-3.5 shadow-sm"
                style={{ background: "var(--card)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={model.images[0]}
                  alt=""
                  className="h-[90px] w-[90px] shrink-0 rounded-xl object-cover"
                />
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="font-bold">{model.name}</div>
                    <div className="text-xs" style={{ color: "var(--text2)" }}>
                      {op?.city} · {op?.name} · {dist}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ background: "var(--bg-deep)", color: "var(--primary)" }}
                      >
                        {modelBatteryLabel(model)}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ background: "#E8F8F5", color: "var(--ok)" }}
                      >
                        {batteryPctLabel(bestBattery, model.vehicleType)}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ background: "#FEF5E7", color: "#9A5B00" }}
                      >
                        {modeLabel(model.rentalMode)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <div className="font-bold" style={{ color: "var(--primary)" }}>
                      from {formatIdrShort(model.pricePerHour)}
                      <span className="text-xs font-normal" style={{ color: "var(--text2)" }}>
                        /hr
                      </span>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ background: "#E8F8F5", color: "var(--ok)" }}
                    >
                      {availableCount} left
                    </span>
                  </div>
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
  ratingAvg,
}: {
  id: string;
  emoji: string;
  name: string;
  address: string;
  meta: string;
  distance: string;
  ratingAvg?: number | null;
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
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <span style={{ color: "var(--primary)" }}>{meta}</span>
          {ratingAvg != null ? (
            <span className="inline-flex items-center gap-0.5" style={{ color: "#F4D03F" }}>
              ★ {ratingAvg}
            </span>
          ) : null}
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

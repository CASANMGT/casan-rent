"use client";

import Link from "next/link";
import {
  formatWalkEta,
  formatIdrShort,
  modeLabel,
  batteryPctLabel,
  osmBrowseUrl,
  isSiteOpenNow,
  resolveDiscoveryCoords,
  type DiscoveryPinId,
} from "@/lib/format";
import { useAppStore } from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";
import { AuthGate } from "@/components/AuthGate";
import { useMemo, useState } from "react";
import type { RentalMode, VehicleType } from "@/lib/types";
import {
  Bell,
  Clock,
  List,
  Map as MapIcon,
  MapPin,
  Search,
  User,
  Wallet,
} from "lucide-react";
import {
  listHubs,
  listModelsByHub,
  modelBatteryLabel,
} from "@/lib/catalog";
import { MockMap } from "@/components/MockMap";
import { HomeGuidance, WeatherStrip } from "@/components/UxSignals";

/** Default discovery: hubs (locations). Bikes are secondary. */
type Tab = "hubs" | "vehicles";
type ModeFilter = RentalMode | "all";

const DISCOVERY_PIN_OPTIONS: {
  id: DiscoveryPinId;
  label: string;
}[] = [
  { id: "jakarta", label: "Jakarta / Depok" },
  { id: "bali", label: "Bali" },
  { id: "near_me", label: "Near me" },
];

export default function RiderHomePage() {
  return (
    <AuthGate role="rider">
      <HomeInner />
    </AuthGate>
  );
}

function HomeInner() {
  const user = useAppStore((s) => s.user);
  const operators = useAppStore((s) => s.operators);
  const sites = useAppStore((s) => s.sites);
  const models = useAppStore((s) => s.models);
  const vehicles = useAppStore((s) => s.vehicles);
  const bookings = useAppStore((s) => s.bookings);
  const notifications = useAppStore((s) => s.notifications);
  const reviews = useAppStore((s) => s.reviews);
  const discoveryPin = useAppStore((s) => s.discoveryPin);
  const discoveryGps = useAppStore((s) => s.discoveryGps);
  const setDiscoveryPin = useAppStore((s) => s.setDiscoveryPin);
  const setDiscoveryGps = useAppStore((s) => s.setDiscoveryGps);
  const setToast = useAppStore((s) => s.setToast);
  const [tab, setTab] = useState<Tab>("hubs");
  const [hubView, setHubView] = useState<"list" | "map">("list");
  const [typeFilter, setTypeFilter] = useState<VehicleType | "all">("all");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [locatingPin, setLocatingPin] = useState(false);

  const pin = resolveDiscoveryCoords(discoveryPin, discoveryGps);
  const pinLat = pin.lat;
  const pinLng = pin.lng;

  const active = bookings.find(
    (b) => b.status === "active" || b.status === "overdue",
  );
  const needPay = bookings.find(
    (b) =>
      b.paymentStatus === "pending" &&
      !["active", "completed", "cancelled", "overdue"].includes(b.status),
  );
  const readyCollect = bookings.find(
    (b) =>
      b.paymentStatus === "paid" &&
      (b.status === "confirmed" || b.status === "awaiting_pickup"),
  );
  const activeVehicle = vehicles.find((v) => v.id === active?.vehicleId);
  const unread = notifications.filter((n) => !n.read).length;

  const searchQuery = [query, areaFilter].filter(Boolean).join(" ").trim();

  const hubs = useMemo(
    () =>
      listHubs(
        sites,
        operators,
        vehicles,
        bookings,
        reviews,
        searchQuery,
        pinLat,
        pinLng,
      ),
    [sites, operators, vehicles, bookings, reviews, searchQuery, pinLat, pinLng],
  );

  const modelListings = useMemo(() => {
    const rows = listModelsByHub(
      models,
      vehicles,
      sites,
      operators,
      typeFilter,
      searchQuery,
      pinLat,
      pinLng,
    );
    return modeFilter === "all"
      ? rows
      : rows.filter((row) => row.model.rentalMode === modeFilter);
  }, [
    models,
    vehicles,
    sites,
    operators,
    typeFilter,
    modeFilter,
    searchQuery,
    pinLat,
    pinLng,
  ]);

  function chooseDiscoveryPin(next: DiscoveryPinId) {
    setDiscoveryPin(next);
    if (next !== "near_me") return;
    if (!navigator.geolocation) {
      setToast("Location not available — using Jakarta pin");
      setDiscoveryPin("jakarta");
      return;
    }
    setLocatingPin(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDiscoveryGps({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocatingPin(false);
        setToast("Sorted from your current location");
      },
      () => {
        setLocatingPin(false);
        setToast("Couldn't get GPS — pick Jakarta or Bali");
        setDiscoveryPin("jakarta");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  const areas = useMemo(() => {
    const set = new Set(sites.map((s) => s.area).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [sites]);

  const freeNearby = hubs.reduce((s, h) => s + h.availableCount, 0);
  const nearestHub = hubs[0];
  const needPaySite = sites.find((s) => s.id === needPay?.siteId);
  const readySite = sites.find((s) => s.id === readyCollect?.siteId);
  const walletBalanceIdr = useAppStore((s) => s.walletBalanceIdr);

  return (
    <div className="content-pad">
      <header
        className="relative overflow-hidden px-5 pb-5 pt-4 text-white"
        style={{
          background:
            "linear-gradient(145deg, var(--primary) 0%, var(--primary-light) 55%, #5dade2 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full opacity-20"
          style={{ background: "white" }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-white/85">
              Hi{user.name ? `, ${user.name.split(" ")[0]}` : ""}
            </p>
            <h1 className="font-display mt-0.5 text-[1.75rem] font-semibold leading-tight">
              Casan Rent
            </h1>
            <p className="mt-1 text-xs text-white/90">
              {nearestHub
                ? `${freeNearby} bikes · nearest ${nearestHub.site.name} · ${formatWalkEta(nearestHub.distKm)}${pin.approximate ? ` from ${pin.label}` : ""}`
                : "Find a pickup hub near you"}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href="/wallet"
              className="flex h-9 items-center gap-1 rounded-full bg-white/20 px-2.5 text-xs font-bold"
              aria-label="Casan Wallet"
            >
              <Wallet size={14} />
              {formatIdrShort(walletBalanceIdr).replace(/^Rp\s?/, "")}
            </Link>
            <Link
              href="/notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/20"
              aria-label="Notifications"
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
              aria-label="Profile"
            >
              <User size={18} />
            </Link>
          </div>
        </div>
      </header>

      {active ? (
        <Link
          href={`/ride/${active.id}`}
          className="mx-4 -mt-2 flex items-center gap-3 rounded-2xl px-4 py-3.5 text-white shadow-md"
          style={{
            background:
              active.status === "overdue"
                ? "linear-gradient(135deg, #c0392b, #e74c3c)"
                : "linear-gradient(135deg, #0f766e, var(--primary))",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              models.find((m) => m.id === active.modelId)?.images[0] ??
              "/vehicles/ebike.svg"
            }
            alt=""
            className="h-12 w-12 rounded-xl object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-white/85">
              {active.status === "overdue"
                ? "Overdue — return now"
                : "Your ride is active"}
            </div>
            <div className="truncate text-base font-bold">
              {activeVehicle?.name ?? "Bike"} · {activeVehicle?.code}
            </div>
            <div className="text-[11px] text-white/80">
              {active.durationLabel} · tap to control / return
            </div>
          </div>
          <span className="text-xl opacity-80">›</span>
        </Link>
      ) : null}

      {active && readyCollect ? (
        <Link
          href={`/book/${readyCollect.id}/confirmed`}
          className="mx-4 mt-2 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm"
          style={{ background: "var(--success-soft)", borderColor: "var(--ok)" }}
        >
          <Clock size={16} style={{ color: "var(--ok)" }} />
          <span className="min-w-0 flex-1 font-semibold" style={{ color: "var(--ok)" }}>
            Also ready to collect
            <span className="font-normal" style={{ color: "var(--text2)" }}>
              {" · "}
              {readySite?.name ?? readyCollect.code}
            </span>
          </span>
          <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>
            Open →
          </span>
        </Link>
      ) : null}

      {!active && needPay ? (
        <Link
          href={`/book/${needPay.id}`}
          className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border px-4 py-3"
          style={{ background: "#FEF5E7", borderColor: "var(--warn)" }}
        >
          <Clock size={20} style={{ color: "#9A5B00" }} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold" style={{ color: "#9A5B00" }}>
              Pay to continue
            </div>
            <div className="text-xs" style={{ color: "var(--text2)" }}>
              {needPaySite?.name ?? needPay.code}
              {" · "}
              {needPay.durationLabel}
              {" · "}
              {formatIdrShort(needPay.rentalPriceIdr)}
              {needPay.appointmentAt
                ? ` · ${new Date(needPay.appointmentAt).toLocaleString("id-ID", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : ""}
            </div>
          </div>
          <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>
            Pay →
          </span>
        </Link>
      ) : null}

      {!active && !needPay && readyCollect ? (
        <Link
          href={`/book/${readyCollect.id}/confirmed`}
          className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border px-4 py-3"
          style={{ background: "#E8F8F5", borderColor: "var(--ok)" }}
        >
          <Clock size={20} style={{ color: "var(--ok)" }} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold" style={{ color: "var(--ok)" }}>
              Ready to collect
            </div>
            <div className="text-xs" style={{ color: "var(--text2)" }}>
              {readySite?.name ?? readyCollect.code}
              {readyCollect.appointmentAt
                ? ` · ${new Date(readyCollect.appointmentAt).toLocaleString("id-ID", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : " · go to the hub"}
            </div>
          </div>
          <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>
            Open →
          </span>
        </Link>
      ) : null}

      <WeatherStrip
        city={
          discoveryPin === "bali"
            ? "Bali"
            : (nearestHub?.site.city ?? "Jakarta")
        }
      />
      <HomeGuidance
        city={
          discoveryPin === "bali"
            ? "Bali"
            : (nearestHub?.site.city ?? "Jakarta")
        }
      />

      <div
        className="mx-4 mt-3 flex items-center gap-2 rounded-xl px-3 py-3 shadow-sm"
        style={{ background: "var(--card)" }}
      >
        <Search size={18} style={{ color: "var(--text2)" }} />
        <input
          aria-label="Search pickup hubs, areas, or bike models"
          className="w-full border-none bg-transparent text-[15px] outline-none"
          placeholder="Search hub, area, bike…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <span
          className="shrink-0 self-center text-[10px] font-bold uppercase tracking-wide"
          style={{ color: "var(--text2)" }}
        >
          Sort from
        </span>
        {DISCOVERY_PIN_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold"
            style={{
              borderColor:
                discoveryPin === opt.id ? "var(--primary)" : "var(--border)",
              background:
                discoveryPin === opt.id
                  ? "color-mix(in srgb, var(--primary) 12%, white)"
                  : "var(--card)",
              color: discoveryPin === opt.id ? "var(--primary)" : "var(--text2)",
              opacity: locatingPin && opt.id === "near_me" ? 0.6 : 1,
            }}
            onClick={() => chooseDiscoveryPin(opt.id)}
            disabled={locatingPin && opt.id === "near_me"}
          >
            {opt.id === "near_me" && locatingPin ? "Locating…" : opt.label}
          </button>
        ))}
      </div>

      {areas.length > 1 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
          <button
            type="button"
            className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold"
            style={{
              borderColor: !areaFilter ? "var(--primary)" : "var(--border)",
              background: !areaFilter
                ? "color-mix(in srgb, var(--primary) 12%, white)"
                : "var(--card)",
              color: !areaFilter ? "var(--primary)" : "var(--text2)",
            }}
            onClick={() => setAreaFilter(null)}
          >
            All areas
          </button>
          {areas.map((area) => (
            <button
              key={area}
              type="button"
              className="shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold"
              style={{
                borderColor:
                  areaFilter === area ? "var(--primary)" : "var(--border)",
                background:
                  areaFilter === area
                    ? "color-mix(in srgb, var(--primary) 12%, white)"
                    : "var(--card)",
                color: areaFilter === area ? "var(--primary)" : "var(--text2)",
              }}
              onClick={() =>
                setAreaFilter((prev) => (prev === area ? null : area))
              }
            >
              {area}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className="mx-4 mt-3 flex gap-1 rounded-xl p-1"
        style={{ background: "var(--card)" }}
      >
        {(
          [
            ["hubs", "Hubs"],
            ["vehicles", "Bikes"],
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
        <>
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
                  borderColor:
                    typeFilter === id ? "var(--primary)" : "var(--border)",
                  background:
                    typeFilter === id
                      ? "color-mix(in srgb, var(--primary) 12%, white)"
                      : "var(--card)",
                  color: typeFilter === id ? "var(--primary)" : "var(--text)",
                }}
                onClick={() => setTypeFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
            {(
              [
                ["all", "Any keys"],
                ["digital", "App"],
                ["key_handover", "Physical"],
                ["both", "App + key"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold"
                style={{
                  borderColor:
                    modeFilter === id ? "var(--primary)" : "var(--border)",
                  background:
                    modeFilter === id
                      ? "color-mix(in srgb, var(--primary) 12%, white)"
                      : "var(--card)",
                  color: modeFilter === id ? "var(--primary)" : "var(--text2)",
                }}
                onClick={() => setModeFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {tab === "hubs" ? (
        <div className="anim-fade-up mt-2">
          <div className="mb-2 flex items-center justify-between px-4">
            <p className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
              Hubs · nearest first
            </p>
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
                  <MapIcon size={14} /> Map
                </>
              ) : (
                <>
                  <List size={14} /> List
                </>
              )}
            </button>
          </div>

          {hubView === "map" ? (
            <div className="relative mx-4 mb-3">
              <MockMap
                height={208}
                mapImage={
                  nearestHub?.site.mapImage ??
                  nearestHub?.operator.mapImage ??
                  "/maps/margonda.svg"
                }
                label="Approximate map · demo"
                directionsHref={osmBrowseUrl(
                  nearestHub?.site.lat ?? pinLat,
                  nearestHub?.site.lng ?? pinLng,
                )}
                userPin={{ top: "62%", left: "48%" }}
                pins={hubs.slice(0, 5).map((h, i) => ({
                  id: h.site.id,
                  label: h.site.name,
                  top: `${26 + i * 14}%`,
                  left: `${18 + (i % 3) * 24}%`,
                  href: `/operators/${h.operator.id}?site=${h.site.id}`,
                }))}
              />
            </div>
          ) : null}

          {hubs.length === 0 ? (
            <p
              className="px-6 py-10 text-center text-sm"
              style={{ color: "var(--text2)" }}
            >
              No hubs match. Try an area name like Margonda or Tebet.
            </p>
          ) : null}

          {(hubView === "map" ? hubs.slice(0, 5) : hubs).map((h) => (
            <HubRow
              key={h.site.id}
              operatorId={h.operator.id}
              siteId={h.site.id}
              emoji={h.operator.emoji}
              name={h.site.name}
              operatorName={h.operator.name}
              address={`${h.site.area} · ${h.site.city}`}
              meta={`${h.availableCount} bikes free`}
              hours={h.site.hours}
              openNow={isSiteOpenNow(h.site)}
              ratingAvg={h.ratingAvg}
              distance={formatWalkEta(h.distKm)}
            />
          ))}
        </div>
      ) : null}

      {tab === "vehicles" ? (
        <div className="anim-fade-up mt-2">
          <p
            className="mb-2 px-4 text-xs font-semibold"
            style={{ color: "var(--text2)" }}
          >
            <MapPin size={12} className="mr-1 inline" />
            Near you · sorted by pickup hub
          </p>
          {modelListings.length === 0 ? (
            <p
              className="px-6 py-10 text-center text-sm"
              style={{ color: "var(--text2)" }}
            >
              No bikes match. Try a hub name or clear search.
            </p>
          ) : null}
          {modelListings.map((row) => (
            <Link
              key={`${row.model.id}-${row.siteId}`}
              href={`/models/${row.model.id}?site=${row.siteId}`}
              className="mx-4 mb-2.5 flex gap-3 rounded-2xl p-3 shadow-sm"
              style={{ background: "var(--card)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={row.model.images[0]}
                alt={row.model.name}
                className="h-[96px] w-[96px] shrink-0 rounded-xl object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate font-bold">{row.model.name}</div>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        background: "var(--bg-deep)",
                        color: "var(--primary)",
                      }}
                    >
                      {formatWalkEta(row.distKm)}
                    </span>
                  </div>
                  <div
                    className="mt-0.5 truncate text-xs"
                    style={{ color: "var(--text2)" }}
                  >
                    {row.siteName}
                    <span className="opacity-70"> · {row.operatorName}</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{
                        background: "var(--bg-deep)",
                        color: "var(--primary)",
                      }}
                    >
                      {modelBatteryLabel(row.model)}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: "#E8F8F5", color: "var(--ok)" }}
                    >
                      {batteryPctLabel(row.bestBattery, row.model.vehicleType)}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: "#FEF5E7", color: "#9A5B00" }}
                    >
                      {modeLabel(row.model.rentalMode)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <div
                    className="text-base font-bold"
                    style={{ color: "var(--primary)" }}
                  >
                    {formatIdrShort(row.model.pricePerHour)}
                    <span
                      className="text-xs font-normal"
                      style={{ color: "var(--text2)" }}
                    >
                      /hr
                    </span>
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-xs font-bold"
                    style={{ background: "#E8F8F5", color: "var(--ok)" }}
                  >
                    {row.availableCount} at hub
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      <BottomNav variant="rider" />
    </div>
  );
}

function HubRow({
  operatorId,
  siteId,
  emoji,
  name,
  operatorName,
  address,
  meta,
  hours,
  openNow,
  distance,
  ratingAvg,
}: {
  operatorId: string;
  siteId: string;
  emoji: string;
  name: string;
  operatorName: string;
  address: string;
  meta: string;
  hours: string;
  openNow: boolean;
  distance: string;
  ratingAvg?: number | null;
}) {
  return (
    <Link
      href={`/operators/${operatorId}?site=${siteId}`}
      className="mx-4 mb-2.5 flex gap-3 rounded-2xl p-3.5 shadow-sm"
      style={{ background: "var(--card)" }}
    >
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl text-white"
        style={{
          background:
            "linear-gradient(135deg, var(--primary), var(--primary-light))",
        }}
      >
        {emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-bold">{name}</div>
        <div className="line-clamp-1 text-xs" style={{ color: "var(--text2)" }}>
          {address}
        </div>
        <div className="mt-0.5 truncate text-[11px]" style={{ color: "var(--text2)" }}>
          by {operatorName}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <span style={{ color: "var(--primary)" }}>{meta}</span>
          {ratingAvg != null ? (
            <span
              className="inline-flex items-center gap-0.5"
              style={{ color: "#F4D03F" }}
            >
              ★ {ratingAvg}
            </span>
          ) : null}
        </div>
      </div>
      <div className="shrink-0 text-right text-xs" style={{ color: "var(--text2)" }}>
        <div className="font-bold" style={{ color: "var(--primary)" }}>
          {distance}
        </div>
        <div
          className="mt-1 text-[10px] font-bold"
          style={{ color: openNow ? "var(--ok)" : "var(--text-warn)" }}
        >
          {openNow ? "● Open now" : "● Closed"}
        </div>
        <div
          className="mt-0.5 max-w-[7.5rem] text-[10px] font-semibold leading-tight"
          style={{ color: "var(--text2)" }}
        >
          {hours}
        </div>
      </div>
    </Link>
  );
}

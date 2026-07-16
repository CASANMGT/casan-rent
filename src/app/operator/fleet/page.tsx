"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bike,
  CircleAlert,
  Clock,
  MapPin,
  MessageCircle,
  MoveRight,
  Pencil,
  Plus,
  Tag,
  Trash2,
  Warehouse,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";
import { CityBadge, AreaBadge, OpSection } from "@/components/operator/OperatorUi";
import { useAppStore } from "@/lib/store";
import { formatIdrShort, vehicleTypeLabel } from "@/lib/format";
import { groupSitesByArea, uniqueAreas } from "@/lib/operator-ui";
import type { RentalMode, VehicleStatus, VehicleType } from "@/lib/types";

export default function FleetPage() {
  return (
    <AuthGate role="operator">
      <FleetInner />
    </AuthGate>
  );
}

function FleetInner() {
  const user = useAppStore((s) => s.user);
  const models = useAppStore((s) => s.models);
  const sites = useAppStore((s) => s.sites);
  const vehicles = useAppStore((s) => s.vehicles);
  const pricing = useAppStore((s) => s.pricing);
  const updateVehicleStatus = useAppStore((s) => s.updateVehicleStatus);
  const addVehicle = useAppStore((s) => s.addVehicle);
  const removeVehicle = useAppStore((s) => s.removeVehicle);
  const adjustFleetStock = useAppStore((s) => s.adjustFleetStock);
  const addSite = useAppStore((s) => s.addSite);
  const updateSite = useAppStore((s) => s.updateSite);
  const removeSite = useAppStore((s) => s.removeSite);
  const moveVehicleSite = useAppStore((s) => s.moveVehicleSite);
  const setToast = useAppStore((s) => s.setToast);

  const opId = user.operatorId!;
  const opSites = useMemo(
    () => sites.filter((x) => x.operatorId === opId),
    [sites, opId],
  );
  const opModels = useMemo(
    () => models.filter((m) => m.operatorId === opId),
    [models, opId],
  );
  const fleet = useMemo(
    () => vehicles.filter((v) => v.operatorId === opId),
    [vehicles, opId],
  );

  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | VehicleStatus | "free">("free");
  const [panel, setPanel] = useState<"none" | "add" | "site" | "move">("none");
  const [moveToSite, setMoveToSite] = useState("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("ebike");
  const [rentalMode, setRentalMode] = useState<RentalMode>("both");
  const [pricePerHour, setPricePerHour] = useState(50000);
  const [addSiteId, setAddSiteId] = useState("");
  const [modelPick, setModelPick] = useState("");

  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [siteCity, setSiteCity] = useState("");
  const [siteArea, setSiteArea] = useState("");
  const [siteHours, setSiteHours] = useState("07:00 - 20:00");
  const [siteWhatsapp, setSiteWhatsapp] = useState("");
  const [siteInfo, setSiteInfo] = useState("");
  const [siteLat, setSiteLat] = useState("");
  const [siteLng, setSiteLng] = useState("");
  const [siteDesk, setSiteDesk] = useState(true);
  const [siteSelf, setSiteSelf] = useState(true);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const operators = useAppStore((s) => s.operators);
  const op = operators.find((o) => o.id === opId);
  const areas = uniqueAreas(opSites);
  const sitesByArea = groupSitesByArea(opSites);
  const validSiteIds = useMemo(
    () => new Set(opSites.map((site) => site.id)),
    [opSites],
  );
  const isUnassigned = (siteId: string) => !validSiteIds.has(siteId);

  const locationSummaries = useMemo(
    () => [
      ...opSites.map((site) => {
        const units = fleet.filter((v) => v.siteId === site.id);
        return {
          id: site.id,
          site,
          total: units.length,
          free: units.filter((v) => v.status === "available").length,
          onRent: units.filter((v) => v.status === "rented").length,
          attention: units.filter((v) => v.status === "maintenance").length,
          bicycles: units.filter((v) => v.vehicleType === "bicycle").length,
          ebikes: units.filter((v) => v.vehicleType === "ebike").length,
          emopeds: units.filter((v) => v.vehicleType === "emoped").length,
        };
      }),
      {
        id: "unassigned",
        site: null,
        total: fleet.filter((v) => isUnassigned(v.siteId)).length,
        free: fleet.filter(
          (v) => isUnassigned(v.siteId) && v.status === "available",
        ).length,
        onRent: fleet.filter(
          (v) => isUnassigned(v.siteId) && v.status === "rented",
        ).length,
        attention: fleet.filter(
          (v) => isUnassigned(v.siteId) && v.status === "maintenance",
        ).length,
        bicycles: fleet.filter(
          (v) => isUnassigned(v.siteId) && v.vehicleType === "bicycle",
        ).length,
        ebikes: fleet.filter(
          (v) => isUnassigned(v.siteId) && v.vehicleType === "ebike",
        ).length,
        emopeds: fleet.filter(
          (v) => isUnassigned(v.siteId) && v.vehicleType === "emoped",
        ).length,
      },
    ],
    [fleet, opSites, validSiteIds],
  );

  const activeSiteId = addSiteId || opSites[0]?.id || "";
  const hourPrice = pricing[opId]?.[1]?.priceIdr;

  const freeEverywhere = fleet.filter((v) => v.status === "available").length;

  useEffect(() => {
    if (siteFilter !== "all") return;
    if (opSites[0]?.id) setSiteFilter(opSites[0].id);
  }, [opSites, siteFilter]);

  const list = useMemo(() => {
    return fleet
      .filter((v) => {
        if (siteFilter === "all") return true;
        if (siteFilter === "unassigned") return isUnassigned(v.siteId);
        return v.siteId === siteFilter;
      })
      .filter((v) => {
        if (filter === "all") return true;
        if (filter === "free") return v.status === "available";
        return v.status === filter;
      })
      .filter((v) =>
        `${v.name} ${v.code}`.toLowerCase().includes(q.toLowerCase()),
      )
      .sort((a, b) => {
        // Free bikes first
        if (a.status === "available" && b.status !== "available") return -1;
        if (b.status === "available" && a.status !== "available") return 1;
        return a.name.localeCompare(b.name);
      });
  }, [fleet, siteFilter, validSiteIds, filter, q]);

  function submitAdd() {
    if (!opId || !activeSiteId) {
      setToast("Create a place first");
      return;
    }
    if (modelPick) {
      const err = adjustFleetStock({
        modelId: modelPick,
        siteId: activeSiteId,
        delta: 1,
      });
      if (err) setToast(err);
      else setToast("Bike +1");
      setPanel("none");
      return;
    }
    if (!name.trim() || !code.trim()) {
      setToast("Name and code required");
      return;
    }
    addVehicle({
      operatorId: opId,
      siteId: activeSiteId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      vehicleType,
      rentalMode: vehicleType === "bicycle" ? "key_handover" : rentalMode,
      pricePerHour,
      batteryPct: vehicleType === "bicycle" ? null : 90,
    });
    setToast("Bike added");
    setPanel("none");
    setName("");
    setCode("");
    setModelPick("");
  }

  function clearSiteForm() {
    setSiteName("");
    setSiteAddress("");
    setSiteCity("");
    setSiteArea("");
    setSiteHours("07:00 - 20:00");
    setSiteWhatsapp("");
    setSiteInfo("");
    setSiteLat(op ? String(op.lat) : "");
    setSiteLng(op ? String(op.lng) : "");
    setSiteDesk(true);
    setSiteSelf(true);
    setEditingSiteId(null);
  }

  function openAddSite() {
    clearSiteForm();
    setPanel("site");
  }

  function openEditSite(siteId: string) {
    const site = opSites.find((x) => x.id === siteId);
    if (!site) return;
    setSiteName(site.name);
    setSiteAddress(site.address);
    setSiteCity(site.city);
    setSiteArea(site.area);
    setSiteHours(site.hours);
    setSiteWhatsapp(site.whatsapp ?? op?.phone ?? "");
    setSiteInfo(site.storeInfo ?? "");
    setSiteLat(String(site.lat));
    setSiteLng(String(site.lng));
    setSiteDesk(site.supportsFrontDesk);
    setSiteSelf(site.supportsSelfService);
    setEditingSiteId(site.id);
    setPanel("site");
  }

  function submitSite() {
    if (!opId) return;
    const lat = Number(siteLat);
    const lng = Number(siteLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setToast("Valid latitude and longitude required");
      return;
    }
    if (editingSiteId) {
      const err = updateSite(editingSiteId, {
        name: siteName,
        address: siteAddress,
        city: siteCity,
        area: siteArea,
        lat,
        lng,
        hours: siteHours,
        whatsapp: siteWhatsapp,
        storeInfo: siteInfo,
        supportsFrontDesk: siteDesk,
        supportsSelfService: siteSelf,
      });
      if (err) {
        setToast(err);
        return;
      }
      setToast("Location updated");
      clearSiteForm();
      setPanel("none");
      return;
    }
    const site = addSite({
      operatorId: opId,
      name: siteName,
      address: siteAddress,
      city: siteCity || op?.city,
      area: siteArea || siteName.trim(),
      lat,
      lng,
      hours: siteHours,
      whatsapp: siteWhatsapp || op?.phone,
      storeInfo: siteInfo,
      supportsFrontDesk: siteDesk,
      supportsSelfService: siteSelf,
    });
    if (!site) {
      setToast("Place name required");
      return;
    }
    setToast(`Place “${site.name}” added`);
    setSiteFilter(site.id);
    setAddSiteId(site.id);
    clearSiteForm();
    setPanel("none");
  }

  function moveAllFreeTo(targetSiteId: string) {
    const free = fleet.filter(
      (v) =>
        v.status === "available" &&
        (siteFilter === "all" ||
          (siteFilter === "unassigned"
            ? isUnassigned(v.siteId)
            : v.siteId === siteFilter)) &&
        v.siteId !== targetSiteId,
    );
    if (free.length === 0) {
      setToast("No free bikes to move");
      return;
    }
    const target = opSites.find((site) => site.id === targetSiteId);
    if (
      !window.confirm(
        `Move ${free.length} ready bikes to ${target?.name ?? "this location"}?`,
      )
    ) {
      return;
    }
    free.forEach((v) => moveVehicleSite(v.id, targetSiteId));
    setToast(`Moved ${free.length} free bikes`);
    setSiteFilter(targetSiteId);
    setPanel("none");
  }

  return (
    <div className="content-pad">
      <Header
        title="Sepeda · Bikes"
        right={
          <div className="flex gap-2">
            <Link href="/operator/pricing" className="flex items-center gap-1 text-xs font-bold text-white">
              <Tag size={14} />
              Harga
            </Link>
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-bold text-white"
              onClick={() => {
                if (panel === "site" && !editingSiteId) {
                  setPanel("none");
                } else {
                  openAddSite();
                }
              }}
            >
              <MapPin size={14} />
              Tempat
            </button>
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-bold text-white"
              onClick={() => setPanel((p) => (p === "add" ? "none" : "add"))}
            >
              <Plus size={14} />
              {panel === "add" ? "Tutup" : "Tambah"}
            </button>
          </div>
        }
      />

      <div
        className="mx-4 mt-3 rounded-2xl p-4 text-white"
        style={{
          background: "linear-gradient(135deg, var(--primary), var(--primary-light))",
        }}
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-white/85">
          <Bike size={16} />
          Sepeda siap sekarang
        </div>
        <div className="font-display mt-1 text-4xl font-bold">{freeEverywhere}</div>
        <div className="mt-1 text-xs text-white/90">
          dari {fleet.length} total
          {areas.length > 1 ? ` · ${areas.length} area Jakarta` : ""}
          {hourPrice != null ? ` · ${formatIdrShort(hourPrice)}/jam` : ""}
        </div>
      </div>

      <OpSection
        icon={Warehouse}
        title="Sepeda per lokasi"
        hint="Tap a location to see and manage its bikes"
      />
      <div className="mx-4 grid grid-cols-1 gap-2">
        {locationSummaries.map((row) => {
          const selected = siteFilter === row.id;
          const unassigned = row.id === "unassigned";
          return (
            <button
              key={row.id}
              type="button"
              className="rounded-2xl border p-3.5 text-left transition active:scale-[0.99]"
              style={{
                background: unassigned
                  ? row.total > 0
                    ? "#FEF5E7"
                    : "var(--card)"
                  : "var(--card)",
                borderColor: selected
                  ? "var(--primary)"
                  : unassigned && row.total > 0
                    ? "var(--warn)"
                    : "var(--border)",
                borderWidth: selected ? 2 : 1,
              }}
              onClick={() => {
                setSiteFilter((current) =>
                  current === row.id ? "all" : row.id,
                );
                setFilter("all");
                if (row.site) setAddSiteId(row.site.id);
              }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: unassigned
                      ? "#FDEBD0"
                      : "color-mix(in srgb, var(--primary) 10%, white)",
                    color: unassigned ? "var(--warn)" : "var(--primary)",
                  }}
                >
                  {unassigned ? (
                    <CircleAlert size={20} />
                  ) : (
                    <MapPin size={20} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm">
                        {row.site?.name ?? "Belum ada lokasi · Unassigned"}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--text2)" }}
                      >
                        {row.site
                          ? `${row.site.area} · ${row.site.city}`
                          : row.total > 0
                            ? "Assign these bikes before renting"
                            : "All bikes have a location"}
                      </div>
                      {row.site ? (
                        <div
                          className="mt-0.5 line-clamp-1 text-[10px]"
                          style={{ color: "var(--text2)" }}
                        >
                          {row.site.address} · {row.site.hours}
                        </div>
                      ) : null}
                    </div>
                    <span className="text-2xl font-bold tabular-nums">
                      {row.total}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-3 text-[11px] font-semibold">
                    <span style={{ color: "var(--ok)" }}>
                      {row.free} siap
                    </span>
                    <span style={{ color: "var(--primary)" }}>
                      {row.onRent} dipinjam
                    </span>
                    {row.attention > 0 ? (
                      <span style={{ color: "var(--danger)" }}>
                        {row.attention} rusak
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="mt-1.5 text-[10px]"
                    style={{ color: "var(--text2)" }}
                  >
                    {row.bicycles} bicycle · {row.ebikes} e-bike ·{" "}
                    {row.emopeds} e-moped
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {siteFilter !== "all" ? (
        <button
          type="button"
          className="mx-4 mt-2 text-xs font-bold"
          style={{ color: "var(--primary)" }}
          onClick={() => setSiteFilter("all")}
        >
          Lihat semua lokasi
        </button>
      ) : null}

      {siteFilter !== "all" ? (
        <div className="card !py-3">
          {(() => {
            if (siteFilter === "unassigned") {
              const count = locationSummaries.find(
                (row) => row.id === "unassigned",
              )?.total;
              return (
                <>
                  <div className="flex items-center gap-2">
                    <CircleAlert size={18} style={{ color: "var(--warn)" }} />
                    <div className="font-bold text-sm">
                      {count} sepeda belum ada lokasi
                    </div>
                  </div>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--text2)" }}
                  >
                    Choose a location on each bike below. Unassigned bikes
                    should not be offered for rental.
                  </p>
                </>
              );
            }
            const s = opSites.find((x) => x.id === siteFilter);
            if (!s) return null;
            const summary = locationSummaries.find((row) => row.id === s.id);
            return (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AreaBadge area={s.area} />
                      <CityBadge city={s.city} />
                    </div>
                    <div className="mt-1.5 font-bold">{s.name}</div>
                    <div
                      className="text-xs"
                      style={{ color: "var(--text2)" }}
                    >
                      {s.address}
                    </div>
                    <div
                      className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs"
                      style={{ color: "var(--text2)" }}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} /> {s.hours}
                      </span>
                      <a
                        className="inline-flex items-center gap-1 font-semibold"
                        style={{ color: "var(--ok)" }}
                        href={`https://wa.me/${(s.whatsapp || op?.phone || "").replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle size={12} />
                        WA {s.whatsapp || op?.phone || "not set"}
                      </a>
                    </div>
                    {s.storeInfo ? (
                      <p
                        className="mt-2 rounded-lg px-2.5 py-2 text-xs"
                        style={{
                          background: "var(--bg-deep)",
                          color: "var(--text2)",
                        }}
                      >
                        {s.storeInfo}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold tabular-nums">
                      {summary?.total ?? 0}
                    </div>
                    <div
                      className="text-[10px]"
                      style={{ color: "var(--text2)" }}
                    >
                      bikes assigned
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <LocationStat
                    value={summary?.free ?? 0}
                    label="Siap"
                    color="var(--ok)"
                  />
                  <LocationStat
                    value={summary?.onRent ?? 0}
                    label="Dipinjam"
                    color="var(--primary)"
                  />
                  <LocationStat
                    value={summary?.attention ?? 0}
                    label="Rusak"
                    color="var(--danger)"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold"
                    style={{ background: "var(--bg-deep)", color: "var(--primary)" }}
                    onClick={() => {
                      setMoveToSite("");
                      setPanel("move");
                    }}
                  >
                    <MoveRight size={14} />
                    Pindah sepeda siap dari sini
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold"
                    style={{ background: "var(--bg-deep)", color: "var(--primary)" }}
                    onClick={() => openEditSite(s.id)}
                  >
                    <Pencil size={14} />
                    Edit lokasi
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold"
                    style={{ background: "#FADBD8", color: "var(--danger)" }}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Delete ${s.name}? ${summary?.total ?? 0} idle bikes will become Unassigned.`,
                        )
                      ) {
                        return;
                      }
                      const err = removeSite(s.id);
                      if (err) {
                        setToast(err);
                        return;
                      }
                      setToast(
                        `Location deleted · ${summary?.total ?? 0} bikes moved to Unassigned`,
                      );
                      setSiteFilter("unassigned");
                      setPanel("none");
                    }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      ) : (
        <div className="mx-4 mb-2">
          <button
            type="button"
            className="w-full rounded-xl py-2.5 text-xs font-bold"
            style={{ background: "var(--bg-deep)", color: "var(--primary)" }}
            onClick={() => setPanel((p) => (p === "move" ? "none" : "move"))}
          >
            Move free bikes between places
          </button>
        </div>
      )}

      {panel === "move" ? (
        <div className="card space-y-3">
          <div className="font-bold text-sm">Kirim sepeda siap ke tempat…</div>
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            Pilih tempat tujuan. Hanya sepeda yang status siap yang dipindah.
          </p>
          {sitesByArea.map(({ area, city, sites: areaSites }) => (
            <div key={`${city}-${area}`} className="space-y-2">
              <AreaBadge area={area} />
              {areaSites.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-bold"
                    style={{
                      background:
                        moveToSite === s.id
                          ? "color-mix(in srgb, var(--primary) 14%, white)"
                          : "var(--bg-deep)",
                      color: "var(--primary)",
                    }}
                    onClick={() => {
                      setMoveToSite(s.id);
                      moveAllFreeTo(s.id);
                    }}
                  >
                    <MoveRight size={16} />
                    {s.name}
                  </button>
                ))}
            </div>
          ))}
        </div>
      ) : null}

      {panel === "site" ? (
        <div className="card space-y-2">
          <div className="font-bold text-sm">
            {editingSiteId ? "Edit lokasi" : "Tambah lokasi baru"}
          </div>
          <input
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--border)" }}
            placeholder="Nama tempat (contoh: Lobby Kost)"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
          />
          <input
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--border)" }}
            placeholder="Area / district (e.g. Kemang, Tebet)"
            value={siteArea}
            onChange={(e) => setSiteArea(e.target.value)}
          />
          <input
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--border)" }}
            placeholder="City (e.g. Jakarta)"
            value={siteCity}
            onChange={(e) => setSiteCity(e.target.value)}
          />
          <input
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--border)" }}
            placeholder="Alamat lengkap"
            value={siteAddress}
            onChange={(e) => setSiteAddress(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="any"
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: "var(--border)" }}
              placeholder="Latitude"
              aria-label="Location latitude"
              value={siteLat}
              onChange={(e) => setSiteLat(e.target.value)}
            />
            <input
              type="number"
              step="any"
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
              style={{ borderColor: "var(--border)" }}
              placeholder="Longitude"
              aria-label="Location longitude"
              value={siteLng}
              onChange={(e) => setSiteLng(e.target.value)}
            />
          </div>
          <p className="text-xs" style={{ color: "var(--text2)" }}>
            These coordinates control discovery distance and the return
            geofence. Copy the exact pin from OpenStreetMap.
          </p>
          <input
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--border)" }}
            placeholder="Jam buka (contoh: 07:00 - 20:00)"
            value={siteHours}
            onChange={(e) => setSiteHours(e.target.value)}
          />
          <input
            type="tel"
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--border)" }}
            placeholder="Nomor WhatsApp lokasi"
            value={siteWhatsapp}
            onChange={(e) => setSiteWhatsapp(e.target.value)}
          />
          <textarea
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--border)" }}
            rows={3}
            placeholder="Informasi toko: patokan, lantai, cara ambil kunci…"
            value={siteInfo}
            onChange={(e) => setSiteInfo(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={siteDesk}
              onChange={(e) => setSiteDesk(e.target.checked)}
            />
            Shop / give key here
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={siteSelf}
              onChange={(e) => setSiteSelf(e.target.checked)}
            />
            App self-collect pin
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn-secondary !mx-0 !mt-0 !w-full"
              onClick={() => {
                clearSiteForm();
                setPanel("none");
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary !mx-0 !mt-0 !w-full"
              onClick={submitSite}
            >
              {editingSiteId ? "Save changes" : "Add location"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Stock +/- when a place is selected */}
      {siteFilter !== "all" && siteFilter !== "unassigned" ? (
        <>
          <OpSection
            icon={Plus}
            title="Tambah stok semua model"
            hint="Every fleet model can be added to this location"
          />
          {opModels.map((m) => {
            const units = fleet.filter(
              (v) => v.modelId === m.id && v.siteId === siteFilter,
            );
            const available = units.filter((v) => v.status === "available").length;
            return (
              <div
                key={m.id}
                className="mx-4 mb-2 flex items-center gap-3 rounded-xl px-3 py-3"
                style={{ background: "var(--card)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.images[0]}
                  alt=""
                  className="h-12 w-14 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <div className="text-sm font-bold">{m.name}</div>
                  <div className="text-xs" style={{ color: "var(--text2)" }}>
                    {vehicleTypeLabel(m.vehicleType)} · {available}/{units.length} free
                    {m.vehicleType === "bicycle" ? " · key only" : ""}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Remove one ${m.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold"
                  style={{ background: "#FADBD8", color: "var(--danger)" }}
                  onClick={() => {
                    if (!window.confirm(`Remove one available ${m.name}?`)) {
                      return;
                    }
                    const err = adjustFleetStock({
                      modelId: m.id,
                      siteId: siteFilter,
                      delta: -1,
                    });
                    if (err) setToast(err);
                    else setToast("−1");
                  }}
                >
                  −
                </button>
                <button
                  type="button"
                  aria-label={`Add one ${m.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ background: "var(--ok)" }}
                  onClick={() => {
                    const err = adjustFleetStock({
                      modelId: m.id,
                      siteId: siteFilter,
                      delta: 1,
                    });
                    if (err) setToast(err);
                    else setToast("+1");
                  }}
                >
                  +
                </button>
              </div>
            );
          })}
        </>
      ) : null}

      {siteFilter !== "all" ? (
        <>
          <div className="flex gap-2 px-4 pb-2 pt-2">
            <input
              className="flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none"
              style={{
                borderColor: "var(--border)",
                background: "var(--card)",
              }}
              placeholder="Search bike code…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto px-4 pb-2">
            {(
              [
                ["all", "All"],
                ["free", "Free ✓"],
                ["rented", "On rent"],
                ["reserved", "Waiting"],
                ["maintenance", "Broken"],
              ] as const
            ).map(([f, label]) => (
              <button
                key={f}
                type="button"
                className="whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold"
                style={{
                  borderColor:
                    filter === f ? "var(--primary)" : "var(--border)",
                  background:
                    filter === f
                      ? f === "free"
                        ? "var(--ok)"
                        : "var(--primary)"
                      : "var(--card)",
                  color: filter === f ? "white" : "var(--text)",
                }}
                onClick={() => setFilter(f)}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {panel === "add" ? (
        <div className="card space-y-2">
          <div className="font-bold text-sm">Add bike</div>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--border)" }}
            value={activeSiteId}
            onChange={(e) => setAddSiteId(e.target.value)}
          >
            {opSites.map((s) => (
              <option key={s.id} value={s.id}>
                Place: {s.name}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--border)" }}
            value={modelPick}
            onChange={(e) => setModelPick(e.target.value)}
          >
            <option value="">New model…</option>
            {opModels.map((m) => (
              <option key={m.id} value={m.id}>
                +1 {m.name}
              </option>
            ))}
          </select>
          {!modelPick ? (
            <>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--border)" }}
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--border)" }}
                placeholder="Code e.g. MG-E09"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--border)" }}
                value={vehicleType}
                onChange={(e) => {
                  const t = e.target.value as VehicleType;
                  setVehicleType(t);
                  if (t === "bicycle") setRentalMode("key_handover");
                }}
              >
                <option value="bicycle">Bicycle (no battery · physical key)</option>
                <option value="ebike">E-Bike</option>
                <option value="emoped">E-Moped</option>
              </select>
              {vehicleType !== "bicycle" ? (
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "var(--border)" }}
                  value={rentalMode}
                  onChange={(e) => setRentalMode(e.target.value as RentalMode)}
                >
                  <option value="digital">App key</option>
                  <option value="key_handover">Physical key</option>
                  <option value="both">App + physical key</option>
                </select>
              ) : null}
              <input
                type="number"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{ borderColor: "var(--border)" }}
                placeholder="Price per hour"
                value={pricePerHour}
                onChange={(e) => setPricePerHour(Number(e.target.value) || 0)}
              />
            </>
          ) : null}
          <button type="button" className="btn-primary !mx-0 !w-full" onClick={submitAdd}>
            Save bike
          </button>
        </div>
      ) : null}

      {siteFilter !== "all" ? (
        <>
      <p className="section-label">
        {siteFilter === "unassigned"
          ? "Unassigned bikes"
          : siteFilter !== "all"
            ? `Bikes at ${opSites.find((s) => s.id === siteFilter)?.name ?? "location"}`
            : filter === "free"
              ? "Free bikes (highlighted)"
              : "All bikes"}
      </p>
      {list.length === 0 ? (
        <p className="p-8 text-center text-sm" style={{ color: "var(--text2)" }}>
          No bikes match. Try All places or All types.
        </p>
      ) : (
        list.map((v) => {
          const site = sites.find((s) => s.id === v.siteId);
          const isFree = v.status === "available";
          const statusLabel =
            v.status === "available"
              ? "FREE"
              : v.status === "rented"
                ? "On rent"
                : v.status === "reserved"
                  ? "Waiting"
                  : v.status === "maintenance"
                    ? "Broken"
                    : "Charging";
          return (
            <div
              key={v.id}
              className="card"
              style={{
                border: isFree ? "2px solid var(--ok)" : undefined,
                boxShadow: isFree
                  ? "0 0 0 3px color-mix(in srgb, var(--ok) 22%, transparent)"
                  : undefined,
                background: isFree
                  ? "color-mix(in srgb, var(--ok) 6%, white)"
                  : "var(--card)",
              }}
            >
              <div className="flex justify-between gap-2">
                <div>
                  <div className="font-bold">
                    {v.emoji} {v.name}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text2)" }}>
                    {v.code} · {vehicleTypeLabel(v.vehicleType)}
                    {v.vehicleType === "bicycle"
                      ? " · No battery · Physical key"
                      : v.batteryPct != null
                        ? ` · Battery ${v.batteryPct}%`
                        : " · Charge TBD"}
                    <br />
                    <MapPin size={11} className="inline" />{" "}
                    {site ? `${site.area} · ${site.name}` : "Belum ada tempat"}
                  </div>
                </div>
                <span
                  className="h-fit rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{
                    background: isFree ? "var(--ok)" : "var(--bg-deep)",
                    color: isFree ? "white" : "var(--text2)",
                  }}
                >
                  {statusLabel}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <select
                  className="rounded-lg px-2 py-2 text-xs font-bold outline-none"
                  style={{ background: "var(--bg-deep)" }}
                  value={site ? v.siteId : ""}
                  onChange={(e) => {
                    const destination = opSites.find(
                      (candidate) => candidate.id === e.target.value,
                    );
                    if (
                      !window.confirm(
                        e.target.value
                          ? `Move ${v.code} to ${destination?.name ?? "this location"}?`
                          : `Mark ${v.code} as Unassigned?`,
                      )
                    ) {
                      return;
                    }
                    moveVehicleSite(v.id, e.target.value);
                    setToast(
                      e.target.value
                        ? "Moved to new place"
                        : "Bike marked unassigned",
                    );
                  }}
                >
                  <option value="">Belum ada lokasi · Unassigned</option>
                  {opSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      Move → {s.name}
                    </option>
                  ))}
                </select>
                {!isFree && v.status !== "rented" ? (
                  <button
                    type="button"
                    className="rounded-lg px-3 py-2 text-xs font-bold text-white"
                    style={{ background: "var(--ok)" }}
                    onClick={() => {
                      updateVehicleStatus(v.id, "available");
                      setToast("Marked FREE");
                    }}
                  >
                    Mark FREE
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-xs font-bold"
                  style={{ background: "#FEF5E7", color: "var(--warn)" }}
                  onClick={() => {
                    updateVehicleStatus(v.id, "maintenance");
                    setToast("Marked Broken");
                  }}
                >
                  Broken
                </button>
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-xs font-bold"
                  style={{ background: "#FADBD8", color: "var(--danger)" }}
                  onClick={() => {
                    if (v.status === "rented" || v.status === "reserved") {
                      setToast("Finish rental first");
                      return;
                    }
                    if (!window.confirm(`Remove bike ${v.code} from the fleet?`)) {
                      return;
                    }
                    removeVehicle(v.id);
                    setToast("Removed");
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })
      )}
        </>
      ) : (
        <div
          className="mx-4 mt-4 rounded-2xl border p-5 text-center"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <MapPin
            size={28}
            className="mx-auto"
            style={{ color: "var(--primary)" }}
          />
          <div className="mt-2 font-bold">Belum ada lokasi dipilih</div>
          <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
            Tap kartu lokasi di atas untuk melihat stok model, jam buka, WhatsApp,
            dan daftar sepeda.
          </p>
        </div>
      )}
      <BottomNav variant="operator" />
    </div>
  );
}

function LocationStat({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl px-2 py-2.5 text-center"
      style={{ background: "var(--bg-deep)" }}
    >
      <div className="text-lg font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px]" style={{ color: "var(--text2)" }}>
        {label}
      </div>
    </div>
  );
}

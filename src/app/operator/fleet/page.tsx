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
import {
  LocationSwitcher,
  ModelStockList,
} from "@/components/operator/FleetModelStock";
import { MockMap } from "@/components/MockMap";
import { useAppStore } from "@/lib/store";
import {
  formatIdrShort,
  osmBrowseUrl,
  siteOpenClose,
  vehicleTypeLabel,
} from "@/lib/format";
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
  const bookings = useAppStore((s) => s.bookings);
  const pricing = useAppStore((s) => s.pricing);
  const updateVehicleStatus = useAppStore((s) => s.updateVehicleStatus);
  const addVehicle = useAppStore((s) => s.addVehicle);
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
  const onRentBookings = useMemo(
    () =>
      bookings.filter(
        (b) =>
          b.operatorId === opId &&
          (b.status === "active" || b.status === "overdue"),
      ),
    [bookings, opId],
  );

  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | VehicleStatus | "free">("all");
  const [panel, setPanel] = useState<"none" | "add" | "site" | "move">("none");
  const [moveToSite, setMoveToSite] = useState("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("ebike");
  const [rentalMode, setRentalMode] = useState<RentalMode>("both");
  const [pricePerHour, setPricePerHour] = useState(50000);
  const [addSiteId, setAddSiteId] = useState("");
  const [modelPick, setModelPick] = useState("");
  const [stockQty, setStockQty] = useState(1);
  const [stockColor, setStockColor] = useState("Black");
  const [stockColorHex, setStockColorHex] = useState("#1C1C1E");
  const [newModelOpen, setNewModelOpen] = useState(false);

  const STOCK_COLORS = [
    { color: "Black", colorHex: "#1C1C1E" },
    { color: "White", colorHex: "#F2F2F7" },
    { color: "Teal", colorHex: "#0D9488" },
    { color: "Navy", colorHex: "#1E3A5F" },
    { color: "Red", colorHex: "#C0392B" },
    { color: "Silver", colorHex: "#A8B0B8" },
    { color: "Forest", colorHex: "#1B5E3B" },
    { color: "Sand", colorHex: "#C4A574" },
  ];

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
        const onRent = onRentBookings.filter((b) => b.siteId === site.id).length;
        return {
          id: site.id,
          site,
          total: units.length,
          free: units.filter((v) => v.status === "available").length,
          onRent,
          attention: units.filter(
            (v) => v.status === "maintenance" || v.status === "disabled",
          ).length,
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
        onRent: onRentBookings.filter((b) => {
          const v = fleet.find((x) => x.id === b.vehicleId);
          return v ? isUnassigned(v.siteId) : false;
        }).length,
        attention: fleet.filter(
          (v) =>
            isUnassigned(v.siteId) &&
            (v.status === "maintenance" || v.status === "disabled"),
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
    [fleet, opSites, validSiteIds, onRentBookings],
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

  function openAddStock() {
    const siteId =
      siteFilter !== "all" && siteFilter !== "unassigned"
        ? siteFilter
        : opSites[0]?.id || "";
    setAddSiteId(siteId);
    setModelPick(opModels[0]?.id ?? "");
    setNewModelOpen(false);
    setStockQty(1);
    setStockColor("Black");
    setStockColorHex("#1C1C1E");
    setName("");
    setCode("");
    setPanel("add");
  }

  function submitAdd() {
    if (!opId || !activeSiteId) {
      setToast("Buat lokasi dulu");
      return;
    }
    const qty = Math.max(1, Math.min(20, Math.floor(stockQty) || 1));

    if (newModelOpen || !modelPick) {
      if (!name.trim() || !code.trim()) {
        setToast("Name and code required for new model");
        return;
      }
      for (let i = 0; i < qty; i++) {
        const suffix = qty > 1 ? `-${String(i + 1).padStart(2, "0")}` : "";
        addVehicle({
          operatorId: opId,
          siteId: activeSiteId,
          name: name.trim(),
          code: `${code.trim().toUpperCase()}${suffix}`,
          vehicleType,
          rentalMode: vehicleType === "bicycle" ? "key_handover" : rentalMode,
          pricePerHour,
          batteryPct: vehicleType === "bicycle" ? null : 90,
          color: stockColor,
          colorHex: stockColorHex,
        });
      }
      setToast(`Added ${qty} · ${name.trim()}`);
      setPanel("none");
      setName("");
      setCode("");
      setModelPick("");
      setNewModelOpen(false);
      setStockQty(1);
      return;
    }

    const model = opModels.find((m) => m.id === modelPick);
    if (!model) {
      setToast("Pick a model");
      return;
    }
    const existing = fleet.filter((v) => v.modelId === model.id).length;
    for (let i = 0; i < qty; i++) {
      const n = existing + i + 1;
      const prefix = model.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 3);
      addVehicle({
        operatorId: opId,
        siteId: activeSiteId,
        modelId: model.id,
        name: model.name,
        code: `${prefix}-${String(n).padStart(2, "0")}`,
        vehicleType: model.vehicleType,
        rentalMode: model.rentalMode,
        pricePerHour: model.pricePerHour,
        batteryPct: model.vehicleType === "bicycle" ? null : 90,
        color: stockColor,
        colorHex: stockColorHex,
      });
    }
    setToast(`+${qty} ${model.name}`);
    setPanel("none");
    setStockQty(1);
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
              onClick={() => {
                if (panel === "add") setPanel("none");
                else openAddStock();
              }}
            >
              <Plus size={14} />
              {panel === "add" ? "Tutup" : "Stok"}
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
        title="Lokasi"
        hint="Ganti lokasi · stok per model"
      />
      <LocationSwitcher
        locations={opSites.map((s) => ({
          id: s.id,
          name: s.name.replace(/ Lobby| Hub| Corner/g, "").trim() || s.name,
          total: locationSummaries.find((r) => r.id === s.id)?.total ?? 0,
        }))}
        value={siteFilter === "all" ? opSites[0]?.id ?? "all" : siteFilter}
        unassignedCount={
          locationSummaries.find((r) => r.id === "unassigned")?.total ?? 0
        }
        onChange={(id) => {
          setSiteFilter(id);
          setFilter("all");
          if (id !== "unassigned") setAddSiteId(id);
        }}
      />

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
                    {(() => {
                      const oc = siteOpenClose(s);
                      return (
                        <div
                          className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs"
                          style={{ color: "var(--text2)" }}
                        >
                          <span className="inline-flex items-center gap-1">
                            <Clock size={12} /> Buka {oc.open} · Tutup {oc.close}
                          </span>
                          <a
                            className="inline-flex items-center gap-1 font-semibold"
                            style={{ color: "var(--ok)" }}
                            href={`https://wa.me/${(s.whatsapp || op?.phone || "").replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <MessageCircle size={12} />
                            {s.whatsapp || op?.phone || "WA not set"}
                          </a>
                        </div>
                      );
                    })()}
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
                <div className="mt-3 overflow-hidden rounded-xl">
                  <MockMap
                    height={140}
                    mapImage={s.mapImage || op?.mapImage}
                    label={`OpenStreetMap · ${s.name}`}
                    pins={[
                      {
                        id: s.id,
                        label: s.name,
                        top: "48%",
                        left: "55%",
                      },
                    ]}
                  />
                </div>
                <a
                  className="mt-2 block rounded-xl px-3 py-2 text-center text-xs font-bold"
                  style={{ background: "var(--bg-deep)", color: "var(--primary)" }}
                  href={osmBrowseUrl(s.lat, s.lng)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin size={12} className="mr-1 inline" />
                  Buka peta · {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                </a>
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
                    label="Down"
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
            Pindahkan sepeda free antar lokasi
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
              {editingSiteId ? "Simpan" : "Tambah lokasi"}
            </button>
          </div>
        </div>
      ) : null}

      {siteFilter !== "all" && siteFilter !== "unassigned" ? (
        <div className="mx-4 mt-3">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white"
            style={{ background: "var(--ok)" }}
            onClick={openAddStock}
          >
            <Plus size={18} />
            Tambah stok ke lokasi ini
          </button>
        </div>
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
                ["free", "Ready"],
                ["rented", "On rent"],
                ["reserved", "Waiting"],
                ["disabled", "Disabled"],
                ["maintenance", "Maintenance"],
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
        <>
          <div
            className="fixed inset-0 z-[179] bg-black/40"
            onClick={() => setPanel("none")}
          />
          <div
            className="fixed bottom-0 left-1/2 z-[180] flex max-h-[88vh] w-full max-w-[430px] -translate-x-1/2 flex-col rounded-t-3xl pb-[max(1rem,env(safe-area-inset-bottom))]"
            style={{ background: "var(--card)" }}
            role="dialog"
            aria-modal="true"
            aria-label="Add stock"
          >
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--border)" }}>
              <div>
                <div className="font-display text-lg font-semibold">Add stock</div>
                <p className="text-xs" style={{ color: "var(--text2)" }}>
                  Add bikes to a location · choose model or create new
                </p>
              </div>
              <button
                type="button"
                className="rounded-full px-3 py-1.5 text-xs font-bold"
                style={{ background: "var(--bg-deep)", color: "var(--text2)" }}
                onClick={() => setPanel("none")}
              >
                Close
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto px-5 py-4">
              <label className="block text-xs font-bold" style={{ color: "var(--text2)" }}>
                Location
              </label>
              <select
                className="w-full rounded-xl border px-3 py-3 text-sm outline-none"
                style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                value={activeSiteId}
                onChange={(e) => setAddSiteId(e.target.value)}
              >
                {opSites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <label className="block text-xs font-bold" style={{ color: "var(--text2)" }}>
                Model
              </label>
              <div className="space-y-2">
                {opModels.map((m) => {
                  const selected = !newModelOpen && modelPick === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className="flex w-full items-center gap-3 rounded-xl border p-2.5 text-left"
                      style={{
                        borderColor: selected ? "var(--primary)" : "var(--border)",
                        background: selected
                          ? "color-mix(in srgb, var(--primary) 10%, white)"
                          : "var(--bg)",
                      }}
                      onClick={() => {
                        setModelPick(m.id);
                        setNewModelOpen(false);
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.images[0]}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold">{m.name}</div>
                        <div className="text-[11px]" style={{ color: "var(--text2)" }}>
                          {vehicleTypeLabel(m.vehicleType)} ·{" "}
                          {fleet.filter((v) => v.modelId === m.id && v.siteId === activeSiteId).length}{" "}
                          here
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl border px-3 py-3 text-sm font-bold"
                style={{
                  borderColor: newModelOpen ? "var(--primary)" : "var(--border)",
                  background: newModelOpen
                    ? "color-mix(in srgb, var(--primary) 8%, white)"
                    : "var(--bg)",
                  color: "var(--primary)",
                }}
                onClick={() => {
                  setNewModelOpen((v) => !v);
                  if (!newModelOpen) setModelPick("");
                }}
                aria-expanded={newModelOpen}
              >
                <span>+ New model (not in catalog yet)</span>
                <span style={{ color: "var(--text2)" }}>
                  {newModelOpen ? "Hide" : "Expand"}
                </span>
              </button>

              {newModelOpen ? (
                <div
                  className="space-y-2 rounded-xl border p-3"
                  style={{ borderColor: "var(--border)", background: "var(--bg-deep)" }}
                >
                  <input
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                    style={{ borderColor: "var(--border)", background: "var(--card)" }}
                    placeholder="Model name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <input
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                    style={{ borderColor: "var(--border)", background: "var(--card)" }}
                    placeholder="Code prefix e.g. NX"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                  <select
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                    style={{ borderColor: "var(--border)", background: "var(--card)" }}
                    value={vehicleType}
                    onChange={(e) => {
                      const t = e.target.value as VehicleType;
                      setVehicleType(t);
                      if (t === "bicycle") setRentalMode("key_handover");
                    }}
                  >
                    <option value="bicycle">Bicycle · physical key</option>
                    <option value="ebike">E-Bike</option>
                    <option value="emoped">E-Moped</option>
                  </select>
                  {vehicleType !== "bicycle" ? (
                    <select
                      className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                      style={{ borderColor: "var(--border)", background: "var(--card)" }}
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
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                    style={{ borderColor: "var(--border)", background: "var(--card)" }}
                    placeholder="Price per hour"
                    value={pricePerHour}
                    onChange={(e) => setPricePerHour(Number(e.target.value) || 0)}
                  />
                </div>
              ) : null}

              <label className="block text-xs font-bold" style={{ color: "var(--text2)" }}>
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {STOCK_COLORS.map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    className="flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-bold"
                    style={{
                      borderColor:
                        stockColor === c.color ? "var(--primary)" : "var(--border)",
                      background:
                        stockColor === c.color
                          ? "color-mix(in srgb, var(--primary) 10%, white)"
                          : "var(--bg)",
                    }}
                    onClick={() => {
                      setStockColor(c.color);
                      setStockColorHex(c.colorHex);
                    }}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-black/10"
                      style={{ background: c.colorHex }}
                    />
                    {c.color}
                  </button>
                ))}
              </div>

              <label className="block text-xs font-bold" style={{ color: "var(--text2)" }}>
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold"
                  style={{ background: "var(--bg-deep)" }}
                  onClick={() => setStockQty((n) => Math.max(1, n - 1))}
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="w-16 rounded-xl border py-2 text-center text-base font-bold outline-none"
                  style={{ borderColor: "var(--border)", background: "var(--bg)" }}
                  value={stockQty}
                  onChange={(e) =>
                    setStockQty(Math.max(1, Math.min(20, Number(e.target.value) || 1)))
                  }
                />
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ background: "var(--ok)" }}
                  onClick={() => setStockQty((n) => Math.min(20, n + 1))}
                >
                  +
                </button>
              </div>
            </div>

            <div className="border-t px-5 pt-3" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                className="btn-primary !mx-0 !mt-0 !w-full"
                onClick={submitAdd}
              >
                Add {stockQty} bike{stockQty > 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </>
      ) : null}

      {siteFilter !== "all" ? (
        <>
          <p className="section-label">
            {siteFilter === "unassigned"
              ? "Models · unassigned"
              : `Models at ${opSites.find((s) => s.id === siteFilter)?.name ?? "location"}`}
          </p>
          <ModelStockList
            models={opModels}
            units={list}
            site={
              siteFilter === "unassigned"
                ? null
                : opSites.find((s) => s.id === siteFilter) ?? null
            }
            moveSites={opSites}
            onStatus={(id, status) => {
              if (
                (status === "available" || status === "disabled") &&
                list.find((v) => v.id === id)?.status === "rented"
              ) {
                setToast("Finish rental first");
                return;
              }
              updateVehicleStatus(id, status);
              setToast(
                status === "available"
                  ? "Marked Ready"
                  : status === "disabled"
                    ? "Marked Disabled"
                    : status === "maintenance"
                      ? "Marked Maintenance"
                      : "Status updated",
              );
            }}
            onMove={(id, dest) => {
              const bike = list.find((v) => v.id === id);
              const destination = opSites.find((s) => s.id === dest);
              if (
                !window.confirm(
                  dest
                    ? `Move ${bike?.code ?? "bike"} to ${destination?.name ?? "location"}?`
                    : `Mark ${bike?.code ?? "bike"} as Unassigned?`,
                )
              ) {
                return;
              }
              moveVehicleSite(id, dest);
              setToast(dest ? "Moved" : "Unassigned");
            }}
          />
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
          <div className="mt-2 font-bold">Pilih lokasi di atas</div>
          <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
            Pilih lokasi untuk lihat stok model, foto, kunci, dan status sepeda.
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

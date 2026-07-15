"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bike, Gauge, MapPin, MoveRight, Plus, Tag, Zap } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";
import { CityBadge, AreaBadge, OpSection } from "@/components/operator/OperatorUi";
import { useAppStore } from "@/lib/store";
import { formatIdrShort, vehicleTypeLabel } from "@/lib/format";
import { groupSitesByArea, uniqueAreas, uniqueCities } from "@/lib/operator-ui";
import type { RentalMode, VehicleStatus, VehicleType } from "@/lib/types";

const TYPE_ORDER: VehicleType[] = ["bicycle", "ebike", "emoped"];

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
  const [typeFilter, setTypeFilter] = useState<VehicleType | "all">("all");
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
  const [siteDesk, setSiteDesk] = useState(true);
  const [siteSelf, setSiteSelf] = useState(true);
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");

  const operators = useAppStore((s) => s.operators);
  const op = operators.find((o) => o.id === opId);
  const cities = uniqueCities(opSites);
  const areas = uniqueAreas(opSites);
  const sitesByArea = groupSitesByArea(opSites);

  const activeSiteId = addSiteId || opSites[0]?.id || "";
  const hourPrice = pricing[opId]?.[1]?.priceIdr;

  const byType = useMemo(() => {
    return TYPE_ORDER.map((t) => {
      const units = fleet.filter((v) => {
        if (siteFilter !== "all" && v.siteId !== siteFilter) return false;
        if (cityFilter !== "all") {
          const site = opSites.find((s) => s.id === v.siteId);
          if (site?.city !== cityFilter) return false;
        }
        if (areaFilter !== "all") {
          const site = opSites.find((s) => s.id === v.siteId);
          if (site?.area !== areaFilter) return false;
        }
        return v.vehicleType === t;
      });
      return {
        type: t,
        total: units.length,
        free: units.filter((v) => v.status === "available").length,
        onRent: units.filter((v) => v.status === "rented").length,
        broken: units.filter((v) => v.status === "maintenance").length,
        noBattery: t === "bicycle",
        physicalOnly: t === "bicycle",
      };
    }).filter((x) => x.total > 0 || opModels.some((m) => m.vehicleType === x.type));
  }, [fleet, siteFilter, cityFilter, areaFilter, opSites, opModels]);

  const freeEverywhere = fleet.filter((v) => v.status === "available").length;

  const list = useMemo(() => {
    return fleet
      .filter((v) => siteFilter === "all" || v.siteId === siteFilter)
      .filter((v) => {
        if (cityFilter === "all") return true;
        const site = opSites.find((s) => s.id === v.siteId);
        return site?.city === cityFilter;
      })
      .filter((v) => {
        if (areaFilter === "all") return true;
        const site = opSites.find((s) => s.id === v.siteId);
        return site?.area === areaFilter;
      })
      .filter((v) => typeFilter === "all" || v.vehicleType === typeFilter)
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
  }, [fleet, siteFilter, cityFilter, areaFilter, opSites, typeFilter, filter, q]);

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

  function submitSite() {
    if (!opId) return;
    const site = addSite({
      operatorId: opId,
      name: siteName,
      address: siteAddress,
      city: siteCity || op?.city,
      area: siteArea || siteName.trim(),
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
    setSiteName("");
    setSiteAddress("");
    setSiteCity("");
    setSiteArea("");
    setPanel("none");
  }

  function moveAllFreeTo(targetSiteId: string) {
    const free = fleet.filter(
      (v) =>
        v.status === "available" &&
        (siteFilter === "all" || v.siteId === siteFilter) &&
        v.siteId !== targetSiteId,
    );
    if (free.length === 0) {
      setToast("No free bikes to move");
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
              onClick={() => setPanel((p) => (p === "site" ? "none" : "site"))}
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

      <OpSection icon={Bike} title="3 jenis sepeda" hint="Tap a row to filter" />
      <div className="mx-4 space-y-2">
        {byType.map((row) => (
          <button
            key={row.type}
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl p-3.5 text-left"
            style={{
              background: "var(--card)",
              border:
                typeFilter === row.type
                  ? "2px solid var(--primary)"
                  : "2px solid transparent",
            }}
            onClick={() =>
              setTypeFilter((t) => (t === row.type ? "all" : row.type))
            }
          >
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{
                background: "color-mix(in srgb, var(--primary) 10%, white)",
                color: "var(--primary)",
              }}
            >
              {row.type === "bicycle" ? (
                <Bike size={22} strokeWidth={2} />
              ) : row.type === "ebike" ? (
                <Zap size={22} strokeWidth={2} />
              ) : (
                <Gauge size={22} strokeWidth={2} />
              )}
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm">{vehicleTypeLabel(row.type)}</div>
              <div className="text-[11px]" style={{ color: "var(--text2)" }}>
                {row.physicalOnly
                  ? "Kunci fisik saja · tanpa baterai"
                  : "Baterai + app / kunci"}
              </div>
            </div>
            <div className="text-right text-xs font-semibold">
              <div style={{ color: "var(--ok)" }}>{row.free} siap</div>
              <div style={{ color: "var(--primary)" }}>{row.onRent} dipinjam</div>
              <div style={{ color: "var(--text2)" }}>{row.total} total</div>
            </div>
          </button>
        ))}
      </div>
      {typeFilter !== "all" ? (
        <button
          type="button"
          className="mx-4 mt-2 text-xs font-bold"
          style={{ color: "var(--primary)" }}
          onClick={() => setTypeFilter("all")}
        >
          Tampilkan semua jenis
        </button>
      ) : null}

      <OpSection
        icon={MapPin}
        title="Filter by area"
        hint="Jakarta locations are far apart — pick one area"
      />

      {areas.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto px-4 pb-2">
          <button
            type="button"
            className={areaFilter === "all" ? "op-chip op-chip-active" : "op-chip"}
            onClick={() => setAreaFilter("all")}
          >
            Semua area
          </button>
          {areas.map((a) => (
            <button
              key={a}
              type="button"
              className={areaFilter === a ? "op-chip op-chip-active" : "op-chip"}
              onClick={() => {
                setAreaFilter(a);
                setSiteFilter("all");
              }}
            >
              {a}
            </button>
          ))}
        </div>
      ) : null}

      {cities.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto px-4 pb-2">
          <button
            type="button"
            className={cityFilter === "all" ? "op-chip op-chip-active" : "op-chip"}
            onClick={() => setCityFilter("all")}
          >
            Semua kota
          </button>
          {cities.map((c) => (
            <button
              key={c}
              type="button"
              className={cityFilter === c ? "op-chip op-chip-active" : "op-chip"}
              onClick={() => {
                setCityFilter(c);
                setSiteFilter("all");
              }}
            >
              {c}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto px-4 pb-2">
        <button
          type="button"
          className={siteFilter === "all" ? "op-chip op-chip-active" : "op-chip"}
          onClick={() => setSiteFilter("all")}
        >
          Semua tempat
        </button>
        {opSites
          .filter((s) => cityFilter === "all" || s.city === cityFilter)
          .map((s) => {
          const free = fleet.filter(
            (v) => v.siteId === s.id && v.status === "available",
          ).length;
          return (
            <button
              key={s.id}
              type="button"
              className={siteFilter === s.id ? "op-chip op-chip-active" : "op-chip"}
              onClick={() => {
                setSiteFilter(s.id);
                setAddSiteId(s.id);
                setCityFilter(s.city);
                setAreaFilter(s.area);
              }}
            >
              {s.area} · {s.name} · {free}
            </button>
          );
        })}
      </div>

      {siteFilter !== "all" ? (
        <div className="card !py-3">
          {(() => {
            const s = opSites.find((x) => x.id === siteFilter);
            if (!s) return null;
            return (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <AreaBadge area={s.area} />
                  <CityBadge city={s.city} />
                  <div className="font-bold text-sm">{s.name}</div>
                </div>
                <div className="text-xs" style={{ color: "var(--text2)" }}>
                  {s.address}
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
                    className="rounded-lg px-3 py-2 text-xs font-bold"
                    style={{ background: "var(--bg-deep)", color: "var(--primary)" }}
                    onClick={() => setSiteFilter("all")}
                  >
                    Lihat semua tempat
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
          <div className="font-bold text-sm">Tambah tempat baru</div>
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
          <button type="button" className="btn-primary !mx-0 !w-full" onClick={submitSite}>
            Save place
          </button>
          {opSites.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
              style={{ background: "var(--bg-deep)" }}
            >
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-xs" style={{ color: "var(--text2)" }}>
                  {s.address}
                </div>
              </div>
              <button
                type="button"
                className="text-xs font-bold"
                style={{ color: "var(--danger)" }}
                onClick={() => {
                  const err = removeSite(s.id);
                  if (err) setToast(err);
                  else {
                    setToast("Place removed");
                    if (siteFilter === s.id) setSiteFilter("all");
                  }
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {/* Stock +/- when a place is selected */}
      {siteFilter !== "all" ? (
        <>
          <p className="section-label">Add / remove stock here</p>
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
                  className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold"
                  style={{ background: "#FADBD8", color: "var(--danger)" }}
                  onClick={() => {
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

      <div className="flex gap-2 px-4 pb-2 pt-2">
        <input
          className="flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
          placeholder="Search bike code…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-2">
        {(
          [
            ["free", "Free ✓"],
            ["all", "All"],
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
              borderColor: filter === f ? "var(--ok)" : "var(--border)",
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

      <p className="section-label">
        {filter === "free" ? "Free bikes (highlighted)" : "Bikes"}
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
                  value={v.siteId}
                  onChange={(e) => {
                    moveVehicleSite(v.id, e.target.value);
                    setToast(`Moved to new place`);
                  }}
                >
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
      <BottomNav variant="operator" />
    </div>
  );
}

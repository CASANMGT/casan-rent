"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  Battery,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Smartphone,
} from "lucide-react";
import type {
  OperatorSite,
  Vehicle,
  VehicleMaintenanceEntry,
  VehicleModel,
  VehicleStatus,
} from "@/lib/types";
import { vehicleTypeLabel } from "@/lib/format";

function statusMeta(status: VehicleStatus): {
  label: string;
  color: string;
  bg: string;
} {
  switch (status) {
    case "available":
      return { label: "Siap", color: "var(--ok)", bg: "var(--success-soft)" };
    case "rented":
      return { label: "Dipinjam", color: "var(--digital)", bg: "var(--info-soft)" };
    case "reserved":
      return { label: "Dipesan", color: "var(--text-warn)", bg: "var(--warning-soft)" };
    case "maintenance":
      return { label: "Perawatan", color: "var(--danger)", bg: "var(--danger-soft)" };
    case "disabled":
      return { label: "Nonaktif", color: "var(--neutral)", bg: "var(--neutral-soft)" };
    case "charging":
      return { label: "Mengisi daya", color: "var(--text-warn)", bg: "var(--warning-soft)" };
    default:
      return { label: status, color: "var(--text2)", bg: "var(--bg-deep)" };
  }
}

function KeyIcons({ mode }: { mode: Vehicle["rentalMode"] }) {
  const digital = mode === "digital" || mode === "both";
  const physical = mode === "key_handover" || mode === "both";
  return (
    <div className="flex items-center gap-1.5">
      {digital ? (
        <span
          className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
          style={{ background: "var(--digital-soft)", color: "var(--digital)" }}
          title="Kunci digital / aplikasi"
        >
          <Smartphone size={11} /> Aplikasi
        </span>
      ) : null}
      {physical ? (
        <span
          className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
          style={{ background: "var(--key-soft)", color: "var(--key)" }}
          title="Kunci fisik"
        >
          <KeyRound size={11} /> Fisik
        </span>
      ) : null}
    </div>
  );
}

export function LocationSwitcher({
  locations,
  value,
  onChange,
  unassignedCount,
  showUnassigned = true,
  showAll = false,
  allLabel = "Semua",
}: {
  locations: { id: string; name: string; total: number }[];
  value: string;
  onChange: (id: string) => void;
  unassignedCount: number;
  showUnassigned?: boolean;
  showAll?: boolean;
  allLabel?: string;
}) {
  return (
    <div className="mx-4 mt-1 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {showAll ? (
        <button
          type="button"
          className="shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold"
          style={{
            borderColor: value === "all" ? "var(--primary)" : "var(--border)",
            background:
              value === "all"
                ? "color-mix(in srgb, var(--primary) 12%, white)"
                : "var(--card)",
            color: value === "all" ? "var(--primary)" : "var(--text2)",
          }}
          onClick={() => onChange("all")}
        >
          {allLabel}
        </button>
      ) : null}
      {locations.map((loc) => {
        const on = value === loc.id;
        return (
          <button
            key={loc.id}
            type="button"
            className="shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold"
            style={{
              borderColor: on ? "var(--primary)" : "var(--border)",
              background: on
                ? "color-mix(in srgb, var(--primary) 12%, white)"
                : "var(--card)",
              color: on ? "var(--primary)" : "var(--text2)",
            }}
            onClick={() => onChange(loc.id)}
          >
            {loc.name}
            <span className="ml-1.5 tabular-nums opacity-80">{loc.total}</span>
          </button>
        );
      })}
      {showUnassigned ? (
        <button
          type="button"
          className="shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold"
          style={{
            borderColor:
              value === "unassigned" ? "var(--warn)" : "var(--border)",
            background:
              value === "unassigned" ? "var(--warning-soft)" : "var(--card)",
            color: value === "unassigned" ? "var(--text-warn)" : "var(--text2)",
          }}
          onClick={() => onChange("unassigned")}
        >
          Belum ditugaskan
          <span className="ml-1.5 tabular-nums opacity-80">
            {unassignedCount}
          </span>
        </button>
      ) : null}
    </div>
  );
}

export function ModelStockList({
  models,
  units,
  site,
  onStatus,
  onMove,
  moveSites,
  readOnly = false,
  maintenanceLog = [],
  onAddMaintenance,
}: {
  models: VehicleModel[];
  units: Vehicle[];
  site: OperatorSite | null;
  onStatus: (vehicleId: string, status: VehicleStatus) => void;
  onMove: (vehicleId: string, siteId: string) => void;
  moveSites: OperatorSite[];
  readOnly?: boolean;
  maintenanceLog?: VehicleMaintenanceEntry[];
  onAddMaintenance?: (vehicleId: string, note: string) => void;
}) {
  const [openModelId, setOpenModelId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [logOpen, setLogOpen] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const byModel = new Map<string, Vehicle[]>();
    for (const v of units) {
      const list = byModel.get(v.modelId) ?? [];
      list.push(v);
      byModel.set(v.modelId, list);
    }
    // Prefer catalog models present at site; include orphan modelIds
    const ordered: { model: VehicleModel | null; modelId: string; bikes: Vehicle[] }[] =
      [];
    for (const m of models) {
      const bikes = byModel.get(m.id);
      if (bikes?.length) {
        ordered.push({ model: m, modelId: m.id, bikes });
        byModel.delete(m.id);
      }
    }
    for (const [modelId, bikes] of byModel) {
      ordered.push({ model: null, modelId, bikes });
    }
    return ordered;
  }, [models, units]);

  if (groups.length === 0) {
    return (
      <p className="mx-4 py-8 text-center text-sm" style={{ color: "var(--text2)" }}>
        Belum ada unit di lokasi ini.
      </p>
    );
  }

  return (
    <div className="mx-4 divide-y border-y pb-2" style={{ borderColor: "var(--border)" }}>
      {groups.map(({ model, modelId, bikes }) => {
        const open = openModelId === modelId;
        const photo = model?.images[0] ?? "/vehicles/ebike.svg";
        const ready = bikes.filter((b) => b.status === "available").length;
        const onRent = bikes.filter((b) => b.status === "rented").length;
        const waiting = bikes.filter((b) => b.status === "reserved").length;
        const down = bikes.filter(
          (b) => b.status === "maintenance" || b.status === "disabled",
        ).length;
        const name = model?.name ?? bikes[0]?.name ?? "Model";
        const mode = model?.rentalMode ?? bikes[0]?.rentalMode ?? "digital";
        const batt =
          model?.batteryVoltageV != null && model.batteryAh != null
            ? `${model.batteryVoltageV}V · ${model.batteryAh}Ah`
            : model?.vehicleType === "bicycle" ||
                bikes[0]?.vehicleType === "bicycle"
              ? "No battery"
              : "Battery TBD";

        return (
          <div
            key={modelId}
            className="overflow-hidden"
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 p-3 text-left"
              onClick={() =>
                setOpenModelId((cur) => (cur === modelId ? null : modelId))
              }
              aria-expanded={open}
            >
              <Image
                src={photo}
                alt={name}
                width={56}
                height={56}
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
                style={{ background: "var(--bg-deep)" }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-sm">{name}</div>
                <div className="text-[11px]" style={{ color: "var(--text2)" }}>
                  {vehicleTypeLabel(
                    model?.vehicleType ?? bikes[0]?.vehicleType ?? "ebike",
                  )}{" "}
                  · {batt}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <KeyIcons mode={mode} />
                  <span className="text-[11px] font-semibold tabular-nums">
                    <span style={{ color: "var(--ok)" }}>{ready} siap</span>
                    {" · "}
                    <span style={{ color: "var(--primary)" }}>{onRent} keluar</span>
                    {waiting > 0 ? (
                      <>
                        {" · "}
                        <span style={{ color: "var(--warn)" }}>
                          {waiting} dipesan
                        </span>
                      </>
                    ) : null}
                    {down > 0 ? (
                      <>
                        {" · "}
                        <span style={{ color: "var(--danger)" }}>
                          {down} perlu cek
                        </span>
                      </>
                    ) : null}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold tabular-nums">{bikes.length}</div>
                <div className="text-[10px]" style={{ color: "var(--text2)" }}>
                  unit
                </div>
                {open ? (
                  <ChevronUp size={16} className="ml-auto mt-1" />
                ) : (
                  <ChevronDown size={16} className="ml-auto mt-1" />
                )}
              </div>
            </button>

            {open ? (
              <div
                className="divide-y border-t px-3"
                style={{ borderColor: "var(--border)" }}
              >
                {bikes
                  .slice()
                  .sort((a, b) => a.code.localeCompare(b.code))
                  .map((v) => {
                    const st = statusMeta(v.status);
                    const unitPhoto =
                      model?.images[
                        Math.abs(v.code.charCodeAt(v.code.length - 1)) %
                          Math.max(model.images.length, 1)
                      ] ?? photo;
                    return (
                      <div
                        key={v.id}
                        className="py-3"
                      >
                        <div className="flex gap-2.5">
                          <div className="relative shrink-0">
                            <Image
                              src={unitPhoto}
                              alt={`${v.name} ${v.code}`}
                              width={64}
                              height={64}
                              className="h-16 w-16 rounded-lg object-cover"
                              style={{ background: "var(--bg-deep)" }}
                            />
                            <span
                              className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white"
                              style={{ background: v.colorHex || "#888" }}
                              title={v.color}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-sm">
                                  {v.code}
                                </div>
                                <div
                                  className="text-[11px]"
                                  style={{ color: "var(--text2)" }}
                                >
                                  {v.color || "—"}
                                  {" · "}
                                  {site?.name ??
                                    moveSites.find((s) => s.id === v.siteId)
                                      ?.name ??
                                    "Belum ditugaskan"}
                                </div>
                              </div>
                              <span
                                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                                style={{
                                  background: st.bg,
                                  color: st.color,
                                }}
                              >
                                {st.label}
                              </span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              <KeyIcons mode={v.rentalMode} />
                              {v.batteryVoltageV != null ? (
                                <span
                                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold"
                                  style={{ color: "var(--text2)" }}
                                >
                                  <Battery size={11} />
                                  {v.batteryVoltageV}V
                                  {v.batteryAh != null
                                    ? `·${v.batteryAh}Ah`
                                    : ""}
                                  {v.batteryPct != null
                                    ? ` · ${v.batteryPct}%`
                                    : ""}
                                </span>
                              ) : (
                                <span
                                  className="text-[10px] font-semibold"
                                  style={{ color: "var(--text2)" }}
                                >
                                  Pedal · no pack
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {!readOnly ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {v.status !== "available" &&
                          v.status !== "rented" &&
                          v.status !== "reserved" ? (
                            <button
                              type="button"
                              className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white"
                              style={{ background: "var(--ok)" }}
                              onClick={() => onStatus(v.id, "available")}
                            >
                              Siap
                            </button>
                          ) : null}
                          {v.status !== "disabled" &&
                          v.status !== "rented" &&
                          v.status !== "reserved" ? (
                            <button
                              type="button"
                              className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold"
                              style={{
                                background: "var(--neutral-soft)",
                                color: "var(--neutral)",
                              }}
                              onClick={() => onStatus(v.id, "disabled")}
                            >
                              Nonaktifkan
                            </button>
                          ) : null}
                          {v.status !== "maintenance" &&
                          v.status !== "rented" ? (
                            <button
                              type="button"
                              className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold"
                              style={{
                                background: "var(--danger-soft)",
                                color: "var(--danger)",
                              }}
                              onClick={() => onStatus(v.id, "maintenance")}
                            >
                              Perawatan
                            </button>
                          ) : null}
                          <select
                            className="rounded-lg px-2 py-1.5 text-[11px] font-bold outline-none"
                            style={{ background: "var(--bg-deep)" }}
                            value={v.siteId || ""}
                            onChange={(e) => onMove(v.id, e.target.value)}
                            aria-label={`Move ${v.code}`}
                          >
                            <option value="">Belum ditugaskan</option>
                            {moveSites.map((s) => (
                              <option key={s.id} value={s.id}>
                                → {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        ) : null}

                        <div className="mt-2">
                          <button
                            type="button"
                            className="text-[11px] font-bold"
                            style={{ color: "var(--primary)" }}
                            onClick={() =>
                              setLogOpen((prev) => ({
                                ...prev,
                                [v.id]: !prev[v.id],
                              }))
                            }
                          >
                            {logOpen[v.id]
                              ? "Sembunyikan log perawatan"
                              : `Log perawatan (${
                                  maintenanceLog.filter((e) => e.vehicleId === v.id)
                                    .length
                                })`}
                          </button>
                          {logOpen[v.id] ? (
                            <div
                              className="mt-2 rounded-lg px-2.5 py-2"
                              style={{ background: "var(--bg-deep)" }}
                            >
                              {maintenanceLog
                                .filter((e) => e.vehicleId === v.id)
                                .slice(0, 5)
                                .map((e) => (
                                  <div
                                    key={e.id}
                                    className="border-b py-1.5 text-[11px] last:border-0"
                                    style={{ borderColor: "var(--border)" }}
                                  >
                                    <div className="font-semibold">{e.note}</div>
                                    <div style={{ color: "var(--text2)" }}>
                                      {e.createdBy} ·{" "}
                                      {new Date(e.createdAt).toLocaleString("id-ID", {
                                        day: "numeric",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </div>
                                  </div>
                                ))}
                              {maintenanceLog.filter((e) => e.vehicleId === v.id)
                                .length === 0 ? (
                                <div
                                  className="py-1 text-[11px]"
                                  style={{ color: "var(--text2)" }}
                                >
                                  Belum ada catatan — bukan perintah IoT.
                                </div>
                              ) : null}
                              {!readOnly && onAddMaintenance ? (
                                <div className="mt-2 flex gap-1.5">
                                  <input
                                    className="min-w-0 flex-1 rounded-lg border px-2 py-1.5 text-[11px] outline-none"
                                    style={{
                                      borderColor: "var(--border)",
                                      background: "var(--card)",
                                    }}
                                    placeholder="Catatan singkat (ban, rem, cas…)"
                                    value={noteDraft[v.id] ?? ""}
                                    onChange={(e) =>
                                      setNoteDraft((prev) => ({
                                        ...prev,
                                        [v.id]: e.target.value,
                                      }))
                                    }
                                  />
                                  <button
                                    type="button"
                                    className="shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-white"
                                    style={{ background: "var(--primary)" }}
                                    onClick={() => {
                                      const note = (noteDraft[v.id] ?? "").trim();
                                      if (!note) return;
                                      onAddMaintenance(v.id, note);
                                      setNoteDraft((prev) => ({
                                        ...prev,
                                        [v.id]: "",
                                      }));
                                    }}
                                  >
                                    Simpan
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

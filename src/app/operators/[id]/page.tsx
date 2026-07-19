"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  Star,
} from "lucide-react";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";
import { PhotoGallery } from "@/components/PhotoGallery";
import { MockMap } from "@/components/MockMap";
import { StarsText } from "@/components/StarRating";
import { useAppStore } from "@/lib/store";
import {
  formatDistance,
  formatIdrShort,
  haversineKm,
  osmBrowseUrl,
  isSiteOpenNow,
  siteOpenClose,
  vehicleTypeLabel,
  resolveDiscoveryCoords,
} from "@/lib/format";
import {
  listModelsForOperator,
  modelBatteryLabel,
  operatorRatingStats,
} from "@/lib/catalog";
import type { OperatorReview, VehicleType } from "@/lib/types";

const PAGE_SIZE = 5;

export default function OperatorDetailPage() {
  return (
    <AuthGate role="rider">
      <Suspense
        fallback={
          <div>
            <Header title="Loading…" backHref="/home" />
            <p className="p-6 text-sm" style={{ color: "var(--text2)" }}>
              Loading hub…
            </p>
          </div>
        }
      >
        <OperatorDetailInner />
      </Suspense>
    </AuthGate>
  );
}

function OperatorDetailInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const siteParam = searchParams.get("site");
  const operators = useAppStore((s) => s.operators);
  const models = useAppStore((s) => s.models);
  const vehicles = useAppStore((s) => s.vehicles);
  const sites = useAppStore((s) => s.sites);
  const bookings = useAppStore((s) => s.bookings);
  const reviews = useAppStore((s) => s.reviews);
  const discoveryPin = useAppStore((s) => s.discoveryPin);
  const discoveryGps = useAppStore((s) => s.discoveryGps);
  const op = operators.find((o) => o.id === id);

  const pin = resolveDiscoveryCoords(discoveryPin, discoveryGps);

  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<"newest" | "highest" | "lowest">("newest");
  const [typeFilter, setTypeFilter] = useState<VehicleType | "all">("all");
  const [selectedSiteId, setSelectedSiteId] = useState<string>(siteParam ?? "");
  const bikesRef = useRef<HTMLDivElement>(null);

  const rating = operatorRatingStats(op?.id ?? "", bookings, reviews);

  const sortedReviews = useMemo(() => {
    const list = [...rating.reviews];
    if (sort === "highest") list.sort((a, b) => b.rating - a.rating);
    else if (sort === "lowest") list.sort((a, b) => a.rating - b.rating);
    else
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    return list;
  }, [rating.reviews, sort]);

  const opSites = useMemo(
    () => (op ? sites.filter((s) => s.operatorId === op.id) : []),
    [sites, op],
  );

  useEffect(() => {
    if (!siteParam) return;
    if (opSites.some((s) => s.id === siteParam)) {
      setSelectedSiteId(siteParam);
    }
  }, [siteParam, opSites]);

  const activeSiteId = selectedSiteId || opSites[0]?.id || "";

  const listings = useMemo(() => {
    if (!op) return [];
    return listModelsForOperator(models, vehicles, op.id, typeFilter).filter(
      (row) => {
        if (!activeSiteId) return row.availableCount > 0 || row.totalCount > 0;
        const atSite = vehicles.filter(
          (v) => v.modelId === row.model.id && v.siteId === activeSiteId,
        );
        return atSite.length > 0;
      },
    ).map((row) => {
      if (!activeSiteId) return row;
      const atSite = vehicles.filter(
        (v) => v.modelId === row.model.id && v.siteId === activeSiteId,
      );
      const free = atSite.filter((v) => v.status === "available");
      return {
        ...row,
        availableCount: free.length,
        totalCount: atSite.length,
        bestBattery: (() => {
          const batts = free
            .map((v) => v.batteryPct)
            .filter((b): b is number => b != null);
          return batts.length ? Math.max(...batts) : null;
        })(),
      };
    });
  }, [op, models, vehicles, typeFilter, activeSiteId]);

  if (!op) {
    return (
      <div>
        <Header title="Not found" backHref="/home" />
        <p className="p-6">Operator not found.</p>
      </div>
    );
  }

  const activeSite = opSites.find((s) => s.id === activeSiteId);
  const distLat = activeSite?.lat ?? op.lat;
  const distLng = activeSite?.lng ?? op.lng;
  const dist = formatDistance(
    haversineKm(pin.lat, pin.lng, distLat, distLng),
  );
  const availableUnits = vehicles.filter(
    (v) =>
      v.operatorId === op.id &&
      v.status === "available" &&
      (!activeSiteId || v.siteId === activeSiteId),
  ).length;
  const oc = siteOpenClose(activeSite ?? { hours: op.hours });
  const openNow = isSiteOpenNow(activeSite ?? { hours: op.hours });

  const totalReviews = sortedReviews.length;
  const totalPages = Math.max(1, Math.ceil(totalReviews / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageReviews = sortedReviews.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );
  const from = totalReviews === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const to = Math.min((safePage + 1) * PAGE_SIZE, totalReviews);

  const galleryImages =
    op.locationImages?.length > 0 ? op.locationImages : [op.coverImage];

  const bookHref = (modelId: string, later = false) => {
    const params = new URLSearchParams();
    if (activeSiteId) params.set("site", activeSiteId);
    if (later) params.set("when", "later");
    const q = params.toString();
    return `/models/${modelId}${q ? `?${q}` : ""}`;
  };

  const firstBookable = listings.find((l) => l.availableCount > 0);

  return (
    <div className="content-pad pb-28">
      <Header
        title={activeSite?.name ?? op.name}
        subtitle={`${op.name} · ${activeSite?.area ?? op.city}`}
        backHref="/home"
      />

      <div className="relative">
        <PhotoGallery images={galleryImages} alt={op.name} tall />
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3 text-white drop-shadow">
          <div>
            <div className="font-display text-xl font-semibold">{op.name}</div>
            <div className="text-xs text-white/90">
              {dist} · {availableUnits} bikes free
              {rating.count > 0 ? ` · ★ ${rating.avg}` : ""}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
        <InfoChip
          icon={Clock}
          label={openNow ? "Open now" : "Closed"}
          value={`${oc.open}–${oc.close}`}
        />
        <InfoChip icon={MapPin} label="Distance" value={dist} />
        <InfoChip
          icon={Star}
          label="Rating"
          value={rating.count ? String(rating.avg) : "New"}
        />
      </div>
      <p
        className="mx-4 mt-2 text-center text-xs font-semibold"
        style={{ color: openNow ? "var(--ok)" : "var(--text-warn)" }}
      >
        {openNow
          ? "● Hub open now — book and collect during hours"
          : "● Hub closed now — Book later for open hours"}
      </p>

      <div className="card !py-3">
        <div className="text-sm" style={{ color: "var(--text2)" }}>
          {activeSite?.address ?? op.address}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <a
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold"
            style={{ background: "var(--bg-deep)", color: "var(--primary)" }}
            href={osmBrowseUrl(
              activeSite?.lat ?? op.lat,
              activeSite?.lng ?? op.lng,
            )}
            target="_blank"
            rel="noreferrer"
          >
            <Navigation size={12} /> Directions
          </a>
          <a
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold"
            style={{ background: "#E8F8F5", color: "var(--ok)" }}
            href={`https://wa.me/${(activeSite?.whatsapp || op.phone).replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={12} /> WhatsApp
          </a>
        </div>
        {(activeSite?.storeInfo || op.shopPickupLabel) && (
          <p
            className="mt-2 rounded-lg px-2.5 py-2 text-xs"
            style={{ background: "var(--bg-deep)", color: "var(--text2)" }}
          >
            {activeSite?.storeInfo ||
              `Collect: ${op.shopPickupLabel}${
                op.supportsSelfService ? ` · Self: ${op.selfCollectLabel}` : ""
              }`}
          </p>
        )}
      </div>

      {opSites.length > 1 ? (
        <>
          <p className="section-label">Pickup hub</p>
          <div className="mx-4 flex gap-2 overflow-x-auto pb-1">
            {opSites.map((s) => {
              const free = vehicles.filter(
                (v) => v.siteId === s.id && v.status === "available",
              ).length;
              const on = activeSiteId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  className="shrink-0 rounded-2xl border px-3.5 py-2.5 text-left"
                  style={{
                    borderColor: on ? "var(--primary)" : "var(--border)",
                    background: on
                      ? "color-mix(in srgb, var(--primary) 10%, white)"
                      : "var(--card)",
                    minWidth: "9.5rem",
                  }}
                  onClick={() => setSelectedSiteId(s.id)}
                >
                  <div className="text-sm font-bold">{s.name}</div>
                  <div className="text-[11px]" style={{ color: "var(--text2)" }}>
                    {s.area} · {free} free
                  </div>
                  <div
                    className="mt-0.5 text-[10px] font-semibold"
                    style={{ color: "var(--ok)" }}
                  >
                    {s.hours}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      <div className="mx-4 mt-2 overflow-hidden rounded-2xl">
        <MockMap
          height={150}
          mapImage={activeSite?.mapImage || op.mapImage}
          label={`Approximate map · ${activeSite?.name ?? op.name}`}
          directionsHref={
            activeSite
              ? osmBrowseUrl(activeSite.lat, activeSite.lng)
              : osmBrowseUrl(op.lat, op.lng)
          }
          userPin={{ top: "70%", left: "35%" }}
          pins={[
            {
              id: "hub",
              label: activeSite?.name ?? "Hub",
              top: "42%",
              left: "58%",
            },
          ]}
        />
      </div>

      <div ref={bikesRef}>
        <p className="section-label">
          Choose a bike
          {activeSite ? ` · ${activeSite.name}` : ""}
        </p>
        <div className="mb-2 flex gap-2 overflow-x-auto px-4">
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

        {listings.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm" style={{ color: "var(--text2)" }}>
            No bikes at this hub right now. Try another pickup spot.
          </p>
        ) : (
          listings.map(({ model, availableCount, totalCount }) => {
            const soldOut = availableCount <= 0;
            return (
              <div
                key={model.id}
                className="mx-4 mb-2.5 rounded-2xl p-3"
                style={{
                  background: "var(--card)",
                  opacity: soldOut ? 0.7 : 1,
                }}
              >
                <div className="flex gap-3">
                  {soldOut ? (
                    <div className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={model.images[0]}
                        alt={model.name}
                        className="h-[88px] w-[96px] rounded-xl object-cover"
                      />
                    </div>
                  ) : (
                    <Link
                      href={bookHref(model.id, false)}
                      className="shrink-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={model.images[0]}
                        alt={model.name}
                        className="h-[88px] w-[96px] rounded-xl object-cover"
                      />
                    </Link>
                  )}
                  <div className="min-w-0 flex-1">
                    {soldOut ? (
                      <div className="font-bold text-sm">{model.name}</div>
                    ) : (
                      <Link
                        href={bookHref(model.id, false)}
                        className="font-bold text-sm"
                      >
                        {model.name}
                      </Link>
                    )}
                    <div className="text-xs" style={{ color: "var(--text2)" }}>
                      {vehicleTypeLabel(model.vehicleType)} ·{" "}
                      {modelBatteryLabel(model)}
                    </div>
                    <div className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
                      {soldOut
                        ? "Sold out here"
                        : `${availableCount} of ${totalCount} ready`}
                    </div>
                    <div
                      className="mt-1 font-bold"
                      style={{ color: "var(--primary)" }}
                    >
                      from {formatIdrShort(model.pricePerHour)}/hr
                    </div>
                  </div>
                </div>
                {!soldOut ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Link
                      href={bookHref(model.id, false)}
                      className="rounded-xl py-2.5 text-center text-xs font-bold text-white"
                      style={{ background: "var(--primary)" }}
                    >
                      Book now
                    </Link>
                    <Link
                      href={bookHref(model.id, true)}
                      className="rounded-xl py-2.5 text-center text-xs font-bold"
                      style={{
                        background: "var(--bg-deep)",
                        color: "var(--primary)",
                      }}
                    >
                      Book later
                    </Link>
                  </div>
                ) : (
                  <div
                    className="mt-3 rounded-xl py-2.5 text-center text-xs font-bold"
                    style={{ background: "var(--bg-deep)", color: "var(--text2)" }}
                  >
                    Sold out
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mx-4 mb-1 mt-4 flex items-center justify-between gap-3">
        <p
          className="text-[11px] font-bold uppercase tracking-wide"
          style={{ color: "var(--text2)" }}
        >
          Reviews{totalReviews > 0 ? ` · ${totalReviews}` : ""}
        </p>
        {rating.count > 0 ? (
          <div
            className="flex items-center gap-1.5"
            aria-label={`Average rating ${rating.avg} out of 5`}
          >
            <StarsText value={rating.avg} />
            <span className="text-sm font-extrabold" style={{ color: "var(--text)" }}>
              {rating.avg.toFixed(1)}
            </span>
            <span className="text-xs font-semibold" style={{ color: "var(--text2)" }}>
              / 5
            </span>
          </div>
        ) : null}
      </div>
      {totalReviews === 0 ? (
        <p className="px-6 text-sm" style={{ color: "var(--text2)" }}>
          No reviews yet.
        </p>
      ) : (
        <>
          <div className="mx-4 mb-2 flex gap-2">
            {(
              [
                ["newest", "Newest"],
                ["highest", "Highest"],
                ["lowest", "Lowest"],
              ] as const
            ).map(([sid, label]) => (
              <button
                key={sid}
                type="button"
                className="rounded-full px-3 py-1 text-[11px] font-semibold"
                style={{
                  background:
                    sort === sid
                      ? "color-mix(in srgb, var(--primary) 14%, white)"
                      : "var(--card)",
                  color: sort === sid ? "var(--primary)" : "var(--text2)",
                  border: `1px solid ${sort === sid ? "var(--primary)" : "var(--border)"}`,
                }}
                onClick={() => {
                  setSort(sid);
                  setPage(0);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="px-6 pb-1 text-xs" style={{ color: "var(--text2)" }}>
            Showing {from}–{to} of {totalReviews}
            {rating.count > 0
              ? ` · Operator experience ${rating.avg.toFixed(1)} / 5`
              : ""}
          </p>
          {pageReviews.map((r: OperatorReview) => (
            <div key={r.id} className="card">
              <div className="flex justify-between">
                <div className="font-bold text-sm">{r.riderName}</div>
                <StarsText value={r.rating} />
              </div>
              <div className="mt-0.5 text-xs" style={{ color: "var(--text2)" }}>
                {r.modelName}
              </div>
              <p className="mt-2 text-sm">{r.note}</p>
            </div>
          ))}
          <div className="mx-4 mt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              className="rounded-xl px-4 py-2 text-xs font-bold"
              style={{
                background: "var(--bg-deep)",
                color: "var(--primary)",
                opacity: safePage === 0 ? 0.4 : 1,
              }}
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ← Previous
            </button>
            <span className="text-xs" style={{ color: "var(--text2)" }}>
              Page {safePage + 1} / {totalPages}
            </span>
            <button
              type="button"
              className="rounded-xl px-4 py-2 text-xs font-bold"
              style={{
                background: "var(--bg-deep)",
                color: "var(--primary)",
                opacity: safePage >= totalPages - 1 ? 0.4 : 1,
              }}
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Next →
            </button>
          </div>
        </>
      )}

      <div
        className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
        style={{
          background: "color-mix(in srgb, var(--card) 94%, transparent)",
          borderColor: "var(--border)",
          backdropFilter: "blur(10px)",
        }}
      >
        {firstBookable ? (
          listings.length === 1 ? (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={bookHref(firstBookable.model.id, false)}
                className="rounded-xl py-3.5 text-center text-sm font-bold text-white"
                style={{ background: "var(--primary)" }}
              >
                Book now
              </Link>
              <Link
                href={bookHref(firstBookable.model.id, true)}
                className="rounded-xl py-3.5 text-center text-sm font-bold"
                style={{ background: "var(--bg-deep)", color: "var(--primary)" }}
              >
                Book later
              </Link>
            </div>
          ) : (
            <button
              type="button"
              className="w-full rounded-xl py-3.5 text-sm font-bold text-white"
              style={{ background: "var(--primary)" }}
              onClick={() =>
                bikesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              Choose a bike below
            </button>
          )
        ) : (
          <button
            type="button"
            className="w-full rounded-xl py-3.5 text-sm font-bold"
            style={{ background: "var(--bg-deep)", color: "var(--text2)" }}
            onClick={() =>
              bikesRef.current?.scrollIntoView({ behavior: "smooth" })
            }
          >
            See bikes at this hub
          </button>
        )}
        <p className="mt-1.5 text-center text-[10px]" style={{ color: "var(--text2)" }}>
          {activeSite
            ? `Pickup at ${activeSite.name} · Book later = pick date & time ahead`
            : "Book later = advance booking · pick date & time"}
        </p>
      </div>
    </div>
  );
}

function InfoChip({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
}) {
  return (
    <div
      className="rounded-xl px-2.5 py-2.5 text-center"
      style={{ background: "var(--card)" }}
    >
      <Icon size={14} className="mx-auto" style={{ color: "var(--primary)" }} />
      <div className="mt-1 text-[10px]" style={{ color: "var(--text2)" }}>
        {label}
      </div>
      <div className="truncate text-xs font-bold">{value}</div>
    </div>
  );
}

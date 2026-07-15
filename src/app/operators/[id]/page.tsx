"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Header } from "@/components/Header";
import { ContactActions } from "@/components/ContactActions";
import { PhotoGallery } from "@/components/PhotoGallery";
import { useAppStore } from "@/lib/store";
import {
  formatDistance,
  formatIdrShort,
  haversineKm,
  osmBrowseUrl,
  vehicleTypeLabel,
  USER_LAT,
  USER_LNG,
} from "@/lib/format";
import {
  listModelsForOperator,
  modelBatteryLabel,
  operatorRatingStats,
} from "@/lib/catalog";
import { Star } from "lucide-react";
import { MockMap } from "@/components/MockMap";
import type { OperatorReview } from "@/lib/types";

const PAGE_SIZE = 5;

export default function OperatorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const operators = useAppStore((s) => s.operators);
  const models = useAppStore((s) => s.models);
  const vehicles = useAppStore((s) => s.vehicles);
  const bookings = useAppStore((s) => s.bookings);
  const reviews = useAppStore((s) => s.reviews);
  const favorites = useAppStore((s) => s.favorites);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const op = operators.find((o) => o.id === id);

  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<"newest" | "highest" | "lowest">("newest");

  const rating = operatorRatingStats(
    op?.id ?? "",
    bookings,
    reviews,
  );

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

  if (!op) {
    return (
      <div>
        <Header title="Not found" backHref="/home" />
        <p className="p-6">Operator not found.</p>
      </div>
    );
  }

  const dist = formatDistance(haversineKm(USER_LAT, USER_LNG, op.lat, op.lng));
  const listings = listModelsForOperator(models, vehicles, op.id);
  const availableUnits = vehicles.filter(
    (v) => v.operatorId === op.id && v.status === "available",
  ).length;

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
    op.locationImages?.length > 0
      ? op.locationImages
      : [op.coverImage];

  return (
    <div className="content-pad pb-8">
      <Header
        title={op.name}
        subtitle={`${op.city} · Rental station`}
        backHref="/home"
        right={
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center"
            onClick={() => toggleFavorite(op.id)}
            aria-label="Favorite operator"
          >
            <Star
              size={18}
              fill={favorites.includes(op.id) ? "#F4D03F" : "none"}
              color="#F4D03F"
            />
          </button>
        }
      />

      <div className="mx-4 mt-3 space-y-3">
        <PhotoGallery images={galleryImages} alt={op.name} />
        <MockMap
          height={160}
          mapImage={op.mapImage}
          label={`OpenStreetMap · ${op.city}`}
          userPin={{ top: "70%", left: "35%" }}
          pins={[
            { id: "shop", label: "Shop", top: "40%", left: "55%" },
            ...(op.supportsSelfService
              ? [
                  {
                    id: "self",
                    label: "Self-collect",
                    top: "55%",
                    left: "72%",
                  },
                ]
              : []),
            { id: "casan", label: "Casan hub", top: "28%", left: "42%" },
          ]}
        />
        <a
          className="block rounded-xl px-3 py-2 text-center text-xs font-bold"
          style={{ background: "var(--bg-deep)", color: "var(--primary)" }}
          href={osmBrowseUrl(op.lat, op.lng)}
          target="_blank"
          rel="noreferrer"
        >
          Open station on OpenStreetMap →
        </a>
      </div>

      <div className="card">
        <div className="flex justify-between gap-3">
          <div>
            <div className="text-lg font-bold">{op.name}</div>
            <div className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
              {op.address}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span
                className="rounded-full px-2 py-1 font-semibold"
                style={{ background: "#E8F8F5", color: "var(--ok)" }}
              >
                Open · {op.hours}
              </span>
              <span style={{ color: "var(--text2)" }}>{dist} away</span>
            </div>
            <div
              className="mt-2 text-sm font-semibold"
              style={{ color: "var(--primary)" }}
            >
              {rating.count > 0
                ? `★ ${rating.avg} · ${rating.count} reviews`
                : "No reviews yet"}
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: "var(--primary)" }}
            >
              {availableUnits}
            </div>
            <div className="text-[11px]" style={{ color: "var(--text2)" }}>
              units free
            </div>
          </div>
        </div>

        <div
          className="mt-3 space-y-2 border-t pt-3 text-xs"
          style={{ borderColor: "var(--border)", color: "var(--text2)" }}
        >
          {op.supportsFrontDesk ? (
            <div>
              <strong style={{ color: "var(--text)" }}>Collect at shop:</strong>{" "}
              {op.shopPickupLabel}
            </div>
          ) : null}
          {op.supportsSelfService ? (
            <div>
              <strong style={{ color: "var(--text)" }}>Self-collect:</strong>{" "}
              {op.selfCollectLabel}
            </div>
          ) : null}
        </div>
      </div>

      <div className="card">
        <div className="mb-2 font-bold">Contact</div>
        <ContactActions phone={op.phone} email={op.email} name={op.name} />
      </div>

      <p className="section-label">Models & stock</p>
      {listings.map(({ model, availableCount, totalCount }) => (
        <Link
          key={model.id}
          href={`/models/${model.id}`}
          className="mx-4 mb-2.5 flex gap-3 rounded-2xl p-3"
          style={{
            background: "var(--card)",
            opacity: availableCount > 0 ? 1 : 0.65,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={model.images[0]}
            alt=""
            className="h-[72px] w-[88px] rounded-xl object-cover"
          />
          <div className="flex-1">
            <div className="font-bold text-sm">{model.name}</div>
            <div className="text-xs" style={{ color: "var(--text2)" }}>
              {vehicleTypeLabel(model.vehicleType)} · {modelBatteryLabel(model)}
            </div>
            <div className="text-xs" style={{ color: "var(--text2)" }}>
              {availableCount} of {totalCount} available
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span className="font-bold" style={{ color: "var(--primary)" }}>
                from {formatIdrShort(model.pricePerHour)}/hr
              </span>
              <span style={{ color: "var(--text2)" }}>
                {availableCount > 0 ? "Book" : "Sold out"}
              </span>
            </div>
          </div>
        </Link>
      ))}

      <p className="section-label">
        Reviews{totalReviews > 0 ? ` · ${totalReviews} total` : ""}
      </p>

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
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="rounded-full px-3 py-1 text-[11px] font-semibold"
                style={{
                  background:
                    sort === id
                      ? "color-mix(in srgb, var(--primary) 14%, white)"
                      : "var(--card)",
                  color: sort === id ? "var(--primary)" : "var(--text2)",
                  border: `1px solid ${sort === id ? "var(--primary)" : "var(--border)"}`,
                }}
                onClick={() => {
                  setSort(id);
                  setPage(0);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <p
            className="px-6 pb-1 text-xs"
            style={{ color: "var(--text2)" }}
          >
            Showing {from}–{to} of {totalReviews}
          </p>

          {pageReviews.map((r: OperatorReview) => (
            <div key={r.id} className="card">
              <div className="flex justify-between">
                <div className="font-bold text-sm">{r.riderName}</div>
                <div
                  className="text-xs font-semibold"
                  style={{ color: "var(--primary)" }}
                >
                  {"★".repeat(r.rating)}
                </div>
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
              onClick={() =>
                setPage((p) => Math.min(totalPages - 1, p + 1))
              }
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}

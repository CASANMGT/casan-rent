"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, MapPin, Navigation } from "lucide-react";
import type { OperatorSite } from "@/lib/types";
import { siteShortLabel } from "@/lib/operator-ui";

/** Section title — clean, professional. */
export function OpSection({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between px-4 pb-2 pt-6">
      <div className="flex items-center gap-2.5">
        {Icon ? (
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              background: "color-mix(in srgb, var(--primary) 10%, white)",
              color: "var(--primary)",
            }}
          >
            <Icon size={18} strokeWidth={2} />
          </span>
        ) : null}
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            {title}
          </h2>
          {hint ? (
            <p className="text-xs leading-snug" style={{ color: "var(--text2)" }}>
              {hint}
            </p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function OpStat({
  href,
  value,
  label,
  sub,
  icon: Icon,
  color,
}: {
  href?: string;
  value: string;
  label: string;
  sub?: string;
  icon: LucideIcon;
  color: string;
}) {
  const inner = (
    <>
      <div
        className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ background: `color-mix(in srgb, ${color} 12%, white)` }}
      >
        <Icon size={18} strokeWidth={2} style={{ color }} />
      </div>
      <div className="text-2xl font-bold tabular-nums tracking-tight" style={{ color }}>
        {value}
      </div>
      <div className="mt-0.5 text-xs font-semibold" style={{ color: "var(--text)" }}>
        {label}
      </div>
      {sub ? (
        <div className="text-[10px]" style={{ color: "var(--text2)" }}>
          {sub}
        </div>
      ) : null}
    </>
  );
  const className =
    "rounded-2xl border p-3.5 text-left transition active:scale-[0.98]";
  const style = {
    background: "var(--card)",
    borderColor: "color-mix(in srgb, var(--border) 80%, transparent)",
  };

  if (href) {
    return (
      <Link href={href} className={className} style={style}>
        {inner}
      </Link>
    );
  }
  return (
    <div className={className} style={style}>
      {inner}
    </div>
  );
}

export function OpMenuLink({
  href,
  icon: Icon,
  label,
  hint,
  badge,
  onClick,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  hint: string;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="mx-4 mb-2 flex items-center gap-3 rounded-2xl border px-4 py-3.5"
      style={{
        background: "var(--card)",
        borderColor: "color-mix(in srgb, var(--border) 80%, transparent)",
      }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: "color-mix(in srgb, var(--primary) 10%, white)",
          color: "var(--primary)",
        }}
      >
        <Icon size={20} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs" style={{ color: "var(--text2)" }}>
          {hint}
        </div>
      </div>
      {badge ? (
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
          style={{ background: "var(--danger)" }}
        >
          {badge}
        </span>
      ) : (
        <ChevronRight size={18} style={{ color: "var(--text2)" }} />
      )}
    </Link>
  );
}

export function CityBadge({ city }: { city: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        background: "color-mix(in srgb, var(--primary) 8%, white)",
        color: "var(--primary)",
      }}
    >
      {city}
    </span>
  );
}

export function AreaBadge({ area }: { area: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold"
      style={{ background: "var(--bg-deep)", color: "var(--text)" }}
    >
      <Navigation size={10} />
      {area}
    </span>
  );
}

export function SiteRow({
  site,
  meta,
  href,
}: {
  site: OperatorSite;
  meta: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <AreaBadge area={site.area} />
        <CityBadge city={site.city} />
      </div>
      <div className="mt-1.5 font-semibold text-sm">{site.name}</div>
      <div className="mt-0.5 flex items-start gap-1 text-xs leading-relaxed" style={{ color: "var(--text2)" }}>
        <MapPin size={12} className="mt-0.5 shrink-0" />
        {site.address}
      </div>
      <div className="mt-2 text-xs font-medium" style={{ color: "var(--primary)" }}>
        {meta}
      </div>
    </>
  );
  const className =
    "mx-4 mb-2 block rounded-2xl border px-4 py-3.5 transition active:scale-[0.99]";
  const style = {
    background: "var(--card)",
    borderColor: "color-mix(in srgb, var(--border) 80%, transparent)",
  };

  if (href) {
    return (
      <Link href={href} className={className} style={style}>
        {inner}
      </Link>
    );
  }
  return (
    <div className={className} style={style}>
      {inner}
    </div>
  );
}

export function OpBigButton({
  children,
  onClick,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ok" | "danger" | "warn";
  className?: string;
}) {
  const bg =
    variant === "ok"
      ? "var(--ok)"
      : variant === "danger"
        ? "#FADBD8"
        : variant === "warn"
          ? "#b45309"
          : "var(--primary)";
  const color = variant === "danger" ? "var(--danger)" : "white";
  return (
    <button
      type="button"
      className={`w-full rounded-xl py-3.5 text-base font-semibold ${className}`}
      style={{ background: bg, color }}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function sitePickerLabel(site: OperatorSite, freeCount?: number): string {
  const base = siteShortLabel(site);
  return freeCount != null ? `${base} · ${freeCount} siap` : base;
}

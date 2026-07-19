"use client";

import { useCallback, useRef } from "react";

/** OpenStreetMap static screenshot background with overlay pins (no Google). */
export function MockMap({
  pins = [],
  userPin,
  height = 180,
  label = "Approximate map · demo",
  mapImage,
  directionsHref,
  /** When set with userPin, rider can drag the blue pin (demo geofence). */
  onUserPinDrag,
}: {
  pins?: { id: string; label: string; top: string; left: string; href?: string }[];
  userPin?: { top: string; left: string };
  height?: number;
  label?: string;
  /** Bundled OSM static screenshot, e.g. /maps/margonda.svg */
  mapImage?: string;
  /** Real navigation — prefer this over trusting pin positions. */
  directionsHref?: string;
  onUserPinDrag?: (pos: { topPct: number; leftPct: number }) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const moveToClient = useCallback(
    (clientX: number, clientY: number) => {
      const el = mapRef.current;
      if (!el || !onUserPinDrag) return;
      const rect = el.getBoundingClientRect();
      const leftPct = Math.min(
        95,
        Math.max(5, ((clientX - rect.left) / rect.width) * 100),
      );
      const topPct = Math.min(
        95,
        Math.max(5, ((clientY - rect.top) / rect.height) * 100),
      );
      onUserPinDrag({ topPct, leftPct });
    },
    [onUserPinDrag],
  );

  function onPointerDown(e: React.PointerEvent) {
    if (!onUserPinDrag) return;
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    moveToClient(e.clientX, e.clientY);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current || !onUserPinDrag) return;
    moveToClient(e.clientX, e.clientY);
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragging.current) return;
    dragging.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      ref={mapRef}
      className="relative overflow-hidden rounded-2xl"
      style={{
        height,
        background: "#f2efe9",
        backgroundImage: mapImage ? `url(${mapImage})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        touchAction: onUserPinDrag ? "none" : undefined,
      }}
    >
      {!mapImage ? (
        <>
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: `
            linear-gradient(90deg, transparent 48%, #dad5c9 48%, #dad5c9 52%, transparent 52%),
            linear-gradient(0deg, transparent 48%, #dad5c9 48%, #dad5c9 52%, transparent 52%),
            radial-gradient(circle at 70% 30%, #cde5c0 0%, transparent 35%),
            radial-gradient(circle at 20% 70%, #a8c4d8 0%, transparent 28%)
          `,
              backgroundSize: "40px 40px, 40px 40px, 100% 100%, 100% 100%",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(145deg, rgba(242,239,233,0.55) 0%, rgba(205,229,192,0.25) 45%, rgba(242,239,233,0.4) 100%)",
            }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.08) 100%)",
          }}
        />
      )}

      {pins.map((p) =>
        p.href ? (
          <a
            key={p.id}
            href={p.href}
            className="absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ top: p.top, left: p.left, background: "var(--primary)" }}
            title={p.label}
          >
            ·
          </a>
        ) : (
          <div
            key={p.id}
            className="absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ top: p.top, left: p.left, background: "var(--primary)" }}
            title={p.label}
          >
            ·
          </div>
        ),
      )}

      {userPin ? (
        <div
          role={onUserPinDrag ? "slider" : undefined}
          aria-label={
            onUserPinDrag ? "Drag to move your demo location on the map" : undefined
          }
          className={`absolute z-20 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white ${
            onUserPinDrag ? "cursor-grab active:cursor-grabbing" : ""
          }`}
          style={{
            top: userPin.top,
            left: userPin.left,
            background: "var(--digital)",
            boxShadow: "0 0 0 4px rgba(40,116,166,0.25)",
            touchAction: "none",
          }}
          title={
            onUserPinDrag
              ? "Drag to simulate parking near the hub"
              : "You (approximate)"
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      ) : null}

      <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-30 flex items-center justify-between gap-2">
        <div
          className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold"
          style={{ color: "var(--text2)" }}
        >
          {label}
        </div>
        {directionsHref ? (
          <a
            href={directionsHref}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto rounded-full px-2.5 py-1 text-[10px] font-bold text-white"
            style={{ background: "var(--primary)" }}
          >
            Directions (OSM)
          </a>
        ) : null}
      </div>
    </div>
  );
}

"use client";

/** OpenStreetMap static screenshot background with overlay pins (no Google). */
export function MockMap({
  pins = [],
  userPin,
  height = 180,
  label = "OpenStreetMap",
  mapImage,
}: {
  pins?: { id: string; label: string; top: string; left: string; href?: string }[];
  userPin?: { top: string; left: string };
  height?: number;
  label?: string;
  /** Bundled OSM static screenshot, e.g. /maps/margonda.svg */
  mapImage?: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        height,
        background: "#f2efe9",
        backgroundImage: mapImage ? `url(${mapImage})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
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
            className="absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full text-sm font-bold text-white shadow"
            style={{ top: p.top, left: p.left, background: "var(--primary)" }}
            title={p.label}
          >
            📍
          </a>
        ) : (
          <div
            key={p.id}
            className="absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-full items-center justify-center rounded-full text-sm font-bold text-white shadow"
            style={{ top: p.top, left: p.left, background: "var(--primary)" }}
            title={p.label}
          >
            📍
          </div>
        ),
      )}

      {userPin ? (
        <div
          className="absolute z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white"
          style={{
            top: userPin.top,
            left: userPin.left,
            background: "var(--digital)",
            boxShadow: "0 0 0 4px rgba(40,116,166,0.25)",
          }}
          title="You"
        />
      ) : null}

      <div
        className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold"
        style={{ color: "var(--text2)" }}
      >
        {label}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

export function PhotoGallery({
  images,
  alt,
  tall,
}: {
  images: string[];
  alt: string;
  tall?: boolean;
}) {
  const [idx, setIdx] = useState(0);
  const list = images.length ? images : ["/vehicles/ebike.svg"];
  const src = list[Math.min(idx, list.length - 1)];

  return (
    <div className="relative overflow-hidden rounded-2xl" style={{ background: "var(--bg-deep)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`w-full object-cover ${tall ? "h-56" : "h-44"}`}
      />
      {list.length > 1 ? (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {list.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Photo ${i + 1}`}
              className="h-2 w-2 rounded-full"
              style={{
                background: i === idx ? "white" : "rgba(255,255,255,0.45)",
              }}
              onClick={() => setIdx(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

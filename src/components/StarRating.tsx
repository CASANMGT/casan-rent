"use client";

import { Star } from "lucide-react";

const YELLOW = "#F4D03F";
const EMPTY = "#D5D8DC";

/** Yellow star rating — filled for value, empty for the rest. */
export function StarRating({
  value,
  max = 5,
  size = 22,
  interactive = false,
  onChange,
}: {
  value: number;
  max?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (n: number) => void;
}) {
  return (
    <div
      className="inline-flex items-center gap-1"
      role={interactive ? "radiogroup" : "img"}
      aria-label={`${value} of ${max} stars`}
    >
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        const filled = n <= value;
        if (interactive && onChange) {
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={n === value}
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              className="p-0.5"
              onClick={() => onChange(n)}
            >
              <Star
                size={size}
                fill={filled ? YELLOW : "none"}
                color={filled ? YELLOW : EMPTY}
                strokeWidth={1.75}
              />
            </button>
          );
        }
        return (
          <Star
            key={n}
            size={size}
            fill={filled ? YELLOW : "none"}
            color={filled ? YELLOW : EMPTY}
            strokeWidth={1.75}
          />
        );
      })}
    </div>
  );
}

/** Compact yellow ★ text for lists (always yellow, not brand teal). */
export function StarsText({ value }: { value: number }) {
  return (
    <span style={{ color: YELLOW, letterSpacing: 1 }}>
      {"★".repeat(Math.max(0, Math.min(5, Math.round(value))))}
      <span style={{ color: EMPTY }}>
        {"★".repeat(Math.max(0, 5 - Math.round(value)))}
      </span>
    </span>
  );
}

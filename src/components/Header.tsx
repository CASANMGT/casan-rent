"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function Header({
  title,
  subtitle,
  backHref,
  right,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  right?: React.ReactNode;
}) {
  return (
    <header
      className="sticky top-0 z-40 px-4 py-3 text-white"
      style={{
        background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        {backHref ? (
          <Link
            href={backHref}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20"
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </Link>
        ) : (
          <div className="w-9" />
        )}
        <div className="flex-1 text-center">
          <h1 className="font-display text-lg font-semibold leading-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-xs text-white/80">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex min-w-9 justify-end">{right}</div>
      </div>
    </header>
  );
}

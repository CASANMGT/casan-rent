"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { useAppStore } from "@/lib/store";
import {
  APP_VERSION,
  CHANGELOG,
  hasUnseenUpdates,
} from "@/lib/version";

export default function UpdatesPage() {
  const lastSeenVersion = useAppStore((s) => s.lastSeenVersion);
  const markVersionSeen = useAppStore((s) => s.markVersionSeen);
  const user = useAppStore((s) => s.user);
  const unseen = hasUnseenUpdates(lastSeenVersion);
  const [openVersions, setOpenVersions] = useState<Record<string, boolean>>(
    () => ({ [CHANGELOG[0]?.version ?? ""]: true }),
  );

  useEffect(() => {
    markVersionSeen();
  }, [markVersionSeen]);

  const backHref = user.role === "operator" ? "/operator/profile" : "/profile";
  const nav = user.role === "operator" ? "operator" : "rider";

  return (
    <div className="content-pad">
      <Header title="What's New" subtitle={`v${APP_VERSION}`} backHref={backHref} />

      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs" style={{ color: "var(--text2)" }}>
              Current version
            </div>
            <div className="font-display text-2xl font-semibold">
              v{APP_VERSION}
            </div>
          </div>
          {unseen ? (
            <span
              className="rounded-full px-2.5 py-1 text-xs font-bold"
              style={{ background: "#E8F8F5", color: "var(--ok)" }}
            >
              Just updated
            </span>
          ) : (
            <span className="text-xs" style={{ color: "var(--text2)" }}>
              You&apos;re up to date
            </span>
          )}
        </div>
        <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
          Tap a release to expand details. Latest stays open by default.
        </p>
      </div>

      {CHANGELOG.map((entry, i) => {
        const open = Boolean(openVersions[entry.version]);
        return (
          <div key={entry.version} className="card !py-0 overflow-hidden">
            <button
              type="button"
              className="flex w-full items-start justify-between gap-2 px-4 py-3.5 text-left"
              aria-expanded={open}
              onClick={() =>
                setOpenVersions((prev) => ({
                  ...prev,
                  [entry.version]: !prev[entry.version],
                }))
              }
            >
              <div className="min-w-0">
                <div className="font-bold">
                  v{entry.version}
                  {i === 0 ? (
                    <span
                      className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: "var(--primary)", color: "white" }}
                    >
                      Latest
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 text-sm font-semibold">{entry.title}</div>
                {entry.details && open ? (
                  <p
                    className="mt-1.5 text-xs leading-relaxed"
                    style={{ color: "var(--text2)" }}
                  >
                    {entry.details}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs" style={{ color: "var(--text2)" }}>
                  {entry.date}
                </span>
                <ChevronDown
                  size={18}
                  style={{
                    color: "var(--text2)",
                    transform: open ? "rotate(180deg)" : undefined,
                    transition: "transform 0.15s ease",
                  }}
                />
              </div>
            </button>
            {open ? (
              <ul
                className="space-y-1.5 border-t px-4 pb-3.5 pt-3 text-sm"
                style={{ borderColor: "var(--border)", color: "var(--text2)" }}
              >
                {entry.highlights.map((h) => (
                  <li key={h} className="flex gap-2">
                    <span style={{ color: "var(--primary)" }}>•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}

      <Link href={backHref} className="btn-secondary text-center">
        Back to profile
      </Link>
      <BottomNav variant={nav} />
    </div>
  );
}

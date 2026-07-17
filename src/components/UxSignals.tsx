"use client";

import { useEffect, useState } from "react";
import {
  ChevronRight,
  Clock3,
  CloudSun,
  LocateFixed,
  ShieldCheck,
  X,
} from "lucide-react";
import { formatTimer, relativeAge } from "@/lib/format";
import { useAppStore } from "@/lib/store";
import type { Booking } from "@/lib/types";

function useClock(intervalMs: number) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const update = () => setNow(Date.now());
    const first = window.setTimeout(update, 0);
    const timer = window.setInterval(update, intervalMs);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [intervalMs]);
  return now;
}

export function PendingAge({ createdAt }: { createdAt: string }) {
  const now = useClock(30_000);
  const age = relativeAge(createdAt, now || new Date(createdAt).getTime());
  const color =
    age.tone === "danger"
      ? "var(--danger)"
      : age.tone === "warn"
        ? "var(--text-warn)"
        : "var(--text2)";
  return (
    <span className="inline-flex items-center gap-1 font-bold" style={{ color }}>
      <Clock3 size={12} />
      {age.label}
    </span>
  );
}

export function GpsFreshness({
  updatedAt,
  label = "GPS",
  mock = false,
}: {
  updatedAt?: number | null;
  label?: string;
  mock?: boolean;
}) {
  const now = useClock(1_000);
  const seconds = Math.max(
    0,
    Math.floor((now - (updatedAt ?? now)) / 1_000),
  );
  return (
    <span className="inline-flex items-center gap-1">
      <LocateFixed size={12} />
      {label}{mock ? " · demo" : ""} · Updated{" "}
      {seconds < 2 ? "just now" : `${seconds} sec ago`}
    </span>
  );
}

export function CollectWindow({ booking }: { booking: Booking }) {
  const now = useClock(1_000);
  const readyAt = booking.readyAt
    ? new Date(booking.readyAt).getTime()
    : new Date(booking.createdAt).getTime();
  const secondsLeft = Math.max(
    0,
    Math.ceil((readyAt + 15 * 60_000 - (now || readyAt)) / 1_000),
  );
  const elapsed = now > 0 && secondsLeft === 0;
  return (
    <div
      className="mx-4 mt-3 flex items-center gap-3 rounded-xl border px-4 py-3"
      style={{
        borderColor: elapsed ? "var(--danger)" : "var(--warn)",
        background: elapsed ? "var(--danger-soft)" : "var(--warning-soft)",
      }}
    >
      <Clock3
        size={20}
        className="shrink-0"
        style={{ color: elapsed ? "var(--danger)" : "var(--text-warn)" }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">
          {elapsed ? "Collection window passed" : "Arrive within 15 minutes"}
        </div>
        <div className="text-xs" style={{ color: "var(--text2)" }}>
          {elapsed
            ? "Your booking is still held — contact the hub if delayed."
            : "Your rental timer starts only when you collect or unlock."}
        </div>
      </div>
      {!elapsed ? (
        <span
          className="font-display shrink-0 text-lg font-bold tabular-nums"
          style={{ color: "var(--text-warn)" }}
        >
          {formatTimer(secondsLeft)}
        </span>
      ) : null}
    </div>
  );
}

const welcomeSteps = [
  {
    emoji: "🗺",
    title: "Find Nearby Bikes",
    body: "Browse hubs near you to find available bikes. Tap any hub to see bike details, battery level, and walking distance.",
  },
  {
    emoji: "💳",
    title: "Book & Pay",
    body: "Pick your pickup time and duration, then pay with QRIS or e-wallet — or pay at the hub counter where supported.",
  },
  {
    emoji: "🔑",
    title: "Collect & Ride",
    body: "Show your booking code at the hub or unlock with the app. Your timer starts when you collect — never at payment.",
  },
] as const;

function SafetyContent({ city }: { city: string }) {
  const bali = city.toLowerCase().includes("bali");
  return (
    <>
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} style={{ color: "var(--primary)" }} />
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--primary)" }}>
            Local riding tips
          </div>
          <div className="font-bold">
            {bali ? "First time riding in Bali?" : "Riding around Jakarta?"}
          </div>
        </div>
      </div>
      <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--text2)" }}>
        <li>• Wear the provided helmet and ride on the left.</li>
        <li>• Never use your phone while moving — pull over first.</li>
        <li>
          • {bali
            ? "Expect scooters, narrow roads, and sudden rain."
            : "Watch for buses, tight traffic, and uneven road edges."}
        </li>
      </ul>
    </>
  );
}

export function HomeGuidance({ city }: { city: string }) {
  const welcomeComplete = useAppStore((s) => s.welcomeComplete);
  const safetyTipsDismissed = useAppStore((s) => s.safetyTipsDismissed);
  const riderGuide = useAppStore((s) => s.riderGuide);
  const completeWelcome = useAppStore((s) => s.completeWelcome);
  const dismissSafetyTips = useAppStore((s) => s.dismissSafetyTips);
  const showRiderGuide = useAppStore((s) => s.showRiderGuide);
  const [step, setStep] = useState(0);
  const welcomeOpen = riderGuide === "welcome" || !welcomeComplete;
  const safetyOpen = riderGuide === "safety";
  const current = welcomeSteps[step];

  return (
    <>
      {!safetyTipsDismissed ? (
        <div
          className="relative mx-4 mt-3 rounded-2xl border p-4 pr-10"
          style={{ background: "var(--info-soft)", borderColor: "var(--border)" }}
        >
          <SafetyContent city={city} />
          <button
            type="button"
            aria-label="Dismiss local riding tips"
            className="absolute right-3 top-3"
            style={{ color: "var(--text2)" }}
            onClick={dismissSafetyTips}
          >
            <X size={16} />
          </button>
        </div>
      ) : null}

      {welcomeOpen || safetyOpen ? (
        <>
          <button
            type="button"
            aria-label="Close guide"
            className="fixed inset-0 z-[179] bg-black/40"
            onClick={() => {
              if (welcomeOpen) completeWelcome();
              else showRiderGuide(null);
            }}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label={safetyOpen ? "Local riding tips" : "Welcome to Casan Rent"}
            className="fixed bottom-0 left-1/2 z-[180] w-full max-w-[430px] -translate-x-1/2 rounded-t-3xl border-t p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "var(--border)" }} />
            {safetyOpen ? (
              <>
                <SafetyContent city={city} />
                <button
                  type="button"
                  className="btn-primary !mx-0 !mb-0 !mt-5 !w-full"
                  onClick={() => showRiderGuide(null)}
                >
                  Got it
                </button>
              </>
            ) : (
              <div className="text-center">
                <div
                  className="mx-auto flex h-24 w-24 items-center justify-center rounded-full text-5xl"
                  style={{
                    background:
                      "linear-gradient(145deg, var(--success-soft), var(--bg-deep))",
                  }}
                  aria-hidden
                >
                  {current.emoji}
                </div>
                <h2 className="font-display mt-4 text-2xl font-semibold">
                  {current.title}
                </h2>
                <p
                  className="mx-auto mt-2 max-w-[19rem] text-sm leading-relaxed"
                  style={{ color: "var(--text2)" }}
                >
                  {current.body}
                </p>
                <div className="mt-5 flex justify-center gap-2">
                  {welcomeSteps.map((item, index) => (
                    <button
                      key={item.title}
                      type="button"
                      aria-label={`Go to step ${index + 1}`}
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: index === step ? 20 : 8,
                        background:
                          index === step ? "var(--primary)" : "var(--border)",
                      }}
                      onClick={() => setStep(index)}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--primary), var(--primary-light))",
                  }}
                  onClick={() => {
                    if (step === welcomeSteps.length - 1) completeWelcome();
                    else setStep((value) => value + 1);
                  }}
                >
                  {step === welcomeSteps.length - 1 ? "Start Exploring" : "Next"}
                  <ChevronRight size={18} />
                </button>
                <button
                  type="button"
                  className="mt-2 w-full py-2.5 text-sm font-semibold"
                  style={{ color: "var(--text2)" }}
                  onClick={completeWelcome}
                >
                  Skip
                </button>
              </div>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}

export function WeatherStrip({ city }: { city: string }) {
  const bali = city.toLowerCase().includes("bali");
  return (
    <div
      className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border px-3.5 py-3"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      <CloudSun size={25} className="shrink-0" style={{ color: "var(--accent)" }} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold">
          {bali ? "29°C · Sunny" : "31°C · Partly cloudy"}
        </div>
        <div className="text-[11px]" style={{ color: "var(--text2)" }}>
          {bali ? "78% humidity · 14 km/h wind" : "72% humidity · 9 km/h wind"}
        </div>
      </div>
      <div className="max-w-[8.5rem] text-right text-[10px] font-semibold" style={{ color: "var(--primary)" }}>
        {bali ? "Hydrate; showers can arrive fast" : "Warm ride; take shaded streets"}
      </div>
    </div>
  );
}

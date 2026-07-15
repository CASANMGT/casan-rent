"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";
import { useAppStore } from "@/lib/store";
import { APP_VERSION, hasUnseenUpdates } from "@/lib/version";
import { osmBrowseUrl } from "@/lib/format";

export default function ProfilePage() {
  return (
    <AuthGate role="rider">
      <ProfileInner />
    </AuthGate>
  );
}

function ProfileInner() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const logout = useAppStore((s) => s.logout);
  const resetDemo = useAppStore((s) => s.resetDemo);
  const setToast = useAppStore((s) => s.setToast);
  const lastSeenVersion = useAppStore((s) => s.lastSeenVersion);
  const unseen = hasUnseenUpdates(lastSeenVersion);

  return (
    <div className="content-pad">
      <Header title="Profile" />
      <div className="card">
        <div className="font-display text-xl font-semibold">
          {user.name || "Rider"}
        </div>
        <div className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
          {user.phone || (user.isGuest ? "Guest session" : "Rider account")}
        </div>
        <div
          className="mt-3 rounded-xl px-3 py-2 text-sm"
          style={{ background: "var(--bg-deep)" }}
        >
          Referral: <strong>CASAN25</strong> · Rp 25K credit (demo)
        </div>
      </div>

      <Link
        href="/updates"
        className="card flex items-center justify-between font-semibold"
      >
        <span>
          What&apos;s New
          <span className="ml-2 text-xs font-normal" style={{ color: "var(--text2)" }}>
            v{APP_VERSION}
          </span>
        </span>
        {unseen ? (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
            style={{ background: "var(--danger)" }}
          >
            Update
          </span>
        ) : (
          <span style={{ color: "var(--text2)" }}>→</span>
        )}
      </Link>

      <div className="card flex items-center justify-between">
        <span className="font-semibold">Dark mode</span>
        <button
          type="button"
          className="relative h-6 w-11 rounded-full"
          style={{ background: darkMode ? "var(--primary)" : "var(--border)" }}
          onClick={toggleDarkMode}
        >
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all"
            style={{ left: darkMode ? 22 : 2 }}
          />
        </button>
      </div>

      <div className="card text-sm" style={{ color: "var(--text2)" }}>
        <div className="mb-2 font-bold text-[var(--text)]">Charging help</div>
        Need to charge overnight? Add a <strong>Casan charging voucher</strong>{" "}
        or an adapter when you book — we only show adapters that fit the bike.
        <a
          className="mt-2 block font-semibold"
          style={{ color: "var(--primary)" }}
          href={osmBrowseUrl(-6.3655, 106.8295)}
          target="_blank"
          rel="noreferrer"
        >
          Find the nearest Casan hub →
        </a>
      </div>

      <button
        type="button"
        className="btn-secondary"
        onClick={() => {
          resetDemo();
          setToast("Demo data reset");
        }}
      >
        Reset demo data
      </button>
      <button
        type="button"
        className="btn-danger"
        onClick={() => {
          logout();
          router.push("/login");
        }}
      >
        Log out
      </button>
      <BottomNav variant="rider" />
    </div>
  );
}

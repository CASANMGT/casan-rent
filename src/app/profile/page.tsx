"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";
import { useAppStore } from "@/lib/store";
import { APP_VERSION, hasUnseenUpdates } from "@/lib/version";
import { osmBrowseUrl, formatIdr } from "@/lib/format";
import { IS_DEMO } from "@/lib/demo";

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
  const showRiderGuide = useAppStore((s) => s.showRiderGuide);
  const walletBalanceIdr = useAppStore((s) => s.walletBalanceIdr);
  const redeemReferralCode = useAppStore((s) => s.redeemReferralCode);
  const referralRedeemed = useAppStore((s) => s.referralRedeemed);
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
        <Link
          href="/wallet"
          className="mt-3 flex items-center justify-between rounded-xl px-3 py-2.5 text-sm"
          style={{ background: "var(--bg-deep)" }}
        >
          <span>
            Casan Wallet
            <span className="ml-1 text-xs" style={{ color: "var(--text2)" }}>
              · Demo
            </span>
          </span>
          <strong style={{ color: "var(--primary)" }}>
            {formatIdr(walletBalanceIdr)} ›
          </strong>
        </Link>
        <div
          className="mt-3 rounded-xl px-3 py-2 text-sm"
          style={{ background: "var(--bg-deep)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <span>
              Referral: <strong>CASAN25</strong>
            </span>
            <button
              type="button"
              className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold"
              style={{ background: "var(--primary)", color: "white" }}
              disabled={referralRedeemed}
              onClick={() => {
                const err = redeemReferralCode("CASAN25");
                if (err) setToast(err);
              }}
            >
              {referralRedeemed ? "Redeemed" : "Redeem"}
            </button>
          </div>
          <div className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
            Demo credit goes to Casan Wallet (Rp 25.000 once)
          </div>
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

      <button
        type="button"
        className="card flex w-[calc(100%-32px)] items-center justify-between text-left font-semibold"
        onClick={() => {
          showRiderGuide("safety");
          router.push("/home");
        }}
      >
        <span>
          Safety & local riding tips
          <span className="mt-0.5 block text-xs font-normal" style={{ color: "var(--text2)" }}>
            City-aware advice for Bali and Jakarta
          </span>
        </span>
        <span style={{ color: "var(--text2)" }}>→</span>
      </button>

      <div className="card flex items-center justify-between">
        <span className="font-semibold">Dark mode</span>
        <button
          type="button"
          role="switch"
          aria-checked={darkMode}
          aria-label="Dark mode"
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

      {IS_DEMO ? (
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
      ) : null}
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

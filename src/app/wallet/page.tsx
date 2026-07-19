"use client";

import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";
import { useAppStore } from "@/lib/store";
import { formatIdr } from "@/lib/format";
import { IS_DEMO } from "@/lib/demo";

const TOPUPS = [50_000, 100_000, 250_000] as const;

export default function WalletPage() {
  return (
    <AuthGate role="rider">
      <WalletInner />
    </AuthGate>
  );
}

function WalletInner() {
  const balance = useAppStore((s) => s.walletBalanceIdr);
  const txns = useAppStore((s) => s.walletTxns);
  const topUpWallet = useAppStore((s) => s.topUpWallet);
  const redeemReferralCode = useAppStore((s) => s.redeemReferralCode);
  const referralRedeemed = useAppStore((s) => s.referralRedeemed);
  const setToast = useAppStore((s) => s.setToast);

  return (
    <div className="content-pad pb-4">
      <Header
        title="Casan Wallet"
        subtitle={IS_DEMO ? "Demo balance — not real money" : undefined}
        backHref="/home"
      />

      <div
        className="mx-4 rounded-2xl px-5 py-6 text-white"
        style={{
          background: "linear-gradient(135deg, #0f766e, var(--primary))",
        }}
      >
        <div className="text-xs font-semibold text-white/85">Available</div>
        <div className="font-display mt-1 text-4xl font-semibold tracking-tight">
          {formatIdr(balance)}
        </div>
        <p className="mt-2 text-xs text-white/85">
          Pay rentals from this balance at checkout. Deposit is held and returned
          after the bike is back.
        </p>
      </div>

      <p className="section-label">Top up (demo)</p>
      <div className="mx-4 flex flex-wrap gap-2">
        {TOPUPS.map((amount) => (
          <button
            key={amount}
            type="button"
            className="rounded-full border px-4 py-2 text-sm font-bold"
            style={{
              borderColor: "var(--primary)",
              color: "var(--primary)",
              background: "var(--card)",
            }}
            onClick={() => topUpWallet(amount)}
          >
            + {formatIdr(amount)}
          </button>
        ))}
      </div>

      <div className="card mt-2">
        <div className="font-bold text-sm">Referral credit</div>
        <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
          Redeem <strong>CASAN25</strong> once for Rp 25.000 demo credit.
        </p>
        <button
          type="button"
          className="btn-secondary !mx-0 mt-3 !w-full"
          disabled={referralRedeemed}
          style={{ opacity: referralRedeemed ? 0.55 : 1 }}
          onClick={() => {
            const err = redeemReferralCode("CASAN25");
            if (err) setToast(err);
          }}
        >
          {referralRedeemed ? "CASAN25 already redeemed" : "Redeem CASAN25"}
        </button>
      </div>

      <p className="section-label">Recent activity</p>
      {txns.length === 0 ? (
        <div className="card text-sm" style={{ color: "var(--text2)" }}>
          No wallet activity yet.
        </div>
      ) : (
        txns.slice(0, 12).map((t) => (
          <div
            key={t.id}
            className="mx-4 mb-2 flex items-center justify-between gap-3 rounded-xl px-3 py-3"
            style={{ background: "var(--card)" }}
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{t.label}</div>
              <div className="text-[11px]" style={{ color: "var(--text2)" }}>
                {new Date(t.createdAt).toLocaleString("id-ID", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
            <div
              className="shrink-0 text-sm font-bold tabular-nums"
              style={{
                color: t.amountIdr >= 0 ? "var(--ok)" : "var(--text)",
              }}
            >
              {t.amountIdr >= 0 ? "+" : ""}
              {formatIdr(t.amountIdr)}
            </div>
          </div>
        ))
      )}

      <Link
        href="/home"
        className="btn-primary text-center"
      >
        Find a hub to rent
      </Link>

      <BottomNav variant="rider" />
    </div>
  );
}

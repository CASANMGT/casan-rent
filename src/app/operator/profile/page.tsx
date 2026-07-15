"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";
import { useAppStore } from "@/lib/store";

export default function OperatorProfilePage() {
  return (
    <AuthGate role="operator">
      <ProfileInner />
    </AuthGate>
  );
}

function ProfileInner() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const operators = useAppStore((s) => s.operators);
  const logout = useAppStore((s) => s.logout);
  const op = operators.find((o) => o.id === user.operatorId);

  return (
    <div className="content-pad">
      <Header title="Operator" />
      <div className="card">
        <div className="font-display text-xl font-semibold">{op?.name}</div>
        <div className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
          Signed in as {user.name}
        </div>
      </div>

      <Link className="card block font-semibold" href="/operator/pricing">
        Pricing rules →
      </Link>
      <Link className="card block font-semibold" href="/operator/staff">
        Staff management →
      </Link>
      <Link className="card block font-semibold" href="/operator/fleet">
        Fleet tools →
      </Link>

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
      <BottomNav variant="operator" />
    </div>
  );
}

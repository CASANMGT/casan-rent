"use client";

import { useRouter } from "next/navigation";
import {
  Bike,
  Banknote,
  Bell,
  LogOut,
  Tag,
  Users,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { OpMenuLink } from "@/components/operator/OperatorUi";
import { AuthGate } from "@/components/AuthGate";
import { useAppStore } from "@/lib/store";
import { APP_VERSION, hasUnseenUpdates } from "@/lib/version";
import { canStaff, getCurrentStaff } from "@/lib/permissions";

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
  const lastSeenVersion = useAppStore((s) => s.lastSeenVersion);
  const staff = useAppStore((s) => s.staff);
  const currentStaff = getCurrentStaff(user, staff);
  const op = operators.find((o) => o.id === user.operatorId);
  const unseen = hasUnseenUpdates(lastSeenVersion);

  return (
    <div className="content-pad">
      <Header title="Lainnya · More" />
      <div className="op-card">
        <div className="font-display text-xl font-semibold">{op?.name}</div>
        <div className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
          {op?.city} · masuk sebagai {user.name}
          {currentStaff ? ` · ${currentStaff.role.replace("_", " ")}` : ""}
        </div>
        <div className="mt-2 text-xs" style={{ color: "var(--text2)" }}>
          Versi app v{APP_VERSION}
        </div>
      </div>

      <OpMenuLink
        href="/updates"
        icon={Bell}
        label="Apa yang baru"
        hint="What's new in the app"
        badge={unseen ? "Baru" : undefined}
      />
      {canStaff(currentStaff, "pricing.manage") ? (
      <OpMenuLink
        href="/operator/pricing"
        icon={Tag}
        label="Atur harga"
        hint="Set rental prices"
      />
      ) : null}
      <OpMenuLink
        href="/operator/staff"
        icon={Users}
        label="Staf & akun"
        hint="Staff login accounts"
      />
      <OpMenuLink
        href="/operator/fleet"
        icon={Bike}
        label="Sepeda & tempat"
        hint="Bikes and shop locations"
      />
      <OpMenuLink
        href="/operator/earnings"
        icon={Banknote}
        label="Laporan uang"
        hint="Earnings report"
      />

      <button
        type="button"
        className="mx-4 mt-2 flex w-[calc(100%-32px)] items-center justify-center gap-2 rounded-xl border-2 py-3.5 text-sm font-bold"
        style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
        onClick={() => {
          logout();
          router.push("/login");
        }}
      >
        <LogOut size={18} />
        Keluar · Log out
      </button>
      <BottomNav variant="operator" />
    </div>
  );
}

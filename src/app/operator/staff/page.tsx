"use client";

import { ShieldCheck, UserPlus, Users } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";
import { OpSection } from "@/components/operator/OperatorUi";
import { useAppStore } from "@/lib/store";

const roleLabel: Record<string, string> = {
  admin: "Admin — semua akses",
  booking_manager: "Pesanan — terima & kunci",
  fleet_attendant: "Sepeda — rawat & pindah",
  viewer: "Lihat saja",
};

export default function StaffPage() {
  return (
    <AuthGate role="operator">
      <StaffInner />
    </AuthGate>
  );
}

function StaffInner() {
  const user = useAppStore((s) => s.user);
  const staff = useAppStore((s) => s.staff);
  const setToast = useAppStore((s) => s.setToast);
  const team = staff.filter((s) => s.operatorId === user.operatorId);

  return (
    <div className="content-pad">
      <Header title="Staf · Staff" backHref="/operator/profile" />

      <OpSection icon={Users} title="Tim kamu" hint="Team members with app access" />
      {team.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <Users
            size={36}
            className="mx-auto"
            style={{ color: "var(--text2)", opacity: 0.5 }}
          />
          <p className="mt-2 text-sm font-semibold">Belum ada staf</p>
          <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
            Undang staf supaya bisa terima pesanan dan serahkan kunci.
          </p>
        </div>
      ) : (
        team.map((m) => (
          <div key={m.id} className="op-card !my-1 flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary), var(--primary-light))",
              }}
            >
              {m.name
                .split(" ")
                .map((x) => x[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div className="flex-1">
              <div className="font-bold">{m.name}</div>
              <div className="text-xs" style={{ color: "var(--text2)" }}>
                {roleLabel[m.role] ?? m.role} · {m.locationLabel}
              </div>
              <div
                className="mt-0.5 text-xs font-semibold"
                style={{ color: m.online ? "var(--ok)" : "var(--text2)" }}
              >
                {m.online ? "● Online" : "○ Offline"}
              </div>
            </div>
          </div>
        ))
      )}

      <OpSection
        icon={ShieldCheck}
        title="Jenis akses"
        hint="What each role can do"
      />
      <div className="mx-4 mb-4 flex flex-wrap gap-2">
        {Object.values(roleLabel).map((label) => (
          <span
            key={label}
            className="rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ background: "var(--bg-deep)", color: "var(--primary)" }}
          >
            {label}
          </span>
        ))}
      </div>

      <button
        type="button"
        className="btn-primary !flex items-center justify-center gap-2"
        onClick={() => setToast("Link undangan disalin (demo)")}
      >
        <UserPlus size={18} />
        Undang staf baru
      </button>
      <BottomNav variant="operator" />
    </div>
  );
}

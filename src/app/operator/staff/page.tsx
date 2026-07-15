"use client";

import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";
import { useAppStore } from "@/lib/store";

const roleLabel: Record<string, string> = {
  admin: "Administrator — Full access",
  booking_manager: "Booking Manager — Bookings + fleet",
  fleet_attendant: "Fleet Attendant — Bikes only",
  viewer: "View Only — Read only",
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
      <Header title="Staff" backHref="/operator/profile" />
      <p className="section-label">Team members</p>
      {team.map((m) => (
        <div key={m.id} className="card flex items-center gap-3">
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
              {m.role.replace("_", " ")} · {m.locationLabel}
            </div>
            <div
              className="mt-0.5 text-xs font-semibold"
              style={{ color: m.online ? "var(--ok)" : "var(--text2)" }}
            >
              {m.online ? "● Online" : "○ Offline"}
            </div>
          </div>
        </div>
      ))}

      <p className="section-label">Permission levels</p>
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
        className="btn-primary"
        onClick={() => setToast("Invite link copied (demo)")}
      >
        + Invite team member
      </button>
      <BottomNav variant="operator" />
    </div>
  );
}

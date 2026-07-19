"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, MapPin, ShieldCheck, Users } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { AuthGate } from "@/components/AuthGate";
import { OpSection } from "@/components/operator/OperatorUi";
import { useAppStore } from "@/lib/store";
import { canStaff, getCurrentStaff } from "@/lib/permissions";

const roleLabel: Record<string, string> = {
  admin: "Admin — semua akses",
  booking_manager: "Pesanan — terima, kunci & pembayaran",
  fleet_attendant: "Armada — status & pindah unit",
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
  const sites = useAppStore((s) => s.sites);
  const updateStaffSiteIds = useAppStore((s) => s.updateStaffSiteIds);
  const setToast = useAppStore((s) => s.setToast);
  const team = staff.filter((s) => s.operatorId === user.operatorId);
  const opSites = sites.filter((site) => site.operatorId === user.operatorId);
  const currentStaff = getCurrentStaff(user, staff);
  const canManageStaff = canStaff(currentStaff, "staff.manage");
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);

  function setAssignment(memberId: string, siteIds: string[] | null) {
    const error = updateStaffSiteIds(memberId, siteIds);
    setToast(error ?? "Penugasan lokasi disimpan");
  }

  return (
    <div className="content-pad">
      <Header title="Staf · Staff" backHref="/operator/profile" />

      <OpSection icon={Users} title="Tim kamu" hint="Akun staf dan cakupan lokasi" />
      {team.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <Users
            size={36}
            className="mx-auto"
            style={{ color: "var(--text2)", opacity: 0.5 }}
          />
          <p className="mt-2 text-sm font-semibold">Belum ada staf</p>
          <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
            Akun staf baru dibuat oleh admin sistem — undangan mandiri belum
            tersedia. Untuk shift pertama, ikuti panduan di Beranda: Terima →
            Serahkan kunci → Armada.
          </p>
        </div>
      ) : (
        team.map((m) => {
          const allSites = m.siteIds == null;
          const assignedSiteIds = m.siteIds ?? [];
          const assignedNames = allSites
            ? ["Semua lokasi"]
            : assignedSiteIds
                .map((siteId) => opSites.find((site) => site.id === siteId)?.name)
                .filter((name): name is string => Boolean(name));
          const open = openMemberId === m.id;
          return (
          <div
            key={m.id}
            className="mx-4 border-b py-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: "var(--primary)" }}
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
                {roleLabel[m.role] ?? m.role}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs" style={{ color: "var(--primary)" }}>
                <MapPin size={12} />
                {assignedNames.join(", ") || "Belum ditugaskan"}
              </div>
              <div
                className="mt-0.5 text-xs font-semibold"
                style={{ color: m.online ? "var(--ok)" : "var(--text2)" }}
              >
                {m.online ? "● Online" : "○ Offline"}
              </div>
            </div>
            {canManageStaff ? (
              <button
                type="button"
                className="rounded-lg p-2"
                style={{ color: "var(--primary)" }}
                aria-label={`Atur lokasi ${m.name}`}
                aria-expanded={open}
                onClick={() => setOpenMemberId(open ? null : m.id)}
              >
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            ) : null}
            </div>

            {open && canManageStaff ? (
              <div
                className="mt-3 space-y-2 border-l-2 pl-3"
                style={{ borderColor: "var(--primary)" }}
              >
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={allSites}
                    onChange={(event) =>
                      setAssignment(m.id, event.target.checked ? null : [])
                    }
                  />
                  Semua lokasi
                </label>
                {!allSites
                  ? opSites.map((site) => {
                      const checked = m.siteIds?.includes(site.id) ?? false;
                      return (
                        <label
                          key={site.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              const next = event.target.checked
                                ? [...(m.siteIds ?? []), site.id]
                                : (m.siteIds ?? []).filter(
                                    (siteId) => siteId !== site.id,
                                  );
                              setAssignment(m.id, next);
                            }}
                          />
                          {site.name}
                        </label>
                      );
                    })
                  : null}
              </div>
            ) : null}
          </div>
          );
        })
      )}

      <OpSection
        icon={ShieldCheck}
        title="Jenis akses"
        hint="Hak tindakan diterapkan di aplikasi"
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

      <p className="mx-4 text-xs" style={{ color: "var(--text2)" }}>
        Admin dapat mengatur cakupan lokasi. Pembuatan akun baru tetap melalui
        admin sistem sampai layanan akun produksi tersedia.
      </p>
      <BottomNav variant="operator" />
    </div>
  );
}

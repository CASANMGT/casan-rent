import type { AppUser, StaffMember, StaffRole } from "@/lib/types";

export type OperatorPermission =
  | "bookings.manage"
  | "fleet.manage"
  | "locations.manage"
  | "pricing.manage"
  | "staff.manage";

const ROLE_PERMISSIONS: Record<StaffRole, OperatorPermission[]> = {
  admin: [
    "bookings.manage",
    "fleet.manage",
    "locations.manage",
    "pricing.manage",
    "staff.manage",
  ],
  booking_manager: ["bookings.manage"],
  fleet_attendant: ["fleet.manage"],
  viewer: [],
};

export function getCurrentStaff(
  user: AppUser,
  staff: StaffMember[],
): StaffMember | null {
  if (user.role !== "operator" || !user.staffId) return null;
  return staff.find((member) => member.id === user.staffId) ?? null;
}

export function canStaff(
  member: StaffMember | null,
  permission: OperatorPermission,
  siteId?: string,
): boolean {
  if (!member || !ROLE_PERMISSIONS[member.role].includes(permission)) {
    return false;
  }
  return !siteId || member.siteIds == null || member.siteIds.includes(siteId);
}

export function canAccessSite(
  member: StaffMember | null,
  siteId: string,
): boolean {
  return Boolean(
    member && (member.siteIds == null || member.siteIds.includes(siteId)),
  );
}

export function permissionDeniedMessage(member: StaffMember | null): string {
  return member
    ? `Akses ${member.role.replace("_", " ")} tidak mengizinkan tindakan ini`
    : "Akun staf tidak ditemukan — masuk kembali";
}

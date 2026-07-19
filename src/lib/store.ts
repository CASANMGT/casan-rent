"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  operators as seedOperators,
  vehicles as seedVehicles,
  vehicleModels as seedModels,
  operatorSites as seedSites,
  staff as seedStaff,
  operatorPricing as seedPricing,
  seedNotifications,
  seedReviews,
  seedMockBookings,
  chargingAddons as seedChargingAddons,
  DEPOSIT_IDR,
  WALLET_SEED_IDR,
} from "./seed";
import type {
  AppNotification,
  AppUser,
  Booking,
  BookingAddon,
  ChargingAddon,
  KeysAccess,
  Operator,
  OperatorReview,
  OperatorSite,
  PaymentMethod,
  PickupType,
  PricingTier,
  StaffMember,
  Vehicle,
  VehicleMaintenanceEntry,
  VehicleModel,
  VehicleStatus,
  VehicleType,
  RentalMode,
  WalletTxn,
} from "./types";
import {
  bookingCode,
  formatIdr,
  formatReturnBy,
  siteOpenClose,
  applyWeekendSurcharge,
  type DiscoveryPinId,
} from "./format";
import { IS_DEMO } from "./demo";
import { APP_VERSION } from "./version";
import { pickAssignableUnit } from "./catalog";
import {
  canAccessSite,
  canStaff,
  getCurrentStaff,
  permissionDeniedMessage,
  type OperatorPermission,
} from "./permissions";

function siteHoursParts(hours: string) {
  return siteOpenClose({ hours });
}

/** Keep vehicle.status aligned with live bookings (fixes Out vs rider active desync). */
export function syncVehicleStatusesFromBookings(
  vehicles: Vehicle[],
  bookings: Booking[],
): Vehicle[] {
  const live = new Map<string, Booking["status"]>();
  const rank: Record<string, number> = {
    overdue: 5,
    active: 4,
    awaiting_pickup: 3,
    confirmed: 3,
    pending: 2,
  };
  for (const b of bookings) {
    if (b.status === "completed" || b.status === "cancelled") continue;
    const prev = live.get(b.vehicleId);
    if (!prev || (rank[b.status] ?? 0) >= (rank[prev] ?? 0)) {
      live.set(b.vehicleId, b.status);
    }
  }
  return vehicles.map((v) => {
    if (v.status === "maintenance" || v.status === "disabled") return v;
    const st = live.get(v.id);
    if (!st) {
      if (v.status === "rented" || v.status === "reserved") {
        return { ...v, status: "available" as VehicleStatus };
      }
      return v;
    }
    if (st === "active" || st === "overdue") {
      return v.status === "rented" ? v : { ...v, status: "rented" as VehicleStatus };
    }
    return v.status === "reserved"
      ? v
      : { ...v, status: "reserved" as VehicleStatus };
  });
}

interface AppState {
  hydrated: boolean;
  user: AppUser;
  operators: Operator[];
  sites: OperatorSite[];
  models: VehicleModel[];
  vehicles: Vehicle[];
  staff: StaffMember[];
  reviews: OperatorReview[];
  chargingAddons: ChargingAddon[];
  pricing: Record<string, PricingTier[]>;
  bookings: Booking[];
  favorites: string[];
  notifications: AppNotification[];
  maintenanceLog: VehicleMaintenanceEntry[];
  /** Demo Casan Wallet balance (IDR). */
  walletBalanceIdr: number;
  walletTxns: WalletTxn[];
  referralRedeemed: boolean;
  /** Hub sort origin — city pin or optional GPS (honest, not fake tracking). */
  discoveryPin: DiscoveryPinId;
  discoveryGps: { lat: number; lng: number } | null;
  toast: string | null;
  darkMode: boolean;
  weekendSurcharge: Record<string, boolean>;
  lastSeenVersion: string | null;
  welcomeComplete: boolean;
  safetyTipsDismissed: boolean;
  riderGuide: "welcome" | "safety" | null;
  /** First-shift desk guide for operators. */
  operatorDeskGuideComplete: boolean;
  /** Operator console: null = all lokasi. */
  operatorActiveSiteId: string | null;
  setHydrated: (v: boolean) => void;
  setToast: (msg: string | null) => void;
  toggleDarkMode: () => void;
  markVersionSeen: () => void;
  completeWelcome: () => void;
  dismissSafetyTips: () => void;
  showRiderGuide: (guide: "welcome" | "safety" | null) => void;
  completeOperatorDeskGuide: () => void;
  setDiscoveryPin: (pin: DiscoveryPinId) => void;
  setDiscoveryGps: (coords: { lat: number; lng: number } | null) => void;
  topUpWallet: (amountIdr: number) => void;
  redeemReferralCode: (code: string) => string | null;
  setOperatorActiveSiteId: (siteId: string | null) => void;
  updateStaffSiteIds: (
    staffId: string,
    siteIds: string[] | null,
  ) => string | null;
  pushNotification: (
    title: string,
    body: string,
    opts?: { href?: string; bookingId?: string },
  ) => void;
  loginRider: (name: string, phone?: string, isGuest?: boolean) => void;
  loginOperator: (username: string, password: string) => string | null;
  logout: () => void;
  toggleFavorite: (id: string) => void;
  createBooking: (input: {
    vehicleId?: string;
    modelId?: string;
    siteId?: string;
    pickupType: PickupType;
    /** Rider key choice when the model allows both. */
    keysAccess?: KeysAccess;
    digitalKeyIssueMode?: "auto" | "manual";
    durationLabel: string;
    durationMinutes: number;
    rentalPriceIdr: number;
    paymentMethod: PaymentMethod;
    addonIds?: string[];
    appointmentAt?: string;
  }) => Booking | null;
  setPaymentMethod: (bookingId: string, method: PaymentMethod) => void;
  setReturnSite: (bookingId: string, siteId: string) => void;
  setDigitalKeyIssueMode: (
    bookingId: string,
    mode: "auto" | "manual",
  ) => void;
  issueDigitalKey: (bookingId: string) => void;
  confirmBooking: (bookingId: string) => void;
  declineBooking: (bookingId: string) => void;
  /** Rider cancels an unpaid booking; releases assigned unit. */
  cancelBooking: (bookingId: string) => void;
  confirmBulk: (ids: string[]) => void;
  payBooking: (bookingId: string) => void;
  startRide: (bookingId: string) => void;
  /** Operator hands physical key to rider (shop). */
  givePhysicalKey: (bookingId: string) => void;
  /** Operator collects physical key on return. */
  collectPhysicalKey: (bookingId: string) => void;
  toggleMotor: (bookingId: string) => void;
  extendRide: (
    bookingId: string,
    extraMinutes: number,
    paymentMethod?: PaymentMethod,
  ) => void;
  markOverdue: (bookingId: string) => void;
  completeReturn: (bookingId: string) => void;
  submitReview: (bookingId: string, rating: number, note?: string) => void;
  updateVehicleStatus: (vehicleId: string, status: VehicleStatus) => void;
  addMaintenanceEntry: (vehicleId: string, note: string) => string | null;
  addSite: (input: {
    operatorId: string;
    name: string;
    address: string;
    city?: string;
    area?: string;
    lat?: number;
    lng?: number;
    hours?: string;
    whatsapp?: string;
    storeInfo?: string;
    supportsFrontDesk: boolean;
    supportsSelfService: boolean;
  }) => OperatorSite | null;
  updateSite: (
    siteId: string,
    input: {
      name: string;
      address: string;
      city: string;
      area: string;
      lat: number;
      lng: number;
      hours: string;
      whatsapp: string;
      storeInfo: string;
      supportsFrontDesk: boolean;
      supportsSelfService: boolean;
    },
  ) => string | null;
  removeSite: (siteId: string) => string | null;
  addVehicle: (input: {
    operatorId: string;
    siteId: string;
    modelId?: string;
    name: string;
    code: string;
    vehicleType: VehicleType;
    rentalMode: RentalMode;
    pricePerHour: number;
    batteryPct: number | null;
    color?: string;
    colorHex?: string;
  }) => Vehicle | null;
  /** Add (+1) or remove (−1 available) unit for a model at a site. */
  adjustFleetStock: (input: {
    modelId: string;
    siteId: string;
    delta: 1 | -1;
  }) => string | null;
  removeVehicle: (vehicleId: string) => void;
  moveVehicleSite: (vehicleId: string, siteId: string) => void;
  updatePricing: (operatorId: string, tiers: PricingTier[]) => void;
  setWeekendSurcharge: (operatorId: string, on: boolean) => void;
  markNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  /** Demo: fake a customer booking request waiting for Accept. */
  simulateRiderRequest: () => Booking | null;
  resetDemo: () => void;
}

const emptyUser: AppUser = { role: null, name: "" };

function operatorCan(
  state: Pick<AppState, "user" | "staff">,
  permission: OperatorPermission,
  siteId?: string,
): boolean {
  if (state.user.role !== "operator") return true;
  return canStaff(
    getCurrentStaff(state.user, state.staff),
    permission,
    siteId,
  );
}

function operatorDeniedToast(
  state: Pick<AppState, "user" | "staff">,
): string {
  return permissionDeniedMessage(getCurrentStaff(state.user, state.staff));
}

function notifyConfirm(booking: Booking): AppNotification {
  return {
    id: `n-confirm-${booking.id}-${Date.now()}`,
    title: "Booking confirmed",
    body: `${booking.code} is ready for pickup. Head to the hub when you're ready.`,
    read: false,
    createdAt: new Date().toISOString(),
    bookingId: booking.id,
    href: `/book/${booking.id}/confirmed`,
  };
}

function notifyDigitalKey(booking: Booking): AppNotification {
  return {
    id: `n-dkey-${booking.id}-${Date.now()}`,
    title: "Digital key ready",
    body: `${booking.code} — open Unlock at the hub to start your ride.`,
    read: false,
    createdAt: new Date().toISOString(),
    bookingId: booking.id,
    href: `/book/${booking.id}/confirmed`,
  };
}

function needsDigitalKey(b: Pick<Booking, "keysAccess">): boolean {
  return b.keysAccess === "digital" || b.keysAccess === "both";
}

/** Auto-issue digital key on confirm when mode is auto. */
function applyAutoDigitalKey(
  b: Booking,
  issuedAt: string,
): { booking: Booking; issued: boolean } {
  if (!needsDigitalKey(b)) return { booking: b, issued: false };
  if (b.digitalKeyIssueMode === "manual") return { booking: b, issued: false };
  if (b.digitalKeyIssuedAt) return { booking: b, issued: false };
  return {
    booking: { ...b, digitalKeyIssuedAt: issuedAt },
    issued: true,
  };
}

function nextStatusAfterConfirm(b: Booking): Booking["status"] {
  return b.paymentStatus === "paid" ? "awaiting_pickup" : "confirmed";
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      user: emptyUser,
      operators: seedOperators,
      sites: seedSites,
      models: seedModels,
      vehicles: seedVehicles,
      staff: seedStaff,
      reviews: seedReviews,
      chargingAddons: seedChargingAddons,
      pricing: seedPricing,
      bookings: seedMockBookings,
      favorites: ["m-margo-galaxy", "op-margonda"],
      notifications: seedNotifications,
      maintenanceLog: [],
      walletBalanceIdr: WALLET_SEED_IDR,
      walletTxns: [
        {
          id: "wtxn-seed",
          kind: "topup",
          amountIdr: WALLET_SEED_IDR,
          label: "Demo starting balance",
          createdAt: new Date().toISOString(),
        },
      ],
      referralRedeemed: false,
      discoveryPin: "jakarta",
      discoveryGps: null,
      toast: null,
      darkMode: false,
      lastSeenVersion: null,
      welcomeComplete: false,
      safetyTipsDismissed: false,
      riderGuide: null,
      operatorDeskGuideComplete: false,
      operatorActiveSiteId: null,
      weekendSurcharge: {
        "op-margonda": true,
        "op-tebet": true,
        "op-rawamangun": false,
        "op-bali-sunset": true,
        "op-beachwalk": true,
        "op-ubud": false,
      },

      setHydrated: (v) => set({ hydrated: v }),
      setToast: (msg) => set({ toast: msg }),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      markVersionSeen: () => set({ lastSeenVersion: APP_VERSION }),
      completeWelcome: () =>
        set({ welcomeComplete: true, riderGuide: null }),
      dismissSafetyTips: () => set({ safetyTipsDismissed: true }),
      showRiderGuide: (guide) =>
        set((s) => ({
          riderGuide: guide,
          safetyTipsDismissed:
            guide === "safety" ? false : s.safetyTipsDismissed,
        })),
      completeOperatorDeskGuide: () =>
        set({ operatorDeskGuideComplete: true }),
      setDiscoveryPin: (pin) => set({ discoveryPin: pin }),
      setDiscoveryGps: (coords) => set({ discoveryGps: coords }),
      topUpWallet: (amountIdr) => {
        const amount = Math.round(amountIdr);
        if (!Number.isFinite(amount) || amount <= 0) {
          set({ toast: "Enter a valid top-up amount" });
          return;
        }
        const txn: WalletTxn = {
          id: `wtxn-${Date.now()}`,
          kind: "topup",
          amountIdr: amount,
          label: "Top-up (demo)",
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          walletBalanceIdr: s.walletBalanceIdr + amount,
          walletTxns: [txn, ...s.walletTxns],
          toast: `Added ${formatIdr(amount)} to Casan Wallet`,
        }));
      },
      redeemReferralCode: (code) => {
        const normalized = code.trim().toUpperCase();
        if (normalized !== "CASAN25") {
          return "Unknown code — try CASAN25";
        }
        if (get().referralRedeemed) {
          return "You already redeemed CASAN25 on this demo";
        }
        const credit = 25_000;
        const txn: WalletTxn = {
          id: `wtxn-ref-${Date.now()}`,
          kind: "referral",
          amountIdr: credit,
          label: "Referral CASAN25 (demo credit)",
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          referralRedeemed: true,
          walletBalanceIdr: s.walletBalanceIdr + credit,
          walletTxns: [txn, ...s.walletTxns],
          toast: `${formatIdr(credit)} added to Casan Wallet`,
        }));
        return null;
      },
      setOperatorActiveSiteId: (siteId) =>
        set((s) => {
          const member = getCurrentStaff(s.user, s.staff);
          if (siteId && !canAccessSite(member, siteId)) {
            return {
              operatorActiveSiteId: s.operatorActiveSiteId,
              toast: "Lokasi ini tidak ditugaskan ke akun Anda",
            };
          }
          return { operatorActiveSiteId: siteId };
        }),

      updateStaffSiteIds: (staffId, siteIds) => {
        const state = get();
        const target = state.staff.find((member) => member.id === staffId);
        if (!target) return "Staf tidak ditemukan";
        if (!operatorCan(state, "staff.manage")) {
          return operatorDeniedToast(state);
        }
        if (target.operatorId !== state.user.operatorId) {
          return "Staf bukan bagian dari operator ini";
        }
        const validSiteIds = new Set(
          state.sites
            .filter((site) => site.operatorId === target.operatorId)
            .map((site) => site.id),
        );
        const normalized =
          siteIds == null
            ? null
            : [...new Set(siteIds.filter((id) => validSiteIds.has(id)))];
        set((s) => ({
          staff: s.staff.map((member) =>
            member.id === staffId
              ? {
                  ...member,
                  siteIds: normalized,
                  locationLabel:
                    normalized == null
                      ? "Semua lokasi"
                      : normalized
                          .map(
                            (id) =>
                              s.sites.find((site) => site.id === id)?.name,
                          )
                          .filter(Boolean)
                          .join(", ") || "Belum ditugaskan",
                }
              : member,
          ),
          operatorActiveSiteId:
            s.user.staffId === staffId &&
            s.operatorActiveSiteId &&
            normalized != null &&
            !normalized.includes(s.operatorActiveSiteId)
              ? normalized[0] ?? null
              : s.operatorActiveSiteId,
        }));
        return null;
      },

      pushNotification: (title, body, opts) =>
        set((s) => ({
          notifications: [
            {
              id: `n-${Date.now()}`,
              title,
              body,
              read: false,
              createdAt: new Date().toISOString(),
              href: opts?.href,
              bookingId: opts?.bookingId,
            },
            ...s.notifications,
          ],
        })),

      loginRider: (name, phone, isGuest) =>
        set({
          user: {
            role: "rider",
            name,
            phone,
            isGuest: Boolean(isGuest),
          },
        }),

      loginOperator: (username, password) => {
        const member = get().staff.find(
          (s) => s.username === username && s.password === password,
        );
        if (!member) return "Invalid username or password";
        set({
          user: {
            role: "operator",
            name: member.name,
            operatorId: member.operatorId,
            staffId: member.id,
          },
          operatorActiveSiteId:
            member.siteIds?.length === 1 ? member.siteIds[0] : null,
        });
        return null;
      },

      logout: () => set({ user: emptyUser, operatorActiveSiteId: null }),

      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((f) => f !== id)
            : [...s.favorites, id],
        })),

      createBooking: (input) => {
        const user = get().user;
        let vehicle: Vehicle | undefined;
        let modelId = input.modelId;

        if (input.vehicleId) {
          vehicle = get().vehicles.find((v) => v.id === input.vehicleId);
          modelId = vehicle?.modelId;
        } else if (input.modelId) {
          vehicle =
            pickAssignableUnit(
              get().vehicles.filter(
                (v) => !input.siteId || v.siteId === input.siteId,
              ),
              input.modelId,
            ) ?? undefined;
        }

        if (!vehicle || vehicle.status !== "available" || !modelId) return null;

        const vehicleKeys: KeysAccess =
          vehicle.rentalMode === "both"
            ? "both"
            : vehicle.rentalMode === "key_handover"
              ? "physical"
              : "digital";

        // Rider may narrow "both" to digital or physical; otherwise use vehicle mode.
        let keysAccess: KeysAccess = vehicleKeys;
        if (vehicleKeys === "both" && input.keysAccess) {
          if (
            input.keysAccess === "digital" ||
            input.keysAccess === "physical" ||
            input.keysAccess === "both"
          ) {
            keysAccess = input.keysAccess;
          }
        } else if (vehicleKeys !== "both") {
          keysAccess = vehicleKeys;
        }

        // Physical or dual-key bikes always need shop key handover.
        const needsShopKey =
          keysAccess === "physical" || keysAccess === "both";
        const pickupType: PickupType = needsShopKey
          ? "front_desk"
          : input.pickupType === "front_desk"
            ? "front_desk"
            : "self_service";

        const needsConfirm =
          needsShopKey || pickupType === "front_desk";

        // App motor control when digital or both; physical-only otherwise.
        const rentalMode =
          keysAccess === "physical" ? "key_handover" : "digital";

        const digitalKeyIssueMode =
          needsDigitalKey({ keysAccess })
            ? (input.digitalKeyIssueMode ?? "auto")
            : "manual";

        const catalog = get().chargingAddons;
        const selectedAddons: BookingAddon[] = (input.addonIds ?? [])
          .map((id) => catalog.find((a) => a.id === id))
          .filter((a): a is ChargingAddon => Boolean(a))
          .map((a) => ({
            id: a.id,
            kind: a.kind,
            label: a.label,
            amps: a.amps,
            priceIdr: a.priceIdr,
            voucherCode:
              a.kind === "casan_voucher"
                ? `CSN-${bookingCode().slice(3)}`
                : undefined,
          }));
        const addonsPriceIdr = selectedAddons.reduce(
          (s, a) => s + a.priceIdr,
          0,
        );

        const booking: Booking = {
          id: `bk-${Date.now()}`,
          code: bookingCode(),
          operatorId: vehicle.operatorId,
          vehicleId: vehicle.id,
          modelId,
          siteId: vehicle.siteId,
          returnSiteId: vehicle.siteId,
          riderName: user.name || "Guest",
          riderPhone: user.phone || undefined,
          status: needsConfirm ? "pending" : "confirmed",
          pickupType,
          rentalMode,
          keysAccess,
          digitalKeyIssueMode,
          digitalKeyIssuedAt:
            !needsConfirm &&
            needsDigitalKey({ keysAccess }) &&
            digitalKeyIssueMode === "auto"
              ? new Date().toISOString()
              : null,
          physicalKeyGiven: false,
          physicalKeyReturned: false,
          durationLabel: input.durationLabel,
          durationMinutes: input.durationMinutes,
          rentalPriceIdr: input.rentalPriceIdr,
          addonsPriceIdr,
          addons: selectedAddons,
          depositIdr: DEPOSIT_IDR,
          paymentMethod: input.paymentMethod,
          paymentStatus: "pending",
          appointmentAt: input.appointmentAt ?? null,
          readyAt: null,
          startsAt: null,
          endsAt: null,
          completedAt: null,
          extensions: [],
          motorOn: true,
          createdAt: new Date().toISOString(),
          rating: null,
          reviewNote: null,
        };

        set((s) => ({
          bookings: [booking, ...s.bookings],
          vehicles: s.vehicles.map((v) =>
            v.id === vehicle!.id
              ? { ...v, status: "reserved" as VehicleStatus }
              : v,
          ),
        }));
        return booking;
      },

      setPaymentMethod: (bookingId, method) =>
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === bookingId ? { ...b, paymentMethod: method } : b,
          ),
        })),

      setReturnSite: (bookingId, siteId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.id === bookingId);
          if (!booking) return s;
          const site = s.sites.find(
            (x) => x.id === siteId && x.operatorId === booking.operatorId,
          );
          if (!site) {
            return { ...s, toast: "Pick a return hub from this operator" };
          }
          return {
            bookings: s.bookings.map((b) =>
              b.id === bookingId ? { ...b, returnSiteId: siteId } : b,
            ),
          };
        }),

      setDigitalKeyIssueMode: (bookingId, mode) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.id === bookingId);
          if (!booking) return s;
          if (!operatorCan(s, "bookings.manage", booking.siteId)) {
            return { ...s, toast: operatorDeniedToast(s) };
          }
          if (!needsDigitalKey(booking)) return s;
          return {
            bookings: s.bookings.map((b) =>
              b.id === bookingId ? { ...b, digitalKeyIssueMode: mode } : b,
            ),
            toast:
              mode === "auto"
                ? "Kunci digital: otomatis saat Terima"
                : "Kunci digital: kirim manual dari Orders",
          };
        }),

      issueDigitalKey: (bookingId) => {
        const state = get();
        const booking = state.bookings.find((b) => b.id === bookingId);
        if (!booking) return;
        if (!operatorCan(state, "bookings.manage", booking.siteId)) {
          set({ toast: operatorDeniedToast(state) });
          return;
        }
        if (!needsDigitalKey(booking)) {
          set({ toast: "Pesanan ini tidak memakai kunci digital" });
          return;
        }
        if (booking.digitalKeyIssuedAt) {
          set({ toast: "Kunci digital sudah dikirim" });
          return;
        }
        if (
          !["confirmed", "awaiting_pickup", "pending"].includes(booking.status)
        ) {
          set({ toast: "Tidak bisa kirim kunci untuk status ini" });
          return;
        }
        const issuedAt = new Date().toISOString();
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === bookingId ? { ...b, digitalKeyIssuedAt: issuedAt } : b,
          ),
          notifications: [notifyDigitalKey(booking), ...s.notifications],
          toast: `Kunci digital dikirim · ${booking.code}`,
        }));
      },

      confirmBooking: (bookingId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.id === bookingId);
          if (!booking || booking.status !== "pending") return s;
          if (!operatorCan(s, "bookings.manage", booking.siteId)) {
            return { ...s, toast: operatorDeniedToast(s) };
          }
          const issuedAt = new Date().toISOString();
          const { booking: next, issued } = applyAutoDigitalKey(
            {
              ...booking,
              status: nextStatusAfterConfirm(booking),
              readyAt:
                booking.paymentStatus === "paid" ||
                booking.paymentMethod === "pay_at_operator"
                  ? issuedAt
                  : booking.readyAt,
            },
            issuedAt,
          );
          const notes = [notifyConfirm(booking)];
          if (issued) notes.push(notifyDigitalKey(next));
          return {
            bookings: s.bookings.map((b) =>
              b.id === bookingId ? next : b,
            ),
            notifications: [...notes, ...s.notifications],
            toast: issued
              ? "Diterima · kunci digital dikirim ke rider"
              : "Pesanan diterima — rider diberitahu",
          };
        }),

      declineBooking: (bookingId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.id === bookingId);
          if (
            booking &&
            !operatorCan(s, "bookings.manage", booking.siteId)
          ) {
            return { ...s, toast: operatorDeniedToast(s) };
          }
          return {
            bookings: s.bookings.map((b) =>
              b.id === bookingId ? { ...b, status: "cancelled" } : b,
            ),
            vehicles: booking
              ? s.vehicles.map((v) =>
                  v.id === booking.vehicleId
                    ? { ...v, status: "available" as VehicleStatus }
                    : v,
                )
              : s.vehicles,
            notifications: booking
              ? [
                  {
                    id: `n-decline-${booking.id}-${Date.now()}`,
                    title: "Booking declined",
                    body: `${booking.code} was declined by the operator. Deposit will not be charged.`,
                    read: false,
                    createdAt: new Date().toISOString(),
                    href: "/history",
                    bookingId: booking.id,
                  },
                  ...s.notifications,
                ]
              : s.notifications,
          };
        }),

      cancelBooking: (bookingId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.id === bookingId);
          if (!booking) return s;
          if (
            ["active", "overdue", "completed", "cancelled"].includes(
              booking.status,
            )
          ) {
            return s;
          }
          // Unpaid: always cancellable. Paid: only while still waiting hub confirm.
          if (
            booking.paymentStatus === "paid" &&
            booking.status !== "pending"
          ) {
            return s;
          }
          return {
            bookings: s.bookings.map((b) =>
              b.id === bookingId ? { ...b, status: "cancelled" as const } : b,
            ),
            vehicles: s.vehicles.map((v) =>
              v.id === booking.vehicleId
                ? { ...v, status: "available" as VehicleStatus }
                : v,
            ),
            notifications: [
              {
                id: `n-cancel-${booking.id}-${Date.now()}`,
                title: "Booking cancelled",
                body: `${booking.code} cancelled. The unit is free again.`,
                read: false,
                createdAt: new Date().toISOString(),
                href: "/history",
                bookingId: booking.id,
              },
              ...s.notifications,
            ],
            toast: "Booking cancelled",
          };
        }),

      confirmBulk: (ids) =>
        set((s) => {
          const confirmed = s.bookings.filter(
            (b) =>
              ids.includes(b.id) &&
              b.status === "pending" &&
              operatorCan(s, "bookings.manage", b.siteId),
          );
          const confirmedIds = new Set(confirmed.map((booking) => booking.id));
          const issuedAt = new Date().toISOString();
          const notes: AppNotification[] = [];
          const updated = s.bookings.map((b) => {
            if (!confirmedIds.has(b.id)) return b;
            const base: Booking = {
              ...b,
              status: nextStatusAfterConfirm(b),
              readyAt:
                b.paymentStatus === "paid" ||
                b.paymentMethod === "pay_at_operator"
                  ? issuedAt
                  : b.readyAt,
            };
            const { booking: next, issued } = applyAutoDigitalKey(base, issuedAt);
            notes.push(notifyConfirm(b));
            if (issued) notes.push(notifyDigitalKey(next));
            return next;
          });
          return {
            bookings: updated,
            notifications: [...notes, ...s.notifications],
            toast:
              confirmed.length > 0
                ? `Diterima ${confirmed.length} — rider diberitahu`
                : null,
          };
        }),

      payBooking: (bookingId) => {
        const before = get();
        const booking = before.bookings.find((b) => b.id === bookingId);
        if (!booking) return;
        if (
          before.user.role === "operator" &&
          !operatorCan(before, "bookings.manage", booking.siteId)
        ) {
          set({ toast: operatorDeniedToast(before) });
          return;
        }

        if (
          booking.paymentMethod === "casan_wallet" &&
          booking.paymentStatus === "pending"
        ) {
          const total =
            booking.rentalPriceIdr +
            (booking.addonsPriceIdr ?? 0) +
            booking.depositIdr;
          if (before.walletBalanceIdr < total) {
            set({
              toast: `Casan Wallet needs ${formatIdr(total)} — top up or choose another method`,
            });
            return;
          }
          const txn: WalletTxn = {
            id: `wtxn-pay-${bookingId}-${Date.now()}`,
            kind: "rental",
            amountIdr: -total,
            label: `Rental ${booking.code}`,
            createdAt: new Date().toISOString(),
            bookingId,
          };
          set((s) => ({
            walletBalanceIdr: s.walletBalanceIdr - total,
            walletTxns: [txn, ...s.walletTxns],
            bookings: s.bookings.map((b) =>
              b.id === bookingId
                ? {
                    ...b,
                    paymentStatus: "paid" as const,
                    status:
                      b.status === "pending" ? "pending" : "awaiting_pickup",
                    readyAt:
                      b.status === "pending"
                        ? b.readyAt
                        : (b.readyAt ?? new Date().toISOString()),
                  }
                : b,
            ),
          }));
        } else {
          set((s) => ({
            bookings: s.bookings.map((b) =>
              b.id === bookingId
                ? {
                    ...b,
                    paymentStatus: "paid" as const,
                    status:
                      b.status === "pending" ? "pending" : "awaiting_pickup",
                    readyAt:
                      b.status === "pending"
                        ? b.readyAt
                        : (b.readyAt ?? new Date().toISOString()),
                  }
                : b,
            ),
          }));
        }

        // Demo: simulate operator accepting the request after a short delay.
        const after = get().bookings.find((b) => b.id === bookingId);
        if (IS_DEMO && after?.status === "pending") {
          window.setTimeout(() => {
            const still = get().bookings.find((b) => b.id === bookingId);
            if (still?.status === "pending") {
              get().confirmBooking(bookingId);
            }
          }, 2800);
        }
      },

      startRide: (bookingId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.id === bookingId);
          if (!booking) return s;
          const needsPhys =
            booking.keysAccess === "physical" || booking.keysAccess === "both";
          if (needsPhys && !booking.physicalKeyGiven) {
            return {
              ...s,
              toast: "Operator must give the physical key first",
            };
          }
          const startsAt = new Date();
          const endsAt = new Date(
            startsAt.getTime() + booking.durationMinutes * 60_000,
          );
          return {
            bookings: s.bookings.map((b) =>
              b.id === bookingId
                ? {
                    ...b,
                    status: "active",
                    startsAt: startsAt.toISOString(),
                    endsAt: endsAt.toISOString(),
                    motorOn: true,
                  }
                : b,
            ),
            vehicles: s.vehicles.map((v) =>
              v.id === booking.vehicleId
                ? { ...v, status: "rented" as VehicleStatus }
                : v,
            ),
          };
        }),

      givePhysicalKey: (bookingId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.id === bookingId);
          if (!booking) return s;
          if (!operatorCan(s, "bookings.manage", booking.siteId)) {
            return { ...s, toast: operatorDeniedToast(s) };
          }
          const needsPhys =
            booking.keysAccess === "physical" || booking.keysAccess === "both";
          if (!needsPhys) {
            return { ...s, toast: "This bike has no physical key" };
          }
          const startsAt = new Date();
          const endsAt = new Date(
            startsAt.getTime() + booking.durationMinutes * 60_000,
          );
          const shouldStart =
            booking.status === "confirmed" ||
            booking.status === "awaiting_pickup";
          return {
            bookings: s.bookings.map((b) =>
              b.id === bookingId
                ? {
                    ...b,
                    physicalKeyGiven: true,
                    physicalKeyReturned: false,
                    ...(shouldStart
                      ? {
                          status: "active" as const,
                          startsAt: startsAt.toISOString(),
                          endsAt: endsAt.toISOString(),
                          motorOn: true,
                        }
                      : {}),
                  }
                : b,
            ),
            vehicles: shouldStart
              ? s.vehicles.map((v) =>
                  v.id === booking.vehicleId
                    ? { ...v, status: "rented" as VehicleStatus }
                    : v,
                )
              : s.vehicles,
            toast: shouldStart
              ? "Key handed to rider · rental started"
              : "Key marked as handed over",
          };
        }),

      collectPhysicalKey: (bookingId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.id === bookingId);
          if (!booking) return s;
          if (!operatorCan(s, "bookings.manage", booking.siteId)) {
            return { ...s, toast: operatorDeniedToast(s) };
          }
          return {
            bookings: s.bookings.map((b) =>
              b.id === bookingId
                ? { ...b, physicalKeyReturned: true }
                : b,
            ),
            toast: "Key back from rider ✓",
          };
        }),

      toggleMotor: (bookingId) =>
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === bookingId ? { ...b, motorOn: !b.motorOn } : b,
          ),
        })),

      extendRide: (bookingId, extraMinutes, paymentMethod) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.id === bookingId);
          if (!booking?.endsAt) return s;
          const previousEndsAt = booking.endsAt;
          const endsAt = new Date(
            new Date(previousEndsAt).getTime() + extraMinutes * 60_000,
          );
          const perMin =
            booking.rentalPriceIdr / Math.max(1, booking.durationMinutes);
          const baseExtra = Math.round(perMin * extraMinutes);
          const weekend = applyWeekendSurcharge(
            baseExtra,
            Boolean(s.weekendSurcharge[booking.operatorId]),
            endsAt,
          );
          const extraPrice = weekend.priceIdr;
          if (
            paymentMethod === "casan_wallet" &&
            s.walletBalanceIdr < extraPrice
          ) {
            return {
              ...s,
              toast: `Casan Wallet needs ${formatIdr(extraPrice)} — top up or choose another method`,
            };
          }
          const addLabel =
            extraMinutes < 60
              ? `+${extraMinutes}m`
              : extraMinutes % (60 * 24 * 7) === 0
                ? `+${extraMinutes / (60 * 24 * 7)}w`
                : extraMinutes % (60 * 24) === 0
                  ? `+${extraMinutes / (60 * 24)}d`
                  : `+${extraMinutes / 60}h`;
          const weekendNote = weekend.applied ? " (+15% weekend)" : "";
          const walletTxn: WalletTxn | null =
            paymentMethod === "casan_wallet"
              ? {
                  id: `wtxn-ext-${bookingId}-${Date.now()}`,
                  kind: "rental",
                  amountIdr: -extraPrice,
                  label: `Extend ${booking.code} ${addLabel}${weekendNote}`,
                  createdAt: new Date().toISOString(),
                  bookingId,
                }
              : null;
          return {
            walletBalanceIdr: walletTxn
              ? s.walletBalanceIdr - extraPrice
              : s.walletBalanceIdr,
            walletTxns: walletTxn
              ? [walletTxn, ...s.walletTxns]
              : s.walletTxns,
            bookings: s.bookings.map((b) =>
              b.id === bookingId
                ? {
                    ...b,
                    status: b.status === "overdue" ? "active" : b.status,
                    endsAt: endsAt.toISOString(),
                    durationMinutes: b.durationMinutes + extraMinutes,
                    durationLabel: `${b.durationLabel} ${addLabel}`,
                    rentalPriceIdr: b.rentalPriceIdr + extraPrice,
                    extensions: [
                      ...(b.extensions ?? []),
                      {
                        id: `ext-${Date.now()}`,
                        requestedAt: new Date().toISOString(),
                        extraMinutes,
                        priceIdr: extraPrice,
                        previousEndsAt,
                        newEndsAt: endsAt.toISOString(),
                      },
                    ],
                  }
                : b,
            ),
            toast:
              paymentMethod === "pay_at_operator"
                ? `Extended ${addLabel}${weekendNote} · pay ${formatIdr(extraPrice)} at the hub`
                : `Extended ${addLabel}${weekendNote}`,
            notifications: [
              {
                id: `n-extension-${bookingId}-${Date.now()}`,
                title: "Rental extended",
                body: `${booking.code} paid ${formatIdr(extraPrice)}${weekendNote} for ${addLabel}. New return: ${formatReturnBy(endsAt.toISOString())}.`,
                read: false,
                createdAt: new Date().toISOString(),
              },
              ...s.notifications,
            ],
          };
        }),

      markOverdue: (bookingId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.id === bookingId);
          if (!booking || booking.status !== "active") return s;
          return {
            bookings: s.bookings.map((b) =>
              b.id === bookingId
                ? { ...b, status: "overdue", motorOn: false }
                : b,
            ),
            notifications: [
              {
                id: `n-overdue-${bookingId}-${Date.now()}`,
                title: "Rental overdue",
                body: `${booking.code} time expired. Return now or extend. Overtime billing coming soon.`,
                read: false,
                createdAt: new Date().toISOString(),
              },
              ...s.notifications,
            ],
          };
        }),

      completeReturn: (bookingId) => {
        const state = get();
        const booking = state.bookings.find((b) => b.id === bookingId);
        if (!booking) return;
        if (booking.status === "completed") return;
        if (!operatorCan(state, "bookings.manage", booking.siteId)) {
          set({ toast: operatorDeniedToast(state) });
          return;
        }
        const needsPhys =
          booking.keysAccess === "physical" || booking.keysAccess === "both";
        const refundToWallet =
          booking.paymentMethod === "casan_wallet" &&
          booking.paymentStatus === "paid" &&
          booking.depositIdr > 0;
        const deposit = booking.depositIdr;
        const refundTxn: WalletTxn | null = refundToWallet
          ? {
              id: `wtxn-refund-${bookingId}-${Date.now()}`,
              kind: "refund",
              amountIdr: deposit,
              label: `Deposit returned · ${booking.code}`,
              createdAt: new Date().toISOString(),
              bookingId,
            }
          : null;
        // Operator finish = key must be back. Auto-mark collected when finishing.
        set((s) => ({
          walletBalanceIdr: refundTxn
            ? s.walletBalanceIdr + deposit
            : s.walletBalanceIdr,
          walletTxns: refundTxn ? [refundTxn, ...s.walletTxns] : s.walletTxns,
          bookings: s.bookings.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  status: "completed",
                  motorOn: false,
                  paymentStatus: "refunded",
                  completedAt: new Date().toISOString(),
                  physicalKeyReturned: needsPhys
                    ? true
                    : b.physicalKeyReturned,
                }
              : b,
          ),
          vehicles: s.vehicles.map((v) =>
            v.id === booking.vehicleId
              ? { ...v, status: "available" as VehicleStatus }
              : v,
          ),
          toast: refundToWallet
            ? needsPhys
              ? `Key collected · ${formatIdr(deposit)} deposit back to Wallet`
              : `Return finished · ${formatIdr(deposit)} deposit back to Wallet`
            : needsPhys
              ? "Key collected · bike free again"
              : "Return finished · bike free",
        }));
      },

      submitReview: (bookingId, rating, note) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.id === bookingId);
          const model = booking
            ? s.models.find((m) => m.id === booking.modelId)
            : null;
          const review: OperatorReview | null =
            booking && note?.trim()
              ? {
                  id: `rv-${bookingId}`,
                  operatorId: booking.operatorId,
                  riderName: booking.riderName,
                  rating,
                  note: note.trim(),
                  modelName: model?.name ?? booking.durationLabel,
                  createdAt: new Date().toISOString(),
                }
              : booking
                ? {
                    id: `rv-${bookingId}`,
                    operatorId: booking.operatorId,
                    riderName: booking.riderName,
                    rating,
                    note: "Rated via app",
                    modelName: model?.name ?? booking.durationLabel,
                    createdAt: new Date().toISOString(),
                  }
                : null;
          return {
            bookings: s.bookings.map((b) =>
              b.id === bookingId
                ? { ...b, rating, reviewNote: note?.trim() || null }
                : b,
            ),
            reviews: review ? [review, ...s.reviews] : s.reviews,
            toast: "Thanks for your review",
          };
        }),

      updateVehicleStatus: (vehicleId, status) =>
        set((s) => {
          const vehicle = s.vehicles.find((v) => v.id === vehicleId);
          if (
            vehicle &&
            !operatorCan(s, "fleet.manage", vehicle.siteId)
          ) {
            return { ...s, toast: operatorDeniedToast(s) };
          }
          const vehicles = s.vehicles.map((v) =>
            v.id === vehicleId ? { ...v, status } : v,
          );
          return {
            vehicles: syncVehicleStatusesFromBookings(vehicles, s.bookings),
          };
        }),

      addMaintenanceEntry: (vehicleId, note) => {
        const state = get();
        const vehicle = state.vehicles.find((v) => v.id === vehicleId);
        if (!vehicle) return "Unit not found";
        if (!operatorCan(state, "fleet.manage", vehicle.siteId)) {
          return operatorDeniedToast(state);
        }
        const trimmed = note.trim();
        if (!trimmed) return "Add a short maintenance note";
        const entry: VehicleMaintenanceEntry = {
          id: `mnt-${Date.now()}`,
          vehicleId,
          operatorId: vehicle.operatorId,
          note: trimmed.slice(0, 240),
          createdAt: new Date().toISOString(),
          createdBy: state.user.name || "Staff",
        };
        set((s) => ({
          maintenanceLog: [entry, ...s.maintenanceLog],
        }));
        return null;
      },

      addSite: (input) => {
        const state = get();
        if (!operatorCan(state, "locations.manage")) return null;
        if (!input.name.trim()) return null;
        const op = get().operators.find((o) => o.id === input.operatorId);
        const hours = input.hours?.trim() || "07:00 - 20:00";
        const oc = siteHoursParts(hours);
        const site: OperatorSite = {
          id: `site-${Date.now()}`,
          operatorId: input.operatorId,
          city: input.city?.trim() || op?.city || "Jakarta",
          area: input.area?.trim() || input.name.trim(),
          name: input.name.trim(),
          address: input.address.trim() || input.name.trim(),
          lat: input.lat ?? op?.lat ?? 0,
          lng: input.lng ?? op?.lng ?? 0,
          hours,
          opensAt: oc.open,
          closesAt: oc.close,
          whatsapp: input.whatsapp?.trim() || op?.phone || "",
          storeInfo: input.storeInfo?.trim() || "",
          supportsFrontDesk: input.supportsFrontDesk,
          supportsSelfService: input.supportsSelfService,
          shopPickupLabel: input.supportsFrontDesk
            ? `${input.name.trim()} counter`
            : "—",
          selfCollectLabel: input.supportsSelfService
            ? `${input.name.trim()} self-collect pin`
            : "—",
        };
        set((s) => ({ sites: [...s.sites, site] }));
        return site;
      },

      updateSite: (siteId, input) => {
        const state = get();
        if (!operatorCan(state, "locations.manage", siteId)) {
          return operatorDeniedToast(state);
        }
        if (!input.name.trim()) return "Place name required";
        const site = get().sites.find((x) => x.id === siteId);
        if (!site) return "Place not found";
        const hours = input.hours.trim() || site.hours;
        const oc = siteHoursParts(hours);
        set((s) => ({
          sites: s.sites.map((x) =>
            x.id === siteId
              ? {
                  ...x,
                  name: input.name.trim(),
                  address: input.address.trim() || input.name.trim(),
                  city: input.city.trim() || x.city,
                  area: input.area.trim() || input.name.trim(),
                  lat: input.lat,
                  lng: input.lng,
                  hours,
                  opensAt: oc.open,
                  closesAt: oc.close,
                  whatsapp: input.whatsapp.trim(),
                  storeInfo: input.storeInfo.trim(),
                  supportsFrontDesk: input.supportsFrontDesk,
                  supportsSelfService: input.supportsSelfService,
                  shopPickupLabel: input.supportsFrontDesk
                    ? `${input.name.trim()} counter`
                    : "—",
                  selfCollectLabel: input.supportsSelfService
                    ? `${input.name.trim()} self-collect pin`
                    : "—",
                }
              : x,
          ),
        }));
        return null;
      },

      removeSite: (siteId) => {
        const state = get();
        if (!operatorCan(state, "locations.manage", siteId)) {
          return operatorDeniedToast(state);
        }
        const units = get().vehicles.filter((v) => v.siteId === siteId);
        if (units.some((v) => v.status === "rented" || v.status === "reserved")) {
          return "Move or finish active bookings before removing this site";
        }
        set((s) => ({
          sites: s.sites.filter((x) => x.id !== siteId),
          vehicles: s.vehicles.map((v) =>
            v.siteId === siteId ? { ...v, siteId: "" } : v,
          ),
          staff: s.staff.map((member) =>
            member.siteIds == null
              ? member
              : {
                  ...member,
                  siteIds: member.siteIds.filter((id) => id !== siteId),
                },
          ),
          operatorActiveSiteId:
            s.operatorActiveSiteId === siteId
              ? null
              : s.operatorActiveSiteId,
        }));
        return null;
      },

      addVehicle: (input) => {
        const state = get();
        if (!operatorCan(state, "fleet.manage", input.siteId)) {
          set({ toast: operatorDeniedToast(state) });
          return null;
        }
        const op = get().operators.find((o) => o.id === input.operatorId);
        const site = get().sites.find((x) => x.id === input.siteId);
        const existingModel = input.modelId
          ? get().models.find((m) => m.id === input.modelId)
          : get().models.find(
              (m) =>
                m.operatorId === input.operatorId &&
                m.name.toLowerCase() === input.name.trim().toLowerCase(),
            );

        let modelId = existingModel?.id;
        let models = get().models;

        if (!existingModel) {
          modelId = `m-${Date.now()}`;
          const newModel: VehicleModel = {
            id: modelId,
            operatorId: input.operatorId,
            name: input.name.trim(),
            vehicleType: input.vehicleType,
            description: `${input.name} fleet unit`,
            images:
              input.vehicleType === "emoped"
                ? ["/vehicles/emoped.svg"]
                : input.vehicleType === "bicycle"
                  ? ["/vehicles/bicycle.svg"]
                  : ["/vehicles/ebike.svg"],
            pricePerHour: input.pricePerHour,
            rentalMode: input.rentalMode,
            allowFrontDesk:
              input.rentalMode !== "digital" && (op?.supportsFrontDesk ?? true),
            allowSelfService:
              input.rentalMode !== "key_handover" &&
              (op?.supportsSelfService ?? true),
            motorWatts:
              input.vehicleType === "bicycle"
                ? null
                : input.vehicleType === "emoped"
                  ? 1000
                  : 250,
            rangeKm: input.vehicleType === "bicycle" ? null : 45,
            maxSpeedKmh:
              input.vehicleType === "bicycle"
                ? null
                : input.vehicleType === "emoped"
                  ? 45
                  : 25,
            weightKg: input.vehicleType === "emoped" ? 55 : 18,
            batteryVoltageV:
              input.vehicleType === "bicycle"
                ? null
                : input.vehicleType === "emoped"
                  ? 60
                  : 48,
            batteryAh:
              input.vehicleType === "bicycle"
                ? null
                : input.vehicleType === "emoped"
                  ? 20
                  : 12,
            chargerAmpsDefault:
              input.vehicleType === "bicycle"
                ? null
                : input.vehicleType === "emoped"
                  ? 3
                  : 2,
            requiresSimAck: input.vehicleType === "emoped",
            emoji:
              input.vehicleType === "emoped"
                ? "🛵"
                : input.vehicleType === "ebike"
                  ? "⚡"
                  : "🚲",
            includes:
              input.vehicleType === "bicycle"
                ? ["Physical key", "Helmet"]
                : ["Helmet"],
          };
          models = [newModel, ...models];
        }

        const model = models.find((m) => m.id === modelId)!;
        const vehicle: Vehicle = {
          id: `v-${Date.now()}`,
          modelId: model.id,
          operatorId: input.operatorId,
          siteId: input.siteId,
          code: input.code,
          name: model.name,
          vehicleType: model.vehicleType,
          status: "available",
          rentalMode: model.rentalMode,
          allowFrontDesk: model.allowFrontDesk,
          allowSelfService: model.allowSelfService,
          batteryPct:
            model.vehicleType === "bicycle" ? null : (input.batteryPct ?? 80),
          motorWatts: model.motorWatts,
          rangeKm: model.rangeKm,
          maxSpeedKmh: model.maxSpeedKmh,
          weightKg: model.weightKg,
          batteryVoltageV: model.batteryVoltageV,
          batteryAh: model.batteryAh,
          chargerAmpsDefault: model.chargerAmpsDefault,
          pricePerHour: model.pricePerHour,
          lat: site?.lat ?? op?.lat ?? 0,
          lng: site?.lng ?? op?.lng ?? 0,
          emoji: model.emoji,
          requiresSimAck: model.requiresSimAck,
          color: input.color ?? "Black",
          colorHex: input.colorHex ?? "#1C1C1E",
        };
        set((s) => ({
          models,
          vehicles: [vehicle, ...s.vehicles],
        }));
        return vehicle;
      },

      adjustFleetStock: ({ modelId, siteId, delta }) => {
        const state = get();
        if (!operatorCan(state, "fleet.manage", siteId)) {
          return operatorDeniedToast(state);
        }
        const model = get().models.find((m) => m.id === modelId);
        const site = get().sites.find((x) => x.id === siteId);
        if (!model || !site) return "Model or site missing";

        if (delta === 1) {
          const n =
            get().vehicles.filter((v) => v.modelId === modelId).length + 1;
          const prefix = model.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 3);
          get().addVehicle({
            operatorId: model.operatorId,
            siteId,
            modelId,
            name: model.name,
            code: `${prefix}-${String(n).padStart(2, "0")}`,
            vehicleType: model.vehicleType,
            rentalMode: model.rentalMode,
            pricePerHour: model.pricePerHour,
            batteryPct: model.vehicleType === "bicycle" ? null : 90,
          });
          return null;
        }

        const removable = get().vehicles.find(
          (v) =>
            v.modelId === modelId &&
            v.siteId === siteId &&
            (v.status === "available" || v.status === "maintenance"),
        );
        if (!removable) {
          return "No idle unit to remove at this site (finish rentals first)";
        }
        get().removeVehicle(removable.id);
        return null;
      },

      removeVehicle: (vehicleId) =>
        set((s) => {
          const vehicle = s.vehicles.find((v) => v.id === vehicleId);
          if (
            vehicle &&
            !operatorCan(s, "fleet.manage", vehicle.siteId)
          ) {
            return { ...s, toast: operatorDeniedToast(s) };
          }
          return {
            vehicles: s.vehicles.filter((v) => v.id !== vehicleId),
          };
        }),

      moveVehicleSite: (vehicleId, siteId) =>
        set((s) => {
          const vehicle = s.vehicles.find((v) => v.id === vehicleId);
          if (
            vehicle &&
            (!operatorCan(s, "fleet.manage", vehicle.siteId) ||
              (siteId && !operatorCan(s, "fleet.manage", siteId)))
          ) {
            return { ...s, toast: operatorDeniedToast(s) };
          }
          if (!siteId) {
            return {
              vehicles: s.vehicles.map((v) =>
                v.id === vehicleId ? { ...v, siteId: "" } : v,
              ),
            };
          }
          const site = s.sites.find((x) => x.id === siteId);
          if (!site) return s;
          return {
            vehicles: s.vehicles.map((v) =>
              v.id === vehicleId
                ? { ...v, siteId, lat: site.lat, lng: site.lng }
                : v,
            ),
          };
        }),

      updatePricing: (operatorId, tiers) =>
        set((s) =>
          operatorCan(s, "pricing.manage")
            ? { pricing: { ...s.pricing, [operatorId]: tiers } }
            : { ...s, toast: operatorDeniedToast(s) },
        ),

      setWeekendSurcharge: (operatorId, on) =>
        set((s) =>
          operatorCan(s, "pricing.manage")
            ? {
                weekendSurcharge: {
                  ...s.weekendSurcharge,
                  [operatorId]: on,
                },
              }
            : { ...s, toast: operatorDeniedToast(s) },
        ),

      markNotificationsRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),

      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        })),

      simulateRiderRequest: () => {
        const state = get();
        const opId = state.user.operatorId;
        if (!opId) return null;
        const member = getCurrentStaff(state.user, state.staff);
        if (!canStaff(member, "bookings.manage")) {
          set({ toast: operatorDeniedToast(state) });
          return null;
        }
        const vehicle =
          state.vehicles.find(
            (v) =>
              v.operatorId === opId &&
              v.status === "available" &&
              canAccessSite(member, v.siteId),
          ) ?? null;
        if (!vehicle) {
          get().setToast("No free bike — mark one Free first");
          return null;
        }
        const model = get().models.find((m) => m.id === vehicle.modelId);
        const keysAccess: KeysAccess =
          vehicle.rentalMode === "both"
            ? "both"
            : vehicle.rentalMode === "key_handover"
              ? "physical"
              : "digital";
        const needsShop =
          keysAccess === "physical" || keysAccess === "both";
        const names = [
          { name: "Rina (kost)", phone: "+62 812-5555-0101" },
          { name: "Andi Student", phone: "+62 812-5555-0202" },
          { name: "Maya UI", phone: "+62 812-5555-0303" },
          { name: "Joko UNJ", phone: "+62 812-5555-0404" },
          { name: "Salsa", phone: "+62 812-5555-0505" },
        ];
        const rider = names[Math.floor(Math.random() * names.length)];
        const price = model?.pricePerHour
          ? Math.round(model.pricePerHour * 1.8)
          : 75_000;
        const booking: Booking = {
          id: `bk-sim-${Date.now()}`,
          code: bookingCode(),
          operatorId: opId,
          vehicleId: vehicle.id,
          modelId: vehicle.modelId,
          siteId: vehicle.siteId,
          riderName: rider.name,
          riderPhone: rider.phone,
          status: "pending",
          pickupType: needsShop ? "front_desk" : "self_service",
          rentalMode: keysAccess === "physical" ? "key_handover" : "digital",
          keysAccess,
          digitalKeyIssueMode: "auto",
          digitalKeyIssuedAt: null,
          returnSiteId: vehicle.siteId,
          physicalKeyGiven: false,
          physicalKeyReturned: false,
          durationLabel: "2 Hours",
          durationMinutes: 120,
          rentalPriceIdr: price,
          addonsPriceIdr: 0,
          addons: [],
          depositIdr: DEPOSIT_IDR,
          paymentMethod: "qris",
          paymentStatus: "paid",
          appointmentAt: new Date(Date.now() + 45 * 60_000).toISOString(),
          readyAt: null,
          startsAt: null,
          endsAt: null,
          completedAt: null,
          extensions: [],
          motorOn: true,
          createdAt: new Date().toISOString(),
          rating: null,
          reviewNote: null,
        };
        set((s) => ({
          bookings: [booking, ...s.bookings],
          vehicles: s.vehicles.map((v) =>
            v.id === vehicle.id
              ? { ...v, status: "reserved" as VehicleStatus }
              : v,
          ),
          notifications: [
            {
              id: `n-req-${booking.id}`,
              title: "New booking request",
              body: `${rider.name} (${rider.phone}) wants ${vehicle.name} (${vehicle.code}). Tap Accept.`,
              read: false,
              createdAt: new Date().toISOString(),
            },
            ...s.notifications,
          ],
          toast: `${rider.name} asked to rent — Accept or Reject`,
        }));
        return booking;
      },

      resetDemo: () =>
        set({
          sites: seedSites,
          models: seedModels,
          vehicles: syncVehicleStatusesFromBookings(
            seedVehicles,
            seedMockBookings,
          ),
          operators: seedOperators,
          bookings: seedMockBookings,
          pricing: seedPricing,
          favorites: ["m-margo-galaxy", "op-margonda"],
          notifications: seedNotifications,
          maintenanceLog: [],
          walletBalanceIdr: WALLET_SEED_IDR,
          walletTxns: [
            {
              id: "wtxn-seed",
              kind: "topup",
              amountIdr: WALLET_SEED_IDR,
              label: "Demo starting balance",
              createdAt: new Date().toISOString(),
            },
          ],
          referralRedeemed: false,
          discoveryPin: "jakarta",
          discoveryGps: null,
          reviews: seedReviews,
          chargingAddons: seedChargingAddons,
          welcomeComplete: false,
          safetyTipsDismissed: false,
          riderGuide: null,
          operatorDeskGuideComplete: false,
        }),
    }),
    {
      name: "casan-rent-v1",
      onRehydrateStorage: () => (state) => {
        if (state) {
          const needsMigrate =
            !state.models?.length ||
            !state.sites?.length ||
            !state.operators?.some((o) => o.city === "Jakarta") ||
            state.operators.some((o) => !o.locationImages?.length || !o.mapImage) ||
            state.vehicles.some(
              (v) => !v.modelId || !v.siteId || v.batteryVoltageV == null,
            ) ||
            state.models.some(
              (m) =>
                m.batteryVoltageV == null ||
                m.images.some((img) => img.endsWith(".svg")),
            ) ||
            state.bookings.some((b) => b.addons == null || !b.keysAccess || !b.siteId);
          if (needsMigrate) {
            state.sites = seedSites;
            state.models = seedModels;
            state.vehicles = seedVehicles;
            state.operators = seedOperators;
            state.reviews = seedReviews;
            state.chargingAddons = seedChargingAddons;
            state.pricing = seedPricing;
            state.favorites = ["m-margo-galaxy", "op-margonda"];
            const hasMock = state.bookings.some((b) => b.id.startsWith("bk-mock-"));
            state.bookings = hasMock
              ? state.bookings.map((b) => {
                  const vehicle = state.vehicles.find((v) => v.id === b.vehicleId);
                  const keysAccess: KeysAccess =
                    b.keysAccess ??
                    (b.rentalMode === "key_handover" ? "physical" : "digital");
                  return {
                    ...b,
                    addons: b.addons ?? [],
                    addonsPriceIdr: b.addonsPriceIdr ?? 0,
                    siteId: b.siteId || vehicle?.siteId || "",
                    returnSiteId: b.returnSiteId || b.siteId || vehicle?.siteId || "",
                    keysAccess,
                    digitalKeyIssueMode: b.digitalKeyIssueMode ?? "auto",
                    digitalKeyIssuedAt:
                      b.digitalKeyIssuedAt ??
                      (keysAccess === "digital" || keysAccess === "both"
                        ? b.createdAt
                        : null),
                    physicalKeyGiven: b.physicalKeyGiven ?? false,
                    physicalKeyReturned: b.physicalKeyReturned ?? false,
                  };
                })
              : [
                  ...seedMockBookings,
                  ...state.bookings.map((b) => {
                    const vehicle = state.vehicles.find((v) => v.id === b.vehicleId);
                    const keysAccess: KeysAccess =
                      b.keysAccess ??
                      (b.rentalMode === "key_handover" ? "physical" : "digital");
                    return {
                      ...b,
                      addons: b.addons ?? [],
                      addonsPriceIdr: b.addonsPriceIdr ?? 0,
                      siteId: b.siteId || vehicle?.siteId || "",
                      returnSiteId:
                        b.returnSiteId || b.siteId || vehicle?.siteId || "",
                      keysAccess,
                      digitalKeyIssueMode: b.digitalKeyIssueMode ?? "auto",
                      digitalKeyIssuedAt:
                        b.digitalKeyIssuedAt ??
                        (keysAccess === "digital" || keysAccess === "both"
                          ? b.createdAt
                          : null),
                      physicalKeyGiven: b.physicalKeyGiven ?? false,
                      physicalKeyReturned: b.physicalKeyReturned ?? false,
                    };
                  }),
                ];
          }
          if (!state.chargingAddons?.length) {
            state.chargingAddons = seedChargingAddons;
          }
          // Ensure pedal bikes lost leftover battery fields from older seeds.
          if (
            state.models.some(
              (m) =>
                (m.id === "m-margo-ledo" ||
                  m.id === "m-tebet-magical" ||
                  m.id === "m-rawa-city" ||
                  m.id === "m-beach-lite") &&
                m.vehicleType !== "bicycle",
            )
          ) {
            state.models = seedModels;
            state.vehicles = seedVehicles;
          }
          if (!state.bookings?.some((b) => b.id.startsWith("bk-mock-"))) {
            state.bookings = [...seedMockBookings, ...(state.bookings ?? [])];
          }
          if (state.sites?.some((s) => !s.city || !s.area)) {
            state.sites = state.sites.map((s) => ({
              ...s,
              city:
                s.city ||
                state.operators.find((o) => o.id === s.operatorId)?.city ||
                "Jakarta",
              area: s.area || s.name,
            }));
          }
          const margoSites = state.sites.filter(
            (s) => s.operatorId === "op-margonda",
          );
          const margoFleet = state.vehicles.filter(
            (v) => v.operatorId === "op-margonda",
          );
          const needsCompactHubs =
            margoSites.length !== 3 ||
            margoFleet.length < 30 ||
            !margoSites.every((s) => s.whatsapp && s.mapImage) ||
            state.sites.some((s) =>
              [
                "site-jakarta-sudirman",
                "site-jakarta-rawamangun",
                "site-jakarta-kelapa",
                "site-tebet-alley",
                "site-rawa-rack",
                "site-bali-lotb",
                "site-beach-pin",
                "site-ubud-north",
              ].includes(s.id),
            );
          if (needsCompactHubs) {
            state.sites = seedSites;
            state.vehicles = seedVehicles;
            state.operators = seedOperators;
            // Drop bookings that point at removed vehicles/sites
            const validVehicles = new Set(seedVehicles.map((v) => v.id));
            const validSites = new Set(seedSites.map((s) => s.id));
            state.bookings = state.bookings.filter(
              (b) =>
                b.status === "completed" ||
                b.status === "cancelled" ||
                (validVehicles.has(b.vehicleId) && validSites.has(b.siteId)),
            );
            if (!state.bookings.some((b) => b.id.startsWith("bk-mock-"))) {
              state.bookings = [...seedMockBookings, ...state.bookings];
            }
          }
          // Seed live demo trips (active ride + ready to collect) once for
          // sessions persisted before they existed.
          for (const demo of seedMockBookings) {
            const vehicleFree = !state.bookings.some(
              (b) =>
                b.vehicleId === demo.vehicleId &&
                b.status !== "completed" &&
                b.status !== "cancelled",
            );
            if (
              (demo.status === "active" ||
                demo.status === "awaiting_pickup" ||
                demo.status === "pending") &&
              demo.riderName === "You (demo)" &&
              !state.bookings.some((b) => b.id === demo.id) &&
              state.vehicles.some((v) => v.id === demo.vehicleId) &&
              vehicleFree
            ) {
              state.bookings = [demo, ...state.bookings];
            }
          }
          // Backfill color on older persisted units
          const palette = [
            { color: "Black", colorHex: "#1C1C1E" },
            { color: "White", colorHex: "#F2F2F7" },
            { color: "Teal", colorHex: "#0D9488" },
            { color: "Navy", colorHex: "#1E3A5F" },
            { color: "Red", colorHex: "#C0392B" },
            { color: "Silver", colorHex: "#A8B0B8" },
          ];
          state.vehicles = state.vehicles.map((v, i) =>
            v.color && v.colorHex
              ? v
              : {
                  ...v,
                  color: palette[i % palette.length].color,
                  colorHex: palette[i % palette.length].colorHex,
                },
          );
          state.vehicles = syncVehicleStatusesFromBookings(
            state.vehicles,
            state.bookings,
          );
          state.maintenanceLog = state.maintenanceLog ?? [];
          state.walletBalanceIdr = state.walletBalanceIdr ?? WALLET_SEED_IDR;
          state.walletTxns = state.walletTxns ?? [];
          // Bump legacy demo seed (150k < deposit) so wallet pay still works.
          if (
            state.walletBalanceIdr === 150_000 &&
            state.walletTxns.length === 1 &&
            state.walletTxns[0]?.id === "wtxn-seed"
          ) {
            state.walletBalanceIdr = WALLET_SEED_IDR;
            state.walletTxns = [
              {
                id: "wtxn-seed",
                kind: "topup",
                amountIdr: WALLET_SEED_IDR,
                label: "Demo starting balance",
                createdAt: state.walletTxns[0].createdAt,
              },
            ];
          }
          state.referralRedeemed = state.referralRedeemed ?? false;
          state.discoveryPin = state.discoveryPin ?? "jakarta";
          state.discoveryGps = state.discoveryGps ?? null;
          // Backfill digital-key / multi-hub return fields on persisted bookings.
          state.bookings = (state.bookings ?? []).map((b) => {
            const keysAccess: KeysAccess =
              b.keysAccess ??
              (b.rentalMode === "key_handover" ? "physical" : "digital");
            return {
              ...b,
              keysAccess,
              returnSiteId: b.returnSiteId || b.siteId,
              digitalKeyIssueMode: b.digitalKeyIssueMode ?? "auto",
              digitalKeyIssuedAt:
                b.digitalKeyIssuedAt !== undefined
                  ? b.digitalKeyIssuedAt
                  : keysAccess === "digital" || keysAccess === "both"
                    ? b.createdAt
                    : null,
            };
          });
          state.operatorDeskGuideComplete =
            state.operatorDeskGuideComplete ?? false;
          state.setHydrated(true);
        }
      },
      partialize: (s) => ({
        user: s.user,
        sites: s.sites,
        models: s.models,
        vehicles: s.vehicles,
        staff: s.staff,
        operators: s.operators,
        bookings: s.bookings,
        favorites: s.favorites,
        notifications: s.notifications,
        maintenanceLog: s.maintenanceLog,
        walletBalanceIdr: s.walletBalanceIdr,
        walletTxns: s.walletTxns,
        referralRedeemed: s.referralRedeemed,
        discoveryPin: s.discoveryPin,
        discoveryGps: s.discoveryGps,
        reviews: s.reviews,
        chargingAddons: s.chargingAddons,
        darkMode: s.darkMode,
        pricing: s.pricing,
        weekendSurcharge: s.weekendSurcharge,
        lastSeenVersion: s.lastSeenVersion,
        welcomeComplete: s.welcomeComplete,
        safetyTipsDismissed: s.safetyTipsDismissed,
        operatorDeskGuideComplete: s.operatorDeskGuideComplete,
        operatorActiveSiteId: s.operatorActiveSiteId,
      }),
    },
  ),
);

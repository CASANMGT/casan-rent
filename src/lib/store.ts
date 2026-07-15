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
  VehicleModel,
  VehicleStatus,
  VehicleType,
  RentalMode,
} from "./types";
import { bookingCode } from "./format";
import { APP_VERSION } from "./version";
import { pickAssignableUnit } from "./catalog";

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
  toast: string | null;
  darkMode: boolean;
  weekendSurcharge: Record<string, boolean>;
  lastSeenVersion: string | null;
  setHydrated: (v: boolean) => void;
  setToast: (msg: string | null) => void;
  toggleDarkMode: () => void;
  markVersionSeen: () => void;
  pushNotification: (title: string, body: string) => void;
  loginRider: (name: string, phone?: string, isGuest?: boolean) => void;
  loginOperator: (username: string, password: string) => string | null;
  logout: () => void;
  toggleFavorite: (id: string) => void;
  createBooking: (input: {
    vehicleId?: string;
    modelId?: string;
    pickupType: PickupType;
    durationLabel: string;
    durationMinutes: number;
    rentalPriceIdr: number;
    paymentMethod: PaymentMethod;
    addonIds?: string[];
  }) => Booking | null;
  setPaymentMethod: (bookingId: string, method: PaymentMethod) => void;
  confirmBooking: (bookingId: string) => void;
  declineBooking: (bookingId: string) => void;
  confirmBulk: (ids: string[]) => void;
  payBooking: (bookingId: string) => void;
  startRide: (bookingId: string) => void;
  /** Operator hands physical key to rider (shop). */
  givePhysicalKey: (bookingId: string) => void;
  /** Operator collects physical key on return. */
  collectPhysicalKey: (bookingId: string) => void;
  toggleMotor: (bookingId: string) => void;
  extendRide: (bookingId: string, extraMinutes: number) => void;
  markOverdue: (bookingId: string) => void;
  completeReturn: (bookingId: string) => void;
  submitReview: (bookingId: string, rating: number, note?: string) => void;
  updateVehicleStatus: (vehicleId: string, status: VehicleStatus) => void;
  addSite: (input: {
    operatorId: string;
    name: string;
    address: string;
    city?: string;
    area?: string;
    supportsFrontDesk: boolean;
    supportsSelfService: boolean;
  }) => OperatorSite | null;
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
  }) => Vehicle;
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
  /** Demo: fake a customer booking request waiting for Accept. */
  simulateRiderRequest: () => Booking | null;
  resetDemo: () => void;
}

const emptyUser: AppUser = { role: null, name: "" };

function notifyConfirm(booking: Booking): AppNotification {
  return {
    id: `n-confirm-${booking.id}-${Date.now()}`,
    title: "Booking confirmed",
    body: `${booking.code} is ready for pickup. Head to the station when you're ready.`,
    read: false,
    createdAt: new Date().toISOString(),
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
      toast: null,
      darkMode: false,
      lastSeenVersion: null,
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

      pushNotification: (title, body) =>
        set((s) => ({
          notifications: [
            {
              id: `n-${Date.now()}`,
              title,
              body,
              read: false,
              createdAt: new Date().toISOString(),
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
        });
        return null;
      },

      logout: () => set({ user: emptyUser }),

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
            pickAssignableUnit(get().vehicles, input.modelId) ?? undefined;
        }

        if (!vehicle || vehicle.status !== "available" || !modelId) return null;

        const keysAccess: KeysAccess =
          vehicle.rentalMode === "both"
            ? "both"
            : vehicle.rentalMode === "key_handover"
              ? "physical"
              : "digital";

        // Physical or dual-key bikes always need shop key handover.
        const needsShopKey =
          keysAccess === "physical" || keysAccess === "both";
        const pickupType: PickupType = needsShopKey
          ? "front_desk"
          : input.pickupType;

        const needsConfirm =
          needsShopKey || pickupType === "front_desk";

        // App motor control when digital or both; physical-only otherwise.
        const rentalMode =
          keysAccess === "physical" ? "key_handover" : "digital";

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
          riderName: user.name || "Guest",
          status: needsConfirm ? "pending" : "confirmed",
          pickupType,
          rentalMode,
          keysAccess,
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
          startsAt: null,
          endsAt: null,
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

      confirmBooking: (bookingId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.id === bookingId);
          if (!booking || booking.status !== "pending") return s;
          return {
            bookings: s.bookings.map((b) =>
              b.id === bookingId
                ? { ...b, status: nextStatusAfterConfirm(b) }
                : b,
            ),
            notifications: [notifyConfirm(booking), ...s.notifications],
            toast: "Booking confirmed — rider notified",
          };
        }),

      declineBooking: (bookingId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.id === bookingId);
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
                  },
                  ...s.notifications,
                ]
              : s.notifications,
          };
        }),

      confirmBulk: (ids) =>
        set((s) => {
          const confirmed = s.bookings.filter(
            (b) => ids.includes(b.id) && b.status === "pending",
          );
          const notes = confirmed.map(notifyConfirm);
          return {
            bookings: s.bookings.map((b) =>
              ids.includes(b.id) && b.status === "pending"
                ? { ...b, status: nextStatusAfterConfirm(b) }
                : b,
            ),
            notifications: [...notes, ...s.notifications],
            toast:
              confirmed.length > 0
                ? `Confirmed ${confirmed.length} — riders notified`
                : null,
          };
        }),

      payBooking: (bookingId) => {
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  paymentStatus: "paid",
                  status:
                    b.status === "pending" ? "pending" : "awaiting_pickup",
                }
              : b,
          ),
        }));
        // Demo: simulate operator accepting the request after a short delay.
        const after = get().bookings.find((b) => b.id === bookingId);
        if (after?.status === "pending") {
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

      extendRide: (bookingId, extraMinutes) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.id === bookingId);
          if (!booking?.endsAt) return s;
          const endsAt = new Date(
            new Date(booking.endsAt).getTime() + extraMinutes * 60_000,
          );
          const perMin =
            booking.rentalPriceIdr / Math.max(1, booking.durationMinutes);
          const extraPrice = Math.round(perMin * extraMinutes);
          const addLabel =
            extraMinutes < 60
              ? `+${extraMinutes}m`
              : extraMinutes % (60 * 24 * 7) === 0
                ? `+${extraMinutes / (60 * 24 * 7)}w`
                : extraMinutes % (60 * 24) === 0
                  ? `+${extraMinutes / (60 * 24)}d`
                  : `+${extraMinutes / 60}h`;
          return {
            bookings: s.bookings.map((b) =>
              b.id === bookingId
                ? {
                    ...b,
                    status: b.status === "overdue" ? "active" : b.status,
                    endsAt: endsAt.toISOString(),
                    durationMinutes: b.durationMinutes + extraMinutes,
                    durationLabel: `${b.durationLabel} ${addLabel}`,
                    rentalPriceIdr: b.rentalPriceIdr + extraPrice,
                  }
                : b,
            ),
            toast: `Extended ${addLabel}`,
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
                body: `${booking.code} time expired. Return now or extend to avoid overtime.`,
                read: false,
                createdAt: new Date().toISOString(),
              },
              ...s.notifications,
            ],
          };
        }),

      completeReturn: (bookingId) => {
        const booking = get().bookings.find((b) => b.id === bookingId);
        if (!booking) return;
        const needsPhys =
          booking.keysAccess === "physical" || booking.keysAccess === "both";
        // Operator finish = key must be back. Auto-mark collected when finishing.
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  status: "completed",
                  motorOn: false,
                  paymentStatus: "refunded",
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
          toast: needsPhys
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
        set((s) => ({
          vehicles: s.vehicles.map((v) =>
            v.id === vehicleId ? { ...v, status } : v,
          ),
        })),

      addSite: (input) => {
        if (!input.name.trim()) return null;
        const op = get().operators.find((o) => o.id === input.operatorId);
        const site: OperatorSite = {
          id: `site-${Date.now()}`,
          operatorId: input.operatorId,
          city: input.city?.trim() || op?.city || "Jakarta",
          area: input.area?.trim() || input.name.trim(),
          name: input.name.trim(),
          address: input.address.trim() || input.name.trim(),
          lat: op?.lat ?? 0,
          lng: op?.lng ?? 0,
          hours: "07:00 - 20:00",
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

      removeSite: (siteId) => {
        const units = get().vehicles.filter((v) => v.siteId === siteId);
        if (units.some((v) => v.status === "rented" || v.status === "reserved")) {
          return "Move or finish active bookings before removing this site";
        }
        set((s) => ({
          sites: s.sites.filter((x) => x.id !== siteId),
          vehicles: s.vehicles.filter((v) => v.siteId !== siteId),
        }));
        return null;
      },

      addVehicle: (input) => {
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
        };
        set((s) => ({
          models,
          vehicles: [vehicle, ...s.vehicles],
        }));
        return vehicle;
      },

      adjustFleetStock: ({ modelId, siteId, delta }) => {
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
        set((s) => ({
          vehicles: s.vehicles.filter((v) => v.id !== vehicleId),
        })),

      moveVehicleSite: (vehicleId, siteId) =>
        set((s) => {
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
        set((s) => ({
          pricing: { ...s.pricing, [operatorId]: tiers },
        })),

      setWeekendSurcharge: (operatorId, on) =>
        set((s) => ({
          weekendSurcharge: { ...s.weekendSurcharge, [operatorId]: on },
        })),

      markNotificationsRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),

      simulateRiderRequest: () => {
        const opId = get().user.operatorId;
        if (!opId) return null;
        const vehicle =
          get().vehicles.find(
            (v) => v.operatorId === opId && v.status === "available",
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
        const names = ["Rina (kost)", "Andi Student", "Maya UI", "Joko UNJ", "Salsa"];
        const riderName = names[Math.floor(Math.random() * names.length)];
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
          riderName,
          status: "pending",
          pickupType: needsShop ? "front_desk" : "self_service",
          rentalMode: keysAccess === "physical" ? "key_handover" : "digital",
          keysAccess,
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
          startsAt: null,
          endsAt: null,
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
              body: `${riderName} wants ${vehicle.name} (${vehicle.code}). Tap Accept.`,
              read: false,
              createdAt: new Date().toISOString(),
            },
            ...s.notifications,
          ],
          toast: `${riderName} asked to rent — Accept or Reject`,
        }));
        return booking;
      },

      resetDemo: () =>
        set({
          sites: seedSites,
          models: seedModels,
          vehicles: seedVehicles,
          operators: seedOperators,
          bookings: seedMockBookings,
          pricing: seedPricing,
          favorites: ["m-margo-galaxy", "op-margonda"],
          notifications: seedNotifications,
          reviews: seedReviews,
          chargingAddons: seedChargingAddons,
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
                    keysAccess,
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
                      keysAccess,
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
          const needsJakartaSpread =
            !state.sites.some((s) => s.id === "site-jakarta-tebet") ||
            state.sites.some((s) =>
              ["site-margonda-b2", "site-casan-margonda", "site-margonda-bandung"].includes(
                s.id,
              ),
            );
          if (needsJakartaSpread) {
            state.sites = seedSites;
            state.vehicles = seedVehicles;
            state.operators = seedOperators;
          }
          state.setHydrated(true);
        }
      },
      partialize: (s) => ({
        user: s.user,
        sites: s.sites,
        models: s.models,
        vehicles: s.vehicles,
        operators: s.operators,
        bookings: s.bookings,
        favorites: s.favorites,
        notifications: s.notifications,
        reviews: s.reviews,
        chargingAddons: s.chargingAddons,
        darkMode: s.darkMode,
        pricing: s.pricing,
        weekendSurcharge: s.weekendSurcharge,
        lastSeenVersion: s.lastSeenVersion,
      }),
    },
  ),
);

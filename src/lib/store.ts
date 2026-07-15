"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  operators as seedOperators,
  vehicles as seedVehicles,
  staff as seedStaff,
  operatorPricing as seedPricing,
  seedNotifications,
  DEPOSIT_IDR,
} from "./seed";
import type {
  AppNotification,
  AppUser,
  Booking,
  Operator,
  PaymentMethod,
  PickupType,
  PricingTier,
  StaffMember,
  Vehicle,
  VehicleStatus,
} from "./types";
import { bookingCode } from "./format";

interface AppState {
  hydrated: boolean;
  user: AppUser;
  operators: Operator[];
  vehicles: Vehicle[];
  staff: StaffMember[];
  pricing: Record<string, PricingTier[]>;
  bookings: Booking[];
  favorites: string[];
  notifications: AppNotification[];
  toast: string | null;
  darkMode: boolean;
  weekendSurcharge: Record<string, boolean>;
  setHydrated: (v: boolean) => void;
  setToast: (msg: string | null) => void;
  toggleDarkMode: () => void;
  loginRider: (name: string, phone?: string, isGuest?: boolean) => void;
  loginOperator: (username: string, password: string) => string | null;
  logout: () => void;
  toggleFavorite: (id: string) => void;
  createBooking: (input: {
    vehicleId: string;
    pickupType: PickupType;
    durationLabel: string;
    durationMinutes: number;
    rentalPriceIdr: number;
    paymentMethod: PaymentMethod;
  }) => Booking | null;
  confirmBooking: (bookingId: string) => void;
  declineBooking: (bookingId: string) => void;
  confirmBulk: (ids: string[]) => void;
  payBooking: (bookingId: string) => void;
  startRide: (bookingId: string) => void;
  toggleMotor: (bookingId: string) => void;
  completeReturn: (bookingId: string) => void;
  updateVehicleStatus: (vehicleId: string, status: VehicleStatus) => void;
  updatePricing: (operatorId: string, tiers: PricingTier[]) => void;
  setWeekendSurcharge: (operatorId: string, on: boolean) => void;
  markNotificationsRead: () => void;
  resetDemo: () => void;
}

const emptyUser: AppUser = { role: null, name: "" };

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      user: emptyUser,
      operators: seedOperators,
      vehicles: seedVehicles,
      staff: seedStaff,
      pricing: seedPricing,
      bookings: [],
      favorites: ["v-eco-cruiser", "op-bali-sunset"],
      notifications: seedNotifications,
      toast: null,
      darkMode: false,
      weekendSurcharge: {
        "op-bali-sunset": true,
        "op-beachwalk": true,
        "op-ubud": false,
      },

      setHydrated: (v) => set({ hydrated: v }),
      setToast: (msg) => set({ toast: msg }),
      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),

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
        const vehicle = get().vehicles.find((v) => v.id === input.vehicleId);
        const user = get().user;
        if (!vehicle || vehicle.status !== "available") return null;

        const needsConfirm =
          input.pickupType === "front_desk" ||
          vehicle.rentalMode === "key_handover";

        const rentalMode =
          vehicle.rentalMode === "key_handover"
            ? "key_handover"
            : vehicle.rentalMode === "digital"
              ? "digital"
              : input.pickupType === "front_desk"
                ? "key_handover"
                : "digital";

        const booking: Booking = {
          id: `bk-${Date.now()}`,
          code: bookingCode(),
          operatorId: vehicle.operatorId,
          vehicleId: vehicle.id,
          riderName: user.name || "Guest",
          status: needsConfirm ? "pending" : "confirmed",
          pickupType: input.pickupType,
          rentalMode,
          durationLabel: input.durationLabel,
          durationMinutes: input.durationMinutes,
          rentalPriceIdr: input.rentalPriceIdr,
          depositIdr: DEPOSIT_IDR,
          paymentMethod: input.paymentMethod,
          paymentStatus: "pending",
          startsAt: null,
          endsAt: null,
          motorOn: true,
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          bookings: [booking, ...s.bookings],
          vehicles: s.vehicles.map((v) =>
            v.id === vehicle.id
              ? { ...v, status: "reserved" as VehicleStatus }
              : v,
          ),
        }));
        return booking;
      },

      confirmBooking: (bookingId) =>
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === bookingId
              ? {
                  ...b,
                  status:
                    b.paymentStatus === "paid"
                      ? "awaiting_pickup"
                      : "confirmed",
                }
              : b,
          ),
        })),

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
          };
        }),

      confirmBulk: (ids) =>
        set((s) => ({
          bookings: s.bookings.map((b) =>
            ids.includes(b.id) && b.status === "pending"
              ? { ...b, status: "confirmed" }
              : b,
          ),
        })),

      payBooking: (bookingId) =>
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
        })),

      startRide: (bookingId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.id === bookingId);
          if (!booking) return s;
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

      toggleMotor: (bookingId) =>
        set((s) => ({
          bookings: s.bookings.map((b) =>
            b.id === bookingId ? { ...b, motorOn: !b.motorOn } : b,
          ),
        })),

      completeReturn: (bookingId) =>
        set((s) => {
          const booking = s.bookings.find((b) => b.id === bookingId);
          return {
            bookings: s.bookings.map((b) =>
              b.id === bookingId
                ? {
                    ...b,
                    status: "completed",
                    motorOn: false,
                    paymentStatus: "refunded",
                  }
                : b,
            ),
            vehicles: booking
              ? s.vehicles.map((v) =>
                  v.id === booking.vehicleId
                    ? { ...v, status: "available" as VehicleStatus }
                    : v,
                )
              : s.vehicles,
          };
        }),

      updateVehicleStatus: (vehicleId, status) =>
        set((s) => ({
          vehicles: s.vehicles.map((v) =>
            v.id === vehicleId ? { ...v, status } : v,
          ),
        })),

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

      resetDemo: () =>
        set({
          vehicles: seedVehicles,
          bookings: [],
          pricing: seedPricing,
          favorites: ["v-eco-cruiser", "op-bali-sunset"],
          notifications: seedNotifications,
        }),
    }),
    {
      name: "casan-rent-v1",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (s) => ({
        user: s.user,
        vehicles: s.vehicles,
        bookings: s.bookings,
        favorites: s.favorites,
        notifications: s.notifications,
        darkMode: s.darkMode,
        pricing: s.pricing,
        weekendSurcharge: s.weekendSurcharge,
      }),
    },
  ),
);

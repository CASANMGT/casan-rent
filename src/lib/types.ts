export type VehicleType = "bicycle" | "ebike" | "emoped";
export type VehicleStatus =
  | "available"
  | "reserved"
  | "rented"
  | "maintenance"
  | "charging";
export type RentalMode = "digital" | "key_handover" | "both";
export type PickupType = "front_desk" | "self_service";
export type BookingStatus =
  | "pending"
  | "confirmed"
  | "awaiting_pickup"
  | "active"
  | "completed"
  | "cancelled"
  | "overdue";
export type PaymentMethod =
  | "qris"
  | "dana"
  | "ovo"
  | "gopay"
  | "shopeepay"
  | "card"
  | "pay_at_operator";
export type StaffRole =
  | "admin"
  | "booking_manager"
  | "fleet_attendant"
  | "viewer";

export interface Operator {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  hours: string;
  phone: string;
  email: string;
  supportsFrontDesk: boolean;
  supportsSelfService: boolean;
  platformFeePct: number;
  emoji: string;
}

export interface Vehicle {
  id: string;
  operatorId: string;
  code: string;
  name: string;
  vehicleType: VehicleType;
  status: VehicleStatus;
  rentalMode: RentalMode;
  allowFrontDesk: boolean;
  allowSelfService: boolean;
  batteryPct: number | null;
  motorWatts: number | null;
  rangeKm: number | null;
  maxSpeedKmh: number | null;
  weightKg: number | null;
  pricePerHour: number;
  lat: number;
  lng: number;
  emoji: string;
  requiresSimAck: boolean;
}

export interface PricingTier {
  label: string;
  durationMinutes: number;
  priceIdr: number;
}

export interface StaffMember {
  id: string;
  operatorId: string;
  name: string;
  role: StaffRole;
  username: string;
  password: string;
  online: boolean;
  locationLabel: string;
}

export interface Booking {
  id: string;
  code: string;
  operatorId: string;
  vehicleId: string;
  riderName: string;
  status: BookingStatus;
  pickupType: PickupType;
  rentalMode: "digital" | "key_handover";
  durationLabel: string;
  durationMinutes: number;
  rentalPriceIdr: number;
  depositIdr: number;
  paymentMethod: PaymentMethod;
  paymentStatus: "pending" | "paid" | "refunded";
  startsAt: string | null;
  endsAt: string | null;
  motorOn: boolean;
  createdAt: string;
}

export interface AppUser {
  role: "rider" | "operator" | null;
  name: string;
  phone?: string;
  operatorId?: string;
  staffId?: string;
  isGuest?: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

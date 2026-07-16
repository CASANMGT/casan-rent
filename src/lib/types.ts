export type VehicleType = "bicycle" | "ebike" | "emoped";
export type VehicleStatus =
  | "available"
  | "reserved"
  | "rented"
  | "maintenance"
  | "charging"
  | "disabled";
export type RentalMode = "digital" | "key_handover" | "both";
/** What the rider gets for this booking. */
export type KeysAccess = "digital" | "physical" | "both";
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

export type BatteryVoltageV = 48 | 60 | 72;
export type ChargingAddonKind = "casan_voucher" | "adapter";

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
  /** Human label for shop / counter pickup */
  shopPickupLabel: string;
  /** Human label for unmanned / designated self-collect */
  selfCollectLabel: string;
  selfCollectLat: number;
  selfCollectLng: number;
  platformFeePct: number;
  emoji: string;
  coverImage: string;
  /** Kost street / lobby / Casan hub photos */
  locationImages: string[];
  /** Bundled OSM static map screenshot */
  mapImage: string;
}

/** Physical station / pickup location for an operator (multi-site). */
export interface OperatorSite {
  id: string;
  operatorId: string;
  /** City — sites can be in different cities. */
  city: string;
  /** District / neighbourhood within the city (e.g. Tebet, Kemang). */
  area: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** Combined display, e.g. "06:00 - 22:00". */
  hours: string;
  /** Opening time HH:MM */
  opensAt?: string;
  /** Closing time HH:MM */
  closesAt?: string;
  /** Location-specific WhatsApp / phone; falls back to operator phone. */
  whatsapp?: string;
  /** Bundled OSM static map screenshot for this site. */
  mapImage?: string;
  /** Short instructions / description shown to staff and riders. */
  storeInfo?: string;
  supportsFrontDesk: boolean;
  supportsSelfService: boolean;
  shopPickupLabel: string;
  selfCollectLabel: string;
}

/** Catalog listing — riders book a model; a unit is auto-assigned. */
export interface VehicleModel {
  id: string;
  operatorId: string;
  name: string;
  vehicleType: VehicleType;
  description: string;
  images: string[];
  pricePerHour: number;
  rentalMode: RentalMode;
  allowFrontDesk: boolean;
  allowSelfService: boolean;
  motorWatts: number | null;
  rangeKm: number | null;
  maxSpeedKmh: number | null;
  weightKg: number | null;
  /** Pack voltage — null for pedal bikes (no battery). */
  batteryVoltageV: BatteryVoltageV | null;
  /** Battery capacity in ampere-hours — null if no pack. */
  batteryAh: number | null;
  /** Default included charger rating — null if no pack. */
  chargerAmpsDefault: number | null;
  requiresSimAck: boolean;
  emoji: string;
  includes: string[];
}

/** Physical fleet unit under a model. */
export interface Vehicle {
  id: string;
  modelId: string;
  operatorId: string;
  siteId: string;
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
  batteryVoltageV: BatteryVoltageV | null;
  batteryAh: number | null;
  chargerAmpsDefault: number | null;
  pricePerHour: number;
  lat: number;
  lng: number;
  emoji: string;
  requiresSimAck: boolean;
  /** Display color name, e.g. Black / Teal. */
  color: string;
  /** Hex for swatch UI. */
  colorHex: string;
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

/** Selectable charging product at book time. */
export interface ChargingAddon {
  id: string;
  kind: ChargingAddonKind;
  label: string;
  description: string;
  priceIdr: number;
  voucherSlots?: number;
  amps?: number;
  /** Adapter voltage match; null = voucher (any model). */
  forVoltageV?: BatteryVoltageV | null;
}

/** Snapshot of add-on on a booking. */
export interface BookingAddon {
  id: string;
  kind: ChargingAddonKind;
  label: string;
  amps?: number;
  priceIdr: number;
  voucherCode?: string;
}

export interface BookingExtension {
  id: string;
  requestedAt: string;
  extraMinutes: number;
  priceIdr: number;
  previousEndsAt: string;
  newEndsAt: string;
}

export interface Booking {
  id: string;
  code: string;
  operatorId: string;
  vehicleId: string;
  modelId: string;
  /** Fleet site of the assigned unit. */
  siteId: string;
  riderName: string;
  /** Rider contact phone (WhatsApp / call). */
  riderPhone?: string;
  status: BookingStatus;
  pickupType: PickupType;
  /** Ride control: digital = app motor; key_handover = physical only. */
  rentalMode: "digital" | "key_handover";
  /** App key, physical shop key, or both (shop pickup + app). */
  keysAccess: KeysAccess;
  /** Operator gave physical key to rider (shop handover). */
  physicalKeyGiven: boolean;
  /** Operator collected physical key on return. */
  physicalKeyReturned: boolean;
  durationLabel: string;
  durationMinutes: number;
  rentalPriceIdr: number;
  addonsPriceIdr: number;
  addons: BookingAddon[];
  depositIdr: number;
  paymentMethod: PaymentMethod;
  paymentStatus: "pending" | "paid" | "refunded";
  /** Rider's planned pickup appointment. */
  appointmentAt?: string | null;
  startsAt: string | null;
  endsAt: string | null;
  completedAt?: string | null;
  /** Paid extension requests, newest last. */
  extensions?: BookingExtension[];
  motorOn: boolean;
  createdAt: string;
  rating: number | null;
  reviewNote: string | null;
}

export interface OperatorReview {
  id: string;
  operatorId: string;
  riderName: string;
  rating: number;
  note: string;
  modelName: string;
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
  /** Deep link when rider taps the notification. */
  href?: string;
  bookingId?: string;
}

-- Casan Rent initial schema (Supabase / Postgres)
create extension if not exists "pgcrypto";

create type vehicle_type as enum ('bicycle', 'ebike', 'emoped');
create type vehicle_status as enum ('available', 'reserved', 'rented', 'maintenance', 'charging');
create type rental_mode as enum ('digital', 'key_handover', 'both');
create type pickup_type as enum ('front_desk', 'self_service');
create type booking_status as enum (
  'pending', 'confirmed', 'awaiting_pickup', 'active', 'completed', 'cancelled', 'overdue'
);
create type payment_status as enum ('pending', 'paid', 'refunded', 'failed');
create type payment_method as enum (
  'qris', 'dana', 'ovo', 'gopay', 'shopeepay', 'card', 'pay_at_operator'
);
create type staff_role as enum ('admin', 'booking_manager', 'fleet_attendant', 'viewer');

create table operators (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  address text not null,
  city text not null default 'Bali',
  lat double precision not null,
  lng double precision not null,
  hours text not null default '07:00 - 20:00',
  phone text,
  email text,
  supports_front_desk boolean not null default true,
  supports_self_service boolean not null default true,
  platform_fee_pct numeric(5,2) not null default 20,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  display_name text not null,
  phone text,
  role text not null default 'rider' check (role in ('rider', 'operator_staff')),
  created_at timestamptz not null default now()
);

create table staff_memberships (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role staff_role not null default 'viewer',
  username text unique,
  password_hash text,
  online boolean not null default false,
  unique (operator_id, profile_id)
);

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id) on delete cascade,
  code text not null,
  name text not null,
  vehicle_type vehicle_type not null,
  status vehicle_status not null default 'available',
  rental_mode rental_mode not null default 'both',
  allow_front_desk boolean not null default true,
  allow_self_service boolean not null default true,
  battery_pct int,
  motor_watts int,
  range_km int,
  max_speed_kmh int,
  weight_kg numeric(6,1),
  price_per_hour int not null,
  lat double precision,
  lng double precision,
  image_emoji text default '🚲',
  requires_sim_ack boolean not null default false,
  unique (operator_id, code)
);

create table pricing_rules (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references operators(id) on delete cascade,
  label text not null,
  duration_minutes int not null,
  price_idr int not null,
  weekend_surcharge_pct numeric(5,2) default 15,
  holiday_surcharge_pct numeric(5,2) default 25,
  active boolean not null default true
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  operator_id uuid not null references operators(id),
  vehicle_id uuid not null references vehicles(id),
  rider_id uuid references profiles(id),
  rider_name text not null,
  status booking_status not null default 'pending',
  pickup_type pickup_type not null,
  rental_mode rental_mode not null,
  duration_label text not null,
  duration_minutes int not null,
  rental_price_idr int not null,
  deposit_idr int not null default 200000,
  starts_at timestamptz,
  ends_at timestamptz,
  motor_on boolean not null default true,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  method payment_method not null,
  amount_idr int not null,
  status payment_status not null default 'pending',
  mock boolean not null default true,
  created_at timestamptz not null default now()
);

create table favorites (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references profiles(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete cascade,
  operator_id uuid references operators(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id),
  vehicle_id uuid not null references vehicles(id),
  rider_name text not null,
  stars int not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table operators enable row level security;
alter table vehicles enable row level security;
alter table bookings enable row level security;
alter table payments enable row level security;

-- Demo-open policies (tighten in production)
create policy "public read operators" on operators for select using (true);
create policy "public read vehicles" on vehicles for select using (true);
create policy "public read bookings" on bookings for select using (true);

-- Seed note: insert Bali Sunset / BeachWalk / Ubud from app seed or run seed.sql separately.

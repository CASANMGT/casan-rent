-- Optional seed for Supabase (after 001_initial.sql)
-- Prefer app demo seed when running without Supabase.

insert into operators (id, slug, name, address, city, lat, lng, hours, phone, email, supports_front_desk, supports_self_service, platform_fee_pct)
values
  ('11111111-1111-1111-1111-111111111111', 'bali-sunset', 'Bali Sunset Hotel', 'Jl. Pantai Kuta No. 42, Kuta', 'Bali', -8.7177, 115.1708, '07:00 - 20:00', '+62 812-3456-7890', 'rental@balisunset.com', true, true, 20),
  ('22222222-2222-2222-2222-222222222222', 'beachwalk', 'BeachWalk Rental Hub', 'Jl. Pantai Berawa, Canggu', 'Bali', -8.6595, 115.1303, '06:30 - 21:00', '+62 812-2222-3333', 'hello@beachwalk.id', false, true, 18),
  ('33333333-3333-3333-3333-333333333333', 'ubud-center', 'Ubud Tourism Center', 'Jl. Raya Ubud No. 18', 'Bali', -8.5069, 115.2625, '08:00 - 18:00', '+62 812-8888-1111', 'desk@ubudcenter.id', true, false, 22);

-- Default plans (idempotent)
INSERT INTO public.plans (id, name, max_outlets, max_products, max_users, price_monthly, price_yearly, features)
VALUES
  (gen_random_uuid(), 'Free',       1,  50,   3,  0,        0,         '{"reports":"basic"}'),
  (gen_random_uuid(), 'Pro',        3,  1000, 15, 299000,   2990000,   '{"reports":"advanced","export":true}'),
  (gen_random_uuid(), 'Enterprise', 99, 100000,100,999000,  9990000,   '{"reports":"advanced","export":true,"api":true}')
ON CONFLICT DO NOTHING;

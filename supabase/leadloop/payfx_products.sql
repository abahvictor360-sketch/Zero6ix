-- Run on the leadloop Supabase project (holds payfx_orders, shared with payfx.vercel.app).
-- Products sold on webpurchase.app/payfx. Prices in Naira.
create table if not exists public.payfx_products (
  id text primary key check (id ~ '^[a-z0-9-]{2,60}$'),
  name text not null,
  subtitle text,
  period text not null,
  purpose text not null,
  amount_ngn numeric(14, 2) not null check (amount_ngn > 0),
  logo text not null check (logo in ('supabase','claude','anthropic','googlemaps','apple','hostinger','deploy','backup','monitor','test')),
  is_test boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payfx_products_sort_idx on public.payfx_products (sort_order);

alter table public.payfx_products enable row level security;
-- Active products are public (they are listed on the page); only the owner can change them.
drop policy if exists payfx_products_public_read on public.payfx_products;
create policy payfx_products_public_read on public.payfx_products
  for select to anon, authenticated using (active);
revoke insert, update, delete on public.payfx_products from anon, authenticated;

insert into public.payfx_products (id, name, subtitle, period, purpose, amount_ngn, logo, is_test, sort_order) values
  ('anthropic-api-claude', 'Anthropic API', 'Claude', '12 months', 'AI that verifies clock-in selfies and shelf photos, and answers staff questions through Ask Xtend.', 477750, 'claude', false, 10),
  ('google-maps-api', 'Google Maps API', null, '12 months', 'Location service that confirms which shop staff clock in from and looks up stores during bulk uploads.', 641550, 'googlemaps', false, 20),
  ('apple-developer', 'Apple Developer account', null, '12 months', 'Yearly membership that lets Xtend be listed on the App Store for iPhone users.', 155000, 'apple', false, 30),
  ('anthropic-api-x-metrics', 'Anthropic API', 'X Metrics', '12 months', 'AI that reads stock and expiry photos and writes the monthly X Metrics performance report.', 204750, 'anthropic', false, 50),
  ('supabase-addon', 'Supabase add-on', null, '12 months', 'Extra database capacity for X Metrics records: supply, stock, sales, expiry dates and photos.', 163800, 'supabase', false, 60),
  ('vps-upgrade', 'VPS upgrade', 'Hostinger', '24 months', 'More memory and disk space on the server to handle X Metrics reports and data exports.', 163800, 'hostinger', false, 70),
  ('daily-backup', 'Daily online backup', null, '12 months', 'Encrypted daily copy of all company data, kept off the main server for quick recovery.', 123800, 'backup', false, 80),
  ('monitoring', 'Error and uptime monitoring', null, '6 months', '24/7 checks on every app, with instant alerts to the admin when something fails or goes down.', 110150, 'monitor', false, 90)
on conflict (id) do update set
  name = excluded.name, subtitle = excluded.subtitle, period = excluded.period, purpose = excluded.purpose,
  amount_ngn = excluded.amount_ngn, logo = excluded.logo, is_test = excluded.is_test, sort_order = excluded.sort_order,
  active = true, updated_at = now();

-- Test items are not offered.
delete from public.payfx_products where is_test or id = 'website-deployment';

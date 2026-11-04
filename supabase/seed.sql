-- =============================================================================
-- Web Purchase: seed data (local development / staging only)
--
-- Demo accounts (password for all: WebPurchase#2026):
--   admin@webpurchase.ng   super_admin  (you will be asked to set up 2FA)
--   ops@webpurchase.ng     operations
--   support@webpurchase.ng support
--   ada@example.com        client (individual)
--   tunde@example.com      client (organisation owner: Brightpath Academy)
-- =============================================================================

-- Settings -------------------------------------------------------------------
insert into public.fee_settings (id, percentage_fee, flat_fee_ngn, minimum_fee_ngn, kyc_threshold_ngn, quote_validity_hours)
values (1, 5, 1000, 2500, 500000, 24)
on conflict (id) do update set
  percentage_fee = excluded.percentage_fee, flat_fee_ngn = excluded.flat_fee_ngn,
  minimum_fee_ngn = excluded.minimum_fee_ngn, kyc_threshold_ngn = excluded.kyc_threshold_ngn,
  quote_validity_hours = excluded.quote_validity_hours;

insert into public.exchange_rates (currency, name, symbol, buy_rate, sell_rate, source, markup_percent, api_rate) values
  -- Approx. mid-market early Nov 2026; source 'api' so the rates cron refreshes them.
  ('USD', 'US Dollar',          '$',   1345.0000, 1345.0000, 'api', 0, 1345.0000),
  ('GBP', 'British Pound',      '£',   1772.0000, 1772.0000, 'api', 0, 1772.0000),
  ('EUR', 'Euro',               '€',   1533.0000, 1533.0000, 'api', 0, 1533.0000),
  ('CAD', 'Canadian Dollar',    'C$',   976.0000,  976.0000, 'api', 0,  976.0000),
  ('AUD', 'Australian Dollar',  'A$',   880.0000,  880.0000, 'api', 0,  880.0000),
  ('AED', 'UAE Dirham',         'AED',  366.0000,  366.0000, 'api', 0,  366.0000),
  ('CNY', 'Chinese Yuan',       '¥',    187.0000,  187.0000, 'api', 0,  187.0000)
on conflict (currency) do nothing;

insert into public.shipping_rates (origin_region, label, rate_per_kg_usd, min_charge_usd, delivery_days_min, delivery_days_max, sort_order) values
  ('US', 'United States → Nigeria', 12.50, 25, 7, 14, 1),
  ('UK', 'United Kingdom → Nigeria', 9.50, 20, 5, 10, 2),
  ('CA', 'Canada → Nigeria', 14.00, 30, 10, 18, 3),
  ('EU', 'Europe (DE/FR/NL) → Nigeria', 11.00, 25, 7, 14, 4),
  ('CN', 'China → Nigeria', 8.00, 15, 14, 28, 5),
  ('AE', 'UAE (Dubai) → Nigeria', 7.50, 15, 5, 10, 6)
on conflict (origin_region) do nothing;

insert into public.prohibited_keywords (keyword, category, severity) values
  ('gun', 'weapons', 'block'), ('firearm', 'weapons', 'block'), ('ammunition', 'weapons', 'block'),
  ('rifle', 'weapons', 'block'), ('pistol', 'weapons', 'block'), ('taser', 'weapons', 'flag'),
  ('pepper spray', 'weapons', 'flag'), ('knife', 'weapons', 'flag'),
  ('cocaine', 'drugs', 'block'), ('heroin', 'drugs', 'block'), ('cannabis', 'drugs', 'block'),
  ('marijuana', 'drugs', 'block'), ('weed', 'drugs', 'flag'), ('tramadol', 'drugs', 'block'),
  ('codeine', 'drugs', 'block'), ('vape', 'drugs', 'flag'), ('steroids', 'drugs', 'flag'),
  ('replica', 'counterfeit', 'flag'), ('counterfeit', 'counterfeit', 'block'), ('fake id', 'counterfeit', 'block'),
  ('casino', 'gambling', 'block'), ('betting', 'gambling', 'block'), ('poker', 'gambling', 'flag'),
  ('bet9ja', 'gambling', 'block'), ('onlyfans', 'adult', 'block'), ('porn', 'adult', 'block'), ('escort', 'adult', 'block'),
  ('explosive', 'hazardous', 'block'), ('fireworks', 'hazardous', 'block'), ('lithium battery', 'hazardous', 'flag'),
  ('drone', 'restricted', 'flag'), ('crypto', 'financial', 'flag'), ('gift card', 'financial', 'flag'),
  ('bitcoin', 'financial', 'flag'), ('hacking', 'illegal', 'block'), ('stolen', 'illegal', 'block'),
  ('cracked', 'illegal', 'flag'), ('frozen poultry', 'customs', 'block'), ('used clothing', 'customs', 'flag')
on conflict do nothing;

-- Demo users -------------------------------------------------------------------
do $$
declare
  v_pw text := crypt('WebPurchase#2026', gen_salt('bf'));
  rec record;
begin
  for rec in
    select * from (values
      ('00000000-0000-4000-a000-000000000001'::uuid, 'admin@webpurchase.ng',   '+2348000000001', 'Amaka Obi (Admin)',   'individual'),
      ('00000000-0000-4000-a000-000000000002'::uuid, 'ops@webpurchase.ng',     '+2348000000002', 'Ifeanyi Okafor (Ops)', 'individual'),
      ('00000000-0000-4000-a000-000000000003'::uuid, 'support@webpurchase.ng', '+2348000000003', 'Zainab Bello (Support)', 'individual'),
      ('00000000-0000-4000-a000-000000000010'::uuid, 'ada@example.com',        '+2348031234567', 'Ada Nwosu',            'individual'),
      ('00000000-0000-4000-a000-000000000011'::uuid, 'tunde@example.com',      '+2348057654321', 'Tunde Adebayo',        'organisation')
    ) as t(id, email, phone, full_name, account_type)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, phone, encrypted_password,
      email_confirmed_at, phone_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', rec.id, 'authenticated', 'authenticated', rec.email,
      replace(rec.phone, '+', ''), v_pw, now(), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', rec.full_name, 'account_type', rec.account_type),
      now(), now(), '', '', '', ''
    ) on conflict (id) do nothing;

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), rec.id, rec.id::text,
            jsonb_build_object('sub', rec.id::text, 'email', rec.email, 'email_verified', true),
            'email', now(), now(), now())
    on conflict do nothing;
  end loop;
end $$;

update public.users set role = 'super_admin' where id = '00000000-0000-4000-a000-000000000001';
update public.users set role = 'operations'  where id = '00000000-0000-4000-a000-000000000002';
update public.users set role = 'support'     where id = '00000000-0000-4000-a000-000000000003';
update public.users set kyc_status = 'verified', address_line = '12 Admiralty Way', city = 'Lekki', state = 'Lagos'
 where id = '00000000-0000-4000-a000-000000000010';

-- Organisation -----------------------------------------------------------------
insert into public.organisations (id, name, rc_number, email, phone, address, kyc_status, created_by)
values ('00000000-0000-4000-b000-000000000001', 'Brightpath Academy', 'RC1234567', 'accounts@brightpath.edu.ng',
        '+2348057654321', '5 Ring Road, Ibadan, Oyo', 'verified', '00000000-0000-4000-a000-000000000011')
on conflict (id) do nothing;

insert into public.organisation_members (organisation_id, user_id, role, status)
values ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000011', 'owner', 'active')
on conflict do nothing;

-- Sample requests ----------------------------------------------------------------
insert into public.requests (id, reference, user_id, organisation_id, type, status, source, title, service_name, website_url,
                             account_email, amount, currency, deadline, notes, legal_confirmed, legal_confirmed_at, created_at)
values
  ('00000000-0000-4000-c000-000000000001', 'WP-100001', '00000000-0000-4000-a000-000000000010', null, 'service', 'submitted', 'web',
   'Canva Pro annual subscription', 'Canva Pro', 'https://www.canva.com/pro/', 'ada@example.com', 119.99, 'USD',
   current_date + 5, 'Annual plan please.', true, now(), now() - interval '2 hours'),
  ('00000000-0000-4000-c000-000000000002', 'WP-100002', '00000000-0000-4000-a000-000000000010', null, 'service', 'quote_sent', 'web',
   'IELTS Academic test fee', 'IELTS (British Council)', 'https://www.britishcouncil.org/exam/ielts', 'ada@example.com', 245.00, 'USD',
   current_date + 10, 'Test centre: Lagos, December.', true, now(), now() - interval '1 day'),
  ('00000000-0000-4000-c000-000000000003', 'WP-100003', '00000000-0000-4000-a000-000000000010', null, 'item', 'shipped', 'web',
   'Kindle Paperwhite + 2 books', null, null, null, 189.98, 'USD',
   null, 'Ship to my Lekki address.', true, now(), now() - interval '9 days'),
  ('00000000-0000-4000-c000-000000000004', 'WP-100004', '00000000-0000-4000-a000-000000000011', '00000000-0000-4000-b000-000000000001', 'service', 'completed', 'bulk',
   'Google Workspace (12 seats)', 'Google Workspace Business Starter', 'https://workspace.google.com', 'admin@brightpath.edu.ng', 86.40, 'USD',
   null, 'Monthly billing for staff accounts.', true, now(), now() - interval '20 days'),
  ('00000000-0000-4000-c000-000000000005', 'WP-100005', '00000000-0000-4000-a000-000000000011', '00000000-0000-4000-b000-000000000001', 'service', 'under_review', 'web',
   'WES evaluation fee', 'World Education Services', 'https://www.wes.org', 'tunde@example.com', 248.00, 'USD',
   current_date + 14, 'ICAP Course-by-course.', true, now(), now() - interval '5 hours'),
  ('00000000-0000-4000-c000-000000000006', 'WP-100006', '00000000-0000-4000-a000-000000000010', null, 'item', 'submitted', 'web',
   'Replica designer bag', null, null, null, 80.00, 'USD',
   null, 'Looking for a replica bag from AliExpress.', true, now(), now() - interval '30 minutes')
on conflict (id) do nothing;

update public.requests set delivery_address = '{"line":"12 Admiralty Way","city":"Lekki","state":"Lagos","phone":"+2348031234567"}', origin_region = 'US'
 where id = '00000000-0000-4000-c000-000000000003';
update public.requests set delivery_address = '{"line":"12 Admiralty Way","city":"Lekki","state":"Lagos","phone":"+2348031234567"}', origin_region = 'CN'
 where id = '00000000-0000-4000-c000-000000000006';

insert into public.request_items (request_id, product_url, name, quantity, variant, estimated_price, currency, weight_kg) values
  ('00000000-0000-4000-c000-000000000003', 'https://www.amazon.com/dp/B0CFPJYX7P', 'Kindle Paperwhite 16GB', 1, 'Black', 159.99, 'USD', 0.4),
  ('00000000-0000-4000-c000-000000000003', 'https://www.amazon.com/dp/0735211299', 'Atomic Habits (Paperback)', 2, null, 14.99, 'USD', 0.6),
  ('00000000-0000-4000-c000-000000000006', 'https://www.aliexpress.com/item/1005000000000.html', 'Designer-style tote', 1, 'Brown', 80.00, 'USD', 1.0);

-- Quotes & payments --------------------------------------------------------------
insert into public.quotes (id, request_id, foreign_amount, currency, exchange_rate, subtotal_ngn, service_fee_ngn, shipping_fee_ngn, total_ngn, status, payment_token, expires_at, created_by, created_at)
values
  ('00000000-0000-4000-d000-000000000002', '00000000-0000-4000-c000-000000000002', 245.00, 'USD', 1590, 389550.00, 20477.50, 0, 410027.50,
   'active', 'demo-ielts-token-7f3a9c2e5b1d4f60a8e7', now() + interval '20 hours', '00000000-0000-4000-a000-000000000002', now() - interval '4 hours'),
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-c000-000000000003', 189.98, 'USD', 1585, 301118.30, 16055.92, 51535.00, 368709.22,
   'paid', 'demo-kindle-token-1b2c3d4e5f60718293a4', now() - interval '7 days', '00000000-0000-4000-a000-000000000002', now() - interval '8 days'),
  ('00000000-0000-4000-d000-000000000004', '00000000-0000-4000-c000-000000000004', 86.40, 'USD', 1580, 136512.00, 7825.60, 0, 144337.60,
   'paid', 'demo-gws-token-a9b8c7d6e5f40312ab9c', now() - interval '18 days', '00000000-0000-4000-a000-000000000001', now() - interval '19 days')
on conflict (id) do nothing;

insert into public.payments (quote_id, request_id, user_id, organisation_id, provider, reference, provider_transaction_id, amount_ngn, amount_paid_ngn,
                             status, channel, invoice_number, receipt_number, paid_at, created_at)
values
  ('00000000-0000-4000-d000-000000000003', '00000000-0000-4000-c000-000000000003', '00000000-0000-4000-a000-000000000010', null,
   'paystack', 'WPP-SEED-0001', '3901234567', 368709.22, 368709.22, 'success', 'card', 'INV-2026-000901', 'RCT-2026-000901', now() - interval '8 days', now() - interval '8 days'),
  ('00000000-0000-4000-d000-000000000004', '00000000-0000-4000-c000-000000000004', '00000000-0000-4000-a000-000000000011', '00000000-0000-4000-b000-000000000001',
   'flutterwave', 'WPP-SEED-0002', '5501234', 144337.60, 144337.60, 'success', 'bank_transfer', 'INV-2026-000902', 'RCT-2026-000902', now() - interval '19 days', now() - interval '19 days')
on conflict do nothing;

insert into public.shipments (request_id, carrier, tracking_number, tracking_url, status, weight_kg, foreign_warehouse, estimated_delivery, shipped_at)
values ('00000000-0000-4000-c000-000000000003', 'DHL Express', '1234567890', 'https://www.dhl.com/ng-en/home/tracking.html?tracking-id=1234567890',
        'in_transit', 1.0, 'Web Purchase US Hub, Delaware', current_date + 4, now() - interval '2 days')
on conflict do nothing;

insert into public.request_events (request_id, status, title, note, created_at) values
  ('00000000-0000-4000-c000-000000000001', 'submitted', 'Request submitted', null, now() - interval '2 hours'),
  ('00000000-0000-4000-c000-000000000002', 'submitted', 'Request submitted', null, now() - interval '1 day'),
  ('00000000-0000-4000-c000-000000000002', 'under_review', 'Under review', 'Checking the test centre fee.', now() - interval '20 hours'),
  ('00000000-0000-4000-c000-000000000002', 'quote_sent', 'Quote sent', 'Quote valid for 24 hours.', now() - interval '4 hours'),
  ('00000000-0000-4000-c000-000000000003', 'submitted', 'Request submitted', null, now() - interval '9 days'),
  ('00000000-0000-4000-c000-000000000003', 'quote_sent', 'Quote sent', null, now() - interval '8 days 6 hours'),
  ('00000000-0000-4000-c000-000000000003', 'paid', 'Payment confirmed', 'NGN 368,709.22 via paystack', now() - interval '8 days'),
  ('00000000-0000-4000-c000-000000000003', 'processing', 'Order placed with vendor', 'Amazon order #113-0000000', now() - interval '7 days'),
  ('00000000-0000-4000-c000-000000000003', 'shipped', 'Shipped', 'DHL Express 1234567890', now() - interval '2 days'),
  ('00000000-0000-4000-c000-000000000004', 'submitted', 'Request submitted', null, now() - interval '20 days'),
  ('00000000-0000-4000-c000-000000000004', 'paid', 'Payment confirmed', null, now() - interval '19 days'),
  ('00000000-0000-4000-c000-000000000004', 'completed', 'Completed', 'Subscription active. Receipt uploaded.', now() - interval '18 days'),
  ('00000000-0000-4000-c000-000000000005', 'submitted', 'Request submitted', null, now() - interval '5 hours'),
  ('00000000-0000-4000-c000-000000000005', 'under_review', 'Under review', null, now() - interval '3 hours'),
  ('00000000-0000-4000-c000-000000000006', 'submitted', 'Request submitted', null, now() - interval '30 minutes');

insert into public.messages (request_id, sender_id, is_staff, body, created_at) values
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-a000-000000000010', false, 'Hi, please confirm the test date is 14 December.', now() - interval '6 hours'),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-a000-000000000002', true, 'Confirmed: 14 Dec, Lagos centre. Your quote is ready.', now() - interval '4 hours');

insert into public.contact_submissions (name, email, phone, subject, message) values
  ('Chidi Eze', 'chidi@example.com', '+2348099998888', 'Bulk Adobe licences', 'We need 15 Adobe Creative Cloud seats for our agency. Do you offer business pricing?'),
  ('Halima Musa', 'halima@example.com', null, 'University application fee', 'Can you pay a UK university application fee via UCAS?');

insert into public.whatsapp_conversations (id, wa_id, profile_name, user_id, state, handoff, last_inbound_at, last_message_at)
values ('00000000-0000-4000-e000-000000000001', '2348031234567', 'Ada', '00000000-0000-4000-a000-000000000010', 'menu', false, now() - interval '1 hour', now() - interval '1 hour')
on conflict do nothing;
insert into public.whatsapp_messages (conversation_id, direction, body, created_at) values
  ('00000000-0000-4000-e000-000000000001', 'inbound', 'Hi', now() - interval '61 minutes'),
  ('00000000-0000-4000-e000-000000000001', 'outbound', 'Hello Ada 👋 Welcome to Web Purchase…', now() - interval '61 minutes'),
  ('00000000-0000-4000-e000-000000000001', 'inbound', '2', now() - interval '60 minutes'),
  ('00000000-0000-4000-e000-000000000001', 'outbound', 'Please send your order ID (e.g. WP-100123).', now() - interval '60 minutes');

select setval('public.request_reference_seq', 100100);

-- =============================================================================
-- Web Purchase: core schema
-- =============================================================================
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('client', 'support', 'operations', 'super_admin');
create type public.account_type as enum ('individual', 'organisation');
create type public.kyc_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type public.request_type as enum ('service', 'item');
create type public.request_status as enum (
  'draft', 'submitted', 'under_review', 'quote_sent', 'paid', 'processing',
  'completed', 'shipped', 'delivered', 'rejected', 'refunded', 'cancelled'
);
create type public.request_source as enum ('web', 'whatsapp', 'bulk', 'admin');
create type public.quote_status as enum ('active', 'expired', 'superseded', 'paid', 'cancelled');
create type public.payment_provider as enum ('paystack', 'flutterwave', 'manual');
create type public.payment_status as enum ('pending', 'success', 'failed', 'refunded', 'abandoned');
create type public.org_member_role as enum ('owner', 'admin', 'member');
create type public.member_status as enum ('invited', 'active', 'removed');
create type public.kyc_doc_type as enum ('national_id', 'passport', 'drivers_license', 'voters_card', 'cac_certificate', 'other');
create type public.doc_review_status as enum ('pending', 'approved', 'rejected');
create type public.shipment_status as enum ('awaiting_purchase', 'purchased', 'at_warehouse', 'in_transit', 'customs', 'out_for_delivery', 'delivered', 'exception');
create type public.attachment_kind as enum ('receipt', 'screenshot', 'proof_of_payment', 'proof_of_delivery', 'license_key', 'invoice', 'client_upload', 'other');
create type public.rate_source as enum ('manual', 'api');
create type public.keyword_severity as enum ('flag', 'block');
create type public.wa_direction as enum ('inbound', 'outbound');

-- ---------------------------------------------------------------------------
-- Users (profile mirror of auth.users)
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  phone text,
  full_name text,
  account_type public.account_type not null default 'individual',
  role public.user_role not null default 'client',
  email_verified boolean not null default false,
  phone_verified boolean not null default false,
  kyc_status public.kyc_status not null default 'unverified',
  address_line text,
  city text,
  state text,
  country text not null default 'Nigeria',
  notify_email boolean not null default true,
  notify_whatsapp boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index users_email_idx on public.users (lower(email));
create index users_phone_idx on public.users (phone);
create index users_role_idx on public.users (role) where role <> 'client';

-- ---------------------------------------------------------------------------
-- Organisations
-- ---------------------------------------------------------------------------
create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  rc_number text,
  email text,
  phone text,
  address text,
  kyc_status public.kyc_status not null default 'unverified',
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organisation_members (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid references public.users (id) on delete cascade,
  invited_email text,
  role public.org_member_role not null default 'member',
  status public.member_status not null default 'invited',
  invited_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint org_member_identity check (user_id is not null or invited_email is not null)
);
create unique index org_members_unique_user on public.organisation_members (organisation_id, user_id) where user_id is not null;
create unique index org_members_unique_invite on public.organisation_members (organisation_id, lower(invited_email)) where user_id is null;
create index org_members_user_idx on public.organisation_members (user_id);

-- ---------------------------------------------------------------------------
-- Settings: exchange rates, fees, shipping
-- ---------------------------------------------------------------------------
create table public.exchange_rates (
  currency char(3) primary key check (currency ~ '^[A-Z]{3}$'),
  name text not null,
  symbol text not null default '',
  -- NGN per 1 unit of foreign currency
  buy_rate numeric(14, 4) not null check (buy_rate > 0),   -- what we pay to acquire the currency
  sell_rate numeric(14, 4) not null check (sell_rate > 0),  -- what we charge the client
  source public.rate_source not null default 'manual',
  markup_percent numeric(6, 3) not null default 3 check (markup_percent >= 0 and markup_percent < 100),
  api_rate numeric(14, 4),
  is_active boolean not null default true,
  updated_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.fee_settings (
  id smallint primary key default 1 check (id = 1),
  percentage_fee numeric(6, 3) not null default 5 check (percentage_fee >= 0),
  flat_fee_ngn numeric(14, 2) not null default 1000 check (flat_fee_ngn >= 0),
  minimum_fee_ngn numeric(14, 2) not null default 2500 check (minimum_fee_ngn >= 0),
  kyc_threshold_ngn numeric(14, 2) not null default 500000,
  quote_validity_hours integer not null default 24 check (quote_validity_hours between 1 and 168),
  business_hours jsonb not null default '{"timezone":"Africa/Lagos","days":[1,2,3,4,5,6],"start":"09:00","end":"18:00","saturday_end":"14:00"}',
  updated_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.shipping_rates (
  id uuid primary key default gen_random_uuid(),
  origin_region text not null,           -- e.g. 'US', 'UK', 'CN', 'EU', 'CA'
  label text not null,                   -- display label e.g. 'United States → Lagos'
  rate_per_kg_usd numeric(10, 2) not null check (rate_per_kg_usd >= 0),
  min_charge_usd numeric(10, 2) not null default 0 check (min_charge_usd >= 0),
  delivery_days_min integer not null default 7,
  delivery_days_max integer not null default 14,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (origin_region)
);

-- ---------------------------------------------------------------------------
-- Requests
-- ---------------------------------------------------------------------------
create sequence public.request_reference_seq start 100001;

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid references public.users (id) on delete set null,
  organisation_id uuid references public.organisations (id) on delete set null,
  batch_id uuid,
  type public.request_type not null,
  status public.request_status not null default 'submitted',
  source public.request_source not null default 'web',
  title text not null check (char_length(title) between 2 and 200),
  -- service fields
  service_name text,
  website_url text,
  account_email text,
  -- money (client's estimate / declared amount in foreign currency)
  amount numeric(14, 2) check (amount is null or amount >= 0),
  currency char(3) not null default 'USD',
  deadline date,
  notes text check (notes is null or char_length(notes) <= 4000),
  -- item fields
  delivery_address jsonb,
  origin_region text,
  -- contact for WhatsApp / guest drafts
  contact_phone text,
  contact_email text,
  -- compliance
  legal_confirmed boolean not null,
  legal_confirmed_at timestamptz,
  flagged boolean not null default false,
  flag_reasons text[] not null default '{}',
  rejection_reason text,
  requires_kyc boolean not null default false,
  assigned_to uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_confirmation_required check (legal_confirmed = true or status = 'draft')
);
create index requests_user_idx on public.requests (user_id, created_at desc);
create index requests_org_idx on public.requests (organisation_id, created_at desc);
create index requests_status_idx on public.requests (status, created_at desc);
create index requests_flagged_idx on public.requests (flagged) where flagged;

create table public.request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  product_url text not null,
  name text,
  quantity integer not null default 1 check (quantity between 1 and 1000),
  variant text,               -- size / colour / variant
  estimated_price numeric(14, 2) check (estimated_price is null or estimated_price >= 0),
  currency char(3) not null default 'USD',
  weight_kg numeric(8, 2),
  created_at timestamptz not null default now()
);
create index request_items_request_idx on public.request_items (request_id);

-- Credentials shared by clients for service access. Encrypted at the application
-- layer (AES-256-GCM). No client RLS policies: accessed only via the server.
create table public.request_credentials (
  request_id uuid primary key references public.requests (id) on delete cascade,
  ciphertext text not null,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.request_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.requests (id) on delete cascade,
  status public.request_status,
  title text not null,
  note text,
  actor_id uuid references public.users (id) on delete set null,
  visible_to_client boolean not null default true,
  created_at timestamptz not null default now()
);
create index request_events_request_idx on public.request_events (request_id, created_at);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  kind public.attachment_kind not null default 'other',
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes integer,
  uploaded_by uuid references public.users (id) on delete set null,
  visible_to_client boolean not null default true,
  created_at timestamptz not null default now()
);
create index attachments_request_idx on public.attachments (request_id);

-- ---------------------------------------------------------------------------
-- Quotes & payments
-- ---------------------------------------------------------------------------
create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  foreign_amount numeric(14, 2) not null check (foreign_amount > 0),
  currency char(3) not null,
  exchange_rate numeric(14, 4) not null check (exchange_rate > 0),
  subtotal_ngn numeric(16, 2) not null,
  service_fee_ngn numeric(16, 2) not null,
  shipping_fee_ngn numeric(16, 2) not null default 0,
  other_fees_ngn numeric(16, 2) not null default 0,
  total_ngn numeric(16, 2) not null check (total_ngn > 0),
  breakdown jsonb not null default '{}',
  notes text,
  status public.quote_status not null default 'active',
  payment_token text not null unique,
  expires_at timestamptz not null,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index quotes_request_idx on public.quotes (request_id, created_at desc);
create unique index quotes_one_active_per_request on public.quotes (request_id) where status = 'active';

create sequence public.invoice_number_seq start 1001;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete restrict,
  request_id uuid not null references public.requests (id) on delete restrict,
  user_id uuid references public.users (id) on delete set null,
  organisation_id uuid references public.organisations (id) on delete set null,
  provider public.payment_provider not null,
  reference text not null unique,
  provider_transaction_id text,
  amount_ngn numeric(16, 2) not null,
  amount_paid_ngn numeric(16, 2),
  status public.payment_status not null default 'pending',
  channel text,
  invoice_number text unique,
  receipt_number text unique,
  paid_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_user_idx on public.payments (user_id, created_at desc);
create index payments_org_idx on public.payments (organisation_id, paid_at desc);
create index payments_status_idx on public.payments (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Shipments
-- ---------------------------------------------------------------------------
create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  carrier text,
  tracking_number text,
  tracking_url text,
  status public.shipment_status not null default 'awaiting_purchase',
  weight_kg numeric(8, 2),
  foreign_warehouse text,
  estimated_delivery date,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index shipments_request_idx on public.shipments (request_id);

-- ---------------------------------------------------------------------------
-- Messaging & notifications
-- ---------------------------------------------------------------------------
create table public.messages (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.requests (id) on delete cascade,
  sender_id uuid references public.users (id) on delete set null,
  is_staff boolean not null default false,
  internal boolean not null default false,  -- staff-only note
  body text not null check (char_length(body) between 1 and 4000),
  attachment_id uuid references public.attachments (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_request_idx on public.messages (request_id, created_at);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  body text not null,
  link text,
  event text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create table public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null check (char_length(message) <= 5000),
  attachment_path text,
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'spam')),
  ip_address text,
  handled_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index contact_submissions_status_idx on public.contact_submissions (status, created_at desc);

create table public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  wa_id text not null unique,             -- E.164 without '+', as WhatsApp sends it
  profile_name text,
  user_id uuid references public.users (id) on delete set null,
  state text not null default 'menu',
  state_data jsonb not null default '{}',
  handoff boolean not null default false,
  handoff_requested_at timestamptz,
  assigned_to uuid references public.users (id) on delete set null,
  last_inbound_at timestamptz,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index wa_conversations_last_idx on public.whatsapp_conversations (last_message_at desc);

create table public.whatsapp_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.whatsapp_conversations (id) on delete cascade,
  direction public.wa_direction not null,
  body text not null,
  wa_message_id text unique,
  sent_by uuid references public.users (id) on delete set null,  -- staff agent, null = bot
  created_at timestamptz not null default now()
);
create index wa_messages_conv_idx on public.whatsapp_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- KYC, compliance, audit
-- ---------------------------------------------------------------------------
create table public.kyc_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  organisation_id uuid references public.organisations (id) on delete cascade,
  doc_type public.kyc_doc_type not null,
  doc_number text,
  storage_path text not null,
  status public.doc_review_status not null default 'pending',
  reviewer_id uuid references public.users (id) on delete set null,
  review_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index kyc_documents_user_idx on public.kyc_documents (user_id);
create index kyc_documents_status_idx on public.kyc_documents (status);

create table public.prohibited_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  category text not null default 'general',
  severity public.keyword_severity not null default 'flag',
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index prohibited_keywords_unique on public.prohibited_keywords (lower(keyword));

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.users (id) on delete set null,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}',
  ip_address text,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- Fixed-window rate limiting usable from serverless functions.
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count integer not null default 0
);

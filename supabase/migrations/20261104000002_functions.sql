-- =============================================================================
-- Web Purchase — functions & triggers
-- =============================================================================

alter table public.requests
  alter column reference set default ('WP-' || nextval('public.request_reference_seq')::text);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger users_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger organisations_updated_at before update on public.organisations for each row execute function public.set_updated_at();
create trigger requests_updated_at before update on public.requests for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger shipments_updated_at before update on public.shipments for each row execute function public.set_updated_at();

-- Role of the current user (null for anon). Security definer so it can be used in RLS.
create or replace function public.current_user_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid()
$$;

-- Staff access additionally requires a 2FA (aal2) session.
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role in ('support', 'operations', 'super_admin')
  ) and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
$$;

create or replace function public.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organisation_members
    where organisation_id = p_org and user_id = auth.uid() and status = 'active'
  )
$$;

create or replace function public.is_org_admin(p_org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organisation_members
    where organisation_id = p_org and user_id = auth.uid() and status = 'active' and role in ('owner', 'admin')
  )
$$;

create or replace function public.can_access_request(p_request uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.requests r
    where r.id = p_request
      and (
        r.user_id = auth.uid()
        or (r.organisation_id is not null and public.is_org_member(r.organisation_id))
      )
  ) or public.is_staff()
$$;

-- ---------------------------------------------------------------------------
-- auth.users → public.users sync
-- ---------------------------------------------------------------------------
create or replace function public.e164(p_phone text) returns text
language sql immutable as $$
  select case when coalesce(p_phone, '') = '' then null
              when p_phone like '+%' then p_phone
              else '+' || p_phone end
$$;

-- Attach pending organisation invitations — only for CONFIRMED emails, so an
-- unverified sign-up can never claim someone else's invitation.
create or replace function public.attach_org_invites(p_user uuid, p_email text) returns void
language sql security definer set search_path = public as $$
  update public.organisation_members
     set user_id = p_user, status = 'active'
   where user_id is null and lower(invited_email) = lower(p_email)
$$;

create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_org uuid;
  v_type public.account_type := coalesce((new.raw_user_meta_data ->> 'account_type')::public.account_type, 'individual');
begin
  insert into public.users (id, email, phone, full_name, account_type, email_verified, phone_verified)
  values (
    new.id,
    lower(new.email),
    public.e164(coalesce(nullif(new.phone, ''), new.raw_user_meta_data ->> 'phone')),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_type,
    new.email_confirmed_at is not null,
    new.phone_confirmed_at is not null
  )
  on conflict (id) do nothing;

  -- Organisation sign-up: create the organisation with the user as owner.
  if v_type = 'organisation' and coalesce(new.raw_user_meta_data ->> 'organisation_name', '') <> '' then
    insert into public.organisations (name, email, created_by)
    values (left(new.raw_user_meta_data ->> 'organisation_name', 160), lower(new.email), new.id)
    returning id into v_org;
    insert into public.organisation_members (organisation_id, user_id, role, status)
    values (v_org, new.id, 'owner', 'active');
  end if;

  if new.email is not null and new.email_confirmed_at is not null then
    perform public.attach_org_invites(new.id, new.email);
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.handle_auth_user_updated() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.users set
    email = lower(new.email),
    phone = coalesce(public.e164(nullif(new.phone, '')), phone),
    email_verified = new.email_confirmed_at is not null,
    phone_verified = new.phone_confirmed_at is not null
  where id = new.id;

  if new.email_confirmed_at is not null and (old.email_confirmed_at is null or old.email is distinct from new.email) then
    perform public.attach_org_invites(new.id, new.email);
  end if;
  return new;
end $$;

create trigger on_auth_user_updated
  after update of email, phone, email_confirmed_at, phone_confirmed_at on auth.users
  for each row execute function public.handle_auth_user_updated();

-- Clients can update their own profile but never privileged columns.
create or replace function public.protect_user_columns() returns trigger
language plpgsql as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'authenticated' then
    new.role := old.role;
    new.kyc_status := old.kyc_status;
    new.email_verified := old.email_verified;
    new.phone_verified := old.phone_verified;
    new.email := old.email;
    new.id := old.id;
  end if;
  return new;
end $$;

create trigger users_protect_columns before update on public.users
  for each row execute function public.protect_user_columns();

-- ---------------------------------------------------------------------------
-- Compliance: auto-flag requests matching prohibited keywords
-- ---------------------------------------------------------------------------
create or replace function public.match_prohibited_keywords(p_text text)
returns table (keyword text, severity public.keyword_severity, category text)
language sql stable security definer set search_path = public as $$
  select k.keyword, k.severity, k.category
    from public.prohibited_keywords k
   where p_text is not null
     and lower(p_text) ~ ('(^|[^a-z0-9])' || regexp_replace(lower(k.keyword), '([^a-z0-9 ])', '\\\1', 'g') || '([^a-z0-9]|$)')
$$;

create or replace function public.flag_request() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_text text;
  v_reasons text[];
begin
  v_text := concat_ws(' ', new.title, new.service_name, new.website_url, new.notes);
  select coalesce(array_agg(distinct (case when m.severity = 'block' then 'BLOCKED: ' else 'Keyword: ' end) || m.keyword), '{}')
    into v_reasons
    from public.match_prohibited_keywords(v_text) m;

  -- Keep reasons contributed by items / staff, replace keyword ones.
  new.flag_reasons := array(
    select distinct x from unnest(
      array(select r from unnest(coalesce(new.flag_reasons, '{}')) r
            where r not like 'Keyword: %' and r not like 'BLOCKED: %')
      || v_reasons
      || array(select r from unnest(coalesce(new.flag_reasons, '{}')) r where r like '%(item)')
    ) x
  );
  new.flagged := cardinality(new.flag_reasons) > 0;
  return new;
end $$;

create trigger requests_flag before insert or update of title, service_name, website_url, notes
  on public.requests for each row execute function public.flag_request();

create or replace function public.flag_request_item() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_reasons text[];
begin
  select coalesce(array_agg(distinct (case when m.severity = 'block' then 'BLOCKED: ' else 'Keyword: ' end) || m.keyword || ' (item)'), '{}')
    into v_reasons
    from public.match_prohibited_keywords(concat_ws(' ', new.product_url, new.name, new.variant)) m;
  if cardinality(v_reasons) > 0 then
    update public.requests
       set flag_reasons = array(select distinct x from unnest(flag_reasons || v_reasons) x),
           flagged = true
     where id = new.request_id;
  end if;
  return new;
end $$;

create trigger request_items_flag after insert or update on public.request_items
  for each row execute function public.flag_request_item();

-- ---------------------------------------------------------------------------
-- Quotes / invoices
-- ---------------------------------------------------------------------------
create or replace function public.expire_stale_quotes() returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  update public.quotes set status = 'expired'
   where status = 'active' and expires_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end $$;

create or replace function public.next_document_number(p_prefix text) returns text
language sql volatile security definer set search_path = public as $$
  select p_prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0')
$$;

-- Atomically mark a payment successful. Idempotent: returns false when the
-- payment was already processed (e.g. webhook + redirect both arrive).
create or replace function public.mark_payment_successful(
  p_reference text,
  p_amount_paid numeric,
  p_provider_tx text,
  p_channel text,
  p_raw jsonb
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_payment public.payments;
begin
  select * into v_payment from public.payments where reference = p_reference for update;
  if not found then
    raise exception 'payment % not found', p_reference;
  end if;
  if v_payment.status = 'success' then
    return false;
  end if;
  if p_amount_paid < v_payment.amount_ngn then
    update public.payments set status = 'failed', amount_paid_ngn = p_amount_paid, raw = p_raw
     where id = v_payment.id;
    raise exception 'underpayment for %: expected %, got %', p_reference, v_payment.amount_ngn, p_amount_paid;
  end if;

  update public.payments set
    status = 'success',
    amount_paid_ngn = p_amount_paid,
    provider_transaction_id = p_provider_tx,
    channel = p_channel,
    raw = p_raw,
    paid_at = now(),
    invoice_number = coalesce(invoice_number, public.next_document_number('INV')),
    receipt_number = coalesce(receipt_number, public.next_document_number('RCT'))
  where id = v_payment.id;

  update public.quotes set status = 'paid' where id = v_payment.quote_id;

  update public.requests set status = 'paid'
   where id = v_payment.request_id and status in ('quote_sent', 'under_review', 'submitted');

  insert into public.request_events (request_id, status, title, note)
  values (v_payment.request_id, 'paid', 'Payment confirmed',
          'Payment of NGN ' || to_char(p_amount_paid, 'FM999,999,999,990.00') || ' received via ' || v_payment.provider);
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- Rate limiting (fixed window)
-- ---------------------------------------------------------------------------
create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as rl (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    count = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rl.count + 1 end,
    window_start = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then now() else rl.window_start end
  returning count into v_count;
  return v_count <= p_limit;
end $$;

-- Housekeeping helper (call from cron)
create or replace function public.purge_rate_limits() returns void
language sql security definer set search_path = public as $$
  delete from public.rate_limits where window_start < now() - interval '1 day'
$$;

-- Lock down sensitive functions to the service role.
revoke execute on function public.mark_payment_successful(text, numeric, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.expire_stale_quotes() from public, anon, authenticated;
revoke execute on function public.next_document_number(text) from public, anon, authenticated;
revoke execute on function public.purge_rate_limits() from public, anon, authenticated;
revoke execute on function public.attach_org_invites(uuid, text) from public, anon, authenticated;

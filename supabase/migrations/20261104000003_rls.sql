-- =============================================================================
-- Web Purchase: row level security
--
-- Model:
--  * Clients read their own rows (and rows of organisations they belong to).
--  * Staff (support / operations / super_admin with a 2FA session) can read
--    operational data. Privileged writes go through server code using the
--    service role after an explicit permission check, and are audit-logged.
--  * Tables without policies for a role are inaccessible to that role.
-- =============================================================================

alter table public.users enable row level security;
alter table public.organisations enable row level security;
alter table public.organisation_members enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.fee_settings enable row level security;
alter table public.shipping_rates enable row level security;
alter table public.requests enable row level security;
alter table public.request_items enable row level security;
alter table public.request_credentials enable row level security;
alter table public.request_events enable row level security;
alter table public.attachments enable row level security;
alter table public.quotes enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.contact_submissions enable row level security;
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.kyc_documents enable row level security;
alter table public.prohibited_keywords enable row level security;
alter table public.audit_logs enable row level security;
alter table public.rate_limits enable row level security;

-- users ----------------------------------------------------------------------
create policy users_select_self on public.users for select to authenticated
  using (id = auth.uid() or public.is_staff());
-- Members of the same organisation can see each other's basic profile.
create or replace function public.shares_org_with(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organisation_members a
    join public.organisation_members b on a.organisation_id = b.organisation_id
    where a.user_id = auth.uid() and a.status = 'active'
      and b.user_id = p_user and b.status in ('active', 'invited')
  )
$$;
create policy users_select_org_peers on public.users for select to authenticated
  using (public.shares_org_with(id));
create policy users_update_self on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- organisations ----------------------------------------------------------------
create policy orgs_select_member on public.organisations for select to authenticated
  using (public.is_org_member(id) or public.is_staff());
create policy orgs_update_admin on public.organisations for update to authenticated
  using (public.is_org_admin(id)) with check (public.is_org_admin(id));

create policy org_members_select on public.organisation_members for select to authenticated
  using (public.is_org_member(organisation_id) or user_id = auth.uid() or public.is_staff());

-- public reference data (sell rates, fees, shipping) ---------------------------
create policy rates_public_read on public.exchange_rates for select to anon, authenticated
  using (is_active);
create policy fees_public_read on public.fee_settings for select to anon, authenticated
  using (true);
create policy shipping_public_read on public.shipping_rates for select to anon, authenticated
  using (is_active);
-- buy_rate / api_rate are commercially sensitive: hide from non-staff via column privileges.
revoke select on public.exchange_rates from anon, authenticated;
grant select (currency, name, symbol, sell_rate, is_active, updated_at) on public.exchange_rates to anon, authenticated;

-- requests ---------------------------------------------------------------------
create policy requests_select on public.requests for select to authenticated
  using (public.can_access_request(id));

create policy request_items_select on public.request_items for select to authenticated
  using (public.can_access_request(request_id));

create policy request_events_select on public.request_events for select to authenticated
  using (public.can_access_request(request_id) and (visible_to_client or public.is_staff()));

create policy attachments_select on public.attachments for select to authenticated
  using (public.can_access_request(request_id) and (visible_to_client or public.is_staff()));

create policy quotes_select on public.quotes for select to authenticated
  using (public.can_access_request(request_id));

create policy payments_select on public.payments for select to authenticated
  using (
    user_id = auth.uid()
    or (organisation_id is not null and public.is_org_member(organisation_id))
    or public.is_staff()
  );

create policy shipments_select on public.shipments for select to authenticated
  using (public.can_access_request(request_id));

-- messages: clients can read non-internal and post to their own requests
create policy messages_select on public.messages for select to authenticated
  using (public.can_access_request(request_id) and (not internal or public.is_staff()));
create policy messages_insert_client on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and is_staff = false
    and internal = false
    and public.can_access_request(request_id)
  );

-- notifications ----------------------------------------------------------------
create policy notifications_select_own on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- kyc ------------------------------------------------------------------------
create policy kyc_select_own on public.kyc_documents for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- staff-only tables --------------------------------------------------------------
create policy contact_staff_read on public.contact_submissions for select to authenticated
  using (public.is_staff());
create policy wa_conv_staff_read on public.whatsapp_conversations for select to authenticated
  using (public.is_staff());
create policy wa_msg_staff_read on public.whatsapp_messages for select to authenticated
  using (public.is_staff());
create policy keywords_staff_read on public.prohibited_keywords for select to authenticated
  using (public.is_staff());
create policy audit_super_admin_read on public.audit_logs for select to authenticated
  using (public.is_staff() and public.current_user_role() = 'super_admin');

-- request_credentials, rate_limits: no policies → service role only.

-- =============================================================================
-- Storage (private buckets; all uploads are proxied & validated by the server)
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('kyc', 'kyc', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('attachments', 'attachments', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']),
  ('contact', 'contact', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- Users may read their own KYC files directly (path: <user_id>/<file>).
create policy "kyc owner read" on storage.objects for select to authenticated
  using (bucket_id = 'kyc' and (storage.foldername(name))[1] = auth.uid()::text);

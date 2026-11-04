# Web Purchase

**Pay for anything online, in any currency.** A Nigerian “pay-for-me” and shop-and-ship platform: clients submit a service to pay for (subscriptions, exam/visa fees, hosting…) or items to buy abroad, staff review each request for legality, send a Naira quote with a locked exchange rate, the client pays via Paystack or Flutterwave, and Web Purchase pays the vendor in USD/GBP/EUR/… and delivers proof, access or a tracked parcel.

Built with **Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + RLS, Auth, Storage) · Paystack · Flutterwave · WhatsApp Cloud API · Resend · pdf-lib**, deployable to **Vercel**.

---

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Folder structure](#folder-structure)
- [Local setup](#local-setup)
- [Configuration reference](#configuration-reference)
- [Payments setup](#payments-setup-paystack--flutterwave)
- [WhatsApp chatbot setup](#whatsapp-chatbot-setup)
- [Deployment (Vercel + Supabase)](#deployment-vercel--supabase)
- [Security model](#security-model)
- [Testing](#testing)
- [Go-live checklist](#go-live-checklist)

---

## Features

| Area | What's included |
|---|---|
| **Public site** | Home (hero, how it works, categories, live rate widget, testimonials, FAQs, CTAs), Services, Shop & Ship (shipping fee table), Pricing with fee calculator, Track Order, About, Contact (form + attachment + WhatsApp), FAQ, Terms, Privacy, Refund, Prohibited Items. Floating WhatsApp button on every page. Light/dark mode. |
| **Auth** | Email + password sign-up with email confirmation, phone verification by SMS OTP, phone-OTP login, password reset. Organisation sign-up creates the org automatically. |
| **Client dashboard** | Service or item requests (multi-item, variants, delivery address), mandatory legal-confirmation checkbox, status badges and timeline, quote breakdown + pay button, messages with attachments, proof/receipts, shipment tracking, encrypted credential sharing (deletable), payment history with invoice/receipt PDFs, profile & KYC uploads, notifications. |
| **Organisations** | Team members (owner/admin/member) with email invites, bulk requests (up to 50 per batch), monthly PDF statements, organisation KYC (CAC). |
| **Compliance** | Prohibited-keyword screening (block or flag) in app *and* DB trigger, admin approval before any payment link, KYC threshold enforced at payment, audit log of all admin actions. |
| **Payments** | Unique, unguessable, expiring payment link per quote; rate locked for N hours; Paystack & Flutterwave checkout; webhooks with signature verification + server-side re-verification; idempotent “mark paid”; underpayment and duplicate-payment detection; invoice & receipt auto-generated and emailed. |
| **Admin console** | Overview with charts, request review (approve/reject with reason), quote builder with live preview & FX margin, status updates, proof uploads, shipments & tracking, client messaging + internal notes, audited credential reveal, exchange rates (manual or API + markup), fees/minimums/KYC threshold/business hours, shipping rates, customers & organisations with KYC review, contact submissions, WhatsApp inbox with human hand-off, prohibited keywords, team roles, audit log. **2FA (TOTP) required.** |
| **Roles** | Super Admin, Operations, Support — see the permission matrix in `src/lib/permissions.ts`. |
| **WhatsApp bot** | Menu (make a request / check status / quote estimate / prohibited items / human), order lookup (only for the owner's number), fee estimates from live rates, draft-request creation with legal confirmation, business-hours-aware hand-off, full conversation log. |
| **Notifications** | In-app + email + WhatsApp on: request received, quote ready, quote expired, payment confirmed, processing, completed, shipped, delivered, rejected, refunded, new message. |

## Architecture

```
Browser ──► Next.js (Vercel)
             ├─ Server Components  ── read via Supabase (user session → RLS)
             ├─ Server Actions     ── validate (zod) → authorise → write (service role) → audit → notify
             ├─ Route handlers     ── webhooks (Paystack, Flutterwave, WhatsApp), PDFs, cron
             └─ Middleware         ── session refresh + route protection
Supabase  ── Postgres (RLS everywhere, triggers for flagging/sync/audit), Auth (email, SMS OTP, TOTP MFA), Storage (private buckets)
External  ── Paystack / Flutterwave · Meta WhatsApp Cloud API · Resend · open.er-api.com (rates)
```

**Request lifecycle:** `draft (WhatsApp) → submitted → under_review → quote_sent → paid → processing → completed` (services) or `… → processing → shipped → delivered` (items); side exits `rejected`, `refunded`, `cancelled`. Allowed transitions live in `src/lib/status.ts`.

## Folder structure

```
├── supabase/
│   ├── migrations/
│   │   ├── 20261104000001_schema.sql     # tables, enums, indexes
│   │   ├── 20261104000002_functions.sql  # triggers, RPCs (payments, rate limit, flagging, audit)
│   │   └── 20261104000003_rls.sql        # row-level security + storage buckets
│   └── seed.sql                          # demo users, rates, fees, shipping, keywords, sample orders
├── scripts/create-admin.ts               # promote a user to staff
├── src/
│   ├── middleware.ts
│   ├── app/
│   │   ├── (marketing)/                  # public pages, /track, /contact, /pay/[token], /legal/*
│   │   ├── (auth)/                       # /login, /signup, /forgot-password, /reset-password
│   │   ├── auth/callback/                # email confirmation & recovery
│   │   ├── dashboard/                    # client area (requests, payments, profile, organisation…)
│   │   ├── admin/
│   │   │   ├── mfa/                      # 2FA enrol + challenge
│   │   │   ├── (console)/                # admin pages
│   │   │   └── actions.ts                # all admin server actions (permission-checked + audited)
│   │   └── api/                          # webhooks, cron, invoices, statements, attachments, rates
│   ├── components/                       # UI kit, app shell, site widgets, admin forms & charts
│   └── lib/
│       ├── supabase/                     # server / browser / admin clients, middleware helper
│       ├── payments/                     # paystack, flutterwave, payment service
│       ├── whatsapp/                     # Cloud API client, bot state machine (+tests), webhook handler
│       ├── pricing.ts                    # quote maths (+tests)
│       ├── crypto.ts                     # AES-256-GCM, HMAC (+tests)
│       ├── compliance.ts, requests.ts, notifications.ts, pdf.ts, rates.ts, storage.ts, …
└── vercel.json                           # cron schedules
```

## Local setup

**Prerequisites:** Node.js 20+, a Supabase project (free tier is fine) or the [Supabase CLI](https://supabase.com/docs/guides/cli) with Docker for a local stack.

```bash
npm install
cp .env.example .env.local      # fill in at least the Supabase keys + CREDENTIALS_ENCRYPTION_KEY
```

### Option A — local Supabase (CLI + Docker)

```bash
npx supabase init                # once; creates supabase/config.toml (keep the existing migrations/ and seed.sql)
npx supabase start               # prints API URL, anon key and service_role key → put them in .env.local
npx supabase db reset            # applies migrations + seed.sql
```

In `supabase/config.toml` enable what the app uses:

```toml
[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]
[auth.email]
enable_confirmations = true
[auth.sms]
enable_signup = true
enable_confirmations = true
[auth.sms.test_otp]              # local only: fixed OTPs, no SMS provider needed
2348031234567 = "123456"
[auth.mfa.totp]
enroll_enabled = true
verify_enabled = true
```

### Option B — hosted Supabase project

1. Create a project at [supabase.com](https://supabase.com) (region close to Nigeria, e.g. `eu-west-2`).
2. Link and push the schema:
   ```bash
   npx supabase link --project-ref <your-ref>
   npx supabase db push                       # applies supabase/migrations/*
   psql "$SUPABASE_DB_URL" -f supabase/seed.sql   # optional demo data — staging only!
   ```
   (Or paste each migration file into the SQL editor in order.)
3. **Auth → Providers:** enable Email (with confirmations) and Phone. Configure an SMS provider (Twilio, MessageBird, Vonage or Textlocal; for Nigeria, Twilio with an alphanumeric sender works well).
4. **Auth → Multi-Factor:** enable TOTP.
5. **Auth → URL configuration:** Site URL = your domain; add `https://<domain>/auth/callback` to redirect URLs.
6. Copy the API URL, anon key and service-role key into `.env.local`.

### Run

```bash
openssl rand -base64 32          # → CREDENTIALS_ENCRYPTION_KEY
npm run dev                      # http://localhost:3000
```

**Demo accounts** (from `seed.sql`, password `WebPurchase#2026`): `admin@webpurchase.ng` (Super Admin), `ops@webpurchase.ng`, `support@webpurchase.ng`, `ada@example.com` (client), `tunde@example.com` (organisation owner). Staff are asked to set up an authenticator app on first visit to `/admin`. Try the sample payment link `/pay/demo-ielts-token-7f3a9c2e5b1d4f60a8e7` (re-seed if it has expired).

**Create your first real admin:** sign up normally, confirm email, then

```bash
set -a; source .env.local; set +a
npm run create-admin -- you@yourdomain.com super_admin
```

> Without Supabase configured the public site still renders using default rates/fees, so you can preview the design immediately.

## Configuration reference

All variables are documented in [`.env.example`](.env.example). Business settings (fee %, flat fee, minimum fee, KYC threshold, quote validity, business hours, shipping rates, exchange rates, prohibited keywords) are edited in the admin console, not env vars.

## Payments setup (Paystack & Flutterwave)

| | Paystack | Flutterwave |
|---|---|---|
| Secret key | `PAYSTACK_SECRET_KEY` | `FLUTTERWAVE_SECRET_KEY` |
| Webhook URL | `https://<domain>/api/webhooks/paystack` | `https://<domain>/api/webhooks/flutterwave` |
| Webhook auth | HMAC-SHA512 of body with secret key (automatic) | Set a **Secret hash** in the dashboard and the same value in `FLUTTERWAVE_WEBHOOK_HASH` |
| Callback | set automatically per transaction (`/pay/<token>/callback`) | same |

Flow: admin sends quote → client opens `/pay/<token>` → chooses gateway → `payments` row created (`pending`) → gateway checkout → **webhook and/or redirect** → server re-verifies the transaction with the gateway API (amount, currency NGN, reference) → `mark_payment_successful()` RPC marks payment, quote and request paid in one transaction (idempotent) → invoice + receipt PDFs generated and emailed → client & ops notified.

Use test keys first; Paystack test card `4084 0840 8408 4081`, any future expiry, CVV `408`, OTP `123456`.

## WhatsApp chatbot setup

1. In [Meta for Developers](https://developers.facebook.com) create an app → add **WhatsApp** → note the *Phone number ID* and create a permanent **System User access token** with `whatsapp_business_messaging`.
2. Set `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET` (App → Settings → Basic) and a random `WHATSAPP_VERIFY_TOKEN`.
3. Webhook: callback URL `https://<domain>/api/webhooks/whatsapp`, verify token = `WHATSAPP_VERIFY_TOKEN`, subscribe to **messages**.
4. Create a **utility template** (e.g. `order_update`, body: `Hi {{1}}, {{2}}`) for status updates sent outside the 24-hour window and set `WHATSAPP_STATUS_TEMPLATE`.
5. Set `NEXT_PUBLIC_WHATSAPP_NUMBER` for the floating button.

Bot logic is a pure state machine in `src/lib/whatsapp/bot.ts` (unit-tested); `handler.ts` wires it to the DB. Hand-offs appear first in **Admin → WhatsApp**, where agents reply inside the 24h window and click *Resolve* to return the user to the bot. Using Twilio or 360dialog instead? Replace the transport in `src/lib/whatsapp/client.ts` and the payload parser in `handler.ts`; the bot is provider-agnostic.

## Deployment (Vercel + Supabase)

1. Push this repo to GitHub and **Import** it in Vercel (framework: Next.js; defaults are fine).
2. Add every variable from `.env.example` in *Settings → Environment Variables* (Production + Preview). Set `NEXT_PUBLIC_SITE_URL` to the production domain.
3. Deploy. `vercel.json` registers two cron jobs: exchange-rate sync (every 6h) and quote expiry (hourly). Vercel calls them with `Authorization: Bearer $CRON_SECRET`. *Hobby plans only allow daily crons — change the schedules or upgrade to Pro.*
4. Point Paystack, Flutterwave and Meta webhooks at the production domain.
5. In Supabase Auth URL configuration, set the production Site URL and callback URL.
6. Configure a Resend sending domain (SPF/DKIM) and set `EMAIL_FROM`.

## Security model

- **RLS on every table.** Clients see only their rows (and their organisation's); staff read access additionally requires an **aal2 (2FA) session** at the database level (`is_staff()`). Commercially sensitive columns (`buy_rate`, `api_rate`) are hidden from non-staff via column privileges.
- **Privileged writes** happen only in server actions after `requireStaff(permission)` and are written to an **append-only audit log** (DB trigger blocks updates/deletes).
- **Protected profile columns** (`role`, `kyc_status`, verification flags) can't be changed by users even via the API (trigger).
- **Org invites** attach only after the invitee's email is confirmed.
- **Credentials** shared by clients are encrypted with AES-256-GCM (`CREDENTIALS_ENCRYPTION_KEY`), stored in a table with no client policies, revealed only to `credentials.view` staff with an audit entry, and deletable by the client.
- **Payments:** card data never touches our servers; webhooks are signature-verified and every transaction is re-verified server-to-server; payment links are 192-bit random tokens that expire.
- **Uploads** are validated by magic bytes and size, stored in private buckets, and served via short-lived signed URLs after an RLS check.
- **Rate limiting** (Postgres-backed, works across serverless instances) on login, sign-up, OTP, contact, tracking, requests, messages, uploads, payments and the bot. Honeypot on the contact form.
- **Headers:** HSTS, `X-Frame-Options: DENY`, `nosniff`, strict referrer and permissions policies. Open-redirect protection on all `next` parameters.
- **No account enumeration** on password reset or order tracking.

## Testing

```bash
npm test            # vitest: pricing, encryption, WhatsApp bot flows, keyword matching, business hours
npm run typecheck
npm run lint
npm run build
```

The SQL migrations and seed were verified against PostgreSQL 16, with stubs for the Supabase `auth`/`storage` schemas. These checks covered RLS isolation between clients, the 2FA requirement for staff, privilege-escalation attempts, auto-flagging, idempotent payment confirmation, rate limiting, org-invite attachment and the append-only audit log.

## Go-live checklist

- [ ] Have a Nigerian lawyer review Terms, Privacy (NDPA 2023), Refund and Prohibited Items pages (`src/app/(marketing)/legal/*`).
- [ ] Replace the **sample testimonials** in `src/lib/content.ts` with real, consented quotes.
- [ ] Set real business details (`NEXT_PUBLIC_*`), RC number and office address.
- [ ] Do **not** run `seed.sql` in production (it creates demo users); create staff with `npm run create-admin`.
- [ ] Switch Paystack/Flutterwave to live keys; confirm webhooks deliver (check Admin → Audit log for `payment.confirmed`).
- [ ] Configure SMS provider, TOTP MFA and email confirmations in Supabase Auth.
- [ ] Approve the WhatsApp message template and verify the business number.
- [ ] Review exchange-rate sources/markups and fee settings in the admin console.
- [ ] Enable Supabase Point-in-Time Recovery and Vercel log drains / monitoring.

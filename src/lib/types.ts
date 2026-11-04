export type UserRole = "client" | "support" | "operations" | "super_admin";
export type StaffRole = Exclude<UserRole, "client">;
export type KycStatus = "unverified" | "pending" | "verified" | "rejected";
export type RequestType = "service" | "item";
export type RequestStatus =
  | "draft" | "submitted" | "under_review" | "quote_sent" | "paid" | "processing"
  | "completed" | "shipped" | "delivered" | "rejected" | "refunded" | "cancelled";
export type QuoteStatus = "active" | "expired" | "superseded" | "paid" | "cancelled";
export type PaymentProvider = "paystack" | "flutterwave" | "manual";
export type PaymentStatus = "pending" | "success" | "failed" | "refunded" | "abandoned";

export interface UserProfile {
  id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  account_type: "individual" | "organisation";
  role: UserRole;
  email_verified: boolean;
  phone_verified: boolean;
  kyc_status: KycStatus;
  address_line: string | null;
  city: string | null;
  state: string | null;
  country: string;
  notify_email: boolean;
  notify_whatsapp: boolean;
  created_at: string;
}

export interface Organisation {
  id: string;
  name: string;
  rc_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  kyc_status: KycStatus;
  created_at: string;
}

export interface RequestRow {
  id: string;
  reference: string;
  user_id: string | null;
  organisation_id: string | null;
  batch_id: string | null;
  type: RequestType;
  status: RequestStatus;
  source: "web" | "whatsapp" | "bulk" | "admin";
  title: string;
  service_name: string | null;
  website_url: string | null;
  account_email: string | null;
  amount: number | null;
  currency: string;
  deadline: string | null;
  notes: string | null;
  delivery_address: { line?: string; city?: string; state?: string; phone?: string } | null;
  origin_region: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  legal_confirmed: boolean;
  legal_confirmed_at: string | null;
  flagged: boolean;
  flag_reasons: string[];
  rejection_reason: string | null;
  requires_kyc: boolean;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestItem {
  id: string;
  request_id: string;
  product_url: string;
  name: string | null;
  quantity: number;
  variant: string | null;
  estimated_price: number | null;
  currency: string;
  weight_kg: number | null;
}

export interface Quote {
  id: string;
  request_id: string;
  foreign_amount: number;
  currency: string;
  exchange_rate: number;
  subtotal_ngn: number;
  service_fee_ngn: number;
  shipping_fee_ngn: number;
  other_fees_ngn: number;
  total_ngn: number;
  breakdown: Record<string, unknown>;
  notes: string | null;
  status: QuoteStatus;
  payment_token: string;
  expires_at: string;
  created_at: string;
}

export interface Payment {
  id: string;
  quote_id: string;
  request_id: string;
  user_id: string | null;
  organisation_id: string | null;
  provider: PaymentProvider;
  reference: string;
  amount_ngn: number;
  amount_paid_ngn: number | null;
  status: PaymentStatus;
  channel: string | null;
  invoice_number: string | null;
  receipt_number: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface Shipment {
  id: string;
  request_id: string;
  carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  status: string;
  weight_kg: number | null;
  foreign_warehouse: string | null;
  estimated_delivery: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
}

export interface RequestEvent {
  id: number;
  request_id: string;
  status: RequestStatus | null;
  title: string;
  note: string | null;
  visible_to_client: boolean;
  created_at: string;
}

export interface Attachment {
  id: string;
  request_id: string;
  kind: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  visible_to_client: boolean;
  created_at: string;
}

export interface Message {
  id: number;
  request_id: string;
  sender_id: string | null;
  is_staff: boolean;
  internal: boolean;
  body: string;
  attachment_id: string | null;
  created_at: string;
}

export interface ExchangeRate {
  currency: string;
  name: string;
  symbol: string;
  sell_rate: number;
  buy_rate?: number;
  source?: "manual" | "api";
  markup_percent?: number;
  api_rate?: number | null;
  is_active?: boolean;
  updated_at: string;
}

export interface FeeSettings {
  percentage_fee: number;
  flat_fee_ngn: number;
  minimum_fee_ngn: number;
  kyc_threshold_ngn: number;
  quote_validity_hours: number;
  business_hours: BusinessHours;
}

export interface BusinessHours {
  timezone: string;
  days: number[]; // 0 = Sunday
  start: string; // "09:00"
  end: string; // "18:00"
  saturday_end?: string;
}

export interface ShippingRate {
  id: string;
  origin_region: string;
  label: string;
  rate_per_kg_usd: number;
  min_charge_usd: number;
  delivery_days_min: number;
  delivery_days_max: number;
  is_active?: boolean;
  sort_order?: number;
}

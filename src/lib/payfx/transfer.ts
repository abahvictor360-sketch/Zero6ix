import "server-only";
import { envValue } from "@/lib/env";
import { supabaseAuthHeaders } from "./store";
import { SETTINGS_TAG } from "./settings";

/**
 * Direct bank transfer to the company account. Customers transfer, then
 * upload their bank receipt; an admin confirms it in /checkout-admin.
 * Receipts are stored in the private Supabase Storage bucket below.
 */
export const RECEIPT_BUCKET = "payfx-receipts";
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

export interface BankSettings {
  enabled: boolean;
  bank: string;
  accountNumber: string;
  accountName: string;
  /** Minutes on the countdown shown to the customer. */
  windowMinutes: number;
}

export const DEFAULT_BANK: BankSettings = {
  enabled: true,
  bank: "Fidelity Bank",
  accountNumber: "5601812020",
  accountName: "ZERO6IX LIMITED",
  windowMinutes: 30,
};

const base = () => (envValue("PAYFX_SUPABASE_URL") || envValue("SUPABASE_URL")).replace(/\/$/, "");
const key = () => envValue("PAYFX_SUPABASE_SERVICE_ROLE_KEY");

/** Bank details: the ones saved in the admin, or the defaults above. */
export async function getBankSettings(): Promise<BankSettings> {
  if (!base() || !key()) return DEFAULT_BANK;
  try {
    const res = await fetch(`${base()}/rest/v1/payfx_settings?select=value&key=eq.bank_account&limit=1`, {
      headers: supabaseAuthHeaders(key()),
      next: { revalidate: 60, tags: [SETTINGS_TAG] },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return DEFAULT_BANK;
    const [row] = (await res.json()) as { value: Partial<BankSettings> }[];
    const v = row?.value ?? {};
    return {
      enabled: v.enabled ?? DEFAULT_BANK.enabled,
      bank: v.bank?.trim() || DEFAULT_BANK.bank,
      accountNumber: v.accountNumber?.trim() || DEFAULT_BANK.accountNumber,
      accountName: v.accountName?.trim() || DEFAULT_BANK.accountName,
      windowMinutes: Number(v.windowMinutes) >= 5 && Number(v.windowMinutes) <= 1440 ? Number(v.windowMinutes) : DEFAULT_BANK.windowMinutes,
    };
  } catch {
    return DEFAULT_BANK;
  }
}

/** Transfer is offered when it's switched on and receipts can be stored. */
export const transferAvailable = (b: BankSettings) => b.enabled && Boolean(base() && key());

async function storage(path: string, init: RequestInit = {}) {
  return fetch(`${base()}/storage/v1/${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    headers: { ...supabaseAuthHeaders(key()), ...init.headers },
  });
}

/** Create the private receipts bucket the first time it's needed. */
async function ensureBucket() {
  const res = await storage("bucket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: RECEIPT_BUCKET, name: RECEIPT_BUCKET, public: false, file_size_limit: RECEIPT_MAX_BYTES,
      allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
    }),
  });
  if (!res.ok && res.status !== 409) {
    const t = await res.text();
    if (!/already exists|Duplicate/i.test(t)) throw new Error(`Could not create receipts bucket: ${res.status} ${t.slice(0, 200)}`);
  }
}

export async function storeReceipt(path: string, bytes: Uint8Array, mime: string) {
  const put = () => storage(`object/${RECEIPT_BUCKET}/${path}`, {
    method: "POST",
    headers: { "Content-Type": mime, "x-upsert": "false" },
    body: Buffer.from(bytes),
  });
  let res = await put();
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 404 || /bucket not found/i.test(t)) {
      await ensureBucket();
      res = await put();
      if (!res.ok) throw new Error(`Receipt upload failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
    } else {
      throw new Error(`Receipt upload failed: ${res.status} ${t.slice(0, 200)}`);
    }
  }
}

/** Short-lived link for an admin to view a receipt. */
export async function receiptUrl(path: string, seconds = 600): Promise<string | null> {
  try {
    const res = await storage(`object/sign/${RECEIPT_BUCKET}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: seconds }),
    });
    if (!res.ok) return null;
    const { signedURL, signedUrl } = (await res.json()) as { signedURL?: string; signedUrl?: string };
    const u = signedURL ?? signedUrl;
    return u ? `${base()}/storage/v1${u.startsWith("/") ? u : `/${u}`}` : null;
  } catch {
    return null;
  }
}

import { z } from "zod";
import { normalizePhone } from "./format";

export const CURRENCIES = ["USD", "GBP", "EUR", "CAD", "AUD", "AED", "CNY"] as const;

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));
const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => /^https?:\/\/[^\s]+\.[^\s]+/i.test(v), "Enter a valid web address starting with http(s)://");
const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || /^https?:\/\/[^\s]+\.[^\s]+/i.test(v), "Enter a valid web address starting with http(s)://");

export const phoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const p = normalizePhone(v);
    if (!p) {
      ctx.addIssue({ code: "custom", message: "Enter a valid phone number, e.g. 0803 123 4567" });
      return z.NEVER;
    }
    return p;
  });

const legalConfirmation = z
  .union([z.literal("on"), z.literal("true"), z.literal(true)], {
    error: "You must confirm the request is legal and complies with our Terms of Service.",
  })
  .transform(() => true as const);

const money = z.coerce.number({ error: "Enter an amount" }).positive("Amount must be greater than zero").max(1_000_000);

export const serviceRequestSchema = z.object({
  type: z.literal("service"),
  organisation_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  service_name: trimmed(160).min(2, "Enter the service name"),
  website_url: httpUrl,
  amount: money,
  currency: z.enum(CURRENCIES),
  account_email: z.string().trim().email("Enter a valid email").max(200).optional().or(z.literal("").transform(() => undefined)),
  deadline: z.string().optional().transform((v) => (v ? v : undefined))
    .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid date"),
  notes: optionalText(4000),
  legal_confirmed: legalConfirmation,
});

export const itemSchema = z.object({
  product_url: httpUrl,
  name: optionalText(200),
  quantity: z.coerce.number().int().min(1).max(1000),
  variant: optionalText(200),
  estimated_price: z.coerce.number().nonnegative().max(1_000_000).optional(),
});

export const itemRequestSchema = z.object({
  type: z.literal("item"),
  organisation_id: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  title: optionalText(200),
  currency: z.enum(CURRENCIES),
  origin_region: z.string().trim().max(8).optional(),
  items: z.array(itemSchema).min(1, "Add at least one product").max(20),
  address_line: trimmed(300).min(4, "Enter a delivery address"),
  city: trimmed(80).min(2, "Enter a city"),
  state: trimmed(80).min(2, "Enter a state"),
  delivery_phone: phoneSchema,
  notes: optionalText(4000),
  legal_confirmed: legalConfirmation,
});

export const contactSchema = z.object({
  name: trimmed(120).min(2, "Enter your name"),
  email: z.string().trim().email("Enter a valid email").max(200),
  phone: z.string().trim().max(30).optional().transform((v) => (v ? normalizePhone(v) ?? v : undefined)),
  subject: trimmed(160).min(3, "Enter a subject"),
  message: trimmed(5000).min(10, "Message should be at least 10 characters"),
  website: z.string().max(0).optional(), // honeypot
});

export const trackSchema = z.object({
  reference: z.string().trim().toUpperCase().regex(/^WP-\d{6,}$/, "Order IDs look like WP-100123"),
  contact: z.string().trim().min(5, "Enter the email or phone used for the order").max(200),
});

export const messageSchema = z.object({
  request_id: z.string().uuid(),
  body: trimmed(4000).min(1, "Message cannot be empty"),
});

export const profileSchema = z.object({
  full_name: trimmed(120).min(2, "Enter your full name"),
  address_line: optionalText(300),
  city: optionalText(80),
  state: optionalText(80),
  notify_email: z.coerce.boolean().optional().default(false),
  notify_whatsapp: z.coerce.boolean().optional().default(false),
});

export const quoteSchema = z.object({
  request_id: z.string().uuid(),
  foreign_amount: money,
  currency: z.enum(CURRENCIES),
  exchange_rate: z.coerce.number().positive().optional(),
  weight_kg: z.coerce.number().nonnegative().max(500).optional().default(0),
  origin_region: z.string().trim().max(8).optional(),
  other_fees_ngn: z.coerce.number().nonnegative().max(100_000_000).optional().default(0),
  notes: optionalText(2000),
});

export const organisationSchema = z.object({
  name: trimmed(160).min(2, "Enter the organisation name"),
  rc_number: optionalText(40),
  email: z.string().trim().email().max(200).optional().or(z.literal("").transform(() => undefined)),
  phone: optionalText(30),
  address: optionalText(300),
});

/** Convert FormData to a plain object; repeated keys become arrays. */
export function formToObject(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (value instanceof File) continue;
    if (key in out) {
      const prev = out[key];
      out[key] = Array.isArray(prev) ? [...prev, value] : [prev, value];
    } else out[key] = value;
  }
  return out;
}

export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  message?: string;
  data?: Record<string, unknown>;
};

export function zodErrorState(error: z.ZodError): ActionState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, error: "Please fix the highlighted fields.", fieldErrors };
}

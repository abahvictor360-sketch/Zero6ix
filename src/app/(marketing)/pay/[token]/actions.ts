"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { initializePayment, PaymentError } from "@/lib/payments/service";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { clientIp } from "@/lib/audit";
import type { ActionState } from "@/lib/validation";

export async function startPayment(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z.object({
    token: z.string().regex(/^[A-Za-z0-9_-]{16,80}$/),
    provider: z.enum(["paystack", "flutterwave"]),
  }).safeParse({ token: form.get("token"), provider: form.get("provider") });
  if (!parsed.success) return { error: "Choose a payment method." };
  if (!(await rateLimit(`pay:${await clientIp()}`, LIMITS.payment.limit, LIMITS.payment.window))) {
    return { error: "Too many payment attempts. Please wait a few minutes." };
  }
  let url: string;
  try {
    url = await initializePayment(parsed.data.token, parsed.data.provider);
  } catch (e) {
    return { error: e instanceof PaymentError ? e.message : "Could not start payment. Please try again." };
  }
  redirect(url);
}

"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ADMIN_BASE, adminConfigured, checkPassword, endSession, loginThrottle, requireAdmin, startSession } from "@/lib/payfx/admin-auth";
import { createProduct, deleteProduct, getProduct, StoreError, updateProduct } from "@/lib/payfx/admin-store";
import { PRODUCTS_TAG } from "@/lib/payfx/products";
import { LOGOS } from "@/lib/payfx/icons";
import { zodErrorState, type ActionState } from "@/lib/validation";

/* ---------- Sign in / out ---------- */

export async function loginAction(_: ActionState | null, form: FormData): Promise<ActionState> {
  if (!adminConfigured()) return { error: "Admin login is not set up yet. Add CHECKOUT_ADMIN_PASSWORD (10+ characters) in Vercel and redeploy." };
  const throttle = await loginThrottle();
  if (throttle.blocked) return { error: "Too many attempts. Try again in 15 minutes." };
  await new Promise((r) => setTimeout(r, 400));
  if (!checkPassword(String(form.get("password") ?? ""))) {
    throttle.fail();
    return { error: "Wrong password." };
  }
  throttle.reset();
  await startSession();
  redirect(ADMIN_BASE);
}

export async function logoutAction() {
  await endSession();
  redirect(`${ADMIN_BASE}/login`);
}

/* ---------- Items ---------- */

const ProductSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  subtitle: z.string().trim().max(60).optional().transform((v) => v || null),
  period: z.string().trim().min(2, "Enter a period, e.g. 12 months or One time").max(40),
  purpose: z.string().trim().min(5, "Describe what the payment is for").max(400),
  amount_ngn: z.string().trim()
    .transform((v) => Number(v.replace(/[₦,\s]/g, "")))
    .pipe(z.number({ message: "Enter an amount" }).positive("Amount must be more than 0").max(1_000_000_000, "Amount is too large")),
  logo: z.string().refine((v) => v in LOGOS && v !== "test", "Choose a logo"),
  sort_order: z.string().trim().optional().transform((v) => (v ? Math.round(Number(v)) : 0)).pipe(z.number().int("Enter a whole number")),
  active: z.string().optional().transform((v) => v === "on"),
});

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

function refreshPublic() {
  revalidateTag(PRODUCTS_TAG);
  revalidatePath("/checkout");
  revalidatePath(`${ADMIN_BASE}`, "layout");
}

const storeError = (e: unknown): ActionState => ({
  error: e instanceof StoreError
    ? e.code === "42P01" || e.code === "PGRST205"
      ? "The items table does not exist yet in the database. Run supabase/leadloop/payfx_products.sql in Supabase first."
      : e.message
    : "Something went wrong. Please try again.",
});

export async function saveProductAction(_: ActionState | null, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = ProductSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return zodErrorState(parsed.error);
  const existingId = String(form.get("id") ?? "");
  try {
    if (existingId) {
      const row = await updateProduct(existingId, parsed.data);
      if (!row) return { error: "This item no longer exists." };
    } else {
      let id = slug([parsed.data.name, parsed.data.subtitle].filter(Boolean).join(" ")) || "item";
      if (id.length < 2) id = `item-${id}`;
      // Make the id unique if an item with the same name exists.
      for (let n = 2; await getProduct(id); n++) id = `${id.replace(/-\d+$/, "")}-${n}`;
      await createProduct(id, parsed.data);
    }
  } catch (e) {
    return storeError(e);
  }
  refreshPublic();
  redirect(`${ADMIN_BASE}/items?saved=1`);
}

export async function deleteProductAction(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  try {
    await deleteProduct(id);
  } catch (e) {
    redirect(`${ADMIN_BASE}/items?error=${encodeURIComponent(storeError(e).error ?? "Delete failed")}`);
  }
  refreshPublic();
  redirect(`${ADMIN_BASE}/items?deleted=1`);
}

export async function toggleProductAction(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const active = form.get("active") === "true";
  try {
    await updateProduct(id, { active });
  } catch (e) {
    redirect(`${ADMIN_BASE}/items?error=${encodeURIComponent(storeError(e).error ?? "Update failed")}`);
  }
  refreshPublic();
  redirect(`${ADMIN_BASE}/items`);
}

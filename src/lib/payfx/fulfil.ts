import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { setProductsActive } from "./admin-store";
import { PRODUCTS_TAG } from "./products";
import type { PayfxOrder } from "./store";

/**
 * Checkout items are one-off funding needs: once an order containing an item
 * is paid, the item comes off the checkout page so only unpaid items remain.
 * Setting the order back to unpaid puts its items back. Never throws.
 */
async function setItems(order: Pick<PayfxOrder, "items">, active: boolean) {
  try {
    const changed = await setProductsActive(order.items.map((l) => l.id), active);
    if (changed.length) {
      try {
        revalidateTag(PRODUCTS_TAG);
        revalidatePath("/checkout");
      } catch {
        // Called while rendering a page: the product list refreshes within a minute anyway.
      }
    }
    return changed;
  } catch (e) {
    console.error(`[payfx] could not ${active ? "restore" : "remove"} paid items`, e);
    return [];
  }
}

export const removePaidItems = (order: Pick<PayfxOrder, "items">) => setItems(order, false);
export const restoreItems = (order: Pick<PayfxOrder, "items">) => setItems(order, true);

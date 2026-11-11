import type { PayfxOrder } from "./store";

/** What the bank-transfer popup needs (safe to send to the browser). */
export interface TransferView {
  ref: string;
  invoiceNumber: string;
  total: number;
  customerName: string;
  items: { name: string; amount: number }[];
  /** ISO time the countdown ends, and the countdown's full length. */
  dueAt: string;
  windowMinutes: number;
  status: "awaiting_receipt" | "submitted" | "rejected" | "confirmed";
  rejectedReason?: string;
  receiptsCount: number;
  bank: { bank: string; accountNumber: string; accountName: string };
}

export function toTransferView(
  order: Pick<PayfxOrder, "ref" | "invoiceNumber" | "total" | "customer" | "items" | "transfer">,
  bank: { bank: string; accountNumber: string; accountName: string; windowMinutes: number },
): TransferView {
  return {
    ref: order.ref,
    invoiceNumber: order.invoiceNumber,
    total: order.total,
    customerName: order.customer.name,
    items: order.items.map((l) => ({ name: l.subtitle ? `${l.name} (${l.subtitle})` : l.name, amount: l.amount })),
    dueAt: order.transfer?.dueAt ?? new Date(Date.now() + bank.windowMinutes * 60_000).toISOString(),
    windowMinutes: bank.windowMinutes,
    status: order.transfer?.status ?? "awaiting_receipt",
    rejectedReason: order.transfer?.rejectedReason,
    receiptsCount: order.transfer?.receipts?.length ?? 0,
    bank: { bank: bank.bank, accountNumber: bank.accountNumber, accountName: bank.accountName },
  };
}

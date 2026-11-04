import type { StaffRole, UserRole } from "./types";

export const STAFF_ROLES: StaffRole[] = ["support", "operations", "super_admin"];

export type Permission =
  | "requests.view"
  | "requests.message"
  | "requests.manage"   // approve / reject / status / proofs / tracking
  | "quotes.send"
  | "credentials.view"
  | "rates.manage"
  | "fees.manage"
  | "customers.view"
  | "kyc.review"
  | "contacts.view"
  | "whatsapp.view"
  | "whatsapp.reply"
  | "keywords.manage"
  | "team.manage"
  | "audit.view";

const MATRIX: Record<StaffRole, Permission[]> = {
  support: [
    "requests.view", "requests.message", "customers.view", "contacts.view",
    "whatsapp.view", "whatsapp.reply",
  ],
  operations: [
    "requests.view", "requests.message", "requests.manage", "quotes.send", "credentials.view",
    "rates.manage", "customers.view", "kyc.review", "contacts.view", "whatsapp.view",
    "whatsapp.reply", "keywords.manage",
  ],
  super_admin: [
    "requests.view", "requests.message", "requests.manage", "quotes.send", "credentials.view",
    "rates.manage", "fees.manage", "customers.view", "kyc.review", "contacts.view",
    "whatsapp.view", "whatsapp.reply", "keywords.manage", "team.manage", "audit.view",
  ],
};

export function isStaffRole(role: UserRole | null | undefined): role is StaffRole {
  return !!role && (STAFF_ROLES as string[]).includes(role);
}

export function can(role: UserRole | null | undefined, permission: Permission): boolean {
  return isStaffRole(role) && MATRIX[role].includes(permission);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  client: "Client",
  support: "Support",
  operations: "Operations",
  super_admin: "Super Admin",
};

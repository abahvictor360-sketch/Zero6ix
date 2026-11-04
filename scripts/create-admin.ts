/**
 * Promote an existing user to a staff role.
 *
 *   npm run create-admin -- someone@example.com super_admin
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
 * environment (e.g. `set -a; source .env.local; set +a`). The user must sign up
 * first; they'll be asked to enrol 2FA the next time they open /admin.
 */
import { createClient } from "@supabase/supabase-js";

const [email, role = "super_admin"] = process.argv.slice(2);
const ROLES = ["support", "operations", "super_admin", "client"];

async function main() {
  if (!email || !ROLES.includes(role)) {
    console.error(`Usage: npm run create-admin -- <email> [${ROLES.join("|")}]`);
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
    process.exit(1);
  }
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.from("users").update({ role }).ilike("email", email).select("id, email, role");
  if (error) throw error;
  if (!data?.length) {
    console.error(`No user found with email ${email}. Ask them to sign up first.`);
    process.exit(1);
  }
  await db.from("audit_logs").insert({ actor_email: "cli", action: "team.role", entity_type: "user", entity_id: data[0].id, details: { email, to: role, via: "create-admin script" } });
  console.log(`✔ ${data[0].email} is now ${role}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

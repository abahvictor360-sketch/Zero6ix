/** Server-side environment access with clear errors for missing configuration. */
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const isSupabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const isServiceRoleConfigured = () =>
  isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

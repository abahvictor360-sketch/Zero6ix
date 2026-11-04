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

/**
 * Read an env var, treating Vercel placeholders ("REPLACE_ME", "CHANGE_ME", "TODO")
 * as unset, so half-configured settings never get used as real keys.
 */
export function envValue(name: string): string {
  const v = (process.env[name] ?? "").trim();
  return /^(replace[_-]?me|change[_-]?me|todo|xxx+)$/i.test(v) ? "" : v;
}

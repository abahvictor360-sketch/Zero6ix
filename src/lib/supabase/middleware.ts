import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/admin"];
/** Hidden until NEXT_PUBLIC_ACCOUNTS_ENABLED=true (see src/lib/site.ts). */
const ACCOUNT_ROUTES = ["/dashboard", "/admin", "/login", "/signup", "/forgot-password", "/reset-password", "/track", "/pay", "/auth"];

export async function updateSession(request: NextRequest) {
  const path0 = request.nextUrl.pathname;
  if (process.env.NEXT_PUBLIC_ACCOUNTS_ENABLED !== "true" && ACCOUNT_ROUTES.some((p) => path0 === p || path0.startsWith(`${p}/`))) {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(path + request.nextUrl.search)}`;
    return NextResponse.redirect(login);
  }
  return response;
}

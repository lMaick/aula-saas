import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

const protectedRoutes = ["/area", "/configuracoes"];
const guestOnlyRoutes = ["/entrar", "/cadastrar", "/recuperar-acesso"];

export async function updateSession(request: NextRequest) {
  const { url, publishableKey } = getSupabasePublicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (!user && protectedRoutes.some((route) => pathname.startsWith(route))) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/entrar";
    loginUrl.searchParams.set("mensagem", "Entre para acessar esta página.");
    return NextResponse.redirect(loginUrl);
  }

  if (user && guestOnlyRoutes.includes(pathname)) {
    const areaUrl = request.nextUrl.clone();
    areaUrl.pathname = "/area";
    areaUrl.search = "";
    return NextResponse.redirect(areaUrl);
  }

  return response;
}

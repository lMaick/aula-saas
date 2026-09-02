import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

const protectedRoutes = ["/dashboard", "/area", "/configuracoes", "/alunos", "/agenda", "/financeiro", "/onboarding", "/assinar", "/assinatura/retorno"];
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
  const protectedPath = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!user && protectedPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/entrar";
    loginUrl.searchParams.set("mensagem", "Entre para acessar esta página.");
    return NextResponse.redirect(loginUrl);
  }

  if (user && (protectedPath || guestOnlyRoutes.includes(pathname))) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .maybeSingle();
    const onboardingComplete = Boolean(profile?.onboarding_completed_at);
    const { data: accountStatus } = await supabase.rpc("normalize_current_account_access");
    const subscriptionPath = pathname === "/assinar" || pathname === "/assinatura/retorno";

    if (accountStatus === "expired" && !subscriptionPath) {
      const subscribeUrl = request.nextUrl.clone();
      subscribeUrl.pathname = "/assinar";
      subscribeUrl.search = "";
      return NextResponse.redirect(subscribeUrl);
    }

    if (accountStatus !== "expired" && !onboardingComplete && pathname !== "/onboarding") {
      const onboardingUrl = request.nextUrl.clone();
      onboardingUrl.pathname = "/onboarding";
      onboardingUrl.search = "";
      return NextResponse.redirect(onboardingUrl);
    }

    if (onboardingComplete && pathname === "/onboarding") {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      dashboardUrl.search = "";
      return NextResponse.redirect(dashboardUrl);
    }
  }

  if (user && guestOnlyRoutes.includes(pathname)) {
    const areaUrl = request.nextUrl.clone();
    areaUrl.pathname = "/dashboard";
    areaUrl.search = "";
    return NextResponse.redirect(areaUrl);
  }

  return response;
}

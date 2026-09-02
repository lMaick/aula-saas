import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function getCurrentSubscription() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, owner_id, provider_subscription_id, status, amount_cents, currency, activated_at, cancelled_at, current_period_end, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar a assinatura.");
  return data;
}

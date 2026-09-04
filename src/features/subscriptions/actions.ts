"use server";

import { redirect } from "next/navigation";

import { getSubscriptionPlanConfig } from "@/features/subscriptions/config";
import {
  cancelMercadoPagoSubscription,
  createMercadoPagoSubscription,
  getMercadoPagoSubscription,
} from "@/features/subscriptions/mercado-pago";
import { applyVerifiedSubscriptionState } from "@/features/subscriptions/service";
import { createSubscriptionAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function authenticatedContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email;
  if (!user || !email) redirect("/entrar");
  return { supabase, user: { ...user, email } };
}

function failurePath(base: string, error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("subscription_config_missing")) return `${base}?erro=payment_unavailable`;
  if (message.includes("subscription_owner_mismatch")) return `${base}?erro=subscription_invalid`;
  return `${base}?erro=provider_unavailable`;
}

const safeCheckoutErrors = new Set([
  "subscription_config_missing:AULA_SAAS_MONTHLY_PRICE_CENTS",
  "subscription_config_missing:MERCADO_PAGO_ACCESS_TOKEN",
  "subscription_config_missing:MERCADO_PAGO_WEBHOOK_SECRET",
  "subscription_config_missing:NEXT_PUBLIC_APP_URL",
  "subscription_price_invalid",
  "subscription_app_url_invalid",
  "subscription_reservation_failed",
  "subscription_binding_failed",
  "checkout_url_missing",
]);

function logSafeCheckoutError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  console.error("[AULA_SAAS_SUBSCRIPTION_CHECKOUT_ERROR]", {
    code: safeCheckoutErrors.has(message) ? message : "checkout_failed",
  });
}

export async function createSubscriptionCheckout() {
  const { supabase, user } = await authenticatedContext();
  let destination = "/assinar?erro=provider_unavailable";

  try {
    const plan = getSubscriptionPlanConfig();
    const admin = createSubscriptionAdminClient();
    const { data: reservationId, error: reserveError } = await admin.rpc(
      "reserve_subscription_checkout",
      { p_owner_id: user.id, p_amount_cents: plan.amountCents },
    );
    if (reserveError || !reservationId) throw new Error("subscription_reservation_failed");

    const { data: existing } = await supabase
      .from("subscriptions")
      .select("provider_subscription_id, checkout_url, status")
      .eq("id", reservationId)
      .eq("owner_id", user.id)
      .single();

    if (existing?.status === "active") destination = "/configuracoes?mensagem=Assinatura já ativa.";
    else if (existing?.provider_subscription_id) {
      const remote = await getMercadoPagoSubscription(existing.provider_subscription_id);
      await applyVerifiedSubscriptionState(remote, user.id);
      destination = remote.init_point || existing.checkout_url || "/assinar?erro=checkout_unavailable";
    } else {
      const remote = await createMercadoPagoSubscription({
        ownerId: user.id,
        email: user.email,
        amountCents: plan.amountCents,
        idempotencyKey: reservationId,
      });
      if (!remote.init_point) throw new Error("checkout_url_missing");

      const { error } = await admin.rpc("bind_subscription_provider", {
        p_subscription_id: reservationId,
        p_owner_id: user.id,
        p_provider_subscription_id: remote.id,
        p_provider_status: remote.status,
        p_checkout_url: remote.init_point,
      });
      if (error) throw new Error("subscription_binding_failed");
      destination = remote.init_point;
    }
  } catch (error) {
    logSafeCheckoutError(error);
    destination = failurePath("/assinar", error);
  }

  redirect(destination);
}

export async function synchronizeCurrentSubscription() {
  const { supabase, user } = await authenticatedContext();
  let destination = "/assinatura/retorno?erro=sync_failed";
  try {
    const { data } = await supabase
      .from("subscriptions")
      .select("provider_subscription_id")
      .eq("owner_id", user.id)
      .not("provider_subscription_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data?.provider_subscription_id) throw new Error("subscription_not_found");
    const remote = await getMercadoPagoSubscription(data.provider_subscription_id);
    await applyVerifiedSubscriptionState(remote, user.id);
    destination = remote.status === "authorized"
      ? "/dashboard?mensagem=Assinatura confirmada."
      : "/assinatura/retorno?mensagem=Assinatura ainda em processamento.";
  } catch (error) {
    destination = failurePath("/assinatura/retorno", error);
  }
  redirect(destination);
}

export async function cancelCurrentSubscription() {
  const { supabase, user } = await authenticatedContext();
  let destination = "/configuracoes?erro=cancel_failed";
  try {
    const { data } = await supabase
      .from("subscriptions")
      .select("provider_subscription_id, status")
      .eq("owner_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (!data?.provider_subscription_id) throw new Error("subscription_not_found");
    const remote = await cancelMercadoPagoSubscription(data.provider_subscription_id);
    await applyVerifiedSubscriptionState(remote, user.id);
    destination = "/assinar?mensagem=Assinatura cancelada.";
  } catch (error) {
    destination = failurePath("/configuracoes", error);
  }
  redirect(destination);
}

import "server-only";

import { mapMercadoPagoStatus } from "@/features/subscriptions/calculations";
import { getSubscriptionPlanConfig } from "@/features/subscriptions/config";
import { getMercadoPagoSubscription } from "@/features/subscriptions/mercado-pago";
import type { MercadoPagoSubscription } from "@/features/subscriptions/types";
import { createSubscriptionAdminClient } from "@/lib/supabase/admin";

function amountInCents(subscription: MercadoPagoSubscription) {
  const cents = Math.round(subscription.auto_recurring.transaction_amount * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new Error("subscription_amount_invalid");
  return cents;
}

export async function applyVerifiedSubscriptionState(
  subscription: MercadoPagoSubscription,
  expectedOwnerId?: string,
) {
  const ownerId = subscription.external_reference;
  if (!ownerId || (expectedOwnerId && ownerId !== expectedOwnerId)) {
    throw new Error("subscription_owner_mismatch");
  }

  const plan = getSubscriptionPlanConfig();
  const amountCents = amountInCents(subscription);
  if (amountCents !== plan.amountCents || subscription.auto_recurring.currency_id !== plan.currency) {
    throw new Error("subscription_plan_mismatch");
  }

  const admin = createSubscriptionAdminClient();
  const { error } = await admin.rpc("apply_subscription_provider_state", {
    p_owner_id: ownerId,
    p_provider_subscription_id: subscription.id,
    p_provider_status: subscription.status,
    p_status: mapMercadoPagoStatus(subscription.status),
    p_amount_cents: amountCents,
    p_currency: subscription.auto_recurring.currency_id,
    p_current_period_end: subscription.next_payment_date,
  });
  if (error) throw new Error("subscription_sync_failed");
}

export async function synchronizeSubscription(providerSubscriptionId: string, ownerId?: string) {
  const subscription = await getMercadoPagoSubscription(providerSubscriptionId);
  await applyVerifiedSubscriptionState(subscription, ownerId);
  return mapMercadoPagoStatus(subscription.status);
}

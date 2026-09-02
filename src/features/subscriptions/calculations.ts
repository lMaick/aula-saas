import type { SubscriptionStatus } from "@/features/subscriptions/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function remainingTrialDays(trialEndsAt: string, now = new Date()) {
  const remaining = new Date(trialEndsAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(remaining / DAY_MS));
}

export function isTrialValid(trialEndsAt: string, now = new Date()) {
  return new Date(trialEndsAt).getTime() > now.getTime();
}

export function subscriptionGrantsAccess(status: SubscriptionStatus | null) {
  return status === "active";
}

export function accountHasAccess(input: {
  trialEndsAt: string;
  subscriptionStatus: SubscriptionStatus | null;
  now?: Date;
}) {
  return subscriptionGrantsAccess(input.subscriptionStatus)
    || isTrialValid(input.trialEndsAt, input.now);
}

export function mapMercadoPagoStatus(status: string): SubscriptionStatus {
  if (status === "authorized") return "active";
  if (status === "paused") return "paused";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  return "pending";
}

import "server-only";

function required(name: string, configuredValue: string | undefined) {
  const value = configuredValue?.trim();
  if (!value) throw new Error(`subscription_config_missing:${name}`);
  return value;
}

export function getSubscriptionPlanConfig() {
  const amountCents = Number(required(
    "AULA_SAAS_MONTHLY_PRICE_CENTS",
    process.env.AULA_SAAS_MONTHLY_PRICE_CENTS,
  ));
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new Error("subscription_price_invalid");
  }

  return { amountCents, currency: "BRL" as const };
}

export function getMercadoPagoConfig() {
  const appUrl = required("SITE_URL", process.env.SITE_URL);
  const parsedUrl = new URL(appUrl);
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error("subscription_app_url_invalid");
  }

  return {
    accessToken: required(
      "MERCADO_PAGO_ACCESS_TOKEN",
      process.env.MERCADO_PAGO_ACCESS_TOKEN,
    ),
    webhookSecret: required(
      "MERCADO_PAGO_WEBHOOK_SECRET",
      process.env.MERCADO_PAGO_WEBHOOK_SECRET,
    ),
    appUrl: parsedUrl.origin,
  };
}

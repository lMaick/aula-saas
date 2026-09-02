import "server-only";

import { getMercadoPagoConfig } from "@/features/subscriptions/config";
import { buildMercadoPagoSubscriptionPayload } from "@/features/subscriptions/mercado-pago-contract";
import { mercadoPagoRequest } from "@/features/subscriptions/mercado-pago-http";
import type { MercadoPagoSubscription } from "@/features/subscriptions/types";

type Fetcher = typeof fetch;

async function request<T>(path: string, init: RequestInit = {}, fetcher: Fetcher = fetch) {
  const { accessToken } = getMercadoPagoConfig();
  return mercadoPagoRequest<T>({ accessToken, path, init, fetcher });
}

function parseSubscription(value: MercadoPagoSubscription) {
  if (!value?.id || !value.status || !value.auto_recurring) {
    throw new Error("mercado_pago_response_invalid");
  }
  return value;
}

export async function createMercadoPagoSubscription(input: {
  ownerId: string;
  email: string;
  amountCents: number;
  idempotencyKey: string;
}, fetcher?: Fetcher) {
  const { appUrl } = getMercadoPagoConfig();
  const result = await request<MercadoPagoSubscription>("/preapproval", {
    method: "POST",
    headers: { "X-Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify(buildMercadoPagoSubscriptionPayload({
      ownerId: input.ownerId,
      email: input.email,
      amountCents: input.amountCents,
      returnUrl: `${appUrl}/assinatura/retorno`,
    })),
  }, fetcher);
  return parseSubscription(result);
}

export async function getMercadoPagoSubscription(id: string, fetcher?: Fetcher) {
  return parseSubscription(await request<MercadoPagoSubscription>(
    `/preapproval/${encodeURIComponent(id)}`,
    {},
    fetcher,
  ));
}

export async function cancelMercadoPagoSubscription(id: string, fetcher?: Fetcher) {
  return parseSubscription(await request<MercadoPagoSubscription>(
    `/preapproval/${encodeURIComponent(id)}`,
    { method: "PUT", body: JSON.stringify({ status: "canceled" }) },
    fetcher,
  ));
}

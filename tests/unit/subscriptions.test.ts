import assert from "node:assert/strict";
import test from "node:test";

import {
  accountHasAccess,
  isTrialValid,
  mapMercadoPagoStatus,
  remainingTrialDays,
  subscriptionGrantsAccess,
} from "../../src/features/subscriptions/calculations.ts";
import { validateMercadoPagoWebhookSignature } from "../../src/features/subscriptions/webhook-signature.ts";
import { createHmac } from "node:crypto";
import { formatBrlFromCents } from "../../src/lib/money/brl.ts";
import { buildMercadoPagoSubscriptionPayload } from "../../src/features/subscriptions/mercado-pago-contract.ts";
import { mercadoPagoRequest } from "../../src/features/subscriptions/mercado-pago-http.ts";

const now = new Date("2026-09-02T12:00:00.000Z");

test("calcula dias restantes e validade do trial", () => {
  assert.equal(remainingTrialDays("2026-09-04T11:59:59.000Z", now), 2);
  assert.equal(remainingTrialDays("2026-09-01T00:00:00.000Z", now), 0);
  assert.equal(isTrialValid("2026-09-02T12:00:01.000Z", now), true);
  assert.equal(isTrialValid("2026-09-02T12:00:00.000Z", now), false);
});

test("diagnóstico do Mercado Pago registra apenas campos seguros", async () => {
  const original = console.error;
  let logged: unknown;
  console.error = (...args: unknown[]) => { logged = args; };
  try {
    await assert.rejects(() => mercadoPagoRequest({
      accessToken: "super-secret-token",
      path: "/preapproval",
      init: { method: "POST", headers: { Authorization: "Bearer super-secret-token" }, body: JSON.stringify({ payer_email: "person@example.com" }) },
      fetcher: (async () => new Response(JSON.stringify({ error: "bad_request", message: "invalid payload", code: "X", cause: [{ code: "C", description: "Campo inválido" }] }), { status: 400 })) as typeof fetch,
    }), /mercado_pago_request_failed:400/);
  } finally { console.error = original; }
  const rendered = JSON.stringify(logged);
  assert.match(rendered, /bad_request/);
  assert.match(rendered, /Campo inválido/);
  assert.doesNotMatch(rendered, /super-secret-token|Authorization|payer_email|person@example.com/);
});

test("diagnóstico tolera resposta de erro não-JSON", async () => {
  await assert.rejects(() => mercadoPagoRequest({
    accessToken: "test-token",
    path: "/preapproval",
    fetcher: (async () => new Response("provider unavailable", { status: 502 })) as typeof fetch,
  }), /mercado_pago_request_failed:502/);
});

test("trial válido ou assinatura ativa garantem acesso", () => {
  assert.equal(accountHasAccess({ trialEndsAt: "2026-09-03T00:00:00Z", subscriptionStatus: null, now }), true);
  assert.equal(accountHasAccess({ trialEndsAt: "2026-09-01T00:00:00Z", subscriptionStatus: "active", now }), true);
  assert.equal(accountHasAccess({ trialEndsAt: "2026-09-01T00:00:00Z", subscriptionStatus: "pending", now }), false);
  assert.equal(subscriptionGrantsAccess("paused"), false);
  assert.equal(subscriptionGrantsAccess("cancelled"), false);
});

test("mapeia estados externos para o domínio interno", () => {
  assert.equal(mapMercadoPagoStatus("authorized"), "active");
  assert.equal(mapMercadoPagoStatus("pending"), "pending");
  assert.equal(mapMercadoPagoStatus("paused"), "paused");
  assert.equal(mapMercadoPagoStatus("canceled"), "cancelled");
  assert.equal(mapMercadoPagoStatus("cancelled"), "cancelled");
  assert.equal(mapMercadoPagoStatus("unknown"), "pending");
});

test("preço usa a formatação BRL existente", () => {
  assert.equal(formatBrlFromCents(2990), "R$ 29,90");
});

test("valida a assinatura HMAC oficial do webhook", () => {
  const secret = "test-secret";
  const manifest = "id:abc123;request-id:req-1;ts:123456;";
  const digest = createHmac("sha256", secret).update(manifest).digest("hex");
  assert.equal(validateMercadoPagoWebhookSignature({ signature: `ts=123456,v1=${digest}`, requestId: "req-1", dataId: "ABC123", secret }), true);
  assert.equal(validateMercadoPagoWebhookSignature({ signature: "ts=123456,v1=00", requestId: "req-1", dataId: "ABC123", secret }), false);
});

test("contrato de checkout usa referência, preço e retorno definidos pelo servidor", () => {
  const payload = buildMercadoPagoSubscriptionPayload({ ownerId: "owner-1", email: "professor@example.com", amountCents: 2990, returnUrl: "https://app.example.com/assinatura/retorno" });
  assert.equal(payload.external_reference, "owner-1");
  assert.equal(payload.auto_recurring.transaction_amount, 29.9);
  assert.equal(payload.auto_recurring.currency_id, "BRL");
  assert.equal(payload.status, "pending");
  assert.equal(payload.back_url, "https://app.example.com/assinatura/retorno");
});

test("fronteira HTTP envia token apenas no header e trata falhas", async () => {
  let capturedUrl = "";
  let capturedAuthorization = "";
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    capturedUrl = String(url);
    capturedAuthorization = String(new Headers(init?.headers).get("Authorization"));
    return new Response(JSON.stringify({ id: "preapproval-1" }), { status: 200 });
  }) as typeof fetch;
  const result = await mercadoPagoRequest<{ id: string }>({ accessToken: "test-token", path: "/preapproval/1", fetcher });
  assert.equal(result.id, "preapproval-1");
  assert.equal(capturedUrl, "https://api.mercadopago.com/preapproval/1");
  assert.equal(capturedAuthorization, "Bearer test-token");

  await assert.rejects(() => mercadoPagoRequest({ accessToken: "test-token", path: "/preapproval", fetcher: (async () => new Response("", { status: 503 })) as typeof fetch }), /mercado_pago_request_failed:503/);
});

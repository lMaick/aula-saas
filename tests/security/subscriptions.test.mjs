import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (path) => readFile(join(root, path), "utf8");
const migration = await read("supabase/migrations/20260902150000_create_saas_subscriptions.sql");
const hardening = await read("supabase/migrations/20260902160000_harden_subscription_checkout.sql");
const actions = await read("src/features/subscriptions/actions.ts");
const service = await read("src/features/subscriptions/service.ts");
const client = await read("src/features/subscriptions/mercado-pago.ts");
const http = await read("src/features/subscriptions/mercado-pago-http.ts");
const config = await read("src/features/subscriptions/config.ts");
const webhook = await read("src/app/api/webhooks/mercado-pago/route.ts");
const proxy = await read("src/lib/supabase/proxy.ts");

test("subscriptions possui RLS somente leitura por auth.uid", () => {
  assert.match(migration, /alter table public\.subscriptions enable row level security/i);
  assert.match(migration, /for select[\s\S]*auth\.uid\(\)[\s\S]*owner_id/i);
  assert.match(migration, /revoke all on table public\.subscriptions from anon, authenticated/i);
  assert.match(migration, /grant select on table public\.subscriptions to authenticated/i);
  assert.doesNotMatch(migration, /grant (insert|update|delete).*subscriptions to authenticated/i);
  assert.doesNotMatch(migration, /for delete/i);
});

test("cliente não controla owner, preço ou identificador do provedor", () => {
  assert.doesNotMatch(actions, /formData|p_owner_id\s*:\s*form|amount_cents\s*:\s*form/i);
  assert.match(actions, /getSubscriptionPlanConfig\(\)/);
  assert.match(actions, /supabase\.auth\.getUser\(\)/);
  assert.match(actions, /\.eq\("owner_id", user\.id\)/);
  assert.match(actions, /provider_subscription_id/);
  assert.match(actions, /admin\.rpc\([\s\S]*"reserve_subscription_checkout"/);
  assert.match(hardening, /revoke all on function public\.reserve_subscription_checkout\(uuid, integer\) from public, anon, authenticated/);
  assert.match(hardening, /grant execute on function public\.reserve_subscription_checkout\(uuid, integer\) to service_role/);
});

test("checkout, sincronização e cancelamento autenticam", () => {
  assert.match(actions, /async function authenticatedContext[\s\S]*auth\.getUser/);
  for (const name of ["createSubscriptionCheckout", "synchronizeCurrentSubscription", "cancelCurrentSubscription"]) {
    assert.match(actions, new RegExp(`function ${name}[\\s\\S]*authenticatedContext\\(\\)`));
  }
});

test("diagnóstico do checkout registra somente códigos internos permitidos", () => {
  assert.match(actions, /\[AULA_SAAS_SUBSCRIPTION_CHECKOUT_ERROR\]/);
  assert.match(actions, /safeCheckoutErrors\.has\(message\)/);
  assert.doesNotMatch(actions, /console\.error\([\s\S]{0,300}(user\.email|user\.id|reservationId|accessToken|provider_subscription_id)/);
});

test("webhook valida HMAC e consulta a API antes de atualizar acesso", () => {
  assert.match(webhook, /validateMercadoPagoWebhookSignature/);
  assert.match(webhook, /synchronizeSubscription\(dataId\)/);
  assert.match(service, /getMercadoPagoSubscription\(providerSubscriptionId\)/);
  assert.match(service, /applyVerifiedSubscriptionState/);
  assert.doesNotMatch(webhook, /owner_id|account_status|\.from\("profiles"\)/);
});

test("retorno não ativa a conta por query string", async () => {
  const page = await read("src/app/assinatura/retorno/page.tsx");
  assert.doesNotMatch(page, /searchParams[\s\S]*(success|approved|provider_subscription_id)/i);
  assert.doesNotMatch(page, /account_status|\.update\(/);
});

test("segredos permanecem server-side", () => {
  assert.match(client, /import "server-only"/);
  assert.match(config, /import "server-only"/);
  assert.match(http, /Authorization: `Bearer/);
  assert.doesNotMatch(`${client}\n${http}`, /NEXT_PUBLIC_MERCADO|NEXT_PUBLIC.*TOKEN/i);
  assert.doesNotMatch(`${actions}\n${webhook}`, /formData\.get\(["'](owner_id|price|provider)/i);
  assert.doesNotMatch(config, /process\.env\s*\[/);
  for (const name of [
    "AULA_SAAS_MONTHLY_PRICE_CENTS",
    "MERCADO_PAGO_ACCESS_TOKEN",
    "MERCADO_PAGO_WEBHOOK_SECRET",
    "NEXT_PUBLIC_APP_URL",
  ]) {
    assert.match(config, new RegExp(`process\\.env\\.${name}`));
  }
});

test("paywall protege áreas normais e libera rotas de assinatura", () => {
  assert.match(proxy, /accountStatus === "expired" && !subscriptionPath/);
  assert.match(proxy, /pathname === "\/assinar" \|\| pathname === "\/assinatura\/retorno"/);
  assert.match(proxy, /normalize_current_account_access/);
});

test("RPCs sensíveis têm contrato estreito e grants restritos", () => {
  assert.match(migration, /security definer/gi);
  assert.match(migration, /set search_path = public, pg_temp/gi);
  assert.match(migration, /grant execute on function public\.apply_subscription_provider_state[\s\S]*to service_role/);
  assert.doesNotMatch(migration, /grant execute on function public\.apply_subscription_provider_state[\s\S]*to (anon|authenticated)/);
  assert.match(migration, /unique index subscriptions_owner_open_unique/);
  assert.match(migration, /unique index subscriptions_provider_id_unique/);
});

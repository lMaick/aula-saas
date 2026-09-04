import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after, beforeEach } from "node:test";

import ts from "typescript";

const source = (
  await readFile(
    new URL("../../src/features/subscriptions/config.ts", import.meta.url),
    "utf8",
  )
).replace('import "server-only";', "");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { getMercadoPagoConfig, getSubscriptionPlanConfig } = (await import(moduleUrl)) as {
  getMercadoPagoConfig: () => {
    accessToken: string;
    webhookSecret: string;
    appUrl: string;
  };
  getSubscriptionPlanConfig: () => { amountCents: number; currency: "BRL" };
};

const names = [
  "AULA_SAAS_MONTHLY_PRICE_CENTS",
  "MERCADO_PAGO_ACCESS_TOKEN",
  "MERCADO_PAGO_WEBHOOK_SECRET",
  "SITE_URL",
] as const;
const originals = Object.fromEntries(names.map((name) => [name, process.env[name]]));

function setValidValues() {
  process.env.AULA_SAAS_MONTHLY_PRICE_CENTS = "2990";
  process.env.MERCADO_PAGO_ACCESS_TOKEN = "test-access-token";
  process.env.MERCADO_PAGO_WEBHOOK_SECRET = "test-webhook-secret";
  process.env.SITE_URL = "https://aula.example.test/path";
}

beforeEach(setValidValues);

after(() => {
  for (const name of names) {
    const original = originals[name];
    if (original === undefined) delete process.env[name];
    else process.env[name] = original;
  }
});

test("lê a configuração da assinatura por referências estáticas", () => {
  assert.deepEqual(getSubscriptionPlanConfig(), { amountCents: 2990, currency: "BRL" });
  assert.deepEqual(getMercadoPagoConfig(), {
    accessToken: "test-access-token",
    webhookSecret: "test-webhook-secret",
    appUrl: "https://aula.example.test",
  });
});

for (const name of names) {
  test(`identifica ${name} quando ausente`, () => {
    delete process.env[name];
    const readConfig = name === "AULA_SAAS_MONTHLY_PRICE_CENTS"
      ? getSubscriptionPlanConfig
      : getMercadoPagoConfig;
    assert.throws(readConfig, new RegExp(`subscription_config_missing:${name}`));
  });
}

test("não usa acesso dinâmico às variáveis de assinatura", () => {
  assert.doesNotMatch(source, /process\.env\s*\[/);
});

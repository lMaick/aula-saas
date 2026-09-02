import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

import { getSupabasePublicEnv } from "../../src/lib/supabase/env.ts";

const variableNames = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
] as const;

const originalValues = Object.fromEntries(
  variableNames.map((name) => [name, process.env[name]]),
);

function setValidValues() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.example.test";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "public-test-key";
  process.env.NEXT_PUBLIC_SITE_URL = "https://app.example.test";
}

beforeEach(setValidValues);

after(() => {
  for (const name of variableNames) {
    const original = originalValues[name];
    if (original === undefined) delete process.env[name];
    else process.env[name] = original;
  }
});

test("retorna as três variáveis públicas quando estão presentes", () => {
  assert.deepEqual(getSupabasePublicEnv(), {
    url: "https://project.example.test",
    publishableKey: "public-test-key",
    siteUrl: "https://app.example.test",
  });
});

test("lista somente a URL do Supabase quando ausente", () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  assert.throws(getSupabasePublicEnv, /NEXT_PUBLIC_SUPABASE_URL/);
});

test("lista somente a chave publicável quando ausente", () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assert.throws(getSupabasePublicEnv, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
});

test("lista somente a URL do site quando ausente", () => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
  assert.throws(getSupabasePublicEnv, /NEXT_PUBLIC_SITE_URL/);
});

test("lista somente as múltiplas variáveis ausentes", () => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SITE_URL;

  assert.throws(
    getSupabasePublicEnv,
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /NEXT_PUBLIC_SUPABASE_URL/);
      assert.match(error.message, /NEXT_PUBLIC_SITE_URL/);
      assert.doesNotMatch(error.message, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
      return true;
    },
  );
});

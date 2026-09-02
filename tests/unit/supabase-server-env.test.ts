import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after, beforeEach } from "node:test";

import ts from "typescript";

const source = (
  await readFile(
    new URL("../../src/lib/supabase/server-env.ts", import.meta.url),
    "utf8",
  )
).replace('import "server-only";', "");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { getSupabaseServerEnv } = (await import(moduleUrl)) as {
  getSupabaseServerEnv: () => {
    url: string;
    publishableKey: string;
    siteUrl: string;
  };
};

const originalValues = {
  url: process.env.SUPABASE_URL,
  publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  siteUrl: process.env.SITE_URL,
};

function setValidValues() {
  process.env.SUPABASE_URL = "https://server-project.example.test";
  process.env.SUPABASE_PUBLISHABLE_KEY = "server-public-test-key";
  process.env.SITE_URL = "https://server-app.example.test";
}

beforeEach(setValidValues);

after(() => {
  if (originalValues.url === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = originalValues.url;
  if (originalValues.publishableKey === undefined)
    delete process.env.SUPABASE_PUBLISHABLE_KEY;
  else process.env.SUPABASE_PUBLISHABLE_KEY = originalValues.publishableKey;
  if (originalValues.siteUrl === undefined) delete process.env.SITE_URL;
  else process.env.SITE_URL = originalValues.siteUrl;
});

test("retorna somente a configuração server-side quando completa", () => {
  assert.deepEqual(getSupabaseServerEnv(), {
    url: "https://server-project.example.test",
    publishableKey: "server-public-test-key",
    siteUrl: "https://server-app.example.test",
  });
});

test("identifica SUPABASE_URL quando ausente", () => {
  delete process.env.SUPABASE_URL;
  assert.throws(getSupabaseServerEnv, /SUPABASE_URL/);
});

test("identifica SUPABASE_PUBLISHABLE_KEY quando ausente", () => {
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  assert.throws(getSupabaseServerEnv, /SUPABASE_PUBLISHABLE_KEY/);
});

test("identifica SITE_URL quando ausente", () => {
  delete process.env.SITE_URL;
  assert.throws(getSupabaseServerEnv, /SITE_URL/);
});

test("lista somente as variáveis server-side ausentes", () => {
  delete process.env.SUPABASE_URL;
  delete process.env.SITE_URL;

  assert.throws(getSupabaseServerEnv, (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /SUPABASE_URL/);
    assert.match(error.message, /SITE_URL/);
    assert.doesNotMatch(error.message, /SUPABASE_PUBLISHABLE_KEY/);
    assert.doesNotMatch(error.message, /NEXT_PUBLIC_/);
    return true;
  });
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");
const [publicEnv, serverEnv, server, client, proxy, admin, authActions, envExample] =
  await Promise.all([
    read("src/lib/supabase/env.ts"),
    read("src/lib/supabase/server-env.ts"),
    read("src/lib/supabase/server.ts"),
    read("src/lib/supabase/client.ts"),
    read("src/lib/supabase/proxy.ts"),
    read("src/lib/supabase/admin.ts"),
    read("src/features/auth/actions.ts"),
    read(".env.example"),
  ]);

test("separa configuração pública e server-side sem acessos dinâmicos", () => {
  assert.match(serverEnv, /import "server-only"/);
  assert.match(serverEnv, /process\.env\.SUPABASE_URL/);
  assert.match(serverEnv, /process\.env\.SUPABASE_PUBLISHABLE_KEY/);
  assert.match(serverEnv, /process\.env\.SITE_URL/);
  assert.doesNotMatch(serverEnv, /NEXT_PUBLIC_/);
  assert.doesNotMatch(`${publicEnv}\n${serverEnv}`, /process\.env\s*\[/);
});

test("cliente server-side, proxy e redirects usam somente a configuração do servidor", () => {
  assert.match(server, /getSupabaseServerEnv/);
  assert.doesNotMatch(server, /getSupabasePublicEnv|NEXT_PUBLIC_/);
  assert.match(proxy, /getSupabaseServerEnv/);
  assert.doesNotMatch(proxy, /getSupabasePublicEnv|NEXT_PUBLIC_/);
  assert.match(authActions, /getSupabaseServerEnv/);
  assert.doesNotMatch(authActions, /getSupabasePublicEnv|NEXT_PUBLIC_/);
});

test("browser usa somente configuração pública e não recebe chaves privilegiadas", () => {
  assert.match(client, /getSupabasePublicEnv/);
  assert.doesNotMatch(client, /getSupabaseServerEnv|SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(publicEnv, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("signup usa cliente de sessão normal e não service role", () => {
  assert.match(authActions, /createClient\(\)/);
  assert.doesNotMatch(authActions, /createSubscriptionAdminClient|SUPABASE_SERVICE_ROLE_KEY/);
});

test("cliente administrativo permanece server-only e usa URL server-side", () => {
  assert.match(admin, /import "server-only"/);
  assert.match(admin, /getSupabaseServerEnv/);
  assert.doesNotMatch(admin, /getSupabasePublicEnv|NEXT_PUBLIC_/);
});

test("exemplo documenta os dois grupos sem segredo público", () => {
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SITE_URL",
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "SITE_URL",
  ]) {
    assert.match(envExample, new RegExp(`^${name}=`, "m"));
  }
  assert.doesNotMatch(envExample, /NEXT_PUBLIC_.*(?:SECRET|SERVICE_ROLE|ACCESS_TOKEN)/);
});

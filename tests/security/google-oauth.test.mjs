import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");
const [actions, callback, login, signup, serverEnv, admin] = await Promise.all([
  read("src/features/auth/actions.ts"),
  read("src/app/auth/callback/route.ts"),
  read("src/app/(auth)/entrar/page.tsx"),
  read("src/app/(auth)/cadastrar/page.tsx"),
  read("src/lib/supabase/server-env.ts"),
  read("src/lib/supabase/admin.ts"),
]);

test("Google OAuth usa o cliente de sessão e SITE_URL no redirect", () => {
  assert.match(actions, /signInWithGoogle/);
  assert.match(actions, /signInWithOAuth\(\{[\s\S]*provider: "google"/);
  assert.match(actions, /redirectTo: `\$\{siteUrl\}\/auth\/callback\?next=\/dashboard`/);
  assert.match(actions, /const supabase = await createClient\(\)/);
  assert.doesNotMatch(actions, /SUPABASE_SERVICE_ROLE_KEY|createAdmin/);
  assert.doesNotMatch(actions, /request\.url|headers\(\)|owner_id/);
  assert.match(serverEnv, /process\.env\.SITE_URL/);
});

test("falha OAuth não expõe detalhes técnicos", () => {
  assert.match(actions, /error \|\| !data\.url/);
  assert.match(actions, /\/entrar\?erro=oauth_failed/);
});

test("callback troca código, aceita somente paths internos e trata erro OAuth", () => {
  assert.match(callback, /exchangeCodeForSession\(code\)/);
  assert.match(callback, /startsWith\("\/"\) && !value\.startsWith\("\/\/"\)/);
  assert.match(callback, /oauthError/);
  assert.match(callback, /oauth_failed/);
});

test("login e cadastro preservam formulário e oferecem Google", () => {
  for (const page of [login, signup]) {
    assert.match(page, /GoogleAuthButton/);
    assert.match(page, /type="email"/);
    assert.match(page, /type="password"/);
  }
  assert.match(signup, /name="name"/);
});

test("nenhum segredo Google ou service role chega ao OAuth", () => {
  assert.doesNotMatch(`${actions}\n${login}\n${signup}`, /GOOGLE_CLIENT_SECRET|NEXT_PUBLIC_GOOGLE/);
  assert.doesNotMatch(`${login}\n${signup}`, /SUPABASE_SERVICE_ROLE_KEY|MERCADO_PAGO_ACCESS_TOKEN/);
  assert.match(admin, /server-only/);
});

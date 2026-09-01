import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migration = await readFile(join(root, "supabase/migrations/20260902140000_create_refined_onboarding.sql"), "utf8");
const actions = await readFile(join(root, "src/features/onboarding/actions.ts"), "utf8");
const queries = await readFile(join(root, "src/features/onboarding/queries.ts"), "utf8");
const proxy = await readFile(join(root, "src/lib/supabase/proxy.ts"), "utf8");
const appLayout = await readFile(join(root, "src/app/(app)/layout.tsx"), "utf8");

test("usuário anônimo não acessa onboarding privado", () => {
  assert.match(proxy, /protectedRoutes[\s\S]*"\/onboarding"/);
  assert.match(proxy, /if \(!user && protectedPath\)[\s\S]*pathname = "\/entrar"/);
});

test("incompleto vai ao onboarding e concluído segue ao dashboard", () => {
  assert.match(proxy, /select\("onboarding_completed_at"\)/);
  assert.match(proxy, /!onboardingComplete && pathname !== "\/onboarding"[\s\S]*pathname = "\/onboarding"/);
  assert.match(proxy, /onboardingComplete && pathname === "\/onboarding"[\s\S]*pathname = "\/dashboard"/);
  assert.match(appLayout, /!profile\.onboarding_completed_at[\s\S]*redirect\("\/onboarding"\)/);
});

test("actions autenticam e nunca recebem owner_id", () => {
  assert.match(actions, /supabase\.auth\.getUser\(\)/);
  assert.doesNotMatch(actions, /formData\.get\("owner_id"\)|name="owner_id"|p_owner_id/);
  assert.match(actions, /\.eq\("owner_id", user\.id\)/);
});

test("queries isolam aluno, recorrência e pacote pelo professor", () => {
  for (const table of ["students", "packages", "lesson_recurrences"]) {
    assert.match(queries, new RegExp(`from\\(\"${table}\"\\)[\\s\\S]*?eq\\(\"owner_id\", user\\.id\\)`));
  }
});

test("RPCs críticas derivam tenant de auth.uid e são restritas", () => {
  assert.match(migration, /security definer/gi);
  assert.match(migration, /set search_path = public, pg_temp/gi);
  assert.ok((migration.match(/auth\.uid\(\)/g) ?? []).length >= 10);
  assert.doesNotMatch(migration, /p_owner_id/);
  assert.match(migration, /revoke all on function public\.create_onboarding_student[\s\S]*from public, anon/);
  assert.match(migration, /grant execute on function public\.complete_onboarding_with_schedule[\s\S]*to authenticated/);
});

test("cliente não pode marcar onboarding como concluído diretamente", () => {
  assert.match(migration, /revoke update \(onboarding_completed_at\)[\s\S]*from authenticated/);
  assert.match(migration, /set onboarding_completed_at = coalesce\(onboarding_completed_at, now\(\)\)/);
});

test("usuários anteriores recebem backfill sem alterar criação de novos perfis", () => {
  assert.match(migration, /update public\.profiles[\s\S]*where onboarding_completed_at is null/);
  assert.doesNotMatch(migration, /handle_new_user|alter column onboarding_completed_at set default/);
});

test("onboarding reutiliza regras existentes de pacote e recorrência", () => {
  assert.match(migration, /public\.create_lesson_package\(/);
  assert.match(migration, /public\.create_weekly_recurrence\(/);
  assert.match(migration, /for update/gi);
  assert.doesNotMatch(migration, /insert into public\.charges/);
});

test("por aula e mensal não criam cobrança no onboarding", () => {
  assert.match(migration, /if student_row\.billing_model = 'package'/);
  assert.doesNotMatch(actions, /create_monthly_charge|complete_lesson/);
  assert.doesNotMatch(actions, /\.from\("charges"\)/);
});

test("nenhuma RLS é removida ou relaxada e não há service role", () => {
  assert.doesNotMatch(migration, /disable row level security|drop policy|create policy/i);
  assert.doesNotMatch(`${migration}\n${actions}\n${queries}\n${proxy}`, /service_role/i);
});

import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const migration = (await readFile(new URL("../../supabase/migrations/20260901210000_create_lesson_packages.sql", import.meta.url), "utf8")).toLowerCase()
const packageActions = await readFile(new URL("../../src/features/packages/actions.ts", import.meta.url), "utf8")
const lessonActions = await readFile(new URL("../../src/features/lessons/actions.ts", import.meta.url), "utf8")
const financeQueries = await readFile(new URL("../../src/features/finance/queries.ts", import.meta.url), "utf8")

test("packages possui limites, estados e um ativo por aluno", () => {
  assert.match(migration, /total_lessons integer not null check \(total_lessons > 0\)/)
  assert.match(migration, /used_lessons integer not null default 0 check \(used_lessons >= 0\)/)
  assert.match(migration, /used_lessons <= total_lessons/)
  assert.match(migration, /status in \('active', 'completed', 'cancelled'\)/)
  assert.match(migration, /unique index packages_one_active_per_student[\s\S]*where status = 'active'/)
})

test("somente aluno package ativo e do professor pode receber pacote", () => {
  assert.match(migration, /where id = p_student_id[\s\S]*owner_id = auth\.uid\(\)[\s\S]*status = 'active'[\s\S]*billing_model = 'package'/)
  assert.match(migration, /foreign key \(student_id, owner_id\)[\s\S]*students \(id, owner_id\)/)
})

test("criação de package e charge ocorre na mesma RPC", () => {
  assert.match(migration, /function public\.create_lesson_package/)
  assert.match(migration, /insert into public\.packages[\s\S]*insert into public\.charges/)
  assert.match(migration, /'pacote de ' \|\| p_total_lessons \|\| ' aulas'/)
  assert.match(migration, /p_amount_cents, p_starts_on/)
})

test("charge package possui origem exclusiva e idempotente", () => {
  assert.match(migration, /billing_model in \('per_lesson', 'monthly', 'package'\)/)
  assert.match(migration, /billing_model = 'package' and lesson_id is null[\s\S]*package_id is not null and reference_month is null/)
  assert.match(migration, /foreign key \(package_id, owner_id\)[\s\S]*packages \(id, owner_id\)/)
  assert.match(migration, /unique index charges_package_unique[\s\S]*where package_id is not null/)
  assert.match(financeQueries, /package_id/)
})

test("conclusão bloqueia aula e pacote antes de consumir", () => {
  const lessonLock = migration.indexOf("where id = p_lesson_id and owner_id = auth.uid()\n  for update")
  const packageLock = migration.indexOf("and status = 'active'\n    for update")
  const consumption = migration.indexOf("set used_lessons = used_lessons + 1")
  assert.ok(lessonLock > 0 && packageLock > lessonLock && consumption > packageLock)
  assert.match(migration, /when used_lessons \+ 1 = total_lessons then 'completed'/)
})

test("a mesma aula não consome o pacote novamente", () => {
  assert.match(migration, /if lesson_row\.status = 'completed' then[\s\S]*return charge_id/)
  assert.match(migration, /update public\.lessons[\s\S]*status = 'completed'[\s\S]*update public\.packages/)
})

test("ausência, saldo e validade são falhas antes da conclusão", () => {
  const lessonUpdate = migration.indexOf("update public.lessons\n  set status = 'completed'")
  for (const error of ["package_not_available", "package_expired", "package_balance_empty"]) {
    const position = migration.indexOf(`raise exception '${error}'`)
    assert.ok(position > 0 && position < lessonUpdate)
    assert.match(lessonActions, new RegExp(error))
  }
  assert.match(migration, /now\(\) at time zone profile_timezone/)
})

test("per_lesson e monthly mantêm seus comportamentos", () => {
  assert.match(migration, /if student_row\.billing_model = 'per_lesson' then[\s\S]*insert into public\.charges/)
  assert.match(migration, /elsif student_row\.billing_model = 'package' then[\s\S]*update public\.packages/)
  assert.doesNotMatch(migration, /student_row\.billing_model = 'monthly'[\s\S]*insert into public\.charges/)
})

test("cancelamento preserva uso, cobrança e histórico", () => {
  assert.match(migration, /function public\.cancel_lesson_package[\s\S]*set status = 'cancelled'/)
  assert.doesNotMatch(migration, /delete from public\.packages|delete from public\.charges/)
  assert.doesNotMatch(migration, /set used_lessons = 0/)
})

test("RLS permite somente leitura própria e RPCs seguras", () => {
  assert.match(migration, /alter table public\.packages enable row level security/)
  assert.match(migration, /using \(\(select auth\.uid\(\)\) = owner_id\)/)
  assert.match(migration, /revoke all on table public\.packages from anon, authenticated/)
  assert.match(migration, /grant select on table public\.packages to authenticated/)
  assert.doesNotMatch(migration, /grant (insert|update|delete).*public\.packages/)
  assert.doesNotMatch(packageActions, /formData\.get\(["']owner_id["']\)|owner_id\s*:/)
  assert.equal((migration.match(/security definer/g) ?? []).length, 3)
  assert.equal((migration.match(/set search_path = public, pg_temp/g) ?? []).length, 3)
  assert.doesNotMatch(migration, /grant execute[^;]*to anon/)
})

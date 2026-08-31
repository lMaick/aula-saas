import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const migration = (await readFile(new URL("../../supabase/migrations/20260901170000_create_basic_finance.sql", import.meta.url), "utf8")).toLowerCase()
const lessonActions = await readFile(new URL("../../src/features/lessons/actions.ts", import.meta.url), "utf8")
const financeActions = await readFile(new URL("../../src/features/finance/actions.ts", import.meta.url), "utf8")

test("charges preserva centavos, origem e valor histórico", () => {
  assert.match(migration, /amount_cents integer not null/)
  assert.match(migration, /student_row\.billing_amount_cents, local_lesson_date/)
  assert.match(migration, /billing_model = 'per_lesson' and lesson_id is not null and reference_month is null/)
  assert.match(migration, /billing_model = 'monthly' and lesson_id is null and reference_month is not null/)
})

test("conclusão da aula e cobrança por aula são atômicas e idempotentes", () => {
  assert.match(migration, /function public\.complete_lesson/)
  assert.match(migration, /update public\.lessons[\s\S]*set status = 'completed'[\s\S]*insert into public\.charges/)
  assert.match(migration, /unique index charges_lesson_unique/)
  assert.match(migration, /on conflict \(lesson_id\)[\s\S]*do nothing/)
  assert.match(lessonActions, /\.rpc\("complete_lesson"/)
  assert.doesNotMatch(lessonActions, /\.update\(\{ status: "completed"/)
  assert.match(migration, /revoke update \(status\) on table public\.lessons from authenticated/)
})

test("somente per_lesson cria cobrança automática", () => {
  assert.match(migration, /if student_row\.billing_model = 'per_lesson' then[\s\S]*insert into public\.charges/)
  assert.doesNotMatch(migration, /billing_model = 'monthly' then[\s\S]*insert into public\.charges/)
  assert.doesNotMatch(migration, /billing_model = 'package' then[\s\S]*insert into public\.charges/)
})

test("aulas concluídas anteriormente não recebem cobrança retroativa", () => {
  assert.doesNotMatch(migration, /insert into public\.charges[\s\S]*from public\.lessons/)
  assert.doesNotMatch(migration, /create trigger[\s\S]*on public\.lessons/)
  assert.match(migration, /if lesson_row\.status = 'completed' then[\s\S]*return charge_id/)
})

test("mensalidade é estruturada e única por competência", () => {
  assert.match(migration, /reference_month = date_trunc\('month', reference_month\)::date/)
  assert.match(migration, /unique index charges_monthly_reference_unique[\s\S]*owner_id, student_id, reference_month/)
  assert.match(migration, /monthly_charge_duplicate/)
  assert.doesNotMatch(financeActions, /amount_cents|billing_amount_cents/)
})

test("data de vencimento da aula usa timezone do perfil", () => {
  assert.match(migration, /select timezone into profile_timezone[\s\S]*lesson_row\.starts_at at time zone profile_timezone/)
})

test("RLS e chaves compostas isolam professor, aluno e aula", () => {
  assert.match(migration, /alter table public\.charges enable row level security/)
  assert.match(migration, /using \(\(select auth\.uid\(\)\) = owner_id\)/)
  assert.match(migration, /foreign key \(student_id, owner_id\)[\s\S]*students \(id, owner_id\)/)
  assert.match(migration, /foreign key \(lesson_id, owner_id\)[\s\S]*lessons \(id, owner_id\)/)
  assert.doesNotMatch(financeActions, /formData\.get\(["']owner_id["']\)|owner_id\s*:/)
})

test("cliente não altera charges diretamente e não possui DELETE", () => {
  assert.match(migration, /revoke all on table public\.charges from anon, authenticated/)
  assert.match(migration, /grant select on table public\.charges to authenticated/)
  assert.doesNotMatch(migration, /grant (insert|update|delete).*public\.charges/)
  assert.doesNotMatch(migration, /for delete|delete from public\.charges/)
})

test("pagamento é registrado no banco com paid_at", () => {
  assert.match(migration, /function public\.mark_charge_paid/)
  assert.match(migration, /set status = 'paid', paid_at = payment_time/)
  assert.match(migration, /owner_id = auth\.uid\(\) and status = 'pending'/)
})

test("RPCs são restritas a authenticated e têm search_path seguro", () => {
  assert.equal((migration.match(/security definer/g) ?? []).length, 4)
  assert.equal((migration.match(/set search_path = public, pg_temp/g) ?? []).length, 4)
  assert.equal((migration.match(/revoke all on function/g) ?? []).length, 4)
  assert.equal((migration.match(/grant execute on function/g) ?? []).length, 4)
  assert.doesNotMatch(migration, /grant execute[^;]*to anon/)
})

import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const baseMigration = (await readFile(new URL("../../supabase/migrations/20260902110000_create_lesson_makeups.sql", import.meta.url), "utf8")).toLowerCase()
const historyMigration = (await readFile(new URL("../../supabase/migrations/20260902120000_preserve_makeup_package_history.sql", import.meta.url), "utf8")).toLowerCase()
const migration = `${baseMigration}\n${historyMigration}`
const actions = await readFile(new URL("../../src/features/lessons/actions.ts", import.meta.url), "utf8")

test("status e vínculo de reposição preservam aulas existentes", () => {
  assert.match(migration, /status in \('scheduled', 'completed', 'cancelled', 'makeup_pending', 'made_up'\)/)
  assert.match(migration, /is_makeup boolean not null default false/)
  assert.match(migration, /makeup_for_lesson_id uuid/)
  assert.match(migration, /foreign key \(makeup_for_lesson_id, owner_id\)[\s\S]*lessons \(id, owner_id\)/)
  assert.match(migration, /is_makeup and makeup_for_lesson_id is not null[\s\S]*recurrence_id is null[\s\S]*not recurrence_managed/)
})

test("somente uma reposição agendada pode existir por original", () => {
  assert.match(migration, /unique index lessons_one_scheduled_makeup_per_original[\s\S]*where is_makeup and status = 'scheduled'/)
  assert.match(migration, /when unique_violation then raise exception 'makeup_already_scheduled'/)
})

test("cancelar com reposição reserva pacote sem consumir", () => {
  const cancelFunction = migration.match(/function public\.cancel_lesson_with_makeup[\s\S]*?\$\$;/)?.[0] ?? ""
  assert.match(cancelFunction, /for update/)
  assert.match(cancelFunction, /total_lessons - package_row\.used_lessons - reserved_count <= 0/)
  assert.match(cancelFunction, /status = 'makeup_pending', reserved_package_id = package_row\.id/)
  assert.doesNotMatch(cancelFunction, /used_lessons = used_lessons \+ 1/)
})

test("agendamento valida original, tenant, conflito e recorrência avulsa", () => {
  const scheduleFunction = migration.match(/function public\.schedule_makeup_lesson[\s\S]*?\$\$;/)?.[0] ?? ""
  assert.match(scheduleFunction, /owner_id = auth\.uid\(\)/)
  assert.match(scheduleFunction, /original_row\.status <> 'makeup_pending'/)
  assert.match(scheduleFunction, /status = 'scheduled'[\s\S]*starts_at < p_ends_at and ends_at > p_starts_at/)
  assert.match(scheduleFunction, /true, original_row\.id, null, null, false/)
  assert.doesNotMatch(actions, /formdata\.get\(["']owner_id["']\)|owner_id\s*:/i)
})

test("conclusão de reposição aplica efeito à unidade comercial original", () => {
  const completeFunction = migration.match(/function public\.complete_lesson[\s\S]*?\$\$;/g)?.at(-1) ?? ""
  assert.match(completeFunction, /commercial_row := original_row/)
  assert.match(completeFunction, /set status = 'completed'[\s\S]*set status = 'made_up'/)
  assert.doesNotMatch(completeFunction, /set status = 'made_up', reserved_package_id = null/)
  assert.match(completeFunction, /lesson_id, billing_model[\s\S]*commercial_row\.id, 'per_lesson'/)
  assert.match(completeFunction, /local_service_date/)
  assert.match(completeFunction, /where id = original_row\.reserved_package_id[\s\S]*for update/)
  const makeupBranch = completeFunction.indexOf("if lesson_row.is_makeup then")
  const normalBranch = completeFunction.indexOf("else", makeupBranch)
  const expirationCheck = completeFunction.indexOf("package_row.ends_on")
  assert.ok(expirationCheck > normalBranch)
})

test("conclusão repetida é idempotente e reservas protegem concorrência", () => {
  assert.match(migration, /if lesson_row\.status = 'completed' then[\s\S]*coalesce\(lesson_row\.makeup_for_lesson_id, lesson_row\.id\)/)
  assert.match(migration, /select \* into lesson_row[\s\S]*for update/)
  assert.match(migration, /select \* into original_row[\s\S]*for update/)
  assert.match(migration, /select \* into package_row[\s\S]*for update/)
  assert.match(migration, /total_lessons - package_row\.used_lessons - reserved_count <= 0/)
})

test("RPCs críticas são fechadas para anônimo e não há DELETE", () => {
  for (const name of ["cancel_lesson_with_makeup", "schedule_makeup_lesson", "complete_lesson"]) {
    assert.match(migration, new RegExp(`revoke all on function public\\.${name}`))
    assert.match(migration, new RegExp(`grant execute on function public\\.${name}[\\s\\S]*to authenticated`))
  }
  assert.doesNotMatch(migration, /grant execute[^;]*to anon|delete from public\.lessons/)
  assert.equal((migration.match(/security definer/g) ?? []).length, 5)
  assert.equal((migration.match(/set search_path = public, pg_temp/g) ?? []).length, 5)
})

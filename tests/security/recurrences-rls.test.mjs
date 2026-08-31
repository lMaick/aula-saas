import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const migration = (await readFile(new URL("../../supabase/migrations/20260901090000_create_weekly_recurrences.sql", import.meta.url), "utf8")).toLowerCase()
const recurrenceActions = await readFile(new URL("../../src/features/lessons/actions.ts", import.meta.url), "utf8")

test("recorrência usa semana ISO, janela de 8 semanas e ocorrência idempotente", () => {
  assert.match(migration, /monday = 1,[\s\S]*sunday = 7/)
  assert.match(migration, /weekday smallint not null check \(weekday between 1 and 7\)/)
  assert.match(migration, /local_today \+ 55/)
  assert.match(migration, /unique index lessons_recurrence_occurrence_unique/)
  assert.match(migration, /on conflict \(recurrence_id, recurrence_date\)[\s\S]*do nothing/)
})

test("RLS isola recorrências e aluno deve pertencer ao mesmo professor", () => {
  assert.match(migration, /enable row level security/)
  assert.match(migration, /for select to authenticated[\s\S]*auth\.uid\(\).*owner_id/)
  assert.match(migration, /foreign key \(student_id, owner_id\)[\s\S]*references public\.students \(id, owner_id\)/)
  assert.match(migration, /where id = p_student_id and owner_id = auth\.uid\(\) and status = 'active'/)
})

test("owner_id não é controlado pelo formulário ou payload da aplicação", () => {
  assert.doesNotMatch(recurrenceActions, /formData\.get\(["']owner_id["']\)/)
  assert.doesNotMatch(recurrenceActions, /owner_id\s*:/)
  assert.match(recurrenceActions, /\.eq\("owner_id", user\.id\)/)
})

test("edição preserva ocorrências passadas, concluídas, canceladas e remarcadas", () => {
  assert.match(migration, /and recurrence_managed[\s\S]*and status = 'scheduled'[\s\S]*and starts_at > now\(\)/)
  assert.match(recurrenceActions, /recurrence_managed: false/)
  assert.doesNotMatch(migration, /status in \('completed', 'cancelled'\)/)
})

test("desativação mantém histórico e cancela apenas ocorrências futuras controladas", () => {
  assert.match(migration, /set active = false/)
  assert.match(migration, /set status = 'cancelled'[\s\S]*recurrence_managed[\s\S]*status = 'scheduled'[\s\S]*starts_at > now\(\)/)
  assert.doesNotMatch(migration, /delete from/)
  assert.doesNotMatch(migration, /for delete|grant delete/)
})

test("conflitos são verificados antes das alterações da série", () => {
  const conflictPosition = migration.indexOf("raise exception 'recurrence_conflict'")
  const recurrenceUpdatePosition = migration.indexOf("update public.lesson_recurrences set")
  assert.ok(conflictPosition > 0)
  assert.ok(recurrenceUpdatePosition > conflictPosition)
  assert.match(migration, /lesson\.status = 'scheduled'/)
  assert.match(migration, /lesson\.starts_at <[\s\S]*lesson\.ends_at >/)
})

test("aula manual continua sem metadados de recorrência", () => {
  assert.match(migration, /recurrence_id uuid/)
  assert.match(migration, /recurrence_managed boolean not null default false/)
  const manualInsert = recurrenceActions.match(/export async function createLesson[\s\S]*?\.insert\(\{([\s\S]*?)\}\)/)?.[1] || ""
  assert.doesNotMatch(manualInsert, /recurrence_id|recurrence_date/)
})

test("nenhum acesso anônimo às funções de recorrência", () => {
  assert.match(migration, /revoke all on function public\.create_weekly_recurrence[\s\S]*from public, anon/)
  assert.match(migration, /grant execute on function public\.create_weekly_recurrence[\s\S]*to authenticated/)
  assert.doesNotMatch(migration, /grant execute[^;]*to anon/)
})

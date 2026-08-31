import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const migration = (await readFile(new URL("../../supabase/migrations/20260901130000_restrict_lesson_durations.sql", import.meta.url), "utf8")).toLowerCase()

test("banco aceita somente a lista explícita de durações", () => {
  assert.match(migration, /duration_minutes in \(30, 45, 60, 90, 120\)/)
  assert.match(migration, /extract\(epoch from \(ends_at - starts_at\)\) in \(1800, 2700, 3600, 5400, 7200\)/)
  assert.doesNotMatch(migration, /between 15 and 480|min\(15\)|max\(480\)/)
})

test("RPCs de criação e edição aplicam a mesma lista", () => {
  const validations = migration.match(/p_duration_minutes not in \(30, 45, 60, 90, 120\)/g) ?? []
  assert.equal(validations.length, 2)
})

test("constraints novas preservam registros existentes", () => {
  assert.equal((migration.match(/not valid/g) ?? []).length, 2)
  const constraintChanges = migration.split("create or replace function")[0]
  assert.doesNotMatch(constraintChanges, /update public\.lessons|update public\.lesson_recurrences/)
})

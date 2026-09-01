import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const migration = (await readFile(new URL("../../supabase/migrations/20260902130000_protect_student_billing_model_changes.sql", import.meta.url), "utf8")).toLowerCase()
const actions = await readFile(new URL("../../src/features/students/actions.ts", import.meta.url), "utf8")
const messages = await readFile(new URL("../../src/features/auth/messages.ts", import.meta.url), "utf8")

test("trigger atua somente quando billing_model realmente muda", () => {
  assert.match(migration, /before update of billing_model on public\.students/)
  assert.match(migration, /old\.billing_model is not distinct from new\.billing_model[\s\S]*return new/)
})

test("reposição pendente bloqueia mudança usando o próprio aluno e tenant", () => {
  assert.match(migration, /from public\.lessons[\s\S]*owner_id = old\.owner_id[\s\S]*student_id = old\.id[\s\S]*status = 'makeup_pending'/)
  assert.match(migration, /raise exception 'student_has_pending_makeups'/)
})

test("pacote ativo bloqueia mudança usando o próprio aluno e tenant", () => {
  assert.match(migration, /from public\.packages[\s\S]*owner_id = old\.owner_id[\s\S]*student_id = old\.id[\s\S]*status = 'active'/)
  assert.match(migration, /raise exception 'student_has_active_package'/)
})

test("trigger é seguro e não depende de owner_id do cliente", () => {
  assert.match(migration, /security definer/)
  assert.match(migration, /set search_path = public, pg_temp/)
  assert.match(migration, /revoke all on function public\.protect_student_billing_model_change\(\) from public, anon, authenticated/)
  assert.doesNotMatch(migration, /auth\.uid\(\)|new\.owner_id/)
  assert.doesNotMatch(actions, /formData\.get\(["']owner_id["']\)|owner_id\s*:/)
})

test("updateStudent preserva os dois erros de negócio amigáveis", () => {
  for (const code of ["student_has_pending_makeups", "student_has_active_package"]) {
    assert.match(actions, new RegExp(code))
    assert.match(messages, new RegExp(code))
  }
})

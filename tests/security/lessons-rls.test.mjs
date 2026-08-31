import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const migration = (await readFile(new URL("../../supabase/migrations/20260831190000_create_lessons.sql", import.meta.url), "utf8")).toLowerCase()
const actions = await readFile(new URL("../../src/features/lessons/actions.ts", import.meta.url), "utf8")

test("lessons usa auth.uid e RLS para leitura, criação e alteração", () => {
  assert.match(migration, /owner_id uuid not null default auth\.uid\(\)/)
  assert.match(migration, /enable row level security/)
  assert.match(migration, /for select[\s\S]*using \(\(select auth\.uid\(\)\) = owner_id\)/)
  assert.match(migration, /for insert[\s\S]*with check \(\(select auth\.uid\(\)\) = owner_id\)/)
  assert.match(migration, /for update[\s\S]*using \(\(select auth\.uid\(\)\) = owner_id\)/)
})

test("a chave composta impede aula com aluno de outro professor", () => {
  assert.match(migration, /unique \(id, owner_id\)/)
  assert.match(migration, /foreign key \(student_id, owner_id\)[\s\S]*references public\.students \(id, owner_id\)/)
  assert.match(actions, /\.eq\("id", parsed\.studentId\)[\s\S]*\.eq\("owner_id", user\.id\)/)
})

test("owner_id não vem do formulário nem dos payloads de aula", () => {
  assert.doesNotMatch(actions, /formData\.get\(["']owner_id["']\)/)
  assert.doesNotMatch(actions, /owner_id\s*:/)
  assert.match(actions, /\.eq\("owner_id", user\.id\)/)
})

test("não existe DELETE e anônimo não recebe acesso", () => {
  assert.doesNotMatch(migration, /create policy[\s\S]*for delete/)
  assert.doesNotMatch(migration, /grant delete/)
  assert.match(migration, /revoke all on table public\.lessons from anon/)
  assert.doesNotMatch(migration, /grant (select|insert|update|delete)[^;]* to anon/)
})

test("conflitos consideram somente aulas agendadas e intervalos sobrepostos", () => {
  assert.match(actions, /\.eq\("status", "scheduled"\)/)
  assert.match(actions, /\.lt\("starts_at", endsAt\)/)
  assert.match(actions, /\.gt\("ends_at", startsAt\)/)
})

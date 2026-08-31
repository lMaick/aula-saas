import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const migrationUrl = new URL(
  "../../supabase/migrations/20260831160000_create_students.sql",
  import.meta.url,
)
const actionsUrl = new URL("../../src/features/students/actions.ts", import.meta.url)

const migration = (await readFile(migrationUrl, "utf8")).toLowerCase()
const actions = await readFile(actionsUrl, "utf8")

test("students usa a sessão como proprietário e mantém RLS ativo", () => {
  assert.match(migration, /owner_id uuid not null default auth\.uid\(\)/)
  assert.match(migration, /enable row level security/)
  assert.match(migration, /for select[\s\S]*using \(\(select auth\.uid\(\)\) = owner_id\)/)
  assert.match(migration, /for insert[\s\S]*with check \(\(select auth\.uid\(\)\) = owner_id\)/)
  assert.match(migration, /for update[\s\S]*using \(\(select auth\.uid\(\)\) = owner_id\)/)
})

test("usuários autenticados não recebem permissão para apagar ou trocar owner_id", () => {
  assert.doesNotMatch(migration, /create policy[\s\S]*for delete/)
  assert.doesNotMatch(migration, /grant delete on table public\.students/)
  assert.match(migration, /grant insert \([\s\S]*?name,[\s\S]*?billing_amount_cents[\s\S]*?\) on table public\.students/)
  assert.match(migration, /grant update \([\s\S]*?name,[\s\S]*?billing_amount_cents[\s\S]*?\) on table public\.students/)
})

test("o formulário não fornece owner_id para as mutations", () => {
  assert.doesNotMatch(actions, /formData\.get\(["']owner_id["']\)/)
  assert.doesNotMatch(actions, /owner_id\s*:/)
  assert.match(actions, /\.eq\("owner_id", user\.id\)/)
})

test("a role anônima não recebe acesso aos alunos", () => {
  assert.match(migration, /revoke all on table public\.students from anon/)
  assert.doesNotMatch(migration, /grant (select|insert|update|delete)[^;]* to anon/)
})

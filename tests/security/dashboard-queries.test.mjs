import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const queries = await readFile(new URL("../../src/features/dashboard/queries.ts", import.meta.url), "utf8")
const page = await readFile(new URL("../../src/app/(app)/dashboard/page.tsx", import.meta.url), "utf8")

test("todas as fontes do dashboard filtram o professor autenticado", () => {
  for (const table of ["charges", "lessons", "packages", "students"]) {
    assert.match(queries, new RegExp(`from\\(\"${table}\"\\)[\\s\\S]*?eq\\(\"owner_id\", user\\.id\\)`))
  }
  assert.ok((queries.match(/\.eq\("owner_id", user\.id\)/g) ?? []).length >= 9)
})

test("dashboard não recebe owner_id do cliente ou query string", () => {
  assert.doesNotMatch(queries, /formData|owner_id\s*:/)
  assert.doesNotMatch(page, /formData|owner_id/)
  assert.match(queries, /supabase\.auth\.getUser\(\)/)
})

test("dashboard cria apenas consultas de leitura", () => {
  assert.doesNotMatch(queries, /\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/)
  assert.doesNotMatch(page, /action=|<form/)
})

test("consultas aplicam timezone, filtros operacionais e limites", () => {
  assert.match(queries, /localDayRange\(today, timeZone\)/)
  assert.match(queries, /localMonthRange\(now, timeZone\)/)
  assert.match(queries, /\.in\("status", \["scheduled", "completed"\]\)/)
  assert.match(queries, /\.eq\("status", "scheduled"\)[\s\S]*\.limit\(5\)/)
  assert.match(queries, /\.eq\("status", "makeup_pending"\)\.eq\("is_makeup", false\)/)
})

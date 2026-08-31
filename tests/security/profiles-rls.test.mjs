import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migrationPath = join(
  root,
  "supabase",
  "migrations",
  "20260831130000_create_profiles.sql",
);

test("profiles habilita RLS e limita leitura e alteração ao auth.uid()", async () => {
  const sql = await readFile(migrationPath, "utf8");

  assert.match(sql, /alter table public\.profiles enable row level security/i);
  assert.match(sql, /for select[\s\S]*auth\.uid\(\)[\s\S]*= id/i);
  assert.match(sql, /for update[\s\S]*using[\s\S]*auth\.uid\(\)[\s\S]*with check[\s\S]*auth\.uid\(\)/i);
  assert.doesNotMatch(sql, /create policy[\s\S]*for insert/i);
});

test("campos de trial e status não são atualizáveis pelo usuário", async () => {
  const sql = await readFile(migrationPath, "utf8");
  const grant = sql.match(/grant update \(([\s\S]*?)\) on table public\.profiles/i);

  assert.ok(grant, "A migration deve declarar colunas atualizáveis.");
  assert.doesNotMatch(grant[1], /trial_started_at|trial_ends_at|account_status|id/i);
});

test("código versionado não contém uso de service_role", async () => {
  const roots = ["src", "supabase"];
  const files = [];

  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await collect(path);
      else files.push(path);
    }
  }

  for (const directory of roots) await collect(join(root, directory));
  const contents = await Promise.all(files.map((file) => readFile(file, "utf8")));

  assert.equal(contents.some((content) => /service_role/i.test(content)), false);
});

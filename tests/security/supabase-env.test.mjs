import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../../src/lib/supabase/env.ts", import.meta.url),
  "utf8",
);

test("variáveis públicas do Supabase usam somente acessos estáticos", () => {
  assert.match(source, /process\.env\.NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(source, /process\.env\.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(source, /process\.env\.NEXT_PUBLIC_SITE_URL/);
  assert.doesNotMatch(source, /process\.env\s*\[/);
});

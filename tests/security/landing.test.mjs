import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const page = await readFile(path.join(root, "src/app/page.tsx"), "utf8");
const featureFiles = ["landing-header.tsx", "hero-section.tsx", "product-preview.tsx", "problems-section.tsx", "benefits-section.tsx", "how-it-works-section.tsx", "product-showcase-section.tsx", "trial-section.tsx", "faq-section.tsx", "landing-footer.tsx"];
const feature = (await Promise.all(featureFiles.map((file) => readFile(path.join(root, "src/features/landing", file), "utf8")))).join("\n");

test("landing é pública, estática e não consulta dados privados", () => {
  assert.doesNotMatch(`${page}\n${feature}`, /createClient|auth\.getUser|\.from\(|\.rpc\(|owner_id|service_role/i);
});

test("CTAs usam somente as rotas públicas existentes", () => {
  assert.match(feature, /href="\/cadastrar"/);
  assert.match(feature, /href="\/entrar"/);
  assert.doesNotMatch(feature, /checkout|stripe|mercado pago|fetch\(/i);
});

test("landing possui metadata e apenas um h1", () => {
  assert.match(page, /export const metadata/);
  assert.match(page, /Aula SaaS \| Gestão simples para professores particulares/);
  assert.equal((feature.match(/<h1\b/g) ?? []).length, 1);
});

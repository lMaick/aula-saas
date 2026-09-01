import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const studentQueries = await readFile(join(root, "src/features/students/queries.ts"), "utf8");
const lessonQueries = await readFile(join(root, "src/features/lessons/queries.ts"), "utf8");
const financeQueries = await readFile(join(root, "src/features/finance/queries.ts"), "utf8");
const financePage = await readFile(join(root, "src/app/(app)/financeiro/page.tsx"), "utf8");
const lessonPage = await readFile(join(root, "src/app/(app)/agenda/[id]/page.tsx"), "utf8");

async function readTree(directory) {
  const contents = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) contents.push(...await readTree(path));
    else contents.push(await readFile(path, "utf8"));
  }
  return contents.join("\n");
}

const whatsappFeature = await readTree(join(root, "src/features/whatsapp"));

test("dados usados pelo WhatsApp permanecem vinculados ao professor autenticado", () => {
  for (const source of [studentQueries, lessonQueries, financeQueries]) {
    assert.match(source, /supabase\.auth\.getUser\(\)/);
    assert.match(source, /\.eq\("owner_id", user\.id\)/);
  }
  assert.match(lessonQueries, /select\("id, name, whatsapp"\)/);
  assert.match(financeQueries, /select\("id, name, whatsapp"\)/);
});

test("feature não recebe owner_id do cliente nem cria endpoint", () => {
  assert.doesNotMatch(whatsappFeature, /owner_id|FormData|searchParams|route\.ts|server action/i);
  assert.doesNotMatch(financePage, /name="owner_id"|owner_id\s*:/i);
});

test("WhatsApp é aberto somente por link após clique", () => {
  assert.match(whatsappFeature, /https:\/\/wa\.me\//);
  assert.match(whatsappFeature, /target="_blank"/);
  assert.doesNotMatch(whatsappFeature, /fetch\(|axios|XMLHttpRequest|navigator\.sendBeacon|useEffect|setTimeout/i);
});

test("não existe API, webhook ou integração de envio automático", () => {
  assert.doesNotMatch(whatsappFeature, /business api|evolution api|cloud api|twilio|webhook|cron|queue|fila/i);
  assert.doesNotMatch(whatsappFeature, /service_role/i);
});

test("nenhuma escrita de rastreamento de mensagem foi criada", () => {
  assert.doesNotMatch(whatsappFeature, /message_sent|whatsapp_sent_at|delivery_status|sent_at/i);
  assert.doesNotMatch(whatsappFeature, /\.insert\(|\.update\(|\.delete\(|\.upsert\(|\.rpc\(/);
});

test("cobranças pagas não renderizam ação de cobrança", () => {
  assert.match(financePage, /canChargeOnWhatsApp\(charge\.status\)/);
  assert.match(financePage, /charge\.status === "pending" \? <div[\s\S]*?<WhatsAppButton[\s\S]*? : null/);
});

test("somente aula agendada renderiza lembrete de WhatsApp", () => {
  assert.match(lessonPage, /const scheduled = lesson\.status === "scheduled"/);
  assert.match(lessonPage, /\{scheduled \? \([\s\S]*?label="Lembrar no WhatsApp"[\s\S]*?\) : null\}/);
});

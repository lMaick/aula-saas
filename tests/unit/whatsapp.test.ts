import assert from "node:assert/strict";
import test from "node:test";

import { createWhatsAppUrl } from "../../src/features/whatsapp/links.ts";
import {
  buildChargeReminderMessage,
  buildLessonReminderMessage,
  buildStudentContactMessage,
  canChargeOnWhatsApp,
} from "../../src/features/whatsapp/messages.ts";
import { normalizeWhatsAppPhone } from "../../src/features/whatsapp/phone.ts";

test("normaliza telefone brasileiro com formatação", () => {
  assert.equal(normalizeWhatsAppPhone("(73) 99999-9999"), "5573999999999");
});

test("adiciona 55 ao telefone informado com DDD", () => {
  assert.equal(normalizeWhatsAppPhone("73 99999-9999"), "5573999999999");
});

test("não duplica 55 quando o país já foi informado", () => {
  assert.equal(normalizeWhatsAppPhone("+55 73 99999-9999"), "5573999999999");
});

test("remove caracteres não numéricos", () => {
  assert.equal(normalizeWhatsAppPhone("+55 (73) 9.9999-9999"), "5573999999999");
});

test("telefone inválido não gera link utilizável", () => {
  assert.equal(normalizeWhatsAppPhone("123"), null);
  assert.equal(createWhatsAppUrl("123", "Olá"), null);
});

test("mensagem é codificada com segurança na URL", () => {
  const url = createWhatsAppUrl("(73) 99999-9999", "Olá, João! Aulas & pagamentos.");
  assert.equal(
    url,
    "https://wa.me/5573999999999?text=Ol%C3%A1%2C%20Jo%C3%A3o!%20Aulas%20%26%20pagamentos.",
  );
  assert.doesNotMatch(url ?? "", /João|\s|& pagamentos/);
});

test("mensagem de contato preserva nome com acento", () => {
  assert.equal(buildStudentContactMessage("João"), "Olá, João! Tudo bem?");
});

test("lembrete de aula contém data e horário no timezone informado", () => {
  const message = buildLessonReminderMessage({
    studentName: "João",
    startsAt: "2026-09-03T17:00:00.000Z",
    timeZone: "America/Bahia",
  });
  assert.match(message, /03\/09\/2026/);
  assert.match(message, /14:00/);
});

test("lembrete financeiro contém valor em BRL", () => {
  const message = buildChargeReminderMessage({
    studentName: "João",
    description: "Aula de 02/09/2026",
    amountCents: 7000,
    dueDate: "2026-09-02",
  });
  assert.match(message, /R\$\s70,00/);
  assert.match(message, /02\/09\/2026/);
});

test("lembrete financeiro inclui Pix somente quando preenchido", () => {
  const base = {
    studentName: "João",
    description: "Mensalidade — setembro/2026",
    amountCents: 35000,
    dueDate: "2026-09-10",
  };
  assert.match(buildChargeReminderMessage({ ...base, pixKey: "pix@exemplo.com" }), /Chave Pix: pix@exemplo\.com/);
  assert.doesNotMatch(buildChargeReminderMessage({ ...base, pixKey: "   " }), /Chave Pix/);
  assert.doesNotMatch(buildChargeReminderMessage({ ...base, pixKey: null }), /Chave Pix/);
});

test("somente cobrança pendente recebe ação de WhatsApp", () => {
  assert.equal(canChargeOnWhatsApp("pending"), true);
  assert.equal(canChargeOnWhatsApp("paid"), false);
});

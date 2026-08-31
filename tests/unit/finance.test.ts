import assert from "node:assert/strict";
import test from "node:test";

import { calculateFinancialSummary } from "../../src/features/finance/calculations.ts";

test("soma todas as cobranças pendentes", () => {
  const summary = calculateFinancialSummary([
    { amount_cents: 7000, status: "pending", paid_at: null },
    { amount_cents: 35000, status: "pending", paid_at: null },
    { amount_cents: 9000, status: "paid", paid_at: "2026-09-10T12:00:00Z" },
  ], { start: new Date("2026-09-01T03:00:00Z"), end: new Date("2026-10-01T03:00:00Z") });
  assert.equal(summary.pendingCents, 42000);
});

test("soma somente pagamentos do mês local informado", () => {
  const summary = calculateFinancialSummary([
    { amount_cents: 7000, status: "paid", paid_at: "2026-09-01T02:59:59Z" },
    { amount_cents: 8000, status: "paid", paid_at: "2026-09-01T03:00:00Z" },
    { amount_cents: 9000, status: "paid", paid_at: "2026-10-01T02:59:59Z" },
    { amount_cents: 10000, status: "paid", paid_at: "2026-10-01T03:00:00Z" },
  ], { start: new Date("2026-09-01T03:00:00Z"), end: new Date("2026-10-01T03:00:00Z") });
  assert.equal(summary.receivedThisMonthCents, 17000);
});

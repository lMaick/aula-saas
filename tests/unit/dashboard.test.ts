import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateDashboardFinancials,
  countDashboardAttention,
  dashboardPackageAvailability,
  shouldShowPackageNearEnd,
} from "../../src/features/dashboard/calculations.ts";

test("calcula recebido, a receber e vencido separadamente", () => {
  const summary = calculateDashboardFinancials(
    [{ amount_cents: 7000 }, { amount_cents: 14000 }],
    [{ amount_cents: 8000, due_date: "2026-09-02" }, { amount_cents: 10000, due_date: "2026-08-31" }],
    "2026-09-01",
  );
  assert.deepEqual(summary, {
    receivedThisMonthCents: 21000,
    pendingCents: 18000,
    overdueCents: 10000,
  });
});

test("soma atrasos, reposições e pacotes como pendências", () => {
  assert.equal(countDashboardAttention(1, 2, 1), 4);
});

test("disponibilidade real do pacote desconta reservas", () => {
  assert.equal(dashboardPackageAvailability(10, 7, 1), 2);
});

test("pacotes ativos com uma ou duas aulas disponíveis ficam perto do fim", () => {
  assert.equal(shouldShowPackageNearEnd("active", "active", 2), true);
  assert.equal(shouldShowPackageNearEnd("active", "active", 1), true);
  assert.equal(shouldShowPackageNearEnd("active", "active", 3), false);
});

test("pacotes concluídos, cancelados e de aluno inativo não aparecem", () => {
  assert.equal(shouldShowPackageNearEnd("completed", "active", 2), false);
  assert.equal(shouldShowPackageNearEnd("cancelled", "active", 2), false);
  assert.equal(shouldShowPackageNearEnd("active", "inactive", 2), false);
});

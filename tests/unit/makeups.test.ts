import assert from "node:assert/strict";
import test from "node:test";

import { availablePackageLessons, isMakeupNearEnd } from "../../src/features/lessons/makeup-calculations.ts";

test("reservas reduzem somente o saldo disponível para aulas normais", () => {
  assert.equal(availablePackageLessons(10, 8, 1), 1);
  assert.equal(availablePackageLessons(10, 8, 0), 2);
  assert.equal(availablePackageLessons(10, 10, 1), 0);
});

test("alerta de fim considera saldo livre após reservas", () => {
  assert.equal(isMakeupNearEnd(10, 7, 1), true);
  assert.equal(isMakeupNearEnd(10, 7, 3), false);
});

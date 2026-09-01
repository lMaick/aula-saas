import assert from "node:assert/strict";
import test from "node:test";

import { packageProgress } from "../../src/features/packages/calculations.ts";

test("deriva saldo e alerta quando restam duas aulas ou menos", () => {
  assert.deepEqual(packageProgress(10, 8), {
    remaining: 2,
    percentage: 80,
    nearEnd: true,
    completed: false,
  });
  assert.equal(packageProgress(10, 7).nearEnd, false);
  assert.equal(packageProgress(10, 9).nearEnd, true);
});

test("deriva conclusão quando o saldo chega a zero", () => {
  assert.deepEqual(packageProgress(10, 10), {
    remaining: 0,
    percentage: 100,
    nearEnd: false,
    completed: true,
  });
});

import assert from "node:assert/strict"
import test from "node:test"

import {
  formatBrlFromCents,
  formatCentsForInput,
  parseBrlToCents,
} from "../../src/lib/money/brl.ts"

test("converte valores informados em reais para centavos inteiros", () => {
  assert.equal(parseBrlToCents("70,00"), 7_000)
  assert.equal(parseBrlToCents("70.50"), 7_050)
  assert.equal(parseBrlToCents("1.234,56"), 123_456)
  assert.equal(parseBrlToCents("0"), 0)
})

test("rejeita valores inválidos, negativos ou com precisão indevida", () => {
  assert.equal(parseBrlToCents(""), null)
  assert.equal(parseBrlToCents("-10,00"), null)
  assert.equal(parseBrlToCents("setenta"), null)
  assert.equal(parseBrlToCents("10,9999"), null)
})

test("formata centavos para exibição e para edição", () => {
  assert.equal(formatBrlFromCents(7_000), "R$ 70,00")
  assert.equal(formatCentsForInput(123_456), "1234,56")
})

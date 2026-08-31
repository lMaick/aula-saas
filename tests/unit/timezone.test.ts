import assert from "node:assert/strict"
import test from "node:test"

import {
  durationInMinutes,
  intervalsOverlap,
  formatLocalTimeRange,
  localDateTimeToUtc,
  localMonthRange,
  startOfWeekDateKey,
  utcToLocalInput,
} from "../../src/lib/dates/timezone.ts"

test("converte o horário de America/Bahia para UTC e de volta", () => {
  const utc = localDateTimeToUtc("2026-09-01T14:00", "America/Bahia")
  assert.equal(utc?.toISOString(), "2026-09-01T17:00:00.000Z")
  assert.equal(utcToLocalInput("2026-09-01T17:00:00.000Z", "America/Bahia"), "2026-09-01T14:00")
})

test("formata intervalo local de uma recorrência sem depender do servidor", () => {
  assert.equal(formatLocalTimeRange("14:00:00", 60), "14:00–15:00")
  assert.equal(formatLocalTimeRange("23:30:00", 60), "23:30–00:30")
})

test("calcula o início da semana na segunda-feira", () => {
  assert.equal(startOfWeekDateKey("2026-09-01"), "2026-08-31")
  assert.equal(startOfWeekDateKey("2026-09-06"), "2026-08-31")
})

test("considera sobreposição real, mas permite horários adjacentes", () => {
  const start = new Date("2026-09-01T17:00:00.000Z")
  const end = new Date("2026-09-01T18:00:00.000Z")
  assert.equal(intervalsOverlap(start, end, new Date("2026-09-01T17:30:00.000Z"), new Date("2026-09-01T18:30:00.000Z")), true)
  assert.equal(intervalsOverlap(start, end, new Date("2026-09-01T18:00:00.000Z"), new Date("2026-09-01T19:00:00.000Z")), false)
  assert.equal(durationInMinutes(start.toISOString(), end.toISOString()), 60)
})

test("calcula os limites do mês no timezone do professor", () => {
  const range = localMonthRange("2026-09-15T12:00:00Z", "America/Bahia")
  assert.equal(range.start.toISOString(), "2026-09-01T03:00:00.000Z")
  assert.equal(range.end.toISOString(), "2026-10-01T03:00:00.000Z")
})

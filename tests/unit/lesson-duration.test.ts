import assert from "node:assert/strict";
import test from "node:test";

import { allowedLessonDurations, isAllowedLessonDuration } from "../../src/features/lessons/durations.ts";
import { lessonFormSchema, recurrenceFormSchema } from "../../src/features/lessons/schemas.ts";

const accepted = [30, 45, 60, 90, 120];
const rejected = [15, 37, 121, 480];

test("mantém a lista explícita de durações permitidas", () => {
  assert.deepEqual([...allowedLessonDurations], accepted);
  for (const duration of accepted) assert.equal(isAllowedLessonDuration(duration), true);
  for (const duration of rejected) assert.equal(isAllowedLessonDuration(duration), false);
});

test("Zod aplica a mesma regra em aulas avulsas e recorrências", () => {
  for (const durationMinutes of accepted) {
    assert.equal(lessonFormSchema.safeParse({
      studentId: "00000000-0000-4000-8000-000000000001",
      localDateTime: "2026-09-01T14:00",
      durationMinutes,
    }).success, true);
    assert.equal(recurrenceFormSchema.safeParse({
      studentId: "00000000-0000-4000-8000-000000000001",
      weekday: 2,
      localStartTime: "14:00",
      durationMinutes,
      startsOn: "2026-09-01",
    }).success, true);
  }

  for (const durationMinutes of rejected) {
    assert.equal(lessonFormSchema.safeParse({
      studentId: "00000000-0000-4000-8000-000000000001",
      localDateTime: "2026-09-01T14:00",
      durationMinutes,
    }).success, false);
    assert.equal(recurrenceFormSchema.safeParse({
      studentId: "00000000-0000-4000-8000-000000000001",
      weekday: 2,
      localStartTime: "14:00",
      durationMinutes,
      startsOn: "2026-09-01",
    }).success, false);
  }
});

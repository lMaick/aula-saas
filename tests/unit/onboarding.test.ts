import assert from "node:assert/strict";
import test from "node:test";

import {
  identifyOnboardingStep,
  isOnboardingProfileReady,
  selectFirstOnboardingStudent,
} from "../../src/features/onboarding/calculations.ts";
import {
  onboardingScheduleSchema,
  onboardingStudentSchema,
} from "../../src/features/onboarding/schemas.ts";

test("perfil exige nome e área ensinada", () => {
  assert.equal(isOnboardingProfileReady({ name: "Ana", subject_taught: "Inglês" }), true);
  assert.equal(isOnboardingProfileReady({ name: "Ana", subject_taught: "  " }), false);
});

test("etapa é derivada somente dos dados persistidos", () => {
  assert.equal(identifyOnboardingStep({ completedAt: null, profileReady: false, hasStudent: false, packageReady: false, hasRecurrence: false }), "profile");
  assert.equal(identifyOnboardingStep({ completedAt: null, profileReady: true, hasStudent: false, packageReady: false, hasRecurrence: false }), "student");
  assert.equal(identifyOnboardingStep({ completedAt: null, profileReady: true, hasStudent: true, packageReady: true, hasRecurrence: false }), "schedule");
  assert.equal(identifyOnboardingStep({ completedAt: null, profileReady: true, hasStudent: true, packageReady: true, hasRecurrence: true }), "finish");
  assert.equal(identifyOnboardingStep({ completedAt: "2026-09-03T12:00:00Z", profileReady: true, hasStudent: true, packageReady: true, hasRecurrence: true }), "complete");
});

test("pacote incompleto mantém professor na etapa do aluno", () => {
  assert.equal(identifyOnboardingStep({ completedAt: null, profileReady: true, hasStudent: true, packageReady: false, hasRecurrence: false }), "student");
});

test("primeiro aluno ativo é reutilizado e inativos são ignorados", () => {
  const student = selectFirstOnboardingStudent([
    { id: "inactive", status: "inactive" as const, created_at: "2026-01-01" },
    { id: "second", status: "active" as const, created_at: "2026-03-01" },
    { id: "first", status: "active" as const, created_at: "2026-02-01" },
  ]);
  assert.equal(student?.id, "first");
});

test("por aula e mensal não exigem dados de pacote", () => {
  for (const billingModel of ["per_lesson", "monthly"] as const) {
    const result = onboardingStudentSchema.safeParse({
      name: "João",
      whatsapp: "73999999999",
      billingModel,
      billingAmountCents: "70,00",
      packageTotalLessons: "",
    });
    assert.equal(result.success, true);
  }
});

test("modelo pacote exige quantidade e reutiliza parser BRL", () => {
  const invalid = onboardingStudentSchema.safeParse({
    name: "João", whatsapp: "73999999999", billingModel: "package",
    billingAmountCents: "600,00", packageTotalLessons: "",
  });
  const valid = onboardingStudentSchema.safeParse({
    name: "João", whatsapp: "73999999999", billingModel: "package",
    billingAmountCents: "600,00", packageTotalLessons: "10",
  });
  assert.equal(invalid.success, false);
  assert.equal(valid.success, true);
  if (valid.success) assert.equal(valid.data.billingAmountCents, 60000);
});

test("horário aceita somente durações oficiais", () => {
  for (const durationMinutes of [30, 45, 60, 90, 120]) {
    assert.equal(onboardingScheduleSchema.safeParse({ studentId: "10000000-0000-4000-8000-000000000001", weekday: 2, localStartTime: "14:00", durationMinutes }).success, true);
  }
  for (const durationMinutes of [15, 37, 121, 480]) {
    assert.equal(onboardingScheduleSchema.safeParse({ studentId: "10000000-0000-4000-8000-000000000001", weekday: 2, localStartTime: "14:00", durationMinutes }).success, false);
  }
});

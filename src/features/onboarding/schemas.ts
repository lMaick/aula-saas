import { z } from "zod";

import { durationSchema } from "../lessons/schemas.ts";
import { profileSchema } from "../profile/schemas.ts";
import { studentFormSchema } from "../students/schemas.ts";

export const onboardingProfileSchema = profileSchema.refine(
  (profile) => profile.subjectTaught.trim().length > 0,
  { message: "Informe o que você ensina.", path: ["subjectTaught"] },
);

const optionalPositiveInteger = z.preprocess(
  (value) => value === "" || value === null ? undefined : value,
  z.coerce.number().int().positive().optional(),
);

export const onboardingStudentSchema = studentFormSchema.extend({
  packageTotalLessons: optionalPositiveInteger,
}).superRefine((student, context) => {
  if (student.billingModel === "package" && !student.packageTotalLessons) {
    context.addIssue({
      code: "custom",
      message: "Informe a quantidade de aulas do pacote.",
      path: ["packageTotalLessons"],
    });
  }
});

export const onboardingScheduleSchema = z.object({
  studentId: z.string().uuid(),
  weekday: z.coerce.number().int().min(1).max(7),
  localStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: durationSchema,
});

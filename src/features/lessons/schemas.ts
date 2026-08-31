import { z } from "zod";

export const lessonIdSchema = z.string().uuid();

export const lessonFormSchema = z.object({
  studentId: z.string().uuid("Selecione um aluno."),
  localDateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  notes: z.string().trim().max(2000).optional(),
});

export const recurrenceIdSchema = z.string().uuid();

export const recurrenceFormSchema = z.object({
  studentId: z.string().uuid(),
  weekday: z.coerce.number().int().min(1).max(7),
  localStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  startsOn: z.string().date(),
  endsOn: z.union([z.string().date(), z.literal("")]).optional(),
}).refine((value) => !value.endsOn || value.endsOn >= value.startsOn, {
  message: "A data final deve ser igual ou posterior à inicial.",
  path: ["endsOn"],
});

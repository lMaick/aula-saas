import { z } from "zod";

export const lessonIdSchema = z.string().uuid();

export const lessonFormSchema = z.object({
  studentId: z.string().uuid("Selecione um aluno."),
  localDateTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  notes: z.string().trim().max(2000).optional(),
});

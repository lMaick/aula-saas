import { z } from "zod";

export const chargeIdSchema = z.string().uuid();

export const monthlyChargeSchema = z.object({
  studentId: z.string().uuid(),
  referenceMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  dueDate: z.string().date(),
});

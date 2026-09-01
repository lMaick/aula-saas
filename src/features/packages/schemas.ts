import { z } from "zod";

import { parseBrlToCents } from "@/lib/money/brl";

export const packageIdSchema = z.string().uuid();

export const packageFormSchema = z.object({
  studentId: z.string().uuid(),
  totalLessons: z.coerce.number().int().positive(),
  amount: z.string().trim().transform((value, context) => {
    const cents = parseBrlToCents(value);
    if (cents === null || cents < 0) {
      context.addIssue({ code: "custom", message: "Informe um valor válido." });
      return z.NEVER;
    }
    return cents;
  }),
  startsOn: z.string().date(),
  endsOn: z.union([z.string().date(), z.literal("")]).optional(),
}).refine((value) => !value.endsOn || value.endsOn >= value.startsOn, {
  message: "A data final deve ser igual ou posterior à inicial.",
  path: ["endsOn"],
});

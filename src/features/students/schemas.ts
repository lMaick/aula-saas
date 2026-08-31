import { z } from "zod";

import { parseBrlToCents } from "@/lib/money/brl";

const billingAmount = z.string().trim().transform((value, context) => {
  const cents = parseBrlToCents(value);
  if (cents === null) {
    context.addIssue({
      code: "custom",
      message: "Informe um valor válido e não negativo.",
    });
    return z.NEVER;
  }
  return cents;
});

export const studentFormSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(120),
  whatsapp: z.string().trim().min(1, "Informe o WhatsApp.").max(30),
  notes: z.string().trim().max(2000).optional(),
  billingModel: z.enum(["per_lesson", "monthly", "package"]),
  billingAmountCents: billingAmount,
});

export const studentIdSchema = z.string().uuid();

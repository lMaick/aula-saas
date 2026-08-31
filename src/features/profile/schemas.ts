import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  subjectTaught: z.string().trim().max(120),
  whatsapp: z.string().trim().max(30),
  pixKey: z.string().trim().max(150),
  timezone: z.literal("America/Bahia"),
});

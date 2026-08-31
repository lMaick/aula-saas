import { z } from "zod";

const email = z.string().trim().email("Informe um e-mail válido.");
const password = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres.")
  .max(72, "A senha deve ter no máximo 72 caracteres.");

export const loginSchema = z.object({ email, password: z.string().min(1) });

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome."),
  email,
  password,
});

export const recoverSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password,
    passwordConfirmation: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: "As senhas não coincidem.",
    path: ["passwordConfirmation"],
  });

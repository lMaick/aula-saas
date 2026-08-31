"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  loginSchema,
  recoverSchema,
  resetPasswordSchema,
  signupSchema,
} from "@/features/auth/schemas";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, field: string) {
  return String(formData.get(field) ?? "");
}

export async function signUp(formData: FormData) {
  const parsed = signupSchema.safeParse({
    name: value(formData, "name"),
    email: value(formData, "email"),
    password: value(formData, "password"),
  });

  if (!parsed.success) redirect("/cadastrar?erro=invalid_form");

  const supabase = await createClient();
  const { siteUrl } = getSupabasePublicEnv();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
      emailRedirectTo: `${siteUrl}/auth/callback?next=/area`,
    },
  });

  if (error) redirect("/cadastrar?erro=email_in_use");
  if (data.session) redirect("/area");

  redirect(
    "/entrar?mensagem=Confira seu e-mail para confirmar a conta antes de entrar.",
  );
}

export async function signIn(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: value(formData, "email"),
    password: value(formData, "password"),
  });

  if (!parsed.success) redirect("/entrar?erro=invalid_form");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) redirect("/entrar?erro=invalid_credentials");

  revalidatePath("/", "layout");
  redirect("/area");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/entrar?mensagem=Sessão encerrada.");
}

export async function requestPasswordReset(formData: FormData) {
  const parsed = recoverSchema.safeParse({ email: value(formData, "email") });
  if (!parsed.success) redirect("/recuperar-acesso?erro=invalid_form");

  const supabase = await createClient();
  const { siteUrl } = getSupabasePublicEnv();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${siteUrl}/auth/callback?next=/redefinir-senha` },
  );

  if (error) redirect("/recuperar-acesso?erro=recovery_failed");

  redirect(
    "/entrar?mensagem=Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.",
  );
}

export async function updatePassword(formData: FormData) {
  const parsed = resetPasswordSchema.safeParse({
    password: value(formData, "password"),
    passwordConfirmation: value(formData, "password_confirmation"),
  });
  if (!parsed.success) redirect("/redefinir-senha?erro=invalid_form");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/recuperar-acesso?erro=expired_link");

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) redirect("/redefinir-senha?erro=reset_failed");

  redirect("/area?mensagem=Senha atualizada com sucesso.");
}

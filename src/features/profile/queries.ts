import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const getCurrentProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/entrar");

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, name, subject_taught, whatsapp, pix_key, timezone, onboarding_completed_at, trial_started_at, trial_ends_at, account_status",
    )
    .eq("id", user.id)
    .single();

  if (error || !data) {
    throw new Error("Não foi possível carregar o perfil autenticado.");
  }

  return { profile: data, email: user.email ?? "" };
});

export async function normalizeCurrentAccountAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data, error } = await supabase.rpc("normalize_current_account_access");
  if (error || !data) throw new Error("Não foi possível validar o acesso da conta.");
  return data;
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { profileSchema } from "@/features/profile/schemas";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    subjectTaught: formData.get("subject_taught"),
    whatsapp: formData.get("whatsapp"),
    pixKey: formData.get("pix_key"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) redirect("/configuracoes?erro=invalid_form");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { error } = await supabase
    .from("profiles")
    .update({
      name: parsed.data.name,
      subject_taught: parsed.data.subjectTaught,
      whatsapp: parsed.data.whatsapp,
      pix_key: parsed.data.pixKey || null,
      timezone: parsed.data.timezone,
    })
    .eq("id", user.id);

  if (error) redirect("/configuracoes?erro=profile_failed");

  revalidatePath("/area");
  revalidatePath("/configuracoes");
  redirect("/configuracoes?mensagem=Perfil salvo.");
}

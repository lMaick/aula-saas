"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { studentFormSchema, studentIdSchema } from "@/features/students/schemas";
import { createClient } from "@/lib/supabase/server";

function studentValues(formData: FormData) {
  return studentFormSchema.safeParse({
    name: formData.get("name"),
    whatsapp: formData.get("whatsapp"),
    notes: formData.get("notes") || undefined,
    billingModel: formData.get("billing_model"),
    billingAmountCents: formData.get("billing_amount"),
  });
}

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return { supabase, user };
}

export async function createStudent(formData: FormData) {
  const parsed = studentValues(formData);
  if (!parsed.success) redirect("/alunos/novo?erro=student_invalid");

  const { supabase } = await authenticatedClient();
  const { data, error } = await supabase
    .from("students")
    .insert({
      name: parsed.data.name,
      whatsapp: parsed.data.whatsapp,
      notes: parsed.data.notes || null,
      billing_model: parsed.data.billingModel,
      billing_amount_cents: parsed.data.billingAmountCents,
    })
    .select("id")
    .single();

  if (error || !data) redirect("/alunos/novo?erro=student_create_failed");

  revalidatePath("/alunos");
  redirect(`/alunos/${data.id}?mensagem=Aluno cadastrado.`);
}

export async function updateStudent(formData: FormData) {
  const id = studentIdSchema.safeParse(formData.get("student_id"));
  const parsed = studentValues(formData);
  if (!id.success || !parsed.success) {
    redirect(`/alunos/${id.success ? id.data : ""}/editar?erro=student_invalid`);
  }

  const { supabase, user } = await authenticatedClient();
  const { data, error } = await supabase
    .from("students")
    .update({
      name: parsed.data.name,
      whatsapp: parsed.data.whatsapp,
      notes: parsed.data.notes || null,
      billing_model: parsed.data.billingModel,
      billing_amount_cents: parsed.data.billingAmountCents,
    })
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/alunos/${id.data}/editar?erro=student_update_failed`);
  }

  revalidatePath("/alunos");
  revalidatePath(`/alunos/${id.data}`);
  redirect(`/alunos/${id.data}?mensagem=Aluno atualizado.`);
}

export async function toggleStudentStatus(formData: FormData) {
  const id = studentIdSchema.safeParse(formData.get("student_id"));
  if (!id.success) redirect("/alunos");

  const { supabase, user } = await authenticatedClient();
  const { data: current } = await supabase
    .from("students")
    .select("status")
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!current) redirect("/alunos");

  const nextStatus = current.status === "active" ? "inactive" : "active";
  const { data, error } = await supabase
    .from("students")
    .update({ status: nextStatus })
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/alunos/${id.data}?erro=student_update_failed`);
  }

  revalidatePath("/alunos");
  revalidatePath(`/alunos/${id.data}`);
  redirect(
    `/alunos/${id.data}?mensagem=Aluno ${nextStatus === "active" ? "ativado" : "inativado"}.`,
  );
}

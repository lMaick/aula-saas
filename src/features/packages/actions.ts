"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { packageFormSchema, packageIdSchema } from "@/features/packages/schemas";
import { createClient } from "@/lib/supabase/server";

async function actionContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return { supabase, user };
}

function packageErrorCode(message?: string) {
  if (message?.includes("package_active_exists")) return "package_active_exists";
  if (message?.includes("package_student_invalid")) return "package_student_invalid";
  return "package_create_failed";
}

export async function createLessonPackage(formData: FormData) {
  const parsed = packageFormSchema.safeParse({
    studentId: formData.get("student_id"),
    totalLessons: formData.get("total_lessons"),
    amount: formData.get("amount"),
    startsOn: formData.get("starts_on"),
    endsOn: formData.get("ends_on") || "",
  });
  if (!parsed.success) redirect("/alunos?erro=package_invalid");

  const { supabase, user } = await actionContext();
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", parsed.data.studentId)
    .eq("owner_id", user.id)
    .eq("status", "active")
    .eq("billing_model", "package")
    .maybeSingle();
  if (!student) redirect("/alunos?erro=package_student_invalid");

  const { error } = await supabase.rpc("create_lesson_package", {
    p_student_id: student.id,
    p_total_lessons: parsed.data.totalLessons,
    p_amount_cents: parsed.data.amount,
    p_starts_on: parsed.data.startsOn,
    p_ends_on: parsed.data.endsOn || null,
  });
  if (error) redirect(`/alunos/${student.id}/pacotes/novo?erro=${packageErrorCode(error.message)}`);
  revalidatePath("/financeiro");
  revalidatePath(`/alunos/${student.id}`);
  redirect(`/alunos/${student.id}?mensagem=Pacote criado.`);
}

export async function cancelLessonPackage(formData: FormData) {
  const packageId = packageIdSchema.safeParse(formData.get("package_id"));
  if (!packageId.success) redirect("/alunos");
  const { supabase, user } = await actionContext();
  const { data: lessonPackage } = await supabase
    .from("packages")
    .select("id, student_id")
    .eq("id", packageId.data)
    .eq("owner_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!lessonPackage) redirect("/alunos?erro=package_not_active");
  const { error } = await supabase.rpc("cancel_lesson_package", {
    p_package_id: lessonPackage.id,
  });
  if (error) redirect(`/alunos/${lessonPackage.student_id}?erro=package_cancel_failed`);
  revalidatePath(`/alunos/${lessonPackage.student_id}`);
  redirect(`/alunos/${lessonPackage.student_id}?mensagem=Pacote cancelado.`);
}

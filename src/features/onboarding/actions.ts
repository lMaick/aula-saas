"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  onboardingProfileSchema,
  onboardingScheduleSchema,
  onboardingStudentSchema,
} from "@/features/onboarding/schemas";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, field: string) {
  return String(formData.get(field) ?? "");
}

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return { supabase, user };
}

export async function saveOnboardingProfile(formData: FormData) {
  const parsed = onboardingProfileSchema.safeParse({
    name: text(formData, "name"),
    subjectTaught: text(formData, "subject_taught"),
    whatsapp: text(formData, "whatsapp"),
    pixKey: text(formData, "pix_key"),
    timezone: "America/Bahia",
  });
  if (!parsed.success) redirect("/onboarding?erro=onboarding_profile_invalid");

  const { supabase, user } = await authenticatedClient();
  const { data: current } = await supabase
    .from("profiles")
    .select("timezone, onboarding_completed_at")
    .eq("id", user.id)
    .single();
  if (!current || current.onboarding_completed_at) redirect("/dashboard");

  const { error } = await supabase
    .from("profiles")
    .update({
      name: parsed.data.name,
      subject_taught: parsed.data.subjectTaught,
      whatsapp: parsed.data.whatsapp,
      pix_key: parsed.data.pixKey || null,
      timezone: current.timezone || "America/Bahia",
    })
    .eq("id", user.id)
    .is("onboarding_completed_at", null);
  if (error) redirect("/onboarding?erro=onboarding_profile_failed");

  revalidatePath("/onboarding");
  redirect("/onboarding?mensagem=Perfil pronto.");
}

export async function saveOnboardingStudent(formData: FormData) {
  const parsed = onboardingStudentSchema.safeParse({
    name: text(formData, "name"),
    whatsapp: text(formData, "whatsapp"),
    notes: undefined,
    billingModel: text(formData, "billing_model"),
    billingAmountCents: text(formData, "billing_amount"),
    packageTotalLessons: formData.get("package_total_lessons"),
  });
  if (!parsed.success) redirect("/onboarding?erro=onboarding_student_invalid");

  const { supabase } = await authenticatedClient();
  const { error } = await supabase.rpc("create_onboarding_student", {
    p_name: parsed.data.name,
    p_whatsapp: parsed.data.whatsapp,
    p_billing_model: parsed.data.billingModel,
    p_billing_amount_cents: parsed.data.billingAmountCents,
    p_package_total_lessons: parsed.data.packageTotalLessons ?? null,
  });
  if (error) {
    const code = error.message.includes("onboarding_package_invalid")
      ? "onboarding_package_invalid"
      : error.message.includes("package_active_exists")
        ? "package_active_exists"
        : "onboarding_student_failed";
    redirect(`/onboarding?erro=${code}`);
  }

  revalidatePath("/onboarding");
  revalidatePath("/alunos");
  revalidatePath("/financeiro");
  redirect("/onboarding?mensagem=Primeiro aluno organizado.");
}

export async function completeOnboardingSchedule(formData: FormData) {
  const parsed = onboardingScheduleSchema.safeParse({
    studentId: formData.get("student_id"),
    weekday: formData.get("weekday"),
    localStartTime: formData.get("local_start_time"),
    durationMinutes: formData.get("duration_minutes"),
  });
  if (!parsed.success) redirect("/onboarding?erro=onboarding_schedule_invalid");

  const { supabase, user } = await authenticatedClient();
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", parsed.data.studentId)
    .eq("owner_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!student) redirect("/onboarding?erro=onboarding_student_invalid");

  const { error } = await supabase.rpc("complete_onboarding_with_schedule", {
    p_student_id: student.id,
    p_weekday: parsed.data.weekday,
    p_local_start_time: parsed.data.localStartTime,
    p_duration_minutes: parsed.data.durationMinutes,
  });
  if (error) {
    const code = error.message.includes("recurrence_conflict")
      ? "onboarding_schedule_conflict"
      : error.message.includes("onboarding_package_required")
        ? "onboarding_package_invalid"
        : "onboarding_schedule_failed";
    redirect(`/onboarding?erro=${code}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/agenda");
  revalidatePath("/onboarding");
  redirect("/dashboard?mensagem=Tudo certo. Seu painel já está pronto.");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { lessonFormSchema, lessonIdSchema } from "@/features/lessons/schemas";
import { localDateTimeToUtc } from "@/lib/dates/timezone";
import { createClient } from "@/lib/supabase/server";

function formValues(formData: FormData) {
  return lessonFormSchema.safeParse({
    studentId: formData.get("student_id"),
    localDateTime: formData.get("starts_at_local"),
    durationMinutes: formData.get("duration_minutes"),
    notes: formData.get("notes") || undefined,
  });
}

async function actionContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();
  return { supabase, user, timeZone: profile?.timezone || "America/Bahia" };
}

async function hasConflict(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  startsAt: string,
  endsAt: string,
  excludedId?: string,
) {
  let query = supabase
    .from("lessons")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("status", "scheduled")
    .lt("starts_at", endsAt)
    .gt("ends_at", startsAt)
    .limit(1);
  if (excludedId) query = query.neq("id", excludedId);
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível verificar o horário.");
  return data.length > 0;
}

async function validateSchedule(formData: FormData) {
  const parsed = formValues(formData);
  if (!parsed.success) return null;
  const context = await actionContext();
  const startsAt = localDateTimeToUtc(parsed.data.localDateTime, context.timeZone);
  if (!startsAt) return null;
  const endsAt = new Date(startsAt.getTime() + parsed.data.durationMinutes * 60_000);
  return { ...context, parsed: parsed.data, startsAt, endsAt };
}

export async function createLesson(formData: FormData) {
  const values = await validateSchedule(formData);
  if (!values) redirect("/agenda/nova?erro=lesson_invalid");
  const { supabase, user, parsed, startsAt, endsAt } = values;

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", parsed.studentId)
    .eq("owner_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!student) redirect("/agenda/nova?erro=lesson_student_invalid");

  if (await hasConflict(supabase, user.id, startsAt.toISOString(), endsAt.toISOString())) {
    redirect("/agenda/nova?erro=lesson_conflict");
  }

  const { data, error } = await supabase
    .from("lessons")
    .insert({
      student_id: student.id,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      notes: parsed.notes || null,
    })
    .select("id")
    .single();
  if (error || !data) redirect("/agenda/nova?erro=lesson_create_failed");

  revalidatePath("/agenda");
  revalidatePath(`/alunos/${student.id}`);
  redirect(`/agenda/${data.id}?mensagem=Aula agendada.`);
}

export async function rescheduleLesson(formData: FormData) {
  const id = lessonIdSchema.safeParse(formData.get("lesson_id"));
  const values = await validateSchedule(formData);
  if (!id.success || !values) redirect("/agenda?erro=lesson_invalid");
  const { supabase, user, parsed, startsAt, endsAt } = values;

  const { data: current } = await supabase
    .from("lessons")
    .select("id, student_id, status")
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!current || current.status !== "scheduled" || current.student_id !== parsed.studentId) {
    redirect(`/agenda/${id.data}?erro=lesson_not_scheduled`);
  }
  if (await hasConflict(
    supabase,
    user.id,
    startsAt.toISOString(),
    endsAt.toISOString(),
    id.data,
  )) redirect(`/agenda/${id.data}/editar?erro=lesson_conflict`);

  const { data, error } = await supabase
    .from("lessons")
    .update({
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      notes: parsed.notes || null,
    })
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .eq("status", "scheduled")
    .select("id")
    .single();
  if (error || !data) redirect(`/agenda/${id.data}/editar?erro=lesson_update_failed`);

  revalidatePath("/agenda");
  revalidatePath(`/agenda/${id.data}`);
  revalidatePath(`/alunos/${current.student_id}`);
  redirect(`/agenda/${id.data}?mensagem=Aula remarcada.`);
}

async function changeLessonStatus(formData: FormData, status: "completed" | "cancelled") {
  const id = lessonIdSchema.safeParse(formData.get("lesson_id"));
  if (!id.success) redirect("/agenda");
  const { supabase, user } = await actionContext();
  const { data, error } = await supabase
    .from("lessons")
    .update({ status })
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .eq("status", "scheduled")
    .select("id, student_id")
    .single();
  if (error || !data) redirect(`/agenda/${id.data}?erro=lesson_not_scheduled`);
  revalidatePath("/agenda");
  revalidatePath(`/agenda/${id.data}`);
  revalidatePath(`/alunos/${data.student_id}`);
  redirect(`/agenda/${id.data}?mensagem=Aula ${status === "completed" ? "realizada" : "cancelada"}.`);
}

export async function completeLesson(formData: FormData) {
  return changeLessonStatus(formData, "completed");
}

export async function cancelLesson(formData: FormData) {
  return changeLessonStatus(formData, "cancelled");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  lessonFormSchema,
  lessonIdSchema,
  recurrenceFormSchema,
  recurrenceIdSchema,
} from "@/features/lessons/schemas";
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
      recurrence_managed: false,
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

async function lessonStatusContext(formData: FormData) {
  const id = lessonIdSchema.safeParse(formData.get("lesson_id"));
  if (!id.success) redirect("/agenda");
  const { supabase, user } = await actionContext();
  const { data } = await supabase
    .from("lessons")
    .select("id, student_id")
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!data) redirect(`/agenda/${id.data}?erro=lesson_not_scheduled`);
  return { id: id.data, supabase, lesson: data };
}

export async function completeLesson(formData: FormData) {
  const { id, supabase, lesson } = await lessonStatusContext(formData);
  const { error } = await supabase.rpc("complete_lesson", { p_lesson_id: id });
  if (error) redirect(`/agenda/${id}?erro=lesson_complete_failed`);
  revalidatePath("/agenda");
  revalidatePath("/financeiro");
  revalidatePath(`/agenda/${id}`);
  revalidatePath(`/alunos/${lesson.student_id}`);
  redirect(`/agenda/${id}?mensagem=Aula realizada.`);
}

export async function cancelLesson(formData: FormData) {
  const { id, supabase, lesson } = await lessonStatusContext(formData);
  const { error } = await supabase.rpc("cancel_lesson", { p_lesson_id: id });
  if (error) redirect(`/agenda/${id}?erro=lesson_not_scheduled`);
  revalidatePath("/agenda");
  revalidatePath(`/agenda/${id}`);
  revalidatePath(`/alunos/${lesson.student_id}`);
  redirect(`/agenda/${id}?mensagem=Aula cancelada.`);
}

function recurrenceValues(formData: FormData) {
  return recurrenceFormSchema.safeParse({
    studentId: formData.get("student_id"),
    weekday: formData.get("weekday"),
    localStartTime: formData.get("local_start_time"),
    durationMinutes: formData.get("duration_minutes"),
    startsOn: formData.get("starts_on"),
    endsOn: formData.get("ends_on") || "",
  });
}

function recurrenceErrorCode(message?: string) {
  if (message?.includes("recurrence_conflict")) return "recurrence_conflict";
  if (message?.includes("recurrence_student_invalid")) return "recurrence_student_invalid";
  if (message?.includes("recurrence_not_found")) return "recurrence_not_found";
  return "recurrence_save_failed";
}

export async function createRecurrence(formData: FormData) {
  const parsed = recurrenceValues(formData);
  if (!parsed.success) redirect("/alunos?erro=recurrence_invalid");
  const { supabase, user } = await actionContext();
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", parsed.data.studentId)
    .eq("owner_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!student) redirect("/alunos?erro=recurrence_student_invalid");

  const { error } = await supabase.rpc("create_weekly_recurrence", {
    p_student_id: student.id,
    p_weekday: parsed.data.weekday,
    p_local_start_time: parsed.data.localStartTime,
    p_duration_minutes: parsed.data.durationMinutes,
    p_starts_on: parsed.data.startsOn,
    p_ends_on: parsed.data.endsOn || null,
  });
  if (error) redirect(`/alunos/${student.id}/horarios/novo?erro=${recurrenceErrorCode(error.message)}`);
  revalidatePath("/agenda");
  revalidatePath(`/alunos/${student.id}`);
  redirect(`/alunos/${student.id}?mensagem=Horário fixo criado.`);
}

export async function updateRecurrence(formData: FormData) {
  const recurrenceId = recurrenceIdSchema.safeParse(formData.get("recurrence_id"));
  const parsed = recurrenceValues(formData);
  if (!recurrenceId.success || !parsed.success) redirect("/alunos?erro=recurrence_invalid");
  const { supabase, user } = await actionContext();
  const { data: recurrence } = await supabase
    .from("lesson_recurrences")
    .select("id, student_id")
    .eq("id", recurrenceId.data)
    .eq("owner_id", user.id)
    .eq("student_id", parsed.data.studentId)
    .eq("active", true)
    .maybeSingle();
  if (!recurrence) redirect(`/alunos/${parsed.data.studentId}?erro=recurrence_not_found`);

  const { error } = await supabase.rpc("update_weekly_recurrence", {
    p_recurrence_id: recurrence.id,
    p_weekday: parsed.data.weekday,
    p_local_start_time: parsed.data.localStartTime,
    p_duration_minutes: parsed.data.durationMinutes,
    p_starts_on: parsed.data.startsOn,
    p_ends_on: parsed.data.endsOn || null,
  });
  if (error) redirect(`/alunos/${recurrence.student_id}/horarios/${recurrence.id}/editar?erro=${recurrenceErrorCode(error.message)}`);
  revalidatePath("/agenda");
  revalidatePath(`/alunos/${recurrence.student_id}`);
  redirect(`/alunos/${recurrence.student_id}?mensagem=Horário fixo atualizado.`);
}

export async function deactivateRecurrence(formData: FormData) {
  const recurrenceId = recurrenceIdSchema.safeParse(formData.get("recurrence_id"));
  if (!recurrenceId.success) redirect("/alunos");
  const { supabase, user } = await actionContext();
  const { data: recurrence } = await supabase
    .from("lesson_recurrences")
    .select("id, student_id")
    .eq("id", recurrenceId.data)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!recurrence) redirect("/alunos");
  const { error } = await supabase.rpc("deactivate_weekly_recurrence", {
    p_recurrence_id: recurrence.id,
  });
  if (error) redirect(`/alunos/${recurrence.student_id}?erro=${recurrenceErrorCode(error.message)}`);
  revalidatePath("/agenda");
  revalidatePath(`/alunos/${recurrence.student_id}`);
  redirect(`/alunos/${recurrence.student_id}?mensagem=Horário fixo desativado.`);
}

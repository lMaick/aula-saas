import "server-only";

import { notFound, redirect } from "next/navigation";

import { lessonIdSchema } from "@/features/lessons/schemas";
import {
  addDaysToDateKey,
  localDateKey,
  localDayRange,
  startOfWeekDateKey,
} from "@/lib/dates/timezone";
import { createClient } from "@/lib/supabase/server";

const lessonColumns =
  "id, owner_id, student_id, starts_at, ends_at, status, notes, created_at, updated_at, recurrence_id, recurrence_date, recurrence_managed, is_makeup, makeup_for_lesson_id, reserved_package_id";

async function lessonContext() {
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

export async function getCurrentTimeZone() {
  return (await lessonContext()).timeZone;
}

async function attachStudentNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  lessons: Array<{ student_id: string }>,
) {
  const ids = [...new Set(lessons.map((lesson) => lesson.student_id))];
  if (ids.length === 0) return new Map<string, string>();
  const { data, error } = await supabase
    .from("students")
    .select("id, name")
    .eq("owner_id", ownerId)
    .in("id", ids);
  if (error) throw new Error("Não foi possível carregar os alunos das aulas.");
  return new Map(data.map((student) => [student.id, student.name]));
}

export async function getAgenda(view: "today" | "week", requestedWeek?: string) {
  const { supabase, user, timeZone } = await lessonContext();
  const { error: maintenanceError } = await supabase.rpc("maintain_weekly_recurrences", {});
  if (maintenanceError) throw new Error("Não foi possível atualizar as aulas recorrentes.");
  const today = localDateKey(new Date(), timeZone);
  const weekStart = /^\d{4}-\d{2}-\d{2}$/.test(requestedWeek || "")
    ? startOfWeekDateKey(requestedWeek as string)
    : startOfWeekDateKey(today);
  const firstDate = view === "today" ? today : weekStart;
  const lastDate = addDaysToDateKey(firstDate, view === "today" ? 1 : 7);
  const rangeStart = localDayRange(firstDate, timeZone).start;
  const rangeEnd = localDayRange(lastDate, timeZone).start;

  const { data, error } = await supabase
    .from("lessons")
    .select(lessonColumns)
    .eq("owner_id", user.id)
    .gte("starts_at", rangeStart.toISOString())
    .lt("starts_at", rangeEnd.toISOString())
    .order("starts_at", { ascending: true });
  if (error) throw new Error("Não foi possível carregar a agenda.");

  const names = await attachStudentNames(supabase, user.id, data);
  return {
    lessons: data.map((lesson) => ({
      ...lesson,
      studentName: names.get(lesson.student_id) || "Aluno indisponível",
    })),
    timeZone,
    today,
    weekStart,
  };
}

export async function getActiveStudentsForLesson() {
  const { supabase, user } = await lessonContext();
  const { data, error } = await supabase
    .from("students")
    .select("id, name")
    .eq("owner_id", user.id)
    .eq("status", "active")
    .order("name");
  if (error) throw new Error("Não foi possível carregar os alunos.");
  return data;
}

export async function getLessonById(rawId: string) {
  const id = lessonIdSchema.safeParse(rawId);
  if (!id.success) notFound();
  const { supabase, user, timeZone } = await lessonContext();
  const { data: lesson, error } = await supabase
    .from("lessons")
    .select(lessonColumns)
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar a aula.");
  if (!lesson) notFound();

  const { data: student } = await supabase
    .from("students")
    .select("id, name, whatsapp")
    .eq("id", lesson.student_id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!student) notFound();
  const { data: originalLesson } = lesson.makeup_for_lesson_id
    ? await supabase
        .from("lessons")
        .select(lessonColumns)
        .eq("id", lesson.makeup_for_lesson_id)
        .eq("owner_id", user.id)
        .maybeSingle()
    : { data: null };
  const { data: scheduledMakeup } = !lesson.is_makeup && lesson.status === "makeup_pending"
    ? await supabase
        .from("lessons")
        .select(lessonColumns)
        .eq("makeup_for_lesson_id", lesson.id)
        .eq("owner_id", user.id)
        .eq("status", "scheduled")
        .maybeSingle()
    : { data: null };
  return { lesson, student, timeZone, originalLesson, scheduledMakeup };
}

export async function getLessonsForStudent(studentId: string) {
  const { supabase, user, timeZone } = await lessonContext();
  const { data, error } = await supabase
    .from("lessons")
    .select(lessonColumns)
    .eq("owner_id", user.id)
    .eq("student_id", studentId)
    .order("starts_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar as aulas do aluno.");
  return { lessons: data, timeZone };
}

export async function getRecurrencesForStudent(studentId: string) {
  const { supabase, user, timeZone } = await lessonContext();
  const { data, error } = await supabase
    .from("lesson_recurrences")
    .select("id, owner_id, student_id, weekday, local_start_time, duration_minutes, starts_on, ends_on, active, created_at, updated_at")
    .eq("owner_id", user.id)
    .eq("student_id", studentId)
    .order("active", { ascending: false })
    .order("weekday")
    .order("local_start_time");
  if (error) throw new Error("Não foi possível carregar os horários fixos.");
  return { recurrences: data, timeZone };
}

export async function getRecurrenceById(studentId: string, recurrenceId: string) {
  const student = lessonIdSchema.safeParse(studentId);
  const recurrence = lessonIdSchema.safeParse(recurrenceId);
  if (!student.success || !recurrence.success) notFound();
  const { supabase, user, timeZone } = await lessonContext();
  const { data, error } = await supabase
    .from("lesson_recurrences")
    .select("id, owner_id, student_id, weekday, local_start_time, duration_minutes, starts_on, ends_on, active, created_at, updated_at")
    .eq("id", recurrence.data)
    .eq("student_id", student.data)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar o horário fixo.");
  if (!data) notFound();
  return { recurrence: data, timeZone };
}

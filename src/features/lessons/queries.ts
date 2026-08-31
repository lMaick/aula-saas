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
  "id, owner_id, student_id, starts_at, ends_at, status, notes, created_at, updated_at";

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
    .select("id, name")
    .eq("id", lesson.student_id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!student) notFound();
  return { lesson, student, timeZone };
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

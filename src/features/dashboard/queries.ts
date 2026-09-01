import "server-only";

import { redirect } from "next/navigation";

import {
  calculateDashboardFinancials,
  countDashboardAttention,
  dashboardPackageAvailability,
  shouldShowPackageNearEnd,
} from "@/features/dashboard/calculations";
import { localDateKey, localDayRange, localMonthRange } from "@/lib/dates/timezone";
import { createClient } from "@/lib/supabase/server";

export async function getDashboardOverview() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("name, timezone")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) throw new Error("Não foi possível carregar o dashboard.");

  const timeZone = profile.timezone || "America/Bahia";
  const now = new Date();
  const today = localDateKey(now, timeZone);
  const todayRange = localDayRange(today, timeZone);
  const monthRange = localMonthRange(now, timeZone);

  const [paidResult, pendingResult, todayLessonsResult, upcomingResult, makeupsResult,
    scheduledMakeupsResult, packagesResult, reservationsResult, studentsResult] = await Promise.all([
    supabase.from("charges").select("amount_cents").eq("owner_id", user.id).eq("status", "paid")
      .gte("paid_at", monthRange.start.toISOString()).lt("paid_at", monthRange.end.toISOString()),
    supabase.from("charges").select("id, student_id, description, amount_cents, due_date")
      .eq("owner_id", user.id).eq("status", "pending").order("due_date"),
    supabase.from("lessons").select("id").eq("owner_id", user.id)
      .in("status", ["scheduled", "completed"])
      .gte("starts_at", todayRange.start.toISOString()).lt("starts_at", todayRange.end.toISOString()),
    supabase.from("lessons").select("id, student_id, starts_at, ends_at, is_makeup")
      .eq("owner_id", user.id).eq("status", "scheduled").gte("starts_at", now.toISOString())
      .order("starts_at").limit(5),
    supabase.from("lessons").select("id, student_id, starts_at")
      .eq("owner_id", user.id).eq("status", "makeup_pending").eq("is_makeup", false)
      .order("starts_at"),
    supabase.from("lessons").select("id, makeup_for_lesson_id, starts_at")
      .eq("owner_id", user.id).eq("status", "scheduled").eq("is_makeup", true),
    supabase.from("packages").select("id, student_id, total_lessons, used_lessons, status")
      .eq("owner_id", user.id).eq("status", "active"),
    supabase.from("lessons").select("reserved_package_id")
      .eq("owner_id", user.id).eq("status", "makeup_pending").not("reserved_package_id", "is", null),
    supabase.from("students").select("id, name, status").eq("owner_id", user.id),
  ]);

  const results = [paidResult, pendingResult, todayLessonsResult, upcomingResult, makeupsResult,
    scheduledMakeupsResult, packagesResult, reservationsResult, studentsResult];
  if (results.some((result) => result.error)) throw new Error("Não foi possível carregar o dashboard.");

  const paidCharges = paidResult.data ?? [];
  const pendingCharges = pendingResult.data ?? [];
  const todayLessons = todayLessonsResult.data ?? [];
  const upcomingLessons = upcomingResult.data ?? [];
  const makeups = makeupsResult.data ?? [];
  const scheduledMakeups = scheduledMakeupsResult.data ?? [];
  const packages = packagesResult.data ?? [];
  const reservations = reservationsResult.data ?? [];
  const students = studentsResult.data ?? [];
  const studentById = new Map(students.map((student) => [student.id, student]));
  const replacementByOriginal = new Map(
    scheduledMakeups.filter((lesson) => lesson.makeup_for_lesson_id)
      .map((lesson) => [lesson.makeup_for_lesson_id as string, lesson]),
  );
  const reservationsByPackage = new Map<string, number>();
  for (const reservation of reservations) {
    if (!reservation.reserved_package_id) continue;
    reservationsByPackage.set(
      reservation.reserved_package_id,
      (reservationsByPackage.get(reservation.reserved_package_id) ?? 0) + 1,
    );
  }

  const overdueCharges = pendingCharges.filter((charge) => charge.due_date < today);
  const packagesNearEnd = packages.flatMap((lessonPackage) => {
    const student = studentById.get(lessonPackage.student_id);
    const reservedLessons = reservationsByPackage.get(lessonPackage.id) ?? 0;
    const availableLessons = dashboardPackageAvailability(
      lessonPackage.total_lessons,
      lessonPackage.used_lessons,
      reservedLessons,
    );
    return student && shouldShowPackageNearEnd(lessonPackage.status, student.status, availableLessons)
      ? [{ ...lessonPackage, studentName: student.name, reservedLessons, availableLessons }]
      : [];
  });
  const financials = calculateDashboardFinancials(paidCharges, pendingCharges, today);

  return {
    profileName: profile.name,
    timeZone,
    today,
    hasStudents: students.length > 0,
    financials,
    todayLessonsCount: todayLessons.length,
    attentionCount: countDashboardAttention(overdueCharges.length, makeups.length, packagesNearEnd.length),
    upcomingLessons: upcomingLessons.map((lesson) => ({
      ...lesson,
      studentName: studentById.get(lesson.student_id)?.name || "Aluno indisponível",
    })),
    overdueCharges: overdueCharges.map((charge) => ({
      ...charge,
      studentName: studentById.get(charge.student_id)?.name || "Aluno indisponível",
    })),
    pendingMakeups: makeups.map((lesson) => ({
      ...lesson,
      studentName: studentById.get(lesson.student_id)?.name || "Aluno indisponível",
      scheduledMakeup: replacementByOriginal.get(lesson.id) ?? null,
    })),
    packagesNearEnd,
  };
}

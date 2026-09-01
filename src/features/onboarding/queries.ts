import "server-only";

import { redirect } from "next/navigation";

import {
  identifyOnboardingStep,
  isOnboardingProfileReady,
  selectFirstOnboardingStudent,
} from "@/features/onboarding/calculations";
import { createClient } from "@/lib/supabase/server";

export async function getOnboardingState() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const [{ data: profile, error: profileError }, { data: students, error: studentsError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, subject_taught, whatsapp, pix_key, timezone, onboarding_completed_at")
        .eq("id", user.id)
        .single(),
      supabase
        .from("students")
        .select("id, owner_id, name, whatsapp, status, billing_model, billing_amount_cents, created_at")
        .eq("owner_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: true }),
    ]);

  if (profileError || !profile || studentsError) {
    throw new Error("Não foi possível carregar o onboarding.");
  }
  if (profile.onboarding_completed_at) redirect("/dashboard");

  const student = selectFirstOnboardingStudent(students ?? []);
  const [packageResult, recurrenceResult] = student
    ? await Promise.all([
        student.billing_model === "package"
          ? supabase
              .from("packages")
              .select("id")
              .eq("owner_id", user.id)
              .eq("student_id", student.id)
              .eq("status", "active")
              .maybeSingle()
          : Promise.resolve({ data: { id: "not-required" }, error: null }),
        supabase
          .from("lesson_recurrences")
          .select("id, weekday, local_start_time, duration_minutes")
          .eq("owner_id", user.id)
          .eq("student_id", student.id)
          .eq("active", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ])
    : [
        { data: null, error: null },
        { data: null, error: null },
      ];

  if (packageResult.error || recurrenceResult.error) {
    throw new Error("Não foi possível carregar o progresso do onboarding.");
  }

  const activePackage = packageResult.data;
  const recurrence = recurrenceResult.data;

  const packageReady = student?.billing_model !== "package" || Boolean(activePackage);
  const profileReady = isOnboardingProfileReady(profile);
  const step = identifyOnboardingStep({
    completedAt: profile.onboarding_completed_at,
    profileReady,
    hasStudent: Boolean(student),
    packageReady,
    hasRecurrence: Boolean(recurrence),
  });

  return { profile, student, recurrence, step };
}

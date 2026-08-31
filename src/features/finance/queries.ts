import "server-only";

import { redirect } from "next/navigation";

import { calculateFinancialSummary } from "@/features/finance/calculations";
import { localDateKey, localMonthRange } from "@/lib/dates/timezone";
import { createClient } from "@/lib/supabase/server";

const chargeColumns =
  "id, owner_id, student_id, lesson_id, billing_model, description, amount_cents, reference_month, due_date, status, paid_at, created_at, updated_at";

async function financeContext() {
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

async function studentNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  studentIds: string[],
) {
  const ids = [...new Set(studentIds)];
  if (!ids.length) return new Map<string, string>();
  const { data, error } = await supabase
    .from("students")
    .select("id, name")
    .eq("owner_id", ownerId)
    .in("id", ids);
  if (error) throw new Error("Não foi possível carregar os alunos das cobranças.");
  return new Map(data.map((student) => [student.id, student.name]));
}

export async function getFinanceOverview() {
  const { supabase, user, timeZone } = await financeContext();
  const { data: charges, error } = await supabase
    .from("charges")
    .select(chargeColumns)
    .eq("owner_id", user.id)
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar o financeiro.");

  const names = await studentNames(supabase, user.id, charges.map((charge) => charge.student_id));
  const monthRange = localMonthRange(new Date(), timeZone);
  const summary = calculateFinancialSummary(charges, monthRange);
  const withNames = charges.map((charge) => ({
    ...charge,
    studentName: names.get(charge.student_id) || "Aluno indisponível",
  }));

  return {
    pending: withNames.filter((charge) => charge.status === "pending"),
    paid: withNames.filter((charge) => charge.status === "paid"),
    summary,
    today: localDateKey(new Date(), timeZone),
    currentMonth: localDateKey(new Date(), timeZone).slice(0, 7),
  };
}

export async function getMonthlyStudents() {
  const { supabase, user } = await financeContext();
  const { data, error } = await supabase
    .from("students")
    .select("id, name, billing_amount_cents")
    .eq("owner_id", user.id)
    .eq("status", "active")
    .eq("billing_model", "monthly")
    .order("name");
  if (error) throw new Error("Não foi possível carregar os alunos mensalistas.");
  return data;
}

export async function getChargesForStudent(studentId: string) {
  const { supabase, user } = await financeContext();
  const { data, error } = await supabase
    .from("charges")
    .select(chargeColumns)
    .eq("owner_id", user.id)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar as cobranças do aluno.");
  return data;
}

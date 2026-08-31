"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { chargeIdSchema, monthlyChargeSchema } from "@/features/finance/schemas";
import { createClient } from "@/lib/supabase/server";

async function actionContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return { supabase, user };
}

function monthlyErrorCode(message?: string) {
  if (message?.includes("monthly_charge_duplicate")) return "monthly_charge_duplicate";
  if (message?.includes("monthly_student_invalid")) return "monthly_student_invalid";
  return "monthly_charge_failed";
}

export async function createMonthlyCharge(formData: FormData) {
  const parsed = monthlyChargeSchema.safeParse({
    studentId: formData.get("student_id"),
    referenceMonth: formData.get("reference_month"),
    dueDate: formData.get("due_date"),
  });
  if (!parsed.success) redirect("/financeiro?erro=monthly_charge_invalid");
  const { supabase, user } = await actionContext();
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", parsed.data.studentId)
    .eq("owner_id", user.id)
    .eq("status", "active")
    .eq("billing_model", "monthly")
    .maybeSingle();
  if (!student) redirect("/financeiro?erro=monthly_student_invalid");

  const { error } = await supabase.rpc("create_monthly_charge", {
    p_student_id: student.id,
    p_reference_month: `${parsed.data.referenceMonth}-01`,
    p_due_date: parsed.data.dueDate,
  });
  if (error) redirect(`/financeiro?erro=${monthlyErrorCode(error.message)}`);
  revalidatePath("/financeiro");
  revalidatePath(`/alunos/${student.id}`);
  redirect("/financeiro?mensagem=Mensalidade criada.");
}

export async function markChargePaid(formData: FormData) {
  const chargeId = chargeIdSchema.safeParse(formData.get("charge_id"));
  if (!chargeId.success) redirect("/financeiro?erro=charge_invalid");
  const { supabase, user } = await actionContext();
  const { data: charge } = await supabase
    .from("charges")
    .select("id, student_id")
    .eq("id", chargeId.data)
    .eq("owner_id", user.id)
    .eq("status", "pending")
    .maybeSingle();
  if (!charge) redirect("/financeiro?erro=charge_not_pending");
  const { error } = await supabase.rpc("mark_charge_paid", { p_charge_id: charge.id });
  if (error) redirect("/financeiro?erro=charge_payment_failed");
  revalidatePath("/financeiro");
  revalidatePath(`/alunos/${charge.student_id}`);
  redirect("/financeiro?mensagem=Pagamento registrado.");
}

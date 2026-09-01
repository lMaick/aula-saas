import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const packageColumns =
  "id, owner_id, student_id, total_lessons, used_lessons, amount_cents, status, starts_on, ends_on, created_at, updated_at";

async function packageContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return { supabase, user };
}

export async function getPackagesForStudent(studentId: string) {
  const { supabase, user } = await packageContext();
  const { data, error } = await supabase
    .from("packages")
    .select(packageColumns)
    .eq("owner_id", user.id)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os pacotes do aluno.");
  return data;
}

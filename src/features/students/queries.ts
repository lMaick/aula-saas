import "server-only";

import { notFound, redirect } from "next/navigation";

import { studentIdSchema } from "@/features/students/schemas";
import { createClient } from "@/lib/supabase/server";

const studentColumns =
  "id, owner_id, name, whatsapp, notes, status, billing_model, billing_amount_cents, created_at, updated_at";

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  return { supabase, user };
}

export async function getStudents(search = "") {
  const { supabase, user } = await authenticatedClient();
  const { data, error } = await supabase
    .from("students")
    .select(studentColumns)
    .eq("owner_id", user.id)
    .order("status", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error("Não foi possível carregar os alunos.");

  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  if (!normalizedSearch) return data;
  return data.filter((student) =>
    student.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
  );
}

export async function getStudentById(rawId: string) {
  const id = studentIdSchema.safeParse(rawId);
  if (!id.success) notFound();

  const { supabase, user } = await authenticatedClient();
  const { data, error } = await supabase
    .from("students")
    .select(studentColumns)
    .eq("id", id.data)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (error) throw new Error("Não foi possível carregar o aluno.");
  if (!data) notFound();
  return data;
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { FormMessage } from "@/components/shared/form-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackageForm } from "@/features/packages/package-form";
import { getStudentById } from "@/features/students/queries";
import { localDateKey } from "@/lib/dates/timezone";
import { getCurrentProfile } from "@/features/profile/queries";

type NewPackagePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
};

export default async function NewPackagePage({ params, searchParams }: NewPackagePageProps) {
  const [{ id }, query, { profile }] = await Promise.all([params, searchParams, getCurrentProfile()]);
  const student = await getStudentById(id);
  if (student.billing_model !== "package" || student.status !== "active") notFound();
  return <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
    <FormMessage errorCode={query.erro} />
    <div><Link className="text-sm text-muted-foreground hover:underline" href={`/alunos/${student.id}`}>← {student.name}</Link><h1 className="mt-2 text-2xl font-semibold tracking-tight">Criar pacote</h1></div>
    <Card><CardHeader><CardTitle>Novo pacote de aulas</CardTitle></CardHeader><CardContent><PackageForm student={student} defaultStartsOn={localDateKey(new Date(), profile.timezone)} /></CardContent></Card>
  </main>;
}

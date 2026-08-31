import { FormMessage } from "@/components/shared/form-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStudentById } from "@/features/students/queries";
import { StudentForm } from "@/features/students/student-form";

type EditStudentPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
};

export default async function EditStudentPage({ params, searchParams }: EditStudentPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const student = await getStudentById(id);

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <div>
        <p className="text-sm text-muted-foreground">Alunos</p>
        <h1 className="text-2xl font-semibold tracking-tight">Editar {student.name}</h1>
      </div>
      <FormMessage errorCode={query.erro} />
      <Card>
        <CardHeader><CardTitle>Informações do aluno</CardTitle></CardHeader>
        <CardContent><StudentForm student={student} /></CardContent>
      </Card>
    </main>
  );
}

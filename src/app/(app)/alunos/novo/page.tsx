import { FormMessage } from "@/components/shared/form-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentForm } from "@/features/students/student-form";

type NewStudentPageProps = { searchParams: Promise<{ erro?: string }> };

export default async function NewStudentPage({ searchParams }: NewStudentPageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <div>
        <p className="text-sm text-muted-foreground">Alunos</p>
        <h1 className="text-2xl font-semibold tracking-tight">Novo aluno</h1>
      </div>
      <FormMessage errorCode={params.erro} />
      <Card>
        <CardHeader><CardTitle>Informações do aluno</CardTitle></CardHeader>
        <CardContent><StudentForm /></CardContent>
      </Card>
    </main>
  );
}

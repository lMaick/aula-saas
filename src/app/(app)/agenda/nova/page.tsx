import Link from "next/link";

import { FormMessage } from "@/components/shared/form-message";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonForm } from "@/features/lessons/lesson-form";
import { getActiveStudentsForLesson, getAgenda } from "@/features/lessons/queries";
import { addDaysToDateKey, localDateKey } from "@/lib/dates/timezone";

type NewLessonPageProps = { searchParams: Promise<{ erro?: string }> };

export default async function NewLessonPage({ searchParams }: NewLessonPageProps) {
  const [{ erro }, students, agenda] = await Promise.all([
    searchParams,
    getActiveStudentsForLesson(),
    getAgenda("today"),
  ]);
  const tomorrow = addDaysToDateKey(localDateKey(new Date(), agenda.timeZone), 1);

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <div><p className="text-sm text-muted-foreground">Agenda</p><h1 className="text-2xl font-semibold tracking-tight">Nova aula</h1></div>
      <FormMessage errorCode={erro} />
      {students.length === 0 ? (
        <Card><CardContent className="space-y-4 py-10 text-center"><p className="font-medium">Você precisa de um aluno ativo para agendar.</p><Link className={buttonVariants()} href="/alunos/novo">Cadastrar aluno</Link></CardContent></Card>
      ) : (
        <Card><CardHeader><CardTitle>Dados da aula</CardTitle></CardHeader><CardContent><LessonForm students={students} timeZone={agenda.timeZone} defaultLocalDateTime={`${tomorrow}T14:00`} /></CardContent></Card>
      )}
    </main>
  );
}

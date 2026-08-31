import { FormMessage } from "@/components/shared/form-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LessonForm } from "@/features/lessons/lesson-form";
import { getLessonById } from "@/features/lessons/queries";
import { utcToLocalInput } from "@/lib/dates/timezone";

type EditLessonPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
};

export default async function EditLessonPage({ params, searchParams }: EditLessonPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { lesson, student, timeZone } = await getLessonById(id);

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <div><p className="text-sm text-muted-foreground">Agenda</p><h1 className="text-2xl font-semibold tracking-tight">Remarcar aula</h1></div>
      <FormMessage errorCode={query.erro} />
      {lesson.status !== "scheduled" ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Somente aulas agendadas podem ser remarcadas.</CardContent></Card>
      ) : (
        <Card><CardHeader><CardTitle>Novo horário</CardTitle></CardHeader><CardContent><LessonForm students={[]} timeZone={timeZone} defaultLocalDateTime={utcToLocalInput(lesson.starts_at, timeZone)} lesson={lesson} studentName={student.name} /></CardContent></Card>
      )}
    </main>
  );
}

import { FormMessage } from "@/components/shared/form-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MakeupForm } from "@/features/lessons/makeup-form";
import { getLessonById } from "@/features/lessons/queries";
import { addDaysToDateKey, durationInMinutes, localDateKey } from "@/lib/dates/timezone";

type NewMakeupPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
};

export default async function NewMakeupPage({ params, searchParams }: NewMakeupPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { lesson, student, timeZone, scheduledMakeup } = await getLessonById(id);
  const tomorrow = addDaysToDateKey(localDateKey(new Date(), timeZone), 1);
  const canSchedule = !lesson.is_makeup && lesson.status === "makeup_pending" && !scheduledMakeup;

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <div><p className="text-sm text-muted-foreground">Agenda</p><h1 className="text-2xl font-semibold tracking-tight">Agendar reposição</h1></div>
      <FormMessage errorCode={query.erro} />
      {canSchedule ? (
        <Card><CardHeader><CardTitle>Novo horário para {student.name}</CardTitle></CardHeader><CardContent><MakeupForm originalLessonId={lesson.id} studentId={student.id} studentName={student.name} timeZone={timeZone} defaultLocalDateTime={`${tomorrow}T14:00`} defaultDuration={durationInMinutes(lesson.starts_at, lesson.ends_at)} /></CardContent></Card>
      ) : (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Esta aula não possui uma reposição disponível para agendamento.</CardContent></Card>
      )}
    </main>
  );
}

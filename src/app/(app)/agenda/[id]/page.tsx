import Link from "next/link";

import { FormMessage } from "@/components/shared/form-message";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cancelLesson, cancelLessonWithMakeup, completeLesson } from "@/features/lessons/actions";
import { lessonStatusLabels } from "@/features/lessons/constants";
import { getLessonById } from "@/features/lessons/queries";
import { durationInMinutes, formatLessonDate, formatLessonTime } from "@/lib/dates/timezone";
import { cn } from "@/lib/utils";
import { createWhatsAppUrl } from "@/features/whatsapp/links";
import { buildLessonReminderMessage } from "@/features/whatsapp/messages";
import { WhatsAppButton } from "@/features/whatsapp/whatsapp-button";

type LessonPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; mensagem?: string }>;
};

export default async function LessonPage({ params, searchParams }: LessonPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { lesson, student, timeZone, originalLesson, scheduledMakeup } = await getLessonById(id);
  const scheduled = lesson.status === "scheduled";
  const whatsappUrl = scheduled
    ? createWhatsAppUrl(student.whatsapp, buildLessonReminderMessage({
        studentName: student.name,
        startsAt: lesson.starts_at,
        timeZone,
      }))
    : null;

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <FormMessage errorCode={query.erro} message={query.mensagem} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link className="text-sm text-muted-foreground hover:underline" href="/agenda">← Agenda</Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Aula com {student.name}</h1>
            <Badge variant={lesson.status === "scheduled" ? "default" : lesson.status === "completed" ? "secondary" : "outline"}>{lessonStatusLabels[lesson.status]}</Badge>
            {lesson.recurrence_id ? <Badge variant="outline">Aula recorrente</Badge> : null}
            {lesson.is_makeup ? <Badge variant="outline">Reposição</Badge> : null}
          </div>
        </div>
        {scheduled ? <Link className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")} href={`/agenda/${lesson.id}/editar`}>Remarcar</Link> : null}
      </div>

      <Card>
        <CardHeader><CardTitle>Detalhes da aula</CardTitle></CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div><p className="text-xs text-muted-foreground">Aluno</p><Link className="mt-1 block font-medium hover:underline" href={`/alunos/${student.id}`}>{student.name}</Link></div>
          <div><p className="text-xs text-muted-foreground">Data</p><p className="mt-1 capitalize">{formatLessonDate(lesson.starts_at, timeZone)}</p></div>
          <div><p className="text-xs text-muted-foreground">Horário</p><p className="mt-1">{formatLessonTime(lesson.starts_at, timeZone)}–{formatLessonTime(lesson.ends_at, timeZone)}</p></div>
          <div><p className="text-xs text-muted-foreground">Duração</p><p className="mt-1">{durationInMinutes(lesson.starts_at, lesson.ends_at)} minutos</p></div>
          <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Observação</p><p className="mt-1 whitespace-pre-wrap">{lesson.notes || "Nenhuma observação."}</p></div>
        </CardContent>
      </Card>

      {lesson.is_makeup && originalLesson ? <Card><CardContent className="py-4 text-sm">Reposição da aula de <Link className="font-medium underline" href={`/agenda/${originalLesson.id}`}>{formatLessonDate(originalLesson.starts_at, timeZone)}</Link>.</CardContent></Card> : null}

      {lesson.status === "makeup_pending" ? <Card><CardHeader><CardTitle className="text-base">Reposição pendente</CardTitle></CardHeader><CardContent className="space-y-3">{scheduledMakeup ? <p className="text-sm">Reposição agendada para <Link className="font-medium underline" href={`/agenda/${scheduledMakeup.id}`}>{formatLessonDate(scheduledMakeup.starts_at, timeZone)} às {formatLessonTime(scheduledMakeup.starts_at, timeZone)}</Link>.</p> : <><p className="text-sm text-muted-foreground">Esta aula ainda precisa ser reposta.</p><Link className={buttonVariants()} href={`/agenda/${lesson.id}/reposicao/nova`}>Agendar reposição</Link></>}</CardContent></Card> : null}

      {scheduled ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Ações da aula</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <WhatsAppButton
              className="w-full sm:w-auto"
              href={whatsappUrl}
              invalidStudentHref={`/alunos/${student.id}/editar`}
              label="Lembrar no WhatsApp"
            />
            <form action={completeLesson}><input type="hidden" name="lesson_id" value={lesson.id} /><Button className="w-full sm:w-auto" type="submit">Marcar como realizada</Button></form>
            <form action={cancelLesson}><input type="hidden" name="lesson_id" value={lesson.id} /><Button className="w-full sm:w-auto" type="submit" variant="outline">Cancelar aula</Button></form>
            {!lesson.is_makeup ? <form action={cancelLessonWithMakeup}><input type="hidden" name="lesson_id" value={lesson.id} /><Button className="w-full sm:w-auto" type="submit" variant="outline">Cancelar e deixar reposição pendente</Button></form> : null}
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}

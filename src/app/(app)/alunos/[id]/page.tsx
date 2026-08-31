import Link from "next/link";

import { FormMessage } from "@/components/shared/form-message";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toggleStudentStatus } from "@/features/students/actions";
import { billingModelLabels } from "@/features/students/constants";
import { getStudentById } from "@/features/students/queries";
import { lessonStatusLabels } from "@/features/lessons/constants";
import { getLessonsForStudent } from "@/features/lessons/queries";
import { formatLessonDate, formatLessonTime } from "@/lib/dates/timezone";
import { formatBrlFromCents } from "@/lib/money/brl";
import { cn } from "@/lib/utils";

type StudentPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; mensagem?: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "America/Bahia",
});

export default async function StudentPage({ params, searchParams }: StudentPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [student, lessonHistory] = await Promise.all([
    getStudentById(id),
    getLessonsForStudent(id),
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <FormMessage errorCode={query.erro} message={query.mensagem} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link className="text-sm text-muted-foreground hover:underline" href="/alunos">← Alunos</Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{student.name}</h1>
            <Badge variant={student.status === "active" ? "default" : "secondary"}>
              {student.status === "active" ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </div>
        <Link className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")} href={`/alunos/${student.id}/editar`}>
          Editar aluno
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Dados do aluno</CardTitle></CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div><p className="text-xs text-muted-foreground">WhatsApp</p><p className="mt-1">{student.whatsapp}</p></div>
          <div><p className="text-xs text-muted-foreground">Modelo de cobrança</p><p className="mt-1">{billingModelLabels[student.billing_model]}</p></div>
          <div><p className="text-xs text-muted-foreground">Valor</p><p className="mt-1">{formatBrlFromCents(student.billing_amount_cents)}</p></div>
          <div><p className="text-xs text-muted-foreground">Cadastrado em</p><p className="mt-1">{dateFormatter.format(new Date(student.created_at))}</p></div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Observações</p>
            <p className="mt-1 whitespace-pre-wrap">{student.notes || "Nenhuma observação."}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Aulas</CardTitle></CardHeader>
        <CardContent>
          {lessonHistory.lessons.length === 0 ? (
            <div className="space-y-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma aula registrada para este aluno.</p>
              {student.status === "active" ? <Link className={buttonVariants({ variant: "outline" })} href="/agenda/nova">Agendar aula</Link> : null}
            </div>
          ) : (
            <div className="divide-y">
              {lessonHistory.lessons.map((lesson) => (
                <Link key={lesson.id} href={`/agenda/${lesson.id}`} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div><p className="text-sm font-medium capitalize">{formatLessonDate(lesson.starts_at, lessonHistory.timeZone)}</p><p className="text-sm text-muted-foreground">{formatLessonTime(lesson.starts_at, lessonHistory.timeZone)}</p></div>
                  <Badge variant={lesson.status === "scheduled" ? "default" : lesson.status === "completed" ? "secondary" : "outline"}>{lessonStatusLabels[lesson.status]}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Status do aluno</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Alunos inativos permanecem no histórico e podem ser reativados depois.
          </p>
          <form action={toggleStudentStatus}>
            <input type="hidden" name="student_id" value={student.id} />
            <Button type="submit" variant={student.status === "active" ? "outline" : "default"}>
              {student.status === "active" ? "Inativar aluno" : "Ativar aluno"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

import Link from "next/link";

import { FormMessage } from "@/components/shared/form-message";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toggleStudentStatus } from "@/features/students/actions";
import { billingModelLabels } from "@/features/students/constants";
import { getStudentById } from "@/features/students/queries";
import { lessonStatusLabels } from "@/features/lessons/constants";
import { weekdayLabels } from "@/features/lessons/constants";
import { deactivateRecurrence } from "@/features/lessons/actions";
import { getLessonsForStudent, getRecurrencesForStudent } from "@/features/lessons/queries";
import { formatDateKey, formatLessonDate, formatLessonTime, formatLocalTimeRange } from "@/lib/dates/timezone";
import { formatBrlFromCents } from "@/lib/money/brl";
import { cn } from "@/lib/utils";
import { getChargesForStudent } from "@/features/finance/queries";
import { chargeStatusLabels } from "@/features/finance/constants";
import { cancelLessonPackage } from "@/features/packages/actions";
import { packageProgress } from "@/features/packages/calculations";
import { packageStatusLabels } from "@/features/packages/constants";
import { getPackagesForStudent } from "@/features/packages/queries";
import { createWhatsAppUrl } from "@/features/whatsapp/links";
import { buildStudentContactMessage } from "@/features/whatsapp/messages";
import { WhatsAppButton } from "@/features/whatsapp/whatsapp-button";

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
  const [student, lessonHistory, recurrenceHistory, charges, packages] = await Promise.all([
    getStudentById(id),
    getLessonsForStudent(id),
    getRecurrencesForStudent(id),
    getChargesForStudent(id),
    getPackagesForStudent(id),
  ]);
  const activePackage = packages.find((lessonPackage) => lessonPackage.status === "active");
  const previousPackages = packages.filter((lessonPackage) => lessonPackage.status !== "active");
  const pendingMakeups = lessonHistory.lessons.filter((lesson) => lesson.status === "makeup_pending");
  const whatsappUrl = createWhatsAppUrl(
    student.whatsapp,
    buildStudentContactMessage(student.name),
  );

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
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <WhatsAppButton
            className="w-full sm:w-auto"
            href={whatsappUrl}
            invalidStudentHref={`/alunos/${student.id}/editar`}
            label="Abrir WhatsApp"
          />
          <Link className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")} href={`/alunos/${student.id}/editar`}>
            Editar aluno
          </Link>
        </div>
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
        <CardHeader><CardTitle>Reposições pendentes</CardTitle></CardHeader>
        <CardContent>
          {pendingMakeups.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma reposição pendente.</p> : <div className="divide-y">{pendingMakeups.map((lesson) => {
            const replacement = lessonHistory.lessons.find((candidate) => candidate.makeup_for_lesson_id === lesson.id && candidate.status === "scheduled");
            return <div key={lesson.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">Aula de {formatLessonDate(lesson.starts_at, lessonHistory.timeZone)}</p><p className="text-sm text-muted-foreground">{replacement ? `Reposição em ${formatLessonDate(replacement.starts_at, lessonHistory.timeZone)} às ${formatLessonTime(replacement.starts_at, lessonHistory.timeZone)}` : "Ainda não agendada"}</p></div><Link className={buttonVariants({ variant: "outline", size: "sm" })} href={replacement ? `/agenda/${replacement.id}` : `/agenda/${lesson.id}/reposicao/nova`}>{replacement ? "Ver reposição" : "Agendar"}</Link></div>;
          })}</div>}
        </CardContent>
      </Card>

      {student.billing_model === "package" ? <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle>Pacote de aulas</CardTitle>{!activePackage && student.status === "active" ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/alunos/${student.id}/pacotes/novo`}>Criar pacote</Link> : null}</CardHeader>
        <CardContent className="space-y-5">
          {activePackage ? (() => {
            const progress = packageProgress(activePackage.total_lessons, activePackage.used_lessons);
            return <div className="space-y-4 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">Pacote atual</p><Badge variant={progress.nearEnd ? "destructive" : "default"}>{progress.nearEnd ? "Pacote perto do fim" : "Ativo"}</Badge></div>
              <div><div className="mb-2 flex justify-between text-sm"><span>{activePackage.used_lessons} de {activePackage.total_lessons} aulas utilizadas</span><span>{progress.remaining} restantes</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${progress.percentage}%` }} /></div></div>
              <div className="grid gap-3 text-sm sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Valor</p><p>{formatBrlFromCents(activePackage.amount_cents)}</p></div><div><p className="text-xs text-muted-foreground">Início</p><p>{formatDateKey(activePackage.starts_on)}</p></div><div><p className="text-xs text-muted-foreground">Data final</p><p>{activePackage.ends_on ? formatDateKey(activePackage.ends_on) : "Sem data final"}</p></div></div>
              <form action={cancelLessonPackage}><input type="hidden" name="package_id" value={activePackage.id} /><Button type="submit" size="sm" variant="outline">Cancelar pacote</Button></form>
            </div>;
          })() : <p className="text-sm text-muted-foreground">Nenhum pacote ativo.</p>}
          {previousPackages.length ? <div className="space-y-3"><h3 className="text-sm font-medium">Histórico</h3>{previousPackages.map((lessonPackage) => <div key={lessonPackage.id} className="flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{lessonPackage.used_lessons} de {lessonPackage.total_lessons} aulas utilizadas</p><p className="text-muted-foreground">{formatDateKey(lessonPackage.starts_on)}{lessonPackage.ends_on ? ` até ${formatDateKey(lessonPackage.ends_on)}` : ""}</p></div><div className="flex items-center justify-between gap-3"><span>{formatBrlFromCents(lessonPackage.amount_cents)}</span><Badge variant="secondary">{packageStatusLabels[lessonPackage.status]}</Badge></div></div>)}</div> : null}
        </CardContent>
      </Card> : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle>Horários fixos</CardTitle>{student.status === "active" ? <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/alunos/${student.id}/horarios/novo`}>Adicionar</Link> : null}</CardHeader>
        <CardContent>
          {recurrenceHistory.recurrences.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">Nenhum horário fixo configurado.</p> : <div className="space-y-3">{recurrenceHistory.recurrences.map((recurrence) => <div key={recurrence.id} className={cn("rounded-lg border p-4", !recurrence.active && "opacity-60")}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{weekdayLabels[recurrence.weekday]} • {formatLocalTimeRange(recurrence.local_start_time, recurrence.duration_minutes)}</p><p className="text-sm text-muted-foreground">{recurrence.ends_on ? `Até ${formatDateKey(recurrence.ends_on)}` : "Sem data final"} • {recurrence.active ? "Ativo" : "Inativo"}</p></div>{recurrence.active ? <div className="flex gap-2"><Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/alunos/${student.id}/horarios/${recurrence.id}/editar`}>Editar</Link><form action={deactivateRecurrence}><input type="hidden" name="recurrence_id" value={recurrence.id} /><Button type="submit" size="sm" variant="outline">Desativar</Button></form></div> : null}</div></div>)}</div>}
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
                  <Badge variant={lesson.status === "scheduled" ? "default" : lesson.status === "completed" ? "secondary" : "outline"}>{lesson.is_makeup && lesson.status === "completed" ? "Reposição realizada" : lessonStatusLabels[lesson.status]}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Financeiro</CardTitle></CardHeader>
        <CardContent>
          {charges.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma cobrança registrada para este aluno.</p> : <div className="divide-y">{charges.map((charge) => <div key={charge.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{charge.description}</p><p className="text-sm text-muted-foreground">Vencimento: {formatDateKey(charge.due_date)}</p></div><div className="flex items-center justify-between gap-3 sm:justify-end"><p className="font-medium">{formatBrlFromCents(charge.amount_cents)}</p><Badge variant={charge.status === "paid" ? "secondary" : "outline"}>{chargeStatusLabels[charge.status]}</Badge></div></div>)}</div>}
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

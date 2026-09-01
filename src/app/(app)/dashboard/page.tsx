import Link from "next/link";

import { FormMessage } from "@/components/shared/form-message";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { daysOverdue } from "@/features/dashboard/calculations";
import { getDashboardOverview } from "@/features/dashboard/queries";
import { durationInMinutes, formatDateKey, formatLessonDate, formatLessonTime } from "@/lib/dates/timezone";
import { formatBrlFromCents } from "@/lib/money/brl";

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <Card size="sm"><CardContent className="space-y-1"><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p><p className="text-xs text-muted-foreground">{detail}</p></CardContent></Card>;
}

type DashboardPageProps = { searchParams: Promise<{ mensagem?: string }> };

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const dashboard = await getDashboardOverview();

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <FormMessage message={params.mensagem} />
      <div><p className="text-sm text-muted-foreground">Visão geral</p><h1 className="text-2xl font-semibold tracking-tight">Olá{dashboard.profileName ? `, ${dashboard.profileName}` : ""}.</h1></div>

      <section aria-label="Resumo" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Recebido no mês" value={formatBrlFromCents(dashboard.financials.receivedThisMonthCents)} detail="Pagamentos registrados neste mês" />
        <MetricCard label="A receber" value={formatBrlFromCents(dashboard.financials.pendingCents)} detail="Total de cobranças abertas" />
        <MetricCard label="Aulas hoje" value={String(dashboard.todayLessonsCount)} detail="Agendadas e realizadas hoje" />
        <MetricCard label="Pendências" value={String(dashboard.attentionCount)} detail="Atrasos, reposições e pacotes" />
      </section>

      {!dashboard.hasStudents ? <Card><CardContent className="flex flex-col items-start gap-3 py-6"><div><h2 className="font-medium">Comece pelo seu primeiro aluno</h2><p className="mt-1 text-sm text-muted-foreground">Cadastre um aluno para organizar aulas e pagamentos.</p></div><Link className={buttonVariants()} href="/alunos/novo">Cadastrar aluno</Link></CardContent></Card> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle>Próximas aulas</CardTitle><Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/agenda">Ver agenda</Link></CardHeader>
          <CardContent>{dashboard.upcomingLessons.length === 0 ? <p className="py-5 text-center text-sm text-muted-foreground">Você não possui próximas aulas agendadas.</p> : <div className="divide-y">{dashboard.upcomingLessons.map((lesson) => <Link key={lesson.id} href={`/agenda/${lesson.id}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate font-medium">{lesson.studentName}</p><p className="text-sm capitalize text-muted-foreground">{formatLessonDate(lesson.starts_at, dashboard.timeZone)} • {formatLessonTime(lesson.starts_at, dashboard.timeZone)}</p><p className="text-xs text-muted-foreground">{durationInMinutes(lesson.starts_at, lesson.ends_at)} minutos</p></div>{lesson.is_makeup ? <Badge variant="outline">Reposição</Badge> : null}</Link>)}</div>}</CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pagamentos atrasados</CardTitle></CardHeader>
          <CardContent className="space-y-4"><p className="text-xl font-semibold text-destructive">{formatBrlFromCents(dashboard.financials.overdueCents)} em atraso</p>{dashboard.overdueCharges.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Nenhum pagamento atrasado.</p> : <div className="divide-y">{dashboard.overdueCharges.slice(0, 5).map((charge) => { const days = daysOverdue(charge.due_date, dashboard.today); return <Link key={charge.id} href="/financeiro" className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="truncate font-medium">{charge.studentName}</p><p className="truncate text-sm text-muted-foreground">{charge.description}</p><p className="text-xs text-muted-foreground">Venceu em {formatDateKey(charge.due_date)} • {days} {days === 1 ? "dia" : "dias"}</p></div><span className="font-medium">{formatBrlFromCents(charge.amount_cents)}</span></Link>; })}</div>}<Link className={buttonVariants({ variant: "outline", size: "sm" })} href="/financeiro">Ver financeiro</Link></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Reposições pendentes</CardTitle></CardHeader>
          <CardContent>{dashboard.pendingMakeups.length === 0 ? <p className="py-5 text-center text-sm text-muted-foreground">Nenhuma reposição pendente.</p> : <div className="divide-y">{dashboard.pendingMakeups.slice(0, 5).map((lesson) => <div key={lesson.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{lesson.studentName}</p><p className="text-sm capitalize text-muted-foreground">Aula de {formatLessonDate(lesson.starts_at, dashboard.timeZone)}</p>{lesson.scheduledMakeup ? <p className="text-xs text-muted-foreground">Agendada para {formatLessonDate(lesson.scheduledMakeup.starts_at, dashboard.timeZone)} às {formatLessonTime(lesson.scheduledMakeup.starts_at, dashboard.timeZone)}</p> : <p className="text-xs text-muted-foreground">Ainda não agendada</p>}</div><Link className={buttonVariants({ variant: "outline", size: "sm" })} href={lesson.scheduledMakeup ? `/agenda/${lesson.scheduledMakeup.id}` : `/agenda/${lesson.id}/reposicao/nova`}>{lesson.scheduledMakeup ? "Ver reposição" : "Agendar reposição"}</Link></div>)}</div>}</CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pacotes próximos do fim</CardTitle></CardHeader>
          <CardContent>{dashboard.packagesNearEnd.length === 0 ? <p className="py-5 text-center text-sm text-muted-foreground">Nenhum pacote perto do fim.</p> : <div className="divide-y">{dashboard.packagesNearEnd.slice(0, 5).map((lessonPackage) => <Link key={lessonPackage.id} href={`/alunos/${lessonPackage.student_id}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div><p className="font-medium">{lessonPackage.studentName}</p><p className="text-sm text-muted-foreground">{lessonPackage.used_lessons} de {lessonPackage.total_lessons} utilizadas • {lessonPackage.availableLessons} {lessonPackage.availableLessons === 1 ? "disponível" : "disponíveis"}</p>{lessonPackage.reservedLessons > 0 ? <p className="text-xs text-muted-foreground">{lessonPackage.reservedLessons} em reposição pendente</p> : null}</div><Badge variant="destructive">Perto do fim</Badge></Link>)}</div>}</CardContent>
        </Card>
      </div>
    </main>
  );
}

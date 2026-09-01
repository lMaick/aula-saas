import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { lessonStatusLabels } from "@/features/lessons/constants";
import { getAgenda } from "@/features/lessons/queries";
import {
  addDaysToDateKey,
  durationInMinutes,
  formatLessonDate,
  formatLessonTime,
  localDateKey,
} from "@/lib/dates/timezone";
import { cn } from "@/lib/utils";
import type { LessonStatus } from "@/types/database";

type AgendaPageProps = {
  searchParams: Promise<{ visualizacao?: string; semana?: string }>;
};

const statusVariants: Record<LessonStatus, "default" | "secondary" | "outline"> = {
  scheduled: "default",
  completed: "secondary",
  cancelled: "outline",
  makeup_pending: "outline",
  made_up: "secondary",
};

export default async function AgendaPage({ searchParams }: AgendaPageProps) {
  const params = await searchParams;
  const view = params.visualizacao === "hoje" ? "today" : "week";
  const { lessons, timeZone, weekStart } = await getAgenda(view, params.semana);
  const grouped = new Map<string, typeof lessons>();
  for (const lesson of lessons) {
    const key = localDateKey(lesson.starts_at, timeZone);
    grouped.set(key, [...(grouped.get(key) || []), lesson]);
  }
  const dates = view === "today"
    ? [...grouped.keys()]
    : Array.from({ length: 7 }, (_, index) => addDaysToDateKey(weekStart, index));

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Organização das aulas</p>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
        </div>
        <Link className={cn(buttonVariants(), "w-full sm:w-auto")} href="/agenda/nova">
          Nova aula
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border p-1">
          <Link className={cn(buttonVariants({ variant: view === "today" ? "default" : "ghost", size: "sm" }))} href="/agenda?visualizacao=hoje">Hoje</Link>
          <Link className={cn(buttonVariants({ variant: view === "week" ? "default" : "ghost", size: "sm" }))} href={`/agenda?visualizacao=semana&semana=${weekStart}`}>Semana</Link>
        </div>
        {view === "week" ? (
          <div className="flex gap-2">
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/agenda?visualizacao=semana&semana=${addDaysToDateKey(weekStart, -7)}`}>← Anterior</Link>
            <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={`/agenda?visualizacao=semana&semana=${addDaysToDateKey(weekStart, 7)}`}>Próxima →</Link>
          </div>
        ) : null}
      </div>

      {lessons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <h2 className="font-medium">Nenhuma aula neste período</h2>
            <p className="max-w-md text-sm text-muted-foreground">Agende uma aula avulsa para começar a organizar seus horários.</p>
            <Link className={buttonVariants()} href="/agenda/nova">Agendar primeira aula</Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {dates.map((dateKey) => {
            const dayLessons = grouped.get(dateKey) || [];
            if (dayLessons.length === 0) return null;
            return (
              <section key={dateKey} className="space-y-2">
                <h2 className="text-sm font-semibold capitalize">{formatLessonDate(dayLessons[0].starts_at, timeZone)}</h2>
                <div className="space-y-2">
                  {dayLessons.map((lesson) => (
                    <Link key={lesson.id} href={`/agenda/${lesson.id}`} className="block">
                      <Card className={cn("transition-colors hover:bg-muted/40", lesson.status === "cancelled" && "opacity-65")}>
                        <CardContent className="grid grid-cols-[auto_1fr] gap-4 py-4 sm:grid-cols-[5rem_1fr_auto] sm:items-center">
                          <p className="font-semibold tabular-nums">{formatLessonTime(lesson.starts_at, timeZone)}</p>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{lesson.studentName}</p>
                            <p className="text-sm text-muted-foreground">{durationInMinutes(lesson.starts_at, lesson.ends_at)} minutos{lesson.is_makeup ? " • Reposição" : ""}</p>
                          </div>
                          <Badge className="col-start-2 w-fit sm:col-start-auto" variant={statusVariants[lesson.status]}>{lessonStatusLabels[lesson.status]}</Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

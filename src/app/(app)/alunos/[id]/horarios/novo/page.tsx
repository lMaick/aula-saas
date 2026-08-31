import { FormMessage } from "@/components/shared/form-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecurrenceForm } from "@/features/lessons/recurrence-form";
import { getCurrentTimeZone } from "@/features/lessons/queries";
import { getStudentById } from "@/features/students/queries";
import { localDateKey } from "@/lib/dates/timezone";

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> };

export default async function NewRecurrencePage({ params, searchParams }: PageProps) {
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  const [student, timeZone] = await Promise.all([getStudentById(id), getCurrentTimeZone()]);
  return <main className="mx-auto max-w-2xl space-y-5 px-4 py-8"><div><p className="text-sm text-muted-foreground">{student.name}</p><h1 className="text-2xl font-semibold tracking-tight">Adicionar horário fixo</h1></div><FormMessage errorCode={erro} />{student.status !== "active" ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Ative o aluno antes de criar um horário fixo.</CardContent></Card> : <Card><CardHeader><CardTitle>Recorrência semanal</CardTitle></CardHeader><CardContent><RecurrenceForm student={student} defaultStartsOn={localDateKey(new Date(), timeZone)} /></CardContent></Card>}</main>;
}

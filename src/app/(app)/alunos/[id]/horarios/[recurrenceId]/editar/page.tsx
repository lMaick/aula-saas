import { FormMessage } from "@/components/shared/form-message";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRecurrenceById } from "@/features/lessons/queries";
import { RecurrenceForm } from "@/features/lessons/recurrence-form";
import { getStudentById } from "@/features/students/queries";

type PageProps = { params: Promise<{ id: string; recurrenceId: string }>; searchParams: Promise<{ erro?: string }> };

export default async function EditRecurrencePage({ params, searchParams }: PageProps) {
  const [{ id, recurrenceId }, { erro }] = await Promise.all([params, searchParams]);
  const [student, result] = await Promise.all([getStudentById(id), getRecurrenceById(id, recurrenceId)]);
  return <main className="mx-auto max-w-2xl space-y-5 px-4 py-8"><div><p className="text-sm text-muted-foreground">{student.name}</p><h1 className="text-2xl font-semibold tracking-tight">Editar horário fixo</h1></div><FormMessage errorCode={erro} /><Card><CardHeader><CardTitle>Recorrência semanal</CardTitle></CardHeader><CardContent><RecurrenceForm student={student} defaultStartsOn={result.recurrence.starts_on} recurrence={result.recurrence} /></CardContent></Card></main>;
}

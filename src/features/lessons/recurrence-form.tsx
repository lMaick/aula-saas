import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRecurrence, updateRecurrence } from "@/features/lessons/actions";
import { lessonDurationOptions, weekdayLabels } from "@/features/lessons/constants";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type Recurrence = Database["public"]["Tables"]["lesson_recurrences"]["Row"];

type RecurrenceFormProps = {
  student: { id: string; name: string };
  defaultStartsOn: string;
  recurrence?: Recurrence;
};

export function RecurrenceForm({ student, defaultStartsOn, recurrence }: RecurrenceFormProps) {
  const editing = Boolean(recurrence);
  return (
    <form action={editing ? updateRecurrence : createRecurrence} className="space-y-5">
      <input type="hidden" name="student_id" value={student.id} />
      {recurrence ? <input type="hidden" name="recurrence_id" value={recurrence.id} /> : null}
      <div className="space-y-2"><Label>Aluno</Label><Input value={student.name} disabled /></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="weekday">Dia da semana</Label>
          <select id="weekday" name="weekday" defaultValue={String(recurrence?.weekday ?? 2)} className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" required>
            {Object.entries(weekdayLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="space-y-2"><Label htmlFor="local_start_time">Horário</Label><Input id="local_start_time" name="local_start_time" type="time" defaultValue={recurrence?.local_start_time.slice(0, 5) ?? "14:00"} required /></div>
        <div className="space-y-2">
          <Label htmlFor="duration_minutes">Duração</Label>
          <select id="duration_minutes" name="duration_minutes" defaultValue={String(recurrence?.duration_minutes ?? 60)} className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" required>
            {lessonDurationOptions.map((minutes) => <option key={minutes} value={minutes}>{minutes} minutos</option>)}
          </select>
        </div>
        <div className="space-y-2"><Label htmlFor="starts_on">Data inicial</Label><Input id="starts_on" name="starts_on" type="date" defaultValue={recurrence?.starts_on ?? defaultStartsOn} required /></div>
        <div className="space-y-2 sm:col-span-2"><Label htmlFor="ends_on">Data final (opcional)</Label><Input id="ends_on" name="ends_on" type="date" defaultValue={recurrence?.ends_on ?? ""} min={recurrence?.starts_on ?? defaultStartsOn} /></div>
      </div>
      <p className="text-sm text-muted-foreground">As próximas 8 semanas serão criadas como aulas reais na agenda.</p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")} href={`/alunos/${student.id}`}>Cancelar</Link><Button className="w-full sm:w-auto" type="submit">{editing ? "Salvar horário fixo" : "Criar horário fixo"}</Button></div>
    </form>
  );
}

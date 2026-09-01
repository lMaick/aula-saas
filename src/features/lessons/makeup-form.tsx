import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { scheduleMakeupLesson } from "@/features/lessons/actions";
import { lessonDurationOptions } from "@/features/lessons/constants";
import { cn } from "@/lib/utils";

type MakeupFormProps = {
  originalLessonId: string;
  studentId: string;
  studentName: string;
  timeZone: string;
  defaultLocalDateTime: string;
  defaultDuration: number;
};

export function MakeupForm(props: MakeupFormProps) {
  return (
    <form action={scheduleMakeupLesson} className="space-y-5">
      <input type="hidden" name="original_lesson_id" value={props.originalLessonId} />
      <input type="hidden" name="student_id" value={props.studentId} />
      <div className="space-y-2"><Label>Aluno</Label><Input value={props.studentName} disabled /></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="starts_at_local">Data e horário</Label>
          <Input id="starts_at_local" name="starts_at_local" type="datetime-local" defaultValue={props.defaultLocalDateTime} required />
          <p className="text-xs text-muted-foreground">Horário local: {props.timeZone}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration_minutes">Duração</Label>
          <select id="duration_minutes" name="duration_minutes" defaultValue={String(props.defaultDuration)} className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm" required>
            {lessonDurationOptions.map((minutes) => <option key={minutes} value={minutes}>{minutes} minutos</option>)}
          </select>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")} href={`/agenda/${props.originalLessonId}`}>Cancelar</Link>
        <Button className="w-full sm:w-auto" type="submit">Agendar reposição</Button>
      </div>
    </form>
  );
}

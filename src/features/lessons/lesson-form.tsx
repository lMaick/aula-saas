import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createLesson, rescheduleLesson } from "@/features/lessons/actions";
import { lessonDurationOptions } from "@/features/lessons/constants";
import { durationInMinutes, utcToLocalInput } from "@/lib/dates/timezone";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type Lesson = Database["public"]["Tables"]["lessons"]["Row"];

type LessonFormProps = {
  students: Array<{ id: string; name: string }>;
  timeZone: string;
  defaultLocalDateTime: string;
  lesson?: Lesson;
  studentName?: string;
};

export function LessonForm({
  students,
  timeZone,
  defaultLocalDateTime,
  lesson,
  studentName,
}: LessonFormProps) {
  const editing = Boolean(lesson);
  const duration = lesson ? durationInMinutes(lesson.starts_at, lesson.ends_at) : 60;

  return (
    <form action={editing ? rescheduleLesson : createLesson} className="space-y-5">
      {lesson ? <input type="hidden" name="lesson_id" value={lesson.id} /> : null}
      {lesson ? <input type="hidden" name="student_id" value={lesson.student_id} /> : null}

      <div className="space-y-2">
        <Label htmlFor="student_id">Aluno</Label>
        {lesson ? (
          <Input value={studentName} disabled aria-label="Aluno" />
        ) : (
          <select
            id="student_id"
            name="student_id"
            defaultValue=""
            className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            required
          >
            <option value="" disabled>Selecione um aluno</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>{student.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="starts_at_local">Data e horário</Label>
          <Input
            id="starts_at_local"
            name="starts_at_local"
            type="datetime-local"
            defaultValue={lesson ? utcToLocalInput(lesson.starts_at, timeZone) : defaultLocalDateTime}
            required
          />
          <p className="text-xs text-muted-foreground">Horário local: {timeZone}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration_minutes">Duração</Label>
          <select
            id="duration_minutes"
            name="duration_minutes"
            defaultValue={String(duration)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            required
          >
            {lessonDurationOptions.map((minutes) => (
              <option key={minutes} value={minutes}>{minutes} minutos</option>
            ))}
            {!lessonDurationOptions.includes(duration as never) ? (
              <option value={duration}>{duration} minutos</option>
            ) : null}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observação (opcional)</Label>
        <Textarea id="notes" name="notes" defaultValue={lesson?.notes ?? ""} maxLength={2000} rows={4} />
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          href={lesson ? `/agenda/${lesson.id}` : "/agenda"}
        >
          Cancelar
        </Link>
        <Button className="w-full sm:w-auto" type="submit">
          {editing ? "Salvar novo horário" : "Agendar aula"}
        </Button>
      </div>
    </form>
  );
}

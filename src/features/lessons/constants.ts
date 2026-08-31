import type { LessonStatus } from "@/types/database";

export const lessonStatusLabels: Record<LessonStatus, string> = {
  scheduled: "Agendada",
  completed: "Realizada",
  cancelled: "Cancelada",
};

export const lessonDurationOptions = [30, 45, 60, 90, 120] as const;

export const weekdayLabels: Record<number, string> = {
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
  7: "Domingo",
};

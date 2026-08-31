import type { LessonStatus } from "@/types/database";

export const lessonStatusLabels: Record<LessonStatus, string> = {
  scheduled: "Agendada",
  completed: "Realizada",
  cancelled: "Cancelada",
};

export const lessonDurationOptions = [30, 45, 60, 90, 120] as const;
